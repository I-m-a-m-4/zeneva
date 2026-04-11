'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts';
import { Activity } from 'lucide-react';
import { TimeframePicker, type Timeframe } from '@/components/reports/timeframe-picker';
import { subDays, startOfDay, format, eachDayOfInterval } from 'date-fns';
import type { Purchase } from '@/types';

interface RevenueGrowthIndexChartProps {
  purchases: Purchase[];
}

export default function RevenueGrowthIndexChart({ purchases }: RevenueGrowthIndexChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>('30d');

  const chartData = React.useMemo(() => {
    const now = new Date();
    let limitDate: Date;
    if (timeframe === 'today') limitDate = startOfDay(now);
    else if (timeframe === '7d') limitDate = subDays(now, 7);
    else if (timeframe === '30d') limitDate = subDays(now, 30);
    else if (timeframe === 'all') limitDate = subDays(now, 365);
    else limitDate = subDays(now, 90);

    const interval = eachDayOfInterval({ start: limitDate, end: now });
    const dailyData: Record<string, number> = {};
    
    interval.forEach(day => {
      dailyData[format(day, 'MMM d')] = 0;
    });

    purchases.forEach(p => {
      const date = p.timestamp?.toDate ? p.timestamp.toDate() : new Date(p.timestamp || 0);
      if (date >= limitDate) {
        const dayKey = format(date, 'MMM d');
        if (dailyData[dayKey] !== undefined) {
          dailyData[dayKey] += p.amount || 0;
        }
      }
    });

    return Object.entries(dailyData).map(([date, amount]) => ({ date, Revenue: amount }));
  }, [purchases, timeframe]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-pink-500" /> Revenue Growth Index</CardTitle>
          <CardDescription>Aggregated subscription revenue performance.</CardDescription>
        </div>
        <TimeframePicker value={timeframe} onValueChange={setTimeframe} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ReBarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(val) => `₦${val}`} tick={{ fontSize: 11 }} />
            <ReTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="Revenue" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
