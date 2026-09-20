import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, ArrowRight, User, Package, Calendar, Receipt, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TransactionDetailsModalProps {
    transaction: any | null;
    users?: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsModal({ transaction, users, open, onOpenChange }: TransactionDetailsModalProps) {
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

    const txDate = transaction.date?.seconds 
        ? new Date(transaction.date.seconds * 1000) 
        : new Date();

    // Try to extract receipt number from notes if it's a sale
    let receiptRef = transaction.referenceId;
    if (!receiptRef && transaction.notes && transaction.type === 'out') {
        const match = transaction.notes.match(/Receipt #(rec-[a-zA-Z0-9]+)/);
        if (match) {
            receiptRef = match[1];
        }
    }

    let creatorName = transaction.createdBy || 'System / Unknown';
    if (transaction.createdBy && users) {
        const user = users.find(u => u.id === transaction.createdBy);
        if (user) {
            creatorName = user.name || user.email || creatorName;
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden rounded-2xl">
                <div className={`h-2 w-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                
                <div className="p-6 pt-5">
                    <DialogHeader className="mb-6 text-left">
                        <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={`capitalize font-medium ${isPositive ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-500/10'}`}>
                                {transaction.type === 'in' ? 'Stock Added' : transaction.type === 'out' ? 'Sale / Removed' : transaction.type}
                            </Badge>
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {format(txDate, 'dd MMM yyyy, HH:mm')}
                            </div>
                        </div>
                        <DialogTitle className="text-xl leading-tight">
                            {transaction.productName || 'Unknown Product'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="bg-muted/30 rounded-xl p-5 mb-6 border border-border/50">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stock Math</div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col items-center">
                                <span className="text-sm text-muted-foreground mb-1">Before</span>
                                <span className="text-2xl font-bold">{balanceBefore}</span>
                            </div>
                            
                            <div className="flex flex-col items-center px-4">
                                <span className="text-sm text-muted-foreground mb-1">Change</span>
                                <div className={`flex items-center justify-center h-10 w-16 rounded-full border-2 font-bold ${isPositive ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20' : 'border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-500/20'}`}>
                                    {isPositive ? '+' : '-'}{quantity}
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <span className="text-sm text-muted-foreground mb-1">After</span>
                                <span className="text-2xl font-bold">{balanceAfter}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-muted rounded-full p-1.5 text-muted-foreground">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Recorded By</p>
                                <p className="text-sm text-muted-foreground">{creatorName}</p>
                            </div>
                        </div>

                        {receiptRef && (
                            <Link href={`/receipts?search=${receiptRef}`} onClick={() => onOpenChange(false)} className="flex items-start gap-3 p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                                <div className="mt-0.5 bg-muted rounded-full p-1.5 text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Receipt className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium group-hover:text-primary transition-colors">Receipt / Reference</p>
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-mono">{receiptRef}</p>
                                </div>
                            </Link>
                        )}

                        {transaction.notes && !transaction.notes.includes(receiptRef || '') && (
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 bg-muted rounded-full p-1.5 text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Notes</p>
                                    <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                                </div>
                            </div>
                        )}

                        {transaction.anomalies && transaction.anomalies.length > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg border border-amber-200/50 mt-4">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900 dark:text-amber-500">Flags</p>
                                    <ul className="list-disc pl-4 mt-1 space-y-1">
                                        {transaction.anomalies.map((a: string, i: number) => (
                                            <li key={i} className="text-xs text-amber-700/80 dark:text-amber-500/80">{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
