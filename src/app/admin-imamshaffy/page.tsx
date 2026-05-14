

'use client';
import FollowUpCenter from '@/components/admin/follow-up-center';
import PlatformRevenueChart from '@/components/admin/charts/PlatformRevenueChart';
import UserGrowthChart from '@/components/admin/charts/UserGrowthChart';
import TransactionVolumeChart from '@/components/admin/charts/TransactionVolumeChart';
import RevenueGrowthIndexChart from '@/components/admin/charts/RevenueGrowthIndexChart';
import PlanDistributionChart from '@/components/admin/charts/PlanDistributionChart';
import RetentionCohortChart from '@/components/admin/charts/RetentionCohortChart';
import FeatureStickinessChart from '@/components/admin/charts/FeatureStickinessChart';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import {
    LineChart as ReLineChart,
    BarChart as ReBarChart,
    PieChart as RePieChart,
    XAxis,
    YAxis,
    Bar,
    Line,
    Pie,
    Cell,
    CartesianGrid,
    Legend,
    Tooltip as ReTooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    Users,
    Activity,
    DollarSign,
    Package,
    Building,
    Loader,
    TrendingUp,
    FileText,
    UserCheck,
    ShoppingCart,
    PieChart as PieChartIcon,
    Crown,
    Calendar as CalendarIcon,
    Clock,
    XCircle,
    Layers,
    Newspaper,
    UserCog,
    Check,
    Ban,
    Briefcase,
    UserX,
    ShieldCheck,
    HeartPulse,
    Bot,
    BarChart2,
    AlertTriangle,
    Heart,
    Megaphone,
    MapPin,
    LogIn,
    AlertCircle,
    ArrowRight,
    Search,
    Filter,
    ArrowUpDown,
    Download,
    Settings,
    Database,
    RefreshCcw,
    Trash2,
    PartyPopper,
    Store,
    Trophy,
    CheckCircle,
    Globe,
    Mail,
    Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo, useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import {
    collection,
    query,
    orderBy,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
    collectionGroup,
    getDoc,
    deleteDoc,
} from 'firebase/firestore';
import { format, formatDistanceToNow, subDays, differenceInDays } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { logAuditEvent } from '@/lib/audit';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { BusinessInstance, UserProfile, Purchase, Receipt, Product } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePOS } from '@/context/pos-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CyberShield from '@/components/admin/cyber-shield';

