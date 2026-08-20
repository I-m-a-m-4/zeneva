'use server';

import { adminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from './admin-guard';
import { CREDIT_PACKS, creditPack, packAmountMinor, type CreditPackId } from '@/lib/credit-packs';
import { AI_CREDIT_LEDGER_COLLECTION } from '@/lib/ai-credit-ledger';

/**
 * Buying AI credits on the naira rail.
 *
 * Modelled on `src/actions/subscription.ts` deliberately and closely: the same
 * five checks in the same order, because every one of them exists for a reason
 * somebody already found. Read that file's header for the history — the short
 * version is that the client used to verify its own payment against a price it
 * also chose, and a modded build could pay the Pro price and write
 * `plan: 'business'`.
 *
 * A credit balance is the same class of thing. `aiBonusCredits` is in
 * `entitlementFieldsLocked()` in `firestore.rules`, so the client cannot write
 * it; this action and the Dodo webhook are the only two paths that add to it, and
 * the admin grant control is the third (super-admin only, through the rules
 * catch-all).
 *
 * ## What this is NOT
 *
 * A webhook. Paystack's rail here is the Inline popup plus this action, so if the
 * browser dies between the charge succeeding and this call landing, the money is
 * taken and the credits are not granted. That is already true of every naira
 * subscription today and is not made worse here — the reference is recorded in
 * `checkout_attempts` before the popup opens, so a "restore my purchase" retry is
 * possible later. Worth knowing; out of scope.
 */

export type PurchaseCreditsResult =
  | { ok: true; credits: number; packId: CreditPackId; newBalance: number }
  | { ok: false; error: string };

export async function purchaseAiCredits(params: {
  idToken?: string;
  reference: string;
  packId: string;
  currency: 'NGN' | 'USD';
}): Promise<PurchaseCreditsResult> {
  const { idToken, reference, packId, currency } = params;

  let uid: string;
  try {
    uid = await requireUser(idToken);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  if (!adminFirestore) return { ok: false, error: 'Server not configured.' };
  if (typeof reference !== 'string' || !reference) return { ok: false, error: 'Missing payment reference.' };

  // Priced here, from the id. The client's numbers are display only — see
  // `src/lib/credit-packs.ts`.
  const pack = creditPack(packId);
  if (!pack) {
    return {
      ok: false,
      error: `Unknown credit pack. Choose one of: ${CREDIT_PACKS.map((p) => p.credits).join(', ')} credits.`,
    };
  }
  if (currency !== 'NGN' && currency !== 'USD') return { ok: false, error: 'Unsupported currency.' };

  // The caller's business comes from their own user document, never the request.
  // A businessId in the payload is a request to credit somebody else's balance.
  const userSnap = await adminFirestore.collection('users').doc(uid).get();
  const businessId = userSnap.data()?.businessId;
  if (!businessId) return { ok: false, error: 'No business linked to this account.' };

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes('xxx')) {
    return { ok: false, error: 'Payment verification is not configured on the server.' };
  }

  // A reference may be redeemed once. Checked before verifying, so a replayed
  // reference cannot mint credits over and over — the grant below is additive,
  // which makes replay the whole attack.
  const existing = await adminFirestore
    .collection('purchases')
    .where('reference', '==', reference)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { ok: false, error: 'This payment has already been applied.' };
  }

  let payload: any;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    payload = await res.json();
    if (!res.ok || !payload?.status || payload?.data?.status !== 'success') {
      return { ok: false, error: payload?.data?.gateway_response || 'Payment could not be verified.' };
    }
  } catch {
    return { ok: false, error: 'Could not reach the payment provider.' };
  }

  const expected = packAmountMinor(pack, currency);

  if (payload.data.currency !== currency) {
    return { ok: false, error: 'Transaction currency does not match the pack price.' };
  }

  /*
   * Underpayment is refused; overpayment is accepted and granted anyway.
   *
   * No tolerance window, unlike `activateSubscription`, which allows a unit of
   * rounding slack. That slack is 100 minor units — ₦1, or **one dollar** — and
   * the smallest pack here costs $2.50, so the same rule would sell 250 credits
   * for $1.50. Pack prices are whole naira or exact cents and Paystack reports
   * integers, so there is no rounding to forgive in the first place.
   */
  if (typeof payload.data.amount !== 'number' || payload.data.amount < expected) {
    return { ok: false, error: 'Paid amount does not match the pack price. Contact support.' };
  }

  const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) return { ok: false, error: 'Business not found.' };

  const paidMajor = payload.data.amount / 100;
  const previousBalance = Math.max(0, Number(businessSnap.data()?.aiBonusCredits) || 0);

  const batch = adminFirestore.batch();

  // `increment`, not a computed total: a turn in flight is debiting the same
  // field, and a read-then-write here would hand those credits back.
  batch.update(businessRef, {
    aiBonusCredits: FieldValue.increment(pack.credits),
  });

  batch.set(adminFirestore.collection('purchases').doc(), {
    userId: uid,
    businessId,
    /*
     * `kind` is what keeps a one-off pack out of the run rate. The admin board
     * derives MRR from each business's *latest* purchase, so without this a
     * ₦2,500 pack would replace a ₦30,000 subscription and report the shop as
     * paying ₦2,500 a month. `src/lib/platform-revenue.ts` treats a missing
     * `kind` as `'subscription'`, which is what every existing row is.
     */
    kind: 'credits',
    packId: pack.id,
    credits: pack.credits,
    // Kept so the revenue helpers, which key off `plan`, have something readable
    // rather than `undefined` in a table cell.
    plan: `${pack.credits} AI credits`,
    amount: paidMajor,
    currency,
    reference,
    gateway: 'paystack',
    timestamp: FieldValue.serverTimestamp(),
    verifiedServerSide: true,
  });

  // The ledger. Every movement of `aiBonusCredits` writes one of these —
  // purchases here, the Dodo webhook, and the admin grant control — so "where did
  // these credits come from" has an answer. See `src/lib/ai-credit-ledger.ts`.
  batch.set(adminFirestore.collection(AI_CREDIT_LEDGER_COLLECTION).doc(), {
    businessId,
    businessName: businessSnap.data()?.name || null,
    kind: 'purchase',
    source: 'paystack',
    credits: pack.credits,
    packId: pack.id,
    amount: paidMajor,
    currency,
    reference,
    actorId: uid,
    balanceBefore: previousBalance,
    balanceAfter: previousBalance + pack.credits,
    timestamp: FieldValue.serverTimestamp(),
  });

  batch.set(businessRef.collection('subscription_history').doc(), {
    action: `Bought ${pack.credits.toLocaleString()} Zen AI credits`,
    amount: paidMajor,
    currency,
    timestamp: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    ok: true,
    credits: pack.credits,
    packId: pack.id,
    // Pre-purchase balance plus the pack, not a re-read. Advisory — a turn may
    // have spent one in between, and the client re-reads the business doc anyway.
    newBalance: previousBalance + pack.credits,
  };
}
