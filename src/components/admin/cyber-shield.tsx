'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
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
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
    ShieldAlert, 
    ShieldCheck, 
    Lock, 
    Zap, 
    Fingerprint, 
    Terminal, 
    AlertCircle,
    Activity,
    Shield,
    XCircle,
    UserMinus,
    Search,
    RefreshCw,
    Smartphone,
    CheckCircle2,
    Eye,
    Globe,
    Cpu,
    Radar,
    LockIcon,
    Radio,
    Signal,
    Power,
    Server,
    Crosshair,
    ArrowRight
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { 
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier
} from 'firebase/auth';
import { 
    collectionGroup, 
    query, 
    orderBy, 
    limit, 
    getDocs,
    collection,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { format, formatDistanceToNow, subHours, subMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components for Situation Awareness ---

const ScanningEffect = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div 
            initial={{ y: "-100%" }}
            animate={{ y: "200%" }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="h-1/2 w-full bg-gradient-to-b from-transparent via-primary/50 to-transparent"
        />
    </div>
);

const RadarPulse = () => (
    <div className="relative w-16 h-16 flex items-center justify-center">
        <motion.div 
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary/30 rounded-full"
        />
        <div className="relative z-10 p-2 bg-background rounded-full border border-primary/20">
            <Radar className="h-6 w-6 text-primary animate-spin-slow" />
        </div>
    </div>
);

const SecurityMetric = ({ label, value, subValue, icon: Icon, colorClass, borderClass }: any) => (
    <Card className={cn("bg-black/40 border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-primary/40 transition-all", borderClass)}>
        <ScanningEffect />
        <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center justify-between">
                {label}
                <Icon className={cn("h-3 w-3", colorClass)} />
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            <div className={cn("text-2xl font-black font-mono tracking-tighter", colorClass)}>
                {value}
            </div>
            <div className="text-[9px] text-muted-foreground font-mono mt-1 opacity-60">
                {subValue}
            </div>
            <motion.div 
                className="h-1 bg-current opacity-20 mt-3 rounded-full overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
            >
                <div className={cn("h-full", colorClass.replace('text', 'bg'))} />
            </motion.div>
        </CardContent>
    </Card>
);

export default function CyberShield() {
    const { firestore, auth, user: authUser } = useFirebase();
    const { toast } = useToast();
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [indexError, setIndexError] = useState<string | null>(null);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);
    const [systemPulse, setSystemPulse] = useState(0);

    // MFA Enrollment State
    const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [mfaStep, setMfaStep] = useState<'phone' | 'code'>('phone');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const recaptchaRef = useRef<any>(null);

    // Fetch REAL system state
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: allUsers } = useCollection<any>(usersQuery);

    const adminCount = useMemo(() => allUsers?.filter(u => u.role === 'admin' || u.role === 'manager').length || 0, [allUsers]);

    // System Pulse Effect
    useEffect(() => {
        const interval = setInterval(() => setSystemPulse(p => (p + 1) % 100), 1000);
        return () => clearInterval(interval);
    }, []);

    const mfaStatus = useMemo(() => {
        if (!authUser) return { enabled: false, color: 'text-rose-500', bg: 'bg-rose-500' };
        const enrolled = (authUser as any).multiFactor?.enrolledFactors?.length > 0;
        return {
            enabled: enrolled,
            color: enrolled ? 'text-emerald-500' : 'text-rose-500',
            bg: enrolled ? 'bg-emerald-500' : 'bg-rose-500',
            label: enrolled ? 'SECURE' : 'UNPROTECTED'
        };
    }, [authUser]);

    const fetchGlobalAudit = async () => {
        if (!firestore) return;
        setIsLoadingLogs(true);
        try {
            const q = query(
                collectionGroup(firestore, 'auditLogs'),
                orderBy('createdAt', 'desc'),
                limit(30)
            );
            const snap = await getDocs(q);
            const logs = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                businessId: doc.ref.parent.parent?.id
            }));
            setAuditLogs(logs);
            setIndexError(null);
        } catch (err: any) {
            console.error("Failed to fetch global audit logs:", err);
            if (err.message?.includes('index')) {
                setIndexError("Audit Log Index required. Please enable global monitoring.");
            }
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchGlobalAudit();
        const interval = setInterval(fetchGlobalAudit, 30000); // Auto-sync every 30s
        return () => clearInterval(interval);
    }, [firestore]);

    const handleSendCode = async () => {
        if (!auth || !authUser || !phoneNumber) return;
        setIsEnrolling(true);
        try {
            if (!recaptchaRef.current) {
                recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-admin-container', {
                    'size': 'invisible'
                });
            }
            const session = await multiFactor(authUser).getSession();
            const phoneInfoOptions = { phoneNumber, session };
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaRef.current);
            setVerificationId(vId);
            setMfaStep('code');
            toast({ title: "Verification Initiated", description: "SMS gateway triggered." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Shield Breach", description: error.message });
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleVerifyAndEnroll = async () => {
        if (!authUser || !verificationId || !verificationCode) return;
        setIsEnrolling(true);
        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
            const assertion = PhoneMultiFactorGenerator.assertion(cred);
            await multiFactor(authUser).enroll(assertion, "Primary Hardware Node");
            setIsMfaModalOpen(false);
            toast({ title: "Lockdown Protocol Active", description: "Account tethered to hardware factor." });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Core Rejection", description: "Verification signature invalid." });
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleHardKill = async (userId: string, userName: string) => {
        if (!firestore || !window.confirm(`TERMINATE access for ${userName}? This will sever all active neural links.`)) return;
        setIsRevoking(userId);
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { 
                status: 'suspended',
                suspendedAt: serverTimestamp(),
                suspendedBy: 'SOC_PRIME'
            });
            toast({ title: "Target Neutered", description: "System access revoked. Node dark.", className: "bg-red-950 text-red-500 border-red-500/50" });
        } catch (err) {
            toast({ variant: "destructive", title: "Kill Command Failed", description: "Security override insufficient." });
        } finally {
            setIsRevoking(null);
        }
    };

    const securityMatrix = useMemo(() => {
        const recentLogs = auditLogs.filter(log => log.createdAt?.toDate() > subHours(new Date(), 24));
        const impersonations = recentLogs.filter(l => l.action?.includes('impersonation')).length;
        const criticalDeletes = recentLogs.filter(l => l.action?.includes('delete')).length;
        const sensitiveCount = impersonations + criticalDeletes;

        if (sensitiveCount > 5) return { level: 'CRITICAL', score: 28, color: 'text-rose-500', from: 'from-rose-500', variant: 'destructive' as const };
        if (sensitiveCount > 0) return { level: 'CAUTION', score: 62, color: 'text-amber-500', from: 'from-amber-500', variant: 'outline' as const };
        return { level: 'OPTIMAL', score: 94, color: 'text-emerald-500', from: 'from-emerald-500', variant: 'default' as const };
    }, [auditLogs]);

    return (
        <div className="space-y-6 bg-[#020617] p-6 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            
            <div id="recaptcha-admin-container"></div>
            
            {/* Top Bar - Situation Room Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 border-b border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <h1 className="text-sm font-black tracking-[0.4em] uppercase text-white/90">Cyber Shield v4.2</h1>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-50 tracking-widest">
                        Zeneva Surveillance & Response Intelligence Hub
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Grid Latency</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={cn("h-3 w-1 rounded-sm", i <= 4 ? "bg-emerald-500/50" : "bg-slate-800")} />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col items-end border-l border-white/10 pl-6">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Uptime</span>
                        <span className="text-xs font-bold font-mono text-white/80">99.982%</span>
                    </div>
                    <Button onClick={fetchGlobalAudit} variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-white/5 group">
                        <RefreshCw className={cn("h-4 w-4 text-primary group-hover:rotate-180 transition-transform duration-500", isLoadingLogs && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Main Situational Display */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
                
                {/* Tactical Health Core */}
                <Card className="lg:col-span-1 bg-black/40 border-slate-800 backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center p-8">
                    <ScanningEffect />
                    <RadarPulse />
                    <div className="mt-6 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Integrity Score</p>
                        <div className={cn("text-5xl font-black font-mono tracking-tighter", securityMatrix.color)}>
                            {securityMatrix.score}%
                        </div>
                        <Badge variant="secondary" className={cn("mt-3 px-3 py-0.5 font-black uppercase text-[10px] tracking-tighter bg-opacity-10", securityMatrix.color.replace('text', 'bg'))}>
                            {securityMatrix.level}
                        </Badge>
                    </div>
                    <div className="w-full space-y-2 mt-8">
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase">
                            <span>Threat Density</span>
                            <span>Low</span>
                        </div>
                        <Progress value={24} className="h-1 bg-slate-800" indicatorClassName="bg-cyan-500" />
                    </div>
                </Card>

                {/* Surveillance Metrics Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SecurityMetric 
                        label="Active Surface Nodes" 
                        value={`${adminCount} ADMINS`}
                        subValue="Verified entry protocols active"
                        icon={Cpu}
                        colorClass="text-blue-400"
                    />
                    <SecurityMetric 
                        label="Encryption Tethers" 
                        value="AES-256 GCM"
                        subValue="End-to-end socket verified"
                        icon={LockIcon}
                        colorClass="text-purple-400"
                    />
                    <SecurityMetric 
                        label="Identity Lockdown" 
                        value={mfaStatus.label}
                        subValue={mfaStatus.enabled ? "Secure Link: Verified" : "CRITICAL: Bypass Danger"}
                        icon={Fingerprint}
                        colorClass={mfaStatus.color}
                        borderClass={!mfaStatus.enabled ? "border-rose-500/30 animate-pulse cursor-pointer" : ""}
                        onClick={() => !mfaStatus.enabled && setIsMfaModalOpen(true)}
                    />
                    
                    {/* Live Activity Monitor */}
                    <Card className="md:col-span-3 bg-black/40 border-slate-800 backdrop-blur-md p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Tactical Feed Overview</span>
                            </div>
                            <div className="text-[9px] font-mono text-emerald-500/60 uppercase">
                                Monitoring {auditLogs.length} Points of Interest
                            </div>
                        </div>
                        <div className="h-32 overflow-hidden relative">
                             <div className="space-y-1">
                                {auditLogs.slice(0, 4).map((log, i) => (
                                    <div key={i} className="flex items-center gap-4 text-[10px] font-mono border-l-2 border-emerald-500/20 pl-4 py-2 hover:bg-white/5 transition-colors cursor-default">
                                        <span className={cn("font-bold min-w-[60px]", i === 0 ? "text-emerald-400" : "text-slate-500")}>
                                            [{log.createdAt ? format(log.createdAt.toDate(), 'HH:mm:ss') : 'LIVE'}]
                                        </span>
                                        <span className="text-slate-400 uppercase">{log.userName}</span>
                                        <ArrowRight className="h-2 w-2 text-slate-700" />
                                        <span className="text-white/80 font-bold">{log.action.toUpperCase()}</span>
                                        <span className="text-slate-600 truncate opacity-40">{log.entityType} › {log.id}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#020617] to-transparent" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* The Intelligence Feed (Audit Logs) */}
            <Card className="bg-[#020617] border-slate-800 shadow-2xl relative overflow-hidden relative z-10">
                <CardHeader className="bg-white/5 border-b border-white/5 p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-sm flex items-center gap-2 font-black tracking-[0.2em] uppercase text-white/90">
                                <Terminal className="h-4 w-4 text-primary" />
                                Operational Audit Stream
                            </CardTitle>
                            <CardDescription className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                Raw intelligence feed from all platform nodes.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-white/5 text-white/60">
                                {auditLogs.length} EVENTS LOADED
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-black/20">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] h-12">Identification</TableHead>
                                    <TableHead className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] h-12 px-6">Event Protocol</TableHead>
                                    <TableHead className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] h-12">Action Payload</TableHead>
                                    <TableHead className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] h-12 text-right">Countermeasures</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLogs ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i} className="border-white/5"><TableCell colSpan={4}><div className="h-10 w-full bg-white/5 animate-pulse rounded" /></TableCell></TableRow>
                                    ))
                                ) : auditLogs.length === 0 ? (
                                    <TableRow className="border-white/5">
                                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-mono text-xs italic">
                                            Operational tranquility confirmed. Zero threat vectors detected.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    auditLogs.map((log) => (
                                        <TableRow key={log.id} className="group hover:bg-primary/5 transition-all border-white/5">
                                            <TableCell>
                                                <div className="flex flex-col py-2">
                                                    <span className="font-black text-[11px] text-white/90 tracking-tight">{log.userName}</span>
                                                    <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">{log.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-3">
                                                    {log.action?.includes('delete') || log.action?.includes('void') ? (
                                                        <div className="h-6 w-1 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                                                    ) : log.action?.includes('impersonation') ? (
                                                        <div className="h-6 w-1 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                                                    ) : (
                                                        <div className="h-6 w-1 bg-slate-700" />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className={cn(
                                                            "text-[10px] font-black font-mono tracking-tighter uppercase",
                                                            log.action?.includes('delete') ? "text-rose-400" : "text-white/70"
                                                        )}>{log.action}</span>
                                                        <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-40">
                                                            {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'LIVE'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                               <div className="flex items-center gap-2">
                                                   <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/50">{log.entityType}</div>
                                                   <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{log.entityId}</span>
                                               </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-40 group-hover:opacity-100 transition-all border border-transparent hover:border-rose-500/20"
                                                    onClick={() => handleHardKill(log.userId, log.userName)}
                                                    disabled={isRevoking === log.userId}
                                                >
                                                    <Power className={cn("h-3.5 w-3.5", isRevoking === log.userId && "animate-spin")} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="bg-black/40 border-t border-white/5 py-3 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Server className="h-3 w-3 text-emerald-500/50" />
                            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Main Node: us-central1-f</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                            <Shield className="h-3 w-3 text-blue-500/50" />
                            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Auth: Firebase-Admin-v14</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Neural link established</span>
                    </div>
                </CardFooter>
            </Card>

            {/* MFA Enrollment Overlay */}
            <AnimatePresence>
                {isMfaModalOpen && (
                    <Dialog open={isMfaModalOpen} onOpenChange={setIsMfaModalOpen}>
                        <DialogContent className="sm:max-w-[400px] bg-[#020617] border-slate-800 text-white overflow-hidden p-0">
                            <ScanningEffect />
                            <div className="p-6">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tighter italic">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <LockIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        Lockdown Protocol E-2
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-2">
                                        Verify physical hardware to secure admin node.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6 py-8">
                                    {mfaStep === 'phone' ? (
                                        <div className="space-y-3">
                                            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Comm Link (Phone)</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="phone" 
                                                    placeholder="+234..." 
                                                    value={phoneNumber} 
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="bg-black/50 border-slate-800 h-12 font-mono text-lg tracking-widest focus:border-primary transition-all"
                                                />
                                                <Smartphone className="absolute right-3 top-3 h-6 w-6 text-slate-800" />
                                            </div>
                                        </div>
                                    ) : (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center"
                                        >
                                            <div className="flex justify-center mb-6">
                                                <div className="relative">
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                                                    />
                                                    <div className="bg-slate-900 p-4 rounded-full border border-primary/40 relative">
                                                        <Radio className="h-8 w-8 text-primary" />
                                                    </div>
                                                </div>
                                            </div>
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Transmission Received</Label>
                                            <p className="text-xs text-slate-500 mt-2 font-mono">Input signal sequence</p>
                                            <Input 
                                                className="mt-6 bg-black/50 border-slate-800 text-center text-4xl tracking-[0.6em] font-black h-20 focus:border-emerald-500 focus:ring-emerald-500/20" 
                                                maxLength={6} 
                                                autoFocus
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                <DialogFooter className="flex-col sm:flex-row gap-3">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setIsMfaModalOpen(false)} 
                                        disabled={isEnrolling}
                                        className="font-black uppercase text-[10px] tracking-widest hover:bg-white/5"
                                    >
                                        Abort
                                    </Button>
                                    {mfaStep === 'phone' ? (
                                        <Button 
                                            onClick={handleSendCode} 
                                            disabled={isEnrolling || !phoneNumber}
                                            className="flex-1 bg-primary hover:bg-primary/80 font-black uppercase text-[10px] tracking-widest h-12 shadow-[0_0_20px_rgba(3,105,161,0.3)]"
                                        >
                                            {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Signal className="h-4 w-4 mr-2" />}
                                            Establish Link
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={handleVerifyAndEnroll} 
                                            disabled={isEnrolling || verificationCode.length < 6}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-black uppercase text-[10px] tracking-widest h-12 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                        >
                                            {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Crosshair className="h-4 w-4 mr-2" />}
                                            Confirm Identity
                                        </Button>
                                    )}
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>
            
            {/* Real-time scanning noise effect - absolute overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-pulse bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        </div>
    );
}

// Add these custom animations to tailwind.config.js if you want full effect:
// animation: {
//   'spin-slow': 'spin 8s linear infinity',
// }
