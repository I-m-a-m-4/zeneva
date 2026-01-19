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


export default function ReviewPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { cart, selectedCustomer, subtotal, tax, discount, total, paymentMethod, currencySymbol, resetPOS } = usePOS();
    const firestore = useFirestore();
    const business = useBusiness();
    const { user } = useUser();
    const [isCompleting, setIsCompleting] = React.useState(false);
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
            price: item.product.price
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
        if (!firestore || !business || !user || cart.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot complete sale. Missing session data or empty cart.' });
            return;
        }
        setIsCompleting(true);
        
        const newReceiptRef = doc(collection(firestore, 'receipts'));

        try {
            await runTransaction(firestore, async (transaction) => {
                // --- 1. ALL READS MUST GO FIRST ---
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

                // --- 2. VALIDATION ---
                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const cartItem = cart[i];
                    if (!productDoc.exists() || productDoc.data().stock < cartItem.quantity) {
                        throw new Error(`Not enough stock for ${cartItem.product.name}.`);
                    }
                }

                // --- 3. ALL WRITES MUST GO AFTER READS ---
                // 3a. Decrement stock for each product
                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const cartItem = cart[i];
                    const newStock = productDoc.data()!.stock - cartItem.quantity;
                    transaction.update(productDoc.ref, { stock: newStock });
                }

                // 3b. Update customer loyalty points if applicable
                if (customerDoc && customerDoc.exists() && business.settings?.loyaltyProgramEnabled) {
                    const pointsPerUnit = business.settings.pointsPerUnit || 0;
                    const pointsEarned = Math.floor(total * pointsPerUnit);
                    const currentPoints = customerDoc.data()?.loyaltyPoints || 0;
                    transaction.update(customerDoc.ref, { loyaltyPoints: currentPoints + pointsEarned });
                }

                // 3c. Create the receipt document
                const receiptData = {
                    businessId: business.id,
                    receiptNumber: displayReceipt.receiptNumber,
                    items: cart.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
                    customer: selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name, email: selectedCustomer.email } : null,
                    subtotal, tax, discount, total, paymentMethod,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                };
                transaction.set(newReceiptRef, receiptData);
            });
            
            toast({ variant: 'success', title: "Sale Complete!", description: `Receipt has been generated.` });
            resetPOS();
            router.push(`/receipts/${newReceiptRef.id}`);

        } catch (error: any) {
            console.error("Sale completion failed:", error);
            toast({ variant: 'destructive', title: 'Sale Failed', description: error.message || 'An unexpected error occurred.' });
            setIsCompleting(false);
        }
    }

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
                     <div className="flex flex-col gap-2">
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
