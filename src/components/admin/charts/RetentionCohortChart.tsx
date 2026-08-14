'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import type { UserProfile, Receipt } from '@/types';

interface RetentionCohortChartProps {
  users: UserProfile[];
  receipts: Receipt[];
}

export default function RetentionCohortChart({ users, receipts }: RetentionCohortChartProps) {
  const cohortData = React.useMemo(() => {
    const now = new Date();
    const monthsToShow = 5;
    const cohorts: any[] = [];

    // 1. Group users by Join Month
    for (let i = monthsToShow - 1; i >= 0; i--) {
        const cohortMonth = startOfMonth(subMonths(now, i));
        const cohortUsers = users.filter(u => {
            const joinDate = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
            return isSameMonth(joinDate, cohortMonth);
        });

        if (cohortUsers.length === 0) continue;

        const row: any = {
            month: format(cohortMonth, 'MMM yyyy'),
            total: cohortUsers.length,
            retention: []
        };

        const businessIds = new Set(cohortUsers.map(u => u.businessId).filter(Boolean));

        // 2. For each subsequent month, calculate how many were active
        for (let j = 0; j < monthsToShow - i; j++) {
            const checkMonth = startOfMonth(subMonths(now, i - j));
            const activeBusinesses = new Set();
            
            receipts.forEach(r => {
                const receiptDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                if (isSameMonth(receiptDate, checkMonth) && businessIds.has(r.businessId)) {
                    activeBusinesses.add(r.businessId);
                }
            });

            row.retention.push({
                index: j,
                count: activeBusinesses.size,
                percentage: (activeBusinesses.size / businessIds.size) * 100
            });
        }
        cohorts.push(row);
    }

    return cohorts;
  }, [users, receipts]);

  const getHeatmapColor = (percent: number) => {
    if (percent === 100) return 'bg-primary text-primary-foreground';
    if (percent >= 70) return 'bg-primary/80 text-primary-foreground';
    if (percent >= 40) return 'bg-primary/50';
    if (percent >= 10) return 'bg-primary/20';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Cohort Analysis</CardTitle>
        <CardDescription>
          Tracks how many businesses from each monthly cohort remain active (made a sale) in subsequent months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Cohort</TableHead>
                <TableHead className="text-center">Users</TableHead>
                {[0,1,2,3,4].map(i => (
                  <TableHead key={i} className="text-center text-[10px] uppercase">Month {i}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-xs whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className="text-center text-xs font-bold">{row.total}</TableCell>
                  {row.retention.map((ret: any) => (
                    <TableCell key={ret.index} className={`text-center p-0 min-w-[100px]`}>
                        <div className={`h-12 w-full flex flex-col items-center justify-center ${getHeatmapColor(ret.percentage)} m-0.5 rounded-sm p-1 leading-tight`}>
                            <span className="font-bold text-xs">{ret.count} {ret.count === 1 ? 'store' : 'stores'}</span>
                            <span className="text-[10px] font-medium opacity-85">{ret.percentage.toFixed(0)}% retained</span>
                        </div>
                    </TableCell>
                  ))}
                  {Array.from({ length: 5 - row.retention.length }).map((_, i) => (
                    <TableCell key={`empty-${i}`} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
          <p className="font-semibold text-foreground mb-1">💡 Insight & How to read:</p>
          <p>
            The rows represent users who joined in a specific month (a <strong>cohort</strong>). 
            The columns show the number of those businesses that made at least one sale in the months following their sign-up. 
            For example, <em>Month 0</em> is their sign-up month, and <em>Month 1</em> is the month after. 
            This helps track long-term user engagement and platform stickiness based on actual platform usage (sales).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
