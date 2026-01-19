
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

const SubscriptionSection = dynamic(
    () => import('@/components/settings/subscription-section'),
    { 
        ssr: false,
        loading: () => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div className="flex flex-col justify-center items-center h-80 rounded-lg bg-muted border animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading Plans...</p>
                </div>
                <div className="flex flex-col justify-center items-center h-80 rounded-lg bg-muted border animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading Plans...</p>
                </div>
            </div>
        ),
    }
);

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
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const businessDocRef = useMemoFirebase(() => (userProfile ? doc(firestore, 'businessInstances', userProfile.businessId) : null), [userProfile, firestore]);
  const { data: currentBusiness, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);

  const subscriptionHistoryQuery = useMemoFirebase(() => {
    if (!currentBusiness?.id || !firestore) return null;
    return query(collection(firestore, 'businessInstances', currentBusiness.id, 'subscription_history'), orderBy('timestamp', 'desc'));
  }, [currentBusiness?.id, firestore]);
  const { data: subscriptionHistory, isLoading: isHistoryLoading } = useCollection<SubscriptionHistory>(subscriptionHistoryQuery);
  
  const isLoading = isUserLoading || isBusinessLoading || isHistoryLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading Billing Information...</span></div>;
  }
  
  if (!currentBusiness || !userProfile) {
    return <div className="text-center">Could not load business information.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Billing & Subscriptions" subtitle="Manage your plan, view payment history, and upgrade your account." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Subscription & Billing</CardTitle>
          <CardDescription>Manage your subscription plan and view billing history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm text-muted-foreground">Current Status</p>
                {currentBusiness.accessLevel === 'lifetime' ? (
                    <LifetimeAccessStatus />
                ) : (
                    <TrialCountdown expiryDate={currentBusiness.trialExpiresAt?.toDate() || null} />
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
                                    <TableCell className="text-right text-muted-foreground">{item.timestamp ? format(item.timestamp.toDate(), 'PPp') : 'N/A'}</TableCell>
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
