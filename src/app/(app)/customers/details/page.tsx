
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { usePOS } from '@/context/pos-context';
import { doc, deleteDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { Customer, Receipt, CustomerInsightsOutput, Product } from '@/types';
import { generateLocalCustomerIntelligence } from '@/lib/customer-intelligence';
import NProgress from 'nprogress';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { 
    ArrowLeft, Bot, Sparkles, BrainCircuit, Lightbulb, Package, Loader2, Trash2, Pencil, 
    Wallet, Scale, Ruler, History, AlertTriangle, CheckCircle2, MoreVertical, Plus, ChevronRight,
    Receipt, FileText
} from 'lucide-react';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import { getCachedCustomerReceipts, syncCustomersToOffline } from '@/lib/sqlite-sync';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { logAuditEvent } from '@/lib/audit';
import Image from 'next/image';
import Link from 'next/link';
import { safeToDate, cn } from '@/lib/utils';

export default function CustomerDetailPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <CustomerDetailContent />
        </Suspense>
    );
}

function CustomerDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const customerId = searchParams.get('id') as string;
    const { toast } = useToast();

    const { firestore, currencySymbol, customers, products: allProducts, receipts: allReceipts, isLoading: isPosLoading, currentUserProfile, triggerRefresh, addToQueue, business } = usePOS();

    const customer = React.useMemo(() => customers?.find(c => c.id === customerId), [customers, customerId]);
    
    const [fetchedCustomer, setFetchedCustomer] = React.useState<Customer | null>(null);
    const [isFetchingCustomer, setIsFetchingCustomer] = React.useState(false);

    React.useEffect(() => {
        if (!customer && customerId && firestore && business?.id) {
            const fetchFallback = async () => {
                setIsFetchingCustomer(true);
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const ref = doc(firestore, 'customers', customerId);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        setFetchedCustomer({ ...snap.data(), id: snap.id } as Customer);
                    }
                } catch(e) {
                    console.error("Fallback customer fetch failed:", e);
                } finally {
                    setIsFetchingCustomer(false);
                }
            };
            fetchFallback();
        }
    }, [customer, customerId, firestore, business?.id]);

    const displayCustomer = customer || fetchedCustomer;

    // FETCH FULL RECEIPT HISTORY FOR THIS CUSTOMER
    const [allCustomerReceipts, setAllCustomerReceipts] = React.useState<Receipt[]>(() => {
        if (!allReceipts || !customerId) return [];
        return allReceipts.filter(r => r.customer?.id === customerId);
    });
    const [isFetchingReceipts, setIsFetchingReceipts] = React.useState(true);

    // Sync incoming receipts reactive to pos-context hydration
    React.useEffect(() => {
        if (allReceipts && customerId) {
            const matching = allReceipts.filter(r => r.customer?.id === customerId);
            if (matching.length > 0) {
                setAllCustomerReceipts(prev => {
                    const merged = [...prev];
                    matching.forEach(m => {
                        if (!merged.some(existing => existing.id === m.id)) {
                            merged.push(m);
                        }
                    });
                    return merged.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
                });
            }
        }
    }, [allReceipts, customerId]);

    React.useEffect(() => {
        if (!firestore || !customerId || !business?.id) return;

        const fetchFullHistory = async () => {
            setIsFetchingReceipts(true);
            const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
            
            // 1. Initial hit from SQLite for instant UI in Native
            if (isTauri) {
                try {
                    const localReceipts = await getCachedCustomerReceipts(business.id, customerId);
                    if (localReceipts.length > 0) {
                        setAllCustomerReceipts(prev => {
                            const merged = [...prev];
                            localReceipts.forEach(lr => {
                                if (!merged.some(m => m.id === lr.id)) merged.push(lr);
                            });
                            return merged.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
                        });
                    }
                } catch (err) {
                    console.warn("SQLite Receipt Fetch failed:", err);
                }
            }

            // 2. If offline, do not attempt to contact Firestore which causes hang
            const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
            if (!isOnline) {
                setIsFetchingReceipts(false);
                return;
            }

            try {
                const q = query(
                    collection(firestore, 'receipts'),
                    where('businessId', '==', business.id),
                    where('customer.id', '==', customerId),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                const docs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
                
                setAllCustomerReceipts(prev => {
                    const merged = [...prev];
                    docs.forEach(rd => {
                        if (!merged.find(m => m.id === rd.id)) {
                            merged.push(rd);
                        }
                    });
                    return merged.sort((a,b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
                });
            } catch (err) {
                console.error("Failed to fetch customer history from Firestore:", err);
            } finally {
                setIsFetchingReceipts(false);
            }
        };

        fetchFullHistory();
    }, [firestore, customerId, business?.id]);

    const receipts = allCustomerReceipts;

    const [insights, setInsights] = React.useState<CustomerInsightsOutput | null>(customer?.aiInsights || null);
    const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false);
    const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
    const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const unpaidReceipts = React.useMemo(() => {
        return receipts.filter(r => r.status === 'unpaid');
    }, [receipts]);

    const totalDebt = React.useMemo(() => {
        return unpaidReceipts.reduce((sum, r) => sum + r.total, 0);
    }, [unpaidReceipts]);

    React.useEffect(() => {
        if (customer?.aiInsights) {
            setInsights(customer.aiInsights);
        }
    }, [customer]);

    const purchaseSummary = React.useMemo(() => {
        if (!receipts) return [];

        const summaryMap: Record<string, {
            product: Partial<Product>;
            totalQuantity: number;
            totalRevenue: number;
            lastPurchase: Date;
        }> = {};

        receipts.forEach(receipt => {
            if (!receipt) return;
            const purchaseDate = safeToDate(receipt.createdAt);
            (receipt.items || []).forEach(item => {
                if (!item) return;
                const productId = item.productId || 'unknown';
                
                if (!summaryMap[productId]) {
                    // Fallback to item data if product record is missing
                    const productInfo = allProducts?.find(p => p.id === productId);
                    summaryMap[productId] = {
                        product: productInfo || {
                            id: productId,
                            name: item.name || 'Unknown Product',
                            price: item.price || 0,
                            imageUrl: (item as any).image || '',
                        },
                        totalQuantity: 0,
                        totalRevenue: 0,
                        lastPurchase: purchaseDate,
                    };
                }

                summaryMap[productId].totalQuantity += (item.quantity || 0);
                summaryMap[productId].totalRevenue += (item.price || 0) * (item.quantity || 0);
                if (purchaseDate > summaryMap[productId].lastPurchase) {
                    summaryMap[productId].lastPurchase = purchaseDate;
                }
            });
        });

        return Object.values(summaryMap).sort((a, b) => b.lastPurchase.getTime() - a.lastPurchase.getTime());
    }, [receipts, allProducts]);


    const handleGenerateInsights = async () => {
        if (!customer || !receipts || !firestore || !currentUserProfile) {
            toast({
                variant: "destructive",
                title: "Unable to Generate Insights",
                description: "Required customer or business data is missing. Please try refreshing the page."
            });
            return;
        }
        setIsGeneratingInsights(true);
        setInsights(null);
        try {
            // Simulation of intelligence processing (local is fast, but we add a small delay for UX)
            await new Promise(resolve => setTimeout(resolve, 800));

            const result = generateLocalCustomerIntelligence(
                customer,
                receipts,
                allProducts || []
            );

            const insightsWithTimestamp = { ...result, createdAt: new Date() };

            // 1. Queue the update for Firestore (Offline-ready)
            
            // Actually, let's just use the direct update but wrap it in a try-catch 
            // AND also update the local SQLite if on Desktop.
            
            const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
            
            if (isTauri) {
                try {
                    await syncCustomersToOffline(currentUserProfile.businessId, [{ ...displayCustomer, aiInsights: insightsWithTimestamp }]);
                    console.log("Insights saved to local SQLite.");
                } catch (e) {
                    console.error("Failed to save insights to SQLite:", e);
                }
            }

            try {
                const customerRef = doc(firestore, 'customers', customerId);
                await updateDoc(customerRef, { aiInsights: { ...result, createdAt: serverTimestamp() } });
            } catch (e) {
                console.warn("Firestore update failed (likely offline). Insights will be available locally this session.");
            }

            // Optimistically update local state to avoid re-fetch
            setInsights(insightsWithTimestamp);
            // triggerRefresh(); // No need if we set state locally
            toast({ variant: 'success', title: 'Insights Generated!', description: 'Intelligent customer analysis completed.' });

        } catch (error) {
            console.error("Failed to generate insights:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate insights.' });
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    const totalSpent = React.useMemo(() => {
        const fromReceipts = receipts?.reduce((sum, r) => sum + r.total, 0) || 0;
        return Math.max(displayCustomer?.totalSpent || 0, fromReceipts);
    }, [displayCustomer, receipts]);

    const isLoading = isPosLoading || isFetchingReceipts || isFetchingCustomer || !firestore;
    const canDelete = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'manager';

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 md:col-span-1" />
                    <Skeleton className="h-96 md:col-span-2" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!displayCustomer && !isLoading) {
        return (
            <div className="text-center p-8">
                <p className="font-bold text-lg">Customer not found.</p>
                <Button variant="ghost" onClick={() => { NProgress.start(); router.push('/customers'); }} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => { NProgress.start(); router.push('/customers'); }} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
            </Button>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 flex flex-col bg-card border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col items-center text-center pb-2">
                        <Avatar className="h-24 w-24 mb-4 text-3xl border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/5 text-primary">
                                {displayCustomer.name ? displayCustomer.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl font-bold">{displayCustomer.name}</CardTitle>
                        <CardDescription>{displayCustomer.email}</CardDescription>
                        {displayCustomer.phone && <CardDescription>{displayCustomer.phone}</CardDescription>}
                    </CardHeader>
                    <CardContent className="text-center flex-grow pt-4">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                totalSpent > 100000 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary/10 text-primary"
                            )}>
                                {totalSpent > 100000 ? 'VIP Customer' : 'Regular'}
                            </span>
                            {totalDebt > 0 && (
                                <span className="bg-destructive/10 text-destructive px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Owing
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">{currencySymbol}{(totalSpent || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Spent</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{receipts?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Total Orders</p>
                            </div>
                            <div className="col-span-2 pt-2">
                                <Separator className="my-2" />
                                <div className={`p-3 rounded-lg flex items-center justify-between ${totalDebt > 0 ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-primary/10 border border-primary/20 text-primary'}`}>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold uppercase tracking-wider">Outstanding Debt</p>
                                        <p className="text-xl font-black">{currencySymbol}{(totalDebt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <Wallet className="h-6 w-6 opacity-50" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button variant="outline" className="w-full" onClick={() => setCustomerToEdit(displayCustomer)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                        {canDelete && (
                            <Button variant="destructive" className="w-full" onClick={() => setCustomerToDelete(displayCustomer)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card className="md:col-span-2 bg-card border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle>Purchase History</CardTitle>
                        <CardDescription>Products this customer has purchased, sorted by most recent.</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-center">Total Quantity</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                    <TableHead className="text-right">Last Purchased</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseSummary && purchaseSummary.length > 0 ? purchaseSummary.map(summary => (
                                    <TableRow key={summary.product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-muted rounded-md relative flex-shrink-0">
                                                    {summary.product.imageUrl ? (
                                                        <Image src={summary.product.imageUrl} alt={summary.product.name} fill className="object-cover rounded-md" />
                                                    ) : <Package className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />}
                                                </div>
                                                <div>
                                                    <Link href={`/inventory/details?id=${summary.product.id}`} className="font-medium hover:underline">{summary.product.name}</Link>
                                                    <div className="text-xs text-muted-foreground">{summary.product.sku}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{summary.totalQuantity || 0}</TableCell>
                                        <TableCell className="text-right">{currencySymbol}{(summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">{summary.lastPurchase ? format(summary.lastPurchase, 'PP') : 'N/A'}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No purchases yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* ADVANCED DEBT TRACKING */}
                <Card className="border-destructive/20 bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><History className="text-destructive h-5 w-5" /> Debt Ledger</CardTitle>
                            <CardDescription>Unpaid invoices and credit history.</CardDescription>
                        </div>
                        {totalDebt > 0 && <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />}
                    </CardHeader>
                    <CardContent>
                        {unpaidReceipts.length > 0 ? (
                            <div className="space-y-4">
                                {unpaidReceipts.map(receipt => (
                                    <div key={receipt.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-transparent hover:border-destructive/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{receipt.receiptNumber}</span>
                                            <span className="text-[10px] text-muted-foreground">{format(safeToDate(receipt.createdAt), 'PPp')}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="font-bold text-destructive">{currencySymbol}{(receipt.total || 0).toLocaleString()}</span>
                                                <div className="text-[10px] text-muted-foreground bg-destructive/5 px-1 rounded inline-block ml-1">UNPAID</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/receipts/details?id=${receipt.id}`}><ChevronRight className="h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full text-xs h-8 border-dashed" asChild>
                                    <Link href={`/receipts?customerId=${displayCustomer.id}`}>View Full Statement</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-primary/5 rounded-lg">
                                <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                                <p className="text-sm font-medium">Clear Account</p>
                                <p className="text-xs text-muted-foreground">This customer has no outstanding debts.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* RECEIPT HISTORY */}
                <Card className="bg-card border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Receipt className="text-primary h-5 w-5" /> Recent Receipts</CardTitle>
                            <CardDescription>The last few transactions for this customer.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {receipts && receipts.length > 0 ? (
                            <div className="space-y-4">
                                {receipts.slice(0, 5).map(receipt => (
                                    <div key={receipt.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-transparent hover:border-primary/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{receipt.receiptNumber || `REC-${receipt.id.substring(0, 5).toUpperCase()}`}</span>
                                            <span className="text-[10px] text-muted-foreground">{format(safeToDate(receipt.createdAt), 'PPp')}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="font-bold text-primary">{currencySymbol}{(receipt.total || 0).toLocaleString()}</span>
                                                <div className={cn(
                                                    "text-[10px] px-1 rounded inline-block ml-1 uppercase font-bold",
                                                    receipt.status === 'unpaid' ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                )}>
                                                    {receipt.status === 'unpaid' ? 'unpaid' : 'paid'}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/receipts/details?id=${receipt.id}`}><ChevronRight className="h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full text-xs h-8 border-dashed" asChild>
                                    <Link href={`/receipts?customerId=${displayCustomer.id}`}>View All Transactions</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
                                <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                                <p className="text-sm font-medium">No Receipts</p>
                                <p className="text-xs text-muted-foreground">No transaction history found for this customer.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary" /> Customer Analytics & Performance</CardTitle>
                    <CardDescription>Generate an intelligent summary and suggestions based on this customer's behavior.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!insights && !isGeneratingInsights && (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="font-medium">Ready for Data Analysis?</p>
                            <p className="text-sm text-muted-foreground mb-4">Analyze this customer's purchase history to get actionable business insights.</p>
                            <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                                {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Analysis
                            </Button>
                        </div>
                    )}
                    {isGeneratingInsights && (
                        <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    )}
                    {insights && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb /> Business Summary</h3>
                                <div className="text-muted-foreground prose prose-sm" dangerouslySetInnerHTML={{ __html: (insights.summary || "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Package /> Product Suggestions</h3>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {insights.productSuggestions.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Bot /> Engagement Tactics</h3>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {insights.engagementTactics.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                            </div>
                            <Button variant="outline" onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                                {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Regenerate
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!customerToDelete} onOpenChange={(open) => { if (!open) setCustomerToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {customerToDelete?.name} from your customer records. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!customerToDelete || !firestore || !currentUserProfile) {
                                    toast({
                                        variant: 'destructive',
                                        title: 'Delete Failed',
                                        description: 'Could not perform deletion. User or customer data is missing. Please try refreshing the page.',
                                        duration: 5000,
                                    });
                                    setIsDeleting(false);
                                    return;
                                }

                                setIsDeleting(true);
                                try {
                                    const customerRef = doc(firestore, 'customers', customerToDelete.id);
                                    await deleteDoc(customerRef);

                                    await logAuditEvent(firestore, currentUserProfile.businessId, currentUserProfile, {
                                        action: 'customer.delete',
                                        entity: { type: 'Customer', id: customerToDelete.id, name: customerToDelete.name },
                                        details: { customerName: customerToDelete.name, customerEmail: customerToDelete.email }
                                    });

                                    triggerRefresh();

                                    toast({
                                        variant: 'success',
                                        title: 'Customer Deleted',
                                        description: `${customerToDelete.name} has been removed.`
                                    });

                                    setCustomerToDelete(null);
                                    NProgress.start();
                                    router.push('/customers');

                                } catch (error: any) {
                                    console.error("Failed to delete customer:", error);
                                    toast({
                                        variant: 'destructive',
                                        title: 'Delete Failed',
                                        description: error.message || 'Could not delete customer.'
                                    });
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditCustomerDialog
                isOpen={!!customerToEdit}
                onOpenChange={(open) => !open && setCustomerToEdit(null)}
                customer={customerToEdit}
            />
        </div>
    );
}
