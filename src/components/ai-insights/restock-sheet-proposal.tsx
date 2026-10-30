'use client';

import * as React from 'react';
import {
  CheckCircle2, XCircle, Trash2, Plus, Sparkles, Search,
  ArrowRight, Package, AlertCircle, RefreshCw, Check, Layers,
  Camera, Eye, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePOS } from '@/context/pos-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Maximize2 } from 'lucide-react';
import { ImageLightboxModal } from '@/components/shared/image-lightbox-modal';

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
  topCandidate?: {
    product: Product;
    score: number;
  } | null;
}

export interface RestockSheetProposalProps {
  sheetTitle?: string;
  items: SheetRowItem[];
  imageUrl?: string;
  imageUrls?: string[];
  status?: 'pending' | 'approved' | 'discarded';
  onApproveSuccess?: (approvedCount: number) => void;
  onDiscard?: () => void;
}

/**
 * Normalizes text for clean fuzzy token comparison.
 */
function cleanText(str: string): string {
  return (str || '')
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast client-side fuzzy matcher comparing scanned sheet text to the store's inventory.
 */
function findBestCatalogMatch(
  rawName: string,
  catalog: Product[]
): { product: Product; score: number } | null {
  if (!rawName || !catalog || catalog.length === 0) return null;

  const rawClean = cleanText(rawName);
  if (!rawClean) return null;

  const rawTokens = rawClean.split(' ').filter((t) => t.length > 1);

  let bestProd: Product | null = null;
  let bestScore = 0;

  for (const prod of catalog) {
    if (!prod.name || (prod as any).deleted) continue;
    const prodClean = cleanText(prod.name);
    if (!prodClean) continue;

    // 1. Exact string match
    if (prodClean === rawClean) {
      return { product: prod, score: 1.0 };
    }

    // 2. Full containment
    if (prodClean.includes(rawClean) || rawClean.includes(prodClean)) {
      const minL = Math.min(prodClean.length, rawClean.length);
      const maxL = Math.max(prodClean.length, rawClean.length);
      const score = 0.85 + 0.15 * (minL / maxL);
      if (score > bestScore) {
        bestScore = score;
        bestProd = prod;
      }
      continue;
    }

    // 3. Token overlap
    const prodTokens = new Set(prodClean.split(' ').filter((t) => t.length > 1));
    if (prodTokens.size === 0 || rawTokens.length === 0) continue;

    let shared = 0;
    for (const rt of rawTokens) {
      if (prodTokens.has(rt)) {
        shared += 1;
      } else {
        // partial token substring/prefix (e.g. "tretin" in "tretinoin")
        for (const pt of prodTokens) {
          if (pt.length >= 4 && rt.length >= 4 && (pt.includes(rt) || rt.includes(pt))) {
            shared += 0.65;
            break;
          }
        }
      }
    }

    const score = shared / Math.max(rawTokens.length, prodTokens.size);
    if (score > bestScore) {
      bestScore = score;
      bestProd = prod;
    }
  }

  if (bestProd && bestScore > 0.18) {
    return { product: bestProd, score: Math.min(1, Math.round(bestScore * 100) / 100) };
  }
  return null;
}

export const RestockSheetProposal = React.memo(function RestockSheetProposal({
  sheetTitle = 'Inventory Restock Sheet',
  items: initialItems,
  imageUrl,
  imageUrls,
  status: initialStatus = 'pending',
  onApproveSuccess,
  onDiscard,
}: RestockSheetProposalProps) {
  const { products, addToQueue, isReadOnly } = usePOS();
  const { toast } = useToast();

  const [items, setItems] = React.useState<SheetRowItem[]>(() => {
    if (!products || products.length === 0) return initialItems;
    return initialItems.map((row) => {
      if (row.matchedProduct && row.matchedProduct.id) return row;
      const candidate = findBestCatalogMatch(row.rawName, products);
      if (!candidate) return row;
      if (candidate.score >= 0.38) {
        return {
          ...row,
          matchedProduct: {
            id: candidate.product.id,
            name: candidate.product.name,
            price: candidate.product.price,
            stock: candidate.product.stock ?? 0,
            sku: candidate.product.sku || '',
            imageUrl: candidate.product.imageUrl || '',
            costPrice: candidate.product.costPrice ?? null,
          },
          matchConfidence: candidate.score,
          matchStatus: candidate.score >= 0.85 ? 'matched' : 'suggested',
          topCandidate: candidate,
        };
      }
      return { ...row, topCandidate: candidate };
    });
  });

  const [status, setStatus] = React.useState<'pending' | 'approved' | 'discarded'>(initialStatus);
  const [isApplying, setIsApplying] = React.useState(false);
  const [mode, setMode] = React.useState<'add' | 'set'>('add'); // 'add' = add to current stock, 'set' = set exact stock
  const [activeSearchRowId, setActiveSearchRowId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterTab, setFilterTab] = React.useState<'all' | 'needs_match' | 'matched'>('all');
  const [previewImage, setPreviewImage] = React.useState<{
    url: string;
    title: string;
    subtitle?: string;
    gallery?: string[];
    initialIndex?: number;
  } | null>(null);
  const hasAutoMatchedRef = React.useRef(false);

  // Auto-crosscheck unmatched items against live store products once when products load
  React.useEffect(() => {
    if (!products || products.length === 0 || hasAutoMatchedRef.current) return;
    hasAutoMatchedRef.current = true;

    setItems((prev) =>
      prev.map((row) => {
        // If already matched with product details, keep it
        if (row.matchedProduct && row.matchedProduct.id) {
          return row;
        }

        const candidate = findBestCatalogMatch(row.rawName, products);
        if (!candidate) return row;

        // Auto-match if confidence is reasonable (>= 0.38)
        if (candidate.score >= 0.38) {
          return {
            ...row,
            matchedProduct: {
              id: candidate.product.id,
              name: candidate.product.name,
              price: candidate.product.price,
              stock: candidate.product.stock ?? 0,
              sku: candidate.product.sku || '',
              imageUrl: candidate.product.imageUrl || '',
              costPrice: candidate.product.costPrice ?? null,
            },
            matchConfidence: candidate.score,
            matchStatus: candidate.score >= 0.85 ? 'matched' : 'suggested',
            topCandidate: candidate,
          };
        }

        return {
          ...row,
          topCandidate: candidate,
        };
      })
    );
  }, [products]);

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

    if (isReadOnly) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Please upgrade to record stock updates.',
        variant: 'destructive',
      });
      return;
    }

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
    if (!searchTerm.trim()) return (products || []).slice(0, 30);
    const lower = searchTerm.toLowerCase();
    return (products || [])
      .filter((p) => p.name.toLowerCase().includes(lower) || (p.sku && p.sku.toLowerCase().includes(lower)))
      .slice(0, 30);
  }, [products, searchTerm]);

  const totalUnits = items.reduce((acc, row) => (row.matchedProduct ? acc + (Number(row.quantity) || 0) : acc), 0);
  const matchedCount = items.filter((r) => !!r.matchedProduct).length;
  const unmatchedCount = items.length - matchedCount;

  const displayedItems = React.useMemo(() => {
    if (filterTab === 'needs_match') {
      return items.filter((r) => !r.matchedProduct);
    }
    if (filterTab === 'matched') {
      return items.filter((r) => !!r.matchedProduct);
    }
    return items;
  }, [items, filterTab]);

  return (
    <div className="w-full my-3 rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            {(() => {
              const allPhotos = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
              return (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">{sheetTitle}</h3>
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 font-medium">
                      Zen Vision
                    </Badge>
                    {allPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({
                          url: allPhotos[0],
                          title: sheetTitle || 'Original Scanned Stock Sheet',
                          subtitle: `${allPhotos.length} photo${allPhotos.length > 1 ? 's' : ''} uploaded for Zen Vision analysis`,
                          gallery: allPhotos,
                          initialIndex: 0,
                        })}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/30 transition-all cursor-pointer shadow-2xs"
                        title="Click to view original scanned stock sheet"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-500" />
                        <span>View Scanned Photo{allPhotos.length > 1 ? `s (${allPhotos.length})` : ''}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {matchedCount} of {items.length} items matched
                    {allPhotos.length > 1 ? ` across ${allPhotos.length} photos` : ''} • {totalUnits} total units to update
                  </p>
                </>
              );
            })()}
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

      {/* Filter Tabs & Quick Summary */}
      <div className="px-4 py-2.5 border-b border-border/40 bg-muted/10 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg font-medium transition-colors',
              filterTab === 'all'
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            All Items ({items.length})
          </button>
          {unmatchedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab('needs_match')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1',
                filterTab === 'needs_match'
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
              )}
            >
              <AlertCircle className="h-3 w-3" />
              Needs Match ({unmatchedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterTab('matched')}
            className={cn(
              'px-2.5 py-1 rounded-lg font-medium transition-colors',
              filterTab === 'matched'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            Matched ({matchedCount})
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground">
          Cross-referenced with live store inventory
        </span>
      </div>

      {/* Product Match Deck (Cards View) */}
      <div className="p-3 sm:p-4 space-y-3 max-h-[72vh] overflow-y-auto">
        {displayedItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No items in this filter view.
          </div>
        ) : (
          displayedItems.map((row, idx) => {
            const matched = row.matchedProduct;
            const liveProduct = products?.find((p) => p.id === matched?.id);
            const currentStock = liveProduct?.stock ?? matched?.stock ?? 0;
            const nextStock = mode === 'add' ? currentStock + (Number(row.quantity) || 0) : Number(row.quantity) || 0;
            const isUnmatched = !matched;

            return (
              <div
                key={row.id}
                className={cn(
                  'rounded-2xl border p-3.5 sm:p-4 transition-all bg-card shadow-2xs flex flex-col gap-3',
                  isUnmatched
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : 'border-border/80 hover:border-primary/40'
                )}
              >
                {/* Top Row: Scanned photo line & Quantity Stepper */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="h-6 px-2 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 flex items-center gap-1">
                          <Camera className="h-3 w-3 text-orange-500" /> Scanned Line
                        </span>
                        {row.price != null && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                            ₦{Number(row.price).toLocaleString()} unit cost
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground mt-0.5 break-words">
                        {row.rawName}
                      </h4>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 bg-muted/40 p-1.5 rounded-xl border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground px-1">
                      {mode === 'add' ? 'Add Units:' : 'Set Count:'}
                    </span>
                    {status === 'pending' ? (
                      <div className="inline-flex items-center border border-border rounded-lg overflow-hidden bg-background shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(row.id, row.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground font-bold transition-colors text-sm"
                          title="Decrease"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(row.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-center text-sm font-bold tabular-nums outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(row.id, row.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground font-bold transition-colors text-sm"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-foreground text-sm px-2 tabular-nums">
                        {row.quantity} pcs
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Cross-checked Store Product Card */}
                <div>
                  {matched ? (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => {
                            if (matched.imageUrl) {
                              setPreviewImage({
                                url: matched.imageUrl,
                                title: matched.name,
                                subtitle: `SKU: ${matched.sku || 'N/A'} • Stock: ${matched.stock} • Price: ₦${Number(matched.price).toLocaleString()}`,
                              });
                            }
                          }}
                          className={cn(
                            "h-12 w-12 rounded-xl bg-background border border-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative group transition-all",
                            matched.imageUrl ? "cursor-pointer hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20" : ""
                          )}
                          title={matched.imageUrl ? "Click to inspect product image" : undefined}
                        >
                          {matched.imageUrl ? (
                            <>
                              <img src={matched.imageUrl} alt={matched.name} className="h-full w-full object-contain" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                            </>
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground truncate max-w-xs sm:max-w-md">
                              {matched.name}
                            </p>
                            {row.matchConfidence ? (
                              row.matchConfidence >= 0.85 ? (
                                <Badge className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold gap-1">
                                  <Check className="h-3 w-3" /> Exact ({Math.round(row.matchConfidence * 100)}%)
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold gap-1">
                                  <Sparkles className="h-3 w-3" /> Best Match ({Math.round(row.matchConfidence * 100)}%)
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                                Matched
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>Current: <strong className="text-foreground">{currentStock}</strong> in stock</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <span>After restock: {nextStock}</span>
                              <span className="text-[10px] font-normal text-muted-foreground">({mode === 'add' ? `+${row.quantity}` : 'set'})</span>
                            </span>
                            <span>•</span>
                            <span>₦{Number(matched.price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Change / Search Popover & Delete */}
                      {status === 'pending' && (
                        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                          <Popover
                            open={activeSearchRowId === row.id}
                            onOpenChange={(open) => {
                              setActiveSearchRowId(open ? row.id : null);
                              setSearchTerm(open ? row.rawName : '');
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium">
                                <Search className="h-3.5 w-3.5" />
                                <span>Change Product</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2.5" align="end">
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
                              <div className="max-h-52 overflow-y-auto space-y-1">
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
                                  Unlink this product
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Unmatched State with Top Suggestion */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            No exact inventory match found
                          </p>
                          {row.topCandidate ? (
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Did you mean: <strong className="text-foreground">{row.topCandidate.product.name}</strong>?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectProduct(row.id, row.topCandidate!.product)}
                                className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                              >
                                ✓ Use this ({Math.round(row.topCandidate.score * 100)}% match)
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Search your store catalog to pair with this scanned item.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Search Catalog Button */}
                      {status === 'pending' && (
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <Popover
                            open={activeSearchRowId === row.id}
                            onOpenChange={(open) => {
                              setActiveSearchRowId(open ? row.id : null);
                              setSearchTerm(open ? row.rawName : '');
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button size="sm" className="h-8 text-xs gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-2xs">
                                <Search className="h-3.5 w-3.5" />
                                <span>Search Catalog</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2.5" align="end">
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
                              <div className="max-h-52 overflow-y-auto space-y-1">
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
                                    <Check className="h-3.5 w-3.5 text-transparent group-hover:text-primary shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer & Actions */}
      <div className="p-3.5 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        {status === 'pending' ? (
          <>
            <button
              type="button"
              onClick={handleAddBlankRow}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-orange-500" />
              <span>Add another product item</span>
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
                disabled={isApplying || matchedCount === 0 || isReadOnly}
                title={isReadOnly ? 'Plan expired (Read-only mode)' : undefined}
                className="text-xs h-8 bg-foreground text-background hover:opacity-90 gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
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

      {previewImage && (
        <ImageLightboxModal
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          gallery={previewImage.gallery}
          initialIndex={previewImage.initialIndex}
        />
      )}
    </div>
  );
});
