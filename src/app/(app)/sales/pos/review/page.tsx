
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
import { collection, doc, runTransaction, serverTimestamp, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
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
    const { cart, selectedCustomer, subtotal, tax, discount, total, paymentMethod, currencySymbol, resetPOS, products, currentUserProfile } = usePOS();
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
        createdAt: new Date(),
    };


    const handleCompleteSale = async () => {
        if (!firestore || !business || !user || cart.length === 0 || !products || !currentUserProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot complete sale. Missing session data or empty cart.' });
            return;
        }
        setIsCompleting(true);
        
        const newReceiptRef = doc(collection(firestore, 'receipts'));

        try {
            await runTransaction(firestore, async (transaction) => {
                const productRefs = cart.map(item => doc(firestore, 'products', item.product.id));
                const readPromises: Promise<DocumentSnapshot>[] = productRefs.map(ref => transaction.get(ref));

                let customerRef: DocumentReference | null = null;
                if (selectedCustomer) {
                    customerRef = doc(firestore, 'customers', selectedCustomer.id);
                    readPromises.push(transaction.get(customerRef));
                }

                const allDocs = await Promise.all(readPromises);
                const productDocs = allDocs.slice(0, cart.length);
                const customerDoc = customerRef ? allDocs[allDocs.length - 1] : null;

                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const cartItem = cart[i];
                    if (!productDoc.exists() || (productDoc.data().stock || 0) < cartItem.quantity) {
                        throw new Error(`Not enough stock for ${cartItem.product.name}.`);
                    }
                }

                let totalCost = 0;
                const itemsForReceipt = cart.map(cartItem => {
                    const product = products.find(p => p.id === cartItem.product.id);
                    const costPrice = product?.costPrice || 0;
                    totalCost += costPrice * cartItem.quantity;
                    return { 
                        productId: cartItem.product.id, 
                        name: cartItem.product.name, 
                        quantity: cartItem.quantity, 
                        price: cartItem.product.price,
                        costPrice: costPrice,
                    };
                });
                const profit = total - totalCost;

                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const cartItem = cart[i];
                    const newStock = productDoc.data()!.stock - cartItem.quantity;
                    transaction.update(productDoc.ref, { stock: newStock });
                }

                if (customerDoc && customerDoc.exists() && business.settings?.loyaltyProgramEnabled) {
                    const pointsPerUnit = business.settings.pointsPerUnit || 0;
                    const pointsEarned = Math.floor(total * pointsPerUnit);
                    const currentPoints = customerDoc.data()?.loyaltyPoints || 0;
                    transaction.update(customerDoc.ref, { loyaltyPoints: currentPoints + pointsEarned });
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
                transaction.set(newReceiptRef, receiptData);
            });
            
            // Log audit event after successful transaction
            logAuditEvent(firestore, business.id, currentUserProfile, {
                action: 'sale.create',
                entity: { type: 'Receipt', id: newReceiptRef.id, name: `Receipt ${newReceiptRef.id.substring(0, 8)}` },
                details: { total, itemCount: cart.length, customer: selectedCustomer?.name || 'Walk-in' }
            });

            toast({ variant: 'success', title: "Sale Complete!", description: `Receipt has been generated.` });
            
            // Navigate immediately
            router.push(`/receipts/${newReceiptRef.id}`);
            resetPOS();

            // Send email in the background (fire-and-forget)
            const canSendEmail = (business.plan === 'business' || business.accessLevel === 'lifetime');

            if (canSendEmail && shouldSendEmail && selectedCustomer?.email) {
                const items_html = `
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Item</th>
                        <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cart.map(item => `
                        <tr>
                          <td style="padding: 8px;">
                            <div style="font-weight: 500;">${item.product.name}</div>
                            <div style="font-size: 12px; color: #666;">${item.quantity} x ${currencySymbol}${item.product.price.toFixed(2)}</div>
                          </td>
                          <td style="padding: 8px; text-align:right;">${currencySymbol}${(item.quantity * item.product.price).toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `;
                
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
            toast({ variant: 'destructive', title: 'Sale Failed', description: error.message || 'An unexpected error occurred.' });
            setIsCompleting(false);
        }
    }
    
    const canSendEmail = (business?.plan === 'business' || business?.accessLevel === 'lifetime');

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
                         This will finalize the sale, generate a receipt, and update your inventory.
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
