'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Wallet, Search, Loader, Tag, Package, DollarSign, TrendingDown, Truck, Building2, CreditCard, Coins, CheckCircle2, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Expense, ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORIES } from '@/app/(app)/expenses/page';

export default function AdminExpensesPage() {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const firestore = useFirestore();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  useEffect(() => {
    if (!firestore) return;

    const fetchAdminExpensesData = async () => {
      setIsLoading(true);
      try {
        // Fetch All Expenses across all businesses
        const expQ = query(
          collectionGroup(firestore, 'expenses'),
          limit(1000)
        );
        const expSnap = await getDocs(expQ);
        const fetchedExpenses: Expense[] = [];
        expSnap.forEach(d => {
          fetchedExpenses.push({ id: d.id, ...(d.data() as any) });
        });
        fetchedExpenses.sort((a, b) => (safeToDate(b.date)?.getTime() || 0) - (safeToDate(a.date)?.getTime() || 0));
        setExpenses(fetchedExpenses);

        // Fetch All Supplier Purchases across all businesses
        const purchQ = query(
          collectionGroup(firestore, 'supplier_purchases'),
          limit(1000)
        );
        const purchSnap = await getDocs(purchQ);
        const fetchedPurchases: any[] = [];
        purchSnap.forEach(d => {
          fetchedPurchases.push({ id: d.id, ...(d.data() as any) });
        });
        setPurchases(fetchedPurchases);
      } catch (err) {
        console.error('Error fetching admin expenses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminExpensesData();
  }, [firestore]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const tillOutflow = expenses.filter(e => e.deductFromCashDrawer).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const totalProcurement = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPurchasesPaid = purchases.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalSupplierDebt = purchases.reduce((sum, p) => sum + (Number(p.balanceDue) || 0), 0);

    const totalCashOutflow = totalExpenses + totalProcurement;

    // Tenant breakdown map
    const tenantMap = new Map<string, { businessId: string; expenseCount: number; totalExpenses: number; tillOutflow: number; purchaseTotal: number }>();
    
    expenses.forEach(e => {
      const bId = e.businessId || 'Unknown Business';
      const existing = tenantMap.get(bId) || { businessId: bId, expenseCount: 0, totalExpenses: 0, tillOutflow: 0, purchaseTotal: 0 };
      existing.expenseCount += 1;
      existing.totalExpenses += (Number(e.amount) || 0);
      if (e.deductFromCashDrawer) existing.tillOutflow += (Number(e.amount) || 0);
      tenantMap.set(bId, existing);
    });

    purchases.forEach(p => {
      const bId = p.businessId || 'Unknown Business';
      const existing = tenantMap.get(bId) || { businessId: bId, expenseCount: 0, totalExpenses: 0, tillOutflow: 0, purchaseTotal: 0 };
      existing.purchaseTotal += (Number(p.totalAmount) || 0);
      tenantMap.set(bId, existing);
    });

    const tenantLeaderboard = Array.from(tenantMap.values())
      .sort((a, b) => (b.totalExpenses + b.purchaseTotal) - (a.totalExpenses + a.purchaseTotal))
      .slice(0, 10);

    return {
      totalExpenses,
      tillOutflow,
      totalProcurement,
      totalPurchasesPaid,
      totalSupplierDebt,
      totalCashOutflow,
      tenantLeaderboard,
    };
  }, [expenses, purchases]);

  // Chart Data
  const chartData = useMemo(() => {
    // 1. By Category
    const catMap = new Map<string, number>();
    expenses.forEach(e => {
      const catLabel = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
      catMap.set(catLabel, (catMap.get(catLabel) || 0) + (Number(e.amount) || 0));
    });
    const byCategory = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. By Payment Method
    const methodMap = new Map<string, number>();
    expenses.forEach(e => {
      const m = e.paymentMethod ? e.paymentMethod.replace('_', ' ').toUpperCase() : 'CASH';
      methodMap.set(m, (methodMap.get(m) || 0) + (Number(e.amount) || 0));
    });
    const byMethod = Array.from(methodMap.entries())
      .map(([name, value]) => ({ name, value }));

    return {
      byCategory,
      byMethod
    };
  }, [expenses]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (selectedMethod !== 'all' && e.paymentMethod !== selectedMethod) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesRecipient = (e.recipient || '').toLowerCase().includes(q);
        const matchesBusiness = (e.businessId || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesRecipient && !matchesBusiness) return false;
      }
      return true;
    });
  }, [expenses, selectedCategory, selectedMethod, searchQuery]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 shrink-0">
        <div>
          <h2 className={cn(
            "text-2xl font-black tracking-tight flex items-center gap-2",
            isDarkMode ? 'text-white' : 'text-slate-900'
          )}>
            <Wallet className="w-6 h-6 text-primary" />
            Global Expenses & Procurement Analytics
          </h2>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          )}>
            Platform-wide telemetry on operating overheads, cash till deductions, stock purchases, and supplier accounts payable across all tenants.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Total Operating Overheads</span>
              <TrendingDown className="h-4 w-4 text-amber-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${metrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total operational expenses logged across all business tenants
            </p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Till / Cash Drawer Outflow</span>
              <Coins className="h-4 w-4 text-emerald-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${metrics.tillOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Cash deducted directly from daily register tills
            </p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Stock Procurement</span>
              <Truck className="h-4 w-4 text-blue-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${metrics.totalProcurement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total purchase order bills issued to suppliers
            </p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Accounts Payable (Debt)</span>
              <AlertCircle className="h-4 w-4 text-rose-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${metrics.totalSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Outstanding supplier bills owed by tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expenses by Category */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Expenses by Category</CardTitle>
            <CardDescription>Platform-wide overhead distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full flex items-center justify-center">
              {chartData.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, undefined]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', borderColor: 'rgba(150,150,150,0.2)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground flex flex-col items-center">
                  <PieChartIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  No expense records found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Methods Used</CardTitle>
            <CardDescription>Overhead settlement channels across tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {chartData.byMethod.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.byMethod} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis 
                      width={65}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      tickFormatter={(val) => {
                        if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
                        if (val >= 1_000) return `₦${(val / 1_000).toFixed(1)}k`;
                        return `₦${val}`;
                      }} 
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, undefined]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', borderColor: 'rgba(150,150,150,0.2)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="value" name="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                  <CreditCard className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  No payment data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Spend Leaderboard */}
      <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top Spending Business Tenants</CardTitle>
          <CardDescription>Businesses with highest operating overheads & restock volume</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={cn(
                "text-xs uppercase sticky top-0 z-10 font-bold backdrop-blur-md",
                isDarkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-50/90 text-slate-500'
              )}>
                <tr>
                  <th className="px-6 py-3">Business ID</th>
                  <th className="px-6 py-3">Expense Count</th>
                  <th className="px-6 py-3 text-right">Total Overheads</th>
                  <th className="px-6 py-3 text-right">Cash Till Outflow</th>
                  <th className="px-6 py-3 text-right">Stock Procurement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.tenantLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No tenant expense records logged yet.
                    </td>
                  </tr>
                ) : (
                  metrics.tenantLeaderboard.map((t) => (
                    <tr key={t.businessId} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                      <td className="px-6 py-3.5 font-mono font-semibold text-primary">
                        {t.businessId}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground font-mono">
                        {t.expenseCount} expenses
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        ₦{t.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₦{t.tillOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        ₦{t.purchaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Database & Search Feed */}
      <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Platform Expenses Feed</CardTitle>
            <CardDescription>Live database feed of operating expense records across all tenants</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses, recipient, business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={cn(
                "text-xs uppercase sticky top-0 z-10 font-bold backdrop-blur-md",
                isDarkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-50/90 text-slate-500'
              )}>
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Expense Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3">Business ID</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading platform expenses...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No matching expense records found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.slice(0, 100).map((exp) => {
                    const dateObj = safeToDate(exp.date);
                    const formattedDate = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                    const catLabel = EXPENSE_CATEGORIES.find(c => c.id === exp.category)?.label.split('(')[0].trim() || exp.category;

                    return (
                      <tr key={exp.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                        <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-foreground">
                          <div>{exp.title}</div>
                          {exp.recipient && <div className="text-[11px] text-muted-foreground">To: {exp.recipient}</div>}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className="text-xs font-normal">
                            {catLabel}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          <div className="flex items-center gap-1">
                            {exp.deductFromCashDrawer && (
                              <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300">
                                Till / Drawer
                              </Badge>
                            )}
                            <span className="capitalize">{exp.paymentMethod?.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                          {exp.businessId}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-foreground">
                          ₦{exp.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
