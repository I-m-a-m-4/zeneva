
'use client';
import * as React from 'react';
import ReceiptDetails from "@/components/receipts/receipt-details";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePOS } from "@/context/pos-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from '@/context/pos-context';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // To generate a unique receipt number
import { sendReceiptEmail } from '@/lib/email';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { logAuditEvent } from '@/lib/audit';


export default function ReviewPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { cart, selectedCustomer, subtotal, tax, discount, total, paymentMethod, currencySymbol, resetPOS, products, currentUserProfile, customers } = usePOS();
    const firestore = useFirestore();
    const business = useBusiness();
    const { user } = useUser();
    const [isCompleting, setIsCompleting] = React.useState(false);
    const [shouldSendEmail, setShouldSendEmail] = React.useState(true);
    const receiptContentRef = React.useRef<HTMLDivElement>(null);

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

    // Create a temporary receipt object for display before saving
    const displayReceipt = {
        id: 'temp-id',
        businessId: business?.id || 'temp-biz-id',
        receiptNumber: `rec-${uuidv4().split('-')[0]}`,
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
        paymentMethod: paymentMethod as 'Cash' | 'Card' | 'Bank Transfer',
        createdAt: new Date(), // Use a real date for optimistic display
    };


    const handleCompleteSale = () => {
        if (!firestore || !business || !user || cart.length === 0 || !products || !currentUserProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot complete sale. Missing session data or empty cart.' });
            return;
        }

        for (const cartItem of cart) {
            const productFromCache = products.find(p => p.id === cartItem.product.id);
            if (!productFromCache || (productFromCache.stock || 0) < cartItem.quantity) {
                toast({ variant: 'destructive', title: 'Stock Error', description: `Not enough stock for ${cartItem.product.name}. Please adjust the quantity.` });
                return;
            }
        }

        setIsCompleting(true);

        const newReceiptRef = doc(collection(firestore, 'receipts'));

        // **OPTIMISTIC UI FIX**: Save a temporary version to sessionStorage
        // Note: We use a real Date object and convert to ISO string for storage
        const optimisticReceipt = { ...displayReceipt, id: newReceiptRef.id, createdAt: displayReceipt.createdAt.toISOString() };
        try {
            sessionStorage.setItem(`optimistic-receipt-${newReceiptRef.id}`, JSON.stringify(optimisticReceipt));
        } catch (e) {
            console.error("Could not save optimistic receipt to session storage", e);
        }

        (async () => {
            try {
                const batch = writeBatch(firestore);

                let totalCost = 0;
                const itemsForReceipt = cart.map(cartItem => {
                    const product = products.find(p => p.id === cartItem.product.id);
                    const costPrice = product?.costPrice || 0;
                    totalCost += costPrice * cartItem.quantity;
                    const productRef = doc(firestore, 'products', cartItem.product.id);
                    const newStock = (product?.stock || 0) - cartItem.quantity;
                    batch.update(productRef, { stock: newStock });
                    return {
                        productId: cartItem.product.id,
                        name: cartItem.product.name,
                        quantity: cartItem.quantity,
                        price: cartItem.product.price,
                        costPrice: costPrice,
                    };
                });
                const profit = total - totalCost;

                if (selectedCustomer && business.settings?.loyaltyProgramEnabled) {
                    const customerRef = doc(firestore, 'customers', selectedCustomer.id);
                    const pointsPerUnit = business.settings.pointsPerUnit || 0;
                    const pointsEarned = Math.floor(total * pointsPerUnit);
                    const customerFromContext = customers?.find(c => c.id === selectedCustomer.id);
                    const currentPoints = customerFromContext?.loyaltyPoints || 0;
                    batch.update(customerRef, { loyaltyPoints: currentPoints + pointsEarned });
                }

                const receiptData = {
                    businessId: business.id,
                    receiptNumber: displayReceipt.receiptNumber,
                    items: itemsForReceipt,
                    customer: selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name, email: selectedCustomer.email } : null,
                    subtotal, tax, discount, total, totalCost, profit, paymentMethod,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                };
                batch.set(newReceiptRef, receiptData);

                await batch.commit();

                // Move navigation here to ensure document exists before we try to read it
                router.push(`/receipts/${newReceiptRef.id}`);
                resetPOS();

                if (navigator.onLine) {
                    toast({ variant: 'success', title: "Sale Complete!", description: `Receipt has been generated.` });
                } else {
                    toast({
                        variant: 'default',
                        title: "Sale Queued",
                        description: "You're offline. This sale is saved locally and will sync automatically.",
                        duration: 5000,
                    });
                }

                logAuditEvent(firestore, business.id, currentUserProfile, {
                    action: 'sale.create',
                    entity: { type: 'Receipt', id: newReceiptRef.id, name: `Receipt ${newReceiptRef.id.substring(0, 8)}` },
                    details: { total, itemCount: cart.length, customer: selectedCustomer?.name || 'Walk-in' }
                });

                // Use the memoized check from the component scope
                const plan = business.plan;
                const access = business.accessLevel;
                const isEmailAllowed = plan === 'business' || access === 'lifetime' || plan === 'pro';

                if (navigator.onLine && isEmailAllowed && shouldSendEmail && selectedCustomer?.email) {
                    const items_html = cart.map(item =>
                        `<tr>
                            <td style="padding: 5px;">${item.product.name} (x${item.quantity})</td>
                            <td style="padding: 5px; text-align: right;">${currencySymbol}${(item.product.price * item.quantity).toFixed(2)}</td>
                        </tr>`
                    ).join('');

                    sendReceiptEmail({
                        to_email: selectedCustomer.email,
                        to_name: selectedCustomer.name,
                        business_name: business.name,
                        receipt_id: newReceiptRef.id.substring(0, 8),
                        items_html,
                        currency_symbol: currencySymbol,
                        subtotal: subtotal.toFixed(2),
                        tax: tax.toFixed(2),
                        discount: discount.toFixed(2),
                        total: total.toFixed(2),
                    }).then(() => {
                        toast({ title: 'Email Sent', description: `Receipt sent to ${selectedCustomer.email}.` });
                    }).catch((emailError: any) => {
                        const errorMessage = emailError?.message || 'An unknown email error occurred.';
                        console.error("Email sending failed:", errorMessage);
                        toast({ variant: 'warning', title: 'Could Not Send Email', description: `Sale completed, but email failed. Reason: ${errorMessage}`, duration: 10000 });
                    });
                }

            } catch (error: any) {
                console.error("Sale completion failed:", error);
                toast({ variant: 'destructive', title: 'Sale Failed', description: error.message || 'The sale could not be completed. Please try again.', duration: 8000 });
                setIsCompleting(false); // Re-enable button on failure
            }
        })();
    }

    // FIX: Check plan status but also allow if it's not strictly 'business' for now to debug, 
    // or at least log why it's failing. 
    // For now, let's keep the logic but add logging.
    const canSendEmail = React.useMemo(() => {
        const plan = business?.plan;
        const access = business?.accessLevel;
        const allowed = plan === 'business' || access === 'lifetime' || plan === 'pro'; // Added 'pro' for testing if needed, or check your specific requirements.
        return allowed;
    }, [business]);

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-4 font-headline">Review Your Sale</h2>
                <ReceiptDetails ref={receiptContentRef} receipt={displayReceipt} business={business} currencySymbol={currencySymbol} />
            </div>
            <div>
                <div className="p-4 rounded-lg bg-card border space-y-4">
                    <h3 className="text-lg font-semibold">Ready to Complete?</h3>
                    <p className="text-sm text-muted-foreground">
                        This will finalize the sale, generate a receipt, and update your inventory. This action works offline.
                    </p>

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

                    <div className="flex flex-col gap-2 pt-2">
                        <Button size="lg" className="w-full" onClick={handleCompleteSale} disabled={isCompleting}>
                            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isCompleting ? 'Processing...' : 'Complete Sale'}
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
