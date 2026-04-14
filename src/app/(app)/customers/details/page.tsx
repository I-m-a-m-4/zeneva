
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { usePOS } from '@/context/pos-context';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Customer, Receipt, CustomerInsightsOutput, Product } from '@/types';
import { getCustomerInsights } from '@/ai/flows/customer-insights-flow';
import NProgress from 'nprogress';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bot, Sparkles, BrainCircuit, Lightbulb, Package, Loader2, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import { Separator } from '@/components/ui/separator';
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

    const { firestore, currencySymbol, customers, products: allProducts, receipts: allReceipts, isLoading: isPosLoading, currentUserProfile, triggerRefresh } = usePOS();

    const customer = React.useMemo(() => customers?.find(c => c.id === customerId), [customers, customerId]);
    const receipts = React.useMemo(() => {
        if (!allReceipts) return [];
        return allReceipts.filter(r => r.customer?.id === customerId);
    }, [allReceipts, customerId]);

    const [insights, setInsights] = React.useState<CustomerInsightsOutput | null>(customer?.aiInsights || null);
    const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false);
    const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
    const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    React.useEffect(() => {
        if (customer?.aiInsights) {
            setInsights(customer.aiInsights);
        }
    }, [customer]);

    const purchaseSummary = React.useMemo(() => {
        if (!receipts || !allProducts) return [];

        const productMap: Record<string, {
            product: Product;
            totalQuantity: number;
            totalRevenue: number;
            lastPurchase: Date;
        }> = {};

        receipts.forEach(receipt => {
            const purchaseDate = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt);
            receipt.items.forEach(item => {
                const productInfo = allProducts.find(p => p.id === item.productId);
                if (!productInfo) return;

                if (!productMap[item.productId]) {
                    productMap[item.productId] = {
                        product: productInfo,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        lastPurchase: purchaseDate,
                    };
                }

                productMap[item.productId].totalQuantity += item.quantity;
                productMap[item.productId].totalRevenue += item.price * item.quantity;
                if (purchaseDate > productMap[item.productId].lastPurchase) {
                    productMap[item.productId].lastPurchase = purchaseDate;
                }
            });
        });

        return Object.values(productMap).sort((a, b) => b.lastPurchase.getTime() - a.lastPurchase.getTime());
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
            const purchaseHistory = receipts.flatMap(r => r.items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })));
            const result = await getCustomerInsights({
                customerName: customer.name,
                purchaseHistory: purchaseHistory,
                totalSpent: receipts.reduce((sum, r) => sum + r.total, 0),
                orderCount: receipts.length,
            });

            const insightsWithTimestamp = { ...result, createdAt: new Date() };

            const customerRef = doc(firestore, 'customers', customerId);
            await updateDoc(customerRef, { aiInsights: { ...result, createdAt: serverTimestamp() } });

            await logAuditEvent(firestore, currentUserProfile.businessId, currentUserProfile, {
                action: 'customer.update',
                entity: { type: 'Customer', id: customerId, name: customer.name },
                details: { change: 'Generated AI Insights' }
            });

            // Optimistically update local state to avoid re-fetch
            setInsights(insightsWithTimestamp);
            triggerRefresh(); // Manually trigger a refresh to get the updated customer data
            toast({ variant: 'success', title: 'Insights Generated!', description: 'New insights are available for this customer.' });

        } catch (error) {
            console.error("Failed to generate insights:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate insights.' });
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    const isLoading = isPosLoading;
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

    if (!customer && !isLoading) {
        return (
            <div className="text-center p-8">
                <p className="font-bold text-lg">Customer not found.</p>
                <Button variant="ghost" onClick={() => { NProgress.start(); router.push('/customers'); }} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
                </Button>
            </div>
        )
    }

    const totalSpent = receipts?.reduce((sum, r) => sum + r.total, 0) || 0;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => { NProgress.start(); router.push('/customers'); }} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
            </Button>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 flex flex-col">
                    <CardHeader className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4 text-3xl">
                            <AvatarFallback>{customer.name ? customer.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <CardTitle>{customer.name}</CardTitle>
                        <CardDescription>{customer.email}</CardDescription>
                        <CardDescription>{customer.phone}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center flex-grow">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold">{currencySymbol}{totalSpent.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Spent</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{receipts?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Total Orders</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button variant="outline" className="w-full" onClick={() => setCustomerToEdit(customer)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                        {canDelete && (
                            <Button variant="destructive" className="w-full" onClick={() => setCustomerToDelete(customer)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Purchase History</CardTitle>
                        <CardDescription>Products this customer has purchased, sorted by most recent.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                        <TableCell className="text-center">{summary.totalQuantity}</TableCell>
                                        <TableCell className="text-right">{currencySymbol}{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">{format(summary.lastPurchase, 'PP')}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No purchases yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary" /> Zen AI Customer Insights</CardTitle>
                    <CardDescription>Generate an AI-powered summary and suggestions for this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!insights && !isGeneratingInsights && (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="font-medium">Ready for some AI magic?</p>
                            <p className="text-sm text-muted-foreground mb-4">Analyze this customer's purchase history to get actionable insights.</p>
                            <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                                {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Insights
                            </Button>
                        </div>
                    )}
                    {isGeneratingInsights && (
                        <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    )}
                    {insights && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb /> AI Summary</h3>
                                <div className="text-muted-foreground prose prose-sm" dangerouslySetInnerHTML={{ __html: insights.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
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
