'use client';

/**
 * Buy Zen AI credits — the tenant-facing half of the credit unbundling.
 *
 * ## Why this is a separate component and not a third card in `subscription-section.tsx`
 *
 * Two reasons, both load-bearing:
 *
 * 1. **`SubscriptionSection` early-returns for `accessLevel === 'lifetime'`** and
 *    renders a "no further payments required" card instead of the plans. That is
 *    correct for a subscription and wrong for credits: a lifetime shop spends
 *    tokens like everybody else and must still be able to top up. A pack section
 *    nested inside that component would be invisible to exactly the accounts most
 *    likely to run a heavy AI workload.
 * 2. **The existing buttons take a `cycle`-shaped contract** — `{plan, cycle,
 *    finalAmount}` with a discount and a months multiplier — and a one-off pack has
 *    none of those. Threading a fake cycle through them to reuse the shell would put
 *    "1 month" and a renewal date on something that does not renew.
 *
 * So this is mounted beside the plans Card on `/billing`, with `id="ai-credits"` as
 * the link target for the chat page's exhausted-credits banner.
 *
 * ## The two rails
 *
 * Identical to subscriptions, because the currencies use different mechanisms
 * entirely and both had to be matched:
 *
 * - **NGN** — Paystack Inline here, then `purchaseAiCredits` verifies the reference
 *   with Paystack server-side and grants. The grant is *not* written from here:
 *   `aiBonusCredits` is in `entitlementFieldsLocked()`, so a client write is
 *   rejected by `firestore.rules`. That is deliberate — a client that can write its
 *   own balance is free AI forever.
 * - **USD** — a Dodo hosted checkout; the signed webhook grants. Nothing comes back
 *   to this component, so the balance appears when the webhook lands rather than
 *   when the popup closes.
 *
 * Neither rail is told the price. Both send a `packId` and the server re-derives
 * from `CREDIT_PACKS`.
 *
 * ## The balance shown here
 *
 * Mirrors `quoteFrom()` in `src/lib/server/ai-credits.ts`, the same way
 * `ai-insights/page.tsx` does — the allowance is spent first and the purchased
 * balance is the overflow, so a shop with 500 bought credits and an exhausted
 * allowance has 500 left, not zero. The server is what actually refuses a turn, so
 * if the arithmetic here and there ever diverge, this one is the bug.
 */

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { track } from '@vercel/analytics';
import { usePOS } from '@/context/pos-context';
import { getCountryFromIP } from '@/lib/utils';
import { apiBase } from '@/lib/platform';
import { aiMonthlyLimit, effectivePlan } from '@/lib/plan';
import usePaystack from '@/hooks/use-paystack';
import useDodoPayments from '@/hooks/use-dodopayments';
import {
    CREDIT_PACKS,
    packAmountMinor,
    packPrice,
    pricePerCredit,
    type CreditPack,
} from '@/lib/credit-packs';
import type { BusinessInstance, UserProfile } from '@/types';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

/** Price with its symbol. Dollars keep cents only when they have any — `$8`, `$2.50`. */
function formatPackPrice(pack: CreditPack, currency: 'NGN' | 'USD'): string {
    const amount = packPrice(pack, currency);
    if (currency === 'USD') {
        return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
    }
    return `₦${amount.toLocaleString()}`;
}

/** "₦8 per credit". Three significant places on dollars, whole naira otherwise. */
function formatPerCredit(pack: CreditPack, currency: 'NGN' | 'USD'): string {
    const each = pricePerCredit(pack, currency);
    return currency === 'USD'
        ? `$${each.toFixed(3).replace(/0$/, '')} per credit`
        : `₦${Math.round(each).toLocaleString()} per credit`;
}

// ---------------------------------------------------------------------------
// NGN rail
// ---------------------------------------------------------------------------

