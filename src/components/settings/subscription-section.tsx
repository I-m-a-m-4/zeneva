

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import type { UserProfile, BusinessInstance } from '@/types';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { add, format } from 'date-fns';
import { Badge } from '../ui/badge';
import { safeToDate } from '@/lib/utils';
import { useCallback, useState } from 'react';
import usePaystack from '@/hooks/use-paystack';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import useDodoPayments from '@/hooks/use-dodopayments';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

const plans = [
    {
        name: 'Pro',
        price: 10000,
        priceUSD: 7,
        features: [
            'Up to 1,500 products & 5 staff accounts',
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
        priceUSD: 20,
        features: [
            'Everything in Pro',
            'Unlimited products & staff accounts',
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
    setProcessingPlan,
    currency
}: { 
    plan: typeof plans[0], 
    cycle: typeof billingCycles[0],
    finalAmount: number,
    userProfile: UserProfile, 
    businessInstance: BusinessInstance,
    isCurrentPlan: boolean,
    isProcessing: boolean,
    setProcessingPlan: (planId: string | null) => void;
    currency: 'NGN' | 'USD';
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

            // Step 2: Double-check amount and currency on the backend response
            if (verifyResult.data.amount !== Math.round(finalAmount * 100)) {
                throw new Error(`Paid amount does not match plan price. Please contact support.`);
            }

            if (verifyResult.data.currency !== currency) {
                throw new Error(`Transaction currency mismatch. Expected ${currency}, got ${verifyResult.data.currency}.`);
            }

            // Step 3: Payment is fully verified. Update Firestore.
            const batch = writeBatch(firestore);
            
            // If renewing, add time to the existing expiry. Otherwise, start from now.
            const currentExpiry = safeToDate(businessInstance.trialExpiresAt);
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
                currency: currency,
                timestamp: serverTimestamp(),
                reference: transaction.reference,
            });

            const historyRef = collection(firestore, 'businessInstances', businessInstance.id, 'subscription_history');
            const historyDocRef = doc(historyRef); // Auto-generate ID
            batch.set(historyDocRef, {
                action: `Subscribed to ${plan.name} Plan for ${cycle.label}`,
                amount: finalAmount,
                currency: currency,
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
    
    const handleSubscribe = useCallback(() => {
        if (!isScriptLoaded) {
            toast({ title: "Payment gateway is loading...", description: "Please wait a moment and try again." });
            return;
        }
        if (isProcessing) return;
        
        // Safety check for keys and email
        if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY.includes('your_public_key') || PAYSTACK_PUBLIC_KEY === 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'The payment system is not correctly configured. Please contact the administrator (Invalid Public Key).'
            });
            return;
        }

        if (!userProfile?.email) {
            toast({
                variant: 'destructive',
                title: 'User Profile Incomplete',
                description: 'We need your email address to process the payment. Please update your profile.'
            });
            return;
        }

        setProcessingPlan(plan.planId);
        
        initializePayment({
            key: PAYSTACK_PUBLIC_KEY,
            email: userProfile.email,
            amount: Math.round(finalAmount * 100), // Ensure it's an integer
            currency: currency,
            reference: `z-${businessInstance.id.substring(0, 6)}-${Date.now()}`,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Business ID",
                        variable_name: "business_id",
                        value: businessInstance.id
                    },
                    {
                        display_name: "Plan",
                        variable_name: "plan",
                        value: plan.name
                    }
                ]
            },
            onSuccess: (transaction: any) => {
                handleSuccessfulPayment(transaction);
            },
            onClose: () => {
                setProcessingPlan(null);
            },
        });
    }, [initializePayment, userProfile, businessInstance, plan, finalAmount, isProcessing, setProcessingPlan, handleSuccessfulPayment, toast]);

    const buttonText = isCurrentPlan ? 'Renew Subscription' : `Subscribe to ${plan.name}`;

    return (
        <Button
            onClick={handleSubscribe}
            className="w-full"
            disabled={isProcessing || !isScriptLoaded}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
            {buttonText}
        </Button>
    )
}

const DodoSubscriptionButton = ({ 
    plan, 
    cycle,
    userProfile, 
    businessInstance, 
    isCurrentPlan, 
    isProcessing, 
    setProcessingPlan
}: { 
    plan: typeof plans[0], 
    cycle: typeof billingCycles[0],
    userProfile: UserProfile, 
    businessInstance: BusinessInstance,
    isCurrentPlan: boolean,
    isProcessing: boolean,
    setProcessingPlan: (planId: string | null) => void;
}) => {
    const { toast } = useToast();
    const { initializeCheckout, isScriptLoaded } = useDodoPayments();

    const handleSubscribe = useCallback(async () => {
        if (!isScriptLoaded) {
            toast({ title: "Payment gateway is loading...", description: "Please wait a moment and try again." });
            return;
        }
        if (isProcessing) return;

        setProcessingPlan(plan.planId);

        try {
            const response = await fetch('/api/dodo/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan.planId,
                    email: userProfile.email,
                    businessId: businessInstance.id,
                    cycleMonths: cycle.months
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize checkout');
            }

            initializeCheckout(data.checkout_url);
        } catch (error: any) {
            console.error("Dodo initialization error:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Checkout Failed', 
                description: error.message || 'Could not connect to the payment server.' 
            });
        } finally {
            setProcessingPlan(null);
        }
    }, [isScriptLoaded, isProcessing, plan, userProfile, businessInstance, cycle, initializeCheckout, toast, setProcessingPlan]);

    const buttonText = isCurrentPlan ? 'Renew Subscription' : `Subscribe to ${plan.name}`;

    return (
        <Button
            onClick={handleSubscribe}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isProcessing || !isScriptLoaded}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {buttonText} (USD)
        </Button>
    )
}

