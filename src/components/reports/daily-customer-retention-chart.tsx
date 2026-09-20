'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import type { Customer, Receipt } from '@/types';
import { safeToDate } from '@/lib/utils';
import { useI18n } from '@/context/i18n-context';

interface DailyCustomerRetentionChartProps {
    receipts: Receipt[];
    customers: Customer[];
}

export default function DailyCustomerRetentionChart({ receipts, customers }: DailyCustomerRetentionChartProps) {
    const { t } = useI18n();

    const chartData = React.useMemo(() => {
        if (!receipts || receipts.length === 0) return [];

        // Map customer ID to their creation date (first seen)
        const customerCreationMap = new Map<string, Date>();
        customers.forEach(c => {
            if (c.id && c.createdAt) {
                customerCreationMap.set(c.id, safeToDate(c.createdAt));
            }
        });

        // Group by day (YYYY-MM-DD)
        const dailyData = new Map<string, { newCustomers: Set<string>, returningCustomers: Set<string>, walkIns: number }>();

        receipts.forEach(receipt => {
            const date = safeToDate(receipt.createdAt);
            const dateStr = date.toISOString().split('T')[0];

            if (!dailyData.has(dateStr)) {
                dailyData.set(dateStr, { newCustomers: new Set(), returningCustomers: new Set(), walkIns: 0 });
            }

            const dayStats = dailyData.get(dateStr)!;

            if (receipt.customer?.id) {
                const customerId = receipt.customer.id;
                const createdAt = customerCreationMap.get(customerId);
                
                // If created today or we don't know when, treat as New. Else Returning.
                if (createdAt) {
                    const createdStr = createdAt.toISOString().split('T')[0];
                    if (createdStr === dateStr || createdAt > date) {
                        dayStats.newCustomers.add(customerId);
                    } else {
                        dayStats.returningCustomers.add(customerId);
                    }
                } else {
                    // Fallback if customer is missing from the global array but on receipt
                    dayStats.newCustomers.add(customerId);
                }
            } else {
                dayStats.walkIns++;
            }
        });

        // Convert to array and sort by date
        const sortedDates = Array.from(dailyData.keys()).sort();
        
        return sortedDates.map(dateStr => {
            const stats = dailyData.get(dateStr)!;
            
            // Format date for display (e.g. "Sep 15")
            const d = new Date(dateStr);
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            return {
                date: dateStr,
                label,
                New: stats.newCustomers.size,
                Returning: stats.returningCustomers.size,
                WalkIn: stats.walkIns
            };
        });
    }, [receipts, customers]);

    const chartConfig = {
        New: {
            label: "New Customers",
            color: "hsl(var(--chart-1))",
        },
        Returning: {
            label: "Returning Customers",
            color: "hsl(var(--chart-2))",
        },
        WalkIn: {
            label: "Walk-ins (Unregistered)",
            color: "hsl(var(--chart-3))",
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Daily Customer Retention
                </CardTitle>
                <CardDescription>New vs Returning customers making purchases each day</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis 
                                        dataKey="label" 
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                    />
                                    <YAxis 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    <Bar dataKey="Returning" stackId="a" fill="var(--color-Returning)" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="New" stackId="a" fill="var(--color-New)" />
                                    <Bar dataKey="WalkIn" stackId="a" fill="var(--color-WalkIn)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
                        No customer data available for this period.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
