'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePOS } from '@/context/pos-context';
import { useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import type { Customer, Receipt } from '@/types';
import { getCustomerInsights } from '@/ai/flows/customer-insights-flow';
import type { CustomerInsightsOutput } from '@/ai/flows/customer-insights-types';
import NProgress from 'nprogress';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bot, Sparkles, BrainCircuit, Lightbulb, Package, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;
    const { toast } = useToast();

    const { firestore, currencySymbol, customers, isLoading: isPosLoading, currentUserProfile } = usePOS();
    
    const customer = React.useMemo(() => customers?.find(c => c.id === customerId), [customers, customerId]);

    const receiptsQuery = useMemoFirebase(() => {
        if (!firestore || !customerId) return null;
        return query(
            collection(firestore, "receipts"),
            where("customer.id", "==", customerId),
            orderBy("createdAt", "desc")
        );
    }, [firestore, customerId]);
    const { data: receipts, isLoading: isLoadingReceipts } = useCollection<Receipt>(receiptsQuery);

    const [insights, setInsights] = React.useState<CustomerInsightsOutput | null>(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false);
    const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleGenerateInsights = async () => {
        if (!customer || !receipts) return;
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
            setInsights(result);
        } catch (error) {
            console.error("Failed to generate insights:", error);
        } finally {
            setIsGeneratingInsights(false);
        }
    };
    
    const isLoading = isPosLoading || isLoadingReceipts;
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
    
    if (!customer) {
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
                            <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
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
                    {canDelete && (
                        <CardFooter>
                            <Button variant="destructive" className="w-full" onClick={() => setCustomerToDelete(customer)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Purchase History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Receipt ID</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {receipts && receipts.length > 0 ? receipts.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-mono text-xs">{r.id.substring(0, 8)}</TableCell>
                                        <TableCell>{format(r.createdAt.toDate(), 'PP')}</TableCell>
                                        <TableCell className="text-right">{currencySymbol}{r.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No purchases yet.</TableCell></TableRow>}
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
                                <Sparkles className="mr-2 h-4 w-4" /> Generate Insights
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
                                <p className="text-muted-foreground prose prose-sm">{insights.summary}</p>
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
                                {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
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
        </div>
    );
}
