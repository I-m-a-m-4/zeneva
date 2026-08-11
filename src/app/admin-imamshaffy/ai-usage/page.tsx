'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, increment, documentId } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Zap, TrendingUp, AlertTriangle, Search, PlusCircle, CheckCircle2, Wrench, Users,
  ShieldAlert, Timer, Coins, MessageSquare, RefreshCw, ShieldCheck, Gauge, Activity,
} from 'lucide-react';
import {
  ZEN_TOOL_COUNT, ZEN_READ_TOOL_NAMES, ZEN_WRITE_TOOL_NAMES, labelForTool,
} from '@/components/ai-insights/zen-status';
import {
  AI_DAILY_COLLECTION, INTENTS, TOOL_GROUPS,
  groupForTool, mergeCountMaps, topEntries, recentDates,
  type AiDailyStats,
} from '@/lib/ai-analytics';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  BarChart, LineChart, PieChart, ComposedChart, XAxis, YAxis, Bar, Line, Pie, Cell, Area,
  CartesianGrid, Legend, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';

/**
 * Admin AI board.
 *
 * Two data sources, and the split matters for reading the numbers:
 *
 *   - `platform_stats/ai_usage_global/daily/{YYYY-MM-DD}` — platform-wide day
 *     rollups written by the chat route. Everything time-based comes from here,
 *     which means history only exists from the day that recorder shipped.
 *     Earlier days are genuinely absent, not zero, and the page says so rather
 *     than drawing a flat line that looks like nobody used it.
 *   - `businessInstances` — per-tenant lifetime tool counts, today's quota
 *     position and bonus credits.
 *
 * Reads are bounded on purpose: N day documents for the selected range plus one
 * query for active businesses. Nothing here fans out per tenant per day.
 */

const GLOBAL_LIMIT = 1500;
const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

const AXIS = { fontSize: 11, tickLine: false, axisLine: false } as const;

