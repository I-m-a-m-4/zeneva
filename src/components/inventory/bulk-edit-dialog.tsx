
'use client';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { usePOS } from '@/context/pos-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { logAuditEvent } from '@/lib/audit';
import type { Product } from '@/types';

interface BulkEditDialogProps {
  productIds: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export default function BulkEditDialog({ productIds, isOpen, onOpenChange, onSuccess }: BulkEditDialogProps) {
  const { products, currentUserProfile, currencySymbol, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedProducts, setEditedProducts] = React.useState<Record<string, { stock: number; price: number }>>({});

  const productsToEdit = React.useMemo(() => {
    if (!products) return [];
    return productIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p);
  }, [products, productIds]);

  React.useEffect(() => {
    if (isOpen) {
      const initialEdits: Record<string, { stock: number; price: number }> = {};
      productsToEdit.forEach(p => {
        if (p) {
          initialEdits[p.id] = { stock: p.stock || 0, price: p.price || 0 };
        }
      });
      setEditedProducts(initialEdits);
    }
  }, [isOpen, productsToEdit]);

  const handleFieldChange = (productId: string, field: 'stock' | 'price', value: string) => {
    const numericValue = field === 'stock' ? parseInt(value, 10) : parseFloat(value);
    if (!isNaN(numericValue) || value === '') {
      setEditedProducts(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value === '' ? (field === 'stock' ? 0 : 0.0) : numericValue,
        },
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (!firestore || !currentUserProfile || !productsToEdit || productsToEdit.length === 0) return;

    // Safety check
    const canManage = currentUserProfile.role === 'admin' || currentUserProfile.role === 'manager';
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to bulk edit products.' });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);

    productsToEdit.forEach(product => {
      if (product) {
        const updatedValues = editedProducts[product.id];
        if (updatedValues) {
          const productRef = doc(firestore, 'products', product.id);
          batch.update(productRef, {
            stock: updatedValues.stock,
            price: updatedValues.price,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    try {
      await batch.commit();

      // Log audit event
      await logAuditEvent(firestore, currentUserProfile.businessId, currentUserProfile, {
        action: 'product.bulk_update',
        entity: { type: 'Product', id: 'multiple', name: `${productsToEdit.length} products` },
        details: { productCount: productsToEdit.length, ids: productIds }
      });

      toast({
        variant: 'success',
        title: 'Products Updated',
        description: `${productsToEdit.length} products have been updated successfully.`,
      });
      onSuccess();
      onOpenChange(false);
      triggerRefresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Products</DialogTitle>
          <DialogDescription>
            Quickly edit the price and stock for {productIds.length} selected products.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-40">Price</TableHead>
                  <TableHead className="w-32">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsToEdit.map(product => product && (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={editedProducts[product.id]?.price ?? ''}
                          onChange={(e) => handleFieldChange(product.id, 'price', e.target.value)}
                          className="pl-6"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedProducts[product.id]?.stock ?? ''}
                        onChange={(e) => handleFieldChange(product.id, 'stock', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
