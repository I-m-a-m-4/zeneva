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
        <CardTitle>Retention Cohort Heatmap</CardTitle>
        <CardDescription>Percentage of monthly cohorts remaining active (selling) over time.</CardDescription>
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
                    <TableCell key={ret.index} className={`text-center p-0`}>
                        <div className={`h-10 w-full flex items-center justify-center text-[11px] font-bold ${getHeatmapColor(ret.percentage)} m-0.5 rounded-sm`}>
                            {ret.percentage.toFixed(0)}%
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
      </CardContent>
    </Card>
  );
}
