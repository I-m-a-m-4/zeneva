'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import type { Receipt, Customer } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Package, ShoppingCart, Users, Download, Loader2, BarChart, Bot, Layers, TrendingUp } from 'lucide-react';
import SalesOverTimeChart from '@/components/reports/sales-over-time-chart';
import TopProductsChart from '@/components/reports/top-products-chart';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import TopCustomersList from '@/components/reports/top-customers-list';
import { safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import ProfitLossChart from '@/components/reports/profit-loss-chart';
import OverviewChart from '@/components/dashboard/overview-chart';
import CustomerAnalytics from '@/components/reports/customer-analytics';

import FeatureGate from '@/components/shared/feature-gate';
import AbcAnalysis from '@/components/reports/abc-analysis';
import PaymentMethodDistribution from '@/components/reports/payment-method-analysis';
import DeadStockAnalysis from '@/components/reports/dead-stock-analysis';
import HourlySalesHeatmap from '@/components/reports/hourly-sales-heatmap';
import BasketAnalysis from '@/components/reports/basket-analysis';

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


export default function ReportsDashboard() {
    const { currencySymbol, business, products, customers, isLoading: isPosLoading, receipts: allReceipts, stats, fetchReceiptsInRange } = usePOS();
    const dashboardRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [reportBatchReceipts, setReportBatchReceipts] = React.useState<Receipt[]>([]);
    const [isFetchingBatch, setIsFetchingBatch] = React.useState(false);

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
        if (!targetReceipts || !products || !customers) return { totalRevenue: 0, totalSales: 0, averageOrderValue: 0, inventoryValue: 0, totalCustomers: 0, totalProductsSold: 0, totalServicesSold: 0, totalItemsSold: 0, totalProductRevenue: 0, totalServiceRevenue: 0 };

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

        return {
            totalRevenue,
            totalSales,
            averageOrderValue,
            inventoryValue,
            totalCustomers: uniqueCustomerIds.size || Math.max(stats?.totalCustomers || 0, customers.length),
            totalProductsSold,
            totalServicesSold,
            totalItemsSold: totalProductsSold + totalServicesSold,
            totalProductRevenue,
            totalServiceRevenue,
            uniqueProductsSold: uniqueProductIds.size,
            catalogSize: Math.max(stats?.totalProducts || 0, products.length),
            dailyAverageSales: totalSales / activeDays,
            dailyAverageRevenue: totalRevenue / activeDays
        }

    }, [reportBatchReceipts, receipts, products, customers, stats]);

    // Surgical Analytics
    const { fetchDetailedAnalytics, fetchMonthlyAnalytics } = usePOS();
    const [rangeStats, setRangeStats] = React.useState<{ revenue: number, count: number, customers: number } | null>(null);
    const [monthlyStats, setMonthlyStats] = React.useState<{ month: string, sales: number }[] | null>(null);

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
    }, [dateFromTime, dateToTime]);

    React.useEffect(() => {
        if (dateFromTime && dateToTime) {
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
    }, [dateFromTime, dateToTime]);

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
    };

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
                isLoading={isPosLoading}
            >
                <div className="flex flex-wrap items-center justify-between gap-4 no-capture mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <DateRangePicker date={date} onDateChange={setDate} />
                        {isFetchingBatch && (
                            <div className="flex items-center gap-2 bg-secondary/50 backdrop-blur-sm border rounded-lg py-1.5 px-3 text-xs font-medium text-muted-foreground animate-in fade-in zoom-in-95 duration-200">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                <span>Updating metrics...</span>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleDownloadImage}><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>

                {showBlankScreenSpinner ? (
                    <div className="flex h-64 items-center justify-center animate-pulse">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Loading analytical dashboard...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                            <ReportStatCard
                                title="Revenue"
                                value={`${currencySymbol}${finalReportData?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                                icon={DollarSign}
                                description="Total earnings"
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

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <OverviewChart receipts={deepReceipts} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
                            </div>
                            <div className="lg:col-span-2">
                                <TopProductsChart receipts={deepReceipts} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <SalesOverTimeChart receipts={deepReceipts} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
                            </div>
                            <div className="lg:col-span-2">
                                <ProfitLossChart receipts={deepReceipts} currencySymbol={currencySymbol} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <PaymentMethodDistribution receipts={deepReceipts} currencySymbol={currencySymbol} />
                            </div>
                            <div className="lg:col-span-2">
                                <TopCustomersList receipts={deepReceipts} currencySymbol={currencySymbol} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <DeadStockAnalysis products={products || []} receipts={allReceipts || []} currencySymbol={currencySymbol} />
                            <HourlySalesHeatmap receipts={deepReceipts} />
                            <BasketAnalysis receipts={deepReceipts} />
                        </div>



                        <FeatureGate
                            requiredPlan="business"
                            currentPlan={business?.plan}
                            hasLifetimeAccess={hasLifetimeAccess}
                            featureName="Customer Intelligence"
                            featureDescription="Unlock advanced CRM analytics like customer lifetime value, purchase frequency, and churn risk."
                        >
                            <CustomerAnalytics 
                                customers={customers || []} 
                                receipts={deepReceipts} 
                                currencySymbol={currencySymbol} 
                                totalBusinessCustomers={stats?.totalCustomers} 
                            />
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
