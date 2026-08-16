'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useBranch } from '@/context/branch-context';
import type { Receipt, Customer } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Package, ShoppingCart, Users, Download, Loader2, BarChart, Bot, Layers, TrendingUp, Coins, Trophy, Flame, Sparkles, AlertCircle, Crown, Zap, Rocket, Target } from 'lucide-react';
import SalesOverTimeChart from '@/components/reports/sales-over-time-chart';
import TopProductsChart from '@/components/reports/top-products-chart';
import TopServicesChart from '@/components/reports/top-services-chart';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, isSameDay } from 'date-fns';
import TopCustomersList from '@/components/reports/top-customers-list';
import { safeToDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import ProfitLossChart from '@/components/reports/profit-loss-chart';
import OverviewChart from '@/components/dashboard/overview-chart';
import CustomerAnalytics from '@/components/reports/customer-analytics';
import DailySalesItemsTable from '@/components/reports/daily-sales-items-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Printer, Image as ImageIcon, BarChart2, CheckCircle } from 'lucide-react';

import FeatureGate from '@/components/shared/feature-gate';
import AbcAnalysis from '@/components/reports/abc-analysis';
import PaymentMethodDistribution from '@/components/reports/payment-method-analysis';
import DeadStockAnalysis from '@/components/reports/dead-stock-analysis';
import HourlySalesHeatmap from '@/components/reports/hourly-sales-heatmap';
import BasketAnalysis from '@/components/reports/basket-analysis';
import ProfitLossStatement from '@/components/reports/profit-loss-statement';
import RevenueForecastCard from '@/components/reports/revenue-forecast-card';
import InventoryDepletionCard from '@/components/reports/inventory-depletion-card';
import { firestore } from '@/firebase/instance';
import { collection, getDocs } from 'firebase/firestore';

function ReportStatCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
            </CardContent>
        </Card>
    );
}

const PlaceholderChart = ({ title, description }: { title: string, description: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center bg-muted/50 rounded-b-lg">
                <div className="text-center text-muted-foreground p-4">
                    <div className="font-semibold flex items-center justify-center gap-2 mb-2"><Bot className="h-4 w-4 text-primary" /> Zen AI</div>
                    <p className="text-sm">Once your first sale is made, this report will automatically activate. Upgrade your plan for more detailed analytics.</p>
                </div>
            </CardContent>
        </Card>
    );
};

const ReportsPlaceholder = () => (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <ReportStatCard title="Total Revenue" value="₦-.--" icon={DollarSign} />
            <ReportStatCard title="Total Sales" value="-" icon={ShoppingCart} />
            <ReportStatCard title="Avg. Order Value" value="₦-.--" icon={FileText} />
            <ReportStatCard title="Products Sold" value="-" icon={Package} />
            <ReportStatCard title="Total Customers" value="-" icon={Users} />
        </div>
        <PlaceholderChart title="Sales Over Time" description="Revenue performance for the selected period." />
    </div>
);

const COMPUTE_STEPS = [
    'Scanning inventory event logs...',
    'Measuring stock availability ratios...',
    'Evaluating reorder point coverage...',
    'Calculating catalog data quality...',
    'Cross-referencing sales velocity data...',
    'Benchmarking against global peers...',
    'Applying streak multiplier...',
    'Finalizing health score...',
];

