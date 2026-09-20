'use client';

import * as React from 'react';
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
} from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { withFirestoreRetry } from '@/firebase/retry';
import type { BusinessInstance, UserProfile } from '@/types';
import FollowUpCenter from '@/components/admin/follow-up-center';
import { scoreBusiness, type ScoredBusiness } from '@/lib/outreach-scoring';

const LOG_LIMIT = 300;

export default function OutreachPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading Strategic Outreach...
        </div>
      }
    >
      <StrategicOutreachConsole />
    </React.Suspense>
  );
}

function StrategicOutreachConsole() {
  const firestore = useFirestore();

  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [businesses, setBusinesses] = React.useState<BusinessInstance[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [sentCount, setSentCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [outreachLoading, setOutreachLoading] = React.useState(false);

  const loadBaseData = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const [userSnap, businessSnap] = await Promise.all([
        withFirestoreRetry(() => getDocs(collection(firestore, 'users')), {
          label: 'Email marketing audience',
        }),
        withFirestoreRetry(() => getDocs(collection(firestore, 'businessInstances')), {
          label: 'Email marketing businesses',
        }),
      ]);
      setUsers(userSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setBusinesses(businessSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (error: any) {
      console.error('Failed to load audience', error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  const loadLogs = React.useCallback(async (isRefresh = false) => {
    if (!firestore) return;
    if (isRefresh) setOutreachLoading(true);
    try {
      const snap = await withFirestoreRetry(
        () =>
          getDocs(
            query(
              collection(firestore, 'follow_up_logs'),
              orderBy('sentAt', 'desc'),
              fsLimit(LOG_LIMIT),
            ),
          ),
        { label: 'Campaign results' },
      );
      const fetchedLogs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setLogs(fetchedLogs);
      setSentCount(fetchedLogs.length);
    } catch (error) {
      console.error('Failed to load campaign logs', error);
    } finally {
      if (isRefresh) setOutreachLoading(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const scoredLeads = React.useMemo(() => {
    if (!businesses.length || !users.length) return [];
    const now = Date.now();
    return businesses
      .map(bus => {
        const busUsers = users.filter(u => u.businessId === bus.id);
        return scoreBusiness(bus as any, busUsers as any, now);
      })
      .sort((a, b) => b.score - a.score);
  }, [businesses, users]);

  const atRiskBusinesses = React.useMemo(() => {
    return businesses.filter(bus => {
      const busUsers = users.filter(u => u.businessId === bus.id);
      let lastSeen: number | null = null;
      for (const u of busUsers) {
        if (u.lastSeen) {
          const date = typeof u.lastSeen?.toDate === 'function' ? u.lastSeen.toDate() : new Date(u.lastSeen);
          if (!lastSeen || date.getTime() > lastSeen) {
            lastSeen = date.getTime();
          }
        }
      }
      if (!lastSeen) return false;
      const daysSince = Math.floor((Date.now() - lastSeen) / (1000 * 60 * 60 * 24));
      return daysSince > 14;
    });
  }, [businesses, users]);

  return (
    <div className="flex min-w-0 flex-col gap-6 p-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Strategic Outreach</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Target your merchants with data-driven follow-ups to increase retention and conversions.
        </p>
      </div>

      <FollowUpCenter 
        atRiskBusinesses={atRiskBusinesses}
        scoredLeads={scoredLeads}
        users={users}
        conversionRate={0}
        churnRiskCount={atRiskBusinesses.length}
        cachedLogs={logs}
        cachedSentCount={sentCount}
        isLoading={isLoading || outreachLoading}
        onRefresh={() => loadLogs(true)}
        onMount={loadLogs}
      />
    </div>
  );
}
