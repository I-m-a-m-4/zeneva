'use client';

import * as React from 'react';
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
} from 'firebase/firestore';
import { RefreshCw, ArrowLeft, Search, Mail, Check, CheckCheck, Clock, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { withFirestoreRetry } from '@/firebase/retry';
import type { UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isToday, isYesterday } from 'date-fns';

const LOG_LIMIT = 1000; // Fetch enough logs for the history

function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function safeFormatTime(val: any): string {
  if (!val) return '';
  try {
    const date = val.toDate ? val.toDate() : (val.seconds ? new Date(val.seconds * 1000) : new Date(val));
    if (Number.isNaN(date.getTime())) return '';
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  } catch (e) {
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

  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [emailTopicFilter, setEmailTopicFilter] = React.useState<string>('all');
  const [emailStatusFilter, setEmailStatusFilter] = React.useState<string>('all');
  
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);

  const loadUsers = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoadingUsers(true);
    try {
      const snap = await withFirestoreRetry(() => getDocs(query(collection(firestore, 'users'), orderBy('lastSeen', 'desc'))), {
        label: 'Email marketing audience',
      });
      setUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
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
      setLogs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (error) {
      console.error('Failed to load campaign logs', error);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    loadUsers();
    loadLogs();
  }, [loadUsers, loadLogs]);

  const uniqueSubjects = React.useMemo(() => {
    const subjects = new Set<string>();
    logs.forEach(l => {
      if (l.subject) subjects.add(l.subject);
    });
    return Array.from(subjects);
  }, [logs]);

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u => {
      const matchesSearch = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      
      let matchesFilter = true;
      const userSpecificLogs = logs.filter(l => l.sentTo && u.email && l.sentTo.toLowerCase() === u.email.toLowerCase());
      
      if (emailTopicFilter && emailTopicFilter !== 'all') {
         const matchingLogs = userSpecificLogs.filter(l => l.subject === emailTopicFilter);
         matchesFilter = matchingLogs.length > 0;
         
         if (matchesFilter && emailStatusFilter !== 'all') {
             const hasOpened = matchingLogs.some(l => l.status === 'opened' || (l.openCount && l.openCount > 0) || l.openedAt?.seconds);
             if (emailStatusFilter === 'opened') {
                 matchesFilter = hasOpened;
             } else if (emailStatusFilter === 'unopened') {
                 matchesFilter = !hasOpened;
             }
         }
      } else if (emailStatusFilter !== 'all') {
          const hasOpenedAny = userSpecificLogs.some(l => l.status === 'opened' || (l.openCount && l.openCount > 0) || l.openedAt?.seconds);
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
    return logs.filter(l => 
      (l.sentTo && selectedUser.email && l.sentTo.toLowerCase() === selectedUser.email.toLowerCase()) ||
      (l.recipientName && selectedUser.name && l.recipientName.toLowerCase() === selectedUser.name.toLowerCase())
    );
  }, [logs, selectedUser]);

  // Mobile layout state
  const inThreadOnMobile = !!selectedUser;

  return (
    <div className="h-[calc(100vh_-_11rem)] md:h-[calc(100vh_-_10rem)] flex flex-col p-2 md:p-0">
      <div className={cn("flex flex-col gap-1 mb-3 md:mb-4", inThreadOnMobile && "hidden md:flex")}>
        <h1 className="text-xl md:text-2xl font-bold">Strategic Outreach</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track email campaigns, outreach history, and open rates for all merchants.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6">
          
          {/* Left Pane: User List */}
          <div className={cn(
            "col-span-1 h-full min-h-0 flex-col",
            selectedUser ? 'hidden md:flex' : 'flex'
          )}>
            <div className="mb-2 flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 text-sm pl-9"
                />
              </div>
              <Select value={emailTopicFilter} onValueChange={setEmailTopicFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Filter by sent email..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All emails</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {emailTopicFilter !== 'all' && (
                <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Filter by status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="opened">Opened (Seen)</SelectItem>
                    <SelectItem value="unopened">Unopened (Unseen)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <ScrollArea className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No merchants found.</div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map(u => {
                    const latestLog = logs.find(l => (l.sentTo && u.email && l.sentTo.toLowerCase() === u.email.toLowerCase()));
                    const sentCount = logs.filter(l => (l.sentTo && u.email && l.sentTo.toLowerCase() === u.email.toLowerCase())).length;

                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted",
                          selectedUser?.id === u.id && 'bg-muted'
                        )}
                      >
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                          {initialsOf(u.name || u.email)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {u.name || u.email || 'Unknown User'}
                            </span>
                            {latestLog && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {safeFormatTime(latestLog.sentAt)}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                          {sentCount > 0 && (
                            <span className="mt-1 flex items-center gap-1.5">
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase shadow-none">
                                {sentCount} Sent
                              </Badge>
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Pane: Email History / Chat Detail */}
          <div className={cn(
            "col-span-1 md:col-span-2 lg:col-span-3 h-full min-h-0 flex-col",
            !selectedUser ? 'hidden md:flex' : 'flex'
          )}>
            {!selectedUser ? (
              <div className="h-full flex flex-col items-center justify-center border rounded-xl bg-card/50 shadow-sm text-center p-8">
                <div className="h-16 w-16 bg-orange-100 dark:bg-orange-950/50 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Outreach History</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a merchant from the list to view the emails and campaigns sent to them, along with their open rates.
                </p>
              </div>
            ) : (
              <div className="relative flex flex-col h-full min-h-0 bg-[#efeae2] dark:bg-slate-950 border rounded-xl overflow-hidden shadow-lg">
                {/* Header */}
                <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-b flex items-center gap-2 md:gap-3 z-10 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUser(null)}
                    className="h-9 w-9 shrink-0 -ml-1 md:hidden"
                    aria-label="Back to users list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold uppercase text-orange-600 dark:text-orange-400">
                    {initialsOf(selectedUser.name || selectedUser.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-sm md:text-base text-slate-800 dark:text-white">
                      {selectedUser.name || selectedUser.email || 'Unknown User'}
                    </h3>
                    <p className="truncate text-[11px] md:text-xs text-muted-foreground">
                      {selectedUser.email}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 hidden sm:flex">
                      <Mail className="h-3 w-3 mr-1.5 text-orange-500" />
                      {userLogs.length} Total Sent
                    </Badge>
                  </div>
                </div>

                {/* Email History Body */}
                <ScrollArea className="flex-1 min-h-0 p-3 md:p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[size:360px]">
                  <div className="space-y-4">
                    {isLoadingLogs ? (
                      <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" /></div>
                    ) : userLogs.length === 0 ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center">
                        <div className="h-12 w-12 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No emails sent to this merchant yet.</p>
                      </div>
                    ) : (
                      // Display logs (most recent first in this case is fine, but chat usually has oldest at top. 
                      // Let's reverse them so it reads like a timeline top-to-bottom)
                      [...userLogs].reverse().map(log => {
                        const isOpened = log.status === 'opened' || log.openCount > 0 || log.openedAt?.seconds;
                        const isFailed = log.status === 'failed';
                        
                        return (
                          <div key={log.id} className="flex flex-col items-end group w-full">
                            <div className="w-full md:w-[95%] bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
                               <div className="flex items-start justify-between gap-4 mb-2">
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                    {log.subject}
                                  </h4>
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "shrink-0 text-[9px] uppercase font-bold tracking-wider",
                                      isOpened ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
                                      : isFailed ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                    )}
                                  >
                                    {isOpened ? 'Opened' : isFailed ? 'Failed' : 'Sent'}
                                  </Badge>
                               </div>

                               {(log.html || log.message) && (
                                 <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-md border border-slate-100 dark:border-slate-800 mb-2 w-full overflow-hidden">
                                   {log.html ? (
                                      <iframe 
                                        srcDoc={log.html.replace(/<img[^>]*src="[^"]*\/api\/track\?tid=[^"]*"[^>]*>/gi, '')} 
                                        title="Email Preview" 
                                        className="w-full h-[600px] border-0 bg-white rounded-sm"
                                      />
                                   ) : (
                                      <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {log.message.replace(/<img[^>]*src="[^"]*\/api\/track\?tid=[^"]*"[^>]*>/gi, '')}
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
                                        {log.openedAt && (
                                          <span>• {safeFormatTime(log.openedAt)}</span>
                                        )}
                                      </>
                                    ) : isFailed ? (
                                      <span className="text-rose-500 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Delivery Failed</span>
                                    ) : (
                                      <span className="flex items-center gap-1"><Check className="h-3 w-3"/> Delivered</span>
                                    )}
                                  </div>
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
  );
}