const PaystackCreditPackButton = ({
    pack,
    currency,
    userProfile,
    businessInstance,
    isProcessing,
    setProcessingPack,
}: {
    pack: CreditPack;
    currency: 'NGN' | 'USD';
    userProfile: UserProfile;
    businessInstance: BusinessInstance;
    isProcessing: boolean;
    setProcessingPack: (packId: string | null) => void;
}) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { initializePayment, isScriptLoaded } = usePaystack();
    const { isImpersonating } = usePOS();

    const handleSuccessfulPayment = useCallback(async (transaction: { reference: string }) => {
        try {
            toast({ title: 'Processing...', description: 'Verifying your payment securely.' });

            // The grant happens on the server. This client cannot write
            // `aiBonusCredits` — the field is rule-locked — and it is not trusted
            // with the price either: it sends the pack id and nothing else.
            const { purchaseAiCredits } = await import('@/actions/ai-credits');
            const { idToken } = await import('@/lib/id-token');

            const result = await purchaseAiCredits({
                idToken: await idToken(),
                reference: transaction.reference,
                packId: pack.id,
                currency,
            });

            if (!result.ok) throw new Error(result.error);

            try {
                track('credits_purchase_success', {
                    packId: pack.id,
                    credits: pack.credits,
                    amount: packPrice(pack, currency),
                    currency,
                    gateway: 'Paystack',
                    businessId: businessInstance.id,
                });
            } catch (trackErr) {
                console.warn('Failed to track credit purchase success:', trackErr);
            }

            toast({
                variant: 'success',
                title: `${result.credits.toLocaleString()} credits added`,
                description: `Your Zen AI balance is now ${result.newBalance.toLocaleString()} credits. They do not expire.`,
            });
        } catch (error: any) {
            console.error('Credit purchase error:', error);
            /*
             * The charge has already succeeded at this point — only the grant
             * failed — so this must not read like a failed payment, or the shop
             * disputes a charge that went through. The reference is the thread to
             * pull on, so it is in the message.
             */
            toast({
                variant: 'destructive',
                title: 'Payment taken, credits not yet added',
                description: `${error.message || 'Something went wrong applying your credits.'} Please contact support with reference ${transaction.reference}.`,
                duration: 20000,
            });
        } finally {
            setProcessingPack(null);
        }
    }, [pack, currency, businessInstance, toast, setProcessingPack]);

    const handleBuy = useCallback(() => {
        if (isImpersonating) {
            toast({
                variant: 'destructive',
                title: 'Action blocked during impersonation',
                description: 'You cannot buy credits on behalf of a user. Stop impersonating first.',
            });
            return;
        }
        if (!isScriptLoaded) {
            toast({ title: 'Payment gateway is loading...', description: 'Please wait a moment and try again.' });
            return;
        }
        if (isProcessing) return;

        if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY.includes('your_public_key')) {
            toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'The payment system is not correctly configured. Please contact the administrator (Invalid Public Key).',
            });
            return;
        }

        if (!userProfile?.email) {
            toast({
                variant: 'destructive',
                title: 'User Profile Incomplete',
                description: 'We need your email address to process the payment. Please update your profile.',
            });
            return;
        }

        setProcessingPack(pack.id);

        try {
            track('credits_checkout_initiated', {
                packId: pack.id,
                credits: pack.credits,
                amount: packPrice(pack, currency),
                currency,
                gateway: 'Paystack',
                businessId: businessInstance.id,
            });
        } catch (trackErr) {
            console.warn('Failed to track credit checkout start:', trackErr);
        }

        /*
         * Logged before the popup opens, and `kind: 'credits'` is on it.
         *
         * This is the only record of an abandoned purchase — the NGN rail has no
         * webhook, so if the browser dies between paying and the action running,
         * this row plus the reference is what a manual "restore my purchase" would
         * work from. Same known gap as subscriptions.
         */
        try {
            addDoc(collection(firestore, 'checkout_attempts'), {
                userId: userProfile.id,
                userEmail: userProfile.email || '',
                userName: userProfile.name || '',
                businessId: businessInstance.id,
                businessName: businessInstance.name || '',
                kind: 'credits',
                packId: pack.id,
                credits: pack.credits,
                plan: `${pack.credits.toLocaleString()} AI credits`,
                amount: packPrice(pack, currency),
                currency,
                gateway: 'Paystack',
                timestamp: serverTimestamp(),
                status: 'initiated',
            });
        } catch (dbErr) {
            console.error('Failed to log credit checkout attempt to Firestore:', dbErr);
        }

        initializePayment({
            key: PAYSTACK_PUBLIC_KEY,
            email: userProfile.email,
            // From the pack table, in minor units. The server re-derives the same
            // figure and refuses anything short of it.
            amount: packAmountMinor(pack, currency),
            currency,
            // `zc-` rather than `z-`: a credit reference is distinguishable from a
            // subscription one at a glance in the Paystack dashboard, and the
            // replay guard queries `purchases` by this exact string.
            reference: `zc-${businessInstance.id.substring(0, 6)}-${Date.now()}`,
            metadata: {
                custom_fields: [
                    { display_name: 'Business ID', variable_name: 'business_id', value: businessInstance.id },
                    { display_name: 'Purchase', variable_name: 'purchase', value: `${pack.credits} Zen AI credits` },
                ],
            },
            onSuccess: (transaction: any) => {
                handleSuccessfulPayment(transaction);
            },
            onClose: () => {
                setProcessingPack(null);
            },
        });
    }, [initializePayment, isScriptLoaded, isProcessing, isImpersonating, pack, currency, userProfile, businessInstance, firestore, setProcessingPack, handleSuccessfulPayment, toast]);

    return (
        <Button onClick={handleBuy} className="w-full" disabled={isProcessing || !isScriptLoaded}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Buy {pack.credits.toLocaleString()} credits
        </Button>
    );
};

