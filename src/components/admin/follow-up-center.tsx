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
import { Mail, RefreshCw, Eye, AlertCircle, CheckCircle2, Send, Search, Filter, Clock, TrendingUp } from 'lucide-react';
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
}

interface FollowUpCenterProps {
  atRiskBusinesses: any[];
  users: any[];
  conversionRate?: number;
  churnRiskCount?: number;
}

export default function FollowUpCenter({ atRiskBusinesses, users, conversionRate = 0, churnRiskCount = 0 }: FollowUpCenterProps) {
  const [logs, setLogs] = React.useState<FollowUpLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  const [selectedRecipient, setSelectedRecipient] = React.useState<any>(null);
  const [subject, setSubject] = React.useState('Getting the most out of Zeneva');
  const [emailBody, setEmailBody] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // In a real app, you'd fetch this from your new API or direct Firestore if permissions allow
      // For now, we'll assume a basic fetch logic
      const response = await fetch('/api/admin/follow-up-stats');
      const data = await response.json();
      if (data.success) setLogs(data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendEmail = async () => {
    if (!selectedRecipient || !subject || !emailBody) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill all fields.' });
      return;
    }

    setIsSending(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/send-follow-up', {
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
      name: 'Re-engagement',
      subject: 'We miss you at Zeneva!',
      body: (name: string) => `Hi ${name},<br><br>We noticed you haven't recorded many sales lately. Is there anything we can help with?<br><br>Our new Analytics Dashboard just launched, and it's perfect for tracking your growth.<br><br>Best,<br>The Zeneva Team`
    },
    {
      name: 'Trial Expiring',
      subject: 'Your Zeneva Trial is ending soon',
      body: (name: string) => `Hi ${name},<br><br>Your pro trial is coming to an end. Upgrade now to keep accessing advanced features like AI insights and custom reports.<br><br>Best,<br>The Zeneva Team`
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
            <div className="text-2xl font-bold">{logs.length}</div>
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No outreach logs found. Start by sending a follow-up.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium text-xs">{log.recipientName}</div>
                        <div className="text-[10px] text-muted-foreground">{log.sentTo}</div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">{log.subject}</TableCell>
                      <TableCell className="text-xs">
                        {log.sentAt?.seconds ? format(new Date(log.sentAt.seconds * 1000), 'MMM d, HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'opened' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                             <CheckCircle2 className="h-3 w-3 mr-1" /> Opened
                          </Badge>
                        ) : log.status === 'failed' ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">Sent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.converted ? (
                           <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                              <TrendingUp className="h-3 w-3 mr-1" /> Converted
                           </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="font-bold">{log.openCount || 0}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Dispatch Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
