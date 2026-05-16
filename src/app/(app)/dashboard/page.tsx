
'use client';
import *as React from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/shared/page-title';
import SummaryCard from '@/components/dashboard/summary-card';
import {
  DollarSign,
  Package,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  Activity,
  PackageCheck,
  PackageSearch,
  FileDigit,
  Layers,
  Archive,
  Award,
  PlusCircle,
  Download,
  Globe,
  Bot,
  ArrowRight,
  Users, // for new customers
  ShoppingBag, // for units sold
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { TopSellingItem, BusinessAnalysisOutput, Receipt } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import html2canvas from 'html2canvas';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// New imports for date filtering
import { DateRangePicker } from '@/components/reports/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { safeToDate } from '@/lib/utils';

const OverviewChart = dynamic(() => import('@/components/dashboard/overview-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] lg:col-span-2" />
});

const CategoryPieChart = dynamic(() => import('@/components/dashboard/category-pie-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px]" />
});

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);

  const { products, receipts, customers, isLoading: isPosLoading, currencySymbol, business, onlineOrders, stats, fetchReceiptsInRange } = usePOS();

  // Date range state, defaults to today
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });


  const [dashboardBatchReceipts, setDashboardBatchReceipts] = React.useState<Receipt[]>([]);
  const [isFetchingBatch, setIsFetchingBatch] = React.useState(false);

  const isNative = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
  const isLoading = isNative ? (isPosLoading && (!products || products.length === 0)) : isPosLoading; // Primary connection loading only
  const isUpdating = isFetchingBatch; // Secondary background update state

  const dashboardData = React.useMemo(() => {
    const inventoryItems = products || [];
    const allReceipts = dashboardBatchReceipts.length > 0 ? dashboardBatchReceipts : (receipts || []);
    const allCustomers = customers || [];
    const allOnlineOrders = onlineOrders || [];

    // Filter data based on selected date range
    const fromDate = date?.from;
    const toDate = date?.to;

    const filterByDate = (item: { createdAt?: any }) => {
      if (!item.createdAt) return false;
      const itemDate = safeToDate(item.createdAt);
      
      if (isNaN(itemDate.getTime())) return false;

      if (fromDate && !toDate) { // single day selection
        return isWithinInterval(itemDate, { start: startOfDay(fromDate), end: endOfDay(fromDate) });
      }
      if (fromDate && toDate) {
        return isWithinInterval(itemDate, { start: startOfDay(fromDate), end: endOfDay(toDate) });
      }
      return true; // No date filter applied
    };

    const filteredReceipts = allReceipts.filter(filterByDate);
    const filteredOnlineOrders = allOnlineOrders.filter(filterByDate);
    const newCustomers = allCustomers.filter(filterByDate);

    const totalStock = inventoryItems.filter(item => item.categoryType !== 'service').reduce((sum, item) => sum + Math.max(0, item.stock || 0), 0);
    const uniqueSkus = inventoryItems.filter(item => item.categoryType !== 'service').length;
    const lowStockItems = inventoryItems.filter(item => item.categoryType !== 'service' && (item.stock || 0) <= (item.lowStockThreshold || 0)).length;

    const totalSalesValue = filteredReceipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);
    const totalReceiptsCount = filteredReceipts.length;

    const totalOnlineSalesValue = filteredOnlineOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOnlineOrdersCount = filteredOnlineOrders.length;

    const totalRevenue = (totalSalesValue || 0) + (totalOnlineSalesValue || 0);

    const posUnitsSold = filteredReceipts.reduce((sum, r) => sum + (r.items?.reduce((q: number, i: any) => q + (i.quantity || 0), 0) || 0), 0);
    const onlineUnitsSold = filteredOnlineOrders.reduce((sum, o) => sum + (o.items?.reduce((q: number, i: any) => q + (i.quantity || 0), 0) || 0), 0);
    const totalUnitsSold = posUnitsSold + onlineUnitsSold;

    const itemSalesCount: Record<string, number> = {};
    let serviceUnitsSold = 0;
    let productUnitsSold = 0;
    let serviceRevenue = 0;
    let productRevenue = 0;

    filteredReceipts.forEach(receipt => {
      if (!receipt || !Array.isArray(receipt.items)) return;
      
      let receiptProductSum = 0;
      let receiptServiceSum = 0;

      receipt.items.forEach(item => {
        if (!item || !item.productId) return;
        const product = inventoryItems.find(p => p.id === item.productId);
        const name = product?.name || item.name || 'Unknown Item';
        itemSalesCount[name] = (itemSalesCount[name] || 0) + (item.quantity || 0);
        
        const itemRev = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        if (product) {
          if (product.categoryType === 'service') {
            serviceUnitsSold += (item.quantity || 0);
            receiptServiceSum += itemRev;
          } else {
            productUnitsSold += (item.quantity || 0);
            receiptProductSum += itemRev;
          }
        } else {
          productUnitsSold += (item.quantity || 0);
          receiptProductSum += itemRev;
        }
      });

      const receiptTotalRaw = receiptProductSum + receiptServiceSum;
      const actualReceiptRevenue = Number(receipt.total) || 0;

      if (receiptTotalRaw > 0) {
        const pRatio = receiptProductSum / receiptTotalRaw;
        const sRatio = receiptServiceSum / receiptTotalRaw;
        productRevenue += (pRatio * actualReceiptRevenue);
        serviceRevenue += (sRatio * actualReceiptRevenue);
      } else {
        productRevenue += actualReceiptRevenue; // Fallback to product revenue if no item info
      }
    });

    filteredOnlineOrders.forEach(order => {
      if (!order || !Array.isArray(order.items)) return;
      
      let orderProductSum = 0;
      let orderServiceSum = 0;

      order.items.forEach(item => {
        if (!item || !item.productId) return;
        const product = inventoryItems.find(p => p.id === item.productId);
        const name = product?.name || item.name || 'Unknown Item';
        itemSalesCount[name] = (itemSalesCount[name] || 0) + (item.quantity || 0);
        
        const itemRev = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        if (product) {
          if (product.categoryType === 'service') {
            serviceUnitsSold += (item.quantity || 0);
            orderServiceSum += itemRev;
          } else {
            productUnitsSold += (item.quantity || 0);
            orderProductSum += itemRev;
          }
        } else {
          productUnitsSold += (item.quantity || 0);
          orderProductSum += itemRev;
        }
      });

      const orderTotalRaw = orderProductSum + orderServiceSum;
      const actualOrderRevenue = Number(order.total) || 0;

      if (orderTotalRaw > 0) {
        const pRatio = orderProductSum / orderTotalRaw;
        const sRatio = orderServiceSum / orderTotalRaw;
        productRevenue += (pRatio * actualOrderRevenue);
        serviceRevenue += (sRatio * actualOrderRevenue);
      } else {
        productRevenue += actualOrderRevenue;
      }
    });

    const topSellingItems = Object.entries(itemSalesCount)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 5) // Show top 5
      .map(([name, quantitySold]) => {
        const inventoryItem = inventoryItems.find(invItem => invItem.name === name);
        return {
          ...(inventoryItem || { id: `manual-${name}`, name: name, sku: 'N/A', stock: 0, price: 0, category: 'N/A', lowStockThreshold: 10 }),
          quantitySold: quantitySold
        } as TopSellingItem;
      });

    const isLoyaltyEnabled = business?.settings?.loyaltyProgramEnabled;
    
    // Calculate spend in range for all customers found in filtered receipts
    const customerSpendInRange: Record<string, number> = {};
    filteredReceipts.forEach(r => {
      if (r.customer?.id) {
        customerSpendInRange[r.customer.id] = (customerSpendInRange[r.customer.id] || 0) + (r.total || 0);
      }
    });

    const sortedCustomers = [...allCustomers].sort((a, b) => {
      if (isLoyaltyEnabled) {
        return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      }
      return (customerSpendInRange[b.id] || 0) - (customerSpendInRange[a.id] || 0);
    });

    const topLoyaltyCustomers = sortedCustomers.slice(0, 3).map(c => ({
        ...c,
        spendInRange: customerSpendInRange[c.id] || 0
    }));

    // Default to lifetime stats if no range is selected or if it's broad
    const showLifetime = !date?.from || !date?.to;

    return {
      totalStock,
      uniqueSkus,
      lowStockItems,
      totalSalesValue: showLifetime ? (stats?.totalRevenue || 0) : totalSalesValue,
      totalReceipts: showLifetime ? (stats?.totalSales || 0) : totalReceiptsCount,
      totalOnlineSalesValue,
      totalOnlineOrdersCount,
      totalRevenue: showLifetime ? (stats?.totalRevenue || 0) : totalRevenue,
      newCustomersCount: showLifetime ? (stats?.totalCustomers || 0) : newCustomers.length,
      totalUnitsSold: showLifetime ? (stats?.totalUnitsSold || 0) : totalUnitsSold,

      topSellingItems,
      topLoyaltyCustomers,
      isLoyaltyEnabled,
      debtItemsCount: inventoryItems.filter(p => p.categoryType !== 'service' && (p.stock || 0) < 0).length,
      totalDebtUnits: inventoryItems.filter(p => p.categoryType !== 'service' && (p.stock || 0) < 0).reduce((acc, p) => acc + Math.abs(p.stock || 0), 0),
      serviceUnitsSold,
      productUnitsSold,
      serviceRevenue,
      productRevenue
    };
  }, [products, receipts, customers, onlineOrders, date, stats, dashboardBatchReceipts]);

  // Surgical Analytics for Date Range
  const [rangeStats, setRangeStats] = React.useState<{ revenue: number, count: number, customers: number } | null>(null);
  const [monthlyStats, setMonthlyStats] = React.useState<{ month: string, totalSales: number }[] | null>(null);
  const { fetchDetailedAnalytics, fetchMonthlyAnalytics } = usePOS();

  React.useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetchMonthlyAnalytics(12);
        if (isMounted) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            // Map existing data
            const dataMap: Record<string, number> = {};
            res.forEach(m => {
              let label = m.month;
              if (label.includes('-')) {
                const monthIdx = parseInt(label.split('-')[1]) - 1;
                label = months[monthIdx] || label;
              }
              dataMap[label] = m.revenue;
            });

            // Ensure all 12 months are present
            const paddedStats = months.map(m => ({
              month: m,
              totalSales: dataMap[m] || 0
            }));

            setMonthlyStats(paddedStats);
        }
      } catch (err) {

        console.error("Dashboard history fetch failed:", err);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [fetchMonthlyAnalytics]);


  const dateFromTime = date?.from ? safeToDate(date.from).getTime() : 0;
  const dateToTime = date?.to ? safeToDate(date.to).getTime() : 0;

  React.useEffect(() => {
    if (dateFromTime && dateToTime) {
      const fetchRange = async () => {
        setIsFetchingBatch(true);
        try {
          const parsedFrom = new Date(dateFromTime);
          const parsedTo = new Date(dateToTime);
          
          // Fetch high-fidelity range stats
          const res = await fetchDetailedAnalytics(startOfDay(parsedFrom), endOfDay(parsedTo));
          setRangeStats(res);
          
          // Also fetch the actual receipts for Top Selling Items calculation
          const BatchRes = await fetchReceiptsInRange(startOfDay(parsedFrom), endOfDay(parsedTo), 500);
          setDashboardBatchReceipts(BatchRes);
        } catch (err) {
          console.error("Dashboard range fetch failed:", err);
        } finally {
          setIsFetchingBatch(false);
        }
      };
      fetchRange();
    } else {
      setRangeStats(null);
      setDashboardBatchReceipts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFromTime, dateToTime]);

  // Merge range stats into dashboard calculations
  const finalDashboardData = React.useMemo(() => {
    if (!dashboardData) return null;
    if (!rangeStats) return dashboardData;

    const rawRevenueSum = (dashboardData.productRevenue || 0) + (dashboardData.serviceRevenue || 0);
    let finalProductRevenue = dashboardData.productRevenue;
    let finalServiceRevenue = dashboardData.serviceRevenue;

    if (rawRevenueSum > 0) {
      const pRatio = (dashboardData.productRevenue || 0) / rawRevenueSum;
      const sRatio = (dashboardData.serviceRevenue || 0) / rawRevenueSum;
      finalProductRevenue = pRatio * rangeStats.revenue;
      finalServiceRevenue = sRatio * rangeStats.revenue;
    }

    return {
      ...dashboardData,
      totalRevenue: rangeStats.revenue,
      totalSalesValue: rangeStats.revenue,
      totalReceipts: rangeStats.count,
      newCustomersCount: rangeStats.customers,
      productRevenue: finalProductRevenue,
      serviceRevenue: finalServiceRevenue
    };
  }, [dashboardData, rangeStats]);

  const handleDownloadImage = async () => {
    const element = dashboardRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        ignoreElements: (el) => el.classList.contains('no-capture')
      });
      const data = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = data;
      link.download = `zeneva-dashboard-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ variant: 'success', title: 'Dashboard Downloaded', description: 'Your dashboard image has been saved.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not capture the dashboard image.' });
    }
  };

  const { currentUserProfile } = usePOS();
  
  if (isLoading || !finalDashboardData) {
    return <DashboardSkeleton />;
  }

  const { totalRevenue, newCustomersCount, totalUnitsSold, totalStock, uniqueSkus, lowStockItems, totalSalesValue, totalReceipts, totalOnlineSalesValue, totalOnlineOrdersCount, topSellingItems, topLoyaltyCustomers, isLoyaltyEnabled, debtItemsCount, totalDebtUnits, serviceUnitsSold, productUnitsSold, serviceRevenue, productRevenue } = finalDashboardData;

  const hasReportPermission = currentUserProfile?.permissions?.view_reports ?? (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'owner');
  const isRestricted = !hasReportPermission;

  return (
    <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1 pb-10 sm:pb-1">
      <PageTitle title="Dashboard" subtitle="Welcome back! Here's your Zeneva business overview.">
        <div className="no-capture flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <DateRangePicker date={date} onDateChange={setDate} />
          <Button onClick={handleDownloadImage} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {!isRestricted && (
          <SummaryCard
            title="Total Revenue"
            value={`${currencySymbol}${(totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={currencySymbol}
            description={`${(totalReceipts || 0) + (totalOnlineOrdersCount || 0)} total transactions`}
            href="/reports"
          />
        )}
        {!isRestricted && (
          <SummaryCard
            title="Product Revenue"
            value={`${currencySymbol}${(productRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Package}
            description={`${(productUnitsSold || 0).toLocaleString()} products sold`}
            href="/reports"
          />
        )}
        {!isRestricted && (
          <SummaryCard
            title="Service Revenue"
            value={`${currencySymbol}${(serviceRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Activity}
            description={`${(serviceUnitsSold || 0).toLocaleString()} services rendered`}
            href="/reports"
          />
        )}
        <SummaryCard
          title="Units Sold"
          value={(totalUnitsSold || 0).toLocaleString()}
          icon={ShoppingBag}
          description={`${(productUnitsSold || 0).toLocaleString()} products, ${(serviceUnitsSold || 0).toLocaleString()} services`}
          href="/reports"
        />
        <SummaryCard
          title="New Customers"
          value={(newCustomersCount || 0).toLocaleString()}
          icon={Users}
          description="Signed up in this period"
          href="/customers"
        />
        {!isRestricted && (
          <SummaryCard
            title="POS Sales"
            value={`${currencySymbol}${(totalSalesValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={currencySymbol}
            description={`${(totalReceipts || 0)} transactions`}
            href="/receipts"
          />
        )}
        {!isRestricted && (
          <SummaryCard
            title="Online Sales"
            value={`${currencySymbol}${(totalOnlineSalesValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={currencySymbol}
            description={`${(totalOnlineOrdersCount || 0)} online orders`}
            href="/online-orders"
          />
        )}
        <SummaryCard
          title="Low Stock Alerts"
          value={(lowStockItems || 0).toLocaleString()}
          icon={AlertCircle}
          description={(lowStockItems || 0) > 0 ? `${lowStockItems} items needing attention` : "All stock levels healthy"}
          href="/inventory"
        />
        {debtItemsCount > 0 && (
          <SummaryCard
            title="Recorded Debts"
            value={totalDebtUnits}
            icon={TrendingDown}
            description={`${debtItemsCount} products backordered`}
            href="/inventory/debts"
          />
        )}
      </div>

      {!isRestricted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OverviewChart receipts={receipts || []} currencySymbol={currencySymbol} data={monthlyStats || undefined} />
          </div>
          <CategoryPieChart products={products || []} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={cn("shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer", isRestricted ? "md:col-span-3" : "md:col-span-2")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sales Activity
            </CardTitle>
            <CardDescription>Overview of your sales pipeline stages for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                <PackageCheck className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalReceipts + totalOnlineOrdersCount}</p>
                <p className="text-xs text-muted-foreground">Completed Sales</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                <FileDigit className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">To be Invoiced</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                <PackageSearch className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">To be Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {!isRestricted && (
          <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Inventory Summary
              </CardTitle>
              <CardDescription>Quick look at your stock status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity in Hand</p>
                  <p className="text-2xl font-bold">{(totalStock || 0).toLocaleString()}</p>
                </div>
                <Archive className="h-8 w-8 text-primary" />
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity to be Received</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <PackageSearch className="h-8 w-8 text-primary" />
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/inventory?sortBy=stock-desc">
                    View Highest Stock Products <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {isLoyaltyEnabled ? "Top Loyalty Customers" : "Top Customers"}
            </CardTitle>
            <CardDescription>
              {isLoyaltyEnabled ? "Your most loyal customers by points." : "Your top spending customers for the selected period."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topLoyaltyCustomers.length > 0 ? (
              <ul className="space-y-3">
                {topLoyaltyCustomers.map(customer => (
                  <li key={customer.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src="" alt={customer.name} data-ai-hint="person avatar placeholder" />
                        <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" title={customer.name}>{customer.name}</p>
                        <p className="text-xs text-muted-foreground" title={customer.email}>{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-primary">
                        {(isLoyaltyEnabled && (customer.loyaltyPoints || 0) > 0) 
                          ? `${customer.loyaltyPoints} pts` 
                          : `${currencySymbol}${(customer as any).spendInRange?.toLocaleString() || 0}`
                        }
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No customer loyalty data yet.</p>
            )}
            <Button variant="link" size="sm" asChild className="mt-3 w-full justify-center">
              <Link href="/customers">View All Customers</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Selling Items
            </CardTitle>
            <CardDescription>Your most popular products this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingItems.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {topSellingItems.map(item => (
                    <li key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                      <Link 
                        href={item.id.startsWith('manual-') ? '#' : `/inventory/details?id=${item.id}`} 
                        className={cn("font-medium", item.id.startsWith('manual-') ? "text-muted-foreground cursor-default" : "hover:underline text-primary")} 
                        title={item.name}
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4">
                          {item.categoryType === 'service' ? 'Service' : 'Product'}
                        </Badge>
                        <span className="text-muted-foreground">{item.quantitySold} sold</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/inventory">
                      View Inventory Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 opacity-50 mb-3" />
                <p>Top selling items data will appear here once sales are recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {business && (
        <AddCustomerDialog
          isOpen={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          businessId={business.id}
          customers={customers}
        />
      )}
    </div>
  );
}
