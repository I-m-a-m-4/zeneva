'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
import type { Receipt } from '@/types';
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  quantity: {
    label: "Quantity Sold",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface TopProductsChartProps {
    receipts: Receipt[];
}

export default function TopProductsChart({ receipts }: TopProductsChartProps) {
    const chartData = React.useMemo(() => {
        const productSales: Record<string, number> = {};
        receipts.forEach(receipt => {
            receipt.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        return Object.entries(productSales)
            .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));
    }, [receipts]);
    
    const noData = chartData.length === 0;

    return (
         <Card>
            <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Top 5 products by quantity sold.</CardDescription>
            </CardHeader>
            <CardContent>
                 {noData ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Package className="h-16 w-16 opacity-50 mb-4" />
                        <p className="text-lg font-medium">No Product Sales Data</p>
                        <p className="text-sm">This chart will populate as you sell products.</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                             <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                             <XAxis type="number" hide />
                             <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                             <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
