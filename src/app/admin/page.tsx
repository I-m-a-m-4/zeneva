
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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo, useState } from 'react';
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
import { format, formatDistanceToNowStrict } from 'date-fns';
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

const PIE_CHART_COLORS = ['hsl(var(--primary))', '#60a5fa', '#a78bfa', '#facc15', '#fb923c', '#4ade80'];

export default function AdminDashboardPage() {
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
  
  const loading = usersLoading || businessesLoading || productsLoading || receiptsLoading || purchasesLoading;
  
  const userOptions = useMemo(() => (users || []).map(user => ({
      value: user.email,
      label: `${user.name} (${user.email})`
  })), [users]);

    const purchasesWithUserInfo = useMemo(() => {
        if (!purchases || !users) return [];
        return purchases.map(purchase => {
        const user = users.find(u => u.id === purchase.userId);
        return {
            ...purchase,
            userProfile: user,
        };
        });
    }, [purchases, users]);


  const analyticsData = useMemo(() => {
    const totalUsers = users?.length || 0;
    const totalBusinesses = businesses?.length || 0;
    const totalProducts = products?.length || 0;
    const totalReceipts = receipts?.length || 0;
    const now = new Date();
    
    // Revenue calculations from purchases (subscriptions)
    const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const platformAOV = totalReceipts > 0 ? (receipts?.reduce((sum, r) => sum + r.total, 0) || 0) / totalReceipts : 0;
    const averageRevenuePerBusiness = totalBusinesses > 0 ? totalRevenue / totalBusinesses : 0;
    
    const businessRevenue = (purchases || []).reduce((acc, purchase) => {
        if (purchase.businessId) {
            acc[purchase.businessId] = (acc[purchase.businessId] || 0) + purchase.amount;
        }
        return acc;
    }, {} as Record<string, number>);

    const topBusinesses = Object.entries(businessRevenue)
        .map(([businessId, revenue]) => {
            const business = businesses?.find(b => b.id === businessId);
            const owner = users?.find(u => u.businessId === businessId && u.role === 'admin');
            return { id: businessId, name: business?.name || 'Unknown Business', revenue: revenue, ownerName: owner?.name || 'N/A' }
        })
        .sort((a,b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    const mrr = (businesses?.filter(b => b.plan === 'pro').length || 0) * 10000 + (businesses?.filter(b => b.plan === 'business').length || 0) * 30000;
    const arr = mrr * 12;

    const activeUsers = (users || []).filter(u => u.status === 'active' || typeof u.status === 'undefined');
    const inactiveUsers = (users || []).filter(u => u.status === 'inactive');
    
    const usersByDate = (users || []).reduce((acc, user) => {
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
    
    const activeSubscriptions = businesses?.filter(b => b.plan === 'pro' || b.plan === 'business').length || 0;
    const trialingUsers = businesses?.filter(b => b.trialExpiresAt?.toDate() > now && b.plan === 'starter').length || 0;
    const subscriptionStatus = (businesses || []).reduce((acc, business) => {
        if (business.accessLevel === 'lifetime') acc.Lifetime = (acc.Lifetime || 0) + 1;
        else if (business.plan && business.plan !== 'starter') acc.Subscribed = (acc.Subscribed || 0) + 1;
        else if (business.trialExpiresAt?.toDate() > now) acc.Trial = (acc.Trial || 0) + 1;
        else acc.Expired = (acc.Expired || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const subscriptionStatusData = Object.entries(subscriptionStatus).map(([name, value]) => ({name, value}));
    
    const planCounts = (businesses || []).reduce((acc, business) => {
        const plan = business.plan || 'Free';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const planDistributionData = Object.entries(planCounts).map(([name, value]) => ({name: name.charAt(0).toUpperCase() + name.slice(1), value}));

    const userRoleCounts = (users || []).reduce((acc, user) => {
        const role = user.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const userRoleData = Object.entries(userRoleCounts).map(([name, value]) => ({name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), value}));

    const platformTopItems = (receipts || []).flatMap(r => r.items).reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    const topSellingProducts = Object.entries(platformTopItems).sort((a, b) => b[1] - a[1]).slice(0, 5);


    return { totalUsers, totalBusinesses, totalProducts, totalRevenue, totalReceipts, platformAOV, averageRevenuePerBusiness, mrr, arr, activeUsers, inactiveUsers, newUserGrowth, revenueGrowth, topBusinesses, categoryData, subscriptionStatusData, planDistributionData, userRoleData, activeSubscriptions, trialingUsers, topSellingProducts };
  }, [users, businesses, products, receipts, purchases]);


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
            await updateDoc(businessDocRef, { accessLevel: 'lifetime', trialExpiresAt: null });
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
  
  const getTrialStatus = (business: BusinessInstance) => {
    if (business.accessLevel === 'lifetime') return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Lifetime</Badge>;
    if (!business?.trialExpiresAt?.toDate) return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> No Trial Data</Badge>;
    const expiryDate = business.trialExpiresAt.toDate();
    const now = new Date();
    if (expiryDate < now) return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Expired</Badge>;
    return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Ends {formatDistanceToNowStrict(expiryDate, { addSuffix: true })}</Badge>;
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Admin Dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { title: "Total Revenue", value: `₦${analyticsData.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign },
    { title: "Total Businesses", value: analyticsData.totalBusinesses.toLocaleString(), icon: Building },
    { title: "Total Users", value: analyticsData.totalUsers.toLocaleString(), icon: Users },
    { title: "Total Products", value: analyticsData.totalProducts.toLocaleString(), icon: Package },
    { title: "Active Subscriptions", value: analyticsData.activeSubscriptions.toLocaleString(), icon: UserCheck, description: 'Pro + Business plans' },
    { title: "Trialing Users", value: analyticsData.trialingUsers.toLocaleString(), icon: Clock },
    { title: "Platform AOV", value: `₦${analyticsData.platformAOV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: ShoppingCart, description: "Avg. POS Value" },
    { title: "Total POS Sales", value: analyticsData.totalReceipts.toLocaleString(), icon: FileText },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide overview of Zeneva.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => <StatCard key={card.title} {...card} />)}
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
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><TrendingUp className="text-amber-500"/>Top 5 Selling Products</CardTitle>
                    <CardDescription>Platform-wide product sales from POS transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Quantity Sold</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyticsData.topSellingProducts.map(([name, quantity]) => (
                                <TableRow key={name}>
                                    <TableCell className="font-medium">{name}</TableCell>
                                    <TableCell className="text-right font-semibold">{quantity.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="text-primary"/>User Role Distribution</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                        <Pie data={analyticsData.userRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {analyticsData.userRoleData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                        </RePieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="text-primary"/>Plan Distribution</CardTitle></CardHeader>
                  <CardContent>
                      <ResponsiveContainer width="100%" height={150}>
                         <RePieChart>
                           <Pie data={analyticsData.planDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                              {analyticsData.planDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />))}
                           </Pie>
                           <Tooltip content={<CustomTooltip />} />
                           <Legend iconSize={10} />
                         </RePieChart>
                      </ResponsiveContainer>
                  </CardContent>
              </Card>
            </div>
       </div>
       
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Accounts</CardTitle>
                        <CardDescription>List of all users with an active status on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[330px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead className="text-right">Trial Status</TableHead>
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
                                                <TableCell className="text-right">{business ? getTrialStatus(business) : <Badge variant="outline">No Business</Badge>}</TableCell>
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
                                                <TableCell><Badge variant="destructive">Inactive</Badge></TableCell>
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
                        <div className='space-y-2'><Label htmlFor='status-email'>User Email</Label><Combobox options={userOptions} value={userStatusEmail} onChange={setUserStatusEmail} placeholder="Select a user..." searchPlaceholder="Search users..." emptyPlaceholder="No user found."/></div>
                        <div className='flex items-center space-x-2'><Switch id="user-status" checked={isUserActive} onCheckedChange={setIsUserActive}/><Label htmlFor="user-status">{isUserActive ? "Active" : "Inactive"}</Label></div>
                    </CardContent>
                    <CardFooter><Button onClick={handleUpdateUserStatus} disabled={isUpdatingStatus} className='w-full'>{isUpdatingStatus && <Loader className='mr-2 h-4 w-4 animate-spin' />}{isUserActive ? <Check className='mr-2 h-4 w-4'/> : <Ban className='mr-2 h-4 w-4'/>}Set Status</Button></CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Newspaper/>Blog Management</CardTitle>
                        <CardDescription>Create and manage blog posts for the platform.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" asChild>
                            <Link href="/admin-imamshaffy/blog">Go to Blog Posts</Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Send/>Notifications</CardTitle>
                        <CardDescription>Send platform-wide announcements to all users.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button className="w-full" asChild>
                            <Link href="/admin-imamshaffy/notifications">Send Notification</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
      </div>
    </div>
  );
}

    

    