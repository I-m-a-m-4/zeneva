'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { AuditLog, Product } from '@/types';
import {
  RotateCcw,
  Search,
  Trash2,
  Package,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArchiveRestore,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DeletedProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletedProductsDialog({ open, onOpenChange }: DeletedProductsDialogProps) {
  const { business, products, auditLogs: cachedLogs, addToQueue, currentUserProfile, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [remoteLogs, setRemoteLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [restoringIds, setRestoringIds] = React.useState<Set<string>>(new Set());

  // Fetch deletion audit logs from Firestore when dialog opens
  React.useEffect(() => {
    if (!open || !business?.id || !firestore) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchDeletedLogs = async () => {
      try {
        const auditRef = collection(firestore, 'businessInstances', business.id, 'auditLogs');
        const q = query(
          auditRef,
          where('action', '==', 'product.delete'),
          limit(150)
        );
        const snap = await getDocs(q);
        if (!isMounted) return;

        const fetched: AuditLog[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as AuditLog));

        // Sort desc by createdAt
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime());
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime());
          return timeB - timeA;
        });

        setRemoteLogs(fetched);
      } catch (err) {
        console.warn('Could not fetch deleted product logs remotely, falling back to cached audit logs:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchDeletedLogs();

    return () => {
      isMounted = false;
    };
  }, [open, business?.id, firestore]);

  // Combine remote and local cached logs with deduplication
  const deletionLogs = React.useMemo(() => {
    const map = new Map<string, AuditLog>();

    // Cached logs first
    (cachedLogs || [])
      .filter(l => l.action === 'product.delete')
      .forEach(l => map.set(l.id, l));

    // Remote logs overwrite with fresher data
    remoteLogs.forEach(l => map.set(l.id, l));

    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime());
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime());
      return timeB - timeA;
    });

    return combined;
  }, [cachedLogs, remoteLogs]);

  // Set of current product IDs to detect whether a product is currently present/restored
  const liveProductIds = React.useMemo(() => {
    return new Set((products || []).map(p => p.id));
  }, [products]);

  // Filter logs by search term
  const filteredLogs = React.useMemo(() => {
    if (!searchTerm.trim()) return deletionLogs;
    const term = searchTerm.toLowerCase().trim();

    return deletionLogs.filter(log => {
      const name = String(log.details?.entityName || '').toLowerCase();
      const sku = String(log.details?.sku || '').toLowerCase();
      const user = String(log.userName || log.userEmail || '').toLowerCase();
      return name.includes(term) || sku.includes(term) || user.includes(term);
    });
  }, [deletionLogs, searchTerm]);

  const handleRestore = async (log: AuditLog) => {
    if (!business?.id || !currentUserProfile) return;

    const productId = log.entityId;
    if (!productId) {
      toast({
        title: 'Cannot restore product',
        description: 'Missing product identification in audit log.',
        variant: 'destructive',
      });
      return;
    }

    setRestoringIds(prev => new Set(prev).add(log.id));

    try {
      const details = log.details || {};
      const snapshot: Partial<Product> | null = details.productSnapshot || null;

      const restoredProduct: Product = snapshot
        ? {
            ...snapshot,
            id: productId,
            businessId: business.id,
            name: snapshot.name || details.entityName || 'Restored Product',
            sku: snapshot.sku || details.sku || `SKU-${Date.now()}`,
            category: snapshot.category || details.category || 'General',
            price: Number(snapshot.price ?? details.price ?? 0),
            costPrice: Number(snapshot.costPrice ?? details.costPrice ?? 0),
            stock: Number(snapshot.stock ?? details.stockAtDeletion ?? 0),
            updatedAt: new Date(),
          } as Product
        : {
            id: productId,
            businessId: business.id,
            name: details.entityName || 'Restored Product',
            sku: details.sku || `SKU-${Date.now()}`,
            category: details.category || 'General',
            price: Number(details.price || 0),
            costPrice: Number(details.costPrice || 0),
            stock: Number(details.stockAtDeletion || 0),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

      // 1. Add product back into catalog
      addToQueue(
        {
          type: 'add-product',
          payload: restoredProduct,
        },
        `Restoring product "${restoredProduct.name}"`
      );

      // 2. Record audit log for the restoration
      addToQueue(
        {
          type: 'add-audit-log',
          payload: {
            businessId: business.id,
            userId: currentUserProfile.id,
            userName: currentUserProfile.name,
            userEmail: currentUserProfile.email,
            userRole: currentUserProfile.role,
            action: 'product.restore',
            entityType: 'Product',
            entityId: productId,
            details: {
              entityName: restoredProduct.name,
              sku: restoredProduct.sku,
              restoredStock: restoredProduct.stock,
              restoredPrice: restoredProduct.price,
              originalDeleteLogId: log.id,
            },
          },
        },
        `Logging restoration of "${restoredProduct.name}"`
      );

      toast({
        title: 'Product Restored',
        description: `"${restoredProduct.name}" has been restored to your inventory with ${restoredProduct.stock} in stock.`,
      });
    } catch (err: any) {
      console.error('Failed to restore product:', err);
      toast({
        title: 'Failed to restore',
        description: err?.message || 'An error occurred while restoring the product.',
        variant: 'destructive',
      });
    } finally {
      setRestoringIds(prev => {
        const next = new Set(prev);
        next.delete(log.id);
        return next;
      });
    }
  };

  const parseLogDate = (rawDate: any): Date | null => {
    if (!rawDate) return null;
    try {
      if (typeof rawDate.toDate === 'function') return rawDate.toDate();
      if (typeof rawDate.toMillis === 'function') return new Date(rawDate.toMillis());
      if (typeof rawDate.seconds === 'number') return new Date(rawDate.seconds * 1000);
      const parsed = new Date(rawDate);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <ArchiveRestore className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Deleted Products Archive
                <Badge variant="secondary" className="text-xs font-semibold">
                  {deletionLogs.length} Deleted
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Audit and recover products removed from your store inventory.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, SKU, or user..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden border rounded-lg bg-card">
          <ScrollArea className="h-[440px]">
            {isLoading && deletionLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Loading deleted products history...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <div className="p-3 rounded-full bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">No deleted products found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchTerm ? 'No results matched your search term.' : 'No products have been deleted in this business.'}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-[30%]">Product</TableHead>
                    <TableHead className="text-center">Stock At Deletion</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => {
                    const details = log.details || {};
                    const name = details.entityName || 'Unnamed Product';
                    const sku = details.sku || 'No SKU';
                    const stock = details.stockAtDeletion ?? 0;
                    const price = details.price ?? 0;
                    const date = parseLogDate(log.createdAt);
                    const isAlreadyRestored = liveProductIds.has(log.entityId);
                    const isRestoring = restoringIds.has(log.id);

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                              {name}
                              {isAlreadyRestored && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 font-medium">
                                  In Catalog
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">
                              SKU: {sku}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-sm">
                          <Badge variant={stock > 0 ? 'secondary' : 'outline'} className="font-mono text-xs">
                            {stock} units
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {currencySymbol}{Number(price).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[130px]">{log.userName || log.userEmail || 'System'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            <span>{date ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown'}</span>
                            {date && <span className="text-[10px] text-muted-foreground/80">{date.toLocaleDateString()}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAlreadyRestored ? (
                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50/50">
                              <CheckCircle2 className="w-3 h-3 me-1" />
                              Active
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isRestoring}
                              onClick={() => handleRestore(log)}
                              className="h-8 gap-1.5 font-medium border-orange-200 dark:border-orange-900/50 hover:bg-orange-500 hover:text-white transition-all text-xs text-orange-600 dark:text-orange-400"
                            >
                              {isRestoring ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              Restore
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Restoring a product re-adds it to your catalog and synchronizes it across all devices.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
