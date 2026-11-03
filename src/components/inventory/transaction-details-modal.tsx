import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, User, Calendar, Receipt, FileText, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TransactionDetailsModalProps {
    transaction: any | null;
    users?: any[];
    userMap?: Map<string, string>;
    resolveName?: (id: string | undefined) => string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsModal({
    transaction,
    users,
    userMap,
    resolveName,
    open,
    onOpenChange
}: TransactionDetailsModalProps) {
    if (!transaction) return null;

    const isPositive = transaction.quantity > 0 || transaction.type === 'in' || transaction.type === 'return';
    const quantity = Math.abs(transaction.quantity);
    const balanceAfter = transaction.computedBalance !== undefined ? transaction.computedBalance : '-';
    let balanceBefore = '-';
    
    if (transaction.computedBalance !== undefined) {
        if (transaction.type === 'in' || transaction.type === 'return') {
            balanceBefore = (transaction.computedBalance - quantity).toString();
        } else if (transaction.type === 'out') {
            balanceBefore = (transaction.computedBalance + quantity).toString();
        } else if (transaction.type === 'adjustment') {
            balanceBefore = (transaction.computedBalance - transaction.quantity).toString();
        }
    }

    const rawDate = transaction.date || transaction.createdAt;
    let txDate: Date = new Date();
    if (rawDate) {
        if (typeof rawDate.toDate === 'function') {
            txDate = rawDate.toDate();
        } else if (rawDate.seconds) {
            txDate = new Date(rawDate.seconds * 1000);
        } else if (rawDate instanceof Date) {
            txDate = rawDate;
        } else {
            txDate = new Date(rawDate);
        }
    }

    // Extract receipt number from referenceId or notes
    let receiptRef: string | null = transaction.referenceId || null;
    if (!receiptRef && transaction.notes) {
        const match = transaction.notes.match(/(rec-[a-zA-Z0-9_-]+)/i);
        if (match) {
            receiptRef = match[1];
        }
    }

    // Resolve real creator name
    let creatorName = transaction.cashierName || transaction.userName || transaction.actorName || transaction.createdBy || 'Staff';
    if (resolveName) {
        creatorName = resolveName(creatorName);
    } else if (userMap && userMap.has(creatorName)) {
        creatorName = userMap.get(creatorName)!;
    } else if (users && Array.isArray(users)) {
        const found = users.find(u => u.id === creatorName || (u as any).uid === creatorName);
        if (found) {
            creatorName = found.name || found.displayName || (found.email ? found.email.split('@')[0] : creatorName);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden rounded-2xl border shadow-xl">
                <div className={`h-2.5 w-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                
                <div className="p-6 pt-5">
                    <DialogHeader className="mb-5 text-left">
                        <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={`capitalize font-semibold text-xs px-2.5 py-0.5 ${
                                isPositive 
                                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : 'text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                                {transaction.type === 'in' ? 'Stock Added' : transaction.type === 'out' ? 'Stock Out (Sale / Adjustment)' : transaction.type === 'return' ? 'Customer Return' : 'Adjustment'}
                            </Badge>
                            <div className="flex items-center text-xs font-medium text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 mr-1 text-primary/70" />
                                {format(txDate, 'dd MMM yyyy, HH:mm')}
                            </div>
                        </div>
                        <DialogTitle className="text-xl font-bold leading-tight">
                            {transaction.productName || 'Stock Movement Details'}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Stock Balance Math Card */}
                    <div className="bg-muted/40 rounded-xl p-4 mb-5 border border-border/60">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                            Stock Balance Verification
                        </div>
                        <div className="grid grid-cols-3 items-center text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground mb-1">Previous</span>
                                <span className="text-xl font-bold text-foreground">{balanceBefore}</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground mb-1">Change</span>
                                <div className={`flex items-center justify-center h-8 px-3 rounded-full border-2 font-bold text-sm ${
                                    isPositive 
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                        : 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                }`}>
                                    {isPositive ? '+' : '-'}{quantity}
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground mb-1">Resulting</span>
                                <span className={`text-xl font-bold ${typeof balanceAfter === 'number' && balanceAfter < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                                    {balanceAfter}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {/* Performed by real staff name */}
                        <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {creatorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Performed By</p>
                                <p className="text-sm font-semibold text-foreground truncate">{creatorName}</p>
                            </div>
                        </div>

                        {/* Direct Receipt Internal Link */}
                        {receiptRef && (
                            <Link 
                                href={`/receipts?search=${receiptRef}`} 
                                onClick={() => onOpenChange(false)} 
                                className="block group"
                            >
                                <div className="flex items-center justify-between p-3.5 bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100/70 dark:hover:bg-orange-900/40 border border-orange-200/80 dark:border-orange-900/60 rounded-xl transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                                            <Receipt className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                                                Associated Sale Receipt
                                            </div>
                                            <div className="text-sm font-mono font-bold text-foreground">
                                                #{receiptRef}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:translate-x-1 transition-transform">
                                        <span>View Receipt</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Notes */}
                        {transaction.notes && (
                            <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Notes & Reference</span>
                                </div>
                                <p className="text-xs text-foreground/90 font-mono break-all">{transaction.notes}</p>
                            </div>
                        )}

                        {/* Anomalies/Flags if any */}
                        {transaction.anomalies && transaction.anomalies.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Audit Anomaly Flags</span>
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-amber-900 dark:text-amber-300">
                                    {transaction.anomalies.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
