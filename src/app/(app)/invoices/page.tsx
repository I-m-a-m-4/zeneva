'use client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Eye, Inbox, Share2, Search, MoreHorizontal, Trash2, CheckCircle, Loader2 } from "lucide-react";
import type { Receipt } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import React from "react";
import { Badge } from "@/components/ui/badge";
import RefreshButton from "@/components/shared/refresh-button";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { safeToDate } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { useI18n } from "@/context/i18n-context";
import { InvoicingPromoBanner } from "@/components/invoices/invoicing-promo-banner";

function InvoiceRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-1/2 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
        </TableRow>
    );
}

export default function InvoicesPage() {
    const {
        receipts,
        currencySymbol,
        triggerRefresh,
        business,
        currentUserProfile: currentUser,
        user,
        voidReceipt
    } = usePOS();
    const { t } = useI18n();
    const isLoading = receipts === null;
    const [searchTerm, setSearchTerm] = React.useState('');
    const [updatingId, setUpdatingId] = React.useState<string | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = React.useState<Receipt | null>(null);
    const [selectedInvoices, setSelectedInvoices] = React.useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isBulkVoidDialogOpen, setIsBulkVoidDialogOpen] = React.useState(false);

    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const canVoid = Boolean(
        (currentUser || user) && (
            currentUser?.role === 'admin' ||
            currentUser?.role === 'manager' ||
            (currentUser?.role as string) === 'owner' ||
            (business?.ownerId && (currentUser?.id === business.ownerId || user?.uid === business.ownerId)) ||
            currentUser?.permissions?.void_sales === true ||
            !business?.ownerId
        )
    );

    const handleMarkPaid = async (id: string) => {
        if (!firestore) return;
        setUpdatingId(id);
        try {
            await updateDoc(doc(firestore, 'receipts', id), {
                status: 'paid'
            });
            toast({ variant: 'success', title: t('invoices.paidTitle'), description: t('invoices.paidDescription') });
            triggerRefresh();
        } catch (error) {
            toast({ variant: 'destructive', title: t('common.error'), description: t('invoices.paidFailed') });
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter for invoices only (where paymentMethod is 'Invoice')
    const invoices = React.useMemo(() => {
        if (!receipts) return [];
        return receipts
            .filter(r => r && r.paymentMethod === 'Invoice')
            .filter(r => {
                const searchLower = searchTerm.toLowerCase();
                const receiptId = r.id || '';
                const rNumber = r.receiptNumber || `rec-${receiptId.substring(0, 8)}`;
                const customerName = (r.customer?.name || 'walk-in').toLowerCase();
                
                return rNumber.toLowerCase().includes(searchLower) || 
                    receiptId.toLowerCase().includes(searchLower) || 
                    customerName.includes(searchLower);
            })
            .sort((a, b) => {
                const dateA = safeToDate(a.createdAt);
                const dateB = safeToDate(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
    }, [receipts, searchTerm]);

    // Clear selection if receipts change
    React.useEffect(() => {
        setSelectedInvoices(new Set());
    }, [receipts]);

    const toggleSelectAll = () => {
        if (selectedInvoices.size === invoices.length) {
            setSelectedInvoices(new Set());
        } else {
            setSelectedInvoices(new Set(invoices.map(r => r.id)));
        }
    };

    const toggleSelectInvoice = (id: string) => {
        const next = new Set(selectedInvoices);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedInvoices(next);
    };

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete || !firestore || !business) return;
        setIsDeleting(true);

        const actor = currentUser || (user ? { id: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' as const, email: user.email || '' } : null);

        try {
            await runTransaction(firestore, async (transaction) => {
                const receiptRef = doc(firestore, 'receipts', invoiceToDelete.id);
                const receiptDoc = await transaction.get(receiptRef);

                if (!receiptDoc.exists()) {
                    return;
                }

                const receiptData = receiptDoc.data() as Receipt;

                // 1. Read product docs and customer doc
                const validItems = (receiptData.items || []).filter(item => item.productId);
                const productRefs = validItems.map(item => doc(firestore, 'products', item.productId));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                let customerDoc = null;
                if (receiptData.customer?.id && business.settings?.loyaltyProgramEnabled) {
                    const customerRef = doc(firestore, 'customers', receiptData.customer.id);
                    customerDoc = await transaction.get(customerRef);
                }

                // 2. Perform write operations
                // 2a. Restore product stock
                productDocs.forEach((pDoc, index) => {
                    if (pDoc.exists()) {
                        const item = validItems[index];
                        const newStock = (pDoc.data().stock || 0) + (item.quantity || 0);
                        transaction.update(pDoc.ref, { stock: newStock });
                    }
                });

                // 2b. Revert customer loyalty points
                if (customerDoc && customerDoc.exists()) {
                    const pointsPerUnit = business.settings?.pointsPerUnit || 0;
                    const pointsEarned = Math.floor(receiptData.total * pointsPerUnit);
                    const currentPoints = customerDoc.data()?.loyaltyPoints || 0;
                    transaction.update(customerDoc.ref, { loyaltyPoints: Math.max(0, currentPoints - pointsEarned) });
                }

                // 2c. Delete invoice receipt doc
                transaction.delete(receiptRef);
            });

            // Log audit event after successful void
            if (actor) {
                await logAuditEvent(firestore, business.id, actor, {
                    action: 'sale.void',
                    entity: { type: 'Receipt', id: invoiceToDelete.id, name: `Invoice ${invoiceToDelete.id.substring(0, 8)}` },
                    details: {
                        total: invoiceToDelete.total,
                        reason: 'Manual invoice void by user',
                        saleCreatedAt: safeToDate(invoiceToDelete.createdAt).toISOString(),
                        soldBy: invoiceToDelete.createdBy || undefined,
                        receiptNumber: invoiceToDelete.receiptNumber || null,
                        paymentMethod: 'Invoice',
                        discount: invoiceToDelete.discount || 0,
                        itemCount: invoiceToDelete.items?.length || 0,
                        customerId: invoiceToDelete.customer?.id || null,
                    }
                }).catch(() => {});
            }

            toast({
                title: t('invoices.voidedTitle') || 'Invoice Voided',
                description: t('invoices.voidedDescription', { invoice: invoiceToDelete.receiptNumber || invoiceToDelete.id.substring(0, 8) }) || `Invoice ${invoiceToDelete.id.substring(0, 8)} voided.`,
                variant: 'success'
            });
            await voidReceipt(invoiceToDelete.id);
        } catch (e: any) {
            console.error("Failed to void invoice:", e);
            await voidReceipt(invoiceToDelete.id);
            toast({
                title: t('invoices.offlineVoidTitle') || 'Void Queued',
                description: t('invoices.offlineVoidDescription') || 'Invoice voided and queued for synchronization.',
                variant: 'default'
            });
        } finally {
            setInvoiceToDelete(null);
            setIsDeleting(false);
        }
    };

    const handleBulkVoid = async () => {
        if (selectedInvoices.size === 0 || !firestore || !business) return;
        setIsDeleting(true);

        const actor = currentUser || (user ? { id: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' as const, email: user.email || '' } : null);
        const idsToVoid = Array.from(selectedInvoices);
        let successCount = 0;

        for (const invoiceId of idsToVoid) {
            const inv = invoices.find(r => r.id === invoiceId);
            if (!inv) continue;

            try {
                await runTransaction(firestore, async (transaction) => {
                    const receiptRef = doc(firestore, 'receipts', invoiceId);
                    const receiptDoc = await transaction.get(receiptRef);
                    if (!receiptDoc.exists()) return;

                    const receiptData = receiptDoc.data() as Receipt;
                    const validItems = (receiptData.items || []).filter(item => item.productId);
                    const productRefs = validItems.map(item => doc(firestore, 'products', item.productId));
                    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                    let customerDoc = null;
                    if (receiptData.customer?.id && business.settings?.loyaltyProgramEnabled) {
                        const customerRef = doc(firestore, 'customers', receiptData.customer.id);
                        customerDoc = await transaction.get(customerRef);
                    }

                    productDocs.forEach((pDoc, index) => {
                        if (pDoc.exists()) {
                            const item = validItems[index];
                            const newStock = (pDoc.data().stock || 0) + (item.quantity || 0);
                            transaction.update(pDoc.ref, { stock: newStock });
                        }
                    });

                    if (customerDoc && customerDoc.exists()) {
                        const pointsPerUnit = business.settings?.pointsPerUnit || 0;
                        const pointsEarned = Math.floor(receiptData.total * pointsPerUnit);
                        const currentPoints = customerDoc.data()?.loyaltyPoints || 0;
                        transaction.update(customerDoc.ref, { loyaltyPoints: Math.max(0, currentPoints - pointsEarned) });
                    }

                    transaction.delete(receiptRef);
                });

                if (actor) {
                    await logAuditEvent(firestore, business.id, actor, {
                        action: 'sale.void',
                        entity: { type: 'Receipt', id: inv.id, name: `Invoice ${inv.id.substring(0, 8)}` },
                        details: {
                            total: inv.total,
                            reason: 'Bulk invoice void by user',
                            saleCreatedAt: safeToDate(inv.createdAt).toISOString(),
                            soldBy: inv.createdBy || undefined,
                            receiptNumber: inv.receiptNumber || null,
                            paymentMethod: 'Invoice',
                        }
                    }).catch(() => {});
                }

                await voidReceipt(invoiceId);
                successCount++;
            } catch (e) {
                console.error(`Failed to void invoice ${invoiceId}:`, e);
                await voidReceipt(invoiceId);
            }
        }

        setSelectedInvoices(new Set());
        setIsBulkVoidDialogOpen(false);
        setIsDeleting(false);

        toast({
            title: t('invoices.voidedTitle') || 'Invoices Voided',
            description: `${successCount} invoice(s) voided and inventory restored.`,
            variant: 'success'
        });
    };

    const getStatusBadge = (receipt: Receipt) => {
        const status = receipt.status || (receipt.paymentMethod === 'Invoice' ? 'unpaid' : 'paid');

        if (status === 'pending') {
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('invoices.statusPending')}</Badge>;
        }
        if (status === 'unpaid') {
            return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{t('invoices.statusUnpaid')}</Badge>;
        }
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('invoices.statusPaid')}</Badge>;
    };

    return (
        <div className="min-h-[calc(100vh-5.5rem)] flex flex-col justify-between space-y-6 pb-2">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('invoices.title')}</h1>
                        <p className="text-muted-foreground">{t('invoices.subtitle')}</p>
                    </div>
                    <RefreshButton />
                </div>

                <Card className="w-full">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div>
                                    <CardTitle>{t('invoices.allInvoices')}</CardTitle>
                                    <CardDescription>{t('invoices.allInvoicesDesc')}</CardDescription>
                                </div>
                                {selectedInvoices.size > 0 && canVoid && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setIsBulkVoidDialogOpen(true)}
                                        className="animate-in fade-in slide-in-from-left-2 duration-200"
                                    >
                                        <Trash2 className="me-2 h-4 w-4" />
                                        {t('invoices.voidSelected', { count: selectedInvoices.size }) || `Void Selected (${selectedInvoices.size})`}
                                    </Button>
                                )}
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('invoices.searchPlaceholder')}
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {canVoid && <TableHead className="w-10"></TableHead>}
                                        <TableHead>{t('invoices.colInvoiceNumber')}</TableHead>
                                        <TableHead>{t('pos.customer')}</TableHead>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead className="text-right">{t('common.total')}</TableHead>
                                        <TableHead className="text-right">{t('inventory.colAction')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <InvoiceRowSkeleton />
                                    <InvoiceRowSkeleton />
                                    <InvoiceRowSkeleton />
                                    <InvoiceRowSkeleton />
                                    <InvoiceRowSkeleton />
                                </TableBody>
                            </Table>
                        ) : invoices.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {canVoid && (
                                            <TableHead className="w-10">
                                                <Checkbox
                                                    checked={selectedInvoices.size > 0 && selectedInvoices.size === invoices.length}
                                                    onCheckedChange={toggleSelectAll}
                                                    aria-label="Select all invoices"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead>{t('invoices.colInvoiceNumber')}</TableHead>
                                        <TableHead>{t('pos.customer')}</TableHead>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead className="text-right">{t('common.total')}</TableHead>
                                        <TableHead className="text-right">{t('inventory.colAction')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((invoice) => (
                                        <TableRow 
                                            key={invoice.id}
                                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedInvoices.has(invoice.id) ? 'bg-muted/30' : ''}`}
                                            onClick={() => router.push(`/invoice/details?id=${invoice.id}`)}
                                        >
                                            {canVoid && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedInvoices.has(invoice.id)}
                                                        onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                                                        aria-label={`Select invoice ${invoice.receiptNumber || invoice.id}`}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell className="font-mono font-medium">#{invoice.receiptNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{invoice.customer?.name || t('receipts.walkIn')}</span>
                                                    <span className="text-xs text-muted-foreground">{invoice.customer?.email || ''}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(safeToDate(invoice.createdAt), 'PP')}</TableCell>
                                            <TableCell>{getStatusBadge(invoice)}</TableCell>
                                            <TableCell className="text-right font-semibold">{currencySymbol}{invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">{t('common.actions')}</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push(`/invoice/details?id=${invoice.id}`)}>
                                                            <Eye className="me-2 h-4 w-4" /> {t('receipts.view')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="cursor-pointer" onSelect={() => {
                                                            const shareData = {
                                                                title: 'Invoice ' + (invoice.receiptNumber || invoice.id),
                                                                text: 'Invoice from ' + (business?.name || 'Zeneva POS'),
                                                                url: 'https://zeneva.space' + `/invoice/details?id=${invoice.id}`
                                                            };
                                                            if (navigator.share) {
                                                                navigator.share(shareData).catch(console.error);
                                                            } else {
                                                                navigator.clipboard.writeText(shareData.url);
                                                                toast({ title: 'Link copied', description: 'Invoice link copied to clipboard' });
                                                            }
                                                        }}>
                                                            <Share2 className="me-2 h-4 w-4" /> {t('common.share') || 'Share'}
                                                        </DropdownMenuItem>
                                                        {invoice.status !== 'paid' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); handleMarkPaid(invoice.id); }} disabled={updatingId === invoice.id}>
                                                                    {updatingId === invoice.id ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <CheckCircle className="me-2 h-4 w-4 text-emerald-600" />} 
                                                                    {t('invoices.markPaid')}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {canVoid && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => { e.preventDefault(); setInvoiceToDelete(invoice); }}>
                                                                    <Trash2 className="me-2 h-4 w-4" /> {t('invoices.voidInvoice') || 'Void Invoice'}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
                                <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-xl font-semibold">{t('invoices.noneFound')}</h3>
                                <p className="text-muted-foreground mt-1 max-w-sm">{t('invoices.noneFoundHint')}</p>
                                <Button asChild className="mt-6">
                                    <Link href="/sales/pos/select-products">{t('invoices.goToPos')}</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Single Invoice Void Dialog */}
            <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && !isDeleting && setInvoiceToDelete(null)} modal={false}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('invoices.voidConfirmTitle') || 'Void this invoice?'}</DialogTitle>
                        <DialogDescription>
                            {t('invoices.voidConfirmBody', {
                                invoice: invoiceToDelete?.receiptNumber || `rec-${invoiceToDelete?.id.substring(0, 8)}`,
                            }) || `Are you sure you want to void invoice #${invoiceToDelete?.receiptNumber || invoiceToDelete?.id.substring(0, 8)}? This will restore product quantities to your inventory and remove the invoice permanently. This action cannot be undone.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInvoiceToDelete(null)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleDeleteInvoice} disabled={isDeleting} variant="destructive">
                            {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {t('invoices.voidInvoice') || 'Void Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Invoices Void Dialog */}
            <Dialog open={isBulkVoidDialogOpen} onOpenChange={(open) => !open && !isDeleting && setIsBulkVoidDialogOpen(false)} modal={false}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('invoices.voidMultipleTitle') || 'Void Multiple Invoices'}</DialogTitle>
                        <DialogDescription>
                            {t('invoices.voidMultipleBody', { count: selectedInvoices.size }) ||
                                `Are you sure you want to void the ${selectedInvoices.size} selected invoice(s)? This will permanently delete the invoices, restore stock quantities to your inventory, and deduct any earned loyalty points. This action cannot be undone.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkVoidDialogOpen(false)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleBulkVoid} disabled={isDeleting} variant="destructive">
                            {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {t('invoices.voidAllSelected') || 'Void All Selected'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fixed / Pinned to footer of the invoice page */}
            <InvoicingPromoBanner />
        </div>
    );
}
