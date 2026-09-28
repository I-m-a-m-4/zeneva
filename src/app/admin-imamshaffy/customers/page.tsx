'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader,
  Crown,
  Building,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  Copy,
  ExternalLink,
  Award,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Store,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { downloadCsv } from '@/lib/csv';
import type { Customer, BusinessInstance } from '@/types';

type FilterMode = 'all' | 'richest' | 'with_email' | 'with_phone' | 'high_spenders';
type SortField = 'spent_desc' | 'spent_asc' | 'name_asc' | 'recent';

interface EnrichedCustomer extends Customer {
  businessName?: string;
  businessOwnerEmail?: string;
  isRichestInBusiness?: boolean;
}

export default function AdminCustomersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const [isLoading, setIsLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [businesses, setBusinesses] = React.useState<BusinessInstance[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string>('all');
  const [filterMode, setFilterMode] = React.useState<FilterMode>('all');
  const [sortField, setSortField] = React.useState<SortField>('spent_desc');

  // Customer Detail Modal
  const [selectedCustomer, setSelectedCustomer] = React.useState<EnrichedCustomer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 50;

  // 1. Fetch Customers & Businesses on Demand (only when visiting this page)
  const fetchData = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch businesses for client lookup
      const bizSnap = await getDocs(collection(firestore, 'businessInstances'));
      const bizList: BusinessInstance[] = [];
      bizSnap.forEach((docSnap) => {
        bizList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setBusinesses(bizList);

      // Fetch customers across the platform
      const customersSnap = await getDocs(collection(firestore, 'customers'));
      const custList: Customer[] = [];
      customersSnap.forEach((docSnap) => {
        custList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });

      setCustomers(custList);
    } catch (err: any) {
      console.error('Error fetching admin customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Index businesses by ID
  const businessMap = React.useMemo(() => {
    const map = new Map<string, BusinessInstance>();
    for (const b of businesses) {
      map.set(b.id, b);
    }
    return map;
  }, [businesses]);

  // Calculate richest customer per business (whales)
  const richestCustomerMap = React.useMemo(() => {
    const map = new Map<string, Customer>(); // businessId -> richest Customer
    for (const c of customers) {
      if (!c.businessId) continue;
      const currentRichest = map.get(c.businessId);
      const cSpent = Number(c.totalSpent || 0);
      const currSpent = Number(currentRichest?.totalSpent || 0);

      if (!currentRichest || cSpent > currSpent) {
        map.set(c.businessId, c);
      }
    }
    return map;
  }, [customers]);

  // Enriched customers list
  const enrichedCustomers: EnrichedCustomer[] = React.useMemo(() => {
    return customers.map((c) => {
      const biz = c.businessId ? businessMap.get(c.businessId) : undefined;
      const richestForBiz = c.businessId ? richestCustomerMap.get(c.businessId) : undefined;
      const isRichest = Boolean(richestForBiz && richestForBiz.id === c.id && (c.totalSpent || 0) > 0);

      return {
        ...c,
        businessName: biz?.name || 'Unknown Business',
        businessOwnerEmail: biz?.settings?.email,
        isRichestInBusiness: isRichest,
      };
    });
  }, [customers, businessMap, richestCustomerMap]);

  // Richest customers of each client (summary list)
  const richestPerClientList: EnrichedCustomer[] = React.useMemo(() => {
    const list: EnrichedCustomer[] = [];
    richestCustomerMap.forEach((c) => {
      const biz = c.businessId ? businessMap.get(c.businessId) : undefined;
      list.push({
        ...c,
        businessName: biz?.name || 'Unknown Business',
        businessOwnerEmail: biz?.settings?.email,
        isRichestInBusiness: true,
      });
    });
    // Sort highest spending first
    return list.sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));
  }, [richestCustomerMap, businessMap]);

  // Filter & Sort
  const filteredCustomers = React.useMemo(() => {
    let result = [...enrichedCustomers];

    // Search query (name, email, phone, business)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.businessName || '').toLowerCase().includes(q)
      );
    }

    // Business filter
    if (selectedBusinessId !== 'all') {
      result = result.filter((c) => c.businessId === selectedBusinessId);
    }

    // Filter mode
    if (filterMode === 'richest') {
      result = result.filter((c) => c.isRichestInBusiness);
    } else if (filterMode === 'with_email') {
      result = result.filter((c) => Boolean(c.email && c.email.includes('@')));
    } else if (filterMode === 'with_phone') {
      result = result.filter((c) => Boolean(c.phone && c.phone.trim().length > 3));
    } else if (filterMode === 'high_spenders') {
      result = result.filter((c) => Number(c.totalSpent || 0) >= 50000);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortField === 'spent_desc') {
        return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
      }
      if (sortField === 'spent_asc') {
        return Number(a.totalSpent || 0) - Number(b.totalSpent || 0);
      }
      if (sortField === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortField === 'recent') {
        const da = a.lastPurchaseDate ? new Date(a.lastPurchaseDate.toDate ? a.lastPurchaseDate.toDate() : a.lastPurchaseDate).getTime() : 0;
        const db = b.lastPurchaseDate ? new Date(b.lastPurchaseDate.toDate ? b.lastPurchaseDate.toDate() : b.lastPurchaseDate).getTime() : 0;
        return db - da;
      }
      return 0;
    });

    return result;
  }, [enrichedCustomers, searchQuery, selectedBusinessId, filterMode, sortField]);

  // Paginated view
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Aggregated KPIs
  const kpis = React.useMemo(() => {
    const totalCount = customers.length;
    const totalSpentSum = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
    const withEmailCount = customers.filter((c) => Boolean(c.email && c.email.includes('@'))).length;
    const withPhoneCount = customers.filter((c) => Boolean(c.phone && c.phone.trim().length > 3)).length;
    const avgSpend = totalCount > 0 ? Math.round(totalSpentSum / totalCount) : 0;
    const allWhalesTotal = richestPerClientList.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);

    return {
      totalCount,
      totalSpentSum,
      withEmailCount,
      withPhoneCount,
      avgSpend,
      allWhalesTotal,
      businessesWithCustomers: richestCustomerMap.size,
    };
  }, [customers, richestPerClientList, richestCustomerMap]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${label}: ${text}`,
      variant: 'success',
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    const rows = [
      ['Customer Name', 'Email', 'Phone', 'Business / Client', 'Total Spent (NGN)', 'Loyalty Points', 'Is Richest In Business', 'Created At'],
      ...filteredCustomers.map((c) => [
        c.name || 'Unnamed Customer',
        c.email || '',
        c.phone || '',
        c.businessName || '',
        String(c.totalSpent || 0),
        String(c.loyaltyPoints || 0),
        c.isRichestInBusiness ? 'YES (Whale)' : 'NO',
        c.createdAt ? (c.createdAt.toDate ? format(c.createdAt.toDate(), 'yyyy-MM-dd') : String(c.createdAt)) : '',
      ]),
    ];
    downloadCsv(`zeneva-customers-admin-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({
      title: 'Export Started',
      description: `Exported ${filteredCustomers.length} customer records to CSV.`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin-imamshaffy"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Back to Overview
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-primary" />
            Platform Customers Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Master directory of all customer contacts, spending profiles, and top clients across businesses.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || filteredCustomers.length === 0}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({filteredCustomers.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customers</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : kpis.totalCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across {kpis.businessesWithCustomers} active businesses
          </p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customer GMV</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : `₦${kpis.totalSpentSum.toLocaleString()}`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Avg. ₦{kpis.avgSpend.toLocaleString()} spend / customer
          </p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Contact Coverage</span>
            <Mail className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              `${Math.round((kpis.withEmailCount / (kpis.totalCount || 1)) * 100)}%`
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {kpis.withEmailCount} emails · {kpis.withPhoneCount} phone numbers
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Top Whales Total</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : `₦${kpis.allWhalesTotal.toLocaleString()}`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            From {richestPerClientList.length} #1 business clients
          </p>
        </Card>
      </div>

      {/* SPOTLIGHT: Richest Customer of Each Client (Whales Section) */}
      <Card className="border-amber-500/30 bg-amber-500/[0.02]">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Richest Customer of Each Client (Client Whales)
              </CardTitle>
              <CardDescription className="text-xs">
                The single highest-spending buyer identified for each registered business entity on the platform.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterMode(filterMode === 'richest' ? 'all' : 'richest')}
              className={cn(
                'text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 shrink-0',
                filterMode === 'richest' && 'bg-amber-500/20'
              )}
            >
              <Crown className="h-3.5 w-3.5" />
              {filterMode === 'richest' ? 'Show All Customers' : 'Filter Main Table to Whales Only'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center items-center">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : richestPerClientList.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No customer purchase data recorded yet across businesses.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {richestPerClientList.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsDetailOpen(true);
                  }}
                  className="rounded-xl border border-amber-500/20 bg-background/80 hover:bg-muted/40 p-3.5 transition-all cursor-pointer space-y-2 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 truncate">
                        <Store className="h-3 w-3 text-muted-foreground shrink-0" />
                        {c.businessName}
                      </p>
                      <h4 className="font-semibold text-sm truncate flex items-center gap-1.5 mt-0.5">
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {c.name || 'Anonymous Customer'}
                      </h4>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold shrink-0">
                      ₦{(c.totalSpent || 0).toLocaleString()}
                    </Badge>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    {c.email ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(c.email, 'Email');
                        }}
                        className="inline-flex items-center gap-1 bg-muted/60 hover:bg-primary/10 hover:text-primary px-2 py-0.5 rounded-md text-[11px] truncate"
                        title="Click to copy email"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[130px]">{c.email}</span>
                      </span>
                    ) : (
                      <span className="italic text-[10px] opacity-60">No email</span>
                    )}

                    {c.phone ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(c.phone!, 'Phone');
                        }}
                        className="inline-flex items-center gap-1 bg-muted/60 hover:bg-primary/10 hover:text-primary px-2 py-0.5 rounded-md text-[11px]"
                        title="Click to copy phone"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{c.phone}</span>
                      </span>
                    ) : (
                      <span className="italic text-[10px] opacity-60">No phone</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Filter & Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Customers Directory</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredCustomers.length} of {customers.length} total customer accounts.
              </CardDescription>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-[220px]">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search customer, email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {/* Business Filter */}
              <Select
                value={selectedBusinessId}
                onValueChange={(v) => {
                  setSelectedBusinessId(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue placeholder="All Businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Mode */}
              <Select
                value={filterMode}
                onValueChange={(v) => {
                  setFilterMode(v as FilterMode);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value="richest">👑 Richest per Client</SelectItem>
                  <SelectItem value="with_email">Has Email Only</SelectItem>
                  <SelectItem value="with_phone">Has Phone Only</SelectItem>
                  <SelectItem value="high_spenders">VIPs (&gt; ₦50k spend)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Field */}
              <Select
                value={sortField}
                onValueChange={(v) => setSortField(v as SortField)}
              >
                <SelectTrigger className="h-8 text-xs w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spent_desc">Highest Spend</SelectItem>
                  <SelectItem value="spent_asc">Lowest Spend</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="recent">Recently Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Customer</TableHead>
                  <TableHead className="min-w-[160px]">Business / Client</TableHead>
                  <TableHead className="min-w-[180px]">Contact Info</TableHead>
                  <TableHead className="min-w-[130px]">Total Spend</TableHead>
                  <TableHead className="min-w-[90px]">Loyalty</TableHead>
                  <TableHead className="min-w-[120px]">Last Seen</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading platform customers...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No customer records matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsDetailOpen(true);
                      }}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {/* Customer Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {(customer.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm flex items-center gap-1.5 truncate">
                              <span className="truncate">{customer.name || 'Unnamed Customer'}</span>
                              {customer.isRichestInBusiness && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 font-bold shrink-0"
                                  title="Richest customer in this business"
                                >
                                  👑 Top Whale
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ID: {customer.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Business */}
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-semibold text-foreground truncate max-w-[150px]">
                            {customer.businessName}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {customer.businessOwnerEmail || 'Tenant'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1 text-xs">
                          {customer.email ? (
                            <div
                              onClick={() => copyToClipboard(customer.email, 'Email')}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer group"
                              title="Click to copy email"
                            >
                              <Mail className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate max-w-[150px]">{customer.email}</span>
                              <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">No email</span>
                          )}

                          {customer.phone ? (
                            <div
                              onClick={() => copyToClipboard(customer.phone!, 'Phone')}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer group"
                              title="Click to copy phone"
                            >
                              <Phone className="h-3 w-3 shrink-0 text-emerald-500" />
                              <span>{customer.phone}</span>
                              <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">No phone</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Spend */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₦{(customer.totalSpent || 0).toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Loyalty */}
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground">
                          {customer.loyaltyPoints ?? 0} pts
                        </span>
                      </TableCell>

                      {/* Last Seen / Activity */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {customer.lastPurchaseDate
                            ? formatDistanceToNow(
                                new Date(
                                  customer.lastPurchaseDate.toDate
                                    ? customer.lastPurchaseDate.toDate()
                                    : customer.lastPurchaseDate
                                ),
                                { addSuffix: true }
                              )
                            : customer.createdAt
                            ? `Joined ${format(
                                new Date(
                                  customer.createdAt.toDate
                                    ? customer.createdAt.toDate()
                                    : customer.createdAt
                                ),
                                'MMM yyyy'
                              )}`
                            : 'Never'}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsDetailOpen(true);
                          }}
                          className="h-7 w-7 p-0"
                          title="View customer details"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2 text-xs"
                >
                  Next <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserCheck className="h-5 w-5 text-primary" />
              {selectedCustomer?.name || 'Customer Details'}
              {selectedCustomer?.isRichestInBusiness && (
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]">
                  👑 Top Client Whale
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Associated with {selectedCustomer?.businessName}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 py-2 text-xs">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Lifetime Spending</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₦{(selectedCustomer.totalSpent || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Loyalty Points</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">
                    {selectedCustomer.loyaltyPoints ?? 0} pts
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 border rounded-xl p-3">
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground">
                  Contact Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-[11px]">Email Address</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-foreground">{selectedCustomer.email || 'None'}</span>
                      {selectedCustomer.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(selectedCustomer.email, 'Email')}
                          title="Copy Email"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-[11px]">Phone Number</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-foreground">{selectedCustomer.phone || 'None'}</span>
                      {selectedCustomer.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(selectedCustomer.phone!, 'Phone')}
                          title="Copy Phone"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Intel */}
              <div className="space-y-1.5 border rounded-xl p-3">
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground">
                  Business Entity
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedCustomer.businessName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      Owner: {selectedCustomer.businessOwnerEmail || 'Tenant'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Client ID: {selectedCustomer.businessId?.slice(0, 8)}
                  </Badge>
                </div>
              </div>

              {/* Notes / Tags if any */}
              {selectedCustomer.notes && (
                <div className="p-3 border rounded-xl bg-muted/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-foreground leading-relaxed">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
