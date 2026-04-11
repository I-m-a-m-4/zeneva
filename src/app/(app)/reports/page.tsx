'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import type { Receipt, Customer } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Package, ShoppingCart, Users, Download, Loader2, BarChart, Bot } from 'lucide-react';
import SalesOverTimeChart from '@/components/reports/sales-over-time-chart';
import TopProductsChart from '@/components/reports/top-products-chart';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import TopCustomersList from '@/components/reports/top-customers-list';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import ProfitLossChart from '@/components/reports/profit-loss-chart';
import CustomerAnalytics from '@/components/reports/customer-analytics';
import FeatureGate from '@/components/shared/feature-gate';
import AbcAnalysis from '@/components/reports/abc-analysis';

function ReportStatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
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


export default function ReportsDashboard() {
    const { currencySymbol, business, products, customers, isLoading: isPosLoading, receipts: allReceipts, stats, fetchReceiptsInRange } = usePOS();
    const dashboardRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [reportBatchReceipts, setReportBatchReceipts] = React.useState<Receipt[]>([]);
    const [isFetchingBatch, setIsFetchingBatch] = React.useState(false);

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    const hasLifetimeAccess = business?.accessLevel === 'lifetime';

    const receipts = React.useMemo(() => {
        if (!allReceipts) return [];

        const fromDate = date?.from;
        const toDate = date?.to;

        return allReceipts.filter(receipt => {
            if (!receipt.createdAt?.toDate) return false;
            const createdAt = receipt.createdAt.toDate();

            if (fromDate && createdAt < fromDate) return false;
            if (toDate) {
                const toDateEnd = new Date(toDate);
                toDateEnd.setHours(23, 59, 59, 999);
                if (createdAt > toDateEnd) return false;
            }
            return true;
        });
    }, [allReceipts, date]);

    const isLoading = isPosLoading || isFetchingBatch;

    const reportData = React.useMemo(() => {
        const targetReceipts = reportBatchReceipts.length > 0 ? reportBatchReceipts : (receipts || []);
        if (isLoading || !targetReceipts || !products || !customers) return { totalRevenue: 0, totalSales: 0, averageOrderValue: 0, inventoryValue: 0, totalCustomers: 0, totalProductsSold: 0, totalServicesSold: 0, totalItemsSold: 0 };

        const totalRevenue = targetReceipts.reduce((sum, r) => sum + r.total, 0);
        const totalSales = targetReceipts.length;
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const inventoryValue = products.filter(p => p.categoryType !== 'service').reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

        let totalProductsSold = 0;
        let totalServicesSold = 0;

        targetReceipts.forEach(r => {
            r.items.forEach(i => {
                const product = products.find(p => p.id === i.productId);
                if (product?.categoryType === 'service') {
                    totalServicesSold += i.quantity;
                } else {
                    totalProductsSold += i.quantity;
                }
            });
        });

        return {
            totalRevenue,
            totalSales,
            averageOrderValue,
            inventoryValue,
            totalCustomers: stats?.totalCustomers || customers.length,
            totalProductsSold,
            totalServicesSold,
            totalItemsSold: totalProductsSold + totalServicesSold
        }

    }, [reportBatchReceipts, receipts, products, customers, isLoading, stats]);

    // Surgical Analytics
    const { fetchDetailedAnalytics, fetchMonthlyAnalytics } = usePOS();
    const [rangeStats, setRangeStats] = React.useState<{ revenue: number, count: number, customers: number } | null>(null);
    const [monthlyStats, setMonthlyStats] = React.useState<{ month: string, sales: number }[] | null>(null);

    React.useEffect(() => {
        if (date?.from && date?.to) {
            const fetchRange = async () => {
                const res = await fetchDetailedAnalytics(date.from!, date.to!);
                setRangeStats(res);
            };
            fetchRange();
        } else {
            setRangeStats(null);
        }
    }, [date, fetchDetailedAnalytics]);

    React.useEffect(() => {
        if (date?.from && date?.to) {
            const fetchBatch = async () => {
                setIsFetchingBatch(true);
                const res = await fetchReceiptsInRange(date.from!, date.to!, 1000);
                setReportBatchReceipts(res);
                setIsFetchingBatch(false);
            };
            fetchBatch();
        }
    }, [date, fetchReceiptsInRange]);

    React.useEffect(() => {
        const fetchHistory = async () => {
             const res = await fetchMonthlyAnalytics(12);
             setMonthlyStats(res.map(m => ({ month: m.month, sales: m.revenue })));
        }
        fetchHistory();
    }, [fetchMonthlyAnalytics]);

    const finalReportData = React.useMemo(() => {
        if (!reportData) return null;
        if (!rangeStats) {
           return {
             ...reportData,
             totalRevenue: stats?.totalRevenue || 0,
             totalSales: stats?.totalSales || 0,
             totalCustomers: stats?.totalCustomers || 0
           };
        }
        return {
            ...reportData,
            totalRevenue: rangeStats.revenue,
            totalSales: rangeStats.count,
            totalCustomers: rangeStats.customers
        };
    }, [reportData, rangeStats, stats]);

    const handleDownloadImage = async () => {
        const element = dashboardRef.current;
        if (!element) return;
        toast({ title: 'Generating Report...', description: 'Please wait while we capture your dashboard.' });
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
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
        const deepReceipts = reportBatchReceipts.length > 0 ? reportBatchReceipts : receipts;

    return (
        <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1">
            <PageTitle title="Reports" subtitle="Deep dive into your business performance." />

            <FeatureGate
                requiredPlan="pro"
                currentPlan={business?.plan}
                hasLifetimeAccess={hasLifetimeAccess}
                featureName="Advanced Reports"
                featureDescription="Get a complete overview of your business performance with detailed sales, product, and customer analytics."
                className="flex-grow flex flex-col"
                placeholderContent={<ReportsPlaceholder />}
            >
                <div className="flex flex-wrap items-center gap-2 no-capture mb-6">
                    <DateRangePicker date={date} onDateChange={setDate} />
                    <Button onClick={handleDownloadImage}><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                            <ReportStatCard
                                title="Total Revenue"
                                value={`${currencySymbol}${finalReportData?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                icon={DollarSign}
                            />
                            <ReportStatCard
                                title="Total Sales"
                                value={finalReportData?.totalSales.toLocaleString() || '0'}
                                icon={ShoppingCart}
                            />
                            <ReportStatCard
                                title="Avg. Order Value"
                                value={`${currencySymbol}${finalReportData?.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}`}
                                icon={FileText}
                            />
                            <ReportStatCard
                                title="Items Sold"
                                value={finalReportData?.totalItemsSold.toLocaleString() || '0'}
                                icon={Package}
                            />
                            <ReportStatCard
                                title="Total Customers"
                                value={finalReportData?.totalCustomers.toLocaleString() || '0'}
                                icon={Users}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <SalesOverTimeChart receipts={deepReceipts} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
                            </div>
                            <div className="lg:col-span-2">
                                <TopProductsChart receipts={deepReceipts} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <ProfitLossChart receipts={deepReceipts} currencySymbol={currencySymbol} />
                            </div>
                            <div className="lg:col-span-2">
                                <TopCustomersList receipts={deepReceipts} currencySymbol={currencySymbol} />
                            </div>
                        </div>

                        <FeatureGate
                            requiredPlan="business"
                            currentPlan={business?.plan}
                            hasLifetimeAccess={hasLifetimeAccess}
                            featureName="Customer Intelligence"
                            featureDescription="Unlock advanced CRM analytics like customer lifetime value, purchase frequency, and churn risk."
                        >
                            <CustomerAnalytics customers={customers || []} receipts={deepReceipts} currencySymbol={currencySymbol} />
                        </FeatureGate>

                        <FeatureGate
                            requiredPlan="business"
                            currentPlan={business?.plan}
                            hasLifetimeAccess={hasLifetimeAccess}
                            featureName="Inventory Velocity"
                            featureDescription="Identify your fastest-moving products and optimize stock levels with data-driven ABC analysis."
                        >
                            <AbcAnalysis receipts={deepReceipts} products={products || []} currencySymbol={currencySymbol} />
                        </FeatureGate>
                    </div>
                )}
            </FeatureGate>
        </div>
    );
}
