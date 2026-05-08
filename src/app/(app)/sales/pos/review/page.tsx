
'use client';
import * as React from 'react';
import ReceiptDetails from "@/components/receipts/receipt-details";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePOS } from "@/context/pos-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBusiness } from '@/context/pos-context';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // To generate a unique receipt number
import { sendReceiptEmail } from '@/lib/email';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { logAuditEvent } from '@/lib/audit';


function ReviewPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const { cart, selectedCustomer, subtotal, tax, discount, total, paymentMethod, currencySymbol, resetPOS, products, currentUserProfile, customers, autoPrint, setAutoPrint, addToQueue, holdCurrentSale } = usePOS();
    const firestore = useFirestore();
    const business = useBusiness();
    const { user } = useUser();
    const [isCompleting, setIsCompleting] = React.useState(false);
    const [shouldSendEmail, setShouldSendEmail] = React.useState(false);
    const searchParams = useSearchParams();
    const isAutoPrompted = searchParams.get('auto') === 'true';
    const [backdate, setBackdate] = React.useState('');
    const isAdmin = currentUserProfile?.role === 'admin' || business?.ownerId === currentUserProfile?.id;
    const receiptContentRef = React.useRef<HTMLDivElement>(null);
    const hasPrintedRef = React.useRef(false);
    const checkoutStartedRef = React.useRef(false);

    // Hydration fix
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    // Memoize the receipt number so it doesn't change on every render
    const stableReceiptNumber = React.useMemo(() => `rec-${uuidv4().split('-')[0]}`, []);

    // Create a temporary receipt object for display before saving
    const displayReceipt = React.useMemo(() => ({
        id: 'temp-id',
        businessId: business?.id || 'temp-biz-id',
        receiptNumber: stableReceiptNumber,
        items: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            costPrice: item.product.costPrice || 0,
        })),
        customer: selectedCustomer || undefined,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: paymentMethod as 'Cash' | 'Card' | 'Bank Transfer' | 'Invoice',
        status: (paymentMethod === 'Bank Transfer' ? 'pending' : (paymentMethod === 'Invoice' ? 'unpaid' : 'paid')) as 'pending' | 'unpaid' | 'paid',
        createdAt: backdate ? new Date(backdate) : new Date(), // Use a real date for optimistic display
    }), [stableReceiptNumber, business?.id, cart, selectedCustomer, subtotal, tax, discount, total, paymentMethod, backdate]);

    const handleCompleteSale = React.useCallback(() => {
        if (checkoutStartedRef.current) return;
        
        if (!business || !user || cart.length === 0 || !products || !currentUserProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot complete sale. Missing session data or empty cart.' });
            setIsCompleting(false);
            return;
        }

        checkoutStartedRef.current = true;

        // 1. Validations (Backorder & Operating Hours)
        for (const cartItem of cart) {
            const productFromCache = products.find(p => p.id === cartItem.product.id);
            const isService = productFromCache?.categoryType === 'service';
            if (!isService && (!productFromCache || (productFromCache.stock || 0) < cartItem.quantity)) {
                toast({
                    variant: 'backorder' as any,
                    title: 'Backorder Sale',
                    description: `This sale will record a debt as there is insufficient stock for ${cartItem.product.name}.`
                });
            }
        }

        const operatingHours = business.settings?.operatingHours;
        let isOutsideHours = false;
        if (operatingHours?.enabled) {
            const saleDate = backdate ? new Date(backdate) : new Date();
            const [openH, openM] = operatingHours.openTime.split(':').map(Number);
            const [closeH, closeM] = operatingHours.closeTime.split(':').map(Number);
            const nowMinutes = saleDate.getHours() * 60 + saleDate.getMinutes();
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;

            if (closeMinutes < openMinutes) {
                isOutsideHours = !(nowMinutes >= openMinutes || nowMinutes <= closeMinutes);
            } else {
                isOutsideHours = nowMinutes < openMinutes || nowMinutes > closeMinutes;
            }

            if (isOutsideHours && operatingHours.preventSalesOutsideHours && !isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Operating Hours Violation',
                    description: `Sales are not allowed outside of operating hours (${operatingHours.openTime} - ${operatingHours.closeTime}).`
                });
                return;
            }
        }

        setIsCompleting(true);

        // 2. Prepare Data for Queue (Securely Recalculate)
        const newReceiptId = uuidv4();
        let secureSubtotal = 0;
        let secureTotalCost = 0;
        
        const itemsForReceipt = cart.map(cartItem => {
            const masterProduct = products.find(p => p.id === cartItem.product.id);
            const costPrice = masterProduct?.costPrice || 0;
            
            // SECURITY: If not a manual override, use the price from the master product list
            let finalPrice = cartItem.product.price;
            if (!cartItem.isPriceOverride && masterProduct) {
                if (cartItem.unit) {
                    // Check if there's a unit conversion with a specific price override
                    const conversion = masterProduct.uomConversions?.find(u => u.unitName === cartItem.unit);
                    finalPrice = conversion?.price ?? (masterProduct.price * (cartItem.multiplier || 1));
                } else {
                    finalPrice = masterProduct.price;
                }
            }

            // Detect if the price in cart was tampered with (different from expected)
            if (finalPrice !== cartItem.product.price) {
                console.warn(`Price mismatch detected for ${cartItem.product.name}. Expected ${finalPrice}, got ${cartItem.product.price}. Reverting to secure price.`);
            }

            secureSubtotal += finalPrice * cartItem.quantity;
            secureTotalCost += costPrice * cartItem.quantity;

            return {
                productId: cartItem.product.id,
                name: cartItem.unit ? `${cartItem.product.name} (${cartItem.unit})` : cartItem.product.name,
                quantity: cartItem.quantity,
                unit: cartItem.unit || null,
                multiplier: cartItem.multiplier || 1,
                price: finalPrice,
                costPrice: costPrice,
            };
        });

        const secureTax = secureSubtotal * (business.settings?.defaultTaxRate || 0) / 100;
        const secureTotal = secureSubtotal + secureTax - discount;
        const profit = secureTotal - secureTotalCost;
        const status = paymentMethod === 'Bank Transfer' ? 'pending' : (paymentMethod === 'Invoice' ? 'unpaid' : 'paid');

        const receiptData = {
            id: newReceiptId,
            businessId: business.id,
            receiptNumber: displayReceipt.receiptNumber,
            items: itemsForReceipt,
            customer: selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name, email: selectedCustomer.email } : null,
            subtotal: secureSubtotal, 
            tax: secureTax, 
            discount, 
            total: secureTotal, 
            totalCost: secureTotalCost, 
            profit, 
            paymentMethod,
            status,
            createdAt: backdate ? new Date(backdate) : new Date(),
            createdBy: user.uid,
            flagged: isOutsideHours ? { reason: 'outside_operating_hours', openTime: operatingHours?.openTime, closeTime: operatingHours?.closeTime } : null,
        };

        const productUpdates = cart.map(cartItem => {
            const product = products.find(p => p.id === cartItem.product.id);
            const multiplier = cartItem.multiplier || 1;
            const baseQuantitySold = cartItem.quantity * multiplier;
            return {
                id: cartItem.product.id,
                newStock: (product?.stock || 0) - baseQuantitySold,
                type: product?.type,
                components: product?.components
            };
        });

        const customerUpdate = selectedCustomer ? {
            id: selectedCustomer.id,
            loyaltyPoints: business.settings?.loyaltyProgramEnabled ? (selectedCustomer.loyaltyPoints || 0) + Math.floor(secureTotal * (business.settings.pointsPerUnit || 0)) : (selectedCustomer.loyaltyPoints || 0),
            totalSpent: secureTotal
        } : null;

        // 3. ADD TO QUEUE (This is now instant and handles SQLite)
        addToQueue({
            type: 'complete-sale',
            payload: {
                receiptData: { ...receiptData, createdAt: receiptData.createdAt.toISOString() }, // Stringify date for queue
                productUpdates,
                customerUpdate
            }
        }, `Recording Sale: ${receiptData.receiptNumber}`);

        // 4. Handle Email Receipt (Try sending immediately if online)
        if (navigator.onLine && shouldSendEmail && selectedCustomer?.email) {
            const isEmailAllowed = business.plan === 'business' || business.accessLevel === 'lifetime' || business.plan === 'pro';
            if (isEmailAllowed) {
                const numberFormat = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const items_html = cart.map(item =>
                    `<tr>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">
                            <div style="font-weight: bold;">${item.product.name}</div>
                            <div style="color: #666; font-size: 12px;">${item.quantity} x ${currencySymbol}${numberFormat.format(item.product.price)}</div>
                        </td>
                        <td style="padding: 5px; text-align: right; border-bottom: 1px solid #eee;">
                            ${currencySymbol}${numberFormat.format(item.product.price * item.quantity)}
                        </td>
                    </tr>`
                ).join('');

                sendReceiptEmail({
                    to_email: selectedCustomer.email,
                    to_name: selectedCustomer.name,
                    business_name: business.name,
                    receipt_id: newReceiptId.substring(0, 8),
                    items_html,
                    currency_symbol: currencySymbol,
                    subtotal: numberFormat.format(secureSubtotal),
                    tax: numberFormat.format(secureTax),
                    discount: numberFormat.format(discount),
                    total: numberFormat.format(secureTotal),
                    payment_method: paymentMethod,
                    date: new Date().toLocaleString()
                }).catch(e => console.error("Email failed:", e));
            }
        }

        // 5. Cleanup & Navigation
        if (autoPrint && !hasPrintedRef.current) {
            hasPrintedRef.current = true;
            setTimeout(() => {
                const handleAfterPrint = () => {
                    window.removeEventListener('afterprint', handleAfterPrint);
                    router.push('/sales/pos/select-products');
                    resetPOS();
                };
                window.addEventListener('afterprint', handleAfterPrint);
                
                try {
                    if (typeof window !== 'undefined' && window.print) {
                        window.print();
                    } else {
                        handleAfterPrint();
                    }
                } catch (printError) {
                    console.warn("Printing failed or unsupported on this device:", printError);
                    handleAfterPrint();
                }
                
                // Fallback for browsers (especially mobile and standalone PWAs) that don't reliably fire afterprint
                const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                setTimeout(() => {
                    window.removeEventListener('afterprint', handleAfterPrint);
                    // Check if we haven't already navigated (resetPOS clears cart)
                    if (cart.length > 0) {
                       router.push('/sales/pos/select-products');
                       resetPOS();
                    }
                }, isMobile ? 1500 : 3000); // 1.5s on mobile, 3s on desktop fallback instead of 60s
            }, 500);
        } else if (!autoPrint) {
            router.push('/sales/pos/select-products');
            resetPOS();
        }

        toast({
            variant: navigator.onLine ? 'success' : 'default',
            title: navigator.onLine ? "Sale Recorded" : "Sale Queued (Offline)",
            description: navigator.onLine ? `Receipt ${receiptData.receiptNumber} generated.` : "Success! This sale is saved locally and will sync to the cloud automatically.",
        });
        
        // Note: We don't set isCompleting(false) here if redirect is happening
        // to prevent the auto-submit useEffect from re-firing.
        // It will be reset when the component unmounts or POS is reset.

    }, [business, user, cart, products, currentUserProfile, subtotal, tax, discount, total, paymentMethod, currencySymbol, resetPOS, router, autoPrint, backdate, shouldSendEmail, toast, addToQueue, displayReceipt.receiptNumber, selectedCustomer]);

    // **Auto-Submit Logic**
    // We only want to trigger this ONCE when auto-prompted
    React.useEffect(() => {
        if (isAutoPrompted && !isCompleting && cart.length > 0) {
            handleCompleteSale();
        }
    }, [isAutoPrompted, isCompleting, cart.length, handleCompleteSale]);

    const canSendEmail = React.useMemo(() => {
        const plan = business?.plan;
        const access = business?.accessLevel;
        const allowed = plan === 'business' || access === 'lifetime' || plan === 'pro'; 
        return allowed;
    }, [business]);

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Initializing checkout...</p>
            </div>
        );
    }

    if (cart.length === 0 && !isCompleting) {
        return (
            <div className="text-center">
                <p>Your cart is empty.</p>
                <Button asChild variant="link">
                    <Link href="/sales/pos/select-products">Start a new sale</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-4 font-headline no-print">Review Your Sale</h2>
                <ReceiptDetails ref={receiptContentRef} receipt={displayReceipt} business={business} currencySymbol={currencySymbol} />
            </div>
            <div className="no-print">
                <div className="p-4 rounded-lg bg-card border space-y-4">
                    <h3 className="text-lg font-semibold">Ready to Complete?</h3>
                    <p className="text-sm text-muted-foreground">
                        This will finalize the sale, generate a receipt, and update your inventory. This action works offline.
                    </p>

                    {isAdmin && (
                        <>
                            <Separator />
                            <div className="flex flex-col gap-2 py-2">
                                <Label htmlFor="backdate" className="text-sm font-semibold flex flex-col gap-1 cursor-pointer">
                                    <span>Backdate Sale (Admin/Owner Only)</span>
                                    <span className="font-normal text-muted-foreground text-xs">
                                        Record a missed sale from a previous date. This action will be flagged in the audit log.
                                    </span>
                                </Label>
                                <Input
                                    id="backdate"
                                    type="datetime-local"
                                    className="w-full mt-1"
                                    value={backdate}
                                    onChange={(e) => setBackdate(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {selectedCustomer?.email && canSendEmail && (
                        <>
                            <Separator />
                            <div className="flex items-center justify-between py-2">
                                <Label htmlFor="send-email-receipt" className="flex flex-col gap-1 cursor-pointer">
                                    <span>Email Receipt</span>
                                    <span className="font-normal text-muted-foreground text-xs">
                                        Send a copy to {selectedCustomer.email}
                                    </span>
                                </Label>
                                <Switch
                                    id="send-email-receipt"
                                    checked={shouldSendEmail}
                                    onCheckedChange={setShouldSendEmail}
                                />
                            </div>
                        </>
                    )}

                    <Separator />
                    <div className="flex items-center justify-between py-2">
                        <Label htmlFor="auto-print" className="cursor-pointer font-medium text-sm">
                            Print Receipt
                        </Label>
                        <input
                            type="checkbox"
                            id="auto-print"
                            className="w-4 h-4 cursor-pointer"
                            checked={autoPrint}
                            onChange={(e) => setAutoPrint(e.target.checked)}
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <Button size="lg" className="w-full text-lg h-12 shadow-md hover:shadow-lg transition-all" onClick={handleCompleteSale} disabled={isCompleting}>
                            {isCompleting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {isCompleting ? 'Finalizing...' : (paymentMethod === 'Invoice' ? 'Issue Professional Invoice' : 'Complete Sale')}
                        </Button>
                        <Button size="lg" className="w-full h-12" variant="outline" onClick={() => {
                            holdCurrentSale();
                            router.push('/sales/pos/select-products');
                        }} disabled={isCompleting}>
                            Park Sale
                        </Button>
                        <Button size="lg" className="w-full" variant="outline" asChild>
                            <Link href="/sales/pos/payment">Back to Payment</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ReviewPage() {
    return (
        <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Initializing checkout...</p>
            </div>
        }>
            <ReviewPageContent />
        </React.Suspense>
    );
}
