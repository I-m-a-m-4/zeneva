'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { BusinessInstance, SubscriptionHistory, UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, ShieldCheck, Gift } from 'lucide-react';
import TrialCountdown from '@/components/settings/trial-countdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, safeToDate } from '@/lib/utils';
import RefreshButton from '@/components/shared/refresh-button';
import { usePOS } from '@/context/pos-context';
import { useI18n } from '@/context/i18n-context';
import { BillingBodySkeleton } from './skeleton';
import ReferralBanner from '@/components/referrals/referral-banner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

const ReferralDashboard = dynamic(
    () => import('@/components/referrals/referral-dashboard'),
    {
        ssr: false,
        loading: () => (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading referral program...</p>
            </div>
        ),
    }
);

function BillingPageSkeleton() {
    return <BillingBodySkeleton />;
}

const LifetimeAccessStatus = () => {
    const { t } = useI18n();
    return (
        <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <div>
                <p className="text-lg font-semibold text-green-600">{t('billing.lifetimeAccess')}</p>
                <p className="text-xs text-muted-foreground">{t('billing.lifetimeAccessDesc')}</p>
            </div>
        </div>
    );
};

function BillingPageContent() {
  const { user, isUserLoading } = useUser();
  const { business: currentBusiness, currentUserProfile: userProfile, isLoading: isPosLoading, isImpersonating } = usePOS();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'referrals' ? 'referrals' : 'subscription';

  const handleTabChange = (newTab: string) => {
    if (newTab === 'referrals') {
      router.replace('/billing?tab=referrals', { scroll: false });
    } else {
      router.replace('/billing', { scroll: false });
    }
  };

  const subscriptionHistoryQuery = useMemoFirebase(() => {
    if (!currentBusiness?.id || !firestore) return null;
    return query(collection(firestore, 'businessInstances', currentBusiness.id, 'subscription_history'), orderBy('timestamp', 'desc'), limit(50));
  }, [currentBusiness?.id, firestore]);
  const { data: subscriptionHistory, isLoading: isHistoryLoading } = useCollection<SubscriptionHistory>(subscriptionHistoryQuery);
  
  const isLoading = isUserLoading || isPosLoading || isHistoryLoading;

  if (isLoading) {
    return <BillingPageSkeleton />;
  }
  
  if (!currentBusiness || !userProfile) {
    return <div className="p-8 text-center text-muted-foreground">{t('billing.profileNotFound')}</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <PageTitle title={t('billing.title')} subtitle={t('billing.subtitle')} />
        <div className="flex items-center gap-3 shrink-0">
          <TabsList className="bg-muted p-1 h-10 border border-border/40">
            <TabsTrigger value="subscription" className="gap-2 px-4 py-1.5 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2 px-4 py-1.5 text-xs font-semibold">
              <Gift className="h-4 w-4 text-amber-500" />
              <span>Refer & Earn</span>
              <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-bold">
                +30 Days Free
              </span>
            </TabsTrigger>
          </TabsList>
          <RefreshButton />
        </div>
      </div>

      {isImpersonating && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">{t('billing.impersonationTitle')}</p>
            <p className="text-xs opacity-80">{t('billing.impersonationBody')}</p>
          </div>
        </div>
      )}

      {/* Tab 1: Subscription & Plans */}
      <TabsContent value="subscription" className="space-y-6 mt-0">
        <ReferralBanner onSwitchTab={() => handleTabChange('referrals')} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{t('billing.sectionTitle')}</CardTitle>
              <CardDescription>{t('billing.sectionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('billing.currentStatus')}</p>
                    {currentBusiness.accessLevel === 'lifetime' ? (
                        <LifetimeAccessStatus />
                    ) : (
                        <TrialCountdown business={currentBusiness} />
                    )}
                </div>
                <SubscriptionSection userProfile={userProfile} businessInstance={currentBusiness} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />{t('billing.historyTitle')}</CardTitle>
                <CardDescription>{t('billing.historyDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-60">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('inventory.colAction')}</TableHead>
                                <TableHead>{t('billing.colAmount')}</TableHead>
                                <TableHead className="text-right">{t('common.date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptionHistory && subscriptionHistory.length > 0 ? (
                                subscriptionHistory
                                  .filter(item => !(item.amount === 0 && !item.action.includes('Admin Grant')))
                                  .map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.action}</TableCell>
                                        <TableCell>{item.currency === 'USD' ? '$' : '₦'}{item.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{item.timestamp ? format(safeToDate(item.timestamp), 'PPp') : t('inventory.notAvailable')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                        {t('billing.noHistory')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Referral Program */}
        <TabsContent value="referrals" className="space-y-6 mt-0">
          <ReferralDashboard />
        </TabsContent>
      </Tabs>
  );
}

export default function BillingPage() {
  return (
    <React.Suspense fallback={<BillingPageSkeleton />}>
      <BillingPageContent />
    </React.Suspense>
  );
}
