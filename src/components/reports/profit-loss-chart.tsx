
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Receipt } from '@/types';
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-1))",
  },
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface ProfitLossChartProps {
    receipts: Receipt[];
    currencySymbol: string;
}

export default function ProfitLossChart({ receipts, currencySymbol }: ProfitLossChartProps) {
    const chartData = React.useMemo(() => {
        const monthlyData: Record<string, { revenue: number; cost: number; profit: number; }> = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentYear = new Date().getFullYear();

        receipts.forEach(receipt => {
          const date = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt);
          const year = date.getFullYear();
          if (year === currentYear) { 
            const monthName = monthNames[date.getMonth()];
            if (!monthlyData[monthName]) {
                monthlyData[monthName] = { revenue: 0, cost: 0, profit: 0 };
            }
            monthlyData[monthName].revenue += receipt.total || 0;
            monthlyData[monthName].cost += receipt.totalCost || 0;
            monthlyData[monthName].profit += receipt.profit || 0;
          }
        });

        return monthNames.map(month => ({
          month,
          revenue: monthlyData[month]?.revenue || 0,
          cost: monthlyData[month]?.cost || 0,
          profit: monthlyData[month]?.profit || 0,
        }));
    }, [receipts]);

    const noData = chartData.every(d => d.revenue === 0 && d.profit === 0);
    const hasCostData = chartData.some(d => d.cost > 0);

    return (
         <Card>
            <CardHeader>
                <CardTitle>Profit & Loss</CardTitle>
                <CardDescription>
                    {hasCostData
                        ? "Revenue, cost of goods sold, and profit for the current year."
                        : "Your profit is calculated as revenue minus the 'Cost Price' of items sold. Add cost prices to your products for an accurate report."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {noData ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                        <TrendingUp className="h-16 w-16 opacity-50 mb-4" />
                        <p className="text-lg font-medium">No P&L Data Available</p>
                        <p className="text-sm">This chart will populate once sales are recorded.</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${currencySymbol}${Number(value) / 1000}k`} />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`} />}
                            />
                            <Legend />
                            <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                            <Line dataKey="profit" type="monotone" stroke="var(--color-profit)" strokeWidth={2} dot={false} />
                            {hasCostData && <Line dataKey="cost" type="monotone" stroke="var(--color-cost)" strokeDasharray="5 5" strokeWidth={2} dot={false} />}
                        </LineChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
