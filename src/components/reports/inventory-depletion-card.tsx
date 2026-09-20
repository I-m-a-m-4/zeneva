'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowRight, LayoutGrid, List } from 'lucide-react';
import type { Receipt, Product } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { safeToDate } from '@/lib/utils';
import { isService } from '@/lib/product-kind';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/context/i18n-context';

interface InventoryDepletionCardProps {
    receipts: Receipt[];
    products: Product[];
}

export default function InventoryDepletionCard({ receipts, products }: InventoryDepletionCardProps) {
    // An "Enable Native Alerts" button used to sit in this header. It asked for
    // *browser* notification permission, which nothing reads any more — see
    // docs/notifications.md — and the alert it promised was the `new Notification`
    // call removed below. The Tauri permission is requested once at sign-in by
    // NativeNotificationListener, so there was nothing for anyone to enable here.
    // NativeNotificationListener, so there was nothing for anyone to enable here.

    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'list'|'grid'>('list');

    const depletionAlerts = React.useMemo(() => {
        if (!receipts || !products) return [];

        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);
        
        // 1. Calculate velocity (units sold per day) for each product over last 30 days
        const productVelocity: Record<string, number> = {};
        receipts.forEach(r => {
            if (safeToDate(r.createdAt) >= thirtyDaysAgo) {
                r.items.forEach(item => {
                    productVelocity[item.productId] = (productVelocity[item.productId] || 0) + (Number(item.quantity) || 0);
                });
            }
        });

        const alerts: { product: Product, daysRemaining: number, velocity: string, currentStock: number }[] = [];
        products.forEach(p => {
            // This used to gate on `p.manageStock && typeof p.stockLevel === 'number'`.
            // Neither field exists on `Product` — the stock field is `stock` (see
            // src/types.ts) — so the condition was never true, `depletionAlerts` was
            // always empty, and the `return null` below fired on every render. This
            // card had never appeared once. Services are skipped instead: they carry
            // stock 0 because the field is shared, not because they ran out.
            if (!isService(p)) {
                const stock = Number(p.stock) || 0;
                const soldIn30Days = productVelocity[p.id] || 0;
                const dailyVelocity = soldIn30Days / 30;

                if (dailyVelocity > 0) {
                    const daysRemaining = stock / dailyVelocity;

                    // Alert if running out in 14 days or less
                    if (daysRemaining <= 14) {
                        alerts.push({
                            product: p,
                            daysRemaining: Math.max(0, Math.floor(daysRemaining)),
                            velocity: dailyVelocity.toFixed(1),
                            currentStock: stock
                        });

                        // A `new Notification(...)` used to fire from inside this memo
                        // for anything depleting within 3 days. It was removed for two
                        // reasons: notifications are native-shell only now (the browser
                        // API is not reliable enough across the PWA, the TWA and plain
                        // tabs), and it was a third independent copy of low-stock
                        // alerting that wrote no Firestore document — so it appeared in
                        // nobody's bell and could not be read on another device.
                        // src/lib/notification-rules.ts owns this now.
                    }
                } else if (stock <= 0) {
                    // It's already out of stock
                    alerts.push({
                        product: p,
                        daysRemaining: 0,
                        velocity: '0.0',
                        currentStock: stock
                    });
                }
            }
        });

        return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [receipts, products]);

    if (depletionAlerts.length === 0) {
        return null; // Don't show if there's nothing to warn about
    }

    const displayAlerts = isExpanded ? depletionAlerts : depletionAlerts.slice(0, 5);
    const hasMore = depletionAlerts.length > 5;

    return (
        <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-5 w-5" /> {t('reports.depTitle')}
                    </CardTitle>
                    <CardDescription>
                        {t('reports.depSubtitle')}
                    </CardDescription>
                </div>
                <div className="flex bg-muted rounded-md p-0.5 mt-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`} 
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`} 
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-4'}>
                    {displayAlerts.map((alert, i) => (
                        <Link key={alert.product.id || i} href={`/inventory/details?id=${alert.product.id}`} className="block transition-transform hover:scale-[1.01] active:scale-[0.98]">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border shadow-sm h-full">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-full flex-shrink-0 ${alert.daysRemaining <= 3 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                        <Package className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{alert.product.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            {t('reports.depStock')} {alert.currentStock} <ArrowRight className="h-3 w-3 mx-1 flex-shrink-0" /> {t('reports.depSelling')}{alert.velocity}{t('reports.depPerDay')}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={alert.daysRemaining <= 3 ? "destructive" : "secondary"} className={`ml-2 flex-shrink-0 ${alert.daysRemaining > 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : ""}`}>
                                    {alert.daysRemaining === 0
                                        ? t('inventory.statusOutOfStock')
                                        : t('reports.depRunsOut', { count: alert.daysRemaining })}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {hasMore && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`w-full text-center text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium py-2 mt-2 transition-colors ${viewMode === 'grid' ? 'col-span-full' : ''}`}
                        >
                            {isExpanded ? 'Show less' : `View all ${depletionAlerts.length} warnings`}
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
