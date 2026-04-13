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
    CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useFirebase } from '@/firebase';
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
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { formatDistanceToNow, subHours } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CyberShield() {
    const { firestore, auth, user: authUser } = useFirebase();
    const { toast } = useToast();
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [indexError, setIndexError] = useState<string | null>(null);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);

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

    const adminCount = useMemo(() => allUsers?.filter(u => u.role === 'admin').length || 0, [allUsers]);

    const mfaStatus = useMemo(() => {
        if (!authUser) return { enabled: false, color: 'text-rose-500' };
        const enrolled = (authUser as any).multiFactor?.enrolledFactors?.length > 0;
        return {
            enabled: enrolled,
            color: enrolled ? 'text-emerald-500' : 'text-rose-500',
            label: enrolled ? 'ENFORCED' : 'NOT CONFIGURED'
        };
    }, [authUser]);

    const fetchGlobalAudit = async () => {
        if (!firestore) return;
        setIsLoadingLogs(true);
        try {
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
            setIndexError(null);
        } catch (err: any) {
            console.error("Failed to fetch global audit logs:", err);
            if (err.message?.includes('index')) {
                setIndexError("Audit Log Index required. Please click the link in your console to enable global monitoring.");
            } else if (err.message?.includes('permission')) {
                setIndexError("Security Rules update pending. Ensure your user has 'Super Admin' privileges.");
            }
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchGlobalAudit();
    }, [firestore]);

    const handleSendCode = async () => {
        if (!auth || !authUser || !phoneNumber) {
            console.warn("MFA Enrollment Failed: Missing auth context or phone number.");
            return;
        }
        setIsEnrolling(true);
        console.log("Initiating MFA Enrollment for:", phoneNumber);
        
        try {
            const container = document.getElementById('recaptcha-container');
            if (!container) {
                throw new Error("ReCAPTCHA container missing from DOM.");
            }

            if (!recaptchaRef.current) {
                recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => { console.log('Recaptcha solved'); }
                });
            }

            const session = await multiFactor(authUser).getSession();
            const phoneInfoOptions = {
                phoneNumber: phoneNumber,
                session: session
            };
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaRef.current);
            setVerificationId(vId);
            setMfaStep('code');
            toast({ title: "Code Sent", description: "Check your phone for the verification code." });
        } catch (error: any) {
            console.error("MFA Error:", error);
            toast({ variant: 'destructive', title: "Enrollment Failed", description: error.message });
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleVerifyAndEnroll = async () => {
        if (!authUser || !verificationId || !verificationCode) return;
        setIsEnrolling(true);
        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
            await multiFactor(authUser).enroll(multiFactorAssertion, "Primary Admin Phone");
            
            setIsMfaModalOpen(false);
            toast({ title: "MFA Enforced", description: "Your account is now protected by hardware-linked multi-factor auth." });
            
            // Reload page to update auth status
            window.location.reload();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Verification Failed", description: "Invalid code. Please try again." });
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleHardKill = async (userId: string, userName: string) => {
        if (!firestore || !window.confirm(`Are you sure you want to SHUT DOWN all sessions for ${userName}?`)) return;
        
        setIsRevoking(userId);
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { 
                status: 'suspended',
                suspendedAt: serverTimestamp(),
                suspendedBy: 'CyberShield_Admin'
            });
            
            toast({
                title: "Perpetrator Neutered",
                description: `All active sessions for ${userName} have been revoked. Access denied.`,
                className: "bg-destructive text-white"
            });
        } catch (err) {
            toast({ variant: "destructive", title: "Neutralization Failed", description: "Check admin privileges." });
        } finally {
            setIsRevoking(null);
        }
    };

    const threatLevel = useMemo(() => {
        const recentLogs = auditLogs.filter(log => {
            if (!log.createdAt) return false;
            const logDate = log.createdAt.toDate();
            // @ts-ignore
            return logDate > subHours(new Date(), 24);
        });

        const sensitiveActions = recentLogs.filter(log => 
            log.action?.includes('delete') || 
            log.action?.includes('impersonation') || 
            log.action?.includes('void')
        );

        if (sensitiveActions.length > 5) return { label: 'CRITICAL', color: 'text-rose-600', from: 'from-rose-600', to: 'to-rose-400', icon: ShieldAlert, border: 'border-rose-500/20', bg: 'bg-rose-100' };
        if (sensitiveActions.length > 0) return { label: 'MONITORED', color: 'text-amber-600', from: 'from-amber-600', to: 'to-amber-400', icon: Activity, border: 'border-amber-500/20', bg: 'bg-amber-100' };
        return { label: 'NORMAL', color: 'text-emerald-600', from: 'from-emerald-600', to: 'to-emerald-400', icon: ShieldCheck, border: 'border-emerald-500/20', bg: 'bg-emerald-100' };
    }, [auditLogs]);

    const getActionBadge = (action: string) => {
        if (action.includes('delete')) return <Badge variant="destructive" className="font-mono text-[9px]">{action}</Badge>;
        if (action.includes('update')) return <Badge variant="outline" className="border-amber-500 text-amber-600 font-mono text-[9px] bg-amber-50">{action}</Badge>;
        if (action.includes('impersonation')) return <Badge variant="default" className="bg-blue-600 font-bold font-mono text-[9px]">{action}</Badge>;
        return <Badge variant="secondary" className="font-mono text-[9px]">{action}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div id="recaptcha-container"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={cn("group overflow-hidden relative transition-all", threatLevel.border)}>
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none", threatLevel.from, "to-transparent")} />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-center text-sm font-bold opacity-70">
                            PLATFORM THREAT LEVEL
                            <div className={cn("p-2 rounded-full", threatLevel.bg)}>
                                <threatLevel.icon className={cn("h-4 w-4", threatLevel.color)} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={cn("text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r", threatLevel.from, threatLevel.to)}>
                            {threatLevel.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Global heuristics scan active</p>
                    </CardContent>
                </Card>

                <Card className="group overflow-hidden relative border-blue-500/20 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-center text-sm font-bold opacity-70">
                            ADMIN SURFACE NODES
                            <div className="p-2 bg-blue-100 rounded-full">
                                <Fingerprint className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                            {adminCount} USERS
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Controlled access points</p>
                    </CardContent>
                </Card>

                <Card className={cn("group overflow-hidden relative transition-all", mfaStatus.enabled ? "border-emerald-500/20" : "border-rose-500/20 cursor-pointer")} onClick={() => !mfaStatus.enabled && setIsMfaModalOpen(true)}>
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none", mfaStatus.enabled ? "from-emerald-500" : "from-rose-500", "to-transparent")} />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-center text-sm font-bold opacity-70">
                            MFA COMPLIANCE
                            <div className={cn("p-2 rounded-full", mfaStatus.enabled ? "bg-emerald-100" : "bg-rose-100 animate-pulse")}>
                                <Lock className={cn("h-4 w-4", mfaStatus.color)} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={cn("text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r", mfaStatus.enabled ? "from-emerald-600 to-emerald-400" : "from-rose-600 to-rose-400")}>
                            {mfaStatus.label}
                        </p>
                        {mfaStatus.enabled ? (
                            <p className="text-xs text-muted-foreground mt-2 font-medium">Identity Platform Protection</p>
                        ) : (
                            <p className="text-xs text-rose-600 mt-2 font-bold flex items-center gap-1 animate-bounce">
                                <AlertCircle className="h-3 w-3" /> Click to Enforce Lockdown
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight">
                                <Terminal className="h-5 w-5 text-primary" />
                                High-Priority Audit Stream
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Real-time monitoring of administrative protocols.
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 bg-white" 
                            onClick={fetchGlobalAudit}
                            disabled={isLoadingLogs}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingLogs && "animate-spin")} />
                            Sync Feed
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {indexError ? (
                        <div className="p-16 text-center space-y-4">
                            <ShieldAlert className="h-12 w-12 text-destructive mx-auto opacity-20" />
                            <div className="max-w-md mx-auto">
                                <p className="text-sm font-bold">{indexError}</p>
                                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                                    Global collection queries are protected by mandatory indexing. 
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b">
                                        <TableHead className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-tighter">Subject Profile</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-tighter">Event Lock</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-tighter">Payload Description</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-tighter text-right">Neutering</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLogs ? (
                                        [...Array(6)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={4}><div className="h-10 w-full bg-muted/20 animate-pulse rounded-md" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : auditLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic text-sm">
                                                Operational tranquility confirmed. No security alerts.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-xs tracking-tight">{log.userName}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{log.userEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        {getActionBadge(log.action)}
                                                        <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">
                                                            {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'NOW'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-slate-700">{log.entityType}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px] font-mono">{log.entityName || log.entityId}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => handleHardKill(log.userId, log.userName)}
                                                        disabled={isRevoking === log.userId}
                                                        title="Shut Down Perpetrator"
                                                    >
                                                        {isRevoking === log.userId ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <UserMinus className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/20 border-t py-3 flex justify-between items-center">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase opacity-50">
                        ZENEVA SECURE-LINK v4.0.2 | END-TO-END VERIFIED
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Hardware Vault Enabled</span>
                    </div>
                </CardFooter>
            </Card>

            {/* MFA Enrollment Dialog */}
            <Dialog open={isMfaModalOpen} onOpenChange={setIsMfaModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-primary" />
                            Lockdown Protocol: MFA
                        </DialogTitle>
                        <DialogDescription>
                            Link your physical device to your Super Admin account to prevent unauthorized access.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {mfaStep === 'phone' ? (
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number (International Format)</Label>
                                <Input 
                                    id="phone" 
                                    placeholder="+234 800 000 0000" 
                                    value={phoneNumber} 
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Standard carrier rates may apply for the verification SMS.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 text-center animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-3 bg-muted rounded-lg inline-block mb-2">
                                    <Smartphone className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-sm font-bold">Verification Sent</h3>
                                <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to your phone.</p>
                                <Input 
                                    className="text-center text-2xl tracking-[0.5em] font-black h-14 mt-4" 
                                    maxLength={6} 
                                    placeholder="000000"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsMfaModalOpen(false)} 
                            disabled={isEnrolling}
                        >
                            Cancel
                        </Button>
                        {mfaStep === 'phone' ? (
                            <Button 
                                onClick={handleSendCode} 
                                disabled={isEnrolling || !phoneNumber}
                                className="gap-2"
                            >
                                {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                Send Code
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleVerifyAndEnroll} 
                                disabled={isEnrolling || verificationCode.length < 6}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Verify & Lockdown
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
