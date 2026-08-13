'use client';

import * as React from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { UserProfile, BusinessInstance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Target,
  Search,
  Send,
  MessageSquare,
  Crown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Filter,
  Bell,
  Phone,
  Mail,
  StickyNote,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { pushAlertToPhones } from '@/actions/notifications';
import { cn } from '@/lib/utils';

interface OutreachLog {
  id: string;
  businessId: string;
  contactedAt: any;
  notes: string;
  method: 'push' | 'email' | 'phone' | 'manual';
  contactedBy: string;
}

interface BusinessRow {
  business: BusinessInstance;
  owner: UserProfile | undefined;
  lastLog: OutreachLog | null;
  totalContacts: number;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const METHOD_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  push: { label: 'Push', icon: Bell, color: 'text-blue-500' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-500' },
  phone: { label: 'Phone', icon: Phone, color: 'text-green-500' },
  manual: { label: 'Note', icon: StickyNote, color: 'text-orange-500' },
};

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className={cn('absolute right-4 top-4 rounded-full p-2', accent)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OutreachBadge({ log }: { log: OutreachLog | null }) {
  if (!log) {
    return (
      <Badge variant="outline" className="gap-1 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
        <AlertCircle className="h-3 w-3" />
        Not contacted
      </Badge>
    );
  }
  const d = toDate(log.contactedAt);
  return (
    <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      {d ? formatDistanceToNow(d, { addSuffix: true }) : 'Contacted'}
    </Badge>
  );
}

export default function OutreachPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users')) : null,
    [firestore]
  );
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const businessesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'businessInstances')) : null,
    [firestore]
  );
  const { data: businesses, isLoading: bizLoading } = useCollection<BusinessInstance>(businessesQuery);

  const outreachQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'outreachLogs')) : null,
    [firestore]
  );
  const { data: outreachDocs, isLoading: outreachLoading } = useCollection<OutreachLog>(outreachQuery);

  const isLoading = usersLoading || bizLoading || outreachLoading;

  const rows: BusinessRow[] = React.useMemo(() => {
    if (!businesses) return [];
    const usersByBiz = new Map<string, UserProfile>();
    (users ?? []).forEach(u => { usersByBiz.set(u.businessId, u); });

    const logsByBiz = new Map<string, OutreachLog[]>();
    (outreachDocs ?? []).forEach(log => {
      const bizId = log.businessId;
      if (!bizId) return;
      if (!logsByBiz.has(bizId)) logsByBiz.set(bizId, []);
      logsByBiz.get(bizId)!.push(log);
    });

    return businesses.map(biz => {
      const logs = (logsByBiz.get(biz.id) ?? []).sort((a, b) => {
        const da = toDate(a.contactedAt)?.getTime() ?? 0;
        const db = toDate(b.contactedAt)?.getTime() ?? 0;
        return db - da;
      });
      return { business: biz, owner: usersByBiz.get(biz.id), lastLog: logs[0] ?? null, totalContacts: logs.length };
    });
  }, [businesses, users, outreachDocs]);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [planFilter, setPlanFilter] = React.useState<'all' | 'pro' | 'starter'>('all');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter === 'contacted' && !r.lastLog) return false;
      if (statusFilter === 'not_contacted' && r.lastLog) return false;
      const plan = (r.business.plan ?? 'starter').toLowerCase();
      if (planFilter === 'pro' && plan !== 'pro') return false;
      if (planFilter === 'starter' && plan === 'pro') return false;
      if (!term) return true;
      return (
        (r.business.name ?? '').toLowerCase().includes(term) ||
        (r.owner?.name ?? '').toLowerCase().includes(term) ||
        (r.owner?.email ?? '').toLowerCase().includes(term) ||
        (r.owner?.phone ?? '').toLowerCase().includes(term)
      );
    }).sort((a, b) => {
      const da = toDate(a.business.createdAt)?.getTime() ?? 0;
      const db = toDate(b.business.createdAt)?.getTime() ?? 0;
      return sortDir === 'asc' ? da - db : db - da;
    });
  }, [rows, search, statusFilter, planFilter, sortDir]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const contacted = rows.filter(r => r.lastLog).length;
    const pro = rows.filter(r => (r.business.plan ?? 'starter').toLowerCase() === 'pro').length;
    return { total, contacted, notContacted: total - contacted, pro };
  }, [rows]);

  const [selected, setSelected] = React.useState<BusinessRow | null>(null);
  const [dialogTab, setDialogTab] = React.useState<'push' | 'note'>('push');
  const [pushTitle, setPushTitle] = React.useState('');
  const [pushBody, setPushBody] = React.useState('');
  const [noteText, setNoteText] = React.useState('');
  const [logMethod, setLogMethod] = React.useState<OutreachLog['method']>('manual');
  const [isSending, setIsSending] = React.useState(false);

  function openDialog(row: BusinessRow) {
    setSelected(row);
    setDialogTab('push');
    const firstName = row.owner?.name?.split(' ')[0] ?? 'there';
    setPushTitle(`Hey ${firstName} \uD83D\uDC4B`);
    setPushBody(`We noticed you're on Zeneva! We'd love to help you get the most out of your account. Let us know if you have any questions.`);
    setNoteText('');
    setLogMethod('manual');
  }

  async function logOutreach(businessId: string, method: OutreachLog['method'], notes: string) {
    if (!firestore || !user) return;
    const logRef = doc(collection(firestore, 'outreachLogs'));
    await setDoc(logRef, {
      businessId,
      notes,
      method,
      contactedAt: serverTimestamp(),
      contactedBy: user.email ?? user.uid,
    });
  }

  async function handleSendPush() {
    if (!selected?.owner?.email || !user) return;
    setIsSending(true);
    try {
      const idToken = await user.getIdToken();
      const result = await pushAlertToPhones({
        title: pushTitle,
        body: pushBody,
        link: '/support',
        targetEmail: selected.owner.email,
        idToken,
      });
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Push failed', description: result.error });
        return;
      }
      await logOutreach(selected.business.id, 'push', `"${pushTitle}" — ${pushBody}`);
      toast({ title: '\u2705 Push sent!', description: result.message });
      setSelected(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleLogNote() {
    if (!selected || !noteText.trim()) return;
    setIsSending(true);
    try {
      await logOutreach(selected.business.id, logMethod, noteText.trim());
      toast({ title: '\uD83D\uDCDD Logged', description: 'Outreach note saved.' });
      setSelected(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Strategic Outreach</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track and manage personal outreach to every business on Zeneva.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Businesses" value={isLoading ? '—' : stats.total} icon={Users} accent="bg-slate-500" />
        <StatCard label="Contacted" value={isLoading ? '—' : stats.contacted} sub={!isLoading && stats.total > 0 ? `${Math.round((stats.contacted / stats.total) * 100)}% coverage` : undefined} icon={CheckCircle2} accent="bg-emerald-500" />
        <StatCard label="Not Contacted" value={isLoading ? '—' : stats.notContacted} sub="Need outreach" icon={AlertCircle} accent="bg-orange-500" />
        <StatCard label="Pro Plans" value={isLoading ? '—' : stats.pro} sub="Paying customers" icon={Crown} accent="bg-violet-500" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search business, owner, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-3.5 w-3.5" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="not_contacted">Not contacted</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={v => setPlanFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <Crown className="mr-2 h-3.5 w-3.5" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="pro">Pro only</SelectItem>
              <SelectItem value="starter">Starter only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {sortDir === 'asc' ? 'Oldest first' : 'Newest first'}
            {sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isLoading ? 'Loading…' : `${filtered.length} business${filtered.length !== 1 ? 'es' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Outreach Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Contacts</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      No businesses match your filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(row => {
                  const plan = (row.business.plan ?? 'starter').toLowerCase();
                  const isPro = plan === 'pro';
                  const joinedDate = toDate(row.business.createdAt);
                  const lastContactDate = row.lastLog ? toDate(row.lastLog.contactedAt) : null;

                  return (
                    <TableRow key={row.business.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initialsOf(row.business.name)}
                          </div>
                          <div>
                            <p className="font-medium leading-tight">{row.business.name ?? '—'}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{row.business.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.owner ? (
                          <div>
                            <p className="text-sm font-medium">{row.owner.name}</p>
                            <p className="text-[11px] text-muted-foreground">{row.owner.email}</p>
                            {row.owner.phone && <p className="text-[11px] text-muted-foreground">{row.owner.phone}</p>}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn('gap-1 font-semibold', isPro
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          )}
                          variant="secondary"
                        >
                          {isPro && <Crown className="h-3 w-3" />}
                          {isPro ? 'Pro' : 'Starter'}
                        </Badge>
                      </TableCell>
                      <TableCell><OutreachBadge log={row.lastLog} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lastContactDate ? (
                          <div>
                            <p className="text-sm">{format(lastContactDate, 'MMM d, yyyy')}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {row.lastLog?.method ? METHOD_META[row.lastLog.method]?.label : ''}
                            </p>
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className={cn('text-sm font-medium', row.totalContacts === 0 ? 'text-muted-foreground' : '')}>
                          {row.totalContacts}×
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {joinedDate ? format(joinedDate, 'MMM d, yyyy') : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button size="sm" variant={row.lastLog ? 'outline' : 'default'} className="gap-1.5" onClick={() => openDialog(row)}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          {row.lastLog ? 'Follow up' : 'Reach out'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Reach out — {selected?.business.name}
            </DialogTitle>
            <DialogDescription>
              {selected?.owner?.name && <span>Owner: <strong>{selected.owner.name}</strong>{' '}</span>}
              {selected?.owner?.email && <span>· {selected.owner.email}</span>}
              {selected?.owner?.phone && <span> · {selected.owner.phone}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="flex rounded-lg border p-1 gap-1">
            {(['push', 'note'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDialogTab(tab)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  dialogTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'push' ? <><Bell className="mr-1.5 inline h-3.5 w-3.5" />Send Push</> : <><StickyNote className="mr-1.5 inline h-3.5 w-3.5" />Log Contact</>}
              </button>
            ))}
          </div>

          {dialogTab === 'push' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="e.g. Hey John 👋" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Message</label>
                <Textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Write your outreach message…" rows={4} />
              </div>
              {!selected?.owner?.email && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />No email found — push cannot be targeted.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={handleSendPush} disabled={isSending || !pushTitle || !pushBody || !selected?.owner?.email} className="gap-1.5">
                  {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send push
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Contact method</label>
                <Select value={logMethod} onValueChange={v => setLogMethod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push notification</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone / WhatsApp</SelectItem>
                    <SelectItem value="manual">Other / Manual note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="What was discussed? Any follow-up needed?" rows={4} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={handleLogNote} disabled={isSending || !noteText.trim()} className="gap-1.5">
                  {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Log contact
                </Button>
              </DialogFooter>
            </div>
          )}

          {selected && selected.totalContacts > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Previous contacts ({selected.totalContacts})
              </p>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                {(outreachDocs ?? [])
                  .filter(d => d.businessId === selected.business.id)
                  .sort((a, b) => (toDate(b.contactedAt)?.getTime() ?? 0) - (toDate(a.contactedAt)?.getTime() ?? 0))
                  .map((log, i) => {
                    const meta = METHOD_META[log.method] ?? METHOD_META.manual;
                    const Icon = meta.icon;
                    const d = toDate(log.contactedAt);
                    return (
                      <div key={i} className="flex gap-2 text-sm rounded-md bg-muted/50 p-2">
                        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.color)} />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{d ? format(d, 'MMM d, yyyy h:mm a') : '—'} · {meta.label}</p>
                          <p className="truncate">{log.notes}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