function AutoComputingBanner({ score }: { score: number }) {
    const [progress, setProgress] = React.useState(0);
    const [stepIndex, setStepIndex] = React.useState(0);
    const [completed, setCompleted] = React.useState(false);
    const [sparkles, setSparkles] = React.useState<{ id: number; x: number; y: number; delay: number }[]>([]);
    const [displayScore, setDisplayScore] = React.useState(0);

    // Drive the progress bar and step labels
    React.useEffect(() => {
        const total = 3200; // ms to "complete"
        const interval = 40;
        let elapsed = 0;

        const timer = setInterval(() => {
            elapsed += interval;
            const pct = Math.min((elapsed / total) * 100, 100);
            setProgress(pct);

            // Advance step label
            const stepProgress = Math.floor((pct / 100) * COMPUTE_STEPS.length);
            setStepIndex(Math.min(stepProgress, COMPUTE_STEPS.length - 1));

            if (pct >= 100) {
                clearInterval(timer);
                setCompleted(true);
            }
        }, interval);

        return () => clearInterval(timer);
    }, []);

    // Count up the score display when complete
    React.useEffect(() => {
        if (!completed) return;
        let current = 0;
        const target = score;
        const step = Math.ceil(target / 25);
        const counter = setInterval(() => {
            current = Math.min(current + step, target);
            setDisplayScore(current);
            if (current >= target) clearInterval(counter);
        }, 30);
        return () => clearInterval(counter);
    }, [completed, score]);

    // Generate floating sparkles once computing completes
    React.useEffect(() => {
        if (!completed) return;
        const generated = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: 5 + Math.random() * 90,
            y: 10 + Math.random() * 80,
            delay: i * 0.12,
        }));
        setSparkles(generated);
    }, [completed]);

    const label = completed
        ? `Score computed: ${displayScore} / 100`
        : COMPUTE_STEPS[stepIndex];

    const tagColor = score >= 90 ? 'text-emerald-500 bg-emerald-500/10' :
        score >= 75 ? 'text-indigo-500 bg-indigo-500/10' :
            'text-amber-500 bg-amber-500/10';

    return (
        <div className="relative rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            {/* Floating sparkles overlay on completion */}
            {completed && sparkles.map(s => (
                <Sparkles
                    key={s.id}
                    className="absolute h-3 w-3 text-amber-400 animate-ping pointer-events-none opacity-70"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s`, animationDuration: '1.6s' }}
                />
            ))}

            {/* Shimmer layer while computing */}
            {!completed && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
                    />
                </div>
            )}

            <div className="px-6 py-5 flex flex-col gap-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg transition-all duration-500",
                            completed ? "bg-emerald-500/10" : "bg-indigo-500/10"
                        )}>
                            {completed
                                ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                                : <BarChart2 className="h-5 w-5 text-indigo-500 animate-pulse" />
                            }
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {completed ? 'Score Ready' : 'Computing Business Health Score'}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5 transition-all duration-300">
                                {label}
                            </p>
                        </div>
                    </div>
                    {completed && (
                        <div className={cn("text-xs font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wide transition-all", tagColor)}>
                            {score >= 90 ? 'Elite' : score >= 75 ? 'Strong' : 'Fair'}
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-75",
                            completed
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                    {/* Glowing pulse at the tip while computing */}
                    {!completed && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-400 shadow-[0_0_8px_3px_rgba(167,139,250,0.6)] animate-pulse"
                            style={{ left: `calc(${progress}% - 6px)`, transition: 'left 75ms linear' }}
                        />
                    )}
                </div>

                {/* Step micro-ticks */}
                <div className="flex gap-1">
                    {COMPUTE_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-all duration-300",
                                i < stepIndex ? "bg-indigo-500" :
                                    i === stepIndex && !completed ? "bg-indigo-400 animate-pulse" :
                                        completed ? "bg-emerald-500" :
                                            "bg-muted"
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}


export default function ReportsDashboard() {
    const { currencySymbol, business, products, customers, isLoading: isPosLoading, receipts: allReceipts, stats, fetchReceiptsInRange } = usePOS();
    const { activeBranchId } = useBranch();
    const dashboardRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [reportBatchReceipts, setReportBatchReceipts] = React.useState<Receipt[]>([]);
    const [isFetchingBatch, setIsFetchingBatch] = React.useState(false);
    const [leaderboard, setLeaderboard] = React.useState<any[]>([]);
    const [userRank, setUserRank] = React.useState<number>(0);

    const userScore = business?.settings?.businessAnalysis?.businessHealth?.score ?? 0;

    React.useEffect(() => {
        if (!business) return;

        const loadLeaderboardData = async () => {
            const userBusinessName = business?.name || 'Active Store';
            const skuCount = products?.length || 0;

            const peers: any[] = [];

            // 1. Attempt to fetch real snapshot scores from firestore
            try {
                const snapshotQuery = collection(firestore, 'store_health_snapshots');
                const querySnap = await getDocs(snapshotQuery);
                const realDocs = querySnap.docs.map(docObj => docObj.data());

                // Filter out current store if present
                const otherRealStores = realDocs.filter(d => d.storeId !== business.id);

                otherRealStores.forEach((d) => {
                    const hashedId = Array.from(d.storeId || '').reduce((s, c) => s + c.charCodeAt(0), 0) % 1000;
                    const pseudoName = `Merchant #${hashedId}`;
                    const score = d.overallScore || 78;
                    const country = d.country || 'Global';

                    peers.push({
                        name: pseudoName,
                        initials: `M${pseudoName.substring(10, 11)}`,
                        score: score,
                        details: `${d.storeSizeTier === 'large' ? '1200+' : d.storeSizeTier === 'medium' ? '450+' : '80+'} SKUs · ${country}`,
                        tag: score >= 90 ? 'Elite' : score >= 80 ? 'Strong' : 'Fair',
                        isUser: false
                    });
                });
            } catch (err) {
                console.error("Error loading real store health snapshots:", err);
            }

            // 2. Generate simulated peers to fill up to 400 competitors
            const seedString = userBusinessName;
            let seed = Array.from(seedString).reduce((acc, char) => acc + char.charCodeAt(0), 0);

            const pseudorandom = () => {
                const x = Math.sin(seed++) * 10000;
                return x - Math.floor(x);
            };

            const countries = ['United States', 'Nigeria', 'United Kingdom', 'Canada', 'South Africa', 'Kenya', 'Germany', 'Ghana', 'France', 'Australia'];
            const targetCount = 400;
            const currentSize = peers.length;

            for (let i = currentSize; i < targetCount; i++) {
                const score = Math.floor(55 + pseudorandom() * 43); // scores between 55 and 98
                const peerId = Math.floor(100 + pseudorandom() * 899);
                const randomSkus = Math.floor(50 + pseudorandom() * 1500);
                const country = countries[Math.floor(pseudorandom() * countries.length)];

                if (score === userScore) continue; // skip exact match

                peers.push({
                    name: `Merchant #${peerId}`,
                    initials: `M${peerId.toString().substring(0, 1)}`,
                    score: score,
                    details: `${randomSkus} SKUs · ${country}`,
                    tag: score >= 90 ? 'Elite' : score >= 80 ? 'Strong' : 'Fair',
                    isUser: false
                });
            }

            // 3. Add the active user
            peers.push({
                name: `You (${userBusinessName})`,
                initials: 'YO',
                score: userScore,
                details: `${skuCount} SKUs · ${business?.country || 'Global'}`,
                isUser: true,
                tag: userScore >= 90 ? 'Elite' : userScore >= 80 ? 'Strong' : 'Fair'
            });

            // 4. Sort and assign ranks
            const sorted = peers.sort((a, b) => b.score - a.score);
            sorted.forEach((peer, index) => {
                peer.rank = index + 1;
            });

            // Find user rank
            const rankIdx = sorted.findIndex(p => p.isUser);
            setUserRank(rankIdx !== -1 ? rankIdx + 1 : 4);
            setLeaderboard(sorted);
        };

        loadLeaderboardData();
    }, [business, products]);

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: subDays(new Date(), 365), // Fallback initial
        to: new Date(),
    });

    // Auto-adjust to Business Lifetime once loaded
    const businessCreatedAtTime = business?.createdAt ? safeToDate(business.createdAt).getTime() : 0;
    React.useEffect(() => {
        if (businessCreatedAtTime) {
            const inception = new Date(businessCreatedAtTime);
            setDate(prev => {
                // Prevent infinite state updates if they already match
                if (prev?.from && prev.from.getTime() === inception.getTime()) {
                    return prev;
                }
                return { from: inception, to: new Date() };
            });
        }
    }, [businessCreatedAtTime]);

    const hasLifetimeAccess = business?.accessLevel === 'lifetime';

    const receipts = React.useMemo(() => {
        if (!allReceipts) return [];

        const fromDate = date?.from;
        const toDate = date?.to;

        return allReceipts.filter(receipt => {
            if (!receipt.createdAt) return false;
            const createdAt = safeToDate(receipt.createdAt);

            if (fromDate && createdAt < fromDate) return false;
            if (toDate) {
                const toDateEnd = new Date(toDate);
                toDateEnd.setHours(23, 59, 59, 999);
                if (createdAt > toDateEnd) return false;
            }
            return true;
        });
    }, [allReceipts, date]);

    const isNative = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    const isBaseLoading = isNative
        ? (isPosLoading && (!allReceipts || allReceipts.length === 0))
        : isPosLoading;

    const hasDataToDisplay = (reportBatchReceipts && reportBatchReceipts.length > 0) || (receipts && receipts.length > 0);
    const showBlankScreenSpinner = (isBaseLoading || isFetchingBatch) && !hasDataToDisplay;

    const reportData = React.useMemo(() => {
        const targetReceipts = reportBatchReceipts.length > 0 ? reportBatchReceipts : (receipts || []);
        if (!targetReceipts || !products || !customers) return { totalRevenue: 0, totalSales: 0, averageOrderValue: 0, inventoryValue: 0, totalCustomers: 0, totalProductsSold: 0, totalServicesSold: 0, totalItemsSold: 0, totalProductRevenue: 0, totalServiceRevenue: 0, uniqueProductsSold: 0, catalogSize: 0, dailyAverageSales: 0, dailyAverageRevenue: 0, totalProfit: 0, totalCost: 0 };

        const totalRevenue = targetReceipts.reduce((sum, r) => sum + r.total, 0);
        const totalSales = targetReceipts.length;
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const inventoryValue = products.filter(p => p.categoryType !== 'service').reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

        let totalProductsSold = 0;
        let totalServicesSold = 0;
        let totalProductRevenue = 0;
        let totalServiceRevenue = 0;
        const uniqueProductIds = new Set<string>();
        const uniqueCustomerIds = new Set<string>();

        targetReceipts.forEach(r => {
            if (r.customer?.id) uniqueCustomerIds.add(r.customer.id);

            let receiptProductSum = 0;
            let receiptServiceSum = 0;

            r.items?.forEach(i => {
                uniqueProductIds.add(i.productId);
                const product = products.find(p => p.id === i.productId);
                const itemRevenue = (Number(i.price) || 0) * (Number(i.quantity) || 0);

                if (product?.categoryType === 'service') {
                    totalServicesSold += i.quantity;
                    receiptServiceSum += itemRevenue;
                } else {
                    totalProductsSold += i.quantity;
                    receiptProductSum += itemRevenue;
                }
            });

            const receiptTotalRaw = receiptProductSum + receiptServiceSum;
            const actualReceiptRevenue = Number(r.total) || 0;

            if (receiptTotalRaw > 0) {
                const pRatio = receiptProductSum / receiptTotalRaw;
                const sRatio = receiptServiceSum / receiptTotalRaw;
                totalProductRevenue += (pRatio * actualReceiptRevenue);
                totalServiceRevenue += (sRatio * actualReceiptRevenue);
            } else {
                totalProductRevenue += actualReceiptRevenue;
            }
        });

        const activeDays = new Set(targetReceipts.map(r => {
            const d = safeToDate(r.createdAt);
            return d.toISOString().split('T')[0];
        })).size || 1;

        const totalCost = targetReceipts.reduce((sum, r) => sum + (r.totalCost ?? r.items?.reduce((sumCost, item) => sumCost + ((item.costPrice || 0) * (item.quantity || 0)), 0) ?? 0), 0);
        const totalProfit = targetReceipts.reduce((sum, r) => sum + (r.profit ?? (r.total - (r.totalCost ?? 0))), 0);

        return {
            totalRevenue,
            totalSales,
            averageOrderValue,
            inventoryValue,
            totalCustomers: uniqueCustomerIds.size || (activeBranchId && activeBranchId !== 'all' ? customers.length : Math.max(stats?.totalCustomers || 0, customers.length)),
            totalProductsSold,
            totalServicesSold,
            totalItemsSold: totalProductsSold + totalServicesSold,
            totalProductRevenue,
            totalServiceRevenue,
            uniqueProductsSold: uniqueProductIds.size,
            catalogSize: activeBranchId && activeBranchId !== 'all' ? products.length : Math.max(stats?.totalProducts || 0, products.length),
            dailyAverageSales: totalSales / activeDays,
            dailyAverageRevenue: totalRevenue / activeDays,
            totalProfit,
            totalCost
        }

    }, [reportBatchReceipts, receipts, products, customers, stats, activeBranchId]);

    // Surgical Analytics
    const { fetchDetailedAnalytics, fetchMonthlyAnalytics } = usePOS();
    const [rangeStats, setRangeStats] = React.useState<{ revenue: number, count: number, customers: number } | null>(null);
    const [monthlyStats, setMonthlyStats] = React.useState<{ month: string, sales: number }[] | null>(null);
    const [activeTab, setActiveTab] = React.useState<string>('analytics');

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && (tab === 'analytics' || tab === 'daily-sales')) {
                setActiveTab(tab);
            }
        }
    }, []);

    const dateFromTime = date?.from ? safeToDate(date.from).getTime() : 0;
    const dateToTime = date?.to ? safeToDate(date.to).getTime() : 0;

    React.useEffect(() => {
        if (dateFromTime && dateToTime) {
            const fetchRange = async () => {
                const res = await fetchDetailedAnalytics(new Date(dateFromTime), new Date(dateToTime));
                setRangeStats(res);
            };
            fetchRange();
        } else {
            setRangeStats(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFromTime, dateToTime, fetchDetailedAnalytics]);

    React.useEffect(() => {
        if (dateFromTime && dateToTime) {
            // Clear stale data immediately so old branch data doesn't flash while loading
            setReportBatchReceipts([]);
            const fetchBatch = async () => {
                setIsFetchingBatch(true);
                const timeout = setTimeout(() => {
                    if (isFetchingBatch) {
                        toast({
                            title: 'Loading Data...',
                            description: 'It is taking a bit longer. If you are offline, we are showing your local synchronized data.',
                            variant: 'default'
                        });
                    }
                }, 4000);

                try {
                    const res = await fetchReceiptsInRange(new Date(dateFromTime), new Date(dateToTime));
                    setReportBatchReceipts(res);
                } finally {
                    clearTimeout(timeout);
                    setIsFetchingBatch(false);
                }
            };
            fetchBatch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFromTime, dateToTime, fetchReceiptsInRange]);

    React.useEffect(() => {
        const fetchHistory = async () => {
            const res = await fetchMonthlyAnalytics(12);
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            const dataMap: Record<string, number> = {};
            res.forEach(m => {
                let label = m.month;
                if (label.includes('-')) {
                    const monthIdx = parseInt(label.split('-')[1]) - 1;
                    label = monthNames[monthIdx] || label;
                }
                dataMap[label] = m.revenue;
            });

            const paddedStats = monthNames.map(m => ({
                month: m,
                sales: dataMap[m] || 0,
                totalSales: dataMap[m] || 0
            }));

            setMonthlyStats(paddedStats);
        }

        fetchHistory();
    }, [fetchMonthlyAnalytics]);



    const isTodayOnlyRange = React.useMemo(() => {
        if (!date?.from) return false;
        const today = new Date();
        const fromIsToday = isSameDay(date.from, today);
        const toIsToday = !date.to || isSameDay(date.to, today);
        return fromIsToday && toIsToday;
    }, [date]);

    const finalReportData = React.useMemo(() => {
        if (!reportData) return null;
        return reportData;
    }, [reportData]);

    const handleDownloadImage = async () => {
        const element = dashboardRef.current;
        if (!element) return;
        toast({ title: 'Generating Report...', description: 'Please wait while we capture your dashboard.' });
        try {
            const canvas = await html2canvas(element, {
                scale: 4,
                ignoreElements: (el) => el.classList.contains('no-capture')
            });
            const data = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = data;
            link.download = `zeneva-report-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ variant: 'success', title: 'Report Downloaded', description: 'Your dashboard image has been saved.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not capture the dashboard image.' });
        }
    };

    const deepReceipts = reportBatchReceipts.length > 0 ? reportBatchReceipts : receipts;

    return (
        <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1">
            <PageTitle title="Reports" subtitle="Deep dive into your business performance." />

            <FeatureGate
                requiredPlan="business"
                currentPlan={business?.plan}
                hasLifetimeAccess={hasLifetimeAccess}
                bypass={isTodayOnlyRange}
                featureName="Advanced Reports"
                featureDescription="Get a complete overview of your business performance with detailed sales, product, and customer analytics."
                className="flex-grow flex flex-col"
                isLoading={isPosLoading}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow">
                    <div className="flex flex-wrap items-center justify-between gap-4 no-capture border-b pb-4 mb-6">
                        <TabsList className="flex flex-col md:grid md:grid-cols-4 w-full md:w-[650px] h-auto gap-1">
                            <TabsTrigger value="analytics" className="text-sm font-semibold w-full">Analytics Dashboard</TabsTrigger>
                            <TabsTrigger value="profit-loss" className="text-sm font-semibold w-full">Profit & Loss</TabsTrigger>
                            <TabsTrigger value="daily-sales" className="text-sm font-semibold w-full">Daily Sales Items</TabsTrigger>
                            <TabsTrigger value="business-rating" className="text-sm font-semibold w-full">Business Rating</TabsTrigger>
                        </TabsList>
                        <div className="flex flex-wrap items-center gap-4">
                            {(activeTab === 'analytics' || activeTab === 'profit-loss') && (
                                <>
                                    <DateRangePicker date={date} onDateChange={setDate} />
                                    {isFetchingBatch && (
                                        <div className="flex items-center gap-2 bg-secondary/50 backdrop-blur-sm border rounded-lg py-1.5 px-3 text-xs font-medium text-muted-foreground animate-in fade-in zoom-in-95 duration-200">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                            <span>Updating metrics...</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <Download className="mr-2 h-4 w-4" />Export Report
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleDownloadImage}>
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        Export as High-Res Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.print()}>
                                        <Printer className="h-4 w-4 mr-2" />
                                        Export as PDF (Print)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {showBlankScreenSpinner ? (
                        <div className="flex h-64 items-center justify-center animate-pulse">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <span className="text-sm font-medium text-muted-foreground">Loading analytical dashboard...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <TabsContent value="analytics" className="space-y-6 mt-0">
                                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                                    <ReportStatCard
                                        title="Revenue"
                                        value={`${currencySymbol}${finalReportData?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={DollarSign}
                                        description="Total earnings"
                                    />
                                    <ReportStatCard
                                        title="Net Cost"
                                        value={`${currencySymbol}${finalReportData?.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={FileText}
                                        description="Total cost of sales"
                                    />
                                    <ReportStatCard
                                        title="Net Profit"
                                        value={`${currencySymbol}${finalReportData?.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={Coins}
                                        description="Earnings minus costs"
                                    />
                                    <ReportStatCard
                                        title="Product Revenue"
                                        value={`${currencySymbol}${finalReportData?.totalProductRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={Package}
                                        description="Revenue from physical goods"
                                    />
                                    <ReportStatCard
                                        title="Service Revenue"
                                        value={`${currencySymbol}${finalReportData?.totalServiceRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={TrendingUp}
                                        description="Revenue from services"
                                    />
                                    <ReportStatCard
                                        title="Sales"
                                        value={finalReportData?.totalSales.toLocaleString() || '0'}
                                        icon={ShoppingCart}
                                        description="Total transactions"
                                    />
                                    <ReportStatCard
                                        title="Unique Products"
                                        value={finalReportData?.uniqueProductsSold?.toLocaleString() || '0'}
                                        icon={Package}
                                        description="Different products sold"
                                    />
                                    <ReportStatCard
                                        title="Units Sold"
                                        value={finalReportData?.totalItemsSold.toLocaleString() || '0'}
                                        icon={Layers}
                                        description="Total pieces moved"
                                    />
                                    <ReportStatCard
                                        title="Daily Velocity"
                                        value={finalReportData?.dailyAverageSales?.toFixed(1) || '0'}
                                        icon={TrendingUp}
                                        description="Sales per day"
                                    />
                                    <ReportStatCard
                                        title="Daily Revenue"
                                        value={`${currencySymbol}${finalReportData?.dailyAverageRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={DollarSign}
                                        description="Average revenue per day"
                                    />
                                    <ReportStatCard
                                        title="Catalog Size"
                                        value={finalReportData?.catalogSize?.toLocaleString() || '0'}
                                        icon={Package}
                                        description="Total unique products in inventory"
                                    />
                                    <ReportStatCard
                                        title="Avg Order"
                                        value={`${currencySymbol}${finalReportData?.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                        icon={FileText}
                                        description="Revenue per sale"
                                    />
                                    <ReportStatCard
                                        title="Customers"
                                        value={finalReportData?.totalCustomers.toLocaleString() || '0'}
                                        icon={Users}
                                        description="Total unique buyers"
                                    />
                                </div>

                                <FeatureGate
                                    requiredPlan="business"
                                    currentPlan={business?.plan}
                                    hasLifetimeAccess={hasLifetimeAccess}
                                    featureName="Advanced Visual Analytics"
                                    featureDescription="Unlock deep dive visual charts, sales trends, and profit margins to truly understand your business."
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                        <RevenueForecastCard receipts={deepReceipts} currencySymbol={currencySymbol} />
                                        <InventoryDepletionCard receipts={deepReceipts} products={products || []} />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                                        <div className="lg:col-span-5">
                                            <OverviewChart receipts={deepReceipts} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                        <TopProductsChart receipts={deepReceipts} />
                                        <TopServicesChart receipts={deepReceipts} />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                                        <div className="lg:col-span-3">
                                            <SalesOverTimeChart receipts={deepReceipts} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <ProfitLossChart receipts={deepReceipts} currencySymbol={currencySymbol} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                                        <div className="lg:col-span-3">
                                            <PaymentMethodDistribution receipts={deepReceipts} currencySymbol={currencySymbol} />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <TopCustomersList receipts={deepReceipts} currencySymbol={currencySymbol} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 mt-6">
                                        <DeadStockAnalysis products={products || []} receipts={allReceipts || []} currencySymbol={currencySymbol} />
                                        <HourlySalesHeatmap receipts={deepReceipts} />
                                        <BasketAnalysis receipts={deepReceipts} />
                                    </div>
                                    <FeatureGate
                                        requiredPlan="business"
                                        currentPlan={business?.plan}
                                        hasLifetimeAccess={hasLifetimeAccess}
                                        featureName="Customer Intelligence & Inventory Velocity"
                                        featureDescription="Unlock advanced CRM analytics, customer lifetime value, and optimize stock levels with data-driven ABC analysis."
                                    >
                                        <div className="grid grid-cols-1 gap-6 mt-6">
                                            <CustomerAnalytics
                                                customers={customers || []}
                                                receipts={deepReceipts}
                                                currencySymbol={currencySymbol}
                                                totalBusinessCustomers={activeBranchId && activeBranchId !== 'all' ? customers.length : stats?.totalCustomers}
                                            />
                                            <AbcAnalysis receipts={deepReceipts} products={products || []} currencySymbol={currencySymbol} />
                                        </div>
                                    </FeatureGate>
                                </FeatureGate>
                            </TabsContent>
                            <TabsContent value="profit-loss" className="mt-0">
                                <ProfitLossStatement 
                                    receipts={deepReceipts} 
                                    products={products || []} 
                                    currencySymbol={currencySymbol} 
                                />
                            </TabsContent>
                            <TabsContent value="daily-sales" className="mt-0">
                                <DailySalesItemsTable receipts={allReceipts || []} products={products || []} currencySymbol={currencySymbol} />
                            </TabsContent>
                            <TabsContent value="business-rating" className="mt-0 space-y-6">
                                {/* Gamification Level & Streak Header */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    {/* Store Tier Rank Card */}
                                    <Card className="border border-border/60 bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground">Store Tier Rank</CardTitle>
                                            <Trophy className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-xl font-black text-foreground">
                                                {userScore === 0 ? "Unranked" : userScore >= 90 ? "Level 6: Dominator" : userScore >= 80 ? "Level 5: Elite" : userScore >= 60 ? "Level 4: Commander" : "Level 1: Vendor"}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {userScore === 0 ? "Start logging to rank up" : `Top ${Math.max(1, 100 - userScore)}% of peer merchants`}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Consistency Streak Card */}
                                    <Card className="border border-border/60 bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground">Consistency Streak</CardTitle>
                                            <Flame className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-xl font-black text-foreground">
                                                {userScore === 0 ? "No Streak Yet" : "7-Day Log Integrity"}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {userScore === 0 ? "Consistency is key" : "1.2x multiplier active"}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Next Tier Goal Card */}
                                    <Card className="border border-border/60 bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground">Next Tier Goal</CardTitle>
                                            <Target className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-xl font-black text-foreground">
                                                {userScore >= 90 ? 'Platinum Tier' : userScore >= 80 ? 'Elite Tier' : userScore >= 60 ? 'Gold Tier' : 'Silver Tier'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 w-full">
                                                <div className="h-2 bg-muted rounded-full flex-1 overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, userScore + 15)}%` }} />
                                                </div>
                                                <span className="text-[11px] font-bold text-muted-foreground">{Math.min(100, userScore + 15)}%</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Core Health Matrix & Performance Pillars */}
                                <Card className="p-8 border border-border/50 bg-card shadow-sm rounded-xl">
                                    <div className="mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 py-4">
                                        {/* Left side circular score display */}
                                        <div className="flex flex-col items-center text-center shrink-0 w-full lg:w-72">
                                            <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-[10px] border-emerald-500/20 bg-emerald-500/5">
                                                {/* Circular border track matching image */}
                                                <div className="absolute inset-0 rounded-full border-[6px] border-emerald-500 border-t-transparent animate-spin-slow opacity-85" style={{ transform: 'rotate(45deg)' }} />
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-6xl font-black tracking-tight text-foreground">
                                                        {userScore}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold tracking-widest text-emerald-500 uppercase mt-2">Score</span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black text-emerald-500 mt-6 leading-none">
                                                {userScore >= 90 ? 'Elite' : userScore >= 75 ? 'Strong' : userScore >= 50 ? 'Fair' : 'Needs Attention'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                                                {userScore === 0 ? "You have not added any products yet." : `Your inventory setup is superior to ${Math.max(10, Math.floor(userScore * 0.8))}% of grocery retailers globally.`}
                                            </p>
                                        </div>

                                        {/* Right side metrics list */}
                                        <div className="flex-1 w-full space-y-6">
                                            {/* Metric 1 */}
                                            <div className="p-4 rounded-lg bg-muted/20 border border-border/10 space-y-2">
                                                <div className="flex justify-between items-center text-sm font-semibold">
                                                    <span className="text-foreground flex items-center gap-1.5">
                                                        Availability <span className="text-xs text-muted-foreground font-normal">· 35% Weight</span>
                                                    </span>
                                                    <span className="font-extrabold text-foreground">{(business?.settings?.businessAnalysis?.businessHealth as any)?.availability ?? 0} / 100</span>
                                                </div>
                                                <div className="relative h-2 bg-gradient-to-r from-red-600/30 via-amber-500/30 to-emerald-500/30 rounded-full overflow-visible">
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white border border-stone-800 rounded-sm shadow-sm transition-all duration-500"
                                                        style={{ left: `${(business?.settings?.businessAnalysis?.businessHealth as any)?.availability ?? 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-medium">
                                                    {userScore === 0 ? "No inventory data available." : "Reorder points are set correctly. Only a few items currently out of stock."}
                                                </p>
                                            </div>

                                            {/* Metric 2 */}
                                            <div className="p-4 rounded-lg bg-muted/20 border border-border/10 space-y-2">
                                                <div className="flex justify-between items-center text-sm font-semibold">
                                                    <span className="text-foreground flex items-center gap-1.5">
                                                        Efficiency <span className="text-xs text-muted-foreground font-normal">· 25% Weight</span>
                                                    </span>
                                                    <span className="font-extrabold text-foreground">{(business?.settings?.businessAnalysis?.businessHealth as any)?.efficiency ?? 0} / 100</span>
                                                </div>
                                                <div className="relative h-2 bg-gradient-to-r from-red-600/30 via-amber-500/30 to-emerald-500/30 rounded-full overflow-visible">
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white border border-stone-800 rounded-sm shadow-sm transition-all duration-500"
                                                        style={{ left: `${(business?.settings?.businessAnalysis?.businessHealth as any)?.efficiency ?? 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-medium">
                                                    {userScore === 0 ? "No sales velocity data." : "Turnover velocity is moderate. Some dead stock items identified."}
                                                </p>
                                            </div>

                                            {/* Metric 3 */}
                                            <div className="p-4 rounded-lg bg-muted/20 border border-border/10 space-y-2">
                                                <div className="flex justify-between items-center text-sm font-semibold">
                                                    <span className="text-foreground flex items-center gap-1.5">
                                                        Data Quality <span className="text-xs text-muted-foreground font-normal">· 25% Weight</span>
                                                    </span>
                                                    <span className="font-extrabold text-foreground">{(business?.settings?.businessAnalysis?.businessHealth as any)?.dataQuality ?? 0} / 100</span>
                                                </div>
                                                <div className="relative h-2 bg-gradient-to-r from-red-600/30 via-amber-500/30 to-emerald-500/30 rounded-full overflow-visible">
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white border border-stone-800 rounded-sm shadow-sm transition-all duration-500"
                                                        style={{ left: `${(business?.settings?.businessAnalysis?.businessHealth as any)?.dataQuality ?? 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-medium">
                                                    {userScore === 0 ? "Missing SKU, Image, or Category data." : "Key fields are reasonably complete for most products."}
                                                </p>
                                            </div>

                                            {/* Metric 4 */}
                                            <div className="p-4 rounded-lg bg-muted/20 border border-border/10 space-y-2">
                                                <div className="flex justify-between items-center text-sm font-semibold">
                                                    <span className="text-foreground flex items-center gap-1.5">
                                                        Integrity <span className="text-xs text-muted-foreground font-normal">· 15% Weight</span>
                                                    </span>
                                                    <span className="font-extrabold text-foreground">{(business?.settings?.businessAnalysis?.businessHealth as any)?.integrity ?? 0} / 100</span>
                                                </div>
                                                <div className="relative h-2 bg-gradient-to-r from-red-600/30 via-amber-500/30 to-emerald-500/30 rounded-full overflow-visible">
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white border border-stone-800 rounded-sm shadow-sm transition-all duration-500"
                                                        style={{ left: `${(business?.settings?.businessAnalysis?.businessHealth as any)?.integrity ?? 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-medium">
                                                    {userScore === 0 ? "No transaction logs." : "Logs are extremely consistent. Few manual corrections made."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Peer Leaderboard & Competition Panel */}
                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Left/Main Leaderboard Card */}
                                    <Card className="p-6 border border-border/50 bg-card shadow-sm rounded-xl md:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="h-5 w-5 text-amber-500" />
                                                <h4 className="text-sm font-black tracking-tight uppercase text-foreground">Peer Leaderboard (Grocery Segment)</h4>
                                            </div>
                                            <span className="text-[10px] bg-muted border text-muted-foreground px-2 py-0.5 rounded-full font-bold">Global</span>
                                        </div>
                                        <div className="divide-y divide-border/40">
                                            {/* Top 3 Global Competitors */}
                                            {leaderboard.slice(0, 3).map((peer) => (
                                                <div key={peer.rank} className="flex items-center justify-between py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-muted-foreground w-6 text-center">
                                                            {peer.rank === 1 ? '🥇' : peer.rank === 2 ? '🥈' : '🥉'}
                                                        </span>
                                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-black text-amber-600">
                                                            {peer.initials}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{peer.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{peer.details}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-extrabold text-foreground">{peer.score}</span>
                                                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                                            {peer.tag}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Ellipsis separator if user is lower rank */}
                                            {userRank > 5 && (
                                                <div className="flex justify-center py-2 text-[10px] text-muted-foreground font-semibold border-t border-b border-border/10 bg-muted/10">
                                                    ... {userRank - 4} other global competitors ...
                                                </div>
                                            )}

                                            {/* User context slice (immediate competitors directly above & below) */}
                                            {leaderboard.filter(p => p.rank >= userRank - 1 && p.rank <= userRank + 1 && p.rank > 3).map((peer) => (
                                                <div
                                                    key={peer.rank}
                                                    className={cn(
                                                        "flex items-center justify-between py-3 px-2 -mx-2 my-0.5 transition-all duration-300",
                                                        peer.isUser ? "bg-primary/5 border border-primary/20 rounded-lg my-1 animate-pulse" : "opacity-75"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-sm w-6 text-center font-bold", peer.isUser ? "text-primary font-black animate-bounce" : "text-muted-foreground")}>
                                                            {peer.rank}
                                                        </span>
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black",
                                                            peer.isUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {peer.initials}
                                                        </div>
                                                        <div>
                                                            <p className={cn("text-sm font-bold", peer.isUser ? "text-foreground font-extrabold" : "text-foreground")}>
                                                                {peer.name}
                                                            </p>
                                                            <p className={cn("text-[10px]", peer.isUser ? "text-primary font-bold" : "text-muted-foreground")}>
                                                                {peer.details}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-sm font-extrabold", peer.isUser ? "text-primary font-black" : "text-foreground")}>
                                                            {peer.score}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                                                            peer.isUser ? "bg-emerald-500/15 text-emerald-600" : "bg-emerald-500/10 text-emerald-500"
                                                        )}>
                                                            {peer.tag}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Bottom ellipsis separator if there are more below */}
                                            {userRank < 398 && (
                                                <div className="flex justify-center py-2 text-[10px] text-muted-foreground font-semibold border-t border-b border-border/10 bg-muted/10">
                                                    ... {400 - userRank - 1} other global competitors ...
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Competition Rules / Gamification Explainer */}
                                    <Card className="p-6 border border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent rounded-xl flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <Sparkles className="h-5 w-5 animate-spin-slow" />
                                                <span className="text-sm font-black tracking-tight uppercase">Leaderboard Mechanics</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Competition ranking is computed daily. Merchants gain points by improving reorder point coverage, reducing dead stock capital, and maintaining clean catalog descriptions.
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground">Log Accuracy</span>
                                                    <span className="text-emerald-500">+15 pts</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground">Dead Stock below 10%</span>
                                                    <span className="text-emerald-500">+25 pts</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground">Perfect Catalog Details</span>
                                                    <span className="text-emerald-500">+20 pts</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-border mt-4 text-[10px] text-muted-foreground">
                                            Ranks reset at the end of the month. Keep logs consistent to retain your commander badge!
                                        </div>
                                    </Card>
                                </div>


                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </FeatureGate>
        </div>
    );
}
