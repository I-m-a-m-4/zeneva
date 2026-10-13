'use client';

/**
 * Campaign results — who was mailed, and who opened it.
 *
 * Supports both All-Time aggregated metrics and granular per-campaign/per-track filtering.
 * All cards, open rates, engagement depth, and recipient logs update dynamically based
 * on the active filter scope.
 */

import * as React from 'react';
import { format } from 'date-fns';
import {
  BanIcon,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Info,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toDate } from '@/components/admin/user-detail/user-primitives';
import { BEHAVIOR_SEGMENT_META, type BehaviorSegment } from '@/lib/behavior-segments';
import { TONE_CLASSES } from './segment-styles';

export interface FollowUpLog {
  id: string;
  sentTo?: string;
  recipientName?: string;
  subject?: string;
  sentAt?: any;
  openedAt?: any;
  status?: 'pending' | 'sent' | 'opened' | 'failed';
  openCount?: number;
  businessId?: string;
  type?: string;
  segment?: BehaviorSegment | string | null;
  behaviorContext?: string | null;
  unsubscribed?: boolean;
  html?: string;
  error?: string;
}

export const CAMPAIGN_TRACK_META: Record<string, { label: string; tone: string }> = {
  weekly_performance: { label: 'Weekly Performance Digest', tone: 'good' },
  win_back: { label: 'Win-Back / Re-engagement', tone: 'danger' },
  cheer_on: { label: 'Cheer-On / Champions', tone: 'good' },
  onboarding: { label: 'Stalled Onboarding Nudge', tone: 'warn' },
};

export function resolveSegmentMeta(segment?: string | null): { label: string; tone: string } {
  if (!segment) return { label: 'General Broadcast', tone: 'neutral' };
  if (CAMPAIGN_TRACK_META[segment]) return CAMPAIGN_TRACK_META[segment];
  if (BEHAVIOR_SEGMENT_META[segment as BehaviorSegment]) {
    return BEHAVIOR_SEGMENT_META[segment as BehaviorSegment];
  }
  return { label: segment.replace(/_/g, ' '), tone: 'neutral' };
}

function wasOpened(log: FollowUpLog): boolean {
  return log.status === 'opened' || (log.openCount ?? 0) > 0;
}

export type Campaign = {
  key: string;
  subject: string;
  segment: BehaviorSegment | string | null;
  logs: FollowUpLog[];
  sent: number;
  opened: number;
  failed: number;
  unsubscribed: number;
  openRate: number;
  lastSentAt: Date | null;
};

function buildCampaigns(logs: FollowUpLog[]): Campaign[] {
  const byKey = new Map<string, Campaign>();

  for (const log of logs) {
    const subject = log.subject || '(no subject)';
    const key = `${subject}::${log.segment ?? ''}`;

    let campaign = byKey.get(key);
    if (!campaign) {
      campaign = {
        key,
        subject,
        segment: log.segment ?? null,
        logs: [],
        sent: 0,
        opened: 0,
        failed: 0,
        unsubscribed: 0,
        openRate: 0,
        lastSentAt: null,
      };
      byKey.set(key, campaign);
    }

    campaign.logs.push(log);
    if (log.status === 'failed') campaign.failed++;
    else campaign.sent++;
    if (wasOpened(log)) campaign.opened++;
    if (log.unsubscribed) campaign.unsubscribed++;

    const sentAt = toDate(log.sentAt);
    if (sentAt && (!campaign.lastSentAt || sentAt > campaign.lastSentAt)) {
      campaign.lastSentAt = sentAt;
    }
  }

  return [...byKey.values()]
    .map(c => ({ ...c, openRate: c.sent > 0 ? (c.opened / c.sent) * 100 : 0 }))
    .sort((a, b) => (b.lastSentAt?.getTime() ?? 0) - (a.lastSentAt?.getTime() ?? 0));
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && 'border-orange-500/40 bg-orange-50/10 dark:bg-orange-950/10')}>
      <CardContent className="p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <Icon className={cn('h-4 w-4 shrink-0', highlight ? 'text-orange-600' : 'text-muted-foreground')} />
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 break-words text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface CampaignResultsProps {
  logs: FollowUpLog[];
  isLoading: boolean;
  onRefresh: () => void;
  onFollowUp?: (emails: string[]) => void;
  initialTrack?: string | null;
}

