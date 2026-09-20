'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePOS } from '@/context/pos-context';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { InventoryTransaction } from '@/types';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Package, Loader2, ArrowRightLeft, HistoryIcon, ChevronDown, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/context/i18n-context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TransactionDetailsModal } from './transaction-details-modal';

export default function GlobalStockHistory() {
    const { business, firestore, products, users } = usePOS();
    const { t } = useI18n();
    const [transactions, setTransactions] = React.useState<InventoryTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [logFilter, setLogFilter] = React.useState<'all' | 'in' | 'out' | 'return' | 'adjustment'>('all');
    const [dateFilter, setDateFilter] = React.useState<'30d' | '90d' | '6m' | '1y' | 'all'>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedTransaction, setSelectedTransaction] = React.useState<any | null>(null);

    const handleExportAudit = () => {
        const headers = ['Date', 'Product', 'Type', 'Quantity', 'Notes', 'Created By'];
        const rows = transactions.map(tx => [
            tx.date?.seconds ? format(new Date(tx.date.seconds * 1000), 'yyyy-MM-dd HH:mm:ss') : '',
            tx.productName || 'Unknown Product',
            tx.type,
            Math.abs(tx.quantity).toString(),
            tx.notes || '',
            tx.createdBy || ''
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_log_${business?.id}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    React.useEffect(() => {
        if (!business?.id || !firestore) {
            setIsLoading(false);
            return;
        }

        // Automatically sync past records once per session
        const syncKey = `synced_history_${business.id}`;
        if (!sessionStorage.getItem(syncKey)) {
            sessionStorage.setItem(syncKey, 'true'); // Set immediately to prevent multiple calls
            fetch('/api/inventory/backfill-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: business.id })
            }).catch(console.error);
        }

        const txQuery = query(
            collection(firestore, 'inventory_transactions'),
            where('businessId', '==', business.id),
            orderBy('date', 'desc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(txQuery, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction));
            setTransactions(logs);
            setIsLoading(false);
        }, (err) => {
            console.error('Failed to load global stock history:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [business?.id, firestore]);

    // Hooks must be declared before any early returns

    const processedTransactions = React.useMemo(() => {
        const byProduct: Record<string, any[]> = {};
        transactions.forEach(tx => {
            if (!tx.productId) return;
            if (!byProduct[tx.productId]) byProduct[tx.productId] = [];
            byProduct[tx.productId].push(tx);
        });

        const allMapped: any[] = [];
        Object.keys(byProduct).forEach(productId => {
            const product = products?.find(p => p.id === productId);
            let currentBalance = product?.stock || 0;
            const productTxs = byProduct[productId];

            const mapped = productTxs.map((tx: any) => {
                let balanceAfter = currentBalance;
                let anomalies: string[] = [];

                if (tx.closingStock !== undefined) {
                    if (currentBalance !== tx.closingStock && tx.id !== productTxs[0]?.id) {
                        anomalies.push('Balance discrepancy detected against logged closing stock.');
                    }
                    balanceAfter = tx.closingStock;
                    currentBalance = tx.closingStock;
                }

                if (balanceAfter < 0) {
                    anomalies.push('Stock was oversold (balance dropped below zero).');
                }

                if ((tx.type === 'in' || tx.type === 'out') && !tx.referenceId && !tx.notes?.includes('Initial')) {
                    anomalies.push('Missing transaction reference ID.');
                }

                let changeAmount = 0;
                if (tx.type === 'in' || tx.type === 'return') changeAmount = tx.quantity;
                else if (tx.type === 'out') changeAmount = -Math.abs(tx.quantity);
                else if (tx.type === 'adjustment') changeAmount = tx.quantity;
                
                currentBalance -= changeAmount;

                return {
                    ...tx,
                    computedBalance: balanceAfter,
                    anomalies
                };
            });
            allMapped.push(...mapped);
        });

        return allMapped.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0);
            const dateB = b.date?.toDate ? b.date.toDate() : b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [transactions, products]);

    const filteredTransactions = processedTransactions.filter(log => {
        if (searchQuery && !log.productName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        if (dateFilter !== 'all') {
            const txDate = log.date?.toDate ? log.date.toDate() : log.date?.seconds ? new Date(log.date.seconds * 1000) : new Date(0);
            const now = new Date();
            let cutoff = new Date(0);
            if (dateFilter === '30d') cutoff = new Date(now.setDate(now.getDate() - 30));
            else if (dateFilter === '90d') cutoff = new Date(now.setDate(now.getDate() - 90));
            else if (dateFilter === '6m') cutoff = new Date(now.setMonth(now.getMonth() - 6));
            else if (dateFilter === '1y') cutoff = new Date(now.setFullYear(now.getFullYear() - 1));
            
            if (txDate < cutoff) return false;
        }

        if (logFilter === 'all') return true;
        if (logFilter === 'adjustment') return log.type === 'adjustment' || (log.type !== 'in' && log.type !== 'out' && log.type !== 'return');
        return log.type === logFilter;
    });

    let totalUnitsIn = 0;
    let totalUnitsOut = 0;
    
    filteredTransactions.forEach(t => {
        const qty = Math.abs(t.quantity || 0);
        if (t.type === 'in' || t.quantity > 0 || (t.type === 'adjustment' && t.quantity > 0)) {
            totalUnitsIn += qty;
        } else if (t.type === 'out' || t.type === 'return' || t.quantity < 0 || (t.type === 'adjustment' && t.quantity < 0)) {
            totalUnitsOut += qty;
        }
    });

    const netMovement = totalUnitsIn - totalUnitsOut;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/20 border-dashed">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Stock History</h3>
                <p className="text-sm text-muted-foreground mt-1">Stock adjustments and sales will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by product name..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Total Units Sold (Out)</CardTitle>
                        <ArrowDown className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUnitsOut.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Total Units Restocked (In)</CardTitle>
                        <ArrowUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUnitsIn.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">Net Stock Movement</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netMovement > 0 ? 'text-emerald-600' : netMovement < 0 ? 'text-rose-600' : ''}`}>
                            {netMovement > 0 ? '+' : ''}{netMovement.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-base flex items-center gap-2">
                                <HistoryIcon className="h-4 w-4 text-primary" />
                                {t('inventory.stockHistoryTitle') || 'Transaction History'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('inventory.stockHistoryHint') || 'A complete timeline of all stock changes across your products.'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={handleExportAudit} disabled={transactions.length === 0}>
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Export Audit Log
                            </Button>
                            
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-[120px] h-8 text-[11px] justify-between bg-background font-normal">
                                        <span>
                                            {dateFilter === 'all' ? 'All Time' : 
                                             dateFilter === '30d' ? 'Last 30 Days' :
                                             dateFilter === '90d' ? 'Last 90 Days' :
                                             dateFilter === '6m' ? 'Last 6 Months' : 'Last Year'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[150px]">
                                    <DropdownMenuItem onClick={() => setDateFilter('30d')}>Last 30 Days</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDateFilter('90d')}>Last 90 Days</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDateFilter('6m')}>Last 6 Months</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDateFilter('1y')}>Last Year</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDateFilter('all')}>All Time</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-[150px] h-8 text-[11px] justify-between bg-background font-normal">
                                        <span>
                                            {logFilter === 'all' ? 'All Transactions' : logFilter === 'in' ? 'Stock In (Restocks)' : logFilter === 'out' ? 'Stock Out (Sales)' : logFilter === 'return' ? 'Returns (Voided)' : 'Adjustments'}
                                        </span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[150px]">
                                    <DropdownMenuItem onClick={() => setLogFilter('all')}>All Transactions</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLogFilter('in')}>Stock In (Restocks)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLogFilter('out')}>Stock Out (Sales)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLogFilter('return')}>Returns (Voided)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLogFilter('adjustment')}>Adjustments</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Closing Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No transactions match the selected filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const isPositive = tx.quantity > 0 || tx.type === 'in' || tx.type === 'return';
                                    return (
                                        <TableRow 
                                            key={tx.id || Math.random().toString()}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedTransaction(tx)}
                                        >
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {tx.date?.seconds 
                                                    ? format(new Date(tx.date.seconds * 1000), 'dd MMM yyyy, HH:mm') 
                                                    : format(new Date(), 'dd MMM yyyy, HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tx.productName || 'Unknown Product'}</div>
                                                {tx.notes && <div className="text-xs text-muted-foreground mt-0.5">{tx.notes}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className={`inline-flex items-center gap-1 font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                    {Math.abs(tx.quantity)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className={tx.computedBalance < 0 ? "text-red-500 font-bold" : ""}>
                                                        {tx.computedBalance !== undefined ? tx.computedBalance : '-'}
                                                    </span>
                                                    {tx.anomalies && tx.anomalies.length > 0 && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 cursor-help ml-1" />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm max-w-[200px]" side="left">
                                                                    <ul className="list-disc pl-3 text-xs space-y-0.5 text-left">
                                                                        {tx.anomalies.map((a: string, i: number) => (
                                                                            <li key={i}>{a}</li>
                                                                        ))}
                                                                    </ul>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <TransactionDetailsModal 
                transaction={selectedTransaction} 
                users={users || []}
                open={!!selectedTransaction} 
                onOpenChange={(open) => !open && setSelectedTransaction(null)} 
            />
        </div>
        </div>
    );
}
