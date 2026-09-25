

"use client"

import *as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, XAxis, YAxis, Bar, CartesianGrid, ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { TrendingUp, Bot, ChevronDown, Trophy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from "date-fns";
import type { Receipt } from '@/types';
import { safeToDate } from '@/lib/utils';

const chartConfig = {
  totalSales: {
    label: "Total Sales",
    color: "#ea580c", // Zeneva Orange
  },
} satisfies ChartConfig;

interface OverviewChartProps {
  receipts: Receipt[];
  currencySymbol: string;
  data?: { month: string, totalSales: number }[];
}

export default function OverviewChart({ receipts, currencySymbol, data }: OverviewChartProps) {
  const [peakFilter, setPeakFilter] = React.useState<'day' | 'week' | 'month' | 'year'>('month');

  const peakSales = React.useMemo(() => {
    if (!receipts || receipts.length === 0) return null;

    const aggregate = (getStartFn: (d: Date) => Date, formatStr: string, prefix: string) => {
      const grouped: Record<string, number> = {};
      receipts.forEach(r => {
        if (!r.total) return;
        const d = safeToDate(r.createdAt);
        if (isNaN(d.getTime())) return;
        const start = getStartFn(d);
        const key = start.getTime().toString();
        grouped[key] = (grouped[key] || 0) + r.total;
      });

      let maxVal = 0;
      let maxKey = '';
      for (const [key, val] of Object.entries(grouped)) {
        if (val > maxVal) {
          maxVal = val;
          maxKey = key;
        }
      }

      if (maxVal === 0) return null;
      return {
        label: `${prefix}: ${format(new Date(parseInt(maxKey)), formatStr)}`,
        amount: maxVal,
      };
    };

    return {
      day: aggregate(startOfDay, 'MMM d, yyyy', 'Best Day'),
      week: aggregate(startOfWeek, "'Week of' MMM d, yyyy", 'Best Week'),
      month: aggregate(startOfMonth, 'MMMM yyyy', 'Best Month'),
      year: aggregate(startOfYear, 'yyyy', 'Best Year'),
    };
  }, [receipts]);

  const chartData = React.useMemo(() => {
    if (peakFilter === 'month' && data) {
      return data.map(d => ({ name: d.month, totalSales: d.totalSales }));
    }
    
    if (!receipts || receipts.length === 0) return [];

    const grouped: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      if (!receipt || !receipt.total) return;
      const d = safeToDate(receipt.createdAt);
      if (isNaN(d.getTime())) return;
      
      let key = '';
      let sortKey = 0;
      if (peakFilter === 'day') {
        const st = startOfDay(d);
        key = format(st, 'MMM d, yy');
        sortKey = st.getTime();
      } else if (peakFilter === 'week') {
        const st = startOfWeek(d);
        key = format(st, 'MMM d, yy');
        sortKey = st.getTime();
      } else if (peakFilter === 'month') {
        const st = startOfMonth(d);
        key = format(st, 'MMM yyyy');
        sortKey = st.getTime();
      } else if (peakFilter === 'year') {
        const st = startOfYear(d);
        key = format(st, 'yyyy');
        sortKey = st.getTime();
      }
      
      const complexKey = `${sortKey}|${key}`;
      grouped[complexKey] = (grouped[complexKey] || 0) + receipt.total;
    });

    const sortedEntries = Object.entries(grouped).sort((a, b) => {
       const timeA = parseInt(a[0].split('|')[0]);
       const timeB = parseInt(b[0].split('|')[0]);
       return timeA - timeB;
    });

    return sortedEntries.map(([complexKey, totalSales]) => ({
      name: complexKey.split('|')[1],
      totalSales
    }));
  }, [receipts, data, peakFilter]);

  const noData = chartData.every(d => d.totalSales === 0);

  return (
    <Card className="shadow-md transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-4">
        <div className="space-y-1">
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>
            {peakFilter.charAt(0).toUpperCase() + peakFilter.slice(1)} sales performance.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
                View by: {peakFilter.charAt(0).toUpperCase() + peakFilter.slice(1)}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPeakFilter('day')}>By Day</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeakFilter('week')}>By Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeakFilter('month')}>By Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeakFilter('year')}>By Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {noData ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <TrendingUp className="h-16 w-16 opacity-50 mb-4" />
            <div className="text-sm p-2 rounded-md bg-muted/50 max-w-sm">
              <p className="font-semibold flex items-center gap-2 justify-center"><Bot className="h-4 w-4 text-primary" /> Zen AI</p>
              <p>This chart will track your revenue over time once you complete your first sale through the POS.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[600px] md:min-w-full h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      fontSize={11}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={60}
                      tickFormatter={(value) => {
                        const val = Number(value);
                        if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(val >= 10000000 ? 0 : 1)}M`;
                        if (val >= 1000) return `${currencySymbol}${(val / 1000).toLocaleString()}k`;
                        return `${currencySymbol}${val}`;
                      }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" formatter={(value) => `${currencySymbol}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />}
                    />
                    <Bar dataKey="totalSales" fill="#ea580c" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
