'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, RefreshCw, Eye, AlertCircle, CheckCircle2, Send, Search, Filter, Clock, TrendingUp, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { getAuth } from 'firebase/auth';

interface FollowUpLog {
  id: string;
  sentTo: string;
  recipientName: string;
  subject: string;
  sentAt: any;
  openedAt?: any;
  status: 'sent' | 'opened' | 'failed';
  openCount: number;
  converted: boolean;
  html?: string;
  behaviorContext?: string;
}

interface FollowUpCenterProps {
  atRiskBusinesses: any[];
  users: any[];
  conversionRate?: number;
  churnRiskCount?: number;
  cachedLogs?: FollowUpLog[];
  cachedSentCount?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  onMount?: () => void;
}

export default function FollowUpCenter({ 
    atRiskBusinesses, 
    users, 
    conversionRate = 0, 
    churnRiskCount = 0,
    cachedLogs = [],
    cachedSentCount = 0,
    isLoading: parentLoading = false,
    onRefresh,
    onMount
}: FollowUpCenterProps) {
  const [logs, setLogs] = React.useState<FollowUpLog[]>(cachedLogs);
  const [sentCount, setSentCount] = React.useState(cachedSentCount);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Sync with parent cache
  React.useEffect(() => {
    if (cachedLogs.length > 0) {
      setLogs(cachedLogs);
      setSentCount(cachedSentCount);
    }
  }, [cachedLogs, cachedSentCount]);

  React.useEffect(() => {
    if (onMount && cachedLogs.length === 0) {
      onMount();
    }
  }, []);
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  const [selectedRecipient, setSelectedRecipient] = React.useState<any>(null);
  const [subject, setSubject] = React.useState('Getting the most out of Zeneva');
  const [emailBody, setEmailBody] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewLog, setViewLog] = React.useState<FollowUpLog | null>(null);

  const fetchLogs = async () => {
    if (onRefresh) {
        onRefresh();
        return;
    }
    // Fallback if not controlled
    // Intel Mission: Query Firestore directly to bypass 404 in static desktop environment
    setIsLoading(true);
    try {
      const { firestore } = await import('@/firebase');
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
      
      const logsQuery = query(
        collection(firestore, 'follow_up_logs'),
        orderBy('sentAt', 'desc')
      );
      const snapshot = await getDocs(logsQuery);
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FollowUpLog[];
      
      setLogs(logsData);
      setSentCount(logsData.filter(log => log.status !== 'failed').length);
    } catch (error) {
      console.error('Failed to fetch logs from Firestore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Controlled internally or by parent via useEffect hooks above

  const handleSendEmail = async () => {
    if (!selectedRecipient || !subject || !emailBody) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill all fields.' });
      return;
    }

    setIsSending(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      // Dispatch Strike: Use absolute URL for the cloud-hosted API
      const response = await fetch('https://zeneva.space/api/admin/send-follow-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: selectedRecipient.email,
          name: selectedRecipient.name,
          subject,
          html: emailBody,
          businessId: selectedRecipient.businessId,
          type: 'retention'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({ variant: 'success', title: 'Success', description: 'Follow-up email dispatched.' });
        setIsModalOpen(false);
        fetchLogs();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const templates = [
    {
      name: 'Usage Follow-up',
      subject: 'Are you still using Zeneva?',
      body: (name: string) => `Hi ${name || 'there'},<br><br>I noticed you haven't logged into Zeneva in a while. I'm reaching out to see if you are still using our software for your business, or if you ran into any issues that stopped you from moving forward.<br><br>We're constantly improving Zeneva based on feedback. If it wasn't a good fit, or if there's a feature you felt was missing, I'd love to hear your thoughts so we can make it better.<br><br>If you need help getting back on track, just reply to this email and I'll personally assist you.<br><br>Best,<br>Zeneva Team`
    },
    {
      name: 'Onboarding Help',
      subject: 'Need help adding your inventory to Zeneva?',
      body: (name: string) => `Hi ${name || 'there'},<br><br>I see you created an account with Zeneva but haven't added your products yet. I know setting up a new system can take some time, so I wanted to offer my help.<br><br>Do you need any assistance uploading your product list or setting up your initial inventory? I can walk you through the process or even help you import your existing data.<br><br>Just reply to this email and let me know how I can be of assistance.<br><br>Best,<br>Zeneva Team`
    },
    {
      name: 'Feedback Request',
      subject: 'How is Zeneva working out for your business?',
      body: (name: string) => `Hi ${name || 'there'},<br><br>You've been using Zeneva for a while now, and I wanted to check in and see how everything is going.<br><br>Is the system doing everything you need it to do? We are currently planning our next set of features, and feedback from active business owners like you is incredibly valuable to us.<br><br>If there's anything you'd like to see improved, or a new feature that would make your life easier, please reply and let me know. I read every single response.<br><br>Best,<br>Zeneva Team`
    }
  ];

  const applyTemplate = (template: any) => {
    if (!selectedRecipient) return;
    setSubject(template.subject);
    setEmailBody(template.body(selectedRecipient.name));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Churn Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{churnRiskCount}</div>
            <p className="text-xs text-muted-foreground">High risk accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Conv. Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Trial to Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{atRiskBusinesses.length}</div>
            <p className="text-xs text-muted-foreground">Inactive &gt; 14 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Support</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{sentCount}</div>
            <p className="text-xs text-muted-foreground">Follow-ups sent</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: At Risk Businesses */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              At-Risk Businesses
            </CardTitle>
            <CardDescription>No activity in the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {atRiskBusinesses.map((bus) => {
                  const owner = users.find(u => u.businessId === bus.id);
                  if (!owner) return null;
                  return (
                    <div key={bus.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{bus.name}</span>
                        <Badge variant="outline" className="text-[10px]">At Risk</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{owner.name} • {owner.email}</div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="w-full text-xs h-8"
                        onClick={() => {
                          setSelectedRecipient(owner);
                          setIsModalOpen(true);
                        }}
                      >
                        <Mail className="h-3 w-3 mr-2" /> Send Follow-Up
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Col: Sent Logs & Stats */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Recent Outreach
              </CardTitle>
              <CardDescription>Tracking engagement for follow-up emails.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Mission Context</TableHead>
                  <TableHead>Telemetry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead className="text-right">Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No outreach logs found. Start by sending a follow-up.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const groupedLogs: Record<string, any> = {};
                    logs.forEach(log => {
                      const key = `${log.sentTo}-${log.type || 'follow-up'}`;
                      if (!groupedLogs[key]) {
                        groupedLogs[key] = { ...log, count: log.status === 'failed' ? 0 : 1 };
                      } else {
                        if (log.status !== 'failed') groupedLogs[key].count++;
                        groupedLogs[key].openCount = Math.max(groupedLogs[key].openCount, log.openCount);
                        if (log.status === 'opened') groupedLogs[key].status = 'opened';
                        else if (log.status === 'failed' && groupedLogs[key].status !== 'opened') groupedLogs[key].status = 'failed';
                      }
                    });

                    return Object.values(groupedLogs).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            {log.recipientName}
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-3">{log.sentTo}</div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <div className="text-xs font-medium truncate">{log.subject}</div>
                          {log.behaviorContext && (
                            <div className="flex items-center gap-1 mt-1">
                                <Bot className="h-3 w-3 text-orange-400" />
                                <span className="text-[9px] text-orange-400/80 font-black uppercase tracking-tighter">Intel: {log.behaviorContext}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono whitespace-nowrap">
                          {log.sentAt?.seconds ? format(new Date(log.sentAt.seconds * 1000), 'MMM d, HH:mm') : 'N/A'}
                          <div className="text-[9px] text-muted-foreground">via ZENEVA Outreach</div>
                        </TableCell>
                        <TableCell>
                          {log.status === 'opened' || (log.openCount > 0 && log.status === 'sent') ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] font-black uppercase">
                               <CheckCircle2 className="h-3 w-3 mr-1" /> Opened
                               {log.count > 1 && <span className="ml-1 opacity-70">[{log.count}]</span>}
                            </Badge>
                          ) : log.status === 'failed' ? (
                            <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] font-black uppercase">
                              <AlertCircle className="h-3 w-3 mr-1" /> FAILED
                              {log.count > 1 && <span className="ml-1">({log.count}x)</span>}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-black uppercase">
                              <Clock className="h-3 w-3 mr-1" /> Dispatch
                              {log.count > 1 && <span className="ml-1">({log.count})</span>}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.converted ? (
                             <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px] font-black">
                                <TrendingUp className="h-3 w-3 mr-1" /> CONVERTED
                             </Badge>
                          ) : (
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="font-bold">{log.openCount || 0}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-orange-500/10" onClick={() => setViewLog(log)}>
                            <Search className="h-4 w-4 text-orange-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Compose Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Strategic Follow-Up</DialogTitle>
            <DialogDescription>
              Sending to: <span className="font-bold text-foreground">{selectedRecipient?.name}</span> ({selectedRecipient?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground self-center">Templates:</span>
              {templates.map(t => (
                <Button key={t.name} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => applyTemplate(t)}>
                  {t.name}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Message Body (HTML Supported)</Label>
              <Textarea 
                className="min-h-[200px] font-mono text-xs" 
                value={emailBody} 
                onChange={e => setEmailBody(e.target.value)} 
                placeholder="Hi {{name}}..."
              />
              <p className="text-[10px] text-muted-foreground">The Zeneva tracking pixel will be automatically appended to provide reach analytics.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isSending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Dispatch Strike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Email Modal */}
      <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Outreach Audit: {viewLog?.subject}
            </DialogTitle>
            <DialogDescription>
              Sent to {viewLog?.recipientName} ({viewLog?.sentTo})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-white mt-4">
             {viewLog?.html ? (
               <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: viewLog.html }} />
             ) : (
               <div className="text-center py-10 text-muted-foreground italic">
                 Email body not stored in this log.
               </div>
             )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setViewLog(null)}>Close Audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
