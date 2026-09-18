'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { usePOS } from '@/context/pos-context';
import type { InventoryTransaction } from '@/types';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, PackageOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/context/i18n-context';

export function ProductStockHistoryChart({ productId }: { productId: string }) {
    const { business, firestore } = usePOS();
    const { t } = useI18n();
    const [transactions, setTransactions] = React.useState<InventoryTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!business?.id || !firestore || !productId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const txQuery = query(
            collection(firestore, 'inventory_transactions'),
            where('businessId', '==', business.id),
            where('productId', '==', productId)
        );

        const unsubscribe = onSnapshot(txQuery, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction))
                                  .sort((a, b) => ((a.date?.seconds || 0) - (b.date?.seconds || 0)));
            
            // Limit client-side to last 100 transactions to prevent massive charts
            const recentLogs = logs.slice(-100);
            setTransactions(recentLogs);
            setIsLoading(false);
        }, (err) => {
            console.error('Failed to load product stock history:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [business?.id, firestore, productId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 border rounded-lg bg-muted/20 border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/20 border-dashed">
                <PackageOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No Stock History</h3>
                <p className="text-sm text-muted-foreground mt-1">Stock adjustments and sales will appear here.</p>
            </div>
        );
    }

    // Process data for the chart
    const chartData = transactions.map((tx) => {
        return {
            date: tx.date?.seconds ? format(new Date(tx.date.seconds * 1000), 'dd MMM HH:mm') : '',
            rawDate: tx.date?.seconds ? new Date(tx.date.seconds * 1000) : new Date(),
            stock: tx.closingStock !== undefined ? tx.closingStock : 0,
            type: tx.type,
            quantity: tx.quantity
        };
    });

    return (
        <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Cumulative Stock History</CardTitle>
                <CardDescription>Track inventory levels over time for this product</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const isPositive = data.quantity > 0 || data.type === 'in' || data.type === 'return';
                                        return (
                                            <div className="bg-background border rounded-lg shadow-md p-3 text-sm flex flex-col gap-1.5 min-w-[150px]">
                                                <div className="font-medium text-foreground mb-1">{data.date}</div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-muted-foreground capitalize">Action:</span>
                                                    <span className="font-medium capitalize">{data.type}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-muted-foreground">Change:</span>
                                                    <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isPositive ? '+' : ''}{data.quantity}
                                                    </span>
                                                </div>
                                                <div className="h-px bg-border my-0.5"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground text-xs font-medium">Closing Stock:</span>
                                                    <span className="font-bold">{data.stock}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="linear"
                                dataKey="stock"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorStock)"
                                animationDuration={1000}
                                activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
