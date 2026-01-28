

'use client';
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
  Tooltip,
  ResponsiveContainer,
  Legend,
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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo, useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { format, formatDistanceToNow, subDays } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CustomTooltip = ({ active, payload, label }: any) => {
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
    Healthy: 'hsl(var(--chart-2))',
    'Needs Attention': 'hsl(var(--chart-3))',
    'At Risk': 'hsl(var(--chart-5))',
    Pro: 'hsl(var(--chart-1))',
    Business: 'hsl(var(--chart-4))',
    Starter: 'hsl(var(--muted))',
    Lifetime: 'hsl(var(--chart-2))'
};

function BusinessDetailDialog({ open, onOpenChange, title, description, businesses, users }: { open: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, businesses: BusinessInstance[], users: UserProfile[] | null }) {
  const businessOwners = useMemo(() => {
    if (!users) return {};
    return businesses.reduce((acc, b) => {
      const owner = users.find(u => u.id === b.ownerId);
      acc[b.id] = owner?.name || 'N/A';
      return acc;
    }, {} as Record<string, string>);
  }, [businesses, users]);

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
  const [detailModalState, setDetailModalState] = useState<{ open: boolean; title: string; description: string; businesses: BusinessInstance[] }>({ open: false, title: '', description: '', businesses: [] });

  const userOptions = useMemo(() => (users || []).map(user => ({
      value: user.email,
      label: `${user.name} (${user.email})`
  })), [users]);

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

        const healthScores = activeBusinesses.map(b => b.settings?.businessAnalysis?.health?.score ?? -1);
        const healthDistribution = {
            healthy: healthScores.filter(s => s >= 70).length,
            attention: healthScores.filter(s => s >= 40 && s < 70).length,
            atRisk: healthScores.filter(s => s >= 0 && s < 40).length,
        };
        const healthDistributionData = [
            { name: 'Healthy', value: healthDistribution.healthy, fill: PIE_CHART_COLORS.Healthy },
            { name: 'Needs Attention', value: healthDistribution.attention, fill: PIE_CHART_COLORS['Needs Attention'] },
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
        }
  }, [businesses, products, receipts]);


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
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value).slice(0, 5);
    
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

    return { 
        totalUsers, totalBusinesses, totalProducts, platformGmv, totalProductsSold, totalReceipts, platformAOV, mrr, arr, activeUsers, inactiveUsers, newUserGrowth, revenueGrowth, categoryData, activeSubscriptions, trialingUsers, planDistributionData, userRoleData, totalSubscriptionRevenue
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
            toast({ variant: 'success', title: 'Lifetime Access Granted!', description: `${userData.name}'s business now has lifetime access.` });
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

            toast({ variant: 'success', title: 'Plan Assigned', description: `${userData.name}'s business is now on the ${selectedPlan} plan.` });
            setPlanUserEmail('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Plan Assignment Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsAssigningPlan(false);
        }
    };
    
      return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="mb-2">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Platform-wide overview of Zeneva.
            </p>
          </div>
          
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-primary" />
                        Platform Health Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => handleOpenDetailModal('active')} className="text-left w-full h-full">
                        <StatCard title="Total Active Businesses" value={platformAnalytics.totalActiveBusinesses} icon={Building} />
                    </button>
                    <button onClick={() => handleOpenDetailModal('activated')} className="text-left w-full h-full">
                        <StatCard title="Activated Businesses" value={platformAnalytics.activatedBusinessesCount} icon={UserCheck} description=">=10 products & >=1 sale"/>
                    </button>
                    <button onClick={() => handleOpenDetailModal('atRisk')} className="text-left w-full h-full" disabled={platformAnalytics.atRiskBusinesses.length === 0}>
                        <StatCard title="Businesses At Risk" value={platformAnalytics.atRiskBusinesses.length} icon={AlertTriangle} description="No sales in 14 days" />
                    </button>
                     <button onClick={() => handleOpenDetailModal('paying')} className="text-left w-full h-full" disabled={platformAnalytics.payingBusinessesList.length === 0}>
                        <StatCard title="Paying Businesses" value={platformAnalytics.payingBusinessesCount} icon={ShieldCheck} description="Pro + Business Plans" />
                    </button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        Platform Activity Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Platform GMV" value={`₦${analyticsData.platformGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign} description="Total value of goods sold"/>
                    <StatCard title="Total Receipts" value={analyticsData.totalReceipts.toLocaleString()} icon={FileText} description="Total number of sales"/>
                    <StatCard title="Total Products" value={analyticsData.totalProducts.toLocaleString()} icon={Package} description="Total unique products" />
                    <StatCard title="Total Units Sold" value={analyticsData.totalProductsSold.toLocaleString()} icon={ShoppingCart} description="Total items sold" />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 text-primary" />
                            Business Health Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={200}>
                            <RePieChart>
                            <Pie data={platformAnalytics.healthDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} labelLine={false} >
                                {platformAnalytics.healthDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconSize={10} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <div className="lg:col-span-2 relative overflow-hidden rounded-lg border bg-card">
                    <div className="grid-bg opacity-30 absolute inset-0 z-0"></div>
                    <div className="relative z-10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                Zen AI Adoption & Impact
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                           <div className="text-center">
                               <p className="text-3xl font-bold">{platformAnalytics.aiAdoption7.toFixed(1)}%</p>
                               <p className="text-sm text-muted-foreground">Adoption (7 days)</p>
                           </div>
                           <div className="text-center">
                               <p className="text-3xl font-bold">{platformAnalytics.aiAdoption30.toFixed(1)}%</p>
                               <p className="text-sm text-muted-foreground">Adoption (30 days)</p>
                           </div>
                           <div className="text-center">
                               <p className="text-3xl font-bold">{platformAnalytics.businessAnalysisUsers}</p>
                               <p className="text-sm text-muted-foreground">Used Business Analysis</p>
                           </div>
                           <div className="text-center">
                               <p className="text-3xl font-bold">{platformAnalytics.troubleshootUsers}</p>
                               <p className="text-sm text-muted-foreground">Used Troubleshooter</p>
                           </div>
                        </CardContent>
                    </div>
                </div>
            </div>

    
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
              <CardHeader><CardTitle>New User Growth</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <ReBarChart data={analyticsData.newUserGrowth}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.1)'}} />
                    <Bar dataKey="New Users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Subscription Revenue Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <ReLineChart data={analyticsData.revenueGrowth}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis tickFormatter={(value) => `₦${Number(value) >= 1000 ? (Number(value)/1000).toLocaleString() : value}k`} allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                    </ReLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
          </div>
    
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Layers className="text-primary"/>Plan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={200}>
                            <RePieChart>
                            <Pie data={analyticsData.planDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {analyticsData.planDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconSize={10} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="text-primary"/>User Role Distribution</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <ReBarChart data={Object.entries(analyticsData.userRoleData).map(([name, value]) => ({name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), value}))} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: '12px' }}/>
                                <XAxis type="number" hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.1)'}} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <div className="space-y-6">
                  <StatCard title="Subscription Revenue" value={`₦${analyticsData.totalSubscriptionRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign} />
                  <StatCard title="MRR" value={`₦${analyticsData.mrr.toLocaleString()}`} icon={TrendingUp} />
                  <StatCard title="ARR" value={`₦${analyticsData.arr.toLocaleString()}`} icon={CalendarIcon} />
                </div>
           </div>
           
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Accounts</CardTitle>
                            <CardDescription>List of all users on the platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[330px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Business Name</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Seen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analyticsData.activeUsers.map(user => {
                                            const business = businesses?.find(b => b.id === user.businessId);
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell><div className="font-medium">{user.name}</div><div className="text-xs text-muted-foreground">{user.email}</div></TableCell>
                                                    <TableCell>{business?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        {business ? (
                                                            business.accessLevel === 'lifetime' ? <Badge variant="default" className="bg-green-600 hover:bg-green-700">Lifetime</Badge> : <Badge variant="secondary" className="capitalize">{business.plan || 'starter'}</Badge>
                                                        ) : <Badge variant="outline">N/A</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                                                            {user.status || 'active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <UserPresence lastSeen={user.lastSeen} />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><UserX className="text-destructive"/>Inactive Accounts</CardTitle>
                            <CardDescription>Users who have deleted their accounts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analyticsData.inactiveUsers.length > 0 ? (
                                            analyticsData.inactiveUsers.map(user => (
                                                <TableRow key={user.id}>
                                                    <TableCell>{user.name}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                                                            {user.status || 'active'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                             <TableRow><TableCell colSpan={3} className="h-24 text-center">No inactive accounts found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <div className='space-y-6'>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase/>Assign Plan</CardTitle><CardDescription>Manually set a subscription plan for a business.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="plan-email">User Email</Label><Combobox options={userOptions} value={planUserEmail} onChange={setPlanUserEmail} placeholder="Select a user..."/></div>
                            <div className="space-y-2"><Label>Plan</Label><Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent></Select></div>
                        </CardContent>
                        <CardFooter><Button onClick={handleAssignPlan} disabled={isAssigningPlan} className="w-full">{isAssigningPlan && <Loader className="mr-2 h-4 w-4 animate-spin"/>}Assign Plan</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Grant Trial / Lifetime Access</CardTitle><CardDescription>Extend a trial or grant permanent lifetime access.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className='space-y-2'><Label htmlFor='grant-email'>User Email</Label><Combobox options={userOptions} value={grantEmail} onChange={setGrantEmail} placeholder="Select a user..." searchPlaceholder="Search users..." emptyPlaceholder="No user found."/></div>
                                <div className='flex items-center space-x-2'><Switch id="grant-lifetime" checked={grantLifetime} onCheckedChange={setGrantLifetime}/><Label htmlFor="grant-lifetime">Grant Lifetime Access</Label></div>
                                <div className='space-y-2'><Label>New Expiry Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!grantDate && "text-muted-foreground")} disabled={grantLifetime}><CalendarIcon className="mr-2 h-4 w-4" />{grantDate && !grantLifetime ? format(grantDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={grantDate} onSelect={setGrantDate} initialFocus disabled={grantLifetime} /></PopoverContent></Popover></div>
                            </div>
                        </CardContent>
                        <CardFooter><Button onClick={handleGrantAccess} disabled={isGranting} className='w-full'>{isGranting && <Loader className='mr-2 h-4 w-4 animate-spin' />}Grant Access</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><UserCog/>User Account Management</CardTitle><CardDescription>Activate or deactivate a user account.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className='space-y-2'><Label htmlFor='status-email'>User Email</Label><Combobox options={userOptions} value={userStatusEmail} onChange={handleUserStatusSelection} placeholder="Select a user..." searchPlaceholder="Search users..." emptyPlaceholder="No user found."/></div>
                            <div className='flex items-center space-x-2'><Switch id="user-status" checked={isUserActive} onCheckedChange={setIsUserActive}/><Label htmlFor="user-status">{isUserActive ? "Active" : "Inactive"}</Label></div>
                        </CardContent>
                        <CardFooter><Button onClick={handleUpdateUserStatus} disabled={isUpdatingStatus} className='w-full'>{isUpdatingStatus && <Loader className='mr-2 h-4 w-4 animate-spin' />}{isUserActive ? <Check className='mr-2 h-4 w-4'/> : <Ban className='mr-2 h-4 w-4'/>}Set Status</Button></CardFooter>
                    </Card>
                </div>
          </div>
          <BusinessDetailDialog
            open={detailModalState.open}
            onOpenChange={(open) => setDetailModalState(prev => ({...prev, open}))}
            title={detailModalState.title}
            description={detailModalState.description}
            businesses={detailModalState.businesses}
            users={users}
          />
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
