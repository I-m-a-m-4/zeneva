'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Trash2, Plus, Sparkles, Search,
  ArrowRight, Package, AlertCircle, RefreshCw, Check, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePOS } from '@/context/pos-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SheetRowItem {
  id: string;
  rawName: string;
  quantity: number;
  price?: number | null;
  matchedProduct?: {
    id: string;
    name: string;
    price: number;
    stock: number;
    sku?: string;
    imageUrl?: string;
    costPrice?: number | null;
  } | null;
  matchStatus?: 'matched' | 'suggested' | 'unmatched';
  matchConfidence?: number;
}

export interface RestockSheetProposalProps {
  sheetTitle?: string;
  items: SheetRowItem[];
  imageUrl?: string;
  status?: 'pending' | 'approved' | 'discarded';
  onApproveSuccess?: (approvedCount: number) => void;
  onDiscard?: () => void;
}

export function RestockSheetProposal({
  sheetTitle = 'Inventory Restock Sheet',
  items: initialItems,
  imageUrl,
  status: initialStatus = 'pending',
  onApproveSuccess,
  onDiscard,
}: RestockSheetProposalProps) {
  const { products, addToQueue } = usePOS();
  const { toast } = useToast();

  const [items, setItems] = React.useState<SheetRowItem[]>(initialItems);
  const [status, setStatus] = React.useState<'pending' | 'approved' | 'discarded'>(initialStatus);
  const [isApplying, setIsApplying] = React.useState(false);
  const [mode, setMode] = React.useState<'add' | 'set'>('add'); // 'add' = add to current stock, 'set' = set exact stock
  const [activeSearchRowId, setActiveSearchRowId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleQuantityChange = (id: string, newQty: number) => {
    if (status !== 'pending') return;
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, quantity: Math.max(0, newQty) } : row))
    );
  };

  const handleSelectProduct = (rowId: string, product: Product | null) => {
    if (status !== 'pending') return;
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!product) {
          return { ...row, matchedProduct: null, matchStatus: 'unmatched', matchConfidence: 0 };
        }
        return {
          ...row,
          matchedProduct: {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock ?? 0,
            sku: product.sku || '',
            imageUrl: product.imageUrl || '',
            costPrice: product.costPrice ?? null,
          },
          matchStatus: 'matched',
          matchConfidence: 1,
        };
      })
    );
    setActiveSearchRowId(null);
    setSearchTerm('');
  };

  const handleRemoveRow = (id: string) => {
    if (status !== 'pending') return;
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddBlankRow = () => {
    if (status !== 'pending') return;
    const newId = `manual-row-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        rawName: 'Manual Entry',
        quantity: 1,
        price: null,
        matchedProduct: null,
        matchStatus: 'unmatched',
      },
    ]);
  };

  const handleApprove = async () => {
    if (status !== 'pending' || isApplying) return;

    const validRows = items.filter((row) => row.matchedProduct && row.quantity > 0);
    if (validRows.length === 0) {
      toast({
        title: 'No matched products',
        description: 'Please match at least one product with quantity > 0 before approving.',
        variant: 'destructive',
      });
      return;
    }

    setIsApplying(true);
    try {
      let appliedCount = 0;
      for (const row of validRows) {
        const prod = products?.find((p) => p.id === row.matchedProduct!.id) || row.matchedProduct!;
        const currentStock = prod.stock ?? 0;
        const newStock = mode === 'add' ? currentStock + row.quantity : row.quantity;

        addToQueue(
          {
            type: 'update-product',
            payload: {
              productId: prod.id,
              values: {
                stock: newStock,
                ...(row.price ? { costPrice: row.price } : {}),
              },
            },
          },
          `Zen AI Restock: ${prod.name} stock (${currentStock} → ${newStock})`
        );
        appliedCount++;
      }

      setStatus('approved');
      toast({
        title: 'Inventory updated successfully',
        description: `Applied ${appliedCount} product updates to your catalog queue.`,
        variant: 'success',
      });

      if (onApproveSuccess) {
        onApproveSuccess(appliedCount);
      }
    } catch (err: any) {
      console.error('Failed to apply restock proposal:', err);
      toast({
        title: 'Failed to apply restock',
        description: err.message || 'An error occurred while updating inventory.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    setStatus('discarded');
    if (onDiscard) onDiscard();
  };

  const filteredCatalogProducts = React.useMemo(() => {
    if (!searchTerm.trim()) return (products || []).slice(0, 20);
    const lower = searchTerm.toLowerCase();
    return (products || [])
      .filter((p) => p.name.toLowerCase().includes(lower) || (p.sku && p.sku.toLowerCase().includes(lower)))
      .slice(0, 25);
  }, [products, searchTerm]);

  const totalUnits = items.reduce((acc, row) => (row.matchedProduct ? acc + (Number(row.quantity) || 0) : acc), 0);
  const matchedCount = items.filter((r) => !!r.matchedProduct).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full my-3 rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{sheetTitle}</h3>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                GPT-4o Vision
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {matchedCount} of {items.length} items matched • {totalUnits} total units to update
            </p>
          </div>
        </div>

        {/* Mode switcher: Add to stock vs Set stock */}
        {status === 'pending' && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                mode === 'add'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              + Add to Stock
            </button>
            <button
              type="button"
              onClick={() => setMode('set')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                mode === 'set'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              = Exact Count
            </button>
          </div>
        )}
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/15 text-muted-foreground font-semibold">
              <th className="py-2.5 px-3">From Photo</th>
              <th className="py-2.5 px-3 min-w-[220px]">Matched Store Product</th>
              <th className="py-2.5 px-3 w-28 text-center">Pieces</th>
              <th className="py-2.5 px-3 min-w-[120px]">Stock Preview</th>
              {status === 'pending' && <th className="py-2.5 px-3 w-10 text-center"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.map((row) => {
              const matched = row.matchedProduct;
              const liveProduct = products?.find((p) => p.id === matched?.id);
              const currentStock = liveProduct?.stock ?? matched?.stock ?? 0;
              const nextStock = mode === 'add' ? currentStock + (Number(row.quantity) || 0) : Number(row.quantity) || 0;

              return (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors group">
                  {/* Photo note */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-foreground tracking-tight block truncate max-w-[150px] sm:max-w-[190px]" title={row.rawName}>
                      {row.rawName}
                    </span>
                    {row.price != null && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ₦{Number(row.price).toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Matched Product Picker */}
                  <td className="py-2.5 px-3">
                    <Popover
                      open={activeSearchRowId === row.id}
                      onOpenChange={(open) => {
                        if (status !== 'pending') return;
                        setActiveSearchRowId(open ? row.id : null);
                        setSearchTerm('');
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          disabled={status !== 'pending'}
                          className={cn(
                            'w-full text-left p-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all',
                            matched
                              ? 'bg-card border-border hover:border-primary/50'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
                            status !== 'pending' && 'cursor-default pointer-events-none'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden text-[10px]">
                              {matched?.imageUrl ? (
                                <img src={matched.imageUrl} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <Package className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <span className="truncate font-medium text-xs">
                              {matched ? matched.name : 'Select or search matching product...'}
                            </span>
                          </div>
                          {status === 'pending' && (
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search catalog products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredCatalogProducts.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProduct(row.id, prod)}
                              className="w-full text-left p-2 rounded-lg hover:bg-muted flex items-center justify-between gap-2 transition-colors text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{prod.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Stock: {prod.stock ?? 0} • ₦{Number(prod.price).toLocaleString()}
                                </p>
                              </div>
                              {matched?.id === prod.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleSelectProduct(row.id, null)}
                            className="w-full text-left p-2 rounded-lg hover:bg-destructive/10 text-destructive text-xs transition-colors"
                          >
                            Unlink / Skip this row
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>

                  {/* Quantity / Pieces input */}
                  <td className="py-2.5 px-3 text-center">
                    {status === 'pending' ? (
                      <div className="inline-flex items-center border border-border/80 rounded-lg overflow-hidden bg-background">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(row.id, row.quantity - 1)}
                          className="px-2 py-1 text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(row.id, parseInt(e.target.value, 10) || 0)}
                          className="w-12 text-center text-xs font-semibold tabular-nums outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(row.id, row.quantity + 1)}
                          className="px-2 py-1 text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-foreground tabular-nums">{row.quantity}</span>
                    )}
                  </td>

                  {/* Stock preview */}
                  <td className="py-2.5 px-3">
                    {matched ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground tabular-nums">{currentStock}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {nextStock}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No product chosen</span>
                    )}
                  </td>

                  {/* Delete row */}
                  {status === 'pending' && (
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer & Actions */}
      <div className="p-3 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        {status === 'pending' ? (
          <>
            <button
              type="button"
              onClick={handleAddBlankRow}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-orange-500" />
              <span>Add another product row</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="text-xs h-8"
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApprove}
                disabled={isApplying || matchedCount === 0}
                className="text-xs h-8 bg-foreground text-background hover:opacity-90 gap-1.5 shadow-sm"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Updating Inventory...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Approve & Update ({matchedCount} products)</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : status === 'approved' ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Stock updates approved and recorded to inventory.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
            <XCircle className="h-4 w-4" />
            <span>Stock sheet proposal was discarded.</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
