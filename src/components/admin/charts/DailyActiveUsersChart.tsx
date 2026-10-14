'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Users,
  Calendar,
  Sparkles,
  BarChart3,
  TrendingUp,
  Search,
  CheckCircle2,
  Laptop,
  Smartphone,
  Globe,
  Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TimeframePicker, type Timeframe } from '@/components/reports/timeframe-picker';
import {
  subDays,
  startOfDay,
  format,
  eachDayOfInterval,
  isToday,
  isSameDay,
  eachHourOfInterval,
  startOfHour,
} from 'date-fns';
import type { UserProfile, Receipt, BusinessInstance } from '@/types';
import { UserPresence, toDate } from '@/components/admin/user-detail/user-primitives';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface DailyActiveUsersChartProps {
  users: UserProfile[];
  receipts: Receipt[];
  invoices?: any[];
  expenses?: any[];
  businesses?: BusinessInstance[];
}

interface DayDataPoint {
  date: string;
  fullDate: string;
  onlineUsers: number;
  salesCount: number;
  invoicesCount: number;
  expensesCount: number;
  totalEvents: number;
  activeUserIds: string[];
  users: UserProfile[];
}

export default function DailyActiveUsersChart({
  users,
  receipts,
  invoices = [],
  expenses = [],
  businesses = [],
}: DailyActiveUsersChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>('30d');
  const [chartType, setChartType] = React.useState<'area' | 'bar'>('area');
  const [selectedDayDetails, setSelectedDayDetails] = React.useState<DayDataPoint | null>(null);
  const [drilldownSearch, setDrilldownSearch] = React.useState('');
  const [recentJourneys, setRecentJourneys] = React.useState<any[]>([]);

  const firestore = useFirestore();

  // Map business by id for fast lookup
  const businessMap = React.useMemo(() => {
    const map = new Map<string, string>();
    businesses.forEach((b) => {
      if (b.id) map.set(b.id, b.name || 'Unnamed Business');
    });
    return map;
  }, [businesses]);

  // Map user by id for fast lookup
  const userMap = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => {
      if (u.id) map.set(u.id, u);
    });
    return map;
  }, [users]);

  // Fetch recent journey events for active users to catch navigation/app opens even without sales
  React.useEffect(() => {
    if (!firestore || !users.length) return;
    let cancelled = false;

    const topUsers = [...users]
      .filter((u) => Boolean(u.lastSeen || (u.totalUsageSeconds && u.totalUsageSeconds > 0)))
      .slice(0, 40);

    if (topUsers.length === 0) return;

    const fetchPromises = topUsers.map((u) => {
      const q = query(
        collection(firestore, `users/${u.id}/journey`),
        orderBy('startedAt', 'desc'),
        limit(50)
      );
      return getDocs(q)
        .then((snap) =>
          snap.docs.map((d) => ({
            id: d.id,
            uid: u.id,
            ...(d.data() as any),
          }))
        )
        .catch(() => []);
    });

    Promise.all(fetchPromises)
      .then((results) => {
        if (cancelled) return;
        setRecentJourneys(results.flat());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [firestore, users]);

  // Calculate live presence counts
  const { onlineNowCount, onlineTodayCount } = React.useMemo(() => {
    const nowMs = Date.now();
    const todayStart = startOfDay(new Date());

    let onlineNow = 0;
    let onlineToday = 0;

    users.forEach((u) => {
      const seen = toDate(u.lastSeen);
      if (!seen) return;
      const diffMs = Math.max(0, nowMs - seen.getTime());
      const isMinimizedOrIdle =
        u.status === 'minimized' || u.status === 'idle' || u.status === 'away';
      if (diffMs < 5 * 60 * 1000 && !isMinimizedOrIdle) {
        onlineNow++;
      }
      if (seen >= todayStart) {
        onlineToday++;
      }
    });

    return { onlineNowCount: onlineNow, onlineTodayCount: onlineToday };
  }, [users]);

  // Calculate daily chart data
  const { chartData, averageOnline, peakDay } = React.useMemo(() => {
    const now = new Date();
    let limitDate: Date;

    if (timeframe === 'today') limitDate = startOfDay(now);
    else if (timeframe === '7d') limitDate = subDays(now, 7);
    else if (timeframe === '30d') limitDate = subDays(now, 30);
    else if (timeframe === 'all') limitDate = subDays(now, 365);
    else limitDate = subDays(now, 90);

    const isTodayMode = timeframe === 'today';

    // Map to hold daily/hourly buckets
    const bucketMap: Record<
      string,
      {
        label: string;
        fullDate: string;
        userSet: Set<string>;
        salesCount: number;
        invoicesCount: number;
        expensesCount: number;
      }
    > = {};

    if (isTodayMode) {
      // Create 2-hour interval slots for Today
      const startToday = startOfDay(now);
      const hours = eachHourOfInterval({ start: startToday, end: now });
      hours.forEach((h) => {
        const key = format(h, 'HH:00');
        bucketMap[key] = {
          label: format(h, 'ha'),
          fullDate: `Today, ${format(h, 'h:mm a')}`,
          userSet: new Set<string>(),
          salesCount: 0,
          invoicesCount: 0,
          expensesCount: 0,
        };
      });
    } else {
      // Days interval
      const days = eachDayOfInterval({ start: limitDate, end: now });
      days.forEach((day) => {
        const key = format(day, 'yyyy-MM-dd');
        bucketMap[key] = {
          label: format(day, 'MMM d'),
          fullDate: format(day, 'EEEE, MMMM d, yyyy'),
          userSet: new Set<string>(),
          salesCount: 0,
          invoicesCount: 0,
          expensesCount: 0,
        };
      });
    }

    const getKey = (date: Date): string | null => {
      if (date < limitDate || date > now) return null;
      if (isTodayMode) {
        if (!isToday(date)) return null;
        return format(startOfHour(date), 'HH:00');
      }
      return format(date, 'yyyy-MM-dd');
    };

    // 1. Ingest receipts
    receipts.forEach((r) => {
      if (!r.createdAt) return;
      const d = toDate(r.createdAt);
      if (!d) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        if (r.createdBy) bucketMap[key].userSet.add(r.createdBy);
        bucketMap[key].salesCount++;
      }
    });

    // 2. Ingest invoices
    invoices.forEach((inv) => {
      if (!inv.createdAt) return;
      const d = toDate(inv.createdAt);
      if (!d) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        if (inv.createdBy) bucketMap[key].userSet.add(inv.createdBy);
        bucketMap[key].invoicesCount++;
      }
    });

    // 3. Ingest expenses
    expenses.forEach((exp) => {
      if (!exp.createdAt && !exp.date) return;
      const d = toDate(exp.createdAt || exp.date);
      if (!d) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        const userId = exp.recordedBy || exp.createdBy;
        if (userId) bucketMap[key].userSet.add(userId);
        bucketMap[key].expensesCount++;
      }
    });

    // 4. Ingest user signup dates (they were online during signup)
    users.forEach((u) => {
      if (!u.createdAt || !u.id) return;
      const d = toDate(u.createdAt);
      if (!d) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        bucketMap[key].userSet.add(u.id);
      }
    });

    // 5. Ingest user lastSeen
    users.forEach((u) => {
      if (!u.lastSeen || !u.id) return;
      const d = toDate(u.lastSeen);
      if (!d) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        bucketMap[key].userSet.add(u.id);
      }
    });

    // 6. Ingest journey sessions
    recentJourneys.forEach((j) => {
      const d = toDate(j.startedAt || j.routes?.[0]?.at);
      if (!d || !j.uid) return;
      const key = getKey(d);
      if (key && bucketMap[key]) {
        bucketMap[key].userSet.add(j.uid);
      }
    });

    // Construct final data points
    let peakCount = 0;
    let peakDateStr = '';

    const list: DayDataPoint[] = Object.entries(bucketMap).map(([key, item]) => {
      const activeIds = Array.from(item.userSet);
      const userObjects = activeIds
        .map((uid) => userMap.get(uid))
        .filter((u): u is UserProfile => Boolean(u));

      const count = activeIds.length;
      if (count > peakCount) {
        peakCount = count;
        peakDateStr = item.label;
      }

      return {
        date: item.label,
        fullDate: item.fullDate,
        onlineUsers: count,
        salesCount: item.salesCount,
        invoicesCount: item.invoicesCount,
        expensesCount: item.expensesCount,
        totalEvents: item.salesCount + item.invoicesCount + item.expensesCount,
        activeUserIds: activeIds,
        users: userObjects,
      };
    });

    const totalUsersSum = list.reduce((sum, item) => sum + item.onlineUsers, 0);
    const avg = list.length > 0 ? parseFloat((totalUsersSum / list.length).toFixed(1)) : 0;

    return {
      chartData: list,
      averageOnline: avg,
      peakDay: { count: peakCount, date: peakDateStr },
    };
  }, [users, receipts, invoices, expenses, recentJourneys, userMap, timeframe]);

  // Filter users inside the date drilldown modal
  const filteredDrilldownUsers = React.useMemo(() => {
    if (!selectedDayDetails) return [];
    if (!drilldownSearch.trim()) return selectedDayDetails.users;
    const q = drilldownSearch.toLowerCase();
    return selectedDayDetails.users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const biz = (businessMap.get(u.businessId) || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || biz.includes(q);
    });
  }, [selectedDayDetails, drilldownSearch, businessMap]);

  return (
    <>
      <Card className="border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4 bg-card/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Activity className="h-5 w-5" />
                </span>
                Users Online Per Day
              </CardTitle>
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-0.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {onlineNowCount} Live Online
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-medium">
                {onlineTodayCount} Active Today
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Unique authenticated accounts active on Zeneva (daily average:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {averageOnline} users/day
              </strong>
              {peakDay.count > 0 && (
                <span>
                  {' '}
                  · Peak:{' '}
                  <strong className="text-primary font-semibold">
                    {peakDay.count} users ({peakDay.date})
                  </strong>
                </span>
              )}
              ).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Chart type toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'area'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Area Curve View"
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Bar Chart View"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>

            <TimeframePicker value={timeframe} onValueChange={setTimeframe} />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const payload = state.activePayload[0].payload as DayDataPoint;
                      if (payload && payload.users.length > 0) {
                        setSelectedDayDetails(payload);
                      }
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as DayDataPoint;
                      return (
                        <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl min-w-[220px] max-w-[280px] text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {data.date}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{data.fullDate}</span>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                              Online Users:
                            </span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {data.onlineUsers} {data.onlineUsers === 1 ? 'user' : 'users'}
                            </span>
                          </div>

                          {data.totalEvents > 0 && (
                            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              Activity: {data.salesCount} sales · {data.invoicesCount} invoices · {data.expensesCount} expenses
                            </div>
                          )}

                          {data.users.length > 0 && (
                            <div className="pt-1.5 border-t border-border/60 space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                Users active on this date:
                              </span>
                              <div className="space-y-1">
                                {data.users.slice(0, 4).map((u) => (
                                  <div key={u.id} className="flex items-center justify-between text-[11px] truncate">
                                    <span className="font-medium text-foreground truncate max-w-[130px]">
                                      {u.name || u.email || 'Unnamed'}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize">
                                      {u.role || 'operator'}
                                    </Badge>
                                  </div>
                                ))}
                                {data.users.length > 4 && (
                                  <p className="text-[10px] text-primary font-medium hover:underline cursor-pointer pt-0.5">
                                    + {data.users.length - 4} more (click bar to view all)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {averageOnline > 0 && (
                    <ReferenceLine
                      y={averageOnline}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      opacity={0.8}
                      label={{
                        value: `Avg: ${averageOnline}`,
                        fill: '#10b981',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  )}
                  <Area
                    name="Users Online"
                    type="monotone"
                    dataKey="onlineUsers"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#onlineGradient)"
                    dot={
                      timeframe === '7d' || timeframe === 'today'
                        ? { r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }
                        : false
                    }
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const payload = state.activePayload[0].payload as DayDataPoint;
                      if (payload && payload.users.length > 0) {
                        setSelectedDayDetails(payload);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as DayDataPoint;
                      return (
                        <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl min-w-[220px] max-w-[280px] text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {data.date}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{data.fullDate}</span>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Radio className="h-3.5 w-3.5 text-emerald-500" />
                              Online Users:
                            </span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {data.onlineUsers} {data.onlineUsers === 1 ? 'user' : 'users'}
                            </span>
                          </div>

                          {data.users.length > 0 && (
                            <div className="pt-1.5 border-t border-border/60 space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                Active Users:
                              </span>
                              <div className="space-y-1">
                                {data.users.slice(0, 4).map((u) => (
                                  <div key={u.id} className="flex items-center justify-between text-[11px] truncate">
                                    <span className="font-medium text-foreground truncate max-w-[130px]">
                                      {u.name || u.email || 'Unnamed'}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize">
                                      {u.role || 'operator'}
                                    </Badge>
                                  </div>
                                ))}
                                {data.users.length > 4 && (
                                  <p className="text-[10px] text-primary font-medium hover:underline cursor-pointer pt-0.5">
                                    + {data.users.length - 4} more (click to view)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {averageOnline > 0 && (
                    <ReferenceLine
                      y={averageOnline}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      opacity={0.8}
                      label={{
                        value: `Avg: ${averageOnline}`,
                        fill: '#10b981',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  )}
                  <Bar
                    name="Users Online"
                    dataKey="onlineUsers"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Tip: Click any day on the graph to inspect the exact users online.
            </span>
            {peakDay.count > 0 && (
              <span className="font-medium text-foreground">
                Peak: <strong className="text-emerald-600">{peakDay.count} users</strong> on {peakDay.date}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drilldown Dialog for a specific date */}
      <Dialog open={Boolean(selectedDayDetails)} onOpenChange={(open) => !open && setSelectedDayDetails(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-emerald-500" />
              Users Online on {selectedDayDetails?.fullDate}
            </DialogTitle>
            <DialogDescription>
              {selectedDayDetails?.onlineUsers} unique accounts recorded online on this date.
              {selectedDayDetails && selectedDayDetails.totalEvents > 0 && (
                <span> ({selectedDayDetails.salesCount} sales, {selectedDayDetails.invoicesCount} invoices recorded).</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user by name, email, role, or business..."
              value={drilldownSearch}
              onChange={(e) => setDrilldownSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredDrilldownUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found matching "{drilldownSearch}".
              </div>
            ) : (
              filteredDrilldownUsers.map((u) => {
                const bizName = businessMap.get(u.businessId) || 'Zeneva Store';
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{u.name || 'Unnamed User'}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                          {u.role || 'operator'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email || 'No email'}</p>
                      <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                        <span className="font-medium text-foreground/80">{bizName}</span>
                        {u.deviceType && (
                          <span className="capitalize flex items-center gap-0.5 ml-2">
                            {u.deviceType === 'desktop' || u.deviceType === 'microsoft' ? (
                              <Laptop className="h-3 w-3" />
                            ) : u.deviceType === 'mobile' ? (
                              <Smartphone className="h-3 w-3" />
                            ) : (
                              <Globe className="h-3 w-3" />
                            )}
                            {u.deviceType}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <UserPresence lastSeen={u.lastSeen} status={(u as any).status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
