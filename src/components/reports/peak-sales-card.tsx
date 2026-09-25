'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Calendar } from 'lucide-react';
import type { Receipt } from '@/types';
import { format, parseISO, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { safeToDate } from '@/lib/utils';

interface PeakSalesCardProps {
    receipts: Receipt[];
    currencySymbol: string;
}

type Period = 'day' | 'week' | 'month' | 'year';

export default function PeakSalesCard({ receipts, currencySymbol }: PeakSalesCardProps) {
    const [period, setPeriod] = React.useState<Period>('day');

    const peakData = React.useMemo(() => {
        if (!receipts || receipts.length === 0) return null;

        const grouped = new Map<string, number>();

        receipts.forEach(r => {
            const date = safeToDate(r.createdAt);
            if (isNaN(date.getTime())) return;

            let key = '';
            if (period === 'day') {
                key = format(date, 'yyyy-MM-dd');
            } else if (period === 'week') {
                key = format(startOfWeek(date), 'yyyy-MM-dd');
            } else if (period === 'month') {
                key = format(startOfMonth(date), 'yyyy-MM');
            } else if (period === 'year') {
                key = format(startOfYear(date), 'yyyy');
            }

            grouped.set(key, (grouped.get(key) || 0) + (r.total || 0));
        });

        if (grouped.size === 0) return null;

        let maxKey = '';
        let maxVal = -1;

        grouped.forEach((val, key) => {
            if (val > maxVal) {
                maxVal = val;
                maxKey = key;
            }
        });

        // Format the display label
        let displayLabel = maxKey;
        try {
            if (period === 'day') {
                displayLabel = format(parseISO(maxKey), 'MMM d, yyyy');
            } else if (period === 'week') {
                displayLabel = `Week of ${format(parseISO(maxKey), 'MMM d, yyyy')}`;
            } else if (period === 'month') {
                displayLabel = format(parseISO(`${maxKey}-01`), 'MMMM yyyy');
            } else if (period === 'year') {
                displayLabel = maxKey;
            }
        } catch (e) {
            // fallback
        }

        return { label: displayLabel, total: maxVal };
    }, [receipts, period]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        Peak Sales
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Highest grossing {period}
                    </CardDescription>
                </div>
                <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
                    <SelectTrigger className="w-[95px] h-8 text-xs">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">By Day</SelectItem>
                        <SelectItem value="week">By Week</SelectItem>
                        <SelectItem value="month">By Month</SelectItem>
                        <SelectItem value="year">By Year</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {peakData ? (
                    <div className="flex flex-col gap-1 mt-2">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            Best {period.charAt(0).toUpperCase() + period.slice(1)}: {peakData.label} - {currencySymbol}{peakData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground mt-4">
                        No sales data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
