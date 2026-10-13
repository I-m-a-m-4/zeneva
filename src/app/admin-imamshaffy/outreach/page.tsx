'use client';

import * as React from 'react';
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  RefreshCw,
  Search,
  Mail,
  Check,
  Clock,
  Eye,
  AlertCircle,
  Loader2,
  Send,
  Play,
  CheckCircle2,
  Sparkles,
  Calendar,
  Activity,
  History,
  TrendingUp,
  UserCheck,
  Award,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { withFirestoreRetry } from '@/firebase/retry';
import type { UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import type { AutomationTrackId, AutomationTrackMeta } from '@/lib/server/weekly-performance-runner';
import CampaignResults from '@/components/admin/email-marketing/campaign-results';

const LOG_LIMIT = 1000;

function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function safeFormatTime(val: any): string {
  if (!val) return 'Never';
  try {
    const date = val.toDate ? val.toDate() : (val.seconds ? new Date(val.seconds * 1000) : new Date(val));
    if (Number.isNaN(date.getTime())) return '';
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
}

const TRACK_ICONS: Record<AutomationTrackId, any> = {
  weekly_performance: TrendingUp,
  win_back: UserCheck,
  cheer_on: Award,
  onboarding: Zap,
};

export default function OutreachPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading Strategic Outreach...
        </div>
      }
    >
      <StrategicOutreachConsole />
    </React.Suspense>
  );
}

