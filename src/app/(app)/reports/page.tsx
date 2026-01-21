'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ReportsDashboard from '@/components/reports/reports-dashboard';
import ReportsTeaser from '@/components/reports/reports-teaser';

export default function ReportsPage() {
    const { business, isLoading } = usePOS();

    if (isLoading || !business) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Business Data...</span>
            </div>
        )
    }

    const canAccessReports = business.plan === 'pro' || business.plan === 'business' || business.accessLevel === 'lifetime';

    if (!canAccessReports) {
        return (
            <div className="relative">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/80 p-6 text-center backdrop-blur-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Zap className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">Upgrade to Unlock Full Reports</h3>
                    <p className="max-w-sm text-muted-foreground">
                        Gain deep insights into your sales, inventory, and customer behavior by upgrading your plan.
                    </p>
                    <Button asChild size="lg" className="mt-4">
                        <Link href="/billing">View Plans & Upgrade</Link>
                    </Button>
                </div>
                <div className="blur-sm grayscale pointer-events-none">
                    <ReportsTeaser />
                </div>
            </div>
        );
    }

    return <ReportsDashboard />;
}
