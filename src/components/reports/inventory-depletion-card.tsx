'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowRight, Bell } from 'lucide-react';
import type { Receipt, Product } from '@/types';
import { safeToDate } from '@/lib/utils';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface InventoryDepletionCardProps {
    receipts: Receipt[];
    products: Product[];
}

export default function InventoryDepletionCard({ receipts, products }: InventoryDepletionCardProps) {
    const { toast } = useToast();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
    }, []);

    const requestNotificationPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationsEnabled(permission === 'granted');
            if (permission === 'granted') {
                toast({ title: 'Notifications Enabled', description: 'You will now receive native alerts for critical low stock.' });
            }
        }
    };

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
        let hasTriggeredNotification = false;

        products.forEach(p => {
            if (p.manageStock && typeof p.stockLevel === 'number') {
                const soldIn30Days = productVelocity[p.id] || 0;
                const dailyVelocity = soldIn30Days / 30;

                if (dailyVelocity > 0) {
                    const daysRemaining = p.stockLevel / dailyVelocity;

                    // Alert if running out in 14 days or less
                    if (daysRemaining <= 14) {
                        alerts.push({
                            product: p,
                            daysRemaining: Math.floor(daysRemaining),
                            velocity: dailyVelocity.toFixed(1),
                            currentStock: p.stockLevel
                        });

                        // Trigger native notification if highly urgent (<= 3 days)
                        // We use a strict check to avoid spamming. In a real app this might be tracked in localStorage to fire only once per session/day.
                        if (daysRemaining <= 3 && !hasTriggeredNotification && typeof window !== 'undefined') {
                            const lastFired = localStorage.getItem(`low_stock_alert_${p.id}`);
                            const todayStr = new Date().toDateString();
                            
                            if (lastFired !== todayStr) {
                                if ('Notification' in window && Notification.permission === 'granted') {
                                    new Notification('Critical Stock Alert 🚨', {
                                        body: `${p.name} will run out in approx. ${Math.floor(daysRemaining)} days based on current sales velocity!`,
                                    });
                                    localStorage.setItem(`low_stock_alert_${p.id}`, todayStr);
                                    hasTriggeredNotification = true;
                                }
                            }
                        }
                    }
                } else if (p.stockLevel <= 0) {
                    // It's already out of stock
                    alerts.push({
                        product: p,
                        daysRemaining: 0,
                        velocity: '0.0',
                        currentStock: p.stockLevel
                    });
                }
            }
        });

        return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5); // Show top 5 most urgent
    }, [receipts, products]);

    if (depletionAlerts.length === 0) {
        return null; // Don't show if there's nothing to warn about
    }

    return (
        <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-5 w-5" /> Inventory Depletion Warning
                    </CardTitle>
                    <CardDescription className="mt-1">
                        Predictive alerts for products likely to run out soon based on their 30-day sales velocity.
                    </CardDescription>
                </div>
                {!notificationsEnabled && (
                    <Button variant="outline" size="sm" onClick={requestNotificationPermission} className="text-xs h-8">
                        <Bell className="h-3.5 w-3.5 mr-1.5" /> Enable Native Alerts
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {depletionAlerts.map((alert, i) => (
                        <div key={alert.product.id || i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${alert.daysRemaining <= 3 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                    <Package className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{alert.product.name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        Stock: {alert.currentStock} <ArrowRight className="h-3 w-3 mx-1" /> Selling ~{alert.velocity}/day
                                    </p>
                                </div>
                            </div>
                            <Badge variant={alert.daysRemaining <= 3 ? "destructive" : "secondary"} className={alert.daysRemaining > 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                                {alert.daysRemaining === 0 ? 'Out of Stock' : `Runs out in ${alert.daysRemaining} ${alert.daysRemaining === 1 ? 'day' : 'days'}`}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
