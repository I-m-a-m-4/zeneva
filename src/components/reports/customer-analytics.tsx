
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import type { Customer, Receipt } from '@/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

interface CustomerAnalyticsProps {
  customers: Customer[];
  receipts: Receipt[];
  currencySymbol: string;
}

export default function CustomerAnalytics({ customers, receipts, currencySymbol }: CustomerAnalyticsProps) {
  const analyticsData = React.useMemo(() => {
    if (!customers || !receipts) {
      return {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        topCustomersBySpend: [],
        topCustomersByOrders: [],
      };
    }

    const customerStats: Record<string, { name: string; email: string, totalSpent: number; orderCount: number; firstOrder: Date }> = {};

    customers.forEach(c => {
        customerStats[c.id] = {
            name: c.name,
            email: c.email,
            totalSpent: 0,
            orderCount: 0,
            firstOrder: c.createdAt?.toDate ? c.createdAt.toDate() : new Date()
        }
    });

    receipts.forEach(receipt => {
      if (receipt.customer?.id && customerStats[receipt.customer.id]) {
        customerStats[receipt.customer.id].totalSpent += receipt.total;
        customerStats[receipt.customer.id].orderCount += 1;
      }
    });
    
    const customerArray = Object.entries(customerStats).map(([id, data]) => ({ id, ...data }));
    
    const topCustomersBySpend = [...customerArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const newCustomers = customerArray.filter(c => c.firstOrder > oneMonthAgo).length;
    const returningCustomers = customerArray.filter(c => c.orderCount > 1).length;

    return {
      totalCustomers: customers.length,
      newCustomers,
      returningCustomers,
      topCustomersBySpend,
    };
  }, [customers, receipts]);

  const acquisitionData = React.useMemo(() => {
    if (!customers) return [];
    const days: Record<string, number> = {};
    
    // Take last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    customers.forEach(c => {
        const date = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || 0);
        if (date >= thirtyDaysAgo) {
            const day = date.toISOString().split('T')[0];
            days[day] = (days[day] || 0) + 1;
        }
    });

    return Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, count }));
  }, [customers]);

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Customer Intelligence
            </CardTitle>
            <CardDescription>
                Gain deeper insights into your customer base growth and retention.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Customers</CardDescription>
                        <CardTitle className="text-4xl">{analyticsData.totalCustomers}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>New Customers (Last 30d)</CardDescription>
                        <CardTitle className="text-4xl">{analyticsData.newCustomers}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Returning Customers</CardDescription>
                        <CardTitle className="text-4xl">{analyticsData.returningCustomers}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-2">Customer Acquisition (Last 30 Days)</h4>
                    <div className="h-[250px] w-full border rounded-lg p-4 bg-muted/20">
                        {acquisitionData.length > 0 ? (
                            <ChartContainer config={{ count: { label: "New Customers", color: "hsl(var(--primary))" } }} className="h-full w-full">
                                <BarChart data={acquisitionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No acquisition data for this period.
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Top 5 Customers by Spending</h4>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyticsData.topCustomersBySpend.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs text-muted-foreground">{c.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{currencySymbol}{c.totalSpent.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
