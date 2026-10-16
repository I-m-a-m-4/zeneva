'use server';

import { adminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from './admin-guard';
import { randomBytes } from 'crypto';
import type { ReferralRecord, ReferralPhase } from '@/types';

/**
 * Generates an uppercase 6-character clean referral code.
 * e.g. ZEN-A8K2F9
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous 0, O, 1, I
  let result = 'ZEN-';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Calculates new expiry date by adding 30 days.
 * If existing expiry is in the future, extends from that future date.
 * Otherwise, extends from now.
 */
function add30Days(currentExpiryDate: Date | null): Date {
  const now = new Date();
  const start = currentExpiryDate && currentExpiryDate > now ? currentExpiryDate : now;
  const newDate = new Date(start);
  newDate.setDate(newDate.getDate() + 30);
  return newDate;
}

/**
 * Fetches or initializes a unique referral code for a business.
 */
async function ensureBusinessReferralCode(businessId: string, existingCode?: string): Promise<string> {
  if (existingCode && existingCode !== 'ZEN-APP' && existingCode !== 'ZEN-XXXXXX') return existingCode;
  if (!adminFirestore) throw new Error('Database connection unavailable');

  const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
  const snap = await businessRef.get();
  const current = snap.data()?.referralCode;
  if (current && current !== 'ZEN-APP' && current !== 'ZEN-XXXXXX') return current;

  // Generate unique code with collision check
  let attempts = 0;
  let code = generateCode();
  while (attempts < 5) {
    const existing = await adminFirestore
      .collection('businessInstances')
      .where('referralCode', '==', code)
      .limit(1)
      .get();
    if (existing.empty) break;
    code = generateCode();
    attempts++;
  }

  await businessRef.set(
    {
      referralCode: code,
      referralStats: {
        totalReferred: 0,
        completedReferrals: 0,
        rewardDaysEarned: 0,
      },
    },
    { merge: true }
  );

  return code;
}

export type ReferralProgramDetails = {
  ok: true;
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferred: number;
    completedReferrals: number;
    rewardDaysEarned: number;
  };
  referrals: ReferralRecord[];
  referredBy?: {
    code: string;
    referrerBusinessName?: string;
    rewardClaimed: boolean;
  } | null;
  currentPlan?: string;
  trialExpiresAt?: string | null;
} | {
  ok: false;
  error: string;
};

/**
 * Loads the current merchant's referral program overview.
 */
export async function getReferralProgramDetails(params: {
  idToken?: string;
  origin?: string;
}): Promise<ReferralProgramDetails> {
  const { idToken, origin } = params;

  let uid: string;
  try {
    uid = await requireUser(idToken);
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unauthorized' };
  }

  if (!adminFirestore) return { ok: false, error: 'Server database unavailable' };

  const userSnap = await adminFirestore.collection('users').doc(uid).get();
  const businessId = userSnap.data()?.businessId;
  if (!businessId) return { ok: false, error: 'No business linked to account' };

  const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) return { ok: false, error: 'Business not found' };

  const bData = businessSnap.data() || {};
  const referralCode = await ensureBusinessReferralCode(businessId, bData.referralCode);

  const baseOrigin = 'https://zeneva.space';
  const referralLink = `${baseOrigin}/signup?ref=${referralCode}`;

  const stats = {
    totalReferred: bData.referralStats?.totalReferred || 0,
    completedReferrals: bData.referralStats?.completedReferrals || 0,
    rewardDaysEarned: bData.referralStats?.rewardDaysEarned || 0,
  };

  // Fetch referrals initiated by this business
  let referrals: ReferralRecord[] = [];
  try {
    const referralsSnap = await adminFirestore
      .collection('referrals')
      .where('referrerBusinessId', '==', businessId)
      .limit(50)
      .get();

    referrals = referralsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        referralCode: d.referralCode || '',
        referrerBusinessId: d.referrerBusinessId || '',
        referrerOwnerId: d.referrerOwnerId || '',
        referrerBusinessName: d.referrerBusinessName || '',
        refereeBusinessId: d.refereeBusinessId || '',
        refereeOwnerId: d.refereeOwnerId || '',
        refereeBusinessName: d.refereeBusinessName || 'New Store',
        status: d.status || 'pending',
        currentPhase: d.currentPhase || (d.status === 'completed' ? 'first_sale_completed' : 'signed_up'),
        completedPhases: d.completedPhases || (d.status === 'completed' ? ['signed_up', 'products_added', 'first_sale_completed'] : ['signed_up']),
        rewardDays: d.rewardDays || 30,
        qualificationTrigger: d.qualificationTrigger,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
        completedAt: d.completedAt?.toDate ? d.completedAt.toDate().toISOString() : null,
      } as ReferralRecord;
    });

    // Sort in memory by createdAt descending
    referrals.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  } catch (e) {
    console.warn('[referral] Error querying referrals collection:', e);
  }

  const rawExpiry = bData.trialExpiresAt;
  const expiryDate = rawExpiry?.toDate ? rawExpiry.toDate() : null;

  return {
    ok: true,
    referralCode,
    referralLink,
    stats,
    referrals,
    referredBy: bData.referredBy ? {
      code: bData.referredBy.code,
      referrerBusinessName: bData.referredBy.referrerBusinessName,
      rewardClaimed: !!bData.referredBy.rewardClaimed,
    } : null,
    currentPlan: bData.plan || 'starter',
    trialExpiresAt: expiryDate ? expiryDate.toISOString() : null,
  };
}

