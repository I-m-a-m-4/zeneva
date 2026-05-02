
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Clock, Users, Calendar, TrendingUp } from 'lucide-react';
import { safeToDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HourlySalesHeatmapProps {
    receipts: Receipt[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HourlySalesHeatmap({ receipts }: HourlySalesHeatmapProps) {
    const hourlyData = React.useMemo(() => {
        const hours: Record<number, number> = {};
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

    const dailyData = React.useMemo(() => {
        const days: Record<number, number> = {};
        for (let i = 0; i < 7; i++) days[i] = 0;

        receipts.forEach(r => {
            const date = safeToDate(r.createdAt);
            const day = date.getDay();
            days[day] = (days[day] || 0) + 1;
        });

        return Object.entries(days).map(([day, count]) => ({
            day: parseInt(day),
            name: DAYS[parseInt(day)],
            count
        }));
    }, [receipts]);

    const peakHour = React.useMemo(() => {
        return [...hourlyData].sort((a, b) => b.count - a.count)[0];
    }, [hourlyData]);

    const peakDay = React.useMemo(() => {
        return [...dailyData].sort((a, b) => b.count - a.count)[0];
    }, [dailyData]);

    return (
        <Card className="shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Business Traffic Insights
                </CardTitle>
                <CardDescription>Peak times and days for your business.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="hourly" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="hourly" className="text-xs">Peak Hours</TabsTrigger>
                        <TabsTrigger value="daily" className="text-xs">Peak Days</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="hourly" className="space-y-4">
                        {peakHour && peakHour.count > 0 && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="p-2 rounded-full bg-primary/10">
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Peak Traffic Window</p>
                                    <p className="text-sm font-bold">{peakHour.display} — {peakHour.count} sales</p>
                                </div>
                            </div>
                        )}

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData}>
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
                                        {hourlyData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.count === peakHour?.count && entry.count > 0 ? 'var(--primary)' : 'rgba(var(--primary-rgb, 249, 115, 22), 0.3)'} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="daily" className="space-y-4">
                        {peakDay && peakDay.count > 0 && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <div className="p-2 rounded-full bg-emerald-500/10">
                                    <Calendar className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Busiest Day of Week</p>
                                    <p className="text-sm font-bold">{peakDay.name} — {peakDay.count} sales</p>
                                </div>
                            </div>
                        )}

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis 
                                        dataKey="name" 
                                        tickFormatter={(val) => val.substring(0, 3)}
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
                                                        <p className="font-bold">{data.name}</p>
                                                        <p className="text-emerald-500">{data.count} Sales</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {dailyData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-daily-${index}`} 
                                                fill={entry.count === peakDay?.count && entry.count > 0 ? '#10b981' : 'rgba(16, 185, 129, 0.2)'} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
