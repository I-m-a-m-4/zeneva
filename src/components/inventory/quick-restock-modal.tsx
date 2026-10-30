'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/pos-context';
import { isCoreFeatureBlocked } from '@/lib/plan';
import type { Product } from '@/types';
import { useI18n } from '@/context/i18n-context';
import { Sparkles, TrendingUp } from 'lucide-react';
import { calculateProductDemandForecast } from '@/lib/demand-forecasting';

export function QuickRestockModal({ 
    product, 
    onClose 
}: { 
    product: Product | null; 
    onClose: () => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { addToQueue, isReadOnly, business, receipts } = usePOS();
    const isReadOnlyStore = isReadOnly || (business ? isCoreFeatureBlocked(business) : false);
    const [quantityToAdd, setQuantityToAdd] = React.useState('');
    const [backdate, setBackdate] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    // Demand Forecast Horizons (7d, 14d, 30d) calculated purely from store sales velocity
    const forecast7d = React.useMemo(() => {
        if (!product) return null;
        return calculateProductDemandForecast(product, receipts, 7);
    }, [product, receipts]);

    const forecast14d = React.useMemo(() => {
        if (!product) return null;
        return calculateProductDemandForecast(product, receipts, 14);
    }, [product, receipts]);

    const forecast30d = React.useMemo(() => {
        if (!product) return null;
        return calculateProductDemandForecast(product, receipts, 30);
    }, [product, receipts]);

    const currentStock = product?.stock || 0;
    const addedAmount = parseInt(quantityToAdd) || 0;
    const newTotal = currentStock + addedAmount;

    const handleSave = () => {
        if (!product) return;
        if (isReadOnlyStore) {
            toast({
                title: 'Plan Expired (Read-Only Mode)',
                description: 'Your plan has expired. Stock updates are disabled.',
                variant: 'destructive',
            });
            return;
        }
        if (isNaN(addedAmount) || addedAmount === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        const customDate = backdate ? new Date(backdate) : new Date();
        const dateDesc = backdate ? ` (Backdated to ${customDate.toLocaleDateString()})` : '';

        addToQueue({
            type: 'update-product',
            payload: { 
                productId: product.id, 
                values: { 
                    stock: newTotal,
                    updatedAt: customDate
                } 
            }
        }, `Restocked ${product.name} (Added ${addedAmount})${dateDesc}`);

        addToQueue({
            type: 'add-audit-log',
            payload: {
                action: 'product.stock_adjustment',
                entityType: 'Product',
                entityId: product.id,
                entityName: product.name,
                details: {
                    adjustment: addedAmount,
                    oldStock: currentStock,
                    newStock: newTotal,
                    reason: `Restocked ${addedAmount} units${dateDesc}`
                },
                createdAt: customDate
            }
        }, `Logged stock adjustment for ${product.name}`);

        const isAddition = addedAmount >= 0;
        addToQueue({
            type: 'add-inventory-transaction',
            payload: {
                businessId: product.businessId || business?.id || '',
                productId: product.id,
                productName: product.name,
                type: isAddition ? 'in' : 'out',
                quantity: Math.abs(addedAmount),
                closingStock: newTotal,
                notes: `Quick restock: ${addedAmount > 0 ? '+' : ''}${addedAmount}${dateDesc}`,
                createdBy: 'User',
                date: customDate
            }
        }, `Logging inventory transaction for ${product.name}`);
        
        toast({
            title: 'Stock Updated',
            description: `Successfully added ${addedAmount} to ${product.name}. New total: ${newTotal}${dateDesc}`,
        });
        
        setIsSaving(false);
        onClose();
    };

    return (
        <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[430px]">
                <DialogHeader>
                    <DialogTitle>Quick Restock: {product?.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-3">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Current Stock</p>
                            <p className="text-2xl font-bold">{currentStock}</p>
                        </div>
                        <div className="text-2xl font-light text-muted-foreground">+</div>
                        <div className="text-center">
                            <p className="text-xs text-primary mb-1 uppercase tracking-wider font-semibold">Adding</p>
                            <p className="text-2xl font-bold text-primary">{addedAmount}</p>
                        </div>
                        <div className="text-2xl font-light text-muted-foreground">=</div>
                        <div className="text-center">
                            <p className="text-xs text-green-600 mb-1 uppercase tracking-wider font-semibold">New Total</p>
                            <p className="text-2xl font-bold text-green-600">{newTotal}</p>
                        </div>
                    </div>

                    {/* Smart Demand Forecast & Quick Horizon Buttons */}
                    {forecast14d && (
                        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                                    <span>Demand Forecast</span>
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {forecast14d.dailyVelocity > 0 ? (
                                        <>⚡ {forecast14d.dailyVelocity} / day • {forecast14d.daysRemaining === 0 ? 'Depleted' : `~${forecast14d.daysRemaining}d left`}</>
                                    ) : (
                                        <>No 30d sales</>
                                    )}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setQuantityToAdd(String(Math.max(1, forecast7d?.recommendedQty || 5)))}
                                    className="px-2 py-1.5 rounded-md border text-left bg-background hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-xs"
                                    title="Restock for 7 days of projected sales"
                                >
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">7 Days</p>
                                    <p className="font-bold text-foreground">+{Math.max(1, forecast7d?.recommendedQty || 5)}</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuantityToAdd(String(Math.max(1, forecast14d?.recommendedQty || 10)))}
                                    className="px-2 py-1.5 rounded-md border text-left bg-background hover:bg-orange-500/10 border-orange-500/40 transition-all text-xs"
                                    title="Recommended: Restock for 14 days of projected sales"
                                >
                                    <p className="text-[10px] text-orange-600 font-semibold uppercase">14 Days (Rec)</p>
                                    <p className="font-bold text-foreground">+{Math.max(1, forecast14d?.recommendedQty || 10)}</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuantityToAdd(String(Math.max(1, forecast30d?.recommendedQty || 20)))}
                                    className="px-2 py-1.5 rounded-md border text-left bg-background hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-xs"
                                    title="Restock for full month of projected sales"
                                >
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">30 Days</p>
                                    <p className="font-bold text-foreground">+{Math.max(1, forecast30d?.recommendedQty || 20)}</p>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid gap-2">
                        <Label htmlFor="restockQty">Quantity to Add</Label>
                        <Input
                            id="restockQty"
                            type="number"
                            placeholder="e.g. 10"
                            value={quantityToAdd}
                            onChange={(e) => setQuantityToAdd(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                            }}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">Type a negative number to subtract stock.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="backdate" className="flex items-center justify-between text-xs font-medium">
                            <span>Entry Date (Backdate)</span>
                            <span className="text-muted-foreground font-normal">Optional</span>
                        </Label>
                        <Input
                            id="backdate"
                            type="datetime-local"
                            value={backdate}
                            onChange={(e) => setBackdate(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">Pick a past date to record stock brought in on previous days.</p>
                    </div>

                    {product?.lowStockThreshold !== undefined && newTotal <= (product.lowStockThreshold ?? 5) && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-md text-xs font-medium">
                            <span className="shrink-0 font-bold">⚠️</span>
                            <span>Stock will still be at or below reorder point ({product.lowStockThreshold ?? 5} units).</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || !quantityToAdd || isReadOnlyStore}
                        title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                    >
                        Save Stock
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
