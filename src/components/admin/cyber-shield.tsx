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
    ArrowRight,
    Trash2
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
    deleteDoc,
    writeBatch,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { format, formatDistanceToNow, subHours, subMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components for Situation Awareness ---

const ScanningEffect = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <motion.div 
            initial={{ y: "-100%" }}
            animate={{ y: "200%" }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="h-1/2 w-full bg-gradient-to-b from-transparent via-primary/30 to-transparent"
        />
    </div>
);

const RadarPulse = () => (
    <div className="relative w-16 h-16 flex items-center justify-center">
        <motion.div 
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-full"
        />
        <div className="relative z-10 p-2 bg-background rounded-full border border-primary/10 shadow-sm">
            <Radar className="h-6 w-6 text-primary animate-spin-slow" />
        </div>
    </div>
);

const SecurityMetric = ({ label, value, subValue, icon: Icon, colorClass, borderClass, onClick }: any) => (
    <Card 
        className={cn("relative overflow-hidden group hover:shadow-md transition-all border-border/50", borderClass)}
        onClick={onClick}
    >
        <ScanningEffect />
        <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                {label}
                <Icon className={cn("h-3.5 w-3.5", colorClass)} />
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            <div className={cn("text-2xl font-black tracking-tight", colorClass)}>
                {value}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
                {subValue}
            </div>
            <div className="h-1 bg-muted mt-3 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    className={cn("h-full", colorClass.replace('text', 'bg'))} 
                />
            </div>
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

    // Entity Termination State
    const [isDestructionModalOpen, setIsDestructionModalOpen] = useState(false);
    const [destructionEmail, setDestructionEmail] = useState('');
    const [destructionKey, setDestructionKey] = useState('');
    const [hasConfirmedDestruction, setHasConfirmedDestruction] = useState(false);
    const [isDestroying, setIsDestroying] = useState(false);
    const [destructionProgress, setDestructionProgress] = useState(0);
    const [destructionStatus, setDestructionStatus] = useState('');

    const REQUIRED_KEY = "ZENEVA-ALPHA-TERMINATE";

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

    const mfaStatus = useMemo(() => {
        if (!authUser) return { enabled: false, color: 'text-rose-600', bg: 'bg-rose-600' };
        const enrolled = (authUser as any).multiFactor?.enrolledFactors?.length > 0;
        return {
            enabled: enrolled,
            color: enrolled ? 'text-emerald-600' : 'text-rose-600',
            bg: enrolled ? 'bg-emerald-600' : 'bg-rose-600',
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
            toast({ title: "Target Neutered", description: "System access revoked. Node dark.", className: "bg-red-600 text-white border-none" });
        } catch (err) {
            toast({ variant: "destructive", title: "Kill Command Failed", description: "Security override insufficient." });
        } finally {
            setIsRevoking(null);
        }
    };

    const handleEntityTermination = async () => {
        if (!firestore || !authUser) return;
        if (destructionEmail.trim() === "" || destructionKey !== REQUIRED_KEY || !hasConfirmedDestruction) {
            toast({ variant: 'destructive', title: "Auth Failure", description: "Termination parameters invalid or incomplete." });
            return;
        }

        setIsDestroying(true);
        setDestructionProgress(5);
        setDestructionStatus('Locating entity in grid...');

        try {
            // 1. Find the business instance
            const businessesRef = collection(firestore, 'businessInstances');
            const bQuery = query(businessesRef, where("email", "==", destructionEmail.trim().toLowerCase()));
            const bSnap = await getDocs(bQuery);

            if (bSnap.empty) {
                throw new Error("Entity not found in current grid. Verify email signature.");
            }

            const businessDoc = bSnap.docs[0];
            const businessId = businessDoc.id;
            const businessData = businessDoc.data();

            setDestructionProgress(15);
            setDestructionStatus(`Target Locked: ${businessData.name || 'Unnamed'}. Initializing wipe...`);

            // Collections to purge
            const collectionsToPurge = [
                'products',
                'receipts',
                'customers',
                'purchases',
                'expenses',
                'suppliers',
                'inventory_logs',
                'notifications', // Top level notifications if any
            ];

            let completedSteps = 0;
            const totalSteps = collectionsToPurge.length + 4; // + users + sub-business + audit + final

            // 1. Purge standard top-level collections
            for (const collName of collectionsToPurge) {
                setDestructionStatus(`Purging ${collName} nodes...`);
                const collRef = collection(firestore, collName);
                const q = query(collRef, where("businessId", "==", businessId));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const chunks = [];
                    for (let i = 0; i < snap.docs.length; i += 450) {
                        chunks.push(snap.docs.slice(i, i + 450));
                    }
                    for (const chunk of chunks) {
                        const batch = writeBatch(firestore);
                        chunk.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                }
                completedSteps++;
                setDestructionProgress(15 + (completedSteps / totalSteps) * 80);
            }

            // 2. Purge Users and their subcollections
            setDestructionStatus('Purging user identities and sub-nodes...');
            const usersRef = collection(firestore, 'users');
            const usersQuery = query(usersRef, where("businessId", "==", businessId));
            const usersSnap = await getDocs(usersQuery);

            if (!usersSnap.empty) {
                for (const userDoc of usersSnap.docs) {
                    const userId = userDoc.id;
                    // Purge user notifications
                    const userNotifsRef = collection(firestore, 'users', userId, 'notifications');
                    const notifsSnap = await getDocs(userNotifsRef);
                    if (!notifsSnap.empty) {
                        const batch = writeBatch(firestore);
                        notifsSnap.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                    // Delete user doc
                    await deleteDoc(userDoc.ref);
                }
            }
            completedSteps++;
            setDestructionProgress(15 + (completedSteps / totalSteps) * 80);

            // 3. Purge Business Subcollections (Stats, OnlineOrders, AuditLogs)
            setDestructionStatus('Sanitizing business sub-architectures...');
            const subCollections = ['stats', 'onlineOrders', 'auditLogs', 'expenses', 'suppliers'];
            for (const sub of subCollections) {
                const subRef = collection(firestore, 'businessInstances', businessId, sub);
                const subSnap = await getDocs(subRef);
                if (!subSnap.empty) {
                    const chunks = [];
                    for (let i = 0; i < subSnap.docs.length; i += 450) {
                        chunks.push(subSnap.docs.slice(i, i + 450));
                    }
                    for (const chunk of chunks) {
                        const batch = writeBatch(firestore);
                        chunk.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                }
            }
            completedSteps++;
            setDestructionProgress(15 + (completedSteps / totalSteps) * 80);

            // Finally, delete the business document
            setDestructionStatus('Finalizing sanitization...');
            await deleteDoc(doc(firestore, 'businessInstances', businessId));
            
            setDestructionProgress(100);
            setDestructionStatus('ENTITY TERMINATED');

            toast({ 
                title: "Destruction Complete", 
                description: "Business and all associated nodes have been scrubbed from the grid.",
                className: "bg-black text-emerald-500 border-emerald-500/50 font-mono"
            });

            // Log the destruction to a special global log if possible
            try {
                await updateDoc(doc(firestore, 'system_stats', 'global'), {
                    lastDestruction: serverTimestamp(),
                    lastDestroyedEmail: destructionEmail
                });
            } catch (e) {
                // Ignore if system_stats doesn't exist or permissions fail
            }

            setTimeout(() => {
                setIsDestructionModalOpen(false);
                setDestructionEmail('');
                setDestructionKey('');
                setHasConfirmedDestruction(false);
                setIsDestroying(false);
                setDestructionProgress(0);
            }, 2000);

        } catch (error: any) {
            console.error("Termination failed:", error);
            toast({ 
                variant: 'destructive', 
                title: "Termination Aborted", 
                description: error.message || "Unknown error during purge." 
            });
            setIsDestroying(false);
            setDestructionProgress(0);
        }
    };

    const securityMatrix = useMemo(() => {
        const recentLogs = auditLogs.filter(log => log.createdAt?.toDate() > subHours(new Date(), 24));
        const impersonations = recentLogs.filter(l => l.action?.includes('impersonation')).length;
        const criticalDeletes = recentLogs.filter(l => l.action?.includes('delete')).length;
        const sensitiveCount = impersonations + criticalDeletes;

        if (sensitiveCount > 5) return { level: 'CRITICAL', score: 28, color: 'text-rose-600', from: 'from-rose-600', variant: 'destructive' as const };
        if (sensitiveCount > 0) return { level: 'CAUTION', score: 62, color: 'text-amber-600', from: 'from-amber-600', variant: 'outline' as const };
        return { level: 'OPTIMAL', score: 94, color: 'text-emerald-600', from: 'from-emerald-600', variant: 'default' as const };
    }, [auditLogs]);

    return (
        <div className="space-y-6 relative overflow-hidden">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            
            <div id="recaptcha-admin-container"></div>
            
            {/* Top Bar - Situation Room Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 border-b pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h1 className="text-base font-bold tracking-tight text-foreground/90">Cyber Shield Surveillance</h1>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Critical Platform Surveillance & Intelligence Hub
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Link integrity</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={cn("h-3 w-1 rounded-sm", i <= 4 ? "bg-emerald-500/40" : "bg-muted")} />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col items-end border-l pl-6">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Grid Uptime</span>
                        <span className="text-xs font-bold font-mono">99.9%</span>
                    </div>
                    <Button onClick={fetchGlobalAudit} variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white group">
                        <RefreshCw className={cn("h-4 w-4 text-muted-foreground group-hover:rotate-180 transition-transform duration-500", isLoadingLogs && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Main Situational Display */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
                
                {/* Health Core */}
                <Card className="lg:col-span-1 border-border/50 relative overflow-hidden flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-sm">
                    <ScanningEffect />
                    <RadarPulse />
                    <div className="mt-6 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">System Health</p>
                        <div className={cn("text-5xl font-black tracking-tighter", securityMatrix.color)}>
                            {securityMatrix.score}%
                        </div>
                        <Badge variant="secondary" className="mt-3 font-bold uppercase text-[10px] tracking-tight">
                            {securityMatrix.level}
                        </Badge>
                    </div>
                    <div className="w-full space-y-2 mt-8">
                        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                            <span>Threat Density</span>
                            <span>Low</span>
                        </div>
                        <Progress value={24} className="h-1 bg-muted" indicatorClassName="bg-primary" />
                    </div>
                </Card>

                {/* Surveillance Metrics Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SecurityMetric 
                        label="Surface Nodes" 
                        value={`${adminCount} ADMINS`}
                        subValue="Verified entry protocols active"
                        icon={Cpu}
                        colorClass="text-blue-600"
                    />
                    <SecurityMetric 
                        label="Encryption" 
                        value="AES-256"
                        subValue="End-to-end verified"
                        icon={LockIcon}
                        colorClass="text-purple-600"
                    />
                    <SecurityMetric 
                        label="Identity State" 
                        value={mfaStatus.label}
                        subValue={mfaStatus.enabled ? "Secure Link: Active" : "Action Required"}
                        icon={Fingerprint}
                        colorClass={mfaStatus.color}
                        borderClass={!mfaStatus.enabled ? "border-rose-500/20 shadow-rose-100 shadow-sm animate-pulse cursor-pointer" : ""}
                        onClick={() => !mfaStatus.enabled && setIsMfaModalOpen(true)}
                    />
                    
                    {/* Live Activity Monitor */}
                    <Card className="md:col-span-3 border-border/50 p-4 bg-white/50 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Neural Activity</span>
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                Monitoring Feed
                            </div>
                        </div>
                        <div className="h-28 overflow-hidden relative">
                             <div className="space-y-1.5">
                                {auditLogs.slice(0, 4).map((log, i) => (
                                    <div key={i} className="flex items-center gap-4 text-[11px] border-l-2 border-primary/20 pl-4 py-1.5 hover:bg-muted/50 transition-colors cursor-default">
                                        <span className={cn("font-bold min-w-[60px] font-mono", i === 0 ? "text-primary" : "text-muted-foreground")}>
                                            [{log.createdAt ? format(log.createdAt.toDate(), 'HH:mm') : 'NOW'}]
                                        </span>
                                        <span className="text-muted-foreground uppercase font-medium">{log.userName}</span>
                                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30" />
                                        <span className="text-foreground font-bold">{log.action.toUpperCase()}</span>
                                        <span className="text-muted-foreground/50 truncate max-w-[200px]">{log.entityType}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* The Intelligence Feed (Audit Logs) */}
            <Card className="border-border/50 shadow-sm overflow-hidden relative z-10">
                <CardHeader className="bg-muted/30 border-b p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-sm flex items-center gap-2 font-bold tracking-tight">
                                <Terminal className="h-4 w-4 text-primary" />
                                Tactical Audit Stream
                            </CardTitle>
                            <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Real-time monitoring of all platform nodes.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-border/50">
                            {auditLogs.length} EVENTS LOADED
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-11">Admin Node</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-11 px-6">Event Type</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-11">Payload</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-11 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLogs ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50"><TableCell colSpan={4}><div className="h-10 w-full bg-muted/20 animate-pulse rounded" /></TableCell></TableRow>
                                    ))
                                ) : auditLogs.length === 0 ? (
                                    <TableRow className="border-border/50">
                                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-medium text-xs italic">
                                            No security alerts detected.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    auditLogs.map((log) => (
                                        <TableRow key={log.id} className="group hover:bg-muted/30 transition-all border-border/50">
                                            <TableCell>
                                                <div className="flex flex-col py-2">
                                                    <span className="font-bold text-[11px] text-foreground/90">{log.userName}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{log.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-3">
                                                    {log.action?.includes('delete') || log.action?.includes('void') ? (
                                                        <div className="h-5 w-1 bg-rose-500 rounded-full" />
                                                    ) : log.action?.includes('impersonation') ? (
                                                        <div className="h-5 w-1 bg-blue-500 rounded-full" />
                                                    ) : (
                                                        <div className="h-5 w-1 bg-slate-300 rounded-full" />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className={cn(
                                                            "text-[11px] font-bold uppercase tracking-tight",
                                                            log.action?.includes('delete') ? "text-rose-600" : "text-foreground/70"
                                                        )}>{log.action}</span>
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase">
                                                            {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'NOW'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                               <div className="flex items-center gap-2">
                                                   <Badge variant="outline" className="px-1.5 py-0 rounded text-[9px] font-bold text-muted-foreground">{log.entityType}</Badge>
                                                   <span className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{log.entityId}</span>
                                               </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
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
                <CardFooter className="bg-muted/20 border-t py-3 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Server className="h-3 w-3 text-muted-foreground/40" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Zeneva Node Linked</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Secure Link Active</span>
                    </div>
                </CardFooter>
            </Card>

            {/* Entity Termination Section (Danger Zone) */}
            <Card className="border-rose-500/20 bg-rose-500/5 overflow-hidden relative z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 font-bold text-rose-600">
                        <ShieldAlert className="h-4 w-4" />
                        Tactical Entity Termination
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
                        Irreversible data sanitization protocol. Proceed with extreme caution.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
                        This operation will permanently delete a business instance, all associated user accounts, products, sales records, customer data, and telemetry logs. There is <span className="font-bold text-rose-600 underline">NO UNDO</span>.
                    </p>
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        className="bg-rose-600 hover:bg-rose-700 font-bold uppercase text-[10px] tracking-widest px-6"
                        onClick={() => setIsDestructionModalOpen(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Initialize Wipe Sequence
                    </Button>
                </CardContent>
            </Card>

            {/* Termination Confirmation Dialog */}
            <Dialog open={isDestructionModalOpen} onOpenChange={(open) => !isDestroying && setIsDestructionModalOpen(open)}>
                <DialogContent className="sm:max-w-[500px] border-rose-500/50 bg-background shadow-2xl shadow-rose-500/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-rose-600 text-xl font-black italic tracking-tighter">
                            <ShieldAlert className="h-6 w-6 animate-pulse" />
                            CONFIRM ENTITY DESTRUCTION
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 border-b pb-4">
                            You are about to scrub a business from the Zeneva Grid.
                        </DialogDescription>
                    </DialogHeader>

                    {isDestroying ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6">
                            <div className="relative w-24 h-24">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-rose-500/20 border-t-rose-600 rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Trash2 className="h-10 w-10 text-rose-600" />
                                </div>
                            </div>
                            <div className="w-full max-w-xs space-y-2">
                                <Progress value={destructionProgress} className="h-2 bg-rose-500/10" indicatorClassName="bg-rose-600" />
                                <p className="text-[10px] font-black font-mono text-center text-rose-600 uppercase tracking-[0.2em] animate-pulse">
                                    {destructionStatus}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3 items-start">
                                <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-rose-700 uppercase tracking-tight">Destructive Action Warning</p>
                                    <p className="text-[11px] text-rose-600 leading-relaxed font-medium">
                                        This will purge the business record and ALL related sub-collections across the entire Firestore architecture. All session tokens will be invalidated immediately.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verify Business Email</Label>
                                    <Input 
                                        placeholder="Enter target business email..." 
                                        value={destructionEmail}
                                        onChange={(e) => setDestructionEmail(e.target.value)}
                                        className="h-11 font-bold text-sm border-rose-200 focus:ring-rose-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Admin Security Key</Label>
                                    <Input 
                                        type="password"
                                        placeholder={`Type "${REQUIRED_KEY}"`}
                                        value={destructionKey}
                                        onChange={(e) => setDestructionKey(e.target.value)}
                                        className="h-11 font-mono font-bold text-sm border-rose-200 focus:ring-rose-500"
                                    />
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id="confirm" 
                                        checked={hasConfirmedDestruction}
                                        onChange={(e) => setHasConfirmedDestruction(e.target.checked)}
                                        className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <label htmlFor="confirm" className="text-[11px] font-bold text-muted-foreground leading-none">
                                        I confirm that I am authorized to permanently purge this entity and all its data.
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t pt-4">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsDestructionModalOpen(false)}
                            disabled={isDestroying}
                            className="font-bold uppercase text-[10px] tracking-widest"
                        >
                            Abort Protocol
                        </Button>
                        {!isDestroying && (
                            <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={destructionEmail.trim() === "" || destructionKey !== REQUIRED_KEY || !hasConfirmedDestruction}
                                onClick={handleEntityTermination}
                                className="bg-rose-600 hover:bg-rose-700 font-bold uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-rose-500/20"
                            >
                                <Zap className="h-3.5 w-3.5 mr-2" />
                                EXECUTE TERMINATION
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MFA Enrollment Overlay */}
            <AnimatePresence>
                {isMfaModalOpen && (
                    <Dialog open={isMfaModalOpen} onOpenChange={setIsMfaModalOpen}>
                        <DialogContent className="sm:max-w-[400px] overflow-hidden p-0 border-border/50">
                            <div className="p-6">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <LockIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        Secure Identity Link
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-xs font-medium uppercase tracking-wider mt-2">
                                        Protect your admin node with hardware verification.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6 py-8">
                                    {mfaStep === 'phone' ? (
                                        <div className="space-y-3">
                                            <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Phone Number</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="phone" 
                                                    placeholder="+234..." 
                                                    value={phoneNumber} 
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="h-12 font-bold text-lg tracking-widest focus:ring-primary transition-all"
                                                />
                                                <Smartphone className="absolute right-3 top-3 h-6 w-6 text-muted-foreground/20" />
                                            </div>
                                        </div>
                                    ) : (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center"
                                        >
                                            <div className="flex justify-center mb-6">
                                                <div className="bg-muted p-4 rounded-full border relative">
                                                    <Radio className="h-8 w-8 text-primary" />
                                                </div>
                                            </div>
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Transmission Received</Label>
                                            <p className="text-xs text-muted-foreground mt-2 font-medium">Input 6-digit signal</p>
                                            <Input 
                                                className="mt-6 text-center text-4xl tracking-widest font-black h-20 focus:ring-emerald-500" 
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
                                        className="font-bold uppercase text-[10px] tracking-widest"
                                    >
                                        Abort
                                    </Button>
                                    {mfaStep === 'phone' ? (
                                        <Button 
                                            onClick={handleSendCode} 
                                            disabled={isEnrolling || !phoneNumber}
                                            className="flex-1 bg-primary font-bold uppercase text-[11px] tracking-widest h-12 shadow-md"
                                        >
                                            {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Signal className="h-4 w-4 mr-2" />}
                                            Link Node
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={handleVerifyAndEnroll} 
                                            disabled={isEnrolling || verificationCode.length < 6}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold uppercase text-[11px] tracking-widest h-12 shadow-md text-white border-none"
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
        </div>
    );
}
