

'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { BusinessInstance, SubscriptionHistory, UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, ShieldCheck } from 'lucide-react';
import TrialCountdown from '@/components/settings/trial-countdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, safeToDate } from '@/lib/utils';
import RefreshButton from '@/components/shared/refresh-button';
import { usePOS } from '@/context/pos-context';

const SubscriptionSection = dynamic(
    () => import('@/components/settings/subscription-section'),
    { 
        ssr: false,
        loading: () => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <Card className="h-96"><CardContent className="p-6 h-full flex flex-col justify-between"><div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-1/3" /></div><div className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div><Skeleton className="h-12 w-full" /></CardContent></Card>
                <Card className="h-96"><CardContent className="p-6 h-full flex flex-col justify-between"><div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-1/3" /></div><div className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div><Skeleton className="h-12 w-full" /></CardContent></Card>
            </div>
        ),
    }
);

function BillingPageSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <Skeleton className="h-96" />
                        <Skeleton className="h-96" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

const LifetimeAccessStatus = () => (
    <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-green-600" />
        <div>
            <p className="text-lg font-semibold text-green-600">Lifetime Access</p>
            <p className="text-xs text-muted-foreground">You have permanent access to all features.</p>
        </div>
    </div>
);




function BillingPage() {
  const { user, isUserLoading } = useUser();
  const { business: currentBusiness, currentUserProfile: userProfile, isLoading: isPosLoading } = usePOS();
  const firestore = useFirestore();

  const subscriptionHistoryQuery = useMemoFirebase(() => {
    if (!currentBusiness?.id || !firestore) return null;
    return query(collection(firestore, 'businessInstances', currentBusiness.id, 'subscription_history'), orderBy('timestamp', 'desc'));
  }, [currentBusiness?.id, firestore]);
  const { data: subscriptionHistory, isLoading: isHistoryLoading } = useCollection<SubscriptionHistory>(subscriptionHistoryQuery);
  
  const isLoading = isUserLoading || isPosLoading || isHistoryLoading;

  if (isLoading) {
    return <BillingPageSkeleton />;
  }
  
  if (!currentBusiness || !userProfile) {
    return <div className="p-8 text-center text-muted-foreground">Business profile not found. Please refresh or contact support.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageTitle title="Billing & Subscriptions" subtitle="Manage your plan, view payment history, and upgrade your account." />
        <RefreshButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Subscription & Billing</CardTitle>
          <CardDescription>Manage your subscription plan and view billing history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Current Status</p>
                {currentBusiness.accessLevel === 'lifetime' ? (
                    <LifetimeAccessStatus />
                ) : (
                    <TrialCountdown expiryDate={currentBusiness.trialExpiresAt ? safeToDate(currentBusiness.trialExpiresAt) : null} />
                )}
                
            </div>
            <SubscriptionSection userProfile={userProfile} businessInstance={currentBusiness} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Subscription History</CardTitle>
            <CardDescription>A log of your recent subscription payments.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-60">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptionHistory && subscriptionHistory.length > 0 ? (
                            subscriptionHistory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.action}</TableCell>
                                    <TableCell>₦{item.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{item.timestamp ? format(safeToDate(item.timestamp), 'PPp') : 'N/A'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    No subscription history found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingPage;
