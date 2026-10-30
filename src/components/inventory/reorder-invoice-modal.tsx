'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/pos-context';
import type { Product } from '@/types';
import { useI18n } from '@/context/i18n-context';
import { FileText, Send, Printer, Trash2, CheckCircle2, Package, Sparkles } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { calculateProductDemandForecast } from '@/lib/demand-forecasting';
import { cn } from '@/lib/utils';

interface ReorderInvoiceModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    preselectedProducts?: Product[];
}

export function ReorderInvoiceModal({
    isOpen,
    onOpenChange,
    preselectedProducts
}: ReorderInvoiceModalProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { products, business, currencySymbol, currentUserProfile, receipts } = usePOS();
    const firestore = useFirestore();

    const [supplierName, setSupplierName] = React.useState('');
    const [supplierPhone, setSupplierPhone] = React.useState('');
    const [supplierEmail, setSupplierEmail] = React.useState('');
    const [notes, setNotes] = React.useState('Automatic reorder for stock items reaching reorder point.');
    const [isSaving, setIsSaving] = React.useState(false);
    const [forecastHorizon, setForecastHorizon] = React.useState<7 | 14 | 30>(14);

    // Items list for the reorder invoice
    const [reorderItems, setReorderItems] = React.useState<{
        productId: string;
        name: string;
        sku: string;
        currentStock: number;
        reorderPoint: number;
        costPrice: number;
        orderQty: number;
        dailyVelocity: number;
        daysRemaining: number | null;
    }[]>([]);

    // Initialize items when modal opens with demand forecasting
    React.useEffect(() => {
        if (!isOpen) return;

        const candidateProducts = preselectedProducts && preselectedProducts.length > 0
            ? preselectedProducts
            : (products || []).filter(p => typeof p.stock === 'number' && (p.lowStockThreshold || 0) > 0 && p.stock <= (p.lowStockThreshold || 0));

        const mapped = candidateProducts.map(p => {
            const currentStock = p.stock || 0;
            const threshold = p.lowStockThreshold || 5;
            const forecast = calculateProductDemandForecast(p, receipts, forecastHorizon);
            return {
                productId: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                currentStock,
                reorderPoint: threshold,
                costPrice: p.costPrice || p.price || 0,
                orderQty: Math.max(1, forecast.recommendedQty),
                dailyVelocity: forecast.dailyVelocity,
                daysRemaining: forecast.daysRemaining,
            };
        });

        setReorderItems(mapped);
    }, [isOpen, products, preselectedProducts, receipts, forecastHorizon]);

    const handleHorizonChange = (newHorizon: 7 | 14 | 30) => {
        setForecastHorizon(newHorizon);
        setReorderItems(prev => prev.map(item => {
            const prod = (products || []).find(p => p.id === item.productId);
            if (!prod) return item;
            const forecast = calculateProductDemandForecast(prod, receipts, newHorizon);
            return {
                ...item,
                orderQty: Math.max(1, forecast.recommendedQty),
                dailyVelocity: forecast.dailyVelocity,
                daysRemaining: forecast.daysRemaining,
            };
        }));
    };

    const totalCost = React.useMemo(() => {
        return reorderItems.reduce((sum, item) => sum + (item.costPrice * item.orderQty), 0);
    }, [reorderItems]);

    const handleQtyChange = (index: number, newQty: number) => {
        setReorderItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], orderQty: Math.max(1, newQty) };
            return updated;
        });
    };

    const handleRemoveItem = (index: number) => {
        setReorderItems(prev => prev.filter((_, i) => i !== index));
    };

    // Format invoice text for WhatsApp sharing
    const handleSendWhatsApp = () => {
        if (reorderItems.length === 0) {
            toast({ variant: 'destructive', title: 'No items in invoice' });
            return;
        }

        const lines = [
            `📦 *REORDER PURCHASE ORDER INVOICE*`,
            `From: *${business?.name || 'Zeneva Store'}*`,
            `To Supplier: *${supplierName || 'Valued Supplier'}*`,
            `Forecast Horizon: *${forecastHorizon} Days*`,
            `Date: ${new Date().toLocaleDateString()}`,
            `-----------------------------------`,
            `*ITEMS REQUIRED:*`,
            ...reorderItems.map((item, idx) => 
                `${idx + 1}. *${item.name}* (SKU: ${item.sku})\n   Qty: *${item.orderQty} units* @ ${currencySymbol}${item.costPrice.toLocaleString()} = ${currencySymbol}${(item.orderQty * item.costPrice).toLocaleString()}`
            ),
            `-----------------------------------`,
            `*TOTAL ESTIMATED COST: ${currencySymbol}${totalCost.toLocaleString()}*`,
            notes ? `\nNote: ${notes}` : '',
            `\nPlease confirm availability and delivery timeframe. Thank you!`
        ];

        const text = encodeURIComponent(lines.join('\n'));
        const cleanPhone = supplierPhone.replace(/\D/g, '');
        const waUrl = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${text}`
            : `https://wa.me/?text=${text}`;

        window.open(waUrl, '_blank');
        toast({
            variant: 'success',
            title: 'WhatsApp Opened',
            description: 'Order details prepared and copied to WhatsApp.',
        });
    };

    // Print or Export PDF
    const handlePrintInvoice = () => {
        if (reorderItems.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Please allow pop-ups to print this invoice.' });
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Purchase Order Invoice - ${business?.name || 'Zeneva Store'}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #ea580c; }
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background-color: #f8fafc; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
                    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                    .text-right { text-align: right; }
                    .total-box { text-align: right; margin-top: 20px; padding: 15px; background: #fff7ed; border-radius: 8px; border: 1px solid #fed7aa; }
                    .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">PURCHASE ORDER INVOICE</div>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Ref: PO-${Date.now().toString().slice(-6)} (Horizon: ${forecastHorizon} Days)</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin:0;">${business?.name || 'Zeneva Store'}</h3>
                        <p style="margin: 5px 0 0 0; color: #64748b;">${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="meta-grid">
                    <div>
                        <strong>SUPPLIER DETAILS:</strong><br/>
                        ${supplierName || 'General Supplier'}<br/>
                        ${supplierPhone ? `Phone: ${supplierPhone}<br/>` : ''}
                        ${supplierEmail ? `Email: ${supplierEmail}<br/>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <strong>ISSUED BY:</strong><br/>
                        ${currentUserProfile?.name || 'Store Manager'}<br/>
                        Zeneva Retail Management
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item & SKU</th>
                            <th class="text-right">Order Qty</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reorderItems.map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${item.name}</strong><br/><small style="color:#64748b">SKU: ${item.sku}</small></td>
                                <td class="text-right">${item.orderQty}</td>
                                <td class="text-right">${currencySymbol}${item.costPrice.toLocaleString()}</td>
                                <td class="text-right">${currencySymbol}${(item.orderQty * item.costPrice).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-box">
                    <p style="margin:0; font-size: 14px; color: #64748b;">Total Amount Due:</p>
                    <h2 style="margin:5px 0 0 0; color: #ea580c;">${currencySymbol}${totalCost.toLocaleString()}</h2>
                </div>

                <div class="footer">
                    <p>${notes}</p>
                    <p>Generated via Zeneva Retail OS — Official Reorder Document</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Save as Purchase Order Record in Firestore
    const handleSavePurchaseOrder = async () => {
        if (!business?.id || !firestore || reorderItems.length === 0) return;
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'businessInstances', business.id, 'purchaseOrders'), {
                supplierName: supplierName || 'General Supplier',
                supplierPhone,
                supplierEmail,
                forecastHorizonDays: forecastHorizon,
                items: reorderItems,
                totalCost,
                status: 'draft',
                notes,
                createdBy: currentUserProfile?.name || 'Manager',
                createdAt: serverTimestamp()
            });

            toast({
                variant: 'success',
                title: 'Purchase Order Saved',
                description: `Created draft PO for ${reorderItems.length} items totaling ${currencySymbol}${totalCost.toLocaleString()}.`,
            });
            onOpenChange(false);
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Failed to Save PO',
                description: 'An unexpected error occurred while saving the draft PO.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500/10 text-orange-600 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Auto-Generated Reorder Invoice</DialogTitle>
                            <DialogDescription className="text-xs">
                                Demand-forecasted purchase order based on sales velocity and target stock horizon.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Supplier Meta Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                        <div>
                            <Label className="text-xs">Supplier Name</Label>
                            <Input
                                placeholder="e.g. Acme Wholesalers"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Supplier WhatsApp/Phone</Label>
                            <Input
                                placeholder="e.g. +2348012345678"
                                value={supplierPhone}
                                onChange={(e) => setSupplierPhone(e.target.value)}
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Supplier Email (Optional)</Label>
                            <Input
                                placeholder="supplier@example.com"
                                value={supplierEmail}
                                onChange={(e) => setSupplierEmail(e.target.value)}
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                    </div>

                    {/* Forecast Horizon Controls & Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 text-orange-500" />
                                Reorder Items ({reorderItems.length})
                            </h4>
                        </div>

                        {/* Forecast Horizon Selector */}
                        <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border text-xs self-start sm:self-auto">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase px-1.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-orange-500" />
                                Forecast:
                            </span>
                            <button
                                type="button"
                                onClick={() => handleHorizonChange(7)}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                                    forecastHorizon === 7 ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                7 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => handleHorizonChange(14)}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                                    forecastHorizon === 14 ? "bg-orange-500 text-white shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                14 Days (Rec)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleHorizonChange(30)}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                                    forecastHorizon === 30 ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                30 Days
                            </button>
                        </div>
                    </div>

                    {reorderItems.length === 0 ? (
                        <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                            All products are currently above their reorder points! No low stock items to restock.
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden bg-card">
                            <div className="max-h-[260px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted text-muted-foreground sticky top-0 font-semibold border-b">
                                        <tr>
                                            <th className="p-2.5">Item Name</th>
                                            <th className="p-2.5 text-center">Velocity / Stock</th>
                                            <th className="p-2.5 text-center w-24">Order Qty</th>
                                            <th className="p-2.5 text-right">Cost Price</th>
                                            <th className="p-2.5 text-right">Subtotal</th>
                                            <th className="p-2.5 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reorderItems.map((item, idx) => (
                                            <tr key={item.productId} className="hover:bg-muted/30">
                                                <td className="p-2.5">
                                                    <div className="font-semibold text-foreground">{item.name}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</div>
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-200">
                                                            {item.currentStock} / {item.reorderPoint}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {item.dailyVelocity > 0 ? `⚡ ${item.dailyVelocity}/d` : 'No sales'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.orderQty}
                                                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                                                        className="h-7 text-center text-xs w-20 mx-auto font-semibold text-foreground"
                                                    />
                                                </td>
                                                <td className="p-2.5 text-right font-medium">
                                                    {currencySymbol}{item.costPrice.toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    {currencySymbol}{(item.orderQty * item.costPrice).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveItem(idx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 order-2 sm:order-1">
                        <span>Total PO Cost:</span>
                        <strong className="text-sm text-foreground text-orange-600 dark:text-orange-400">
                            {currencySymbol}{totalCost.toLocaleString()}
                        </strong>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrintInvoice}
                            disabled={reorderItems.length === 0}
                            className="gap-1.5 text-xs"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print / PDF
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendWhatsApp}
                            disabled={reorderItems.length === 0}
                            className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                            <Send className="h-3.5 w-3.5" />
                            WhatsApp
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSavePurchaseOrder}
                            disabled={isSaving || reorderItems.length === 0}
                            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Save PO Draft
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
