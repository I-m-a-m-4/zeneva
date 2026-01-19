
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Zap, Loader2 } from 'lucide-react';
import type { UserProfile, BusinessInstance } from '@/types';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { add, format } from 'date-fns';
import { Badge } from '../ui/badge';
import { sendSubscriptionReceipt } from '@/lib/email';
import { useCallback } from 'react';
import usePaystack from '@/hooks/use-paystack';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

const plans = [
    {
        name: 'Pro',
        price: 10000,
        features: ['Up to 5 users', 'Unlimited Products', 'Point of Sale (POS)', 'Basic Sales Analytics'],
        planId: 'pro',
    },
    {
        name: 'Business',
        price: 30000,
        features: ['Unlimited users', 'Advanced Sales Analytics', 'AI-Powered Troubleshooting', 'Priority Support'],
        planId: 'business',
    }
];

// New self-contained button component using custom hook
const PaystackSubscriptionButton = ({ 
    plan, 
    userProfile, 
    businessInstance, 
    isCurrentPlan, 
    isProcessing, 
    setProcessingPlan 
}: { 
    plan: typeof plans[0], 
    userProfile: UserProfile, 
    businessInstance: BusinessInstance,
    isCurrentPlan: boolean,
    isProcessing: boolean,
    setProcessingPlan: (planId: string | null) => void;
}) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { initializePayment, isScriptLoaded } = usePaystack();

    const handleSuccessfulPayment = useCallback(async (transaction: { reference: string }) => {
        if (!firestore || !userProfile || !businessInstance) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session expired. Please refresh and try again.' });
            setProcessingPlan(null);
            return;
        }

        try {
            // Step 1: Verify payment on our backend
            toast({ title: "Processing...", description: "Verifying your payment securely." });
            const verifyResponse = await fetch('/api/paystack/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: transaction.reference }),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResponse.ok || verifyResult.status !== 'success') {
                throw new Error(verifyResult.message || 'Payment verification failed. Please contact support.');
            }

            // Step 2: Double-check amount on the backend response
            if (verifyResult.data.amount !== plan.price * 100) {
                // This is a critical security check
                throw new Error(`Paid amount does not match plan price. Please contact support.`);
            }

            // Step 3: Payment is fully verified. Update Firestore.
            const batch = writeBatch(firestore);
            const newExpiryDate = add(new Date(), { months: 1 });
            
            const businessDocRef = doc(firestore, 'businessInstances', businessInstance.id);
            batch.update(businessDocRef, {
                plan: plan.planId,
                trialExpiresAt: newExpiryDate,
                accessLevel: null, // Remove lifetime access if they subscribe
            });

            const purchasesRef = collection(firestore, 'purchases');
            const purchaseDocRef = doc(purchasesRef); // Auto-generate ID
            batch.set(purchaseDocRef, {
                userId: userProfile.id,
                businessId: businessInstance.id,
                plan: plan.name,
                amount: plan.price,
                currency: 'NGN',
                timestamp: serverTimestamp(),
                reference: transaction.reference,
            });

            const historyRef = collection(firestore, 'businessInstances', businessInstance.id, 'subscription_history');
            const historyDocRef = doc(historyRef); // Auto-generate ID
            batch.set(historyDocRef, {
                action: `Subscribed to ${plan.name} Plan`,
                amount: plan.price,
                currency: 'NGN',
                timestamp: serverTimestamp(),
            });

            await batch.commit();

            // Step 4: Send email receipt (best effort)
            try {
                await sendSubscriptionReceipt({
                    to_email: userProfile.email,
                    to_name: userProfile.name,
                    plan_name: plan.name,
                    amount_paid: `₦${plan.price.toLocaleString()}`,
                    expiry_date: format(newExpiryDate, 'PPP'),
                    business_name: businessInstance.name
                });
            } catch (emailError) {
                console.error("Failed to send receipt email:", emailError);
                toast({
                    variant: 'warning',
                    title: 'Could not send receipt',
                    description: 'Your subscription is active, but we failed to email the receipt.',
                });
            }

            toast({
                variant: 'success',
                title: 'Subscription Successful!',
                description: `You are now subscribed to the ${plan.name} plan.`,
            });
        } catch (error: any) {
            console.error("Payment processing error:", error);
            toast({ variant: 'destructive', title: 'Subscription Failed', description: error.message || 'An unexpected error occurred. Please contact support.' });
        } finally {
            setProcessingPlan(null);
        }
    }, [firestore, userProfile, businessInstance, plan, toast, setProcessingPlan]);
    
    const handlePaymentClick = () => {
        if (!isScriptLoaded) {
             toast({ title: "Payment gateway is loading...", description: "Please wait a moment and try again." });
             return;
        }
        if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY.includes('xxx')) {
            toast({
                title: "Gateway Not Configured",
                description: "The payment gateway has not been configured by the site administrator.",
                variant: "destructive",
            });
            return;
        }
        setProcessingPlan(plan.planId);

        initializePayment({
            key: PAYSTACK_PUBLIC_KEY,
            email: userProfile.email,
            amount: plan.price * 100,
            currency: 'NGN',
            reference: `z-${businessInstance.id.substring(0, 6)}-${Date.now()}`,
            onSuccess: handleSuccessfulPayment,
            onClose: () => {
                setProcessingPlan(null);
            },
        });
    };

    return (
        <Button
            onClick={handlePaymentClick}
            className="w-full"
            disabled={isProcessing || isCurrentPlan || !isScriptLoaded}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
            {isCurrentPlan ? 'Current Plan' : `Get Started with ${plan.name}`}
        </Button>
    )
}

// Main component that uses the button
export default function SubscriptionSection({ userProfile, businessInstance }: { userProfile: UserProfile; businessInstance: BusinessInstance; }) {
    const [processingPlan, setProcessingPlan] = React.useState<string | null>(null);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {plans.map((plan) => (
                <Card key={plan.name} className={`flex flex-col ${plan.planId === businessInstance.plan ? 'border-2 border-primary' : ''}`}>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            {plan.name}
                            {plan.planId === businessInstance.plan && <Badge variant="secondary">Current Plan</Badge>}
                        </CardTitle>
                        <CardDescription>
                            <span className="text-3xl font-bold">₦{plan.price.toLocaleString()}</span>
                            <span className="text-muted-foreground"> / month</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ul className="space-y-3 text-sm">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary"/>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <PaystackSubscriptionButton
                            plan={plan}
                            userProfile={userProfile}
                            businessInstance={businessInstance}
                            isCurrentPlan={plan.planId === businessInstance.plan}
                            isProcessing={processingPlan === plan.planId}
                            setProcessingPlan={setProcessingPlan}
                        />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
