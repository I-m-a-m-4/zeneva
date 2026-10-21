
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { isPaidPlan, isPaidPlanExpired, effectivePlan, isTrialExpired, getTrialDaysRemaining } from '@/lib/plan';

interface TrialCountdownProps {
  /** The business whose billing status is being shown. */
  business?: any;
  /** Legacy prop kept so existing callers keep compiling. */
  expiryDate?: Date | null;
}

/**
 * Billing status for the current plan.
 *
 * Shows:
 * - Paid plan counting down to renewal
 * - Paid plan that has lapsed (Read-Only Mode)
 * - 30-day trial countdown
 * - 30-day trial ended (Read-Only Mode)
 */
const TrialCountdown: React.FC<TrialCountdownProps> = ({ business, expiryDate }) => {
    const paid = isPaidPlan(business);
    const lapsed = isPaidPlanExpired(business);
    const plan = effectivePlan(business);
    const trialExpired = isTrialExpired(business);
    const trialDays = getTrialDaysRemaining(business);

    const renewalDate = React.useMemo(() => {
        if (business?.trialExpiresAt) return safeToDate(business.trialExpiresAt);
        return expiryDate ?? null;
    }, [business, expiryDate]);

    const [timeLeft, setTimeLeft] = useState<{
        days: number; hours: number; minutes: number; seconds: number;
    } | null>(null);

    useEffect(() => {
        // Only a live paid subscription has anything to count down to.
        if (!paid || lapsed || !renewalDate) {
            setTimeLeft(null);
            return;
        }

        const calculate = () => {
            const distance = renewalDate.getTime() - Date.now();
            if (distance < 0) return null;
            return {
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            };
        };

        setTimeLeft(calculate());
        const id = setInterval(() => {
            const next = calculate();
            if (next === null) clearInterval(id);
            setTimeLeft(next);
        }, 1000);

        return () => clearInterval(id);
    }, [paid, lapsed, renewalDate]);

    // A paid subscription that has run out.
    if (lapsed) {
        return (
            <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-amber-500" />
                <div>
                    <p className="text-lg font-semibold text-amber-600">Subscription ended — Read-Only Mode</p>
                    <p className="text-xs text-muted-foreground">
                        Your products and sales history are safely preserved. Renew to resume recording sales and managing stock.
                    </p>
                </div>
            </div>
        );
    }

    // Free trial that has finished.
    if (!paid && trialExpired) {
        return (
            <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-amber-500" />
                <div>
                    <p className="text-lg font-semibold text-amber-600">30-Day Free Trial Ended — Read-Only Mode</p>
                    <p className="text-xs text-muted-foreground">
                        Your products, receipts, and customers are safely preserved. Upgrade to Pro or Business to record sales and make changes.
                    </p>
                </div>
            </div>
        );
    }

    // Active 30-day trial.
    if (!paid) {
        return (
            <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                    <p className="text-lg font-semibold text-orange-600">30-Day Free Trial — {trialDays} {trialDays === 1 ? 'day' : 'days'} remaining</p>
                    <p className="text-xs text-muted-foreground">
                        Full sales and register access enabled. Upgrade anytime to continue trading without interruption.
                    </p>
                </div>
            </div>
        );
    }

    // Live paid subscription.
    return (
        <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
            <div>
                <p className="text-lg font-semibold text-primary capitalize">
                    {timeLeft
                        ? `${plan} · ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s remaining`
                        : `${plan} plan active`}
                </p>
                {renewalDate && (
                    <p className="text-xs text-muted-foreground">
                        Renews on {format(renewalDate, 'PPp')}.
                    </p>
                )}
            </div>
        </div>
    );
};

export default TrialCountdown;
