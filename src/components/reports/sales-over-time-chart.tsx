
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from 'recharts';
import { TrendingUp, Bot } from 'lucide-react';
import type { Receipt } from '@/types';
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface SalesOverTimeChartProps {
    receipts: Receipt[];
    currencySymbol: string;
    data?: { month: string, sales: number }[];
}

export default function SalesOverTimeChart({ receipts, currencySymbol, data }: SalesOverTimeChartProps) {
    const chartData = React.useMemo(() => {
        if (data) return data;
        
        const monthlySales: Record<string, number> = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentYear = new Date().getFullYear();

        receipts.forEach(receipt => {
          const date = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt);
          const year = date.getFullYear();
          if (year === currentYear) { 
            const monthName = monthNames[date.getMonth()];
            monthlySales[monthName] = (monthlySales[monthName] || 0) + receipt.total;
          }
        });

        return monthNames.map(month => ({
          month,
          sales: monthlySales[month] || 0,
        }));
    }, [receipts, data]);

    const noData = chartData.every(d => d.sales === 0);

    return (
         <Card>
            <CardHeader>
                <CardTitle>Sales Over Time</CardTitle>
                <CardDescription>Revenue performance for the current year.</CardDescription>
            </CardHeader>
            <CardContent>
                {noData ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <TrendingUp className="h-16 w-16 opacity-50 mb-4" />
                        <div className="text-sm p-2 rounded-md bg-muted/50 max-w-sm">
                             <p className="font-semibold flex items-center gap-2 justify-center"><Bot className="h-4 w-4 text-primary"/> Zen AI</p>
                            <p>No sales were recorded in this period. Once your first sale is made, this chart will automatically activate.</p>
                        </div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${currencySymbol}${Number(value) / 1000}k`} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`} />} />
                            <Line dataKey="sales" type="monotone" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
