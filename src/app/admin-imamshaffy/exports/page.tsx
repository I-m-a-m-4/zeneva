'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { usePOS } from '@/context/pos-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Download,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Users,
  Package,
  FileSpreadsheet,
  Building,
  Calendar,
  Copy,
  CheckCircle2,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { safeToDate } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportLogEntry } from '@/lib/export-telemetry';

export default function ExportAnalyticsPage() {
  const { currentUserProfile, isLoading, user } = usePOS();
  const firestore = useFirestore();
  const [logs, setLogs] = useState<ExportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const isSuperAdmin =
    currentUserProfile?.email === 'belloimam431@gmail.com' ||
    currentUserProfile?.email === 'bimex4@gmail.com' ||
    user?.email === 'belloimam431@gmail.com' ||
    user?.email === 'bimex4@gmail.com';

  useEffect(() => {
    if (!isSuperAdmin || !firestore) return;

    const q = query(
      collection(firestore, 'export_logs'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExportLogEntry[];
        setLogs(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching export logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin, firestore]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.businessName?.toLowerCase().includes(q) ||
      log.businessId?.toLowerCase().includes(q) ||
      log.userName?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q) ||
      log.filename?.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || log.exportType === typeFilter;
    const matchesRisk = riskFilter === 'all' || log.riskLevel === riskFilter;

    return matchesSearch && matchesType && matchesRisk;
  });

  // Calculate high-level KPIs
  const totalExports = logs.length;
  const highRiskCount = logs.filter((l) => l.riskLevel === 'high').length;
  const totalRecordsExported = logs.reduce((acc, curr) => acc + (curr.recordCount || 0), 0);
  const uniqueStores = new Set(logs.map((l) => l.businessId)).size;

  if (isLoading || (loading && isSuperAdmin)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Super Admin Access Required</h2>
        <p className="text-sm text-slate-500 mt-2">
          This export intelligence and churn telemetry board is restricted to authorized platform leadership.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Export Watch & Churn Telemetry
            </h1>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300">
              Live Monitor
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track whenever merchants download their inventory, customers, or accounting data to detect competitor migrations early.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Exports Logged</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {totalExports.toLocaleString()}
              <Download className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Across all retail stores on Zeneva</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium text-red-600 dark:text-red-400">
              High Churn Risk Exports
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
              {highRiskCount}
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">Mass catalog or customer list extractions</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Records Extracted</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {totalRecordsExported.toLocaleString()}
              <FileSpreadsheet className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Total rows across all CSV files</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Active Exporting Stores</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {uniqueStores}
              <Building className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Distinct businesses triggering downloads</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Explainer Banner */}
      {highRiskCount > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Retention Alert: {highRiskCount} high-volume data export{highRiskCount > 1 ? 's' : ''} detected
            </p>
            <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
              When merchants download their entire customer contact directory or full product catalog, they may be preparing to switch software or back up before canceling. Consider reaching out via WhatsApp or email to check in on their experience.
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by store name, user email, business ID, or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Export Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Export Types</SelectItem>
                  <SelectItem value="inventory">Inventory Catalog</SelectItem>
                  <SelectItem value="customers">Customer Directory</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="purchases">Purchases</SelectItem>
                  <SelectItem value="reports">Reports & Analytics</SelectItem>
                  <SelectItem value="profit_loss">P&L Financials</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Churn Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || typeFilter !== 'all' || riskFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setRiskFilter('all');
                  }}
                  className="h-9 px-3 text-sm text-slate-500"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Real-time Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[170px]">Date & Time</TableHead>
                  <TableHead>Store & Business ID</TableHead>
                  <TableHead>User / Staff</TableHead>
                  <TableHead>Export Type</TableHead>
                  <TableHead className="text-right">Rows / Items</TableHead>
                  <TableHead>Churn Risk</TableHead>
                  <TableHead>Filename</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      {logs.length === 0
                        ? 'No export events recorded yet. Telemetry will appear here in real-time as merchants export data.'
                        : 'No export events matched your search filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const date = safeToDate(log.createdAt);
                    const formattedDate = date ? format(date, 'MMM d, yyyy HH:mm') : 'Just now';
                    const relativeTime = date ? formatDistanceToNow(date, { addSuffix: true }) : '';

                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <TableCell className="align-top">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {formattedDate}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{relativeTime}</div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {log.businessName || 'Unknown Store'}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                              {log.businessId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(log.businessId, `biz-${log.id}`)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Copy Business ID"
                            >
                              {copiedId === `biz-${log.id}` ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {log.userName || 'Anonymous Staff'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {log.userEmail || '—'}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant="secondary"
                            className={
                              log.exportType === 'customers'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                : log.exportType === 'inventory'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : log.exportType === 'profit_loss' || log.exportType === 'reports'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }
                          >
                            {log.exportType === 'inventory' && <Package className="h-3 w-3 me-1 inline" />}
                            {log.exportType === 'customers' && <Users className="h-3 w-3 me-1 inline" />}
                            {log.exportType}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top text-right font-mono text-xs font-semibold">
                          {(log.recordCount || 0).toLocaleString()}
                        </TableCell>

                        <TableCell className="align-top">
                          {log.riskLevel === 'high' ? (
                            <Badge variant="destructive" className="bg-red-500 gap-1 text-[11px]">
                              <AlertTriangle className="h-3 w-3" /> High Risk
                            </Badge>
                          ) : log.riskLevel === 'medium' ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[11px]">
                              Medium Risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 text-[11px]">
                              Low Risk
                            </Badge>
                          )}
                          {log.riskReason && (
                            <div className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                              {log.riskReason}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="align-top font-mono text-[11px] text-slate-500 max-w-[180px] truncate" title={log.filename}>
                          {log.filename}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