const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const isRevenue = payload[0].name === 'Revenue';
        return (
            <div className="bg-background/80 backdrop-blur-sm p-3 border rounded-lg shadow-lg">
                <p className="text-sm font-bold mb-1">{label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} className="text-sm" style={{ color: pld.fill || pld.stroke }}>
                        {`${pld.name}: ${isRevenue ? '₦' : ''}${pld.value.toLocaleString()}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomTooltip = (props: any) => {
    return <CustomTooltipContent {...props} />;
};

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {value}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const UserPresence = ({ lastSeen }: { lastSeen: any }) => {
    if (!lastSeen?.toDate) {
        return <span className="text-muted-foreground text-xs">Never</span>;
    }
    const lastSeenDate = lastSeen.toDate();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const isOnline = lastSeenDate > fiveMinutesAgo;

    return (
        <div className="flex items-center gap-2">
            {isOnline ? (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
            ) : (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/50"></span>
                </span>
            )}
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(lastSeenDate, { addSuffix: true })}</span>
        </div>
    );
};

const PIE_CHART_COLORS = {
    Healthy: '#22c55e', // Bright Green
    'Needs Attention': '#eab308', // Bright Yellow/Amber
    'At Risk': '#ef4444', // Bright Red
    Pro: '#3b82f6', // Bright Blue
    Business: '#8b5cf6', // Bright Purple
    Starter: '#94a3b8', // Slate/Gray (visible but distinct)
    Lifetime: '#10b981' // Emerald
};

function BusinessDetailDialog({ open, onOpenChange, title, description, businesses, users, isInfoOnly }: { open: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, businesses: BusinessInstance[], users: UserProfile[] | null, isInfoOnly?: boolean }) {
    const businessOwners = useMemo(() => {
        if (!users || isInfoOnly) return {};
        return businesses.reduce((acc, b) => {
            const owner = users.find(u => u.id === b.ownerId);
            acc[b.id] = owner?.name || 'N/A';
            return acc;
        }, {} as Record<string, string>);
    }, [businesses, users, isInfoOnly]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {!isInfoOnly && (
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Business Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Trial Expires</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {businesses.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.name}</TableCell>
                                        <TableCell>{businessOwners[b.id]}</TableCell>
                                        <TableCell><Badge variant="secondary" className="capitalize">{b.accessLevel === 'lifetime' ? 'Lifetime' : b.plan || 'starter'}</Badge></TableCell>
                                        <TableCell>{b.trialExpiresAt ? format(b.trialExpiresAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}

function UserListDialog({ open, onOpenChange, title, description, users, businesses }: { open: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, users: UserProfile[] | null, businesses: BusinessInstance[] | null }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Business</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(users || []).map(u => {
                                const biz = businesses?.find(b => b.id === u.businessId);
                                return (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{biz?.name || 'N/A'}</TableCell>
                                        <TableCell><Badge variant={u.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">{u.status || 'active'}</Badge></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function ZenevaMilestoneDialog({ open, onOpenChange, daysActive, totalSales, totalBusinesses, totalUsers, launchDate, averageSalesPerDay, averageReceiptsPerDay, platformAOV, arr, topLocation }: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    daysActive: number, 
    totalSales: number, 
    totalBusinesses: number, 
    totalUsers: number, 
    launchDate: Date,
    averageSalesPerDay: number,
    averageReceiptsPerDay: number,
    platformAOV: number,
    arr: number,
    topLocation: string
}) {
    const elementRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadCertificate = async () => {
        if (!elementRef.current) return;
        setIsExporting(true);
        toast({ title: "Generating Commemoration...", description: "Please wait while we render your high-fidelity milestone card." });
        try {
            const canvas = await html2canvas(elementRef.current, { 
                scale: 3, 
                backgroundColor: '#09090b',
                logging: false,
                useCORS: true
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `zeneva-milestone-${daysActive}days.png`;
            link.href = dataUrl;
            link.click();
            toast({ variant: "success", title: "Card Downloaded", description: "Your commemorative achievement card is now saved!" });
        } catch (e) {
            toast({ variant: "destructive", title: "Export Failed", description: "Unable to capture image canvas." });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-visible border-none bg-transparent backdrop-blur-none flex justify-center items-center shadow-none no-capture [&>button]:text-white/50">
                <DialogTitle className="sr-only">Zeneva OS Platform Genesis Milestone</DialogTitle>
                <DialogDescription className="sr-only">Commemorative dashboard visualizing operational growth and visionary trajectory.</DialogDescription>
                <div className="relative group max-w-3xl w-full mx-auto px-4" ref={elementRef}>
                    {/* Dynamic gradient background wrapper */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-emerald-500 to-cyan-500 rounded-[2.5rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                    
                    <div className="relative bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        
                        {/* COLUMN 1: ACHIEVEMENT BADGE */}
                        <div className="relative px-6 py-8 flex flex-col items-center text-center overflow-hidden">
                            {/* Atmospheric lighting */}
                            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/20 to-transparent pointer-events-none"></div>
                            <div className="absolute -right-24 -top-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                            
                            {/* Bouncing Trophy */}
                            <div className="relative bg-white/5 border border-white/10 p-5 rounded-3xl mt-2 mb-4 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-400/10 rounded-3xl blur-sm"></div>
                                <Trophy className="h-12 w-12 text-amber-400 relative z-10 animate-bounce" />
                            </div>

                            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-indigo-400 mb-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 select-none">Platform Genesis</span>
                            <h2 className="text-3xl font-black tracking-tight text-white select-none flex items-center gap-1">
                                ZENEVA OS
                            </h2>
                            
                            {/* Massive Counter */}
                            <div className="my-6 px-8 py-3 rounded-3xl bg-gradient-to-b from-white/[0.07] to-transparent border border-white/10 backdrop-blur-md shadow-[inset_0px_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden w-full max-w-[220px]">
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 leading-none select-none">
                                    {daysActive}
                                </div>
                                <div className="text-[9px] uppercase font-black tracking-[0.25em] text-cyan-400 mt-2 select-none">Days Online</div>
                            </div>

                            <p className="text-xs text-zinc-400 font-medium mb-6 leading-relaxed select-none max-w-[260px]">
                                Active on the grid since <span className="text-zinc-100 font-bold underline decoration-dotted decoration-indigo-400 underline-offset-2">{format(launchDate, 'PPP')}</span>.
                            </p>

                            {/* Grid Stats */}
                            <div className="w-full grid grid-cols-3 gap-2 bg-white/[0.03] border border-white/5 rounded-2xl p-3 mb-6 select-none">
                                <div className="flex flex-col p-1 items-center justify-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Accounts</span>
                                    <span className="text-sm font-black text-white mt-0.5">+{totalUsers}</span>
                                </div>
                                <div className="flex flex-col border-x border-white/10 p-1 items-center justify-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Coverage</span>
                                    <span className="text-sm font-black text-white mt-0.5">+{totalBusinesses}</span>
                                </div>
                                <div className="flex flex-col p-1 items-center justify-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Volume</span>
                                    <span className="text-sm font-black text-emerald-400 mt-0.5">+{totalSales.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Download Button */}
                            <Button onClick={handleDownloadCertificate} disabled={isExporting} size="sm" variant="outline" className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-2xl font-bold no-capture flex items-center justify-center gap-2 h-10 text-xs shadow-lg active:scale-[0.98] transition-transform mt-auto">
                                <Download className="h-3.5 w-3.5 text-zinc-300" /> {isExporting ? "Capturing..." : "Commemorate Badge"}
                            </Button>
                        </div>

                        {/* COLUMN 2: DYNAMIC DYNAMIC PLATFORM INTELLIGENCE */}
                        <div className="relative px-6 py-8 flex flex-col bg-white/[0.01] overflow-hidden">
                            <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

                            {/* Header */}
                            <div className="flex items-center gap-2 mb-4 text-emerald-400 font-extrabold tracking-widest text-[9px] uppercase">
                                <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Platform Intelligence Pulse
                            </div>
                            
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight select-none">Real-time Velocity</h3>
                            <p className="text-[10px] text-zinc-400 leading-relaxed mb-6 select-none">
                                Continuous live ecosystem calculations aggregated from all active platform storefront nodes.
                            </p>

                            {/* Timeline Flow replacement: Dynamic KPI stack */}
                            <div className="space-y-3 relative flex-grow select-none">
                                {/* Metric 1: Frequency Pulse */}
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                                            <Zap className="h-4 w-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Frequency Pulse</p>
                                            <p className="text-[11px] font-semibold text-zinc-300">Transaction Flow Rate</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">{(averageReceiptsPerDay || 0).toFixed(2)} <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">/day</span></p>
                                    </div>
                                </div>

                                {/* Metric 2: Daily Economic Volume */}
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                                            <DollarSign className="h-4 w-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Economic Volume</p>
                                            <p className="text-[11px] font-semibold text-zinc-300">Avg. Daily Sales GMV</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-400">₦{(averageSalesPerDay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>

                                {/* Metric 3: Basket size */}
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
                                            <ShoppingCart className="h-4 w-4 text-cyan-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Ecosystem Basket</p>
                                            <p className="text-[11px] font-semibold text-zinc-300">Average Order Value</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">₦{(platformAOV || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>

                                {/* Metric 4: Projections */}
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                                            <TrendingUp className="h-4 w-4 text-rose-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Software Target</p>
                                            <p className="text-[11px] font-semibold text-zinc-300">Annual Target Runrate</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">₦{(arr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Active Territory Footer Quote */}
                            <div className="mt-6 pt-4 text-[9px] text-zinc-500 border-t border-white/5 font-medium flex items-center justify-between select-none">
                                <span className="uppercase tracking-wider font-bold text-[8px]">Dominant Regional Territory:</span>
                                <span className="flex items-center gap-1 text-zinc-300 font-extrabold uppercase tracking-wide">
                                    <MapPin className="h-3 w-3 text-emerald-400" /> {topLocation}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UserDetailDialog({ user, business, open, onOpenChange }: { user: UserProfile | null, business: BusinessInstance | undefined, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{user?.name}'s Profile</DialogTitle>
                    <DialogDescription>Detailed view of user account and associated business data.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className='col-span-2'>
                            <Label className="text-xs text-muted-foreground font-bold">Business Name</Label>
                            <p className="font-medium text-lg">{business?.name || 'N/A'}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Contact Phone</Label>
                            <p className="font-medium">{business?.settings?.phone || user.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Contact Email</Label>
                            <p className="font-medium">{business?.settings?.email || user.email || 'N/A'}</p>
                        </div>

                        <div className='col-span-2'>
                            <Label className="text-xs text-muted-foreground font-bold">Address</Label>
                            <p className="font-medium">{business?.address || 'N/A'}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">State</Label>
                            <p className="font-medium">{business?.settings?.state || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Country</Label>
                            <p className="font-medium">{business?.settings?.country || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Currency</Label>
                            <p className="font-medium">{business?.settings?.currency || 'NGN'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Plan</Label>
                            <div className="mt-1">
                                {business ? (
                                    business.accessLevel === 'lifetime' ? <Badge variant="default" className="bg-green-600">Lifetime</Badge> : <Badge variant="secondary" className="capitalize">{business.plan || 'starter'}</Badge>
                                ) : <Badge variant="outline">N/A</Badge>}
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">User Status</Label>
                            <div className="mt-1">
                                <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                                    {user.status || 'active'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground font-bold">Last Seen</Label>
                            <div className="mt-1">
                                <UserPresence lastSeen={user.lastSeen} />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


function AdminDashboardContent({ users, businesses, products, receipts, purchases, applications, downloadClicks }: { users: UserProfile[] | null, businesses: BusinessInstance[] | null, products: Product[] | null, receipts: Receipt[] | null, purchases: Purchase[] | null, applications: any[] | null, downloadClicks?: any[] | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [grantEmail, setGrantEmail] = useState('');
    const [grantDate, setGrantDate] = useState<Date>();
    const [isGranting, setIsGranting] = useState(false);
    const [grantLifetime, setGrantLifetime] = useState(false);
    const [userStatusEmail, setUserStatusEmail] = useState('');
    const [isUserActive, setIsUserActive] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [planUserEmail, setPlanUserEmail] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'business'>('starter');
    const [isAssigningPlan, setIsAssigningPlan] = useState(false);
    const [detailModalState, setDetailModalState] = useState<{ open: boolean; title: string; description: string; businesses: BusinessInstance[]; isInfoOnly?: boolean }>({ open: false, title: '', description: '', businesses: [], isInfoOnly: false });
    const [userListModalState, setUserListModalState] = useState<{ open: boolean; title: string; description: string; users: UserProfile[] }>({ open: false, title: '', description: '', users: [] });
    const [isAgeMilestoneOpen, setIsAgeMilestoneOpen] = useState(false);
    const [certificateModalState, setCertificateModalState] = useState<{ open: boolean; title: string; description: string; value: string; icon: any; } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
    const [isSalesVelocityOpen, setIsSalesVelocityOpen] = useState(false);
    const [totalSubscribers, setTotalSubscribers] = useState(0);
    
    // --- PERSISTENT CACHE FOR OUTREACH ---
    const [outreachLogs, setOutreachLogs] = useState<any[]>([]);
    const [outreachSentCount, setOutreachSentCount] = useState(0);
    const [isOutreachLoading, setIsOutreachLoading] = useState(false);
    const [hasLoadedOutreach, setHasLoadedOutreach] = useState(false);

    const fetchOutreachData = async (force = false) => {
        // PREVENT REDUNDANT FETCHING: Return early if already loaded and not forced
        // This addresses the user's concern about cost and redundant reads.
        if (hasLoadedOutreach && !force) {
            console.log("Admin Intelligence: Outreach cache hit, skipping fetch.");
            return;
        }
        
        // Intel Mission: Query Firestore directly for logs to bypass 404 in static desktop environment
        try {
            const logsQuery = query(
                collection(firestore, 'follow_up_logs'),
                orderBy('sentAt', 'desc')
            );
            const snapshot = await getDocs(logsQuery);
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setOutreachLogs(logs);
            setOutreachSentCount(logs.filter(log => log.status !== 'failed').length);
            setHasLoadedOutreach(true);
        } catch (error) {
            console.error('Failed to fetch outreach logs from Firestore:', error);
        } finally {
            setIsOutreachLoading(false);
        }
    };

    useEffect(() => {
        const fetchSubscribers = async () => {
            try {
                // Intel Mission: Directly query the analytics overview document
                const analyticsRef = doc(firestore, 'admin_analytics', 'overview');
                const analyticsDoc = await getDoc(analyticsRef);
                
                if (analyticsDoc.exists()) {
                    const data = analyticsDoc.data();
                    if (data.appInstalls !== undefined) {
                        setTotalSubscribers(data.appInstalls);
                    } else if (data.totalUsers !== undefined) {
                        setTotalSubscribers(data.totalUsers);
                    }
                } else {
                    // Fallback to counting users if overview doc missing
                    setTotalSubscribers(users?.length || 0);
                }
            } catch (error) {
                console.error("Error fetching platform overview data from Firestore:", error);
            }
        };
        fetchSubscribers();
    }, [firestore]);

    // Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>('info');
    const [broadcastDuration, setBroadcastDuration] = useState('24'); // hours
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    // User Management State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'active' | 'joined' | 'name'>('active');
    const [filterPlan, setFilterPlan] = useState<'all' | 'starter' | 'pro' | 'business' | 'lifetime'>('all');

    const userOptions = useMemo(() => (users || []).map(user => ({
        value: user.email,
        label: `${user.name} (${user.email})`
    })), [users]);

    const handleDeleteApplication = async (appId: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            await deleteDoc(doc(firestore, 'job_applications', appId));
            toast({ title: "Intelligence Action: Target Deleted", description: "The career application has been removed from the sector." });
        } catch (error) {
            console.error("Error deleting application:", error);
            toast({ variant: "destructive", title: "Action Failed", description: "Failed to remove the application. Data integrity maintained." });
        }
    };

    const processedUsers = useMemo(() => {
        let result = users || [];

        // 1. Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(lowerQuery) ||
                u.email.toLowerCase().includes(lowerQuery) ||
                (businesses?.find(b => b.id === u.businessId)?.name || '').toLowerCase().includes(lowerQuery)
            );
        }

        // 2. Filter by Plan
        if (filterPlan !== 'all') {
            result = result.filter(u => {
                const business = businesses?.find(b => b.id === u.businessId);
                // If no business, assume starter/no plan unless looking for strictly starter
                if (!business) return filterPlan === 'starter';

                if (filterPlan === 'lifetime') return business.accessLevel === 'lifetime';
                if (filterPlan === 'starter') return (!business.plan || business.plan === 'starter') && business.accessLevel !== 'lifetime';
                return business.plan === filterPlan && business.accessLevel !== 'lifetime';
            });
        }

        // 3. Sort
        return [...result].sort((a, b) => {
            if (sortBy === 'active') { // Most recent first
                const dateA = a.lastSeen?.toDate ? a.lastSeen.toDate() : new Date(0);
                const dateB = b.lastSeen?.toDate ? b.lastSeen.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            } else if (sortBy === 'joined') { // Newest first
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            } else {
                return a.name.localeCompare(b.name);
            }
        });
    }, [users, businesses, searchQuery, filterPlan, sortBy]);

    const platformAnalytics = useMemo(() => {
        const activeBusinesses = businesses?.filter(b => b.status !== 'deleted') || [];
        const productsByBusiness = (products || []).reduce((acc, p) => {
            if (!acc[p.businessId]) acc[p.businessId] = [];
            acc[p.businessId].push(p);
            return acc;
        }, {} as Record<string, Product[]>);

        const receiptsByBusiness = (receipts || []).reduce((acc, r) => {
            if (!acc[r.businessId]) acc[r.businessId] = [];
            acc[r.businessId].push(r);
            return acc;
        }, {} as Record<string, Receipt[]>);

        const activatedBusinessesList = activeBusinesses.filter(b => {
            const busProducts = productsByBusiness[b.id] || [];
            const busReceipts = receiptsByBusiness[b.id] || [];
            return busProducts.length >= 10 && busReceipts.length >= 1;
        });

        const fourteenDaysAgo = subDays(new Date(), 14);
        const businessesWithRecentSales = new Set(
            (receipts || []).filter(r => r.createdAt.toDate() > fourteenDaysAgo).map(r => r.businessId)
        );
        const atRiskBusinesses = activeBusinesses.filter(b => !businessesWithRecentSales.has(b.id));

        const payingBusinessesList = activeBusinesses.filter(b => {
            if (b.accessLevel === 'lifetime') return false;
            if (b.plan !== 'pro' && b.plan !== 'business') return false;
            if (b.trialExpiresAt && b.trialExpiresAt.toDate() > new Date()) return false;
            return true;
        });

        const healthScores = activeBusinesses.map(b => (b.settings?.businessAnalysis as any)?.health?.score ?? -1);
        const healthDistribution = {
            healthy: healthScores.filter(s => s >= 70).length,
            attention: healthScores.filter(s => s >= 40 && s < 70).length,
            atRisk: healthScores.filter(s => s >= 0 && s < 40).length,
        };
        const healthDistributionData = [
            { name: 'Healthy', value: healthDistribution.healthy, fill: PIE_CHART_COLORS.Healthy },
            // { name: 'Needs Attention', value: healthDistribution.attention, fill: PIE_CHART_COLORS['Needs Attention'] }, // User requested removal
            { name: 'At Risk', value: healthDistribution.atRisk, fill: PIE_CHART_COLORS['At Risk'] },
        ];

        const sevenDaysAgo = subDays(new Date(), 7);
        const thirtyDaysAgo = subDays(new Date(), 30);
        const aiUsersLast7Days = new Set(activeBusinesses.filter(b => b.settings?.businessAnalysis?.createdAt?.toDate() > sevenDaysAgo || b.settings?.aiTroubleshootSuggestions?.createdAt?.toDate() > sevenDaysAgo).map(b => b.id)).size;
        const aiUsersLast30Days = new Set(activeBusinesses.filter(b => b.settings?.businessAnalysis?.createdAt?.toDate() > thirtyDaysAgo || b.settings?.aiTroubleshootSuggestions?.createdAt?.toDate() > thirtyDaysAgo).map(b => b.id)).size;

        const businessAnalysisUsers = activeBusinesses.filter(b => b.settings?.businessAnalysis).length;
        const troubleshootUsers = activeBusinesses.filter(b => b.settings?.aiTroubleshootSuggestions).length;

        const aiAdoption7 = activeBusinesses.length > 0 ? (aiUsersLast7Days / activeBusinesses.length) * 100 : 0;
        const aiAdoption30 = activeBusinesses.length > 0 ? (aiUsersLast30Days / activeBusinesses.length) * 100 : 0;

        // --- POWER FEATURES ANALYTICS ---

        // 1. Churn Prediction
        const churnRiskList = activeBusinesses.map(b => {
            const owner = users?.find(u => u.id === b.ownerId);
            const lastSeen = owner?.lastSeen?.toDate ? owner.lastSeen.toDate() : null;
            const daysSinceLogin = lastSeen ? differenceInDays(new Date(), lastSeen) : 999;

            // Check sales activity
            const busReceipts = receiptsByBusiness[b.id] || [];
            const recentSales = busReceipts.filter(r => r.createdAt.toDate() > subDays(new Date(), 7)).length;

            let riskScore = 0;
            let riskFactors = [];

            if (daysSinceLogin > 7) { riskScore += 30; riskFactors.push('Inactive > 7 days'); }
            if (daysSinceLogin > 30) { riskScore += 50; riskFactors.push('Inactive > 30 days'); }
            if (recentSales === 0 && busReceipts.length > 0) { riskScore += 20; riskFactors.push('No sales in 7 days'); }

            return { business: b, owner, riskScore, riskFactors, daysSinceLogin };
        }).filter(item => item.riskScore >= 50).sort((a, b) => b.riskScore - a.riskScore).slice(0, 10); // Top 10 at risk

        // 2. Trial Conversion
        const expiredTrials = activeBusinesses.filter(b => b.trialExpiresAt && b.trialExpiresAt.toDate() < new Date() && (b.plan === 'starter' || !b.plan));
        const paidUsers = activeBusinesses.filter(b => b.plan === 'pro' || b.plan === 'business');
        const conversionRate = (expiredTrials.length + paidUsers.length) > 0
            ? (paidUsers.length / (expiredTrials.length + paidUsers.length)) * 100
            : 0;

        const expiringSoonList = activeBusinesses.filter(b => {
            if (!b.trialExpiresAt || b.plan === 'pro' || b.plan === 'business') return false;
            const expiry = b.trialExpiresAt.toDate();
            const now = new Date();
            const diff = differenceInDays(expiry, now);
            return diff >= 0 && diff <= 3;
        });

        // 3. Geographic & Industry Distribution
        const locationCounts = activeBusinesses.reduce((acc, b) => {
            const state = b.settings?.state || (b.address ? b.address.split(',').pop()?.trim() : undefined) || 'Unknown';
            if (state) acc[state] = (acc[state] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const countryCounts = activeBusinesses.reduce((acc, b) => {
            const country = b.settings?.country || 'Pending Onboarding';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const industryCounts = activeBusinesses.reduce((acc, b) => {
            const industry = b.settings?.industry || 'Pending Onboarding';
            acc[industry] = (acc[industry] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topLocations = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const countryData = Object.entries(countryCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const industryData = Object.entries(industryCounts)
            .map(([name, value]) => ({ 
                name, 
                value,
                fill: `hsl(${(Object.keys(industryCounts).indexOf(name) * 137.5) % 360}, 70%, 50%)`
            }))
            .sort((a, b) => b.value - a.value);

        const businessesWithProductsList = activeBusinesses.filter(b => (productsByBusiness[b.id] || []).length > 0);
        const businessesWithSalesList = activeBusinesses.filter(b => (receiptsByBusiness[b.id] || []).length > 0);

        return {
            totalActiveBusinesses: activeBusinesses.length,
            activatedBusinessesCount: activatedBusinessesList.length,
            activatedBusinessesList,
            atRiskBusinesses,
            payingBusinessesCount: payingBusinessesList.length,
            payingBusinessesList,
            healthDistribution,
            healthDistributionData,
            aiAdoption7,
            aiAdoption30,
            businessAnalysisUsers,
            troubleshootUsers,
            churnRiskList,
            conversionRate,
            expiringSoonList,
            topLocations,
 
            countryData: countryData.map(c => ({
                ...c,
                businesses: activeBusinesses.filter(b => (b.settings?.country || 'Pending Onboarding') === c.name)
            })),
            industryData: industryData.map(i => ({
                ...i,
                businesses: activeBusinesses.filter(b => (b.settings?.industry || 'Pending Onboarding') === i.name)
            })),
            businessesWithProducts: businessesWithProductsList.length,
            businessesWithSales: businessesWithSalesList.length,
            businessesWithProductsList,
            businessesWithSalesList
        }
    }, [businesses, products, receipts, users]);
    const analyticsData = useMemo(() => {
        const activeBusinesses = businesses?.filter(b => b.status !== 'deleted') || [];
        const allUsers = users || [];
        const activeUsers = allUsers.filter(u => u.status === 'active' || u.status === undefined || !u.status);
        const inactiveUsers = allUsers.filter(u => u.status === 'inactive');

        const totalUsers = activeUsers.length;
        const totalBusinesses = activeBusinesses.length;

        const totalProducts = products?.length || 0;
        const totalReceipts = receipts?.length || 0;
        const now = new Date();

        const platformGmv = receipts?.reduce((sum, r) => sum + r.total, 0) || 0;

        const totalProductsSold = receipts?.reduce((sum, r) => sum + r.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0) || 0;

        const totalSubscriptionRevenue = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0;

        const platformAOV = totalReceipts > 0 ? (platformGmv / totalReceipts) : 0;

        const payingBusinesses = activeBusinesses?.filter(b => {
            if (b.accessLevel === 'lifetime') return false;
            if (b.plan !== 'pro' && b.plan !== 'business') return false;
            if (b.trialExpiresAt && b.trialExpiresAt.toDate() > now) return false;
            return true;
        });

        const thirtyDaysAgo = subDays(new Date(), 30);
        const recentPurchases = (purchases || []).filter(p => {
            const pDate = p.timestamp?.toDate ? p.timestamp.toDate() : (p.timestamp?.seconds ? new Date(p.timestamp.seconds * 1000) : new Date(0));
            return pDate > thirtyDaysAgo;
        });

        const mrr = recentPurchases.reduce((sum, p) => sum + p.amount, 0);
        const arr = mrr * 12;

        const usersByDate = (activeUsers || []).reduce((acc, user) => {
            if (user.createdAt?.seconds) {
                const date = format(new Date(user.createdAt.seconds * 1000), 'MMM d');
                acc[date] = (acc[date] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const newUserGrowth = Object.entries(usersByDate).map(([date, count]) => ({ date, 'New Users': count }));

        const revenueByDate = (purchases || []).reduce((acc, purchase) => {
            if (purchase.timestamp?.seconds) {
                const date = format(new Date(purchase.timestamp.seconds * 1000), 'MMM d');
                acc[date] = (acc[date] || 0) + purchase.amount;
            }
            return acc;
        }, {} as Record<string, number>);
        const revenueGrowth = Object.entries(revenueByDate).map(([date, amount]) => ({ date, 'Revenue': amount }));

        const categoryCounts = (products || []).reduce((acc, product) => {
            const category = product.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        const activeSubscriptions = payingBusinesses?.length || 0;

        const trialingBusinessIds = new Set((activeBusinesses || []).filter(b => b.trialExpiresAt?.toDate() > now && (b.plan === 'starter' || !b.plan)).map(b => b.id));
        const trialingUsers = activeUsers.filter(u => u.businessId && trialingBusinessIds.has(u.businessId)).length;

        const planCounts = (activeBusinesses || []).reduce((acc, business) => {
            const plan = business.accessLevel === 'lifetime' ? 'Lifetime' : business.plan || 'Starter';
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const planDistributionData = Object.entries(planCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            fill: PIE_CHART_COLORS[name as keyof typeof PIE_CHART_COLORS] || '#ccc'
        }));

        const userRoleData = (activeUsers || []).reduce((acc, user) => {
            const role = user.role || 'unknown';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const businessRevenues = (receipts || []).reduce((acc, r) => {
            if (r.businessId) {
                acc[r.businessId] = (acc[r.businessId] || 0) + r.total;
            }
            return acc;
        }, {} as Record<string, number>);

        const sortedBusinessRevenues = Object.entries(businessRevenues)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([bId, rev]) => {
                const business = businesses?.find(b => b.id === bId);
                return business ? { ...business, totalRevenue: rev } : null;
            })
            .filter((b): b is any => b !== null);

        const richestBusiness = sortedBusinessRevenues[0] || null;
        const topPerformers = sortedBusinessRevenues;

        // --- New Daily Metrics ---
        const launchDate = new Date(2026, 1, 17); // February 17, 2026
        
        const daysActive = Math.max(differenceInDays(new Date(), launchDate), 1);
        const earliestBusiness = launchDate;
        const averageSalesPerDay = platformGmv / daysActive;
        const averageReceiptsPerDay = totalReceipts / daysActive;

        const dailyGmv: Record<string, number> = {};
        const dailyReceipts: Record<string, number> = {};
        
        receipts?.forEach(r => {
            const date = format(r.createdAt.toDate(), 'MMM d');
            dailyGmv[date] = (dailyGmv[date] || 0) + r.total;
            dailyReceipts[date] = (dailyReceipts[date] || 0) + 1;
        });

        const dailyGmvData = Object.entries(dailyGmv).map(([date, amount]) => ({ date, 'Revenue': amount })).slice(-14);
        const dailyReceiptsData = Object.entries(dailyReceipts).map(([date, count]) => ({ date, 'Sales': count })).slice(-14);

        // LTV = Total Subscription Revenue / Total Customers
        const ltv = totalBusinesses > 0 ? totalSubscriptionRevenue / totalBusinesses : 0;

        // --- DOWNLOAD TELEMETRY INTELLIGENCE ---
        const downloadStats = (downloadClicks || []).reduce((acc, d) => {
            const pList = d.platforms || [];
            pList.forEach((p: string) => {
                if (p.includes('windows')) acc.windows += 1;
                else if (p.includes('macos')) acc.macos += 1;
                else if (p.includes('android')) acc.android += 1;
            });
            acc.totalClicks += (d.clicks || 0);
            return acc;
        }, { windows: 0, macos: 0, android: 0, totalClicks: 0 });

        return {
            totalUsers, totalBusinesses, totalProducts, platformGmv, totalProductsSold, 
            totalReceipts, platformAOV, mrr, arr, ltv, activeUsers, inactiveUsers, 
            newUserGrowth, revenueGrowth, categoryData, activeSubscriptions, 
            trialingUsers, planDistributionData, userRoleData, totalSubscriptionRevenue, 
            richestBusiness, topPerformers, averageSalesPerDay, averageReceiptsPerDay, dailyGmvData, dailyReceiptsData,
            earliestBusiness, daysActive,
            uniqueDownloaders: downloadClicks?.length || 0,
            downloadStats
        };
    }, [users, businesses, products, receipts, purchases, downloadClicks]);


    const handleOpenDetailModal = (type: 'active' | 'activated' | 'atRisk' | 'paying' | 'totalBusinesses' | 'inventoryActive' | 'generatingSales' | 'totalUsers') => {
        let modalData = { open: true, title: '', description: '', businesses: [] as BusinessInstance[] };
        const activeBusinesses = businesses?.filter(b => b.status !== 'deleted') || [];

        switch (type) {
            case 'active':
            case 'totalBusinesses':
                modalData.title = 'All Registered Businesses';
                modalData.description = 'A list of all active business accounts currently established on the platform.';
                modalData.businesses = activeBusinesses;
                break;
            case 'inventoryActive':
                modalData.title = 'Active Inventory Businesses';
                modalData.description = 'A list of all businesses that have added at least one product or service to their stock catalog.';
                modalData.businesses = platformAnalytics.businessesWithProductsList || [];
                break;
            case 'generatingSales':
                modalData.title = 'Revenue Generating Stores';
                modalData.description = 'A list of all stores that have recorded and processed at least one checkout sale.';
                modalData.businesses = platformAnalytics.businessesWithSalesList || [];
                break;
            case 'totalUsers':
                setUserListModalState({
                    open: true,
                    title: 'Total Platform Users',
                    description: 'Complete register of all authenticated accounts active across all businesses.',
                    users: users || []
                });
                return;
            case 'activated':
                modalData.title = 'Activated Businesses';
                modalData.description = 'Businesses with at least 10 products and at least 1 sale.';
                modalData.businesses = platformAnalytics.activatedBusinessesList;
                break;
            case 'atRisk':
                modalData.title = 'Businesses At Risk';
                modalData.description = 'Businesses with no sales in the last 14 days.';
                modalData.businesses = platformAnalytics.atRiskBusinesses;
                break;
            case 'paying':
                modalData.title = 'Paying Businesses';
                modalData.description = 'Businesses on a Pro or Business plan whose trial has expired.';
                modalData.businesses = platformAnalytics.payingBusinessesList;
                break;
        }
        setDetailModalState(modalData);
    };

    const handleGrantAccess = async () => {
        if (!grantEmail) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a user email.' });
            return;
        }
        if (!grantDate && !grantLifetime) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a date or grant lifetime access.' });
            return;
        }
        setIsGranting(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("email", "==", grantEmail));
            const userSnapshot = await getDocs(q);
            if (userSnapshot.empty) throw new Error(`User with email ${grantEmail} not found.`);
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data() as UserProfile;
            if (!userData.businessId) throw new Error("This user is not associated with any business.");
            const businessDocRef = doc(firestore, 'businessInstances', userData.businessId);
            const historyColRef = collection(firestore, 'businessInstances', userData.businessId, 'subscription_history');

            if (grantLifetime) {
                await updateDoc(businessDocRef, { accessLevel: 'lifetime', trialExpiresAt: null, plan: 'business' });
                await addDoc(historyColRef, {
                    action: 'Admin Grant: Lifetime access',
                    amount: 0,
                    currency: 'NGN',
                    timestamp: serverTimestamp()
                });

                if (currentUserProfile) {
                    await logAuditEvent(firestore, userData.businessId, currentUserProfile, {
                        action: 'billing.grant_lifetime',
                        entity: { type: 'business', id: userData.businessId, name: userData.name },
                        details: { targetEmail: grantEmail }
                    });
                }

                toast({ variant: 'success', title: 'Lifetime Access Granted!', description: `${userData.name} now has lifetime access.` });
            } else if (grantDate) {
                await updateDoc(businessDocRef, { trialExpiresAt: grantDate });
                await addDoc(historyColRef, {
                    action: `Admin Grant: Trial extended to ${format(grantDate, 'PPP')}`,
                    amount: 0,
                    currency: 'NGN',
                    timestamp: serverTimestamp()
                });

                if (currentUserProfile) {
                    await logAuditEvent(firestore, userData.businessId, currentUserProfile, {
                        action: 'billing.extend_trial',
                        entity: { type: 'business', id: userData.businessId, name: userData.name },
                        details: { targetEmail: grantEmail, newExpiry: format(grantDate, 'PPP') }
                    });
                }

                toast({ variant: 'success', title: 'Access Granted', description: `${userData.name}'s trial now expires on ${format(grantDate, 'PPP')}.` });
            }
            setGrantEmail('');
            setGrantDate(undefined);
            setGrantLifetime(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Grant Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsGranting(false);
        }
    }

    const handleUserStatusSelection = (email: string) => {
        setUserStatusEmail(email);
        if (email && users) {
            const selectedUser = users.find(u => u.email === email);
            if (selectedUser) {
                setIsUserActive(selectedUser.status !== 'inactive');
            }
        }
    };

    const handleUpdateUserStatus = async () => {
        if (!userStatusEmail) {
            toast({ variant: 'destructive', title: 'Missing Email', description: 'Please select a user to update.' });
            return;
        }
        setIsUpdatingStatus(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("email", "==", userStatusEmail));
            const userSnapshot = await getDocs(q);
            if (userSnapshot.empty) throw new Error(`User with email ${userStatusEmail} not found.`);

            const userDoc = userSnapshot.docs[0];
            const newStatus = isUserActive ? 'active' : 'inactive';
            await updateDoc(userDoc.ref, { status: newStatus });

            toast({ variant: 'success', title: 'User Status Updated', description: `${userDoc.data().name}'s account is now ${newStatus}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAssignPlan = async () => {
        if (!planUserEmail) {
            toast({ variant: 'destructive', title: 'Missing User', description: 'Please select a user to assign a plan.' });
            return;
        }
        setIsAssigningPlan(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("email", "==", planUserEmail));
            const userSnapshot = await getDocs(q);
            if (userSnapshot.empty) throw new Error(`User with email ${planUserEmail} not found.`);

            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data() as UserProfile;
            if (!userData.businessId) throw new Error("This user is not associated with any business.");

            const businessDocRef = doc(firestore, 'businessInstances', userData.businessId);
            await updateDoc(businessDocRef, {
                plan: selectedPlan,
                accessLevel: null, // Ensure plan takes precedence over lifetime
            });

            toast({ variant: 'success', title: 'Plan Assigned', description: `${userData.name} is now on the ${selectedPlan} plan.` });
            setPlanUserEmail('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Plan Assignment Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsAssigningPlan(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastTitle || !broadcastMessage) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide both a title and a message for the broadcast.' });
            return;
        }

        setIsSendingBroadcast(true);
        try {
            const broadcastsRef = collection(firestore, 'system_broadcasts');
            const durationInHours = parseInt(broadcastDuration);
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + durationInHours);

            await addDoc(broadcastsRef, {
                title: broadcastTitle,
                message: broadcastMessage,
                type: broadcastType,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiryDate),
                active: true,
            });

            toast({ variant: 'success', title: 'Broadcast Sent!', description: 'Your message has been sent to all active users.' });
            setBroadcastTitle('');
            setBroadcastMessage('');
            setBroadcastType('info');
            setBroadcastDuration('24');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Broadcast Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    const { impersonateUser, currentUserProfile } = usePOS();
    const router = useRouter();

    const handleImpersonateUser = (user: UserProfile) => {
        impersonateUser(user.id);
        router.push('/dashboard');
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 high-fidelity-shell">
            <div className="mb-2">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Platform-wide overview, analytics, and admin tools.
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="broadcasts">Comms Center</TabsTrigger>
                    <TabsTrigger value="followups">Strategic Outreach</TabsTrigger>
                    <TabsTrigger value="recruitment" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Recruitment
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Cyber Shield
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HeartPulse className="h-5 w-5 text-primary" />
                                Platform Overview Command
                            </CardTitle>
                        </CardHeader>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        <button onClick={() => handleOpenDetailModal('totalUsers')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard 
                                title="Total Users" 
                                value={analyticsData.totalUsers} 
                                icon={Users} 
                                description="Total registered user accounts"
                            />
                        </button>
                        <button onClick={() => handleOpenDetailModal('totalBusinesses')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard 
                                title="Total Businesses" 
                                value={analyticsData.totalBusinesses} 
                                icon={Building} 
                                description="Total business registrations"
                            />
                        </button>
                        <button onClick={() => handleOpenDetailModal('inventoryActive')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard 
                                title="Inventory Active" 
                                value={platformAnalytics.businessesWithProducts} 
                                icon={Package} 
                                description="Businesses with added stock"
                            />
                        </button>
                        <button onClick={() => handleOpenDetailModal('generatingSales')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard 
                                title="Generating Sales" 
                                value={platformAnalytics.businessesWithSales} 
                                icon={Zap} 
                                description="Businesses with transactions"
                            />
                        </button>
                        <button onClick={() => setIsAgeMilestoneOpen(true)} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard 
                                title="Zeneva Age" 
                                value={analyticsData.daysActive > 365 
                                    ? `${(analyticsData.daysActive / 365).toFixed(1)} Years` 
                                    : `${analyticsData.daysActive} Days`} 
                                icon={Clock} 
                                description={`Launched ${format(analyticsData.earliestBusiness, 'MMM yyyy')}`}
                            />
                        </button>
                        <button 
                            onClick={() => toast({ title: "Download Traffic Intelligence", description: `Total engagement: ${analyticsData.downloadStats.totalClicks} total clicks. Breakdown: ${analyticsData.downloadStats.windows} Windows, ${analyticsData.downloadStats.macos} macOS, ${analyticsData.downloadStats.android} Android.` })} 
                            className="text-left w-full h-full transition-transform active:scale-95"
                        >
                            <StatCard 
                                title="Unique Downloaders" 
                                value={analyticsData.uniqueDownloaders} 
                                icon={Download} 
                                description={`${analyticsData.downloadStats.windows} Win / ${analyticsData.downloadStats.macos} Mac / ${analyticsData.downloadStats.android} Android`}
                            />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 border-t border-white/5 pt-6">
                        <button onClick={() => handleOpenDetailModal('active')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard title="Active Stores" value={platformAnalytics.totalActiveBusinesses} icon={Building} description="Currently active businesses" />
                        </button>
                        <button onClick={() => handleOpenDetailModal('paying')} className="text-left w-full h-full transition-transform active:scale-95" disabled={platformAnalytics.payingBusinessesList.length === 0}>
                            <StatCard title="MRR" value={`₦${analyticsData.mrr.toLocaleString()}`} icon={DollarSign} description="Monthly Recurring" />
                        </button>
                        <button onClick={() => setIsSalesVelocityOpen(true)} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard title="Sales Velocity" value={`₦${analyticsData.averageSalesPerDay.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day`} icon={Activity} description="Platform momentum" />
                        </button>
                        <button onClick={() => handleOpenDetailModal('activated')} className="text-left w-full h-full transition-transform active:scale-95">
                            <StatCard title="Activated" value={platformAnalytics.activatedBusinessesCount} icon={UserCheck} description="Businesses with >10 products" />
                        </button>
                        <button onClick={() => handleOpenDetailModal('atRisk')} className="text-left w-full h-full transition-transform active:scale-95" disabled={platformAnalytics.atRiskBusinesses.length === 0}>
                            <StatCard title="At Risk" value={platformAnalytics.atRiskBusinesses.length} icon={AlertTriangle} description="No activity for 14 days" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mt-4">
                        <StatCard title="ARR" value={`₦${analyticsData.arr.toLocaleString()}`} icon={TrendingUp} description="Annual Target" />
                        <StatCard title="LTV" value={`₦${analyticsData.ltv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Crown} description="Est. Lifetime Value" />
                        <StatCard title="Sub Revenue" value={`₦${analyticsData.totalSubscriptionRevenue.toLocaleString()}`} icon={ShieldCheck} description="Total Software Sales" />
                        <StatCard title="Platform AOV" value={`₦${analyticsData.platformAOV.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={ShoppingCart} description="Avg. Receipt Value" />
                    </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Top Locations</CardTitle><CardDescription>Where are your users located?</CardDescription></CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <ReBarChart data={platformAnalytics.topLocations} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="border-yellow-500/20 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />
                            <CardHeader className="pb-3 relative z-10">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" /> Platform Performer Spotlight
                                </CardTitle>
                                <CardDescription>Top 3 businesses driving the most GMV.</CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-3">
                                {analyticsData.topPerformers && analyticsData.topPerformers.length > 0 ? (
                                    analyticsData.topPerformers.map((business, index) => (
                                        <div key={business.id} className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border",
                                            index === 0 ? "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-500/30" : "bg-background/60 border-border/50"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn( 
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                    index === 0 ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
                                                )}>
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold leading-none">{business.name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">Platform Partner</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold">₦{business.totalRevenue.toLocaleString()}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Gross GMV</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground text-sm">Waiting for more high-performing data...</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-primary" />
                                Platform Activity Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-yellow-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Push Subscribers', description: `There are currently ${totalSubscribers} devices that have installed the app.`, value: String(totalSubscribers), icon: Megaphone });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Push Subscribers
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full group-hover:bg-yellow-200 transition-colors">
                                            <Megaphone className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-yellow-400">
                                        {totalSubscribers}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Active devices opted-in</p>
                                    <p className="text-xs text-yellow-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>

                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-green-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Platform GMV', description: `Total gross merchandise value across the Zeneva platform.`, value: `₦${analyticsData.platformGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Platform GMV
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:bg-green-200 transition-colors">
                                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400">
                                        ₦{analyticsData.platformGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Value of goods sold</p>
                                    <p className="text-xs text-green-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>

                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-blue-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Total Receipts', description: `Total number of sales receipts across the platform.`, value: analyticsData.totalReceipts.toLocaleString(), icon: FileText });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Total Receipts
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 transition-colors">
                                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                                        {analyticsData.totalReceipts.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Total number of sales</p>
                                    <p className="text-xs text-blue-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>

                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-purple-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Total Products', description: `We currently host ${analyticsData.totalProducts.toLocaleString()} unique products on the Zeneva platform across all businesses.`, value: analyticsData.totalProducts.toLocaleString(), icon: Package });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Total Products
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:bg-purple-200 transition-colors">
                                            <Package className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400">
                                        {analyticsData.totalProducts.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Unique catalog variants</p>
                                    <p className="text-xs text-purple-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>

                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-orange-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Total Units Sold', description: `Total individual items sold through all registered businesses.`, value: analyticsData.totalProductsSold.toLocaleString(), icon: ShoppingCart });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Total Units Sold
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:bg-orange-200 transition-colors">
                                            <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
                                        {analyticsData.totalProductsSold.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Physical checkout goods</p>
                                    <p className="text-xs text-orange-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>

                            <Card className="group cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 overflow-hidden relative border-pink-500/20" onClick={() => {
                                setCertificateModalState({ open: true, title: 'Total Revenue', description: `The total revenue recorded.`, value: `₦${analyticsData.platformGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Check });
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent pointer-events-none" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Total Revenue
                                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full group-hover:bg-pink-200 transition-colors">
                                            <Check className="h-5 w-5 text-pink-600 dark:text-pink-500" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-pink-400">
                                        ₦{analyticsData.platformGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">Total gross revenue</p>
                                    <p className="text-xs text-pink-600/80 font-semibold mt-4 flex items-center"><Download className="h-3 w-3 mr-1" /> Click to download certified visual</p>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                    <div className="mb-8">


                    
                    {/* New Industry & Country Analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-blue-500" />
                                    Industry Diversity
                                </CardTitle>
                                <CardDescription>Numbers of businesses categorized by industry.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ReBarChart
                                            data={platformAnalytics.industryData}
                                            layout="vertical"
                                            margin={{ left: 40, right: 40 }}
                                            onClick={(data) => {
                                                if (data && data.activePayload) {
                                                    const d = data.activePayload[0].payload;
                                                    setDetailModalState({
                                                        open: true,
                                                        title: `${d.name} Businesses`,
                                                        description: `List of all businesses in the ${d.name} sector.`,
                                                        businesses: d.businesses,
                                                    });
                                                }
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tick={{ fontSize: 11, fontWeight: 500 }}
                                                width={100}
                                            />
                                            <ReTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                                            <Bar
                                                dataKey="value"
                                                radius={[0, 4, 4, 0]}
                                                className="cursor-pointer"
                                            >
                                                {platformAnalytics.industryData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </ReBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-emerald-500" />
                                    Country Presence
                                </CardTitle>
                                <CardDescription>Global footprint. Click a country to view businesses.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[250px] pr-4">
                                    <div className="space-y-4">
                                        {platformAnalytics.countryData.map((item, i) => {
                                            const getFlag = (c: string) => {
                                                const normalized = c.toLowerCase();
                                                if (normalized.includes('nigeria')) return '🇳🇬';
                                                if (normalized.includes('united states') || normalized === 'usa') return '🇺🇸';
                                                if (normalized.includes('united kingdom') || normalized === 'uk') return '🇬🇧';
                                                if (normalized.includes('ghana')) return '🇬🇭';
                                                if (normalized.includes('canada')) return '🇨🇦';
                                                if (normalized.includes('south africa')) return '🇿🇦';
                                                if (normalized.includes('kenya')) return '🇰🇪';
                                                if (normalized.includes('onboarding')) return '⏳';
                                                return '🌐';
                                            };
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group"
                                                    onClick={() => setDetailModalState({
                                                        open: true,
                                                        title: `Businesses in ${item.name}`,
                                                        description: `Registered business entities operating in ${item.name}.`,
                                                        businesses: item.businesses
                                                    })}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">{getFlag(item.name)}</span>
                                                        <span className="font-semibold text-sm">{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="font-mono">{item.value}</Badge>
                                                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                        <PlatformRevenueChart receipts={receipts || []} />
                        <UserGrowthChart users={users || []} />
                        <TransactionVolumeChart receipts={receipts || []} />
                        <PlanDistributionChart businesses={businesses || []} />
                        <div className="lg:col-span-2">
                            <RevenueGrowthIndexChart purchases={purchases || []} />
                        </div>
                        <div className="lg:col-span-2">
                            <RetentionCohortChart users={users || []} receipts={receipts || []} />
                        </div>
                        <div className="lg:col-span-2">
                            <FeatureStickinessChart businesses={businesses || []} products={products || []} />
                        </div>
                    </div>
                 </TabsContent>



                <TabsContent value="users" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Accounts</CardTitle>
                                    <CardDescription>List of all users on the platform.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users, emails, or businesses..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Select value={filterPlan} onValueChange={(v: any) => setFilterPlan(v)}>
                                                <SelectTrigger className="w-[130px]">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="h-4 w-4" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Plans</SelectItem>
                                                    <SelectItem value="starter">Starter</SelectItem>
                                                    <SelectItem value="pro">Pro</SelectItem>
                                                    <SelectItem value="business">Business</SelectItem>
                                                    <SelectItem value="lifetime">Lifetime</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                                <SelectTrigger className="w-[180px]">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowUpDown className="h-4 w-4" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Most Recently Active</SelectItem>
                                                    <SelectItem value="joined">Newest Members</SelectItem>
                                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[500px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Business Name</TableHead>
                                                    <TableHead>Plan</TableHead>
                                                    <TableHead>Activity</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {processedUsers.map(user => {
                                                    const business = businesses?.find(b => b.id === user.businessId);
                                                    return (
                                                        <TableRow
                                                            key={user.id}
                                                            className="hover:bg-muted/50"
                                                        >
                                                            <TableCell onClick={() => { setSelectedUserForDetail(user); setIsUserDetailOpen(true); }} className="cursor-pointer">
                                                                <div className="font-medium">{user.name}</div><div className="text-xs text-muted-foreground">{user.email}</div>
                                                            </TableCell>
                                                            <TableCell onClick={() => { setSelectedUserForDetail(user); setIsUserDetailOpen(true); }} className="cursor-pointer">
                                                                {business?.name || 'N/A'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {business ? (
                                                                    business.accessLevel === 'lifetime' ? <Badge variant="default" className="bg-green-600 hover:bg-green-700">Lifetime</Badge> : <Badge variant="secondary" className="capitalize">{business.plan || 'starter'}</Badge>
                                                                ) : <Badge variant="outline">N/A</Badge>}
                                                            </TableCell>
                                                            <TableCell>
                                                                <UserPresence lastSeen={user.lastSeen} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleImpersonateUser(user); }} title="Inspect Data">
                                                                    <LogIn className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                        <div className='space-y-6'>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Assign Plan</CardTitle><CardDescription>Manually set a subscription plan.</CardDescription></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="plan-email">User Email</Label><Combobox options={userOptions} value={planUserEmail} onChange={setPlanUserEmail} placeholder="Select a user..." /></div>
                                    <div className="space-y-2"><Label>Plan</Label><Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent></Select></div>
                                </CardContent>
                                <CardFooter><Button onClick={handleAssignPlan} disabled={isAssigningPlan} className="w-full">{isAssigningPlan && <Loader className="mr-2 h-4 w-4 animate-spin" />}Assign Plan</Button></CardFooter>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Grant Access</CardTitle><CardDescription>Extend trial or grant lifetime.</CardDescription></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="grant-email">User Email</Label>
                                        <Combobox options={userOptions} value={grantEmail} onChange={setGrantEmail} placeholder="Select a user..." />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="lifetime-mode" checked={grantLifetime} onCheckedChange={setGrantLifetime} />
                                        <Label htmlFor="lifetime-mode">Lifetime Access</Label>
                                    </div>
                                    {!grantLifetime && (
                                        <div className="space-y-2">
                                            <Label>Expiry Date</Label>
                                            <Calendar mode="single" selected={grantDate} onSelect={setGrantDate} className="rounded-md border" />
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    {grantLifetime ? (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button disabled={isGranting} className="w-full bg-green-600 hover:bg-green-700">
                                                    {isGranting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                                    Grant Lifetime Access
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will grant <strong className="text-foreground">{grantEmail}</strong> permanent, unlimited access to Zeneva Business. This action is recorded in the audit logs.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleGrantAccess} className="bg-green-600 hover:bg-green-700">
                                                        Yes, Grant Lifetime
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    ) : (
                                        <Button onClick={handleGrantAccess} disabled={isGranting} className="w-full">
                                            {isGranting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                            Extend Trial
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="broadcasts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> System-Wide Broadcast</CardTitle>
                            <CardDescription>Send a notification to all active users on the platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-2xl">
                            <div className="space-y-2">
                                <Label>Broadcast Title</Label>
                                <Input placeholder="e.g. Scheduled Maintenance" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Message Body</Label>
                                <Textarea placeholder="Details about the announcement..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={broadcastType} onValueChange={(v: any) => setBroadcastType(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">Info (Blue)</SelectItem>
                                            <SelectItem value="warning">Warning (Orange)</SelectItem>
                                            <SelectItem value="alert">Alert (Red)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Hours)</Label>
                                    <Select value={broadcastDuration} onValueChange={setBroadcastDuration}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 Hour</SelectItem>
                                            <SelectItem value="6">6 Hours</SelectItem>
                                            <SelectItem value="24">24 Hours</SelectItem>
                                            <SelectItem value="48">48 Hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast} className="w-full sm:w-auto">
                                {isSendingBroadcast && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Send Broadcast
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>



                <TabsContent value="followups" className="space-y-6">
                    <FollowUpCenter 
                        atRiskBusinesses={platformAnalytics.atRiskBusinesses}
                        users={users || []}
                        conversionRate={platformAnalytics.conversionRate}
                        churnRiskCount={platformAnalytics.churnRiskList.length}
                        cachedLogs={outreachLogs}
                        cachedSentCount={outreachSentCount}
                        isLoading={isOutreachLoading}
                        onRefresh={() => fetchOutreachData(true)}
                        onMount={fetchOutreachData}
                    />
                </TabsContent>
                <TabsContent value="recruitment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Talent Acquisitions ({applications?.length || 0})
                            </CardTitle>
                            <CardDescription>
                                Review and manage job applications for Zeneva roles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Candidate</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Applied</TableHead>
                                            <TableHead>Pitch</TableHead>
                                            <TableHead>Links</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {applications && applications.length > 0 ? (
                                            applications.map((app) => (
                                                <TableRow key={app.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{app.name}</div>
                                                        <div className="text-xs text-muted-foreground">{app.email}</div>
                                                        <div className="text-xs text-muted-foreground">{app.phone}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{app.jobTitle || app.jobId}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {app.createdAt?.toDate ? format(app.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm" title={app.pitch}>
                                                        {app.pitch}
                                                    </TableCell>
                                                    <TableCell>
                                                        {app.portfolio && (
                                                            <Button variant="link" size="sm" asChild className="h-auto p-0">
                                                                <a href={app.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                                    View File <Globe className="h-3 w-3" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={app.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                                                            {app.status || 'pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => handleDeleteApplication(app.id)}
                                                            className="hover:bg-destructive/10 hover:text-destructive group"
                                                            title="Delete Application"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                    No applications received yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="security">
                    <CyberShield 
                        allBusinesses={businesses} 
                        allUsers={users} 
                        isLoadingBusinesses={false} 
                    />
                </TabsContent>
            </Tabs>

            <Dialog open={certificateModalState?.open || false} onOpenChange={(open) => !open && setCertificateModalState(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 gap-0">
                    <DialogTitle className="sr-only">Platform Achievement</DialogTitle>
                    <DialogDescription className="sr-only">Platform achievement milestone download view</DialogDescription>

                    <div ref={cardRef} className="relative p-8 flex flex-col items-center text-center bg-background min-h-[420px] justify-center">
                        <div className="absolute inset-0 z-0">
                            <Image
                                src="/achievement_bg.png"
                                alt="Background"
                                fill
                                sizes="100vw"
                                className="object-cover opacity-40"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
                        </div>

                        <div className="relative z-10 mb-4 px-3 py-1 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-full">
                            <p className="text-xs font-bold text-yellow-600 tracking-wide">
                                Zeneva Admin Analytics
                            </p>
                        </div>

                        <div className="relative z-10 w-32 h-32 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl mb-6 ring-4 ring-yellow-500/20 text-yellow-500">
                            {certificateModalState?.icon && (
                                <div className="text-yellow-500 flex items-center justify-center">
                                    {(() => {
                                        const IconComponent = certificateModalState.icon;
                                        return <IconComponent className="h-16 w-16" />;
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 w-full mb-6">
                            <h2 className="text-2xl font-bold text-primary mb-2 leading-tight">
                                {certificateModalState?.title}
                            </h2>
                            <p className="text-base text-foreground/80 font-medium px-4">
                                {certificateModalState?.description}
                            </p>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 gap-4 w-full bg-white/60 backdrop-blur-sm border border-white/20 p-4 rounded-xl shadow-sm">
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Current Metric</p>
                                <p className="text-sm font-bold mt-1 text-primary">
                                    {certificateModalState?.value}
                                </p>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <p className="text-[11px] font-black text-primary/80">
                                zeneva.space - Certified Result
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/30 border-t flex flex-col gap-3">
                        <Button variant="outline" className="w-full gap-2 h-11 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary" onClick={async () => {
                            if (!cardRef.current) return;
                            setIsDownloading(true);
                            try {
                                const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 3, backgroundColor: null });
                                const dataUrl = canvas.toDataURL('image/png');
                                const link = document.createElement('a');
                                link.href = dataUrl;
                                link.download = `zeneva-analytic-${(certificateModalState?.title || 'card').replace(/\s+/g, '-').toLowerCase()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast({ title: "Downloaded!", description: "Your card has been saved." });
                            } catch (e) {
                                toast({ variant: "destructive", title: "Failed", description: "Download failed." });
                            } finally {
                                setIsDownloading(false);
                            }
                        }} disabled={isDownloading}>
                            {isDownloading ? "Downloading..." : <><Download className="h-4 w-4" /> Download Result Card</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>


            <BusinessDetailDialog
                open={detailModalState.open}
                onOpenChange={(open) => setDetailModalState(prev => ({ ...prev, open }))}
                title={detailModalState.title}
                description={detailModalState.description}
                businesses={detailModalState.businesses}
                users={users}
                isInfoOnly={detailModalState.isInfoOnly}
            />

            <UserListDialog
                open={userListModalState.open}
                onOpenChange={(open) => setUserListModalState(prev => ({ ...prev, open }))}
                title={userListModalState.title}
                description={userListModalState.description}
                users={userListModalState.users}
                businesses={businesses}
            />

            <ZenevaMilestoneDialog
                open={isAgeMilestoneOpen}
                onOpenChange={setIsAgeMilestoneOpen}
                daysActive={analyticsData.daysActive}
                totalSales={receipts?.length || 0}
                totalBusinesses={platformAnalytics.totalActiveBusinesses}
                totalUsers={analyticsData.totalUsers}
                launchDate={analyticsData.earliestBusiness}
                averageSalesPerDay={analyticsData.averageSalesPerDay}
                averageReceiptsPerDay={analyticsData.averageReceiptsPerDay}
                platformAOV={analyticsData.platformAOV}
                arr={analyticsData.arr}
                topLocation={platformAnalytics.topLocations?.[0]?.name || 'N/A'}
            />

            <UserDetailDialog
                user={selectedUserForDetail}
                business={businesses?.find(b => b.id === selectedUserForDetail?.businessId)}
                open={isUserDetailOpen}
                onOpenChange={setIsUserDetailOpen}
            />

            <Dialog open={isSalesVelocityOpen} onOpenChange={setIsSalesVelocityOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Platform Sales Velocity
                        </DialogTitle>
                        <DialogDescription>
                            Historical sales performance across and transaction frequency.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Total Platform GMV" value={`₦${analyticsData.platformGmv.toLocaleString()}`} icon={DollarSign} />
                            <StatCard title="Total Sales Count" value={analyticsData.totalReceipts.toLocaleString()} icon={FileText} />
                            <StatCard title="Overall ARPU" value={`₦${(analyticsData.platformGmv / (analyticsData.totalBusinesses || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Users} />
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Daily Revenue (Last 14 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ReLineChart data={analyticsData.dailyGmvData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                            <ReTooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </ReLineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AdminDashboardPage() {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('name')), [firestore]);
    const businessesQuery = useMemoFirebase(() => query(collection(firestore, 'businessInstances')), [firestore]);
    const productsQuery = useMemoFirebase(() => query(collection(firestore, 'products')), [firestore]);
    const applicationsQuery = useMemoFirebase(() => query(collection(firestore, 'job_applications'), orderBy('createdAt', 'desc')), [firestore]);
    const receiptsQuery = useMemoFirebase(() => query(collection(firestore, 'receipts'), orderBy('createdAt', 'desc')), [firestore]);
    const purchasesQuery = useMemoFirebase(() => query(collection(firestore, 'purchases'), orderBy('timestamp', 'desc')), [firestore]);
    const downloadClicksQuery = useMemoFirebase(() => query(collection(firestore, 'download_clicks')), [firestore]);

    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: businesses, isLoading: businessesLoading } = useCollection<BusinessInstance>(businessesQuery);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
    const { data: applications, isLoading: applicationsLoading } = useCollection<any>(applicationsQuery);
    const { data: receipts, isLoading: receiptsLoading } = useCollection<Receipt>(receiptsQuery);
    const { data: purchases, isLoading: purchasesLoading } = useCollection<Purchase>(purchasesQuery);
    const { data: downloadClicks, isLoading: downloadClicksLoading } = useCollection<any>(downloadClicksQuery);

    const isLoading = usersLoading || businessesLoading || productsLoading || applicationsLoading || receiptsLoading || purchasesLoading || downloadClicksLoading;

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg">Loading Admin Dashboard...</p>
            </div>
        );
    }

    return <AdminDashboardContent users={users} businesses={businesses} products={products} receipts={receipts} purchases={purchases} applications={applications} downloadClicks={downloadClicks} />
}