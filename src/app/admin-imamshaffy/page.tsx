

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
    Send,
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
} from 'lucide-react';
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
} from 'firebase/firestore';
import { format, formatDistanceToNow, subDays, differenceInDays } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Business Name</Label>
                            <p className="font-medium text-lg">{business?.name || 'N/A'}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Phone</Label>
                            <p className="font-medium">{business?.settings?.phone || user.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Email</Label>
                            <p className="font-medium">{business?.settings?.email || user.email || 'N/A'}</p>
                        </div>

                        <div className='col-span-2'>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Address</Label>
                            <p className="font-medium">{business?.address || 'N/A'}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">State</Label>
                            <p className="font-medium">{business?.settings?.state || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Country</Label>
                            <p className="font-medium">{business?.settings?.country || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Currency</Label>
                            <p className="font-medium">{business?.settings?.currency || 'NGN'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Plan</Label>
                            <div className="mt-1">
                                {business ? (
                                    business.accessLevel === 'lifetime' ? <Badge variant="default" className="bg-green-600">Lifetime</Badge> : <Badge variant="secondary" className="capitalize">{business.plan || 'starter'}</Badge>
                                ) : <Badge variant="outline">N/A</Badge>}
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">User Status</Label>
                            <div className="mt-1">
                                <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                                    {user.status || 'active'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Last Seen</Label>
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


function AdminDashboardContent({ users, businesses, products, receipts, purchases }: { users: UserProfile[] | null, businesses: BusinessInstance[] | null, products: Product[] | null, receipts: Receipt[] | null, purchases: Purchase[] | null }) {
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
    const [certificateModalState, setCertificateModalState] = useState<{ open: boolean; title: string; description: string; value: string; icon: any; } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
    const [isSalesVelocityOpen, setIsSalesVelocityOpen] = useState(false);
    const [totalSubscribers, setTotalSubscribers] = useState(0);

    useEffect(() => {
        const fetchSubscribers = async () => {
            try {
                const user = (firestore as any).auth?.currentUser;
                const token = await user?.getIdToken();
                const response = await fetch('/api/admin/platform-overview', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success && data.appInstalls !== undefined) {
                    setTotalSubscribers(data.appInstalls);
                }
            } catch (error) {
                console.error("Error fetching app installs:", error);
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

        // 3. Geographic Distribution
        const locationCounts = activeBusinesses.reduce((acc, b) => {
            // Try to find location from various sources
            const state = b.settings?.state || (b.address ? b.address.split(',').pop()?.trim() : undefined) || 'Unknown';
            if (state) {
                acc[state] = (acc[state] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const topLocations = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


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
            topLocations
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

        const mrr = (payingBusinesses?.filter(b => b.plan === 'pro').length || 0) * 10000 + (payingBusinesses?.filter(b => b.plan === 'business').length || 0) * 30000;
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
        const earliestBusiness = businesses?.reduce((earliest, b) => {
            if (!b.createdAt) return earliest;
            const bDate = b.createdAt.toDate();
            return bDate < earliest ? bDate : earliest;
        }, new Date());
        
        const daysActive = Math.max(differenceInDays(new Date(), earliestBusiness), 1);
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

        return {
            totalUsers, totalBusinesses, totalProducts, platformGmv, totalProductsSold, 
            totalReceipts, platformAOV, mrr, arr, ltv, activeUsers, inactiveUsers, 
            newUserGrowth, revenueGrowth, categoryData, activeSubscriptions, 
            trialingUsers, planDistributionData, userRoleData, totalSubscriptionRevenue, 
            richestBusiness, topPerformers, averageSalesPerDay, averageReceiptsPerDay, dailyGmvData, dailyReceiptsData
        };
    }, [users, businesses, products, receipts, purchases]);


    const handleOpenDetailModal = (type: 'active' | 'activated' | 'atRisk' | 'paying') => {
        let modalData = { open: true, title: '', description: '', businesses: [] as BusinessInstance[] };
        const activeBusinesses = businesses?.filter(b => b.status !== 'deleted') || [];

        switch (type) {
            case 'active':
                modalData.title = 'All Active Businesses';
                modalData.description = 'A list of all businesses on the platform that have not been deleted.';
                modalData.businesses = activeBusinesses;
                break;
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
                toast({ variant: 'success', title: 'Lifetime Access Granted!', description: `${userData.name} now has lifetime access.` });
            } else if (grantDate) {
                await updateDoc(businessDocRef, { trialExpiresAt: grantDate });
                await addDoc(historyColRef, {
                    action: `Admin Grant: Trial extended to ${format(grantDate, 'PPP')}`,
                    amount: 0,
                    currency: 'NGN',
                    timestamp: serverTimestamp()
                });
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

    const { impersonateUser } = usePOS();
    const router = useRouter();

    const handleImpersonateUser = (user: UserProfile) => {
        impersonateUser(user.id);
        router.push('/dashboard');
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
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
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HeartPulse className="h-5 w-5 text-primary" />
                                Platform Health Overview
                            </CardTitle>
                        </CardHeader>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        <button onClick={() => handleOpenDetailModal('active')} className="text-left w-full h-full">
                            <StatCard title="Businesses" value={platformAnalytics.totalActiveBusinesses} icon={Building} />
                        </button>
                        <button onClick={() => handleOpenDetailModal('paying')} className="text-left w-full h-full" disabled={platformAnalytics.payingBusinessesList.length === 0}>
                            <StatCard title="MRR" value={`₦${analyticsData.mrr.toLocaleString()}`} icon={DollarSign} description="Monthly Recurring" />
                        </button>
                        <StatCard title="ARR" value={`₦${analyticsData.arr.toLocaleString()}`} icon={TrendingUp} description="Annual Target" />
                        <StatCard title="LTV" value={`₦${analyticsData.ltv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Crown} description="Est. Lifetime Value" />
                        <StatCard title="Sub Revenue" value={`₦${analyticsData.totalSubscriptionRevenue.toLocaleString()}`} icon={ShieldCheck} description="Total Software Sales" />
                        <button onClick={() => setIsSalesVelocityOpen(true)} className="text-left w-full h-full">
                            <StatCard title="Avg. Sales/Day" value={`₦${analyticsData.averageSalesPerDay.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Activity} description="Sales Velocity" />
                        </button>
                        <button onClick={() => handleOpenDetailModal('activated')} className="text-left w-full h-full">
                            <StatCard title="Activated" value={platformAnalytics.activatedBusinessesCount} icon={UserCheck} description=">=10 products" />
                        </button>
                        <button onClick={() => handleOpenDetailModal('atRisk')} className="text-left w-full h-full" disabled={platformAnalytics.atRiskBusinesses.length === 0}>
                            <StatCard title="At Risk" value={platformAnalytics.atRiskBusinesses.length} icon={AlertTriangle} description="No sales 14 days" />
                        </button>
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
                                    <Button onClick={handleGrantAccess} disabled={isGranting} className="w-full">
                                        {isGranting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                        {grantLifetime ? 'Grant Lifetime' : 'Extend Trial'}
                                    </Button>
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
                            <p className="text-xs font-bold text-yellow-600 tracking-wide uppercase">
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
                            <p className="text-[11px] font-black tracking-[0.2em] text-primary/80 uppercase">
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
    const businessesQuery = useMemoFirebase(() => query(collection(firestore, 'businessInstances'), orderBy('name')), [firestore]);
    const productsQuery = useMemoFirebase(() => query(collection(firestore, 'products')), [firestore]);
    const receiptsQuery = useMemoFirebase(() => query(collection(firestore, 'receipts'), orderBy('createdAt', 'desc')), [firestore]);
    const purchasesQuery = useMemoFirebase(() => query(collection(firestore, 'purchases'), orderBy('timestamp', 'desc')), [firestore]);

    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: businesses, isLoading: businessesLoading } = useCollection<BusinessInstance>(businessesQuery);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
    const { data: receipts, isLoading: receiptsLoading } = useCollection<Receipt>(receiptsQuery);
    const { data: purchases, isLoading: purchasesLoading } = useCollection<Purchase>(purchasesQuery);

    const isLoading = usersLoading || businessesLoading || productsLoading || receiptsLoading || purchasesLoading;

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg">Loading Admin Dashboard...</p>
            </div>
        );
    }

    return <AdminDashboardContent users={users} businesses={businesses} products={products} receipts={receipts} purchases={purchases} />
}
