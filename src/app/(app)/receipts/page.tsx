
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Inbox, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, runTransaction, orderBy } from 'firebase/firestore';
import type { Receipt, UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusiness, CURRENCY_SYMBOLS } from '@/context/pos-context';
import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import RefreshButton from "@/components/shared/refresh-button";
import { logAuditEvent } from '@/lib/audit';

// Hook to get current business ID and user profile
function useCurrentUserProfile() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    return { profile: userProfile, isLoading: !userProfile };
}

function ReceiptRowSkeleton() {
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

export default function ReceiptsPage() {
  const { profile: currentUser, isLoading: isProfileLoading } = useCurrentUserProfile();
  const firestore = useFirestore();
  const business = useBusiness();
  const { toast } = useToast();
  
  const [receiptToDelete, setReceiptToDelete] = React.useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const receiptsQuery = useMemoFirebase(() => {
    if (!currentUser?.businessId || !firestore) return null;
    // Restore the orderBy clause to sort receipts chronologically
    return query(collection(firestore, "receipts"), where("businessId", "==", currentUser.businessId), orderBy("createdAt", "desc"));
  }, [currentUser?.businessId, firestore]);

  const { data: receipts, isLoading: isReceiptsLoading } = useCollection<Receipt>(receiptsQuery);

  const isLoading = isProfileLoading || isReceiptsLoading;

  const currencySymbol = React.useMemo(() => {
    const code = business?.settings?.currency || 'NGN';
    return CURRENCY_SYMBOLS[code] || '₦';
  }, [business]);

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete || !firestore || !business || !currentUser) return;
    setIsDeleting(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const receiptRef = doc(firestore, 'receipts', receiptToDelete.id);
            const receiptDoc = await transaction.get(receiptRef);

            if (!receiptDoc.exists()) {
                throw new Error("Receipt not found. It may have already been deleted.");
            }

            const receiptData = receiptDoc.data() as Receipt;

            // 1. Read all necessary documents first
            const productRefs = receiptData.items.map(item => doc(firestore, 'products', item.productId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let customerDoc = null;
            if (receiptData.customer?.id && business.settings?.loyaltyProgramEnabled) {
                const customerRef = doc(firestore, 'customers', receiptData.customer.id);
                customerDoc = await transaction.get(customerRef);
            }
            
            // 2. Perform all write operations
            // 2a. Update product stock
            productDocs.forEach((pDoc, index) => {
                if (pDoc.exists()) {
                    const item = receiptData.items[index];
                    const newStock = (pDoc.data().stock || 0) + item.quantity;
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

            // 2c. Delete the receipt
            transaction.delete(receiptRef);
        });

        // Log audit event after successful void
        logAuditEvent(firestore, business.id, currentUser, {
            action: 'sale.void',
            entity: { type: 'Receipt', id: receiptToDelete.id, name: `Receipt ${receiptToDelete.id.substring(0, 8)}` },
            details: { total: receiptToDelete.total, reason: 'Manual void by user' }
        });

        toast({ title: 'Sale Voided', description: `Receipt ${receiptToDelete.id.substring(0,8)} has been voided and stock levels restored.`, variant: 'success' });
    } catch (e: any) {
        console.error("Failed to void sale:", e);
        toast({ title: 'Error', description: e.message || 'Could not void the sale.', variant: 'destructive' });
    } finally {
        setReceiptToDelete(null);
        setIsDeleting(false);
    }
  };

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A log of all completed sales.</CardDescription>
            </div>
            <RefreshButton />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Receipt ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <ReceiptRowSkeleton />
                    <ReceiptRowSkeleton />
                    <ReceiptRowSkeleton />
                    <ReceiptRowSkeleton />
                    <ReceiptRowSkeleton />
                </TableBody>
            </Table>
        ) : receipts && receipts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">{receipt.id.substring(0,8)}...</TableCell>
                <TableCell>{receipt.customer?.name || 'Walk-in'}</TableCell>
                <TableCell>{format(receipt.createdAt.toDate(), 'PP')}</TableCell>
                <TableCell>{receipt.paymentMethod}</TableCell>
                <TableCell className="text-right">{currencySymbol}{receipt.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => window.open(`/receipts/${receipt.id}`, '_blank')}>
                            <Eye className="mr-2 h-4 w-4"/> View
                        </DropdownMenuItem>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => { e.preventDefault(); setReceiptToDelete(receipt); }}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Void Sale
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
             <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">No Transactions Yet</h3>
                <p className="text-muted-foreground mt-2 mb-4">Completed sales will appear here.</p>
            </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={!!receiptToDelete} onOpenChange={(open) => !open && setReceiptToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to void this sale?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete receipt <strong>{receiptToDelete?.id.substring(0,8)}</strong>. 
                    Stock for all items will be restored and any loyalty points earned will be removed. 
                    This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteReceipt} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Void Sale
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
