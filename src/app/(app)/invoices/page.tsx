
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
import { Eye, Inbox, FileText, Download, Share2, Search } from "lucide-react";
import type { Receipt } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import React from "react";
import { Badge } from "@/components/ui/badge";
import RefreshButton from "@/components/shared/refresh-button";
import Link from "next/link";
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { safeToDate } from "@/lib/utils";

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
    )
}

export default function InvoicesPage() {
    const { receipts, isLoading: isPosLoading, currencySymbol, triggerRefresh } = usePOS();
    const isLoading = isPosLoading || receipts === null;
    const [searchTerm, setSearchTerm] = React.useState('');
    const [updatingId, setUpdatingId] = React.useState<string | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleMarkPaid = async (id: string) => {
        if (!firestore) return;
        setUpdatingId(id);
        try {
            await updateDoc(doc(firestore, 'receipts', id), {
                status: 'paid'
            });
            toast({ variant: 'success', title: 'Payment Recorded', description: 'Invoice marked as paid successfully.' });
            triggerRefresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update invoice status.' });
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter for invoices only (where paymentMethod is 'Invoice')
    const invoices = React.useMemo(() => {
        if (!receipts) return [];
        return receipts
            .filter(r => r.paymentMethod === 'Invoice')
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

    const getStatusBadge = (receipt: Receipt) => {
        const status = receipt.status || (receipt.paymentMethod === 'Bank Transfer' ? 'pending' : 'paid');

        if (status === 'pending') {
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
        }
        if (status === 'unpaid') {
            return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Unpaid</Badge>;
        }
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoice Tracking</h1>
                    <p className="text-muted-foreground">Manage and track all customer invoices and payments.</p>
                </div>
                <RefreshButton />
            </div>

            <Card className="w-full">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>All Invoices</CardTitle>
                            <CardDescription>A complete list of formal invoices generated by your business.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices..."
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
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
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
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono font-medium">#{invoice.receiptNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{invoice.customer?.name || 'Walk-in'}</span>
                                                <span className="text-xs text-muted-foreground">{invoice.customer?.email || ''}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{format(safeToDate(invoice.createdAt), 'PP')}</TableCell>
                                        <TableCell>{getStatusBadge(invoice)}</TableCell>
                                        <TableCell className="text-right font-semibold">{currencySymbol}{invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {invoice.status !== 'paid' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                                        onClick={() => handleMarkPaid(invoice.id)}
                                                        disabled={updatingId === invoice.id}
                                                    >
                                                        {updatingId === invoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-2 h-3.5 w-3.5" />}
                                                        Mark Paid
                                                    </Button>
                                                )}
                                                <Button asChild size="sm" variant="outline" className="h-8">
                                                    <Link href={`/invoice/details?id=${invoice.id}`}>
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> View
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
                            <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-xl font-semibold">No Invoices Found</h3>
                            <p className="text-muted-foreground mt-1 max-w-sm">Complete a sale in the POS to generate your first invoice.</p>
                            <Button asChild className="mt-6">
                                <Link href="/sales/pos/select-products">Go to POS</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
