'use client';

import * as React from 'react';
import Link from 'next/link'; // Import Link
import { usePOS } from '@/context/pos-context';
import { collection, query, orderBy, limit, startAfter, onSnapshot, getDocs } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { AuditLog } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, User, FileText, Package, Bot, Lightbulb, Flame, ShieldAlert, Info, CheckCircle, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import FeatureGate from '@/components/shared/feature-gate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { safeToDate } from '@/lib/utils';

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
                safeToDate(l.createdAt) < safeToDate(voidLog.createdAt)
            );
            if (createLog) {
                const timeDiff = safeToDate(voidLog.createdAt).getTime() - safeToDate(createLog.createdAt).getTime();
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
                    <Bot className="text-primary" /> Automated Audit Summary
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

function UpgradeModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bot className="text-primary" /> Upgrade to Business Plan
                    </DialogTitle>
                    <DialogDescription>
                        The Automated Audit Assistant is a Business Plan feature. It scans your logs for suspicious patterns to help you detect issues like internal theft or operational mistakes.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <h4 className="font-semibold mb-2">Unlock powerful security features:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Automated scan for suspicious activities.</li>
                        <li>Detailed analysis of user actions.</li>
                        <li>Proactive alerts for potential security risks.</li>
                    </ul>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Maybe Later</Button>
                    <Button asChild>
                        <Link href="/billing">Upgrade Now</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AuditLogPageContent() {
    const { business, isLoading: isPosLoading, auditLogs: cachedAuditLogs } = usePOS();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAnalyzing, startTransition] = React.useTransition();
    const [analysis, setAnalysis] = React.useState<{ summary: string; suspiciousActivities: SuspiciousActivity[] } | null>(null);
    const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [actionFilter, setActionFilter] = React.useState('all');
    const [isFetchingMore, setIsFetchingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>(() => cachedAuditLogs && cachedAuditLogs.length > 0 ? cachedAuditLogs : []);

    // Fetch Initial Logs
    React.useEffect(() => {
        if (!business?.id || !firestore) return;

        const baseQuery = query(
            collection(firestore, 'businessInstances', business.id, 'auditLogs'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(baseQuery, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as AuditLog));
            setAuditLogs(logs);
            if (snap.docs.length < 50) setHasMore(false);
        });

        return () => unsubscribe();
    }, [business?.id, firestore]);

    const handleLoadMore = async () => {
        if (!business?.id || !firestore || auditLogs.length === 0) return;
        setIsFetchingMore(true);
        try {
            const lastDoc = auditLogs[auditLogs.length - 1];
            const nextQuery = query(
                collection(firestore, 'businessInstances', business.id, 'auditLogs'),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc.createdAt),
                limit(50)
            );
            const snap = await getDocs(nextQuery);
            const more = snap.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as AuditLog));
            if (more.length > 0) {
                setAuditLogs(prev => [...prev, ...more]);
            }
            if (snap.docs.length < 50) setHasMore(false);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const filteredLogs = React.useMemo(() => {
        let result = auditLogs;
        if (actionFilter !== 'all') {
            result = result.filter(log => log.action.startsWith(`${actionFilter}.`));
        }
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(log => 
                log.userName?.toLowerCase().includes(lower) || 
                log.userEmail?.toLowerCase().includes(lower) ||
                log.details.entityName?.toLowerCase().includes(lower) ||
                log.id.toLowerCase().includes(lower)
            );
        }
        return result;
    }, [auditLogs, actionFilter, searchTerm]);

    const handleAnalyze = () => {
        const isBusinessPlan = business?.plan === 'business' || business?.accessLevel === 'lifetime';
        if (!isBusinessPlan) {
            setIsUpgradeModalOpen(true);
            return;
        }

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

    const isLoading = isPosLoading || (auditLogs.length === 0);

    return (
        <>
            {analysis && <AnalysisResults analysis={analysis} />}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold"><History className="text-primary" /> Audit Log</CardTitle>
                                <CardDescription>A chronological log of important events that have occurred in your business.</CardDescription>
                            </div>
                            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full sm:w-auto shadow-sm">
                                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                {isAnalyzing ? 'Analyzing...' : 'Scan for Issues'}
                            </Button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <History className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by user, email, or entity..." 
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'sale', 'product', 'customer', 'user'].map(filter => (
                                    <Button 
                                        key={filter}
                                        variant={actionFilter === filter ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setActionFilter(filter)}
                                        className="capitalize rounded-full h-8 px-4"
                                    >
                                        {filter}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
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
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead className="text-right">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.length > 0 ? (
                                            filteredLogs.map(log => {
                                                const entityType = log.action.split('.')[0];
                                                const Icon = actionIcons[entityType] || History;
                                                return (
                                                    <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-muted/30">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-8 w-8 hidden sm:flex border">
                                                                    <AvatarFallback>{(log.userName || 'U').charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium text-sm">{log.userName || 'Unknown User'}</div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-muted-foreground">{log.userEmail}</span>
                                                                        {log.userRole && (
                                                                            <>
                                                                                <span className="text-[10px] text-muted-foreground/30">•</span>
                                                                                <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">{log.userRole.replace('_', ' ')}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="capitalize whitespace-nowrap text-[10px] py-0 h-5 font-bold">
                                                                <Icon className="mr-1 h-2.5 w-2.5" />
                                                                {log.action.replace('.', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm font-medium truncate max-w-[150px] sm:max-w-xs">{log.details.entityName || log.entityType || 'N/A'}</div>
                                                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-xs" title={log.entityId}>
                                                                {log.entityId}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                                                            {log.createdAt ? formatDistanceToNow(safeToDate(log.createdAt), { addSuffix: true }) : ''}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                    No logs found matching your filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {hasMore && !searchTerm && actionFilter === 'all' && (
                                <div className="flex justify-center pt-4">
                                    <Button 
                                        variant="outline" 
                                        onClick={handleLoadMore} 
                                        disabled={isFetchingMore}
                                        className="w-full max-w-xs"
                                    >
                                        {isFetchingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load More Events"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
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
                                <p className="font-medium">{selectedLog.createdAt ? format(safeToDate(selectedLog.createdAt), 'PPP p') : 'N/A'}</p>
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
            <UpgradeModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
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
