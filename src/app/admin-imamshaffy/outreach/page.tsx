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
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';

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

  const [activeTab, setActiveTab] = React.useState<'automation' | 'history'>('automation');

  // Automation State
  const [isAutomationLoading, setIsAutomationLoading] = React.useState(true);
  const [isAutomationToggling, setIsAutomationToggling] = React.useState(false);
  const [automationConfig, setAutomationConfig] = React.useState<{
    enabled: boolean;
    schedule: string;
    lastRunAt: string | null;
    totalSentCount: number;
    lastRunSummary?: any;
  }>({
    enabled: true,
    schedule: 'Mondays at 08:00 UTC',
    lastRunAt: null,
    totalSentCount: 0,
  });
  const [recentRuns, setRecentRuns] = React.useState<any[]>([]);
  const [previewHtml, setPreviewHtml] = React.useState<string>('');
  const [testEmail, setTestEmail] = React.useState('');
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [isRunningBatch, setIsRunningBatch] = React.useState(false);

  // Merchant Logs State
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [emailTopicFilter, setEmailTopicFilter] = React.useState<string>('all');
  const [emailStatusFilter, setEmailStatusFilter] = React.useState<string>('all');
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);

  // Prefill test email with current logged-in user email if available
  React.useEffect(() => {
    if (authUser?.email && !testEmail) {
      setTestEmail(authUser.email);
    }
  }, [authUser?.email, testEmail]);

  // Auth helper for admin endpoints
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
      if (!res.ok) throw new Error('Failed to fetch automation settings');
      const data = await res.json();
      if (data.config) setAutomationConfig(data.config);
      if (data.recentRuns) setRecentRuns(data.recentRuns);
      if (data.sampleHtml) setPreviewHtml(data.sampleHtml);
    } catch (err: any) {
      console.error('Failed to load weekly performance data:', err);
    } finally {
      setIsAutomationLoading(false);
    }
  }, [getAdminToken]);

  // Toggle Automation On/Off
  const handleToggleAutomation = async (enabled: boolean) => {
    setIsAutomationToggling(true);
    try {
      const token = await getAdminToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'toggle', enabled }),
      });

      if (!res.ok) throw new Error('Failed to update automation');
      const data = await res.json();
      if (data.config) setAutomationConfig(data.config);

      toast({
        title: enabled ? 'Automation Activated' : 'Automation Paused',
        description: enabled
          ? 'Weekly digests will dispatch automatically every Monday at 08:00 UTC.'
          : 'Weekly performance emails have been stopped.',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not toggle automation.',
        variant: 'destructive',
      });
    } finally {
      setIsAutomationToggling(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address to send the preview to.',
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
        body: JSON.stringify({ action: 'send_test', email: testEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to dispatch test email');
      }

      toast({
        title: 'Preview Email Dispatched!',
        description: `Check your Gmail inbox (${testEmail}) for the weekly digest preview.`,
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

  // Run Weekly Batch Now
  const handleRunBatchNow = async () => {
    if (!confirm('Are you sure you want to trigger the weekly email digest batch for all active merchants right now?')) {
      return;
    }

    setIsRunningBatch(true);
    try {
      const token = await getAdminToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/weekly-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'run_batch' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Batch dispatch failed');
      }

      if (data.config) setAutomationConfig(data.config);
      if (data.recentRuns) setRecentRuns(data.recentRuns);

      toast({
        title: 'Weekly Batch Completed',
        description: `Successfully delivered ${data.result?.sentCount || 0} performance digests. (${data.result?.skippedCount || 0} skipped, ${data.result?.failedCount || 0} failed).`,
      });
    } catch (err: any) {
      toast({
        title: 'Batch Error',
        description: err.message || 'Failed to execute weekly batch.',
        variant: 'destructive',
      });
    } finally {
      setIsRunningBatch(false);
    }
  };

  // Load Merchant Audience and Logs
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
    if (activeTab === 'history') {
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
    <div className="flex flex-col gap-4 p-2 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Strategic Outreach & Email Marketing</h1>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium px-2 py-0.5',
                automationConfig.enabled
                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/20',
              )}
            >
              {automationConfig.enabled ? 'Automation Active' : 'Automation Paused'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automate weekly performance reports to merchants' Gmail and track delivery metrics.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="grid grid-cols-2 w-full sm:w-[320px]">
            <TabsTrigger value="automation" className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Weekly Automation
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs font-medium">
              <Mail className="h-3.5 w-3.5" />
              Merchant Logs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* TAB 1: WEEKLY PERFORMANCE AUTOMATION */}
      {activeTab === 'automation' && (
        <div className="flex flex-col gap-6">
          {/* Top Control Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Master Switch */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Automation Status
                  </CardTitle>
                  <Switch
                    checked={automationConfig.enabled}
                    disabled={isAutomationToggling}
                    onCheckedChange={handleToggleAutomation}
                  />
                </div>
                <CardDescription className="text-xs">
                  Controls whether automated weekly digests trigger on schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">State:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      automationConfig.enabled ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
                    {automationConfig.enabled ? 'RUNNING (Every Monday)' : 'STOPPED / PAUSED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {automationConfig.schedule}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Sent:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {automationConfig.totalSentCount || 0} digests
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Last Run:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {safeFormatTime(automationConfig.lastRunAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Send Test Preview to Gmail */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-600" />
                  Send Test to Gmail
                </CardTitle>
                <CardDescription className="text-xs">
                  Test Resend delivery & preview formatting directly in your inbox.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter recipient email (e.g. you@gmail.com)"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmail}
                  className="w-full h-9 text-xs font-semibold gap-1.5"
                  variant="default"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dispatching to Gmail...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Test Digest
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Uses realistic sample performance stats and growth tips.
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Batch Trigger & Quick Stats */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Play className="h-4 w-4 text-purple-600" />
                  Manual Batch Dispatch
                </CardTitle>
                <CardDescription className="text-xs">
                  Run the weekly digest batch immediately across all active merchants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Button
                  onClick={handleRunBatchNow}
                  disabled={isRunningBatch}
                  className="w-full h-9 text-xs font-semibold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isRunningBatch ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing Weekly Digests...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run Weekly Batch Now
                    </>
                  )}
                </Button>

                <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 p-2.5 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Built-in Safe Delivery:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                    <li>Honors individual merchant marketing opt-outs</li>
                    <li>Rate limited at ~600ms per send to protect Resend quota</li>
                    <li>Injects pixel open tracking and 1-click unsubscribe</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Preview & Execution Logs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Template Preview (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold">Live Email Template Preview</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={loadAutomationData}
                  disabled={isAutomationLoading}
                >
                  <RefreshCw className={cn('h-3 w-3', isAutomationLoading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 shadow-sm">
                <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-t border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>From: Zeneva Performance &lt;growth@zeneva.space&gt;</span>
                  <span>Subject: 📊 Weekly Performance: Coffee & Bakery</span>
                </div>
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    title="Weekly Performance Email Preview"
                    className="w-full h-[680px] border-0 bg-white rounded-b-md shadow-inner"
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Rendering email template preview...
                  </div>
                )}
              </div>
            </div>

            {/* Recent Execution Runs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold">Recent Execution History</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {recentRuns.length} runs recorded
                </span>
              </div>

              <Card className="border border-slate-200 dark:border-slate-800 flex-1 shadow-sm">
                <ScrollArea className="h-[680px]">
                  <div className="p-3 space-y-3">
                    {recentRuns.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        No batch executions recorded yet.
                        <br />
                        Runs will appear here once triggered by cron or manually.
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
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                                )}
                              >
                                {run.trigger}
                              </Badge>
                              <span>{safeFormatTime(run.startedAt)}</span>
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

                          {run.durationMs && (
                            <div className="text-[10px] text-muted-foreground text-right font-mono">
                              Duration: {(run.durationMs / 1000).toFixed(1)}s
                            </div>
                          )}

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

      {/* TAB 2: AUDIENCE & MERCHANT LOGS (Existing Functionality) */}
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
                      You can view every email sent to them, along with read receipts and delivery statuses.
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
                                      From: {log.from || 'growth@zeneva.space'}
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
    </div>
  );
}
