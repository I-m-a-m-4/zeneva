'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { useBusiness } from '@/context/pos-context';
import { Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ReportsDashboard from '@/components/reports/reports-dashboard';
import { ProductProvider } from '@/context/product-context';
import { POSProvider } from '@/context/pos-context';

export default function ReportsPage() {
    const business = useBusiness();

    if (!business) {
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
            <div className="flex flex-col gap-6">
                <PageTitle title="Reports" subtitle="Analyze your business performance with detailed reports." />
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Upgrade to Access Reports</CardTitle>
                        <CardDescription>
                            Gain deep insights into your sales, inventory, and customer behavior by upgrading your plan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12">
                        <Zap className="h-16 w-16 text-muted-foreground/50" />
                        <h3 className="mt-4 text-2xl font-semibold">Unlock Advanced Analytics</h3>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            The Reports Dashboard is a premium feature available on our Pro and Business plans.
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/billing">View Plans & Upgrade</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <POSProvider>
            <ProductProvider>
                <ReportsDashboard />
            </ProductProvider>
        </POSProvider>
    );
}