// ---------------------------------------------------------------------------
// USD rail
// ---------------------------------------------------------------------------

const DodoCreditPackButton = ({
    pack,
    userProfile,
    businessInstance,
    isProcessing,
    setProcessingPack,
}: {
    pack: CreditPack;
    userProfile: UserProfile;
    businessInstance: BusinessInstance;
    isProcessing: boolean;
    setProcessingPack: (packId: string | null) => void;
}) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { initializeCheckout, isScriptLoaded } = useDodoPayments();
    const { isImpersonating } = usePOS();

    const handleBuy = useCallback(async () => {
        if (isImpersonating) {
            toast({
                variant: 'destructive',
                title: 'Action blocked during impersonation',
                description: 'You cannot buy credits on behalf of a user. Stop impersonating first.',
            });
            return;
        }
        if (!isScriptLoaded) {
            toast({ title: 'Payment gateway is loading...', description: 'Please wait a moment and try again.' });
            return;
        }
        if (isProcessing) return;

        setProcessingPack(pack.id);

        try {
            track('credits_checkout_initiated', {
                packId: pack.id,
                credits: pack.credits,
                amount: pack.usd,
                currency: 'USD',
                gateway: 'Dodo',
                businessId: businessInstance.id,
            });
        } catch (trackErr) {
            console.warn('Failed to track credit checkout start:', trackErr);
        }

        try {
            addDoc(collection(firestore, 'checkout_attempts'), {
                userId: userProfile.id,
                userEmail: userProfile.email || '',
                userName: userProfile.name || '',
                businessId: businessInstance.id,
                businessName: businessInstance.name || '',
                kind: 'credits',
                packId: pack.id,
                credits: pack.credits,
                plan: `${pack.credits.toLocaleString()} AI credits`,
                amount: pack.usd,
                currency: 'USD',
                gateway: 'Dodo',
                timestamp: serverTimestamp(),
                status: 'initiated',
            });
        } catch (dbErr) {
            console.error('Failed to log credit checkout attempt to Firestore:', dbErr);
        }

        try {
            // `packId` and no `planId` — the checkout route branches on it and puts
            // `metadata.kind = 'credits'` on the session, which is what the webhook
            // needs to grant credits instead of falling through the plan gate.
            const response = await fetch(`${apiBase()}/api/dodo/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packId: pack.id,
                    email: userProfile.email,
                    businessId: businessInstance.id,
                }),
            });

            // Text-then-parse, as in `subscription-section.tsx`: an infrastructure
            // failure answers with HTML, and `response.json()` would report it as
            // "Unexpected token '<'" — a parse error for what is really a missing
            // or unreachable route.
            const raw = await response.text();
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                console.error('Dodo credit checkout returned non-JSON:', response.status, raw.slice(0, 500));
                throw new Error(
                    response.status === 404
                        ? 'The payment service is unavailable (404). Please contact support.'
                        : `The payment service returned an unexpected response (HTTP ${response.status}).`,
                );
            }

            if (!response.ok) {
                throw new Error(data?.error || `Failed to initialize checkout (HTTP ${response.status})`);
            }
            if (!data?.checkout_url) {
                throw new Error('No checkout link was returned. Please try again.');
            }

            initializeCheckout(data.checkout_url);
        } catch (error: any) {
            console.error('Dodo credit checkout error:', error);
            toast({
                variant: 'destructive',
                title: 'Checkout Failed',
                description: error.message || 'Could not connect to the payment server.',
            });
        } finally {
            setProcessingPack(null);
        }
    }, [initializeCheckout, isScriptLoaded, isProcessing, isImpersonating, pack, userProfile, businessInstance, firestore, setProcessingPack, toast]);

    return (
        <Button onClick={handleBuy} className="w-full" disabled={isProcessing || !isScriptLoaded}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Buy {pack.credits.toLocaleString()} credits (USD)
        </Button>
    );
};

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

export default function AiCreditsSection({
    userProfile,
    businessInstance,
}: {
    userProfile: UserProfile;
    businessInstance: BusinessInstance;
}) {
    const [processingPack, setProcessingPack] = useState<string | null>(null);
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('USD');
    const [highlight, setHighlight] = useState(false);

    useEffect(() => {
        getCountryFromIP().then((country) => {
            setCurrency(country === 'Nigeria' ? 'NGN' : 'USD');
        });
    }, []);

    /*
     * `?topup=1` — what the chat page's exhausted-credits banner links to, so a shop
     * that arrived from a dead-ended prompt lands on something visibly for them
     * rather than on a page of plans they did not ask about.
     *
     * Read off `window.location` rather than through `useSearchParams()`: that hook
     * forces the whole route into a Suspense boundary at build time, and this
     * component is already `ssr: false`, so there is no server render to read it on.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('topup') !== '1') return;
        setHighlight(true);
        // Only after paint, or the anchor is not in the document yet.
        const id = window.setTimeout(() => {
            document.getElementById('ai-credits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => window.clearTimeout(id);
    }, []);

    /*
     * The same arithmetic as `quoteFrom()` on the server and the pill on
     * `/ai-insights`. `aiUsageCount` only counts if it belongs to the current month
     * — the field is not reset on the 1st, it is *stamped* with `YYYY-MM` and read
     * as zero once that stamp goes stale, so a stale count must not be shown as
     * this month's usage.
     */
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const plan = effectivePlan(businessInstance);
    const monthlyLimit = aiMonthlyLimit(businessInstance);
    const used = businessInstance.aiUsageCurrentDate === currentMonthStr
        ? Math.max(0, Number(businessInstance.aiUsageCount) || 0)
        : 0;
    const bonus = Math.max(0, Number(businessInstance.aiBonusCredits) || 0);
    const allowanceLeft = Math.max(0, monthlyLimit - used);
    const creditsLeft = allowanceLeft + bonus;
    const allowancePct = monthlyLimit > 0 ? Math.min(100, Math.round((used / monthlyLimit) * 100)) : 0;

    return (
        <Card
            id="ai-credits"
            className={`scroll-mt-24 transition-shadow ${highlight ? 'border-primary ring-2 ring-primary/30' : ''}`}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Zen AI Credits
                </CardTitle>
                <CardDescription>
                    Your plan includes a monthly allowance. Buy credits when you need more — they are
                    a one-off purchase, not a subscription, and they never expire.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Balance */}
                <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Credits available now
                            </p>
                            <p className="text-3xl font-bold">{creditsLeft.toLocaleString()}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                            <p>
                                <span className="font-medium text-foreground">{allowanceLeft.toLocaleString()}</span>{' '}
                                left of your {monthlyLimit.toLocaleString()}/month{' '}
                                <span className="capitalize">{plan}</span> allowance
                            </p>
                            <p>
                                <span className="font-medium text-foreground">{bonus.toLocaleString()}</span>{' '}
                                purchased {bonus === 1 ? 'credit' : 'credits'} in reserve
                            </p>
                        </div>
                    </div>

                    <Progress value={allowancePct} className="mt-3 h-2" />

                    {/*
                      * Spelling out the order matters. A shop that buys 1,000 credits
                      * and watches its allowance keep draining will otherwise think
                      * the purchase did nothing.
                      */}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                        This month&apos;s allowance is spent first. Purchased credits are used only after it
                        runs out, and they roll over month to month.
                    </p>
                </div>

                {/* What a credit is */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> A simple question costs 1 credit</span>
                    <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Big jobs — theft scans, bulk AI edits, reading a photo — cost more</span>
                    <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> A failed request is never charged</span>
                </div>

                {/* Currency */}
                <div className="flex justify-center border-b pb-6">
                    <div className="inline-flex rounded-lg bg-muted p-1">
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                                currency === 'USD'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            USD ($)
                        </button>
                        <button
                            onClick={() => setCurrency('NGN')}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                                currency === 'NGN'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Naira (₦)
                        </button>
                    </div>
                </div>

                {/* Packs */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {CREDIT_PACKS.map((pack) => {
                        const isProcessing = processingPack === pack.id;
                        return (
                            <Card
                                key={pack.id}
                                className={`flex flex-col ${pack.featured ? 'border-primary ring-1 ring-primary/20' : ''}`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">{pack.label}</CardTitle>
                                        {pack.featured && <Badge variant="secondary" className="shrink-0">Popular</Badge>}
                                    </div>
                                    <CardDescription className="text-xs">{pack.blurb}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-1 pb-4">
                                    <p className="text-2xl font-bold">{formatPackPrice(pack, currency)}</p>
                                    <p className="text-sm font-medium">{pack.credits.toLocaleString()} credits</p>
                                    <p className="text-xs text-muted-foreground">{formatPerCredit(pack, currency)}</p>
                                </CardContent>
                                <CardFooter>
                                    {/*
                                      * One rail or the other, never both — matching the
                                      * footer of the plans section. Paystack takes naira,
                                      * Dodo takes dollars, and offering a shop a button
                                      * its gateway cannot settle is a failed payment.
                                      */}
                                    {currency === 'NGN' ? (
                                        <PaystackCreditPackButton
                                            pack={pack}
                                            currency={currency}
                                            userProfile={userProfile}
                                            businessInstance={businessInstance}
                                            isProcessing={isProcessing}
                                            setProcessingPack={setProcessingPack}
                                        />
                                    ) : (
                                        <DodoCreditPackButton
                                            pack={pack}
                                            userProfile={userProfile}
                                            businessInstance={businessInstance}
                                            isProcessing={isProcessing}
                                            setProcessingPack={setProcessingPack}
                                        />
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                    Need a bigger monthly allowance instead? Upgrading your plan raises it every month,
                    while credits are a one-off top-up.
                </p>
            </CardContent>
        </Card>
    );
}
