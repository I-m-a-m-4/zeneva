'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Legend,
} from 'recharts';
import {
  Gift,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Share2,
  Award,
  Sparkles,
  ShieldCheck,
  Search,
  Download,
  Copy,
  Check,
  Store,
  Flame,
  Zap,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Crown,
  CheckCircle,
  PackageCheck,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import type { ReferralRecord, BusinessInstance, UserProfile, ReferralPhase } from '@/types';

export type Timeframe = '7d' | '30d' | '90d' | 'all';

interface ReferralAnalyticsTabProps {
  referrals: ReferralRecord[];
  businesses: BusinessInstance[];
  users: UserProfile[];
}

export function ReferralAnalyticsTab({
  referrals = [],
  businesses = [],
  users = [],
}: ReferralAnalyticsTabProps) {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'pending' | 'products_added' | 'signed_up'>('all');
  const [timeframe, setTimeframe] = React.useState<Timeframe>('30d');
  const [selectedReferral, setSelectedReferral] = React.useState<ReferralRecord | null>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<'overview' | 'ledger' | 'champions'>('overview');

  // Business and user lookup maps
  const businessMap = React.useMemo(() => {
    const map = new Map<string, BusinessInstance>();
    businesses.forEach((b) => {
      if (b.id) map.set(b.id, b);
      if (b.referralCode) map.set(b.referralCode.toUpperCase(), b);
    });
    return map;
  }, [businesses]);

  const userMap = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => {
      if (u.id) map.set(u.id, u);
      if (u.businessId && !map.has(u.businessId)) map.set(u.businessId, u);
    });
    return map;
  }, [users]);

  // Unified referral dataset: merges `referrals` collection with any legacy `referredBy` recorded on `businessInstances`
  const unifiedReferrals = React.useMemo(() => {
    const records: ReferralRecord[] = [...referrals];
    const existingReferees = new Set(referrals.map((r) => r.refereeBusinessId).filter(Boolean));

    // Synthesize legacy records if a business has `referredBy` but is not in the collection
    businesses.forEach((biz) => {
      if (biz.referredBy && biz.referredBy.code && !existingReferees.has(biz.id)) {
        const referrerBiz = businessMap.get(biz.referredBy.code.toUpperCase()) ||
          (biz.referredBy.referrerBusinessId ? businessMap.get(biz.referredBy.referrerBusinessId) : undefined);
        const refOwner = userMap.get(biz.id);

        records.push({
          id: `legacy-${biz.id}`,
          referralCode: biz.referredBy.code,
          referrerBusinessId: biz.referredBy.referrerBusinessId || referrerBiz?.id || '',
          referrerOwnerId: referrerBiz?.ownerId || '',
          referrerBusinessName: biz.referredBy.referrerBusinessName || referrerBiz?.name || 'Zeneva Merchant',
          refereeBusinessId: biz.id,
          refereeOwnerId: refOwner?.id || '',
          refereeBusinessName: biz.name || 'Merchant Store',
          status: biz.referredBy.rewardClaimed ? 'completed' : 'pending',
          currentPhase: biz.referredBy.rewardClaimed ? 'first_sale_completed' : 'signed_up',
          completedPhases: biz.referredBy.rewardClaimed ? ['signed_up', 'products_added', 'first_sale_completed'] : ['signed_up'],
          rewardDays: 30,
          qualificationTrigger: biz.referredBy.rewardClaimed ? 'first_sale' : 'code_applied',
          createdAt: biz.referredBy.appliedAt || biz.createdAt,
          completedAt: biz.referredBy.rewardClaimed ? biz.referredBy.appliedAt || biz.updatedAt : undefined,
        });
      }
    });

    return records;
  }, [referrals, businesses, businessMap, userMap]);

  // Aggregate Key Performance Indicators
  const kpiStats = React.useMemo(() => {
    const total = unifiedReferrals.length;
    const completed = unifiedReferrals.filter(
      (r) => r.status === 'completed' || r.currentPhase === 'first_sale_completed'
    );
    const completedCount = completed.length;
    const pendingCount = total - completedCount;
    const conversionRate = total > 0 ? (completedCount / total) * 100 : 0;

    // Phases count
    const phaseSignedUp = unifiedReferrals.filter(
      (r) => r.currentPhase === 'signed_up' && r.status !== 'completed'
    ).length;
    const phaseProductsAdded = unifiedReferrals.filter(
      (r) => r.currentPhase === 'products_added' && r.status !== 'completed'
    ).length;

    // Total reward days granted (30 days to referee + 30 days to referrer = 60 days per completed referral)
    const totalRewardDaysGranted = completedCount * 60;
    // Estimated monetary value: Pro plan is ₦10,000/mo ($10/mo). Each 30-day block = ₦10,000 promotional investment
    const estimatedPromoValue = (totalRewardDaysGranted / 30) * 10000;

    // Unique referrers
    const uniqueReferrers = new Set(unifiedReferrals.map((r) => r.referrerBusinessId).filter(Boolean));
    const uniqueReferrersCount = uniqueReferrers.size;

    // Viral Coefficient (K-factor) = Total referees / Total participating businesses
    const participatingBusinessesCount = businesses.filter(
      (b) => b.referralCode || (b.referralStats && b.referralStats.totalReferred > 0)
    ).length;
    const kFactor = participatingBusinessesCount > 0
      ? total / participatingBusinessesCount
      : uniqueReferrersCount > 0
      ? total / uniqueReferrersCount
      : 0;

    // Active Champions (referrers who have at least 1 completed referral)
    const completedReferrers = new Set(completed.map((r) => r.referrerBusinessId).filter(Boolean));
    const championsCount = completedReferrers.size;

    return {
      total,
      completedCount,
      pendingCount,
      conversionRate,
      phaseSignedUp,
      phaseProductsAdded,
      totalRewardDaysGranted,
      estimatedPromoValue,
      uniqueReferrersCount,
      participatingBusinessesCount,
      kFactor,
      championsCount,
    };
  }, [unifiedReferrals, businesses]);

  // Time-series growth chart data
  const chartData = React.useMemo(() => {
    const now = new Date();
    let startDate: Date;
    if (timeframe === '7d') startDate = subDays(now, 7);
    else if (timeframe === '30d') startDate = subDays(now, 30);
    else if (timeframe === '90d') startDate = subDays(now, 90);
    else startDate = subDays(now, 365); // 1 year for all

    const days = eachDayOfInterval({ start: startDate, end: now });
    const buckets: Record<string, { date: string; newInvites: number; conversions: number }> = {};

    days.forEach((d) => {
      const key = format(d, 'MMM dd');
      buckets[key] = { date: key, newInvites: 0, conversions: 0 };
    });

    unifiedReferrals.forEach((ref) => {
      const cDate = safeToDate(ref.createdAt);
      if (cDate && cDate >= startDate && cDate <= now) {
        const key = format(cDate, 'MMM dd');
        if (buckets[key]) buckets[key].newInvites += 1;
      }

      if (ref.status === 'completed' || ref.currentPhase === 'first_sale_completed') {
        const compDate = safeToDate(ref.completedAt || ref.createdAt);
        if (compDate && compDate >= startDate && compDate <= now) {
          const key = format(compDate, 'MMM dd');
          if (buckets[key]) buckets[key].conversions += 1;
        }
      }
    });

    return Object.values(buckets);
  }, [unifiedReferrals, timeframe]);

  // Champions Leaderboard: group by referrer business
  const champions = React.useMemo(() => {
    const map = new Map<string, {
      businessId: string;
      businessName: string;
      ownerName: string;
      ownerEmail: string;
      referralCode: string;
      totalInvited: number;
      completed: number;
      rewardDays: number;
      industry: string;
    }>();

    // From referral records
    unifiedReferrals.forEach((r) => {
      const bId = r.referrerBusinessId || 'unknown';
      if (!map.has(bId)) {
        const biz = businessMap.get(bId);
        const owner = userMap.get(bId) || userMap.get(r.referrerOwnerId);
        map.set(bId, {
          businessId: bId,
          businessName: r.referrerBusinessName || biz?.name || 'Zeneva Merchant',
          ownerName: owner?.name || 'Store Owner',
          ownerEmail: owner?.email || '',
          referralCode: r.referralCode || (biz?.referralCode && biz.referralCode !== 'ZEN-APP' ? biz.referralCode : 'PENDING'),
          totalInvited: 0,
          completed: 0,
          rewardDays: 0,
          industry: biz?.industry || 'Retail',
        });
      }

      const item = map.get(bId)!;
      item.totalInvited += 1;
      if (r.status === 'completed' || r.currentPhase === 'first_sale_completed') {
        item.completed += 1;
        item.rewardDays += (r.rewardDays || 30);
      }
    });

    // Also include businesses with stored referralStats if not already represented
    businesses.forEach((biz) => {
      if (biz.referralStats && biz.referralStats.totalReferred > 0 && !map.has(biz.id)) {
        const owner = userMap.get(biz.id);
        map.set(biz.id, {
          businessId: biz.id,
          businessName: biz.name || 'Zeneva Merchant',
          ownerName: owner?.name || 'Store Owner',
          ownerEmail: owner?.email || '',
          referralCode: biz.referralCode && biz.referralCode !== 'ZEN-APP' ? biz.referralCode : 'PENDING',
          totalInvited: biz.referralStats.totalReferred,
          completed: biz.referralStats.completedReferrals || 0,
          rewardDays: biz.referralStats.rewardDaysEarned || 0,
          industry: biz.industry || 'Retail',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.completed - a.completed || b.totalInvited - a.totalInvited);
  }, [unifiedReferrals, businesses, businessMap, userMap]);

  // Industry distribution of referrers
  const industryDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    unifiedReferrals.forEach((r) => {
      const biz = businessMap.get(r.referrerBusinessId);
      const industry = biz?.industry || 'Other';
      counts[industry] = (counts[industry] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [unifiedReferrals, businessMap]);

  // Filtered referrals for the audit table
  const filteredReferrals = React.useMemo(() => {
    return unifiedReferrals.filter((r) => {
      // Status & Phase filter
      if (statusFilter === 'completed') {
        if (r.status !== 'completed' && r.currentPhase !== 'first_sale_completed') return false;
      } else if (statusFilter === 'pending') {
        if (r.status === 'completed' || r.currentPhase === 'first_sale_completed') return false;
      } else if (statusFilter === 'products_added') {
        if (r.currentPhase !== 'products_added') return false;
      } else if (statusFilter === 'signed_up') {
        if (r.currentPhase !== 'signed_up') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = r.referralCode?.toLowerCase().includes(query);
        const refNameMatch = r.referrerBusinessName?.toLowerCase().includes(query);
        const refereeNameMatch = r.refereeBusinessName?.toLowerCase().includes(query);
        const refIdMatch = r.referrerBusinessId?.toLowerCase().includes(query);
        const refereeIdMatch = r.refereeBusinessId?.toLowerCase().includes(query);
        if (!codeMatch && !refNameMatch && !refereeNameMatch && !refIdMatch && !refereeIdMatch) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedReferrals, statusFilter, searchQuery]);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      variant: 'default',
      title: 'Referral Code Copied',
      description: `Copied ${code} to clipboard.`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (unifiedReferrals.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no referral records to export.',
      });
      return;
    }

    const headers = [
      'Referral ID',
      'Referral Code',
      'Referrer Business',
      'Referrer ID',
      'Referee Business',
      'Referee ID',
      'Status',
      'Current Phase',
      'Reward Days',
      'Created Date',
      'Completed Date',
    ];

    const rows = unifiedReferrals.map((r) => [
      `"${r.id}"`,
      `"${r.referralCode}"`,
      `"${(r.referrerBusinessName || '').replace(/"/g, '""')}"`,
      `"${r.referrerBusinessId}"`,
      `"${(r.refereeBusinessName || '').replace(/"/g, '""')}"`,
      `"${r.refereeBusinessId}"`,
      `"${r.status}"`,
      `"${r.currentPhase || ''}"`,
      r.rewardDays || 30,
      `"${safeToDate(r.createdAt)?.toISOString() || ''}"`,
      `"${safeToDate(r.completedAt)?.toISOString() || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeneva-referral-intelligence-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      variant: 'default',
      title: 'Report Downloaded',
      description: `Exported ${unifiedReferrals.length} referral records to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: HEADER & HIGH-LEVEL INTEL                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Referral Program & Growth Engine
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] px-2">
                  LIVE VIRAL LOOP
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time tracking of merchant-driven acquisition, qualification phases, unlocked rewards, and virality loops.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background/80 p-0.5 text-xs">
            <button
              onClick={() => setActiveView('overview')}
              className={cn(
                'px-3 py-1.5 rounded-md font-medium transition-colors',
                activeView === 'overview' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('ledger')}
              className={cn(
                'px-3 py-1.5 rounded-md font-medium transition-colors',
                activeView === 'ledger' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Audit Ledger ({unifiedReferrals.length})
            </button>
            <button
              onClick={() => setActiveView('champions')}
              className={cn(
                'px-3 py-1.5 rounded-md font-medium transition-colors',
                activeView === 'champions' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Champions ({champions.length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: EXECUTIVE STAT CARDS                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Referrals */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Share2 className="h-10 w-10 text-primary" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Invites
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-0.5">
              {kpiStats.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            {kpiStats.uniqueReferrersCount} unique merchants inviting
          </CardContent>
        </Card>

        {/* Qualification Rate */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="h-10 w-10 text-emerald-500" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Conversion Rate
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {kpiStats.conversionRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            {kpiStats.completedCount} qualified stores
          </CardContent>
        </Card>

        {/* In-Flight Funnel */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              In-Flight Funnel
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {kpiStats.pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            {kpiStats.phaseProductsAdded} stocked · {kpiStats.phaseSignedUp} onboarding
          </CardContent>
        </Card>

        {/* Free Pro Value */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Award className="h-10 w-10 text-purple-500" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Pro Days Awarded
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {kpiStats.totalRewardDaysGranted.toLocaleString()}d
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            ≈ ₦{Math.round(kpiStats.estimatedPromoValue).toLocaleString()} value delivered
          </CardContent>
        </Card>

        {/* Viral Coefficient */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Zap className="h-10 w-10 text-blue-500" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Viral K-Factor
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {kpiStats.kFactor.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            {kpiStats.kFactor >= 1.0 ? 'Viral Exponential Loop' : 'Organic Compound Loop'}
          </CardContent>
        </Card>

        {/* Active Champions */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Crown className="h-10 w-10 text-amber-500" />
          </div>
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Champions
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {kpiStats.championsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 text-[11px] text-muted-foreground">
            Merchants with $\ge 1$ conversion
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: LIFECYCLE QUALIFICATION FUNNEL                          */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-border/60 bg-card/70 overflow-hidden shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                Referee Lifecycle Progression Funnel
              </CardTitle>
              <CardDescription className="text-xs">
                3-stage qualification pipeline required for a merchant to activate the 30-day free Pro reward.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[11px] font-mono self-start sm:self-auto">
              Drop-off Analytics
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Stage 1 */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">1</span>
                  Code Claimed
                </span>
                <Badge variant="outline" className="text-[10px] bg-background/50">Base: 100%</Badge>
              </div>
              <div>
                <div className="text-3xl font-extrabold font-mono text-foreground">{kpiStats.total}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Stores registered with referral link</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-emerald-500/20 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Completed Stage 1:</span>
                  <span className="font-semibold text-foreground">{kpiStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Drop-off before stocking:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {kpiStats.phaseSignedUp} ({kpiStats.total > 0 ? ((kpiStats.phaseSignedUp / kpiStats.total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold">2</span>
                  Inventory Stocked
                </span>
                <Badge variant="outline" className="text-[10px] bg-background/50">
                  {kpiStats.total > 0 ? (((kpiStats.phaseProductsAdded + kpiStats.completedCount) / kpiStats.total) * 100).toFixed(0) : 0}% of Stage 1
                </Badge>
              </div>
              <div>
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  {kpiStats.phaseProductsAdded + kpiStats.completedCount}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Stores added items into inventory</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-blue-500/20 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Currently awaiting 1st sale:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{kpiStats.phaseProductsAdded}</span>
                </div>
                <div className="flex justify-between">
                  <span>Progression to sale:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {kpiStats.phaseProductsAdded + kpiStats.completedCount > 0
                      ? ((kpiStats.completedCount / (kpiStats.phaseProductsAdded + kpiStats.completedCount)) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold">3</span>
                  First Sale Completed
                </span>
                <Badge variant="outline" className="text-[10px] bg-background/50 border-purple-500/30 text-purple-600 dark:text-purple-300">
                  Reward Unlocked 🎉
                </Badge>
              </div>
              <div>
                <div className="text-3xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
                  {kpiStats.completedCount}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Processed 1st real transaction on POS</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-purple-500/20 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Overall Conversion:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{kpiStats.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro Days Credited:</span>
                  <span className="font-semibold text-foreground">+{kpiStats.totalRewardDaysGranted}d</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4: CHARTS & TRENDS                                          */}
      {/* ------------------------------------------------------------------ */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Velocity Chart */}
          <Card className="lg:col-span-8 border-border/60 bg-card/70 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Referral Acquisition & Conversion Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily incoming referee registrations vs verified sales completions.
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 rounded-lg border bg-background/60 p-0.5 text-xs">
                {(['7d', '30d', '90d', 'all'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      timeframe === tf ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inviteGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                    <ReTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{label}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                              New Invites: {payload[0]?.value}
                            </p>
                            <p className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
                              Conversions: {payload[1]?.value}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="newInvites" name="New Invites" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#inviteGrad)" />
                    <Area type="monotone" dataKey="conversions" name="Completed Conversions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#convGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Side distribution breakdown */}
          <Card className="lg:col-span-4 border-border/60 bg-card/70 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Top Referring Sectors
              </CardTitle>
              <CardDescription className="text-xs">
                Business industries generating the highest volume of referee invites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-2">
              {industryDistribution.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  No industry data recorded yet.
                </div>
              ) : (
                industryDistribution.map((item, idx) => {
                  const pct = kpiStats.total > 0 ? (item.count / kpiStats.total) * 100 : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-mono">#{idx + 1}</span>
                          {item.name}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {item.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-4 text-[11px] text-muted-foreground border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Encourage top sectors with industry-targeted campaigns.</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 5: CHAMPIONS LEADERBOARD                                   */}
      {/* ------------------------------------------------------------------ */}
      {(activeView === 'overview' || activeView === 'champions') && (
        <Card className="border-border/60 bg-card/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Referral Champions Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Top merchant ambassadors driving qualified store onboarding across Zeneva.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {champions.length} Advocates
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] hover:bg-transparent">
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Store & Owner</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead className="text-center">Invited</TableHead>
                    <TableHead className="text-center">Qualified</TableHead>
                    <TableHead className="text-center">Conv. Rate</TableHead>
                    <TableHead className="text-right">Pro Days Earned</TableHead>
                    <TableHead className="text-right">Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {champions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                        No champions recorded yet. Merchants will appear here once they generate referral codes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    champions.slice(0, activeView === 'champions' ? 50 : 5).map((champ, idx) => {
                      const convRate = champ.totalInvited > 0 ? (champ.completed / champ.totalInvited) * 100 : 0;
                      let tier = 'Advocate';
                      let tierBadge = 'bg-slate-500/10 text-slate-600 border-slate-500/20';

                      if (champ.completed >= 10) {
                        tier = 'Diamond Champion';
                        tierBadge = 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400';
                      } else if (champ.completed >= 5) {
                        tier = 'Gold Ambassador';
                        tierBadge = 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400';
                      } else if (champ.completed >= 2) {
                        tier = 'Silver Promoter';
                        tierBadge = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400';
                      }

                      return (
                        <TableRow key={champ.businessId} className="text-xs hover:bg-muted/40">
                          <TableCell className="font-bold font-mono">
                            {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground">{champ.businessName}</div>
                            <div className="text-[11px] text-muted-foreground">{champ.ownerName} {champ.ownerEmail ? `(${champ.ownerEmail})` : ''}</div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleCopyCode(champ.referralCode)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/40 transition-colors"
                            >
                              {champ.referralCode}
                              {copiedCode === champ.referralCode ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-50" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {champ.industry}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">{champ.totalInvited}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {champ.completed}
                          </TableCell>
                          <TableCell className="text-center font-mono">{convRate.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                            +{champ.rewardDays}d
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={cn('text-[10px] font-medium border', tierBadge)}>
                              {tier}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {activeView === 'overview' && champions.length > 5 && (
            <CardFooter className="py-2.5 px-4 border-t border-border/40 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('champions')}
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                View all {champions.length} Champions <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 6: SEARCHABLE AUDIT LEDGER                                  */}
      {/* ------------------------------------------------------------------ */}
      {(activeView === 'overview' || activeView === 'ledger') && (
        <Card className="border-border/60 bg-card/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Referral Audit Ledger & Transactions
                </CardTitle>
                <CardDescription className="text-xs">
                  Granular record of all referral links generated, referee milestone progression, and qualification triggers.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search code, store, owner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 bg-background/80"
                  />
                </div>

                <div className="inline-flex rounded-lg border bg-background/60 p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All ({unifiedReferrals.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Completed ({kpiStats.completedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    In-Flight ({kpiStats.pendingCount})
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] hover:bg-transparent">
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Referrer Store</TableHead>
                    <TableHead>Referee Store</TableHead>
                    <TableHead>Lifecycle Phase</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                        {searchQuery ? `No referrals matched query "${searchQuery}"` : 'No referral records available in this filter.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReferrals.slice(0, activeView === 'ledger' ? 100 : 10).map((ref) => {
                      const isCompleted = ref.status === 'completed' || ref.currentPhase === 'first_sale_completed';
                      const isProductsAdded = ref.currentPhase === 'products_added';
                      const created = safeToDate(ref.createdAt);

                      return (
                        <TableRow key={ref.id} className="text-xs hover:bg-muted/40">
                          <TableCell>
                            <button
                              onClick={() => handleCopyCode(ref.referralCode)}
                              className="inline-flex items-center gap-1 font-mono font-semibold text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/40 transition-colors"
                            >
                              {ref.referralCode}
                              {copiedCode === ref.referralCode ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-50" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{ref.referrerBusinessName || 'Zeneva Partner'}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{ref.referrerBusinessId}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{ref.refereeBusinessName || 'New Store'}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{ref.refereeBusinessId}</div>
                          </TableCell>
                          <TableCell>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                3/3 First Sale Made
                              </span>
                            ) : isProductsAdded ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                                <PackageCheck className="h-3.5 w-3.5 text-blue-500" />
                                2/3 Products Added
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                1/3 Signed Up
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isCompleted ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
                                <Check className="h-2.5 w-2.5" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
                                <Clock className="h-2.5 w-2.5" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {isCompleted ? (
                              <span className="font-semibold text-purple-600 dark:text-purple-400">+{ref.rewardDays || 30}d Pro</span>
                            ) : (
                              <span className="text-muted-foreground">Pending 1st sale</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground font-mono">
                            {created ? format(created, 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedReferral(ref)}
                              className="h-7 text-xs px-2 hover:bg-muted"
                            >
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {activeView === 'overview' && filteredReferrals.length > 10 && (
            <CardFooter className="py-2.5 px-4 border-t border-border/40 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('ledger')}
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                View all {filteredReferrals.length} in full ledger <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 7: DRILL-DOWN INSPECT MODAL                                */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedReferral && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-500" />
                    Referral Record Audit
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-mono',
                      selectedReferral.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    )}
                  >
                    {selectedReferral.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  Transaction ID: <span className="font-mono text-foreground">{selectedReferral.id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Code Pill */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Referral Code Used
                    </span>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {selectedReferral.referralCode}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyCode(selectedReferral.referralCode)}
                    className="h-8 text-xs gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </Button>
                </div>

                {/* Referrer vs Referee Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Referrer Card */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      <Store className="h-3.5 w-3.5" />
                      Referrer (Inviting Merchant)
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{selectedReferral.referrerBusinessName || 'Zeneva Partner'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        ID: {selectedReferral.referrerBusinessId}
                      </div>
                    </div>
                  </div>

                  {/* Referee Card */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 text-xs">
                      <Building2 className="h-3.5 w-3.5" />
                      Referee (New Store)
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{selectedReferral.refereeBusinessName || 'New Store'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        ID: {selectedReferral.refereeBusinessId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qualification Progress */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>Qualification Pipeline Status</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Phase: {selectedReferral.currentPhase || 'signed_up'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-foreground">1. Account Registered with Code</span>
                        <div className="text-[10px] text-muted-foreground">
                          {safeToDate(selectedReferral.createdAt) ? format(safeToDate(selectedReferral.createdAt)!, 'PPpp') : 'Recorded'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {selectedReferral.currentPhase === 'products_added' || selectedReferral.status === 'completed' || selectedReferral.currentPhase === 'first_sale_completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-foreground">2. Initial Inventory Stocked</span>
                        <div className="text-[10px] text-muted-foreground">
                          {selectedReferral.currentPhase === 'products_added' || selectedReferral.status === 'completed'
                            ? 'Referee added products to store'
                            : 'Awaiting referee to add stock'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {selectedReferral.status === 'completed' || selectedReferral.currentPhase === 'first_sale_completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-foreground">3. First Sale Processed on POS</span>
                        <div className="text-[10px] text-muted-foreground">
                          {selectedReferral.completedAt
                            ? `Qualified on ${format(safeToDate(selectedReferral.completedAt)!, 'PPpp')}`
                            : 'Awaiting first completed POS transaction'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reward Audit Banner */}
                <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-purple-700 dark:text-purple-300 block">
                      Promotional Pro Reward
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedReferral.status === 'completed'
                        ? '30 Days of Pro unlocked for both stores'
                        : 'Will unlock 30 Days of Pro once referee makes first sale'}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-300 font-mono font-bold">
                    +30 Days Pro
                  </Badge>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedReferral(null)} className="text-xs">
                  Close Audit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReferralAnalyticsTab;
