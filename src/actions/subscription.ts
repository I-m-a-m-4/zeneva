'use server';

import { verifyAndApplySubscription } from '@/lib/server/subscription-service';
import { requireUser } from './admin-guard';

export type UpgradeResult = { ok: true; plan: string; expiresAt: string } | { ok: false; error: string };

/**
 * Server-authoritative subscription upgrade.
 * Re-verifies payment reference against Paystack with the secret key,
 * applies the upgrade to Firestore, writes to purchases, and logs subscription history.
 */
export async function activateSubscription(params: {
  idToken?: string;
  reference: string;
  planId: string;
  cycleId: string;
  currency: 'NGN' | 'USD';
}): Promise<UpgradeResult> {
  const { idToken, reference, planId, cycleId, currency } = params;

  let uid: string | undefined;
  if (idToken) {
    try {
      uid = await requireUser(idToken);
    } catch {
      // If requireUser fails, subscription-service will still verify against Paystack metadata
    }
  }

  const result = await verifyAndApplySubscription({
    reference,
    planId,
    cycleId,
    currency,
    idToken,
    userId: uid,
    source: 'server-action',
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    plan: result.plan,
    expiresAt: result.expiresAt,
  };
}