/**
 * Validates a referral code format and checks if it belongs to an active business.
 */
export async function validateReferralCode(code: string): Promise<{
  ok: boolean;
  valid: boolean;
  referrerName?: string;
  error?: string;
}> {
  if (!code || typeof code !== 'string') return { ok: true, valid: false };
  if (!adminFirestore) return { ok: false, valid: false, error: 'Database unavailable' };

  const clean = code.trim().toUpperCase();
  const snap = await adminFirestore
    .collection('businessInstances')
    .where('referralCode', '==', clean)
    .limit(1)
    .get();

  if (snap.empty) {
    return { ok: true, valid: false };
  }

  const data = snap.docs[0].data();
  return {
    ok: true,
    valid: true,
    referrerName: data.name || 'A Zeneva Partner',
  };
}

/**
 * Applies a referral code to the caller's business.
 * Creates a pending referral document and records `referredBy` on the referee business.
 */
export async function applyReferralCode(params: {
  idToken?: string;
  code: string;
}): Promise<{ ok: boolean; error?: string; referrerName?: string }> {
  const { idToken, code } = params;

  let uid: string;
  try {
    uid = await requireUser(idToken);
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unauthorized' };
  }

  if (!adminFirestore) return { ok: false, error: 'Server database unavailable' };
  if (!code || typeof code !== 'string') return { ok: false, error: 'Referral code is required' };

  const cleanCode = code.trim().toUpperCase();

  const userSnap = await adminFirestore.collection('users').doc(uid).get();
  const businessId = userSnap.data()?.businessId;
  if (!businessId) return { ok: false, error: 'No business linked to account' };

  const refereeRef = adminFirestore.collection('businessInstances').doc(businessId);
  const refereeSnap = await refereeRef.get();
  if (!refereeSnap.exists) return { ok: false, error: 'Business not found' };

  const refereeData = refereeSnap.data() || {};
  if (refereeData.referredBy) {
    return { ok: false, error: 'A referral code has already been claimed for this store. You cannot enter another referral code.' };
  }

  // Find referrer business
  const referrerQuery = await adminFirestore
    .collection('businessInstances')
    .where('referralCode', '==', cleanCode)
    .limit(1)
    .get();

  if (referrerQuery.empty) {
    return { ok: false, error: 'Invalid referral code. Please check and try again.' };
  }

  const referrerDoc = referrerQuery.docs[0];
  const referrerData = referrerDoc.data();

  // 1. Self-referral prevention: cannot use your own store's code
  if (referrerDoc.id === businessId) {
    return { ok: false, error: 'You cannot use your own referral code.' };
  }

  // 2. Self-referral prevention: cannot use a code belonging to an account you own
  if (referrerData.ownerId && referrerData.ownerId === uid) {
    return { ok: false, error: 'You cannot use a referral code from an account you own.' };
  }

  const now = Date.now();
  const referrerCreatedAt = referrerData.createdAt?.toDate ? referrerData.createdAt.toDate() : null;
  const refereeCreatedAt = refereeData.createdAt?.toDate ? refereeData.createdAt.toDate() : null;

  // 3. Timing Rule 1: Referee account must not have been created before the referrer account
  // ("created the account before them make sure that doesn't work")
  if (refereeCreatedAt && referrerCreatedAt && refereeCreatedAt.getTime() < referrerCreatedAt.getTime()) {
    return {
      ok: false,
      error: 'Invalid referral. You cannot be referred by a store that was registered after yours.',
    };
  }

  // 4. Timing Rule 2: Referrer account must not be brand new ("just created the account")
  // Prevents throwaway accounts created minutes ago to game free Pro
  if (referrerCreatedAt) {
    const referrerAgeMs = now - referrerCreatedAt.getTime();
    const MIN_REFERRER_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (referrerAgeMs < MIN_REFERRER_AGE_MS) {
      return {
        ok: false,
        error: 'This referral code belongs to a brand-new store. Referrers must have an active store for at least 24 hours before inviting others.',
      };
    }
  }

  // 5. Timing Rule 3: Referee account must be a new store (within 30 days of registration)
  if (refereeCreatedAt) {
    const refereeAgeMs = now - refereeCreatedAt.getTime();
    const MAX_REFEREE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (refereeAgeMs > MAX_REFEREE_AGE_MS) {
      return {
        ok: false,
        error: 'Referral codes can only be claimed by newly registered stores (within 30 days of registration).',
      };
    }
  }

  const referrerName = referrerData.name || 'Zeneva Partner';
  const refereeName = refereeData.name || 'New Store';

  const batch = adminFirestore.batch();

  // Set referee referredBy info
  batch.update(refereeRef, {
    referredBy: {
      code: cleanCode,
      referrerBusinessId: referrerDoc.id,
      referrerBusinessName: referrerName,
      appliedAt: FieldValue.serverTimestamp(),
      rewardClaimed: false,
    },
  });

  // Increment referrer total count
  batch.update(referrerDoc.ref, {
    'referralStats.totalReferred': FieldValue.increment(1),
  });

  // Create pending referral record
  const referralRef = adminFirestore.collection('referrals').doc();
  batch.set(referralRef, {
    referralCode: cleanCode,
    referrerBusinessId: referrerDoc.id,
    referrerOwnerId: referrerData.ownerId || '',
    referrerBusinessName: referrerName,
    refereeBusinessId: businessId,
    refereeOwnerId: uid,
    refereeBusinessName: refereeName,
    status: 'pending',
    currentPhase: 'signed_up',
    completedPhases: ['signed_up'],
    rewardDays: 30,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { ok: true, referrerName };
}

/**
 * Triggers referral qualification on first sale or direct claim.
 * Awards 30 days of Pro to both the Referrer and the Referee.
 */
export async function qualifyReferral(params: {
  refereeBusinessId: string;
  trigger: 'first_sale' | 'code_applied' | 'payment';
}): Promise<{ ok: boolean; rewarded: boolean; days?: number; error?: string }> {
  const { refereeBusinessId, trigger } = params;

  if (!adminFirestore) return { ok: false, rewarded: false, error: 'Database unavailable' };

  const refereeRef = adminFirestore.collection('businessInstances').doc(refereeBusinessId);
  const refereeSnap = await refereeRef.get();
  if (!refereeSnap.exists) return { ok: false, rewarded: false, error: 'Referee business not found' };

  const refereeData = refereeSnap.data() || {};
  const referredBy = refereeData.referredBy;

  // Not referred, or reward already claimed
  if (!referredBy || referredBy.rewardClaimed) {
    return { ok: true, rewarded: false };
  }

  const referrerId = referredBy.referrerBusinessId;
  if (!referrerId) return { ok: true, rewarded: false };

  const referrerRef = adminFirestore.collection('businessInstances').doc(referrerId);
  const referrerSnap = await referrerRef.get();
  if (!referrerSnap.exists) return { ok: false, rewarded: false, error: 'Referrer business not found' };

  const referrerData = referrerSnap.data() || {};

  // 1. Calculate referee 30-day extension
  const refereeCurrentExpiry = refereeData.trialExpiresAt?.toDate ? refereeData.trialExpiresAt.toDate() : null;
  const refereeNewExpiry = add30Days(refereeCurrentExpiry);
  const refereePlan = refereeData.plan === 'business' ? 'business' : 'pro';

  // 2. Calculate referrer 30-day extension
  const referrerCurrentExpiry = referrerData.trialExpiresAt?.toDate ? referrerData.trialExpiresAt.toDate() : null;
  const referrerNewExpiry = add30Days(referrerCurrentExpiry);
  const referrerPlan = referrerData.plan === 'business' ? 'business' : 'pro';

  const refereeName = refereeData.name || 'Store';
  const referrerName = referrerData.name || 'Store';

  const batch = adminFirestore.batch();

  // Update referee
  batch.update(refereeRef, {
    plan: refereePlan,
    trialExpiresAt: refereeNewExpiry,
    'referredBy.rewardClaimed': true,
  });

  // Update referrer
  batch.update(referrerRef, {
    plan: referrerPlan,
    trialExpiresAt: referrerNewExpiry,
    'referralStats.completedReferrals': FieldValue.increment(1),
    'referralStats.rewardDaysEarned': FieldValue.increment(30),
  });

  // Record history for referee
  const refereeHistoryRef = refereeRef.collection('subscription_history').doc();
  batch.set(refereeHistoryRef, {
    action: `🎁 Referral Welcome Gift: +30 Days Pro from ${referrerName}`,
    amount: 0,
    currency: 'NGN',
    timestamp: FieldValue.serverTimestamp(),
    plan: refereePlan,
    verifiedServerSide: true,
  });

  // Record history for referrer
  const referrerHistoryRef = referrerRef.collection('subscription_history').doc();
  batch.set(referrerHistoryRef, {
    action: `🎁 Referral Reward: +30 Days Pro for referring ${refereeName}`,
    amount: 0,
    currency: 'NGN',
    timestamp: FieldValue.serverTimestamp(),
    plan: referrerPlan,
    verifiedServerSide: true,
  });

  // Update matching referrals document to 'completed'
  const refQuery = await adminFirestore
    .collection('referrals')
    .where('refereeBusinessId', '==', refereeBusinessId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!refQuery.empty) {
    batch.update(refQuery.docs[0].ref, {
      status: 'completed',
      currentPhase: 'first_sale_completed',
      completedPhases: FieldValue.arrayUnion('first_sale_completed', 'products_added'),
      completedAt: FieldValue.serverTimestamp(),
      qualificationTrigger: trigger,
    });
  }

  // Notify referee owner
  if (refereeData.ownerId) {
    const refereeNotifRef = adminFirestore
      .collection('users')
      .doc(refereeData.ownerId)
      .collection('notifications')
      .doc();
    batch.set(refereeNotifRef, {
      title: '🎉 30 Days Free Pro Activated!',
      message: `You earned 30 days of Zeneva Pro free via referral from ${referrerName}. Enjoy full inventory & analytics features!`,
      type: 'referral_reward',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Notify referrer owner
  if (referrerData.ownerId) {
    const referrerNotifRef = adminFirestore
      .collection('users')
      .doc(referrerData.ownerId)
      .collection('notifications')
      .doc();
    batch.set(referrerNotifRef, {
      title: '🎉 30 Days Free Pro Reward Earned!',
      message: `${refereeName} activated their store! 30 days of free Pro has been credited to your account.`,
      type: 'referral_reward',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { ok: true, rewarded: true, days: 30 };
}

/**
 * Called by the POS checkout flow when a sale finishes.
 * Automatically checks and qualifies any pending referral for the current business.
 */
export async function qualifyReferralOnSale(params: {
  idToken?: string;
}): Promise<{ ok: boolean; rewarded: boolean; days?: number; error?: string }> {
  const { idToken } = params;

  let uid: string;
  try {
    uid = await requireUser(idToken);
  } catch (err: any) {
    return { ok: false, rewarded: false, error: err.message || 'Unauthorized' };
  }

  if (!adminFirestore) return { ok: false, rewarded: false, error: 'Database unavailable' };

  const userSnap = await adminFirestore.collection('users').doc(uid).get();
  const businessId = userSnap.data()?.businessId;
  if (!businessId) return { ok: true, rewarded: false };

  return qualifyReferral({ refereeBusinessId: businessId, trigger: 'first_sale' });
}

/**
 * Allows a store owner to enter a referral code directly to claim 30 days free.
 */
export async function claimReferralDirect(params: {
  idToken?: string;
  code: string;
}): Promise<{ ok: boolean; rewarded: boolean; error?: string; referrerName?: string }> {
  const { idToken, code } = params;

  // 1. First apply code
  const applyRes = await applyReferralCode({ idToken, code });
  if (!applyRes.ok) {
    return { ok: false, rewarded: false, error: applyRes.error };
  }

  // 2. Immediately qualify and award 30 days
  let uid: string;
  try {
    uid = await requireUser(idToken);
  } catch (err: any) {
    return { ok: false, rewarded: false, error: err.message || 'Unauthorized' };
  }

  if (!adminFirestore) return { ok: false, rewarded: false, error: 'Database unavailable' };
  const userSnap = await adminFirestore.collection('users').doc(uid).get();
  const businessId = userSnap.data()?.businessId;
  if (!businessId) return { ok: false, rewarded: false, error: 'No business linked' };

  const qualifyRes = await qualifyReferral({
    refereeBusinessId: businessId,
    trigger: 'code_applied',
  });

  return {
    ok: true,
    rewarded: qualifyRes.rewarded,
    referrerName: applyRes.referrerName,
  };
}

/**
 * Advances a referee's referral progress through qualification phases.
 * Valid phases: 'signed_up' | 'products_added' | 'first_sale_completed'
 */
export async function advanceReferralPhase(params: {
  idToken?: string;
  refereeBusinessId?: string;
  phase: ReferralPhase;
}): Promise<{ ok: boolean; updated?: boolean; error?: string }> {
  const { idToken, phase } = params;
  let businessId = params.refereeBusinessId;

  if (!businessId) {
    if (!idToken) return { ok: false, error: 'Unauthorized or missing businessId' };
    try {
      const uid = await requireUser(idToken);
      if (!adminFirestore) return { ok: false, error: 'Server database unavailable' };
      const userSnap = await adminFirestore.collection('users').doc(uid).get();
      businessId = userSnap.data()?.businessId;
    } catch (err: any) {
      return { ok: false, error: err.message || 'Unauthorized' };
    }
  }

  if (!businessId) return { ok: false, error: 'Business ID not found' };
  if (!adminFirestore) return { ok: false, error: 'Database unavailable' };

  if (phase === 'first_sale_completed') {
    const res = await qualifyReferral({ refereeBusinessId: businessId, trigger: 'first_sale' });
    return { ok: res.ok, updated: res.rewarded, error: res.error };
  }

  try {
    const refQuery = await adminFirestore
      .collection('referrals')
      .where('refereeBusinessId', '==', businessId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (refQuery.empty) {
      return { ok: true, updated: false };
    }

    const refDoc = refQuery.docs[0];
    const data = refDoc.data();
    const completedPhases: string[] = data.completedPhases || ['signed_up'];

    if (!completedPhases.includes(phase)) {
      await refDoc.ref.update({
        currentPhase: phase,
        completedPhases: FieldValue.arrayUnion(phase),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true, updated: true };
    }

    return { ok: true, updated: false };
  } catch (e: any) {
    console.error('advanceReferralPhase error:', e);
    return { ok: false, error: e.message };
  }
}
