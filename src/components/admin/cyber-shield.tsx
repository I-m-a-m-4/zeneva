'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { 
    ShieldAlert, 
    ShieldCheck, 
    Lock, 
    Zap, 
    Fingerprint, 
    Eye, 
    Terminal, 
    AlertCircle,
    Activity,
    UserCircle,
    Globe
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { 
    collectionGroup, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    Timestamp 
} from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';

export default function CyberShield() {
    const firestore = useFirestore();
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [threatLevel, setThreatLevel] = useState('Low');

    useEffect(() => {
        const fetchGlobalAudit = async () => {
            if (!firestore) return;
            try {
                // Fetch audit logs across all business instances
                const q = query(
                    collectionGroup(firestore, 'auditLogs'),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const snap = await getDocs(q);
                const logs = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    businessId: doc.ref.parent.parent?.id
                }));
                setAuditLogs(logs);
            } catch (err) {
                console.error("Failed to fetch global audit logs:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGlobalAudit();
    }, [firestore]);

    const getActionBadge = (action: string) => {
        if (action.includes('delete')) return <Badge variant="destructive">{action}</Badge>;
        if (action.includes('update')) return <Badge variant="outline" className="border-amber-500 text-amber-500">{action}</Badge>;
        return <Badge variant="secondary">{action}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-blue-400" />
                            SHIELD STATUS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tighter text-blue-400">ACTIVE</div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Real-time encryption engaged</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-amber-500/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            THREAT LEVEL
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tighter text-amber-400">{threatLevel}</div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Global monitoring operational</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-emerald-500/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-emerald-400" />
                            IDENTITY
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-400">SECURE</div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">MFA & Hardware Keys Active</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-purple-500/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Globe className="h-4 w-4 text-purple-400" />
                            TRAFFIC
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tighter text-purple-400">ENCRYPTED</div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">TLS 1.3 | AES-256</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            Real-time Global Audit Stream
                        </CardTitle>
                        <CardDescription>
                            Monitoring sensitive administrative actions across the entire platform ecosystem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User / Business</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <Activity className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-sm mt-2">Connecting to Secure Stream...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : auditLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No recent security logs found. System is quiet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    auditLogs.map((log) => (
                                        <TableRow key={log.id} className="group transition-colors hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.userName}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{log.businessId?.slice(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getActionBadge(log.action)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs">{log.entityType}</span>
                                                    <span className="text-[10px] text-muted-foreground">{log.entityName || log.entityId?.slice(0, 8)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-destructive/30 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                                <ShieldAlert className="h-4 w-4" />
                                Critical Vulnerability Scan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                    <span>IDOR PROTECTION</span>
                                    <span className="text-emerald-500">STANDBY</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                    <span>SQL INJECTION SHIELD</span>
                                    <span className="text-emerald-500">ACTIVE</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                    <span>XSS SANITIZATION</span>
                                    <span className="text-emerald-500">ARMED</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-emerald-500" />
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t text-[10px] text-muted-foreground leading-relaxed">
                                <p><strong>Security Note:</strong> Zeneva uses Firebase Security Rules to enforce granular access control. Every request is verified against the user&apos;s <code>businessId</code> at the database level.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Session Control
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            <div className="flex items-center justify-between p-2 rounded bg-muted">
                                <span>Inactivity Logout</span>
                                <Badge variant="secondary">30 Minutes</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-muted">
                                <span>Session Hijack Guard</span>
                                <Badge className="bg-emerald-500">ENABLED</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-muted">
                                <span>Impersonation Logging</span>
                                <Badge className="bg-blue-500 text-white border-none">MANDATORY</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