/** Chart-ready day, with the gaps filled so the x-axis stays evenly spaced. */
type DayPoint = {
  date: string;
  label: string;
  turns: number;
  blocked: number;
  errors: number;
  businesses: number;
  proposals: number;
  tokens: number;
  avgLatency: number;
  present: boolean;
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function AdminAIUsage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [rangeDays, setRangeDays] = useState(14);
  const [globalCount, setGlobalCount] = useState(0);
  const [days, setDays] = useState<AiDailyStats[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [grantAmount, setGrantAmount] = useState(100);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [isGranting, setIsGranting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!firestore || !user) return;
    loadData();
    // Re-runs when the range changes: a wider window needs day documents that
    // were never fetched, and they cannot be derived from the ones held.
  }, [firestore, user, rangeDays]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const wanted = recentDates(rangeDays);

      /*
       * `documentId()` with `in` fetches the whole range in one query rather
       * than one getDoc per day.
       *
       * Chunked at 10 because that is Firestore's floor for `in` across SDK
       * versions, and chunking is free here: billing is per document returned,
       * not per query, so the only cost of an extra chunk is a round trip. The
       * alternative — one query at the current 30-value cap — sits exactly on
       * the limit, and the next range added to RANGES would break it silently.
       */
      const chunks: string[][] = [];
      for (let i = 0; i < wanted.length; i += 10) chunks.push(wanted.slice(i, i + 10));

      const [globalDoc, dailySnaps, bSnap] = await Promise.all([
        getDoc(doc(firestore, 'platform_stats', 'ai_usage_global')),
        Promise.all(
          chunks.map((ids) =>
            getDocs(query(collection(firestore, AI_DAILY_COLLECTION), where(documentId(), 'in', ids))),
          ),
        ),
        getDocs(query(collection(firestore, 'businessInstances'), where('status', '==', 'active'))),
      ]);

      if (globalDoc.exists()) {
        const data = globalDoc.data();
        setGlobalCount(data.date === todayStr ? data.count || 0 : 0);
      } else {
        setGlobalCount(0);
      }

      setDays(dailySnaps.flatMap((snap) => snap.docs.map((d) => ({ date: d.id, ...(d.data() as any) }))));

      const bData = bSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b: any) => b.aiUsageCount > 0 || b.aiBonusCredits > 0 || b.aiToolUsageCounts)
        .sort((a: any, b: any) => {
          const aCount = a.aiUsageCurrentDate === todayStr ? a.aiUsageCount || 0 : 0;
          const bCount = b.aiUsageCurrentDate === todayStr ? b.aiUsageCount || 0 : 0;
          if (bCount !== aCount) return bCount - aCount;
          const aLife = Object.values(a.aiToolUsageCounts || {}).reduce((s: number, n: any) => s + n, 0);
          const bLife = Object.values(b.aiToolUsageCounts || {}).reduce((s: number, n: any) => s + n, 0);
          return (bLife as number) - (aLife as number);
        });

      setBusinesses(bData);
    } catch (error) {
      console.error('Failed to load AI usage:', error);
      toast({ variant: 'destructive', title: 'Could not load AI analytics', description: 'Check the console for details.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedBusiness || !firestore) return;
    setIsGranting(true);
    try {
      const bRef = doc(firestore, 'businessInstances', selectedBusiness.id);
      await updateDoc(bRef, { aiBonusCredits: increment(grantAmount) });
      toast({ title: 'Credits Granted', description: `Successfully granted ${grantAmount} bonus credits to ${selectedBusiness.name}.` });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to grant credits.' });
    } finally {
      setIsGranting(false);
    }
  };
  // ── Derived analytics ────────────────────────────────────────────────────
  // All of it memoised on `days`/`businesses`: these fold over every day
  // document and every tenant, and recomputing on each keystroke in the search
  // box made the table janky.

  const byDate = useMemo(() => {
    const m = new Map<string, AiDailyStats>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  /** One point per day in the range, whether or not a document exists for it. */
  const series = useMemo<DayPoint[]>(() => {
    return recentDates(rangeDays).map((date) => {
      const d = byDate.get(date);
      const turns = d?.count ?? 0;
      const blocked = Object.values(d?.blocked ?? {}).reduce((s, n) => s + n, 0);
      return {
        date,
        label: shortDate(date),
        turns,
        blocked,
        errors: d?.errors ?? 0,
        businesses: Object.keys(d?.businesses ?? {}).length,
        proposals: d?.proposalTurns ?? 0,
        tokens: (d?.tokensIn ?? 0) + (d?.tokensOut ?? 0),
        // Averaged at read time — the rollup stores the sum, because you cannot
        // add two averages together and get the average of the whole.
        avgLatency: turns > 0 ? Math.round((d?.latencyMsTotal ?? 0) / turns) : 0,
        present: !!d,
      };
    });
  }, [byDate, rangeDays]);

  const totals = useMemo(() => {
    const turns = series.reduce((s, p) => s + p.turns, 0);
    const blocked = series.reduce((s, p) => s + p.blocked, 0);
    const errors = series.reduce((s, p) => s + p.errors, 0);
    const proposals = series.reduce((s, p) => s + p.proposals, 0);
    const tokens = series.reduce((s, p) => s + p.tokens, 0);
    const latencySum = days.reduce((s, d) => s + (d.latencyMsTotal ?? 0), 0);
    const daysWithData = series.filter((p) => p.present).length;
    return {
      turns, blocked, errors, proposals, tokens, daysWithData,
      avgLatency: turns > 0 ? Math.round(latencySum / turns) : 0,
      avgPerDay: daysWithData > 0 ? Math.round(turns / daysWithData) : 0,
      // Distinct tenants across the window, not the sum of daily actives — the
      // same shop on five days is one business, not five.
      distinctBusinesses: new Set(days.flatMap((d) => Object.keys(d.businesses ?? {}))).size,
      peakDay: series.reduce<DayPoint | null>((best, p) => (!best || p.turns > best.turns ? p : best), null),
    };
  }, [series, days]);

  /** Platform-wide tool calls for the window. */
  const toolTotals = useMemo(() => mergeCountMaps(days.map((d) => d.tools)), [days]);

  /**
   * Lifetime tool calls, summed across tenants.
   *
   * Kept beside the windowed figure because the two answer different questions:
   * this one has depth (it predates the day rollups) but cannot be filtered by
   * date, so a tool retired last month still shows here.
   */
  const lifetimeToolTotals = useMemo(
    () => mergeCountMaps(businesses.map((b) => b.aiToolUsageCounts)),
    [businesses],
  );

  const toolChart = useMemo(() => {
    const source = totals.turns > 0 ? toolTotals : lifetimeToolTotals;
    return topEntries(source, 12).map((e) => ({
      name: labelForTool(e.key),
      tool: e.key,
      calls: e.value,
      fill: TOOL_GROUPS.find((g) => g.id === groupForTool(e.key))?.color ?? '#94a3b8',
    }));
  }, [toolTotals, lifetimeToolTotals, totals.turns]);

  /** Tool calls rolled up by area of the business. */
  const groupChart = useMemo(() => {
    const source = Object.keys(toolTotals).length ? toolTotals : lifetimeToolTotals;
    const acc: Record<string, number> = {};
    for (const [tool, n] of Object.entries(source)) {
      const g = groupForTool(tool);
      acc[g] = (acc[g] ?? 0) + n;
    }
    return TOOL_GROUPS
      .map((g) => ({ name: g.label, value: acc[g.id] ?? 0, fill: g.color }))
      .filter((r) => r.value > 0);
  }, [toolTotals, lifetimeToolTotals]);

  /** What people are asking, by intent. */
  const intentChart = useMemo(() => {
    const merged = mergeCountMaps(days.map((d) => d.intents));
    const total = Object.values(merged).reduce((s, n) => s + n, 0);
    return INTENTS
      .map((i) => ({
        id: i.id,
        name: i.label,
        hint: i.hint,
        value: merged[i.id] ?? 0,
        share: total > 0 ? Math.round(((merged[i.id] ?? 0) / total) * 100) : 0,
        fill: i.color,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [days]);

  /** Vocabulary hits — the words behind the intents. */
  const keywordChart = useMemo(() => {
    const merged = mergeCountMaps(days.map((d) => d.keywords));
    return topEntries(merged, 22).map((e) => ({ name: e.key, value: e.value }));
  }, [days]);

  /** Refusals by reason. Small numbers, but the ones worth acting on. */
  const blockedChart = useMemo(() => {
    const merged = mergeCountMaps(days.map((d) => d.blocked));
    const LABELS: Record<string, string> = {
      plan_limit: 'Hit their plan limit',
      global_limit: 'Hit the platform limit',
      injection: 'Injection scan fired',
      bad_history: 'Unreadable chat history',
    };
    const COLORS: Record<string, string> = {
      plan_limit: '#f59e0b',
      global_limit: '#ef4444',
      injection: '#7c3aed',
      bad_history: '#64748b',
    };
    return Object.entries(merged)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, name: LABELS[k] ?? k, value: v, fill: COLORS[k] ?? '#94a3b8' }));
  }, [days]);

  /** Demand by hour, UTC. Tells you when the quota is actually under pressure. */
  const hourChart = useMemo(() => {
    const merged = mergeCountMaps(days.map((d) => d.hours));
    return Array.from({ length: 24 }, (_, h) => ({
      name: `${String(h).padStart(2, '0')}:00`,
      hour: h,
      value: merged[String(h)] ?? 0,
    }));
  }, [days]);

  /** Turns by the plan in force at the time — where the load actually sits. */
  const planChart = useMemo(() => {
    const merged = mergeCountMaps(days.map((d) => d.plans));
    const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#64748b', '#ec4899'];
    return Object.entries(merged)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v], i) => ({ name: k, value: v, fill: COLORS[i % COLORS.length] }));
  }, [days]);

  /** Per-tenant totals for the table, windowed where the data allows. */
  const businessRows = useMemo(() => {
    const windowed = mergeCountMaps(days.map((d) => d.businesses));
    return businesses.map((b) => {
      const lifetime = Object.values(b.aiToolUsageCounts || {}).reduce(
        (s: number, n: any) => s + (typeof n === 'number' ? n : 0),
        0,
      ) as number;
      const favourite = topEntries(b.aiToolUsageCounts || {}, 1)[0];
      return {
        ...b,
        todayUsage: b.aiUsageCurrentDate === todayStr ? b.aiUsageCount || 0 : 0,
        windowTurns: windowed[b.id] ?? 0,
        lifetimeCalls: lifetime,
        favouriteTool: favourite ? labelForTool(favourite.key) : null,
        favouriteCount: favourite?.value ?? 0,
      };
    });
  }, [businesses, days, todayStr]);

  const filteredBusinesses = useMemo(
    () => businessRows.filter((b) => (b.name || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [businessRows, searchTerm],
  );

  const activeToday = businessRows.filter((b) => b.todayUsage > 0).length;
  const usagePercent = Math.min((globalCount / GLOBAL_LIMIT) * 100, 100);
  const isDanger = usagePercent > 90;
  const errorRate = totals.turns > 0 ? (totals.errors / totals.turns) * 100 : 0;
  const refusalRate =
    totals.turns + totals.blocked > 0 ? (totals.blocked / (totals.turns + totals.blocked)) * 100 : 0;
  const hasHistory = totals.daysWithData > 0;

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <Zap className="w-8 h-8 animate-pulse text-orange-300" />
        <p className="text-sm text-slate-400">Loading AI analytics…</p>
      </div>
    );
  }
  const rangeLabel = RANGES.find((r) => r.days === rangeDays)?.label ?? `${rangeDays} days`;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-orange-500" />
            AI Usage Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            What people ask Zen AI, which tools answer it, and what it costs to run.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rangeDays === r.days ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/*
        History only exists from the day the rollup recorder shipped. Saying so
        beats drawing a flat line across dates that were never recorded — that
        reads as "nobody used it", which is a different and wrong conclusion.
      */}
      {!hasHistory && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">No day-level history yet for this range.</p>
            <p className="text-amber-800/80 mt-0.5">
              Trends, intents and keywords are recorded per day from the moment the rollup shipped;
              earlier days have no document rather than a zero. The tool charts below fall back to
              lifetime per-business counts so they stay useful in the meantime.
            </p>
          </div>
        </div>
      )}

      {/* ── Row 1: today, live ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className={isDanger ? 'border-red-200 bg-red-50' : 'border-slate-200'}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Global Usage (Today)</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-3xl font-bold text-slate-900">{globalCount.toLocaleString()}</h2>
                  <span className="text-sm font-medium text-slate-500">/ {GLOBAL_LIMIT.toLocaleString()}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {isDanger ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isDanger ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{Math.round(usagePercent)}% of the daily platform cap.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Businesses Using AI Today</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-3xl font-bold text-slate-900">{activeToday}</h2>
                  <span className="text-sm font-medium text-slate-500">/ {businessRows.length} active</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {totals.distinctBusinesses > 0
                ? `${totals.distinctBusinesses} distinct businesses over ${rangeLabel}.`
                : 'Businesses that sent at least one prompt today.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Turns — {rangeLabel}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-3xl font-bold text-slate-900">{totals.turns.toLocaleString()}</h2>
                  <span className="text-sm font-medium text-slate-500">
                    ~{totals.avgPerDay.toLocaleString()}/day
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {totals.peakDay && totals.peakDay.turns > 0
                ? `Busiest day ${totals.peakDay.label} with ${totals.peakDay.turns.toLocaleString()}.`
                : 'No prompts recorded in this range yet.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Tools Zen AI Can Call</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-3xl font-bold text-slate-900">{ZEN_TOOL_COUNT}</h2>
                  <span className="text-sm font-medium text-slate-500">capabilities</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-violet-100 text-violet-600">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">{ZEN_READ_TOOL_NAMES.length} read</Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">{ZEN_WRITE_TOOL_NAMES.length} propose</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: health of the service over the window ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Avg response time',
            value: totals.avgLatency > 0 ? `${(totals.avgLatency / 1000).toFixed(1)}s` : '—',
            hint: 'Whole turn, tools included',
            icon: Timer,
            tone: totals.avgLatency > 12000 ? 'text-red-600 bg-red-50' : 'text-slate-700 bg-slate-100',
          },
          {
            label: 'Refusal rate',
            value: `${refusalRate.toFixed(1)}%`,
            hint: `${totals.blocked.toLocaleString()} turns blocked`,
            icon: ShieldAlert,
            tone: refusalRate > 10 ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-100',
          },
          {
            label: 'Error rate',
            value: `${errorRate.toFixed(1)}%`,
            hint: `${totals.errors.toLocaleString()} failed mid-stream`,
            icon: Activity,
            tone: errorRate > 2 ? 'text-red-600 bg-red-50' : 'text-slate-700 bg-slate-100',
          },
          {
            label: 'Proposal turns',
            value: totals.proposals.toLocaleString(),
            hint: totals.turns > 0 ? `${Math.round((totals.proposals / totals.turns) * 100)}% asked for a change` : 'Writes awaiting approval',
            icon: ShieldCheck,
            tone: 'text-orange-700 bg-orange-50',
          },
          {
            label: 'Tokens used',
            value: totals.tokens >= 1000 ? `${(totals.tokens / 1000).toFixed(1)}k` : totals.tokens.toLocaleString(),
            hint: `Input + output over ${rangeLabel}`,
            icon: Coins,
            tone: 'text-emerald-700 bg-emerald-50',
          },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${s.tone}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{s.value}</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* ── Demand over time ── */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Prompt Volume — {rangeLabel}
          </CardTitle>
          <CardDescription>
            Turns against the number of distinct businesses producing them. Volume climbing while
            businesses stays flat means your existing users are leaning on Zen AI harder, which is a
            different problem from growth — it moves the quota, not the revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* ComposedChart, not AreaChart: this mixes an Area with two
                  Lines on two axes, and ComposedChart is the one component
                  recharts documents for that. */}
              <ComposedChart data={series}>
                <defs>
                  <linearGradient id="aiTurnsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis yAxisId="left" {...AXIS} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" {...AXIS} allowDecimals={false} />
                <ReTooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  yAxisId="left" type="monotone" dataKey="turns" name="Turns"
                  stroke="#f97316" strokeWidth={2} fill="url(#aiTurnsFill)"
                />
                <Line
                  yAxisId="right" type="monotone" dataKey="businesses" name="Distinct businesses"
                  stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" dot={false}
                />
                <Line
                  yAxisId="left" type="monotone" dataKey="blocked" name="Blocked"
                  stroke="#ef4444" strokeWidth={1.5} dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── What people are asking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              What People Are Asking — {rangeLabel}
            </CardTitle>
            <CardDescription>
              Every prompt is bucketed into one intent as it arrives. The prompt itself is never
              stored, so this is the closest thing to reading over their shoulder — and the shape of
              it tells you which part of Zeneva people actually reach for Zen AI to do.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {intentChart.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No prompts recorded in this range yet.</p>
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentChart} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" {...AXIS} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} {...AXIS} />
                    <ReTooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v: any, _n: any, p: any) => [`${v} prompts (${p.payload.share}%)`, p.payload.hint]}
                    />
                    <Bar dataKey="value" name="Prompts" radius={[0, 4, 4, 0]}>
                      {intentChart.map((row) => (
                        <Cell key={row.id} fill={row.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4 text-violet-500" />
              Words They Use
            </CardTitle>
            <CardDescription>
              Matches against a fixed retail vocabulary — anything outside it, including customer
              names, cannot be recorded. Sized by how often each term appears.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keywordChart.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Nothing recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 items-center content-start min-h-[300px]">
                {keywordChart.map((k, i) => {
                  const max = keywordChart[0].value || 1;
                  const weight = k.value / max;
                  return (
                    <span
                      key={k.name}
                      title={`${k.value} mentions`}
                      className="rounded-full px-2.5 py-1 font-medium border transition-colors"
                      style={{
                        fontSize: `${11 + Math.round(weight * 9)}px`,
                        color: weight > 0.5 ? '#c2410c' : '#475569',
                        backgroundColor: weight > 0.5 ? '#fff7ed' : '#f8fafc',
                        borderColor: weight > 0.5 ? '#fed7aa' : '#e2e8f0',
                        opacity: 0.55 + weight * 0.45,
                      }}
                    >
                      {k.name}
                      <span className="ml-1.5 text-[10px] opacity-60">{k.value}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Most used tools ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-4 h-4 text-blue-500" />
              Most Used Tools
              {totals.turns === 0 && <Badge variant="secondary" className="text-[10px]">lifetime</Badge>}
            </CardTitle>
            <CardDescription>
              {totals.turns > 0
                ? `Tool calls over ${rangeLabel}, coloured by the area of the business they touch. One turn can call several.`
                : 'No windowed data yet, so this is lifetime calls summed across every tenant.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {toolChart.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No tool calls recorded yet.</p>
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolChart} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" {...AXIS} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={165} {...AXIS} />
                    <ReTooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v: any, _n: any, p: any) => [`${v} calls`, p.payload.tool]}
                    />
                    <Bar dataKey="calls" name="Calls" radius={[0, 4, 4, 0]}>
                      {toolChart.map((row) => (
                        <Cell key={row.tool} fill={row.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Where the Work Lands</CardTitle>
              <CardDescription>Tool calls grouped by area of the business.</CardDescription>
            </CardHeader>
            <CardContent>
              {groupChart.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Nothing recorded yet.</p>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groupChart} dataKey="value" nameKey="name"
                        innerRadius={45} outerRadius={80} paddingAngle={2}
                      >
                        {groupChart.map((row) => (
                          <Cell key={row.name} fill={row.fill} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [`${v} calls`, 'Calls']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Never Used</CardTitle>
              <CardDescription>
                Tools no tenant has called. Either nobody needs them, or nobody can tell they exist —
                worth checking against the use-cases page before building more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const used = new Set([...Object.keys(toolTotals), ...Object.keys(lifetimeToolTotals)]);
                const unused = [...ZEN_READ_TOOL_NAMES, ...ZEN_WRITE_TOOL_NAMES].filter((n) => !used.has(n));
                if (unused.length === 0) {
                  return (
                    <p className="text-sm text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Every tool has been called at least once.
                    </p>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {unused.map((n) => (
                      <Badge key={n} variant="outline" className="text-[10px] font-normal text-slate-500">
                        {labelForTool(n)}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Load shape and refusals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="w-4 h-4 text-cyan-600" />
              Demand by Hour (UTC)
            </CardTitle>
            <CardDescription>
              When the daily cap is actually under pressure. A sharp single-hour peak is a case for
              rate shaping rather than a bigger cap — the cap is only exhausted because it all
              arrives at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="name" {...AXIS} interval={2} />
                  <YAxis {...AXIS} allowDecimals={false} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [`${v} turns`, 'Turns']} />
                  <Bar dataKey="value" name="Turns" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Why Turns Were Refused
            </CardTitle>
            <CardDescription>
              Blocked before the model, so these never appear in the volume chart.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockedChart.length === 0 ? (
              <p className="text-sm text-emerald-600 flex items-center gap-2 py-6">
                <CheckCircle2 className="w-4 h-4" /> Nothing refused in this range.
              </p>
            ) : (
              <div className="space-y-3">
                {blockedChart.map((row) => {
                  const max = blockedChart[0].value || 1;
                  return (
                    <div key={row.key}>
                      <div className="flex justify-between items-baseline text-xs mb-1">
                        <span className="font-medium text-slate-700">{row.name}</span>
                        <span className="text-slate-500 font-semibold">{row.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-slate-400 pt-2 leading-snug">
                  Plan limits climbing is a pricing signal. The injection scan firing repeatedly is a
                  security one — check Cyber Shield for the same window.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Plan mix and cost ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Turns by Plan</CardTitle>
            <CardDescription>
              The plan in force at the moment of the turn, so a lapsed subscription counts where it
              actually landed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planChart.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Nothing recorded yet.</p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planChart} dataKey="value" nameKey="name" outerRadius={80}>
                      {planChart.map((row) => (
                        <Cell key={row.name} fill={row.fill} />
                      ))}
                    </Pie>
                    <ReTooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [`${v} turns`, 'Turns']} />
                    <Legend wrapperStyle={{ fontSize: 11, textTransform: 'capitalize' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="w-4 h-4 text-emerald-600" />
              Token Spend & Response Time — {rangeLabel}
            </CardTitle>
            <CardDescription>
              Tokens are the bill; response time is what the owner feels. Latency rising while tokens
              stay flat usually means tools are doing more Firestore work per turn, not that answers
              got longer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" {...AXIS} />
                  <YAxis yAxisId="left" {...AXIS} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                  <YAxis yAxisId="right" orientation="right" {...AXIS} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}s`} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v: any, n: any) =>
                      n === 'Avg response' ? [`${(Number(v) / 1000).toFixed(1)}s`, n] : [Number(v).toLocaleString(), n]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="tokens" name="Tokens" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="avgLatency" name="Avg response" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* ── Per-tenant table ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Top AI Users</CardTitle>
              <CardDescription>
                Sorted by today's usage, then by lifetime tool calls. "Favourite tool" is what each
                business reaches for most — the fastest read on what they actually bought Zeneva for.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search businesses..."
                className="pl-9 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Business Name</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium text-center">Today</th>
                  <th className="px-6 py-4 font-medium text-center">{rangeLabel}</th>
                  <th className="px-6 py-4 font-medium">Favourite Tool</th>
                  <th className="px-6 py-4 font-medium text-center">Lifetime Calls</th>
                  <th className="px-6 py-4 font-medium text-center">Bonus Credits</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{b.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize text-slate-600">{b.plan || 'starter'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {b.todayUsage > 0 ? b.todayUsage : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {b.windowTurns > 0 ? b.windowTurns.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {b.favouriteTool ? (
                        <span className="text-xs text-slate-600">
                          {b.favouriteTool}
                          <span className="text-slate-400 ml-1.5">×{b.favouriteCount}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">
                      {b.lifetimeCalls > 0 ? b.lifetimeCalls.toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {b.aiBonusCredits ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                          {b.aiBonusCredits} available
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Dialog open={isDialogOpen && selectedBusiness?.id === b.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) setSelectedBusiness(b);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <PlusCircle className="w-3.5 h-3.5" />
                            Grant Credits
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Grant Bonus AI Credits</DialogTitle>
                            <DialogDescription>
                              Add bonus AI queries to {b.name}. These credits do not expire and will be used if the daily tier limit is reached.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Amount of Credits to Grant</label>
                            <Input
                              type="number"
                              min={1}
                              value={grantAmount}
                              onChange={(e) => setGrantAmount(Number(e.target.value))}
                              className="text-lg"
                            />
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleGrantCredits} disabled={isGranting} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                              {isGranting ? <Zap className="w-4 h-4 animate-bounce" /> : <CheckCircle2 className="w-4 h-4" />}
                              Grant Credits
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
                {filteredBusinesses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No AI usage data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-2xl mx-auto pb-4">
        Prompt text is never stored. Intents and keywords are derived as each turn arrives — the
        keyword list can only ever record words from a fixed retail vocabulary, so customer names and
        order details have no path into this page even when they are typed into the chat.
      </p>
    </div>
  );
}