function StrategicOutreachConsole() {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<'automation' | 'campaigns' | 'history'>('automation');
  const [selectedPreviewTrack, setSelectedPreviewTrack] = React.useState<AutomationTrackId>('weekly_performance');
  const [selectedCampaignTrack, setSelectedCampaignTrack] = React.useState<string | null>(null);

  // Automation Tracks State
  const [isAutomationLoading, setIsAutomationLoading] = React.useState(true);
  const [togglingTrack, setTogglingTrack] = React.useState<AutomationTrackId | null>(null);
  const [tracks, setTracks] = React.useState<Record<AutomationTrackId, AutomationTrackMeta>>({
    weekly_performance: {
      id: 'weekly_performance',
      name: 'Weekly Performance Digest',
      badge: 'Sales & Growth',
      description: 'Personalized sales digest with revenue, % growth, units sold, top products, and strategic advice.',
      schedule: 'Every Monday at 08:00 UTC',
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    win_back: {
      id: 'win_back',
      name: 'Win-Back / Re-engagement',
      badge: 'Retention',
      description: 'Detects merchants whose activity slowed or who haven’t returned, cheering them on and offering help.',
      schedule: 'Weekly check (Wednesdays at 10:00 UTC)',
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    cheer_on: {
      id: 'cheer_on',
      name: 'Cheer-On / Champions',
      badge: 'Loyalty & Milestones',
      description: 'Celebrates high-performing merchants and active sellers with a personal thank you and cheer from the founder.',
      schedule: 'Bi-weekly (Fridays at 14:00 UTC)',
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
    onboarding: {
      id: 'onboarding',
      name: 'Stalled Onboarding Nudge',
      badge: 'Activation',
      description: 'Encourages new signups who haven’t rung up their first sale after 3 days, guiding them to start selling.',
      schedule: 'Twice weekly (Tuesdays & Thursdays)',
      enabled: true,
      lastRunAt: null,
      totalSent: 0,
    },
  });

  const [recentRuns, setRecentRuns] = React.useState<any[]>([]);
  const [previewHtml, setPreviewHtml] = React.useState<string>('');
  const [previewSubject, setPreviewSubject] = React.useState<string>('');
  const [testEmail, setTestEmail] = React.useState('');
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [runningTrack, setRunningTrack] = React.useState<AutomationTrackId | null>(null);
  const [confirmRunTrack, setConfirmRunTrack] = React.useState<AutomationTrackId | null>(null);
  const [runBatchResult, setRunBatchResult] = React.useState<{
    sentCount: number;
    skippedCount: number;
    failedCount: number;
  } | null>(null);

  // Merchant Logs State
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [emailTopicFilter, setEmailTopicFilter] = React.useState<string>('all');
  const [emailStatusFilter, setEmailStatusFilter] = React.useState<string>('all');
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);

  // Auto-populate test email with current user
  React.useEffect(() => {
    if (authUser?.email && !testEmail) {
      setTestEmail(authUser.email);
    }
  }, [authUser?.email, testEmail]);

  // Auth helper
  const getAdminToken = React.useCallback(async () => {
    if (!authUser) return null;
    return await authUser.getIdToken();
  }, [authUser]);

  // Load Automation Data
  const loadAutomationData = React.useCallback(async () => {
    setIsAutomationLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;

      const res = await fetch('/api/admin/weekly-performance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load automations');
      const data = await res.json();
      if (data.config?.tracks) {
        setTracks(data.config.tracks);
      }
      if (data.recentRuns) {
        setRecentRuns(data.recentRuns);
      }
      if (data.preview) {
        setPreviewHtml(data.preview.html);
        setPreviewSubject(data.preview.subject);
      }
    } catch (err: any) {
      console.error('Failed to load automations data:', err);
    } finally {
      setIsAutomationLoading(false);
    }
  }, [getAdminToken]);

  // Switch Preview Track
  const handleSelectPreviewTrack = async (trackId: AutomationTrackId) => {
    setSelectedPreviewTrack(trackId);
    try {
      const token = await getAdminToken();
      if (!token) return;

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'preview', trackId }),
      });
      const data = await res.json();
      if (data.preview) {
        setPreviewHtml(data.preview.html);
        setPreviewSubject(data.preview.subject);
      }
    } catch (err) {
      console.error('Error switching preview:', err);
    }
  };

  // Toggle Track On/Off
  const handleToggleTrack = async (trackId: AutomationTrackId, enabled: boolean) => {
    setTogglingTrack(trackId);
    try {
      const token = await getAdminToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'toggle', trackId, enabled }),
      });

      if (!res.ok) throw new Error('Failed to update automation track');
      const data = await res.json();
      if (data.config?.tracks) setTracks(data.config.tracks);

      toast({
        title: enabled ? `${tracks[trackId]?.name} Activated` : `${tracks[trackId]?.name} Paused`,
        description: enabled
          ? `Dispatches automatically according to schedule: ${tracks[trackId]?.schedule}`
          : 'Automation track has been safely paused.',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not toggle automation track.',
        variant: 'destructive',
      });
    } finally {
      setTogglingTrack(null);
    }
  };

  // Send Test Email to Gmail
  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid Gmail or destination address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const token = await getAdminToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'send_test',
          trackId: selectedPreviewTrack,
          email: testEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to dispatch test');
      }

      toast({
        title: 'Test Email Delivered!',
        description: `Dispatched preview for "${tracks[selectedPreviewTrack]?.name}" to ${testEmail}. Check your inbox!`,
      });
    } catch (err: any) {
      toast({
        title: 'Send Failed',
        description: err.message || 'Could not send test email via Resend.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Open Custom Modal for Track Batch Run
  const handleOpenRunModal = (trackId: AutomationTrackId) => {
    setConfirmRunTrack(trackId);
    setRunBatchResult(null);
  };

  // Execute Batch Run from Modal
  const executeRunTrackBatch = async () => {
    if (!confirmRunTrack) return;
    const trackId = confirmRunTrack;
    const trackName = tracks[trackId]?.name || trackId;

    setRunningTrack(trackId);
    try {
      const token = await getAdminToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'run_track', trackId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Batch dispatch failed');
      }

      if (data.config?.tracks) setTracks(data.config.tracks);
      if (data.recentRuns) setRecentRuns(data.recentRuns);

      setRunBatchResult({
        sentCount: data.result?.sentCount || 0,
        skippedCount: data.result?.skippedCount || 0,
        failedCount: data.result?.failedCount || 0,
      });

      toast({
        title: `${trackName} Completed`,
        description: `Delivered ${data.result?.sentCount || 0} emails (${data.result?.skippedCount || 0} skipped, ${data.result?.failedCount || 0} failed).`,
      });
    } catch (err: any) {
      toast({
        title: 'Batch Error',
        description: err.message || 'Failed to execute batch run.',
        variant: 'destructive',
      });
    } finally {
      setRunningTrack(null);
    }
  };

  // Load Merchant Audience & Logs
  const loadUsers = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoadingUsers(true);
    try {
      const snap = await withFirestoreRetry(
        () => getDocs(query(collection(firestore, 'users'), orderBy('lastSeen', 'desc'))),
        { label: 'Email marketing audience' },
      );
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (error) {
      console.error('Failed to load audience', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [firestore]);

  const loadLogs = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoadingLogs(true);
    try {
      const snap = await withFirestoreRetry(
        () =>
          getDocs(
            query(
              collection(firestore, 'follow_up_logs'),
              orderBy('sentAt', 'desc'),
              fsLimit(LOG_LIMIT),
            ),
          ),
        { label: 'Campaign results' },
      );
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (error) {
      console.error('Failed to load campaign logs', error);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    loadAutomationData();
  }, [loadAutomationData]);

  React.useEffect(() => {
    if (activeTab === 'history' || activeTab === 'campaigns') {
      loadUsers();
      loadLogs();
    }
  }, [activeTab, loadUsers, loadLogs]);

  const uniqueSubjects = React.useMemo(() => {
    const subjects = new Set<string>();
    logs.forEach((l) => {
      if (l.subject) subjects.add(l.subject);
    });
    return Array.from(subjects);
  }, [logs]);

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);

      let matchesFilter = true;
      const userSpecificLogs = logs.filter(
        (l) => l.sentTo && u.email && l.sentTo.toLowerCase() === u.email.toLowerCase(),
      );

      if (emailTopicFilter && emailTopicFilter !== 'all') {
        const matchingLogs = userSpecificLogs.filter((l) => l.subject === emailTopicFilter);
        matchesFilter = matchingLogs.length > 0;

        if (matchesFilter && emailStatusFilter !== 'all') {
          const hasOpened = matchingLogs.some(
            (l) => l.status === 'opened' || (l.openCount && l.openCount > 0) || l.openedAt?.seconds,
          );
          if (emailStatusFilter === 'opened') {
            matchesFilter = hasOpened;
          } else if (emailStatusFilter === 'unopened') {
            matchesFilter = !hasOpened;
          }
        }
      } else if (emailStatusFilter !== 'all') {
        const hasOpenedAny = userSpecificLogs.some(
          (l) => l.status === 'opened' || (l.openCount && l.openCount > 0) || l.openedAt?.seconds,
        );
        if (emailStatusFilter === 'opened') {
          matchesFilter = hasOpenedAny && userSpecificLogs.length > 0;
        } else if (emailStatusFilter === 'unopened') {
          matchesFilter = !hasOpenedAny && userSpecificLogs.length > 0;
        }
      }
      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, emailTopicFilter, emailStatusFilter, logs]);

  const userLogs = React.useMemo(() => {
    if (!selectedUser) return [];
    return logs.filter(
      (l) =>
        (l.sentTo && selectedUser.email && l.sentTo.toLowerCase() === selectedUser.email.toLowerCase()) ||
        (l.recipientName && selectedUser.name && l.recipientName.toLowerCase() === selectedUser.name.toLowerCase()),
    );
  }, [logs, selectedUser]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Email Marketing & Automations</h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-0.5 border-orange-500/40 text-orange-600 bg-orange-50 dark:bg-orange-950/20"
            >
              Zeneva Growth Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automate weekly sales performance, re-engagement win-backs, milestone cheers, and onboarding nudges.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="grid grid-cols-3 w-full sm:w-[500px]">
            <TabsTrigger value="automation" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
              <Sparkles className="h-3.5 w-3.5" />
              Automations Center
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
              <BarChart3 className="h-3.5 w-3.5 text-orange-600" />
              Campaign Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
              <Mail className="h-3.5 w-3.5" />
              Merchant Logs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* TAB 1: AUTOMATIONS CONTROL CENTER */}
      {activeTab === 'automation' && (
        <div className="flex flex-col gap-6 w-full">
          {/* 4 Automation Tracks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {(Object.keys(tracks) as AutomationTrackId[]).map((trackId) => {
              const track = tracks[trackId];
              const Icon = TRACK_ICONS[trackId] || Sparkles;
              const isToggling = togglingTrack === trackId;
              const isRunning = runningTrack === trackId;
              const isSelectedPreview = selectedPreviewTrack === trackId;

              return (
                <Card
                  key={trackId}
                  className={cn(
                    'border transition-all shadow-sm flex flex-col justify-between',
                    isSelectedPreview
                      ? 'border-orange-500 ring-1 ring-orange-500/40 bg-orange-50/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300',
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0">
                        {track.badge}
                      </Badge>
                      <Switch
                        checked={track.enabled}
                        disabled={isToggling}
                        className="cursor-pointer"
                        onCheckedChange={(checked) => handleToggleTrack(trackId, checked)}
                      />
                    </div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-orange-600 shrink-0" />
                      <span className="truncate">{track.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed min-h-[36px]">
                      {track.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1.5 text-[11px] pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={cn('font-semibold', track.enabled ? 'text-emerald-600' : 'text-amber-600')}>
                          {track.enabled ? 'Active / Automated' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Schedule:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {track.schedule}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Delivered:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {track.totalSent} emails
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Last Run:</span>
                        <span>{safeFormatTime(track.lastRunAt)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant={isSelectedPreview ? 'default' : 'outline'}
                        className="h-7 text-xs font-medium gap-1 cursor-pointer"
                        onClick={() => handleSelectPreviewTrack(trackId)}
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isRunning}
                        className="h-7 text-xs font-semibold gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800"
                        onClick={() => handleOpenRunModal(trackId)}
                      >
                        {isRunning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 text-orange-600 fill-orange-600" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions Bar: Send Test directly to Gmail */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-orange-50/40 via-white to-amber-50/30 dark:from-slate-950 dark:to-slate-900">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Test Delivery to Gmail
                    <Badge variant="outline" className="text-[10px] font-mono border-orange-300 text-orange-700">
                      Active Preview: {tracks[selectedPreviewTrack]?.name}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Send this exact template and founder copy to your inbox via Resend to verify fonts, layout, and rendering.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Enter your Gmail (you@gmail.com)"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-9 text-xs w-full sm:w-[260px] bg-white dark:bg-slate-900"
                />
                <Button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmail}
                  className="h-9 text-xs font-semibold shrink-0 gap-1.5 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview & Execution Logs Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
            {/* Live Template Preview (7 cols) */}
            <div className="xl:col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-orange-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Live Email Template Preview &middot;{' '}
                    <span className="text-orange-600 font-semibold">{tracks[selectedPreviewTrack]?.name}</span>
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 cursor-pointer"
                  onClick={loadAutomationData}
                  disabled={isAutomationLoading}
                >
                  <RefreshCw className={cn('h-3 w-3', isAutomationLoading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              <div className="bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40 rounded-md px-3 py-1.5 text-[11px] text-orange-800 dark:text-orange-300 flex items-center gap-2">
                <span>💡 <strong>Dynamic Tokens:</strong> Store names (<code>{"{{businessName}}"}</code>), owner names, sales figures, and telemetry are 100% dynamically injected from each merchant&apos;s live Firestore record. The preview below uses a sample profile to demonstrate formatting.</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 shadow-sm">
                <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-t border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>From: Imam Shaffy &lt;hello@zeneva.space&gt;</span>
                  <span className="truncate max-w-[280px]">Subject: {previewSubject || 'Email Subject'}</span>
                </div>
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    title="Marketing Email Preview"
                    className="w-full h-[680px] border-0 bg-white rounded-b-md shadow-inner"
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-orange-600" />
                    Rendering Zeneva email template preview...
                  </div>
                )}
              </div>
            </div>

            {/* Execution History (5 cols) */}
            <div className="xl:col-span-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Automation Run History</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {recentRuns.length} runs recorded
                </span>
              </div>

              <Card className="border border-slate-200 dark:border-slate-800 flex-1 shadow-sm">
                <ScrollArea className="h-[680px]">
                  <div className="p-3 space-y-3">
                    {recentRuns.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        No automated batch runs recorded yet.
                        <br />
                        Runs will log here as scheduled crons and manual dispatches execute.
                      </div>
                    ) : (
                      recentRuns.map((run) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0',
                                  run.trigger === 'cron'
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
                                )}
                              >
                                {run.trigger}
                              </Badge>
                              <span className="truncate max-w-[160px]">
                                {tracks[run.trackId as AutomationTrackId]?.name || run.trackId || 'Automation'}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-semibold',
                                run.status === 'completed'
                                  ? 'text-emerald-600 border-emerald-300'
                                  : run.status === 'running'
                                  ? 'text-sky-600 border-sky-300 animate-pulse'
                                  : 'text-rose-600 border-rose-300',
                              )}
                            >
                              {run.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded text-center text-[11px]">
                            <div>
                              <div className="text-muted-foreground text-[10px]">Delivered</div>
                              <div className="font-bold text-emerald-600">{run.sentCount}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[10px]">Skipped</div>
                              <div className="font-medium text-slate-600">{run.skippedCount}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[10px]">Failed</div>
                              <div className={cn('font-medium', run.failedCount > 0 ? 'text-rose-600' : 'text-slate-400')}>
                                {run.failedCount}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <span>
                              {safeFormatTime(run.startedAt)}{' '}
                              {run.durationMs ? `• ${(run.durationMs / 1000).toFixed(1)}s` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCampaignTrack(run.trackId || 'weekly_performance');
                                setActiveTab('campaigns');
                                loadLogs();
                              }}
                              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1 cursor-pointer"
                            >
                              View Delivered &rarr;
                            </button>
                          </div>

                          {run.error && (
                            <div className="text-[10px] text-rose-500 font-mono bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded">
                              {run.error}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN DELIVERY LOGS & OPEN ANALYTICS */}
      {activeTab === 'campaigns' && (
        <div className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                Campaign Delivery Logs & Analytics
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review every merchant who received campaign emails, verify whether they opened them, and filter analytics down to specific campaigns or all-time.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer"
              onClick={loadLogs}
              disabled={isLoadingLogs}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoadingLogs && 'animate-spin')} />
              Refresh Logs
            </Button>
          </div>

          <CampaignResults
            logs={logs}
            isLoading={isLoadingLogs}
            onRefresh={loadLogs}
            initialTrack={selectedCampaignTrack}
          />
        </div>
      )}

      {/* TAB 3: AUDIENCE & MERCHANT CRM LOGS */}
      {activeTab === 'history' && (
        <div className="h-[calc(100vh_-_14rem)] flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6">
              {/* Left Pane: User List */}
              <div
                className={cn(
                  'col-span-1 h-full min-h-0 flex-col',
                  selectedUser ? 'hidden md:flex' : 'flex',
                )}
              >
                <div className="mb-2 flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search merchants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 text-sm pl-9"
                    />
                  </div>
                  <Select value={emailTopicFilter} onValueChange={setEmailTopicFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Filter by sent email..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All emails</SelectItem>
                      {uniqueSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="opened">Opened only</SelectItem>
                      <SelectItem value="unopened">Unopened only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-muted-foreground px-1 py-1 font-medium flex justify-between items-center">
                  <span>
                    Merchants ({filteredUsers.length} of {users.length})
                  </span>
                  {(emailTopicFilter !== 'all' || emailStatusFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setEmailTopicFilter('all');
                        setEmailStatusFilter('all');
                      }}
                      className="text-primary hover:underline"
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                <ScrollArea className="flex-1 rounded-md border">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading audience...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No merchants match your filter
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredUsers.map((u) => {
                        const isSelected = selectedUser?.id === u.id;
                        const userLogCount = logs.filter(
                          (l) => l.sentTo && u.email && l.sentTo.toLowerCase() === u.email.toLowerCase(),
                        ).length;

                        return (
                          <button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className={cn(
                              'w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/50',
                              isSelected && 'bg-muted',
                            )}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                              {initialsOf(u.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">
                                  {u.name || 'Unnamed Merchant'}
                                </span>
                                {userLogCount > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                    {userLogCount} {userLogCount === 1 ? 'email' : 'emails'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                              {u.businessName && (
                                <div className="text-[11px] text-muted-foreground/80 truncate">
                                  {u.businessName}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right Pane: User Campaign History */}
              <div
                className={cn(
                  'col-span-1 md:col-span-2 lg:col-span-3 h-full min-h-0 flex-col',
                  !selectedUser ? 'hidden md:flex' : 'flex',
                )}
              >
                {!selectedUser ? (
                  <div className="h-full flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Select a merchant to view their outreach history</p>
                    <p className="text-xs mt-1">
                      View all sent emails, read receipts, and delivery logs.
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="flex items-center justify-between pb-3 border-b mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground"
                        >
                          &larr; Back
                        </button>
                        <div>
                          <h2 className="text-sm font-semibold flex items-center gap-2">
                            {selectedUser.name || 'Unnamed Merchant'}
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {selectedUser.email}
                            </Badge>
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {userLogs.length} total outreach {userLogs.length === 1 ? 'email' : 'emails'} delivered
                          </p>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 rounded-md border p-4 bg-muted/20">
                      <div className="space-y-4">
                        {isLoadingLogs ? (
                          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Loading email history...
                          </div>
                        ) : userLogs.length === 0 ? (
                          <div className="p-8 text-center text-sm text-muted-foreground">
                            No emails recorded for this merchant yet.
                          </div>
                        ) : (
                          userLogs.map((log) => {
                            const isOpened =
                              log.status === 'opened' || (log.openCount && log.openCount > 0) || log.openedAt?.seconds;
                            const isFailed = log.status === 'failed';

                            return (
                              <div
                                key={log.id}
                                className="bg-card border rounded-lg p-4 shadow-xs flex flex-col gap-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-sm">{log.subject || 'No Subject'}</span>
                                    <span className="text-xs text-muted-foreground">
                                      From: {log.from || 'hello@zeneva.space'}
                                    </span>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      'shrink-0 text-[9px] uppercase font-bold tracking-wider',
                                      isOpened
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                        : isFailed
                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                    )}
                                  >
                                    {isOpened ? 'Opened' : isFailed ? 'Failed' : 'Sent'}
                                  </Badge>
                                </div>

                                {(log.html || log.message) && (
                                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-md border border-slate-100 dark:border-slate-800 mb-2 w-full overflow-hidden">
                                    {log.html ? (
                                      <iframe
                                        srcDoc={log.html.replace(
                                          /<img[^>]*src="[^"]*\/api\/track\?tid=[^"]*"[^>]*>/gi,
                                          '',
                                        )}
                                        title="Email Preview"
                                        className="w-full h-[550px] border-0 bg-white rounded-sm"
                                      />
                                    ) : (
                                      <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {log.message.replace(
                                          /<img[^>]*src="[^"]*\/api\/track\?tid=[^"]*"[^>]*>/gi,
                                          '',
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Sent {safeFormatTime(log.sentAt)}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isOpened ? (
                                      <>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          {log.openCount > 1 ? `Opened ${log.openCount}x` : 'Seen'}
                                        </span>
                                        {log.openedAt && <span>• {safeFormatTime(log.openedAt)}</span>}
                                      </>
                                    ) : isFailed ? (
                                      <span className="text-rose-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Delivery Failed
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Delivered
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Custom Batch Run Confirmation & Results Modal */}
      <Dialog
        open={!!confirmRunTrack}
        onOpenChange={(open) => {
          if (!open && !runningTrack) {
            setConfirmRunTrack(null);
            setRunBatchResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {confirmRunTrack && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-orange-600 fill-orange-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Execute {tracks[confirmRunTrack]?.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Manual Automation Trigger &middot; {tracks[confirmRunTrack]?.badge}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {runningTrack === confirmRunTrack ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Dispatching Batch via Resend...
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Evaluating merchant behavioral telemetry and sending dynamically personalized emails.
                    </p>
                  </div>
                </div>
              ) : runBatchResult ? (
                <div className="py-4 space-y-4">
                  <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3.5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                        Batch Run Completed!
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Delivered <strong>{runBatchResult.sentCount}</strong> emails successfully.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Delivered</div>
                      <div className="text-base font-bold text-emerald-600">{runBatchResult.sentCount}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Skipped</div>
                      <div className="text-base font-bold text-slate-600">{runBatchResult.skippedCount}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Failed</div>
                      <div className="text-base font-bold text-rose-600">{runBatchResult.failedCount}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 py-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    Are you sure you want to run the{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {tracks[confirmRunTrack]?.name}
                    </strong>{' '}
                    campaign across all qualifying merchants right now?
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Audience Safeguards & Dynamic Personalization:
                    </div>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-muted-foreground leading-relaxed">
                      <li>
                        <strong>Dynamic Data:</strong> Recipient names, store names (<code>{"{{businessName}}"}</code>), sales figures, and telemetry are merged from live Firestore profiles.
                      </li>
                      <li>
                        <strong>Decision-Makers Only:</strong> Cashiers and staff are excluded; only store owners and admins are contacted.
                      </li>
                      <li>
                        <strong>Anti-Fatigue Guard:</strong> Merchants emailed within the cooldown period are automatically skipped.
                      </li>
                      <li>
                        <strong>Opt-Out Protection:</strong> Accounts with marketing opt-out are omitted.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                {runBatchResult ? (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirmRunTrack(null);
                        setRunBatchResult(null);
                      }}
                      className="w-full sm:w-auto text-xs cursor-pointer"
                    >
                      Done
                    </Button>
                    <Button
                      onClick={() => {
                        const targetTrack = confirmRunTrack;
                        setConfirmRunTrack(null);
                        setRunBatchResult(null);
                        setSelectedCampaignTrack(targetTrack);
                        setActiveTab('campaigns');
                        loadLogs();
                      }}
                      className="w-full sm:w-auto text-xs font-semibold gap-1.5 cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Delivered Emails ({runBatchResult.sentCount})
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      disabled={runningTrack === confirmRunTrack}
                      onClick={() => setConfirmRunTrack(null)}
                      className="text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={runningTrack === confirmRunTrack}
                      onClick={executeRunTrackBatch}
                      className="text-xs font-semibold gap-1.5 cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {runningTrack === confirmRunTrack ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Running Batch...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-white" />
                          Confirm & Run Batch
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