const FOLLOW_UP_AFTER_DAYS = 3;

export default function CampaignResults({
  logs,
  isLoading,
  onRefresh,
  onFollowUp,
  initialTrack,
}: CampaignResultsProps) {
  const [selectedKey, setSelectedKey] = React.useState<string>('all');
  const [selectedTrack, setSelectedTrack] = React.useState<string>(initialTrack || 'all');
  const [timeframe, setTimeframe] = React.useState<'all' | '7d' | '30d' | '90d'>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'opened' | 'unopened' | 'failed' | 'unsubscribed'>('all');
  const [search, setSearch] = React.useState('');
  const [campaignSearch, setCampaignSearch] = React.useState('');
  const [viewLog, setViewLog] = React.useState<FollowUpLog | null>(null);

  // Sync initialTrack if caller updates it
  React.useEffect(() => {
    if (initialTrack) {
      setSelectedTrack(initialTrack);
    }
  }, [initialTrack]);

  const allCampaigns = React.useMemo(() => buildCampaigns(logs), [logs]);

  // Unique tracks found in the data
  const availableTracks = React.useMemo(() => {
    const set = new Set<string>();
    Object.keys(CAMPAIGN_TRACK_META).forEach(k => set.add(k));
    logs.forEach(l => {
      if (l.segment) set.add(l.segment);
    });
    return Array.from(set);
  }, [logs]);

  // Reset all filters back to All-Time
  const handleResetFilters = () => {
    setSelectedKey('all');
    setSelectedTrack('all');
    setTimeframe('all');
    setStatusFilter('all');
    setSearch('');
  };

  const isFiltered =
    selectedKey !== 'all' ||
    selectedTrack !== 'all' ||
    timeframe !== 'all' ||
    statusFilter !== 'all';

  // Active filtered logs used for ALL metrics calculations
  const filteredLogs = React.useMemo(() => {
    let result = logs;

    // 1. Filter by specific campaign
    if (selectedKey !== 'all') {
      const target = allCampaigns.find(c => c.key === selectedKey);
      if (target) {
        result = result.filter(
          l =>
            (l.subject || '(no subject)') === target.subject &&
            (l.segment ?? '') === (target.segment ?? '')
        );
      }
    }

    // 2. Filter by track
    if (selectedTrack !== 'all') {
      result = result.filter(l => l.segment === selectedTrack);
    }

    // 3. Filter by timeframe
    if (timeframe !== 'all') {
      const now = Date.now();
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const cutoff = now - days * 86_400_000;
      result = result.filter(l => {
        const sentAt = toDate(l.sentAt);
        return sentAt && sentAt.getTime() >= cutoff;
      });
    }

    // 4. Filter by delivery status
    if (statusFilter !== 'all') {
      if (statusFilter === 'opened') {
        result = result.filter(wasOpened);
      } else if (statusFilter === 'unopened') {
        result = result.filter(l => !wasOpened(l) && l.status !== 'failed');
      } else if (statusFilter === 'failed') {
        result = result.filter(l => l.status === 'failed');
      } else if (statusFilter === 'unsubscribed') {
        result = result.filter(l => !!l.unsubscribed);
      }
    }

    return result;
  }, [logs, allCampaigns, selectedKey, selectedTrack, timeframe, statusFilter]);

  // Totals calculated dynamically from the active filtered scope!
  const scopedTotals = React.useMemo(() => {
    const delivered = filteredLogs.filter(l => l.status !== 'failed');
    const opened = delivered.filter(wasOpened);
    return {
      sent: delivered.length,
      opened: opened.length,
      openRate: delivered.length > 0 ? (opened.length / delivered.length) * 100 : 0,
      failed: filteredLogs.filter(l => l.status === 'failed').length,
      unsubscribed: filteredLogs.filter(l => l.unsubscribed).length,
    };
  }, [filteredLogs]);

  const selectedCampaign = React.useMemo(() => {
    if (selectedKey === 'all') return null;
    return allCampaigns.find(c => c.key === selectedKey) ?? null;
  }, [allCampaigns, selectedKey]);

  // Open rate per segment for the current filtered scope
  const segmentPerf = React.useMemo(() => {
    const bySegment = new Map<string, { sent: number; opened: number; unsub: number }>();
    for (const log of filteredLogs) {
      if (log.status === 'failed') continue;
      const key = log.segment ?? 'unlabelled';
      const acc = bySegment.get(key) ?? { sent: 0, opened: 0, unsub: 0 };
      acc.sent += 1;
      if (wasOpened(log)) acc.opened += 1;
      if (log.unsubscribed) acc.unsub += 1;
      bySegment.set(key, acc);
    }
    return [...bySegment.entries()]
      .map(([key, v]) => {
        const meta = resolveSegmentMeta(key);
        return {
          key,
          label: meta.label,
          tone: meta.tone,
          ...v,
          openRate: v.sent > 0 ? (v.opened / v.sent) * 100 : 0,
        };
      })
      .sort((a, b) => b.openRate - a.openRate);
  }, [filteredLogs]);

  // Engagement depth for the active filtered scope
  const engagement = React.useMemo(() => {
    const delivered = filteredLogs.filter(l => l.status !== 'failed');
    const bucket = { none: 0, once: 0, few: 0, many: 0 };
    for (const log of delivered) {
      const opens = log.openCount ?? 0;
      if (opens <= 0) bucket.none += 1;
      else if (opens === 1) bucket.once += 1;
      else if (opens <= 3) bucket.few += 1;
      else bucket.many += 1;
    }
    return { ...bucket, total: delivered.length };
  }, [filteredLogs]);

  // Worth a second attempt for the active filtered scope
  const needsFollowUp = React.useMemo(() => {
    const cutoff = Date.now() - FOLLOW_UP_AFTER_DAYS * 86_400_000;
    const seen = new Set<string>();
    const out: FollowUpLog[] = [];
    for (const log of filteredLogs) {
      if (log.status === 'failed' || log.unsubscribed || wasOpened(log)) continue;
      const sentAt = toDate(log.sentAt);
      if (!sentAt || sentAt.getTime() > cutoff) continue;
      const email = (log.sentTo || '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      out.push(log);
    }
    return out;
  }, [filteredLogs]);

  // Table rows: filteredLogs + recipient search
  const rows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const result = needle
      ? filteredLogs.filter(
          l =>
            (l.sentTo || '').toLowerCase().includes(needle) ||
            (l.recipientName || '').toLowerCase().includes(needle) ||
            (l.subject || '').toLowerCase().includes(needle) ||
            (l.behaviorContext || '').toLowerCase().includes(needle)
        )
      : filteredLogs;

    return [...result].sort(
      (a, b) => (toDate(b.sentAt)?.getTime() ?? 0) - (toDate(a.sentAt)?.getTime() ?? 0)
    );
  }, [filteredLogs, search]);

  // Filter campaigns sidebar by search term
  const displayedCampaigns = React.useMemo(() => {
    if (!campaignSearch.trim()) return allCampaigns;
    const q = campaignSearch.toLowerCase();
    return allCampaigns.filter(
      c =>
        c.subject.toLowerCase().includes(q) ||
        (resolveSegmentMeta(c.segment).label).toLowerCase().includes(q)
    );
  }, [allCampaigns, campaignSearch]);

  return (
    <div className="flex flex-col gap-4">
      {/* SCOPE & FILTER CONTROLS BAR */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shadow-sm">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Analytics Filters
              </span>
              {isFiltered ? (
                <Badge variant="outline" className="text-[10px] font-mono border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/30">
                  Filtered ({filteredLogs.length} of {logs.length} sends)
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  All-Time Overview ({logs.length} sends)
                </Badge>
              )}
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/40 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to All-Time
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Filter 1: Campaign Selector */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">
                Target Campaign
              </label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">
                    <span className="font-semibold">All Campaigns (All-Time)</span>
                  </SelectItem>
                  {allCampaigns.map(c => (
                    <SelectItem key={c.key} value={c.key}>
                      <span className="truncate block max-w-[280px]">
                        {c.subject} ({c.sent} sent · {c.openRate.toFixed(0)}%)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Automation Track */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">
                Automation Track
              </label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks & Categories</SelectItem>
                  {availableTracks.map(t => (
                    <SelectItem key={t} value={t}>
                      {resolveSegmentMeta(t).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Timeframe */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">
                Timeframe
              </label>
              <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Delivery Status */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">
                Delivery Status
              </label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="opened">Opened Only</SelectItem>
                  <SelectItem value="unopened">Delivered Unopened Only</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIVE SCOPE HEADER */}
      {selectedCampaign ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/30 bg-orange-50/40 dark:bg-orange-950/20 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-orange-600 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Campaign: &quot;{selectedCampaign.subject}&quot;
                </span>
                {selectedCampaign.segment && (
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700">
                    {resolveSegmentMeta(selectedCampaign.segment).label}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Showing exact analytics for this campaign · {scopedTotals.sent} emails delivered · {scopedTotals.openRate.toFixed(1)}% open rate
                {selectedCampaign.lastSentAt && ` · Last sent ${format(selectedCampaign.lastSentAt, 'MMM d, yyyy h:mm a')}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedKey('all')}
            className="h-7 text-xs gap-1 cursor-pointer"
          >
            Switch to All-Time
          </Button>
        </div>
      ) : selectedTrack !== 'all' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-50/40 dark:bg-sky-950/20 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-sky-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Track Filter: {resolveSegmentMeta(selectedTrack).label}
              </span>
              <p className="text-[11px] text-muted-foreground">
                Showing analytics across {filteredLogs.length} sends belonging to this track.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTrack('all')}
            className="h-7 text-xs gap-1 cursor-pointer"
          >
            Show All Tracks
          </Button>
        </div>
      ) : null}

      {/* TOP STAT CARDS (Calculated for Active Scope) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={selectedCampaign ? 'Campaign Delivered' : 'Total Delivered'}
          value={isLoading ? '—' : scopedTotals.sent}
          sub={isFiltered ? `Filtered from ${logs.length} all-time` : 'All-time sent'}
          icon={Mail}
          highlight={isFiltered}
        />
        <StatCard
          label={selectedCampaign ? 'Campaign Opened' : 'Total Opened'}
          value={isLoading ? '—' : scopedTotals.opened}
          sub={isLoading ? undefined : `${scopedTotals.openRate.toFixed(1)}% open rate`}
          icon={Eye}
          highlight={isFiltered}
        />
        <StatCard
          label="Failed"
          value={isLoading ? '—' : scopedTotals.failed}
          sub={scopedTotals.failed > 0 ? 'Delivery issues' : 'Clean delivery'}
          icon={XCircle}
        />
        <StatCard
          label="Unsubscribed"
          value={isLoading ? '—' : scopedTotals.unsubscribed}
          sub="Opt-outs recorded"
          icon={BanIcon}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Opens are counted securely via tracking pixels. Gmail caches proxy images so repeat reads by the same merchant may not trigger new pings, and readers with remote images disabled are not counted. Open rates represent a guaranteed floor.
        </p>
      </div>

      {/* SEGMENT OPEN RATES & ENGAGEMENT DEPTH */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedCampaign ? 'Campaign Segment Breakdown' : 'Open Rate by Segment'}
            </CardTitle>
            <CardDescription className="text-xs">
              Open rates and response counts for targeted merchant segments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {segmentPerf.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sends match the current filter.</p>
            ) : (
              segmentPerf.map(row => (
                <div key={row.key} className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', TONE_CLASSES[row.tone as keyof typeof TONE_CLASSES] || 'border-border text-muted-foreground')}
                    >
                      {row.label}
                    </Badge>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {row.opened}/{row.sent} opened
                      {row.unsub > 0 ? ` · ${row.unsub} unsubscribed` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, row.openRate)}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums text-emerald-600">
                      {row.openRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Deeply They Engaged</CardTitle>
            <CardDescription className="text-xs">
              Opens breakdown for the active selection. 3+ opens indicates repeated visits and high interest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {engagement.total === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sends match the current filter.</p>
            ) : (
              <div className="space-y-2.5">
                {(
                  [
                    ['Never opened', engagement.none, 'bg-muted-foreground/40'],
                    ['Opened once', engagement.once, 'bg-sky-500'],
                    ['Opened 2–3 times', engagement.few, 'bg-emerald-500'],
                    ['Opened 4+ times', engagement.many, 'bg-emerald-600'],
                  ] as const
                ).map(([label, count, colour]) => (
                  <div key={label} className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs">{label}</span>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                        {count}
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({Math.round((count / engagement.total) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', colour)}
                        style={{ width: `${(count / engagement.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WORTH A SECOND ATTEMPT (FOLLOW-UP CANDIDATES) */}
      {needsFollowUp.length > 0 && (
        <Card className="min-w-0 border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {needsFollowUp.length} worth a second attempt
                </CardTitle>
                <CardDescription className="text-xs">
                  Delivered more than {FOLLOW_UP_AFTER_DAYS} days ago and unopened. Unsubscribes are excluded.
                </CardDescription>
              </div>
              {onFollowUp && (
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5 cursor-pointer"
                  onClick={() =>
                    onFollowUp(
                      needsFollowUp.map(l => (l.sentTo || '').trim()).filter(Boolean)
                    )
                  }
                >
                  <Mail className="h-3.5 w-3.5" />
                  Select all {needsFollowUp.length}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {needsFollowUp.slice(0, 40).map(log => (
                <span
                  key={log.id}
                  title={log.subject}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {log.recipientName || log.sentTo}
                </span>
              ))}
              {needsFollowUp.length > 40 && (
                <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  +{needsFollowUp.length - 40} more
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CAMPAIGN LIST SIDEBAR & RECIPIENT LOGS TABLE */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Left Column: Campaigns List */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Campaigns</CardTitle>
              <CardDescription className="text-xs">
                Click any campaign to view its dedicated analytics.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 cursor-pointer" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={campaignSearch}
                onChange={e => setCampaignSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <ScrollArea className="h-[460px]">
              <div className="space-y-2 pr-2">
                <button
                  type="button"
                  onClick={() => setSelectedKey('all')}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors cursor-pointer',
                    selectedKey === 'all'
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 ring-1 ring-orange-500/40'
                      : 'hover:bg-muted/50 border-border'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">All sends (All-Time)</p>
                    {selectedKey === 'all' && (
                      <Badge variant="outline" className="text-[9px] border-orange-400 text-orange-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {logs.length} email{logs.length === 1 ? '' : 's'} across {allCampaigns.length} campaign{allCampaigns.length === 1 ? '' : 's'}
                  </p>
                </button>

                {displayedCampaigns.length === 0 && !isLoading && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No campaigns found.
                  </p>
                )}

                {displayedCampaigns.map(campaign => {
                  const isSelected = selectedKey === campaign.key;
                  return (
                    <button
                      key={campaign.key}
                      type="button"
                      onClick={() => setSelectedKey(campaign.key)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors cursor-pointer',
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 ring-1 ring-orange-500/40 shadow-sm'
                          : 'hover:bg-muted/50 border-border'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-sm font-semibold flex-1">{campaign.subject}</p>
                        {isSelected && (
                          <Badge variant="outline" className="text-[9px] border-orange-400 text-orange-600 shrink-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {campaign.segment && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px]',
                              TONE_CLASSES[resolveSegmentMeta(campaign.segment).tone as keyof typeof TONE_CLASSES] || 'border-border text-muted-foreground'
                            )}
                          >
                            {resolveSegmentMeta(campaign.segment).label}
                          </Badge>
                        )}
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {campaign.sent} sent · {campaign.opened} opened
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, campaign.openRate)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] font-bold tabular-nums text-emerald-600">
                          {campaign.openRate.toFixed(0)}%
                        </span>
                      </div>
                      {campaign.lastSentAt && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {format(campaign.lastSentAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column: Recipient Delivery Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="break-words text-base flex items-center gap-2">
                  {selectedCampaign ? (
                    <>
                      <span>{selectedCampaign.subject}</span>
                      <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 font-mono">
                        {rows.length} recipients
                      </Badge>
                    </>
                  ) : (
                    <>
                      <span>Recipient Delivery Logs</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {rows.length} rows
                      </Badge>
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedCampaign
                    ? 'Showing all merchant recipients who were dispatched this campaign.'
                    : isFiltered
                    ? `Showing ${rows.length} recipients matching current filters.`
                    : 'Click any row to inspect the full email body as delivered.'}
                </CardDescription>
              </div>
              <div className="relative w-full max-w-[240px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search recipient or store…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[460px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="pl-4">Recipient</TableHead>
                    <TableHead className="hidden lg:table-cell">Why they were mailed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                    <TableHead className="pr-4 text-right">Opens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Loading delivery records…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        No sends match the selected campaign and filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(log => {
                      const sentAt = toDate(log.sentAt);
                      const openedAt = toDate(log.openedAt);
                      const opened = wasOpened(log);
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setViewLog(log)}
                        >
                          <TableCell className="max-w-[220px] pl-4">
                            <p className="break-words text-sm font-medium">{log.recipientName || '—'}</p>
                            <p className="break-all text-[11px] text-muted-foreground">{log.sentTo}</p>
                            {log.unsubscribed && (
                              <Badge
                                variant="outline"
                                className="mt-1 gap-1 border-destructive/30 text-[9px] font-bold uppercase text-destructive"
                              >
                                <BanIcon className="h-2.5 w-2.5" />
                                Unsubscribed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden max-w-[220px] lg:table-cell">
                            <p className="truncate text-[11px] text-muted-foreground">
                              {log.behaviorContext || '—'}
                            </p>
                            {log.segment && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-[9px] border-slate-200 dark:border-slate-800 text-muted-foreground"
                              >
                                {resolveSegmentMeta(log.segment).label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.status === 'failed' ? (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-[10px] font-bold uppercase"
                                title={log.error}
                              >
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            ) : opened ? (
                              <Badge className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold uppercase text-emerald-600 hover:bg-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" />
                                Opened
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px] font-bold uppercase"
                              >
                                <Clock className="h-3 w-3" />
                                Delivered
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-[11px] tabular-nums">
                              {sentAt ? format(sentAt, 'MMM d, h:mm a') : '—'}
                            </p>
                            {openedAt && (
                              <p className="text-[11px] font-semibold tabular-nums text-emerald-600">
                                opened {format(openedAt, 'MMM d, h:mm a')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <span className="text-sm font-bold tabular-nums">
                              {log.openCount ?? 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ARCHIVED EMAIL PREVIEW DIALOG */}
      <Dialog open={!!viewLog} onOpenChange={open => !open && setViewLog(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {viewLog?.subject}
            </DialogTitle>
            <DialogDescription>
              Sent to {viewLog?.recipientName} ({viewLog?.sentTo})
              {viewLog?.behaviorContext ? ` · ${viewLog.behaviorContext}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex-1 overflow-hidden rounded-md border bg-white">
            {viewLog?.html ? (
              <iframe
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={viewLog.html}
                title="Sent email"
                className="h-[60vh] w-full border-0 bg-white"
              />
            ) : (
              <p className="py-10 text-center italic text-muted-foreground">
                No copy of this email was stored.
              </p>
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setViewLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
