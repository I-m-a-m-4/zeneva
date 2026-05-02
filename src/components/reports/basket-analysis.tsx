
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from '@/types';
import { ShoppingBag, Plus, ArrowRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';

interface BasketAnalysisProps {
    receipts: Receipt[];
}

export default function BasketAnalysis({ receipts }: BasketAnalysisProps) {
    const topPairs = React.useMemo(() => {
        const pairs: Record<string, { count: number; nameA: string; nameB: string }> = {};

        receipts.forEach(r => {
            if (!r.items || r.items.length < 2) return;

            // Generate unique pairs from items in this receipt
            for (let i = 0; i < r.items.length; i++) {
                for (let j = i + 1; j < r.items.length; j++) {
                    const itemA = r.items[i];
                    const itemB = r.items[j];
                    
                    // Consistent ordering to avoid duplicates (A+B vs B+A)
                    const [id1, id2] = [itemA.productId, itemB.productId].sort();
                    const pairKey = `${id1}_${id2}`;

                    if (!pairs[pairKey]) {
                        pairs[pairKey] = {
                            count: 0,
                            nameA: itemA.name,
                            nameB: itemB.name
                        };
                    }
                    pairs[pairKey].count += 1;
                }
            }
        });

        return Object.values(pairs)
            .sort((a, b) => b.count - a.count);
    }, [receipts]);

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Market Basket Analysis
                </CardTitle>
                <CardDescription>Discover which products are frequently bought together.</CardDescription>
            </CardHeader>
            <CardContent>
                {topPairs.length > 0 ? (
                    <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
                            <Zap className="h-5 w-5 text-primary animate-pulse" />
                            <p className="text-xs text-muted-foreground">
                                Use these insights to create **bundle deals** or optimize your store layout for cross-selling.
                            </p>
                        </div>

                        <ScrollArea className="h-[350px] pr-4">
                            <div className="space-y-3">
                                {topPairs.map((pair, index) => (
                                    <div key={index} className="relative p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors mb-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                <Badge variant="secondary" className="max-w-[140px] truncate" title={pair.nameA}>
                                                    {pair.nameA}
                                                </Badge>
                                                <Plus className="h-3 w-3 text-muted-foreground" />
                                                <Badge variant="secondary" className="max-w-[140px] truncate" title={pair.nameB}>
                                                    {pair.nameB}
                                                </Badge>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-lg font-bold text-primary">{pair.count}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Joint Sales</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary/40 rounded-full" 
                                                style={{ width: `${(pair.count / topPairs[0].count) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-3" />
                        <p className="text-sm">Not enough multi-item sales yet to detect significant product pairings.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
