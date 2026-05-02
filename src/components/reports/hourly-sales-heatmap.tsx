
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Users } from 'lucide-react';
import { safeToDate } from '@/lib/utils';

interface HourlySalesHeatmapProps {
    receipts: Receipt[];
}

export default function HourlySalesHeatmap({ receipts }: HourlySalesHeatmapProps) {
    const data = React.useMemo(() => {
        const hours: Record<number, number> = {};
        // Initialize all 24 hours
        for (let i = 0; i < 24; i++) hours[i] = 0;

        receipts.forEach(r => {
            const date = safeToDate(r.createdAt);
            const hour = date.getHours();
            hours[hour] = (hours[hour] || 0) + 1;
        });

        return Object.entries(hours).map(([hour, count]) => ({
            hour: parseInt(hour),
            count,
            display: `${hour.padStart(2, '0')}:00`
        }));
    }, [receipts]);

    const peakHour = React.useMemo(() => {
        return [...data].sort((a, b) => b.count - a.count)[0];
    }, [data]);

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Hourly Traffic Analysis
                </CardTitle>
                <CardDescription>Identifying peak business hours to optimize staffing.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {peakHour && peakHour.count > 0 && (
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Peak Traffic Window</p>
                                <p className="text-sm font-bold">{peakHour.display} — {peakHour.count} transactions</p>
                            </div>
                        </div>
                    )}

                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis 
                                    dataKey="hour" 
                                    tickFormatter={(h) => `${h}`} 
                                    fontSize={10} 
                                    axisLine={false} 
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-background border rounded-lg p-2 shadow-xl text-xs">
                                                    <p className="font-bold">{data.display}</p>
                                                    <p className="text-primary">{data.count} Sales</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.count === peakHour?.count && entry.count > 0 ? 'var(--primary)' : 'var(--primary-opacity, rgba(249, 115, 22, 0.3))'} 
                                            className="transition-all duration-300 hover:opacity-100"
                                            style={{ '--primary-opacity': 'rgba(var(--primary-rgb, 249, 115, 22), 0.3)' } as React.CSSProperties}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
