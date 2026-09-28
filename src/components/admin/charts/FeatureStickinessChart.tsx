'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Cell } from 'recharts';
import { Zap } from 'lucide-react';
import type { BusinessInstance, Product, UserProfile } from '@/types';

interface FeatureStickinessChartProps {
  businesses: BusinessInstance[];
  products: Product[];
  users?: UserProfile[];
  receipts?: any[];
  expenses?: any[];
  estimates?: any[];
  bills?: any[];
}

export default function FeatureStickinessChart({ 
  businesses = [], 
  products = [], 
  users = [],
  receipts = [],
  expenses = [],
  estimates = [],
  bills = []
}: FeatureStickinessChartProps) {
  const chartData = React.useMemo(() => {
    const total = businesses.filter(b => b.status !== 'deleted').length;
    if (total === 0) return [];

    const stats: Record<string, number> = {
        'Invoicing & Sales': 0,
        'Active Catalog': 0,
        'Expense Tracking': 0,
        'Estimates & Quotes': 0,
        'Vendor Bills': 0,
        'Team Collaboration': 0,
        'AI Insights': 0,
    };

    const businessProductCounts = (products || []).reduce((acc, p) => {
        if (p.businessId) acc[p.businessId] = (acc[p.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const businessReceiptsCounts = (receipts || []).reduce((acc, r) => {
        if (r.businessId) acc[r.businessId] = (acc[r.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const businessExpenseCounts = (expenses || []).reduce((acc, e) => {
        if (e.businessId) acc[e.businessId] = (acc[e.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const businessEstimateCounts = (estimates || []).reduce((acc, est) => {
        if (est.businessId) acc[est.businessId] = (acc[est.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const businessBillCounts = (bills || []).reduce((acc, b) => {
        if (b.businessId) acc[b.businessId] = (acc[b.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const businessUserCounts = (users || []).reduce((acc, u) => {
        if (u.businessId) acc[u.businessId] = (acc[u.businessId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    businesses.forEach(b => {
        if (b.status === 'deleted') return;
        if ((businessReceiptsCounts[b.id] || 0) > 0) stats['Invoicing & Sales']++;
        if ((businessProductCounts[b.id] || 0) > 0) stats['Active Catalog']++;
        if ((businessExpenseCounts[b.id] || 0) > 0) stats['Expense Tracking']++;
        if ((businessEstimateCounts[b.id] || 0) > 0) stats['Estimates & Quotes']++;
        if ((businessBillCounts[b.id] || 0) > 0) stats['Vendor Bills']++;
        if ((businessUserCounts[b.id] || 0) > 1) stats['Team Collaboration']++;
        if (b.settings?.businessAnalysis || b.aiDailyLimit || (b as any).aiCredits) stats['AI Insights']++;
    });

    return Object.entries(stats).map(([name, count]) => ({
        name,
        Adoption: Math.round(((count / total) * 100) * 10) / 10,
        count
    })).sort((a, b) => b.Adoption - a.Adoption);
  }, [businesses, products, users, receipts, expenses, estimates, bills]);

  const COLORS = ['#F47125', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Zeneva Invoice Feature Stickiness
        </CardTitle>
        <CardDescription>Real-time adoption percentage of core invoicing and ERP features across businesses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ReBarChart data={chartData} layout="vertical" margin={{ left: 50, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" unit="%" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
            <ReTooltip 
                cursor={{ fill: 'transparent' }}
                formatter={(val: number, _name: string, props: any) => [
                  `${val}% (${props.payload.count} businesses)`, 
                  'Adoption'
                ]}
            />
            <Bar dataKey="Adoption" radius={[0, 4, 4, 0]} barSize={26}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
