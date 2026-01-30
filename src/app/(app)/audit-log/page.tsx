
'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { AuditLog } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, User, FileText, Package, Bot, Lightbulb, Flame, ShieldAlert, Info, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import FeatureGate from '@/components/shared/feature-gate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


type SuspiciousActivity = {
    title: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    relatedLogIds: string[];
}

const actionIcons: { [key: string]: React.ElementType } = {
    'product': Package,
    'sale': FileText,
    'user': User,
    'customer': User,
};

const severityIcons: Record<string, React.ReactElement> = {
  High: <Flame className="h-5 w-5 text-destructive" />,
  Medium: <ShieldAlert className="h-5 w-5 text-amber-500" />,
  Low: <Info className="h-5 w-5 text-sky-500" />,
};

function AuditLogRowSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
            <TableCell><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
        </TableRow>
    )
}

function analyzeLogsLocally(logs: AuditLog[]): { summary: string; suspiciousActivities: SuspiciousActivity[] } {
    const activities: SuspiciousActivity[] = [];
    const TEN_MINUTES = 1000 * 60 * 10;

    // 1. Look for rapid sale voids
    const sales = logs.filter(l => l.action.startsWith('sale.'));
    const voids = sales.filter(l => l.action === 'sale.void');
    if (voids.length > 0) {
        const suspiciousVoidLogIds = new Set<string>();
        for (const voidLog of voids) {
            const createLog = sales.find(l => 
                l.action === 'sale.create' && 
                l.entityId === voidLog.entityId && 
                l.createdAt.toDate() < voidLog.createdAt.toDate()
            );
            if (createLog) {
                const timeDiff = voidLog.createdAt.toDate().getTime() - createLog.createdAt.toDate().getTime();
                if (timeDiff < TEN_MINUTES) {
                    suspiciousVoidLogIds.add(voidLog.id);
                    suspiciousVoidLogIds.add(createLog.id);
                }
            }
        }
        if (suspiciousVoidLogIds.size > 0) {
            activities.push({
                title: 'Rapid Sale Voids Detected',
                description: 'One or more sales were created and then voided very quickly. This could be a method to mask cash theft, as stock is returned to inventory but the cash from the customer may not be accounted for.',
                severity: 'High',
                relatedLogIds: Array.from(suspiciousVoidLogIds),
            });
        }
    }
    
    // 2. Look for user deactivations, especially of other admins/managers
    const userDeactivations = logs.filter(l => l.action === 'user.update_status' && l.details?.newStatus === 'inactive');
    if (userDeactivations.length > 0) {
        activities.push({
            title: 'User Account Deactivations',
            description: `${userDeactivations.length} user account(s) have been deactivated. Ensure these changes were authorized, especially if any admin or manager accounts were affected, as this could be an attempt to lock others out.`,
            severity: 'Medium',
            relatedLogIds: userDeactivations.map(l => l.id),
        });
    }
    
    activities.sort((a, b) => {
        const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    const summary = activities.length > 0
        ? `Found ${activities.length} potentially suspicious pattern(s) in the ${logs.length} log entries. Please review the highlighted activities below.`
        : `Scanned ${logs.length} log entries and found no obvious signs of suspicious activity based on current rules.`;

    return { summary, suspiciousActivities: activities };
}


function AnalysisResults({ analysis }: { analysis: { summary: string, suspiciousActivities: SuspiciousActivity[] } }) {
    return (
        <Card className="mt-6 bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="text-primary"/> Automated Audit Summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground italic mb-6">"{analysis.summary}"</p>
                
                {analysis.suspiciousActivities?.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2">
                        {analysis.suspiciousActivities.map((activity, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border-b-0 rounded-lg border bg-background/50 px-4">
                            <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex items-center gap-3">
                                {severityIcons[activity.severity]}
                                <span className="font-medium text-base text-left">{activity.title}</span>
                            </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 text-muted-foreground prose prose-sm max-w-none">
                                <p>{activity.description}</p>
                                <p className="text-xs mt-2">Related Log Entries: {activity.relatedLogIds.length}</p>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                     <div className="text-center text-muted-foreground p-8">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <p className="mt-4 font-medium">No Suspicious Activity Detected</p>
                        <p className="text-sm">The automated scan found no unusual patterns based on our rules.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function AuditLogPageContent() {
    const { business, isLoading: isPosLoading } = usePOS();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAnalyzing, startTransition] = React.useTransition();
    const [analysis, setAnalysis] = React.useState<{ summary: string; suspiciousActivities: SuspiciousActivity[] } | null>(null);
    const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

    const auditLogQuery = useMemoFirebase(
        () => business?.id ? query(collection(firestore, 'businessInstances', business.id, 'auditLogs'), orderBy('createdAt', 'desc')) : null,
        [business?.id, firestore]
    );

    const { data: auditLogs, isLoading: isLoadingLogs } = useCollection<AuditLog>(auditLogQuery);
    const isLoading = isPosLoading || isLoadingLogs;

    const handleAnalyze = () => {
        if (!auditLogs || auditLogs.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'There are no audit logs to analyze.' });
            return;
        }
        startTransition(() => {
            toast({ title: 'Analysis Started', description: 'Scanning your audit logs for patterns...' });
            try {
                const result = analyzeLogsLocally(auditLogs);
                setAnalysis(result);
                 toast({ variant: 'success', title: 'Analysis Complete', description: 'Automated audit summary is ready.' });
            } catch (e: any) {
                console.error("Local audit analysis failed", e);
                toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'The scan could not be completed.' });
            }
        });
    }

    return (
        <>
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><History /> Audit Log</CardTitle>
                        <CardDescription>A chronological log of important events that have occurred in your business.</CardDescription>
                    </div>
                     <FeatureGate
                        requiredPlan="business"
                        currentPlan={business?.plan}
                        hasLifetimeAccess={business?.accessLevel === 'lifetime'}
                        featureName="Automated Audit Assistant"
                        featureDescription=""
                        className="w-full sm:w-auto"
                     >
                         <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full sm:w-auto">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4"/>}
                            {isAnalyzing ? 'Analyzing...' : 'Scan for Issues'}
                        </Button>
                    </FeatureGate>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Table>
                        <TableHeader>
                             <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            <AuditLogRowSkeleton />
                            <AuditLogRowSkeleton />
                            <AuditLogRowSkeleton />
                            <AuditLogRowSkeleton />
                        </TableBody>
                    </Table>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs && auditLogs.length > 0 ? (
                                auditLogs.map(log => {
                                    const entityType = log.action.split('.')[0];
                                    const Icon = actionIcons[entityType] || History;
                                    return (
                                        <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8 hidden sm:flex">
                                                        <AvatarFallback>{log.userName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{log.userName}</div>
                                                        <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize whitespace-nowrap">
                                                    <Icon className="mr-1.5 h-3 w-3" />
                                                    {log.action.replace('.', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium truncate max-w-xs">{log.details.entityName || log.entityType}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-xs" title={log.entityId}>
                                                    ID: {log.entityId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                                {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), {addSuffix: true}) : ''}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No audit events recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
        {analysis && <AnalysisResults analysis={analysis} />}
         <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Event Details</DialogTitle>
                    <DialogDescription>
                        A detailed view of the recorded action.
                    </DialogDescription>
                </DialogHeader>
                {selectedLog && (
                    <div className="text-sm space-y-4">
                        <div className="space-y-1">
                            <p className="text-muted-foreground">User</p>
                            <p className="font-medium">{selectedLog.userName} ({selectedLog.userEmail})</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-muted-foreground">Action</p>
                            <p className="font-medium capitalize">{selectedLog.action.replace('.', ' ')}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{selectedLog.createdAt ? format(selectedLog.createdAt.toDate(), 'PPP p') : 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-muted-foreground">Target</p>
                            <p className="font-medium">{selectedLog.details.entityName || selectedLog.entityType}</p>
                            <p className="text-muted-foreground text-xs font-mono">{selectedLog.entityId}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-muted-foreground">Details</p>
                            <pre className="p-3 bg-muted rounded-md text-xs whitespace-pre-wrap font-mono">
                                {JSON.stringify(selectedLog.details, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}

export default function AuditLogPage() {
    const { business } = usePOS();
    
    return (
        <div className="space-y-6">
            <PageTitle title="Audit Log" subtitle="Track important actions taken in your business." />
             <FeatureGate
                requiredPlan="pro"
                currentPlan={business?.plan}
                hasLifetimeAccess={business?.accessLevel === 'lifetime'}
                featureName="Audit Log"
                featureDescription="Keep a detailed, secure record of all critical system events to enhance security and accountability."
            >
                <AuditLogPageContent />
            </FeatureGate>
        </div>
    );
}
