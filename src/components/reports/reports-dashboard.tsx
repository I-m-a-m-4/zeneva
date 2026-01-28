
'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Receipt } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Package, PieChart, ShoppingCart, Users, Download, Loader2, Bot } from 'lucide-react';
import SalesOverTimeChart from './sales-over-time-chart';
import TopProductsChart from './top-products-chart';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import RecentSalesTable from './recent-sales-table';
import TopCustomersList from './top-customers-list';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import RefreshButton from '../shared/refresh-button';

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

function PlaceholderChart({ title, description }: { title: string, description: string }) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center bg-muted/50 rounded-b-lg">
                <div className="text-center text-muted-foreground p-4">
                    <div className="font-semibold flex items-center justify-center gap-2 mb-2"><Bot className="h-4 w-4 text-primary"/> Zen AI</div>
                    <p className="text-sm">Once your first sale is made, this report will automatically activate. Upgrade your plan for more detailed analytics.</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default function ReportsDashboard() {
    const { currencySymbol, business, products, customers, isLoading: isPosLoading } = usePOS();
    const firestore = useFirestore();
    const dashboardRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
    });

    const receiptsQuery = useMemoFirebase(() => {
        if (!business?.id || !firestore) return null;
        let q = query(collection(firestore, "receipts"), where("businessId", "==", business.id));
        if (date?.from) {
            q = query(q, where('createdAt', '>=', date.from));
        }
        if (date?.to) {
            // Adjust to include the whole end day
            const toDate = new Date(date.to);
            toDate.setHours(23, 59, 59, 999);
            q = query(q, where('createdAt', '<=', toDate));
        }
        return q;
    }, [business?.id, firestore, date]);

    const { data: receipts, isLoading: isLoadingReceipts } = useCollection<Receipt>(receiptsQuery);
    
    const isLoading = isPosLoading || isLoadingReceipts;

    const reportData = React.useMemo(() => {
        if (isLoading || !receipts || !products || !customers) return null;

        const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
        const totalSales = receipts.length;
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const inventoryValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
        const totalProductsSold = receipts.reduce((sum, r) => sum + r.items.length, 0);

        return {
            totalRevenue,
            totalSales,
            averageOrderValue,
            inventoryValue,
            totalCustomers: customers.length,
            totalProductsSold,
        }

    }, [receipts, products, customers, isLoading]);
    
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

    return (
        <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1">
            <PageTitle title="Reports" subtitle="Deep dive into your business performance.">
                <div className="flex items-center gap-2 no-capture">
                    <RefreshButton />
                    <DateRangePicker date={date} onDateChange={setDate} />
                    <Button onClick={handleDownloadImage}><Download className="mr-2 h-4 w-4"/>Download</Button>
                </div>
            </PageTitle>
            
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
             <>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <ReportStatCard 
                        title="Total Revenue"
                        value={`${currencySymbol}${reportData?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`}
                        icon={DollarSign}
                    />
                    <ReportStatCard 
                        title="Total Sales"
                        value={reportData?.totalSales.toLocaleString() || '0'}
                        icon={ShoppingCart}
                    />
                     <ReportStatCard 
                        title="Avg. Order Value"
                        value={`${currencySymbol}${reportData?.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}`}
                        icon={FileText}
                    />
                    <ReportStatCard 
                        title="Products Sold"
                        value={reportData?.totalProductsSold.toLocaleString() || '0'}
                        icon={Package}
                    />
                    <ReportStatCard 
                        title="Total Customers"
                        value={reportData?.totalCustomers.toLocaleString() || '0'}
                        icon={Users}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <SalesOverTimeChart receipts={receipts || []} currencySymbol={currencySymbol} />
                    </div>
                    <div className="lg:col-span-2">
                        <TopProductsChart receipts={receipts || []} />
                    </div>
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <RecentSalesTable receipts={receipts || []} currencySymbol={currencySymbol}/>
                    </div>
                    <div className="lg:col-span-2">
                        <TopCustomersList receipts={receipts || []} currencySymbol={currencySymbol} />
                    </div>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Profit & Loss Report</CardTitle>
                        <CardDescription>Analyze your profitability over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-12 text-muted-foreground">
                        <div className="font-semibold flex items-center justify-center gap-2 mb-2"><Bot className="h-4 w-4 text-primary"/> Zen AI</div>
                        <p className="text-sm">This feature requires a 'cost price' field for each product to calculate profit margins. We're working on adding this capability.</p>
                    </CardContent>
                </Card>
             </>
            )}
        </div>
    );
}

