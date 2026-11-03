import { adminFirestore, adminAuth } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { notifyAdminsOfSubscription } from './notifications';

export type SubscriptionVerificationParams = {
  reference: string;
  planId?: string;
  cycleId?: string;
  currency?: 'NGN' | 'USD' | string;
  idToken?: string;
  userId?: string;
  businessId?: string;
  source?: string;
};

export type SubscriptionVerificationResult =
  | { ok: true; plan: string; expiresAt: string; businessId: string; alreadyProcessed?: boolean }
  | { ok: false; error: string; needsAdminIntervention?: boolean };

const PRICES: Record<string, { ngn: number; usd: number }> = {
  pro: { ngn: 10000, usd: 10 },
  business: { ngn: 30000, usd: 30 },
};

const CYCLES: Record<string, { months: number; discount: number }> = {
  '1m': { months: 1, discount: 0 },
  '3m': { months: 3, discount: 5 },
  '6m': { months: 6, discount: 10 },
  '12m': { months: 12, discount: 15 },
};

export async function verifyAndApplySubscription(
  params: SubscriptionVerificationParams
): Promise<SubscriptionVerificationResult> {
  const { reference, source = 'direct' } = params;

  if (!adminFirestore) {
    return { ok: false, error: 'Server database not configured.' };
  }
  if (!reference || typeof reference !== 'string') {
    return { ok: false, error: 'Missing or invalid payment reference.' };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes('xxx')) {
    return { ok: false, error: 'Paystack Secret Key is not configured on the server.' };
  }

  // Check if reference is already recorded in purchases
  const existingPurchase = await adminFirestore
    .collection('purchases')
    .where('reference', '==', reference)
    .limit(1)
    .get();

  if (!existingPurchase.empty) {
    const pData = existingPurchase.docs[0].data();
    return {
      ok: true,
      plan: pData.plan || 'pro',
      expiresAt: pData.expiresAt || new Date().toISOString(),
      businessId: pData.businessId || '',
      alreadyProcessed: true,
    };
  }

  // 1. Verify with Paystack API
  let paystackPayload: any;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    paystackPayload = await res.json();
    if (!res.ok || !paystackPayload?.status || paystackPayload?.data?.status !== 'success') {
      const msg = paystackPayload?.data?.gateway_response || paystackPayload?.message || 'Payment could not be verified.';
      return { ok: false, error: msg };
    }
  } catch (err: any) {
    console.error('[subscription-service] Paystack API reach error:', err);
    return { ok: false, error: 'Could not communicate with Paystack API.' };
  }

  const txData = paystackPayload.data;
  const amountInUnits = (txData.amount || 0) / 100;
  const currency = (txData.currency || params.currency || 'NGN').toUpperCase();
  const customerEmail = txData.customer?.email || '';
  const metadata = txData.metadata || {};
  const customFields: Array<{ variable_name: string; value: any }> = Array.isArray(metadata.custom_fields)
    ? metadata.custom_fields
    : [];

  const metaBizId =
    metadata.business_id ||
    metadata.businessId ||
    customFields.find((f) => f.variable_name === 'business_id' || f.variable_name === 'businessId')?.value;

  const metaPlan =
    metadata.plan ||
    metadata.planId ||
    customFields.find((f) => f.variable_name === 'plan' || f.variable_name === 'planId')?.value;

  // 2. Identify target User ID (if possible)
  let targetUserId = params.userId || '';
  if (!targetUserId && params.idToken && adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(params.idToken, false);
      targetUserId = decoded.uid;
    } catch (e: any) {
      console.warn('[subscription-service] Token decode skipped/failed:', e.message);
    }
  }

  // 3. Resolve Target Business ID
  let targetBusinessId = params.businessId || metaBizId || '';

  // If not yet found, check user doc
  if (!targetBusinessId && targetUserId) {
    try {
      const uSnap = await adminFirestore.collection('users').doc(targetUserId).get();
      if (uSnap.exists) {
        targetBusinessId = uSnap.data()?.businessId || '';
      }
    } catch (e: any) {
      console.warn('[subscription-service] User doc lookup error:', e.message);
    }
  }

  // If not yet found, check prefix in reference: z-{prefix}-{timestamp}
  if (!targetBusinessId && reference.startsWith('z-')) {
    const parts = reference.split('-');
    if (parts.length >= 2) {
      const prefix = parts[1];
      try {
        const snap = await adminFirestore.collection('businessInstances').get();
        const match = snap.docs.find((d: any) => d.id.substring(0, 6) === prefix || d.id.startsWith(prefix));
        if (match) {
          targetBusinessId = match.id;
        }
      } catch (e: any) {
        console.warn('[subscription-service] Business prefix match failed:', e.message);
      }
    }
  }

  // If not yet found, look up by customer email
  if (!targetBusinessId && customerEmail) {
    try {
      const emailSnap = await adminFirestore.collection('users').where('email', '==', customerEmail).limit(1).get();
      if (!emailSnap.empty) {
        targetBusinessId = emailSnap.docs[0].data()?.businessId || '';
        if (!targetUserId) targetUserId = emailSnap.docs[0].id;
      }
    } catch (e: any) {
      console.warn('[subscription-service] Email user lookup error:', e.message);
    }
  }

  // If STILL not found, log to unmatched_payments so funds are never lost
  if (!targetBusinessId) {
    console.error(`[subscription-service] UNMATCHED PAYMENT for ref: ${reference}, amount: ${amountInUnits} ${currency}`);
    try {
      await adminFirestore.collection('unmatched_payments').doc(reference).set({
        reference,
        amount: amountInUnits,
        currency,
        customerEmail,
        metadata,
        txData: {
          id: txData.id,
          paidAt: txData.paid_at,
          channel: txData.channel,
        },
        receivedAt: FieldValue.serverTimestamp(),
        status: 'pending_manual_match',
      });
    } catch (e) {
      console.error('[subscription-service] Failed to record unmatched payment:', e);
    }
    return {
      ok: false,
      error: `Payment of ${currency} ${amountInUnits} was confirmed, but we could not automatically link it to your store. Please contact support with reference: ${reference}`,
      needsAdminIntervention: true,
    };
  }

  // 4. Resolve Target Plan
  let targetPlan = (params.planId || metaPlan || '').toLowerCase();
  if (targetPlan !== 'pro' && targetPlan !== 'business') {
    if (amountInUnits >= 25000) {
      targetPlan = 'business';
    } else {
      targetPlan = 'pro';
    }
  }

  // 5. Resolve Duration / Cycle
  let months = 1;
  if (params.cycleId && CYCLES[params.cycleId]) {
    months = CYCLES[params.cycleId].months;
  } else {
    // Deduce months from amount paid
    if (amountInUnits >= 80000) months = 12;
    else if (amountInUnits >= 45000) months = 6;
    else if (amountInUnits >= 24000 && targetPlan === 'pro') months = 3;
    else if (amountInUnits >= 70000 && targetPlan === 'business') months = 3;
    else months = 1;
  }

  // 6. Fetch Business Doc
  const businessRef = adminFirestore.collection('businessInstances').doc(targetBusinessId);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) {
    return { ok: false, error: 'Target business instance not found.' };
  }
  const businessData = businessSnap.data() || {};

  // 7. Calculate New Expiry (extend active or start now)
  const currentExpiry = businessData.trialExpiresAt?.toDate ? businessData.trialExpiresAt.toDate() : null;
  const now = new Date();
  const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(startDate);
  newExpiry.setMonth(newExpiry.getMonth() + months);

  // 8. Commit writes atomically in a Firestore Batch
  const batch = adminFirestore.batch();

  batch.update(businessRef, {
    plan: targetPlan,
    trialExpiresAt: newExpiry,
    accessLevel: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const purchaseDocRef = adminFirestore.collection('purchases').doc();
  batch.set(purchaseDocRef, {
    userId: targetUserId || null,
    userEmail: customerEmail || businessData.email || '',
    businessId: targetBusinessId,
    businessName: businessData.name || 'Zeneva Store',
    plan: targetPlan,
    amount: amountInUnits,
    currency,
    reference,
    months,
    timestamp: FieldValue.serverTimestamp(),
    verifiedServerSide: true,
    source,
  });

  batch.set(businessRef.collection('subscription_history').doc(), {
    action: `Subscribed to ${targetPlan} plan for ${months} month(s)`,
    amount: amountInUnits,
    currency,
    reference,
    source,
    timestamp: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log(
    `[subscription-service] Successfully upgraded ${businessData.name} (${targetBusinessId}) to ${targetPlan} for ${months} mo until ${newExpiry.toISOString()}`
  );

  // Send admin notification
  notifyAdminsOfSubscription({
    businessName: businessData.name || 'A Zeneva Store',
    planId: targetPlan,
    amount: amountInUnits,
    currency,
  }).catch((err) => {
    console.error('[subscription-service] Admin push notification failed:', err);
  });

  return {
    ok: true,
    plan: targetPlan,
    expiresAt: newExpiry.toISOString(),
    businessId: targetBusinessId,
  };
}
