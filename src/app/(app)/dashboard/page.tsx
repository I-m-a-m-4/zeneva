
'use client';
import *as React from 'react';
import PageTitle from '@/components/shared/page-title';
import SummaryCard from '@/components/dashboard/summary-card';
import { DollarSign, Package, AlertCircle, ShoppingCart, TrendingUp, Activity, PackageCheck, PackageSearch, FileDigit, Layers, Archive, Award, Trophy, PlusCircle, Download } from 'lucide-react';
import DashboardClientContent from '@/components/dashboard/dashboard-client-content';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { TopSellingItem } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import html2canvas from 'html2canvas';
import RefreshButton from '@/components/shared/refresh-button';

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

  const { products, receipts, customers, businessUsers, isLoading, currencySymbol, business, currentUserProfile } = usePOS();
  
  const dashboardData = React.useMemo(() => {
    const inventoryItems = products || [];
    const safeReceipts = receipts || [];
    const safeCustomers = customers || [];
    const safeBusinessUsers = businessUsers || [];

    const totalStock = inventoryItems.reduce((sum, item) => sum + (item.stock || 0), 0);
    const uniqueSkus = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => (item.stock || 0) <= (item.lowStockThreshold || 0)).length;

    const totalSalesValue = safeReceipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const totalReceiptsCount = safeReceipts.length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrdersLast7Days = safeReceipts.filter(r => new Date(r.createdAt.toDate()) > sevenDaysAgo).length;

    const itemSalesCount: Record<string, number> = {};
    safeReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const product = inventoryItems.find(p => p.id === item.productId);
        if (product) {
          itemSalesCount[product.name] = (itemSalesCount[product.name] || 0) + item.quantity;
        }
      });
    });

    const sortedItems = Object.entries(itemSalesCount)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 3)
      .map(([name, quantitySold]) => {
        const inventoryItem = inventoryItems.find(invItem => invItem.name === name);
        return {
          ...(inventoryItem || { id: name, name: name, sku: 'N/A', stock: 0, price: 0, category: 'N/A', lowStockThreshold: 0 }),
          quantitySold: quantitySold
        } as TopSellingItem;
      });

    const sortedCustomers = [...safeCustomers].sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
    const topLoyaltyCustomers = sortedCustomers.slice(0, 3);
    
    const topReferrers = [...safeBusinessUsers]
        .filter(u => u.referrals && u.referrals > 0)
        .sort((a, b) => (b.referrals || 0) - (a.referrals || 0))
        .slice(0, 3);
    
    return {
      totalStock,
      uniqueSkus,
      lowStockItems,
      totalSalesValue,
      totalReceipts: totalReceiptsCount,
      recentOrdersLast7Days,
      topSellingItems: sortedItems,
      topLoyaltyCustomers,
      topReferrers,
      currentUserProfile,
    };
  }, [products, receipts, customers, businessUsers, currentUserProfile]);
  
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

  const { totalStock, uniqueSkus, lowStockItems, totalSalesValue, totalReceipts, recentOrdersLast7Days, topSellingItems, topLoyaltyCustomers, topReferrers } = dashboardData;

  return (
    <div ref={dashboardRef} className="flex flex-col gap-6 bg-background p-1">
      <PageTitle title="Dashboard" subtitle="Welcome back! Here's your Zeneva business overview.">
        <div className="no-capture flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <RefreshButton />
          <Button onClick={() => setIsAddCustomerOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Button>
          <Button onClick={handleDownloadImage} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download as Image
          </Button>
        </div>
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Sales"
          value={`${currencySymbol}${totalSalesValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          icon={DollarSign}
          description={`${totalReceipts} transactions`}
        />
        <SummaryCard
          title="Total Inventory Units"
          value={totalStock.toLocaleString()}
          icon={Archive}
          description={`${uniqueSkus} unique SKUs`}
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={lowStockItems}
          icon={AlertCircle}
          description={lowStockItems > 0 ? `${lowStockItems} items needing attention` : "All stock levels healthy"}
        />
        <SummaryCard
          title="Recent Orders"
          value={recentOrdersLast7Days}
          icon={ShoppingCart}
          description="In the last 7 days"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sales Activity
            </CardTitle>
            <CardDescription>Overview of your current sales pipeline stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                <PackageCheck className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalReceipts}</p>
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
               <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                <PackageSearch className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">To be Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          </CardContent>
        </Card>
      </div>

      <DashboardClientContent />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md md:col-span-1 transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
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
                                        <AvatarImage src="" alt={customer.name} data-ai-hint="person avatar placeholder"/>
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
        <Card className="shadow-md md:col-span-1 transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Referral Leaderboard
                </CardTitle>
                <CardDescription>Your business's top referrers.</CardDescription>
            </CardHeader>
            <CardContent>
                {topReferrers.length > 0 ? (
                    <ul className="space-y-3">
                        {topReferrers.map(referrer => (
                             <li key={referrer.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarFallback>{referrer.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" title={referrer.name}>{referrer.name}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-semibold text-primary">{referrer.referrals || 0} referrals</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No referrals made in your business yet.</p>
                )}
                 <Separator className="my-4" />
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">Your Referrals</p>
                    <p className="text-3xl font-bold">{currentUserProfile?.referrals || 0}</p>
                    <Button variant="link" size="sm" asChild className="mt-1">
                        <Link href="/settings">Get Your Code</Link>
                    </Button>
                 </div>
            </CardContent>
        </Card>
        <Card className="shadow-md md:col-span-1 transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Selling Items
            </CardTitle>
            <CardDescription>Your most popular products this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingItems.length > 0 ? (
              <ul className="space-y-3">
                {topSellingItems.map(item => (
                  <li key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                    <Link href={`/inventory/${item.id}`} className="hover:underline text-primary font-medium" title={item.name}>
                      {item.name}
                    </Link>
                    <span className="text-muted-foreground ml-2">{item.quantitySold} sold</span>
                  </li>
                ))}
              </ul>
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
        />
      )}
    </div>
  );
}
