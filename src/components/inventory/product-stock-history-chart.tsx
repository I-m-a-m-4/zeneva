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
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/context/i18n-context';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ProductStockHistoryChart({ productId }: { productId: string }) {
    const { business, firestore } = usePOS();
    const { t } = useI18n();
    const [transactions, setTransactions] = React.useState<InventoryTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState<'both' | 'in' | 'out'>('both');

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
            <div className="flex justify-center items-center h-64 border rounded-lg bg-muted/20 border-dashed mt-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Process data for the chart (last 15 days)
    const chartData: { date: string; inflow: number; outflow: number }[] = [];
    for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, 'dd MMM');
        chartData.push({
            date: dateStr,
            inflow: 0,
            outflow: 0
        });
    }

    let totalInflow = 0;
    let totalOutflow = 0;

    transactions.forEach((tx) => {
        if (tx.date?.seconds) {
            const txDate = new Date(tx.date.seconds * 1000);
            const dateStr = format(txDate, 'dd MMM');
            const dayData = chartData.find(d => d.date === dateStr);
            const isAddition = tx.type === 'in' || tx.type === 'return' || (tx.type === 'adjustment' && tx.quantity > 0);
            
            if (isAddition) {
                totalInflow += Math.abs(tx.quantity);
                if (dayData) dayData.inflow += Math.abs(tx.quantity);
            } else {
                totalOutflow += Math.abs(tx.quantity);
                if (dayData) dayData.outflow += Math.abs(tx.quantity);
            }
        }
    });

    const hasData = totalInflow > 0 || totalOutflow > 0;

    return (
        <Card className="shadow-sm border-primary/10 mt-4">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">Item Inflow and Outflow</CardTitle>
                        <CardDescription>Track daily stock movement</CardDescription>
                    </div>
                    <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full sm:w-[300px]">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="both">Both</TabsTrigger>
                            <TabsTrigger value="in">Inflow</TabsTrigger>
                            <TabsTrigger value="out">Outflow</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-8 mb-6 mt-2">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                            Inflow
                        </div>
                        <div className="text-2xl font-bold mt-1">{totalInflow}</div>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-full bg-[#f43f5e]"></div>
                            Outflow
                        </div>
                        <div className="text-2xl font-bold mt-1">{totalOutflow}</div>
                    </div>
                </div>

                <div className="h-[300px] w-full relative">
                    {!hasData && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="bg-background/80 px-4 py-2 rounded-lg text-sm text-muted-foreground font-medium backdrop-blur-sm border">
                                No item movement in the selected date range
                            </div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            {(activeTab === 'both' || activeTab === 'in') && (
                                <Area type="linear" dataKey="inflow" name="Inflow" stroke="#10b981" fill="url(#colorInflow)" strokeWidth={2} activeDot={{ r: 6 }} />
                            )}
                            {(activeTab === 'both' || activeTab === 'out') && (
                                <Area type="linear" dataKey="outflow" name="Outflow" stroke="#f43f5e" fill="url(#colorOutflow)" strokeWidth={2} activeDot={{ r: 6 }} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