// Main component that uses the button
export default function SubscriptionSection({ userProfile, businessInstance }: { userProfile: UserProfile; businessInstance: BusinessInstance; }) {
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [selectedCycles, setSelectedCycles] = useState({ pro: '1m', business: '1m' });
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');

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
        <div className="space-y-6 mt-6">
            {/* Currency Toggle */}
            <div className="flex justify-center border-b pb-6">
                <div className="inline-flex p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setCurrency('NGN')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                            currency === 'NGN'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Naira (₦)
                    </button>
                    <button
                        onClick={() => setCurrency('USD')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                            currency === 'USD'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        USD ($)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan) => {
                    const selectedCycleId = selectedCycles[plan.planId as keyof typeof selectedCycles];
                    const selectedCycle = billingCycles.find(c => c.id === selectedCycleId)!;
                    
                    const displayBasePrice = currency === 'NGN' ? plan.price : (plan as any).priceUSD;
                    const finalAmount = displayBasePrice * selectedCycle.months * (1 - selectedCycle.discount / 100);
                    
                    const isCurrentPlan = plan.planId === businessInstance.plan;

                    return (
                        <Card key={plan.name} className={`flex flex-col ${isCurrentPlan ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{plan.name}</CardTitle>
                                    {isCurrentPlan && <Badge variant="secondary" className="font-bold">Current Plan</Badge>}
                                </div>
                                <CardDescription>
                                    <span className="text-3xl font-bold text-foreground">
                                        {currency === 'NGN' ? '₦' : '$'}{displayBasePrice.toLocaleString()}
                                    </span>
                                    <span className="text-muted-foreground ml-1">/ month</span>
                                    {currency === 'USD' && (
                                        <div className="text-[10px] text-muted-foreground mt-1 uppercase">
                                            ≃ ₦{plan.price.toLocaleString()} Monthly
                                        </div>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <ul className="space-y-2">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="space-y-3 pt-4 border-t">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Billing Cycle</Label>
                                    <RadioGroup 
                                        defaultValue={selectedCycleId}
                                        onValueChange={(value) => handleCycleChange(plan.planId, value)}
                                        className="grid gap-2"
                                    >
                                        {billingCycles.map(cycle => {
                                            const cyclePriceNGN = plan.price * cycle.months;
                                            const discountedPriceNGN = cyclePriceNGN * (1 - cycle.discount / 100);
                                            const discountedPriceUSD = ((plan as any).priceUSD * cycle.months) * (1 - cycle.discount / 100);

                                            return (
                                                <Label 
                                                    key={cycle.id}
                                                    htmlFor={`${plan.planId}-${cycle.id}`}
                                                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                                                        selectedCycleId === cycle.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value={cycle.id} id={`${plan.planId}-${cycle.id}`} className="sr-only" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{cycle.label}</span>
                                                            {cycle.discount > 0 && <span className="text-[10px] text-green-600 font-bold">-{cycle.discount}% OFF</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold">
                                                            {currency === 'NGN' ? '₦' : '$'}{currency === 'NGN' ? discountedPriceNGN.toLocaleString() : discountedPriceUSD.toLocaleString()}
                                                        </span>
                                                        {currency === 'USD' && (
                                                            <div className="text-[9px] text-muted-foreground">
                                                                ≃ ₦{discountedPriceNGN.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Label>
                                            )
                                        })}
                                    </RadioGroup>
                                </div>
                            </CardContent>
                            <CardFooter>
                                {currency === 'NGN' ? (
                                    <PaystackSubscriptionButton
                                        plan={plan}
                                        cycle={selectedCycle}
                                        finalAmount={finalAmount}
                                        userProfile={userProfile}
                                        businessInstance={businessInstance}
                                        isCurrentPlan={isCurrentPlan}
                                        isProcessing={processingPlan === plan.planId}
                                        setProcessingPlan={setProcessingPlan}
                                        currency={currency}
                                    />
                                ) : (
                                    <DodoSubscriptionButton
                                        plan={plan}
                                        cycle={selectedCycle}
                                        userProfile={userProfile}
                                        businessInstance={businessInstance}
                                        isCurrentPlan={isCurrentPlan}
                                        isProcessing={processingPlan === plan.planId}
                                        setProcessingPlan={setProcessingPlan}
                                    />
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
