
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
import type { TopSellingItem, BusinessAnalysisOutput } from '@/types';
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

  const { products, receipts, customers, isLoading: isPosLoading, currencySymbol, business, onlineOrders, stats } = usePOS();

  // Date range state, defaults to today
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const isLoading = isPosLoading;

  const dashboardData = React.useMemo(() => {
    const inventoryItems = products || [];
    const allReceipts = receipts || [];
    const allCustomers = customers || [];
    const allOnlineOrders = onlineOrders || [];

    // Filter data based on selected date range
    const fromDate = date?.from;
    const toDate = date?.to;

    const filterByDate = (item: { createdAt?: any }) => {
      if (!item.createdAt?.toDate) return false;
      const itemDate = item.createdAt.toDate();
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

    const totalStock = inventoryItems.filter(item => item.categoryType !== 'service').reduce((sum, item) => sum + (item.stock || 0), 0);
    const uniqueSkus = inventoryItems.filter(item => item.categoryType !== 'service').length;
    const lowStockItems = inventoryItems.filter(item => item.categoryType !== 'service' && (item.stock || 0) <= (item.lowStockThreshold || 0)).length;

    const totalSalesValue = filteredReceipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const totalReceiptsCount = filteredReceipts.length;

    const totalOnlineSalesValue = filteredOnlineOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOnlineOrdersCount = filteredOnlineOrders.length;

    const totalRevenue = totalSalesValue + totalOnlineSalesValue;

    const posUnitsSold = filteredReceipts.reduce((sum, r) => sum + r.items.reduce((q, i) => q + i.quantity, 0), 0);
    const onlineUnitsSold = filteredOnlineOrders.reduce((sum, o) => sum + o.items.reduce((q, i) => q + i.quantity, 0), 0);
    const totalUnitsSold = posUnitsSold + onlineUnitsSold;

    const itemSalesCount: Record<string, number> = {};
    let serviceUnitsSold = 0;
    let productUnitsSold = 0;

    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const product = inventoryItems.find(p => p.id === item.productId);
        if (product) {
          itemSalesCount[product.name] = (itemSalesCount[product.name] || 0) + item.quantity;
          if (product.categoryType === 'service') {
            serviceUnitsSold += item.quantity;
          } else {
            productUnitsSold += item.quantity;
          }
        }
      });
    });

    filteredOnlineOrders.forEach(order => {
      order.items.forEach(item => {
        const product = inventoryItems.find(p => p.id === item.productId);
        if (product) {
          itemSalesCount[product.name] = (itemSalesCount[product.name] || 0) + item.quantity;
          if (product.categoryType === 'service') {
            serviceUnitsSold += item.quantity;
          } else {
            productUnitsSold += item.quantity;
          }
        }
      });
    });

    const topSellingItems = Object.entries(itemSalesCount)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 3)
      .map(([name, quantitySold]) => {
        const inventoryItem = inventoryItems.find(invItem => invItem.name === name);
        return {
          ...(inventoryItem || { id: name, name: name, sku: 'N/A', stock: 0, price: 0, category: 'N/A', lowStockThreshold: 0 }),
          quantitySold: quantitySold
        } as TopSellingItem;
      });

    const sortedCustomers = [...allCustomers].sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
    const topLoyaltyCustomers = sortedCustomers.slice(0, 3);

    // If no date range is set (initial state or explicit 'All Time'), use denormalized stats
    const isTodayOnly = date?.from && date?.to && startOfDay(date.from).getTime() === startOfDay(new Date()).getTime() && endOfDay(date.to).getTime() === endOfDay(new Date()).getTime();
    
    // We use stats for lifetime totals if the range is broad/default
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
      totalUnitsSold,
      topSellingItems,
      topLoyaltyCustomers,
      debtItemsCount: inventoryItems.filter(p => p.categoryType !== 'service' && (p.stock || 0) < 0).length,
      totalDebtUnits: inventoryItems.filter(p => p.categoryType !== 'service' && (p.stock || 0) < 0).reduce((acc, p) => acc + Math.abs(p.stock || 0), 0),
      serviceUnitsSold,
      productUnitsSold
    };
  }, [products, receipts, customers, onlineOrders, date, stats]);

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

  if (isLoading || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { totalRevenue, newCustomersCount, totalUnitsSold, totalStock, uniqueSkus, lowStockItems, totalSalesValue, totalReceipts, totalOnlineSalesValue, totalOnlineOrdersCount, topSellingItems, topLoyaltyCustomers, debtItemsCount, totalDebtUnits, serviceUnitsSold, productUnitsSold } = dashboardData;

  const { currentUserProfile } = usePOS();
  const isOperator = currentUserProfile?.role === 'vendor_operator';

  return (
    <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1">
      <PageTitle title="Dashboard" subtitle="Welcome back! Here's your Zeneva business overview.">
        <div className="no-capture flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <DateRangePicker date={date} onDateChange={setDate} />
          <Button onClick={handleDownloadImage} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {!isOperator && (
          <SummaryCard
            title="Total Revenue"
            value={`${currencySymbol}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            description={`${totalReceipts + totalOnlineOrdersCount} total transactions`}
            href="/reports"
          />
        )}
        <SummaryCard
          title="Units Sold"
          value={totalUnitsSold.toLocaleString()}
          icon={ShoppingBag}
          description={`${productUnitsSold.toLocaleString()} products, ${serviceUnitsSold.toLocaleString()} services`}
          href="/reports"
        />
        <SummaryCard
          title="New Customers"
          value={newCustomersCount.toLocaleString()}
          icon={Users}
          description="Signed up in this period"
          href="/customers"
        />
        {!isOperator && (
          <SummaryCard
            title="POS Sales"
            value={`${currencySymbol}${totalSalesValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={ShoppingCart}
            description={`${totalReceipts} transactions`}
            href="/receipts"
          />
        )}
        {!isOperator && (
          <SummaryCard
            title="Online Sales"
            value={`${currencySymbol}${totalOnlineSalesValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Globe}
            description={`${totalOnlineOrdersCount} online orders`}
            href="/online-orders"
          />
        )}
        <SummaryCard
          title="Low Stock Alerts"
          value={lowStockItems}
          icon={AlertCircle}
          description={lowStockItems > 0 ? `${lowStockItems} items needing attention` : "All stock levels healthy"}
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

      {!isOperator && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OverviewChart receipts={receipts || []} currencySymbol={currencySymbol} />
          </div>
          <CategoryPieChart products={products || []} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={cn("shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer", isOperator ? "md:col-span-3" : "md:col-span-2")}>
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
        {!isOperator && (
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
                  <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
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
              Top Loyalty Customers
            </CardTitle>
            <CardDescription>Your most loyal customers by points.</CardDescription>
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
                      <p className="text-sm font-semibold text-primary">{customer.loyaltyPoints || 0} pts</p>
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
                      <Link href={`/inventory/${item.id}`} className="hover:underline text-primary font-medium" title={item.name}>
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
                    <Link href="/reports">
                      View Deep Sales Analysis <ArrowRight className="ml-2 h-4 w-4" />
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
