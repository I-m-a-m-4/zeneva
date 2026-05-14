
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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
import { Eye, Inbox, MoreHorizontal, Trash2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import type { Receipt } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import RefreshButton from "@/components/shared/refresh-button";
import { logAuditEvent } from '@/lib/audit';
import { safeToDate } from '@/lib/utils';

function ReceiptRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
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
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ReceiptsContent />
    </Suspense>
  );
}

function ReceiptsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const customerId = searchParams.get('customerId');
  
  const { 
    receipts, 
    isLoading: isPosLoading, 
    business, 
    currentUserProfile: currentUser, 
    currencySymbol, 
    triggerRefresh,
    searchReceipts,
    fetchMoreReceipts,
    voidReceipt
  } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [receiptToDelete, setReceiptToDelete] = React.useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(receipts ? receipts.length >= 50 : true);

  // Update hasMore if receipts change
  React.useEffect(() => {
    if (receipts && receipts.length < 50) {
      setHasMore(false);
    }
  }, [receipts]);

  const displayedReceipts = React.useMemo(() => {
    if (!receipts) return [];
    let filtered = receipts.filter(r => r && r.paymentMethod !== 'Invoice');
    
    if (customerId) {
      filtered = filtered.filter(r => r.customer?.id === customerId);
    } else if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const receiptId = r.id || '';
        const rNumber = r.receiptNumber || `rec-${receiptId.substring(0, 8)}`;
        
        return rNumber.toLowerCase().includes(lower) || 
          receiptId.toLowerCase().includes(lower) || 
          (r.customer?.name || '').toLowerCase().includes(lower) ||
          (r.paymentMethod || '').toLowerCase().includes(lower) ||
          (r.total || 0).toString().includes(lower);
      });
    }
    return filtered;
  }, [receipts, searchTerm, customerId]);

  const handleLoadMore = async () => {
    setIsFetchingMore(true);
    const count = await fetchMoreReceipts();
    if (count === 0) setHasMore(false);
    setIsFetchingMore(false);
  };

    const safeFormatDate = (val: any) => {
        if (!val) return 'N/A';
        const date = safeToDate(val);
        if (date.getTime() === 0) return 'N/A';
        return format(date, 'PP');
    };

    const safeFormatTime = (val: any) => {
        if (!val) return 'N/A';
        const date = safeToDate(val);
        if (date.getTime() === 0) return 'N/A';
        return format(date, 'p');
    };

    const isLoading = isPosLoading || receipts === null;

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

      // Log audit event after successful void (Awaiting for reliability)
      await logAuditEvent(firestore, business.id, currentUser, {
        action: 'sale.void',
        entity: { type: 'Receipt', id: receiptToDelete.id, name: `Receipt ${receiptToDelete.id.substring(0, 8)}` },
        details: { total: receiptToDelete.total, reason: 'Manual void by user' }
      });

      toast({ title: 'Sale Voided', description: `Receipt ${receiptToDelete.id.substring(0, 8)} has been voided and stock levels restored.`, variant: 'success' });
      await voidReceipt(receiptToDelete.id);
    } catch (e: any) {
      console.error("Failed to void sale:", e);
      
      // Fallback: Even if the direct online transaction failed (e.g. network error, already deleted, or sync mismatch),
      // we MUST call voidReceipt to clear it from local cache and enqueue the operation for safety.
      await voidReceipt(receiptToDelete.id);
      
      toast({ 
        title: 'Offline Void Handled', 
        description: 'The sale was voided locally and the update queued for synchronization.',
        variant: 'default' 
      });
    } finally {
      setReceiptToDelete(null);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>A log of all completed sales.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-full sm:w-64 no-print">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sales..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <RefreshButton />
            </div>
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
                  <TableHead>Time</TableHead>
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
          ) : displayedReceipts && displayedReceipts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedReceipts.map((receipt: Receipt) => (
                    <TableRow 
                      key={receipt.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/receipts/details?id=${receipt.id}`)}
                    >
                      <TableCell className="font-medium font-mono text-xs whitespace-nowrap">
                        {receipt.receiptNumber || `rec-${(receipt.id || '').substring(0, 8)}`}
                      </TableCell>
                      <TableCell>{receipt.customer?.name || 'Walk-in'}</TableCell>
                      <TableCell className="whitespace-nowrap">{safeFormatDate(receipt.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{safeFormatTime(receipt.createdAt)}</TableCell>
                      <TableCell>{receipt.paymentMethod || 'N/A'}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{(receipt.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push(`/receipts/details?id=${receipt.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => { e.preventDefault(); setReceiptToDelete(receipt); }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Void Sale
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
              
              {!searchTerm && hasMore && (
                <div className="flex justify-center mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore} 
                    disabled={isFetchingMore}
                    className="min-w-[200px]"
                  >
                    {isFetchingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Receipts'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed rounded-lg">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">No Transactions Found</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {searchTerm ? 'Try a different search term.' : 'Completed sales will appear here.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptToDelete} onOpenChange={(open) => !open && setReceiptToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to void this sale?</DialogTitle>
            <DialogDescription>
              This will permanently delete receipt <strong>{receiptToDelete?.receiptNumber || `rec-${receiptToDelete?.id.substring(0, 8)}`}</strong>.
              Stock for all items will be restored and any loyalty points earned will be removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDeleteReceipt} disabled={isDeleting} variant="destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
