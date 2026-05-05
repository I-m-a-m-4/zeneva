
'use client';

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Product, UserProfile } from '@/types';
import { usePOS } from '@/context/pos-context';
import { getIndustryConfig } from '@/lib/industry';

interface QuickEditDialogProps {
  product: Product | null;
  userProfile: UserProfile;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const quickEditSchema = z.object({
  price: z.coerce.number().min(0, "Price must be a positive number."),
  costPrice: z.coerce.number().min(0, "Cost price must be positive.").optional(),
  stock: z.coerce.number().int("Stock must be a whole number.").min(0),
  material: z.string().optional(),
  variantValue: z.string().optional(),
  baseUnit: z.string().optional(),
  dosage: z.string().optional(),
  manufacturer: z.string().optional(),
  weightVolume: z.string().optional(),
  brand: z.string().optional(),
  packaging: z.string().optional(),
  spiceLevel: z.string().optional(),
});

type QuickEditFormValues = z.infer<typeof quickEditSchema>;

export default function QuickEditDialog({ product, userProfile, isOpen, onOpenChange }: QuickEditDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { triggerRefresh, addToQueue, business } = usePOS();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isSubmittingRef = React.useRef(false);
  const industryConfig = getIndustryConfig(business?.settings?.industry);


  const canManageProduct = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  const form = useForm<QuickEditFormValues>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      price: 0,
      costPrice: 0,
      stock: 0,
      material: '',
      variantValue: '',
      baseUnit: '',
      dosage: '',
      manufacturer: '',
      weightVolume: '',
      brand: '',
      packaging: '',
      spiceLevel: '',
    },
  });

  // This useEffect will reset the form whenever a new product is selected
  React.useEffect(() => {
    if (product) {
      form.reset({
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        stock: product.stock || 0,
        material: (product as any).material || '',
        variantValue: product.variantValue || '',
        baseUnit: product.baseUnit || '',
        dosage: (product as any).dosage || '',
        manufacturer: (product as any).manufacturer || '',
        weightVolume: (product as any).weightVolume || '',
        brand: (product as any).brand || '',
        packaging: (product as any).packaging || '',
        spiceLevel: (product as any).spiceLevel || '',
      });
    }
  }, [product, form]);


  const handleUpdate = async (values: QuickEditFormValues) => {
    if (!product || isSubmitting || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const dataToUpdate: any = {};

      if (canManageProduct) {
        dataToUpdate.price = values.price;
        dataToUpdate.costPrice = values.costPrice;
        dataToUpdate.stock = values.stock;
        dataToUpdate.material = values.material;
        dataToUpdate.variantValue = values.variantValue;
        dataToUpdate.baseUnit = values.baseUnit;
        dataToUpdate.dosage = values.dosage;
        dataToUpdate.manufacturer = values.manufacturer;
        dataToUpdate.weightVolume = values.weightVolume;
        dataToUpdate.brand = values.brand;
        dataToUpdate.packaging = values.packaging;
        dataToUpdate.spiceLevel = values.spiceLevel;

        if (values.stock !== product.stock) {
          addToQueue({
            type: 'add-audit-log',
            payload: {
              businessId: business.id,
              userId: userProfile.id,
              userName: userProfile.name,
              userEmail: userProfile.email,
              userRole: userProfile.role,
              action: 'product.stock_adjustment',
              entityType: 'Product',
              entityId: product.id,
              details: { 
                entityName: product.name,
                oldStock: product.stock, 
                newStock: values.stock, 
                adjustment: values.stock - (product.stock || 0),
                reason: 'Manual Quick Edit'
              }
            }
          }, `Logging stock adjustment for ${product.name}`);
        }
      }

      addToQueue({
        type: 'update-product',
        payload: {
          productId: product.id,
          values: dataToUpdate
        }
      }, `Quick edit for ${product.name}`);

      toast({
        variant: 'success',
        title: 'Changes Saved',
        description: `${product.name} will be updated ${navigator.onLine ? 'momentarily' : 'when you come online'}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not queue product update. Please try again.',
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Edit: {product?.name}</DialogTitle>
          <DialogDescription>
            Quickly update pricing {product?.categoryType === 'service' ? '' : 'and stock '}for this {product?.categoryType === 'service' ? 'service' : 'product'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={!canManageProduct} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={!canManageProduct} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {product?.categoryType !== 'service' && (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!canManageProduct} />
                    </FormControl>
                    {product?.type === 'composite' && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
                        Note: This is a bundle. Stock is usually managed via its components.
                      </p>
                    )}
                    {!canManageProduct && <p className="text-xs text-muted-foreground pt-1">You don't have permission to edit stock.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <FormField
                    control={form.control}
                    name="baseUnit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Measurement Unit</FormLabel>
                        <FormControl>
                            <Input placeholder={industryConfig.defaultUnit} {...field} disabled={!canManageProduct} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {industryConfig.productFields.map((fieldDef) => (
                    <FormField
                        key={fieldDef.key}
                        control={form.control}
                        name={fieldDef.key as any}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{fieldDef.label}</FormLabel>
                            <FormControl>
                                <Input placeholder={fieldDef.placeholder} {...field} disabled={!canManageProduct} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
            </div>
            <DialogFooter className='mt-6'>
              <Button variant="outline" size="lg" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="lg" disabled={isSubmitting || !canManageProduct}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
