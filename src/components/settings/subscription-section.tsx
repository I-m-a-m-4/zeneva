

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Zap, Loader2, ShieldCheck } from 'lucide-react';
import type { UserProfile, BusinessInstance } from '@/types';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { add, format } from 'date-fns';
import { Badge } from '../ui/badge';
import { useCallback, useState } from 'react';
import usePaystack from '@/hooks/use-paystack';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

const plans = [
    {
        name: 'Pro',
        price: 10000,
        features: [
            'Up to 1,500 products & 10 users',
            'Advanced Point of Sale (POS)',
            'Customizable Public Storefront',
            'Advanced Reports & Analytics',
            'AI Product Data Troubleshooter',
            'Secure Audit Log',
        ],
        planId: 'pro',
    },
    {
        name: 'Business',
        price: 30000,
        features: [
            'Everything in Pro',
            'Unlimited products & users',
            'AI Business Performance Dashboard',
            'Advanced Customer Intelligence (CRM+)',
            'Inventory Velocity Reports (ABC Analysis)',
            'Automated Email Receipts',
            'Priority Phone & Email Support'
        ],
        planId: 'business',
    }
];

const billingCycles = [
    { id: '1m', months: 1, label: '1 month', discount: 0 },
    { id: '3m', months: 3, label: '3 months', discount: 5 }, // 5% off
    { id: '6m', months: 6, label: '6 months', discount: 10 }, // 10% off
    { id: '12m', months: 12, label: '1 year', discount: 15 }, // 15% off
];

// New self-contained button component using custom hook
const PaystackSubscriptionButton = ({ 
    plan, 
    cycle,
    finalAmount,
    userProfile, 
    businessInstance, 
    isCurrentPlan, 
    isProcessing, 
    setProcessingPlan 
}: { 
    plan: typeof plans[0], 
    cycle: typeof billingCycles[0],
    finalAmount: number,
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
            const verifyResponse = await fetch('https://zeneva.space/api/paystack/verify-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: transaction.reference }),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResponse.ok || verifyResult.status !== 'success') {
                throw new Error(verifyResult.message || 'Payment verification failed. Please contact support.');
            }

            // Step 2: Double-check amount on the backend response
            if (verifyResult.data.amount !== finalAmount * 100) {
                // This is a critical security check
                throw new Error(`Paid amount does not match plan price. Please contact support.`);
            }

            // Step 3: Payment is fully verified. Update Firestore.
            const batch = writeBatch(firestore);
            
            // If renewing, add time to the existing expiry. Otherwise, start from now.
            const currentExpiry = businessInstance.trialExpiresAt?.toDate() ?? new Date();
            const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
            const newExpiryDate = add(startDate, { months: cycle.months });
            
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
                amount: finalAmount,
                currency: 'NGN',
                timestamp: serverTimestamp(),
                reference: transaction.reference,
            });

            const historyRef = collection(firestore, 'businessInstances', businessInstance.id, 'subscription_history');
            const historyDocRef = doc(historyRef); // Auto-generate ID
            batch.set(historyDocRef, {
                action: `Subscribed to ${plan.name} Plan for ${cycle.label}`,
                amount: finalAmount,
                currency: 'NGN',
                timestamp: serverTimestamp(),
            });

            await batch.commit();

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
    }, [firestore, userProfile, businessInstance, plan, cycle, finalAmount, toast, setProcessingPlan]);
    
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
            amount: finalAmount * 100,
            currency: 'NGN',
            reference: `z-${businessInstance.id.substring(0, 6)}-${Date.now()}`,
            onSuccess: handleSuccessfulPayment,
            onClose: () => {
                setProcessingPlan(null);
            },
        });
    };

    const buttonText = isCurrentPlan ? 'Renew Subscription' : `Subscribe to ${plan.name}`;

    return (
        <Button
            onClick={handlePaymentClick}
            className="w-full"
            disabled={isProcessing || !isScriptLoaded}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
            {buttonText}
        </Button>
    )
}

// Main component that uses the button
export default function SubscriptionSection({ userProfile, businessInstance }: { userProfile: UserProfile; businessInstance: BusinessInstance; }) {
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [selectedCycles, setSelectedCycles] = useState({ pro: '1m', business: '1m' });

    const handleCycleChange = (planId: string, cycleId: string) => {
        setSelectedCycles(prev => ({ ...prev, [planId]: cycleId }));
    };

    if (businessInstance.accessLevel === 'lifetime') {
        return (
            <Card className="mt-6 border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg text-green-700">Lifetime Access Active</CardTitle>
                    </div>
                    <CardDescription>
                        Permanent access granted. No further payments required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-green-600/80">
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Unlimited products</div>
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Unlimited users</div>
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> AI Insights</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {plans.map((plan) => {
                const selectedCycleId = selectedCycles[plan.planId as keyof typeof selectedCycles];
                const selectedCycle = billingCycles.find(c => c.id === selectedCycleId)!;
                const finalAmount = plan.price * selectedCycle.months * (1 - selectedCycle.discount / 100);
                const isCurrentPlan = plan.planId === businessInstance.plan;

                return (
                    <Card key={plan.name} className={`flex flex-col ${isCurrentPlan ? 'border-2 border-primary' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                {plan.name}
                                {isCurrentPlan && <Badge variant="secondary">Current Plan</Badge>}
                            </CardTitle>
                            <CardDescription>
                                <span className="text-3xl font-bold">₦{plan.price.toLocaleString()}</span>
                                <span className="text-muted-foreground"> / month</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <h4 className="font-semibold mb-3">Plan Details:</h4>
                            <ul className="space-y-3 text-sm mb-6">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary"/>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <h4 className="font-semibold mb-3">Billing Cycle:</h4>
                            <RadioGroup 
                                defaultValue={selectedCycleId}
                                onValueChange={(value) => handleCycleChange(plan.planId, value)}
                            >
                                {billingCycles.map(cycle => {
                                    const cyclePrice = plan.price * cycle.months;
                                    const discountedPrice = cyclePrice * (1 - cycle.discount / 100);
                                    return (
                                        <Label 
                                            key={cycle.id}
                                            htmlFor={`${plan.planId}-${cycle.id}`}
                                            className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value={cycle.id} id={`${plan.planId}-${cycle.id}`} />
                                                <div>
                                                    <span className="font-medium">{cycle.label}</span>
                                                    {cycle.discount > 0 && (
                                                        <Badge variant="destructive" className="ml-2">Save {cycle.discount}%</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-semibold">₦{discountedPrice.toLocaleString()}</span>
                                        </Label>
                                    )
                                })}
                            </RadioGroup>
                        </CardContent>
                        <CardFooter>
                            <PaystackSubscriptionButton
                                plan={plan}
                                cycle={selectedCycle}
                                finalAmount={finalAmount}
                                userProfile={userProfile}
                                businessInstance={businessInstance}
                                isCurrentPlan={isCurrentPlan}
                                isProcessing={processingPlan === plan.planId}
                                setProcessingPlan={setProcessingPlan}
                            />
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );
}
