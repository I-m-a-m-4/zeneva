'use client';

/**
 * Category performance — where the money actually comes from.
 *
 * Nothing else on the Reports page answers this. ABC analysis is per-product, and
 * the dashboard's category pie counts *stock on hand*, which is a picture of what
 * the shop bought rather than what it sold.
 *
 * ## One measure per axis
 *
 * Revenue and margin are different scales, so they are deliberately **not** drawn
 * as two series against two y-axes. Revenue gets the bars; margin is a column in
 * the table beside them. A dual-axis chart lets the reader infer any relationship
 * they like from an arbitrary choice of scales.
 *
 * ## Margin can be unknown
 *
 * A category is only given a margin when cost is known for essentially every unit
 * sold in it, per the rule in `docs/business-rating.md`: a shop that has not entered
 * cost prices has an *unknown* margin, not a bad one. The folded "Other" row never
 * claims a margin at all, because summing costed and uncosted categories together
 * would invent one.
 */

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Layers, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  aggregateCategories,
  aggregateItems,
  foldTail,
  periodDelta,
} from '@/lib/reports-aggregates';
import { cn } from '@/lib/utils';
import type { Product, Receipt } from '@/types';

/** Past this the bars stop being distinguishable; the tail folds into "Other". */
const CHART_ROWS = 8;

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

interface CategoryPerformanceProps {
  receipts: Receipt[];
  /** Same window, immediately before `receipts`. Omit and the movers column hides. */
  previousReceipts?: Receipt[] | null;
  products: Product[];
  currencySymbol?: string;
}

export default function CategoryPerformance({
  receipts,
  previousReceipts,
  products,
  currencySymbol = '',
}: CategoryPerformanceProps) {
  const money = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const { rows, chartRows, previousByCategory } = React.useMemo(() => {
    const { items } = aggregateItems(receipts, products);
    const all = aggregateCategories(items);

    let prevMap: Map<string, number> | null = null;
    if (previousReceipts && previousReceipts.length > 0) {
      const prev = aggregateCategories(aggregateItems(previousReceipts, products).items);
      prevMap = new Map(prev.map(c => [c.category, c.revenue]));
    }

    return {
      rows: all,
      chartRows: foldTail(all, CHART_ROWS),
      previousByCategory: prevMap,
    };
  }, [receipts, previousReceipts, products]);

  if (rows.length === 0) return null;

  const chartData = chartRows
    .filter(c => c.revenue > 0)
    .map(c => ({ name: c.category, revenue: c.revenue }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Category performance
        </CardTitle>
        <CardDescription>
          Which parts of the catalogue earn — by revenue, with margin beside it.
          {rows.length > CHART_ROWS
            ? ` ${rows.length} categories sold; the chart folds the smallest ${rows.length - CHART_ROWS} into “Other”.`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 && (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(160, chartData.length * 34 + 40) }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={110}
                interval={0}
                style={{ fontSize: '12px' }}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value: any) => (
                      <span className="text-xs">
                        Revenue:{' '}
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {money(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue, hsl(var(--primary)))" radius={4} />
            </BarChart>
          </ChartContainer>
        )}

        <ScrollArea className="max-h-[320px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-end">Revenue</TableHead>
                <TableHead className="text-end">Share</TableHead>
                <TableHead className="text-end">Margin</TableHead>
                <TableHead className="hidden text-end sm:table-cell">Units</TableHead>
                {previousByCategory && (
                  <TableHead className="hidden text-end md:table-cell">vs previous</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(c => {
                const prev = previousByCategory?.get(c.category);
                const delta =
                  previousByCategory != null
                    ? periodDelta(c.revenue, prev === undefined ? 0 : prev)
                    : null;
                return (
                  <TableRow key={c.category}>
                    <TableCell>
                      <p className="text-sm font-medium">{c.category}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.items} {c.items === 1 ? 'item' : 'items'}
                      </p>
                    </TableCell>
                    <TableCell className="text-end text-sm font-medium tabular-nums">
                      {money(c.revenue)}
                    </TableCell>
                    <TableCell className="text-end text-xs text-muted-foreground tabular-nums">
                      {(c.revenueShare * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-end">
                      {c.marginPct === null ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title={
                            c.costCoverage > 0
                              ? `Cost price missing on ${Math.round((1 - c.costCoverage) * 100)}% of units sold — margin unknown, not zero`
                              : 'No cost prices recorded — margin unknown, not zero'
                          }
                        >
                          —
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-[11px]',
                            c.marginPct < 0 && 'border-destructive/30 text-destructive',
                          )}
                        >
                          {c.marginPct.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-end text-sm tabular-nums sm:table-cell">
                      {c.units.toLocaleString()}
                    </TableCell>
                    {previousByCategory && (
                      <TableCell className="hidden text-end md:table-cell">
                        {!delta || delta.direction === 'unknown' ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : delta.direction === 'new' ? (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            new
                          </span>
                        ) : delta.direction === 'flat' ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Minus className="h-3 w-3" />
                            flat
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                              delta.direction === 'up'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-destructive',
                            )}
                          >
                            {delta.direction === 'up' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            {Math.abs(delta.deltaPct ?? 0).toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Revenue here is the sum of price × quantity on each line, so it excludes tax
          and is gross of receipt-level discounts — it will not match the Revenue card
          above exactly, which is the till total. Shares add to 100% within this panel.
        </p>
      </CardContent>
    </Card>
  );
}
