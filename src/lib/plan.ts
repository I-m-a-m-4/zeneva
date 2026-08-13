import { safeToDate } from '@/lib/utils';

/**
 * Plan entitlements — the single source of truth.
 *
 * There is no free trial. Starter is free forever; the only thing a date can
 * ever mean is "what a paying customer paid through".
 *
 * `trialExpiresAt` keeps its historical name because it is written by the
 * billing flow and read by the admin panel, but it is now purely a paid-period
 * deadline. What it means depends entirely on `plan`:
 *
 * - `starter` (the free plan) — never expires, so any date here is ignored.
 *   Older accounts still carry a leftover trial date from when signup wrote
 *   one; ignoring it is what keeps those users from being locked out. A free
 *   user keeps the base app (POS, inventory, customers, reports) forever,
 *   capped at 50 products.
 * - `pro` / `business` — the date is what the customer paid through. Once it
 *   passes they stop being a paying customer, so they fall back to `starter`:
 *   still fully able to run their shop, just without the paid features.
 * - `lifetime` access level — never expires, always Business.
 *
 * Nobody is locked out of the app for an expired date. Expiry downgrades; it
 * does not revoke.
 */

export type PlanId = 'starter' | 'pro' | 'business';

/** Maximum products per plan. Free is capped at 50. */
export const PRODUCT_LIMITS: Record<PlanId, number> = {
  starter: 50,
  pro: 1500,
  business: Infinity,
};

/** Maximum staff accounts per plan. */
export const STAFF_LIMITS: Record<PlanId, number> = {
  starter: 1,
  pro: 5,
  business: 1000000,
};

/** Monthly Zen AI message allowance per plan. */
export const AI_MONTHLY_LIMITS: Record<PlanId, number> = {
  starter: 30,
  pro: 3000,
  business: 15000,
};

/**
 * List price per month. Must match `components/settings/subscription-section.tsx`
 * and the marketing pages — this is the same number, not an approximation of it.
 *
 * Lives here because MRR is computed from the plan a business is on rather than
 * from what it last paid: an annual subscriber pays twelve months at once, and
 * counting the cheque as one month's revenue understates the run rate as badly
 * as counting it as twelve overstates it.
 */
export const PLAN_MONTHLY_PRICE: Record<PlanId, { NGN: number; USD: number }> = {
  starter: { NGN: 0, USD: 0 },
  pro: { NGN: 10_000, USD: 10 },
  business: { NGN: 30_000, USD: 30 },
};

/** Only these plans are ever bought, so only these can lapse. */
const PAID_PLANS: PlanId[] = ['pro', 'business'];

type BusinessLike = {
  plan?: string | null;
  accessLevel?: string | null;
  status?: string | null;
  trialExpiresAt?: any;
} | null | undefined;

/** True when the business bought Pro or Business (regardless of expiry). */
export function isPaidPlan(business: BusinessLike): boolean {
  return PAID_PLANS.includes((business?.plan || '') as PlanId);
}

/**
 * True when a *purchased* plan has run past the date it was paid through.
 * Always false for free users — the free plan has nothing to expire — and
 * always false for lifetime access.
 */
export function isPaidPlanExpired(business: BusinessLike): boolean {
  if (!business) return false;
  if (business.accessLevel === 'lifetime') return false;
  if (!isPaidPlan(business)) return false;
  if (!business.trialExpiresAt) return false;

  const expiry = safeToDate(business.trialExpiresAt);
  if (!expiry || Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() <= Date.now();
}

/**
 * The plan whose entitlements actually apply right now.
 *
 * Gate every paid feature on this rather than on `business.plan`, so a lapsed
 * subscription cleanly stops unlocking what it used to unlock.
 */
export function effectivePlan(business: BusinessLike): PlanId {
  if (!business) return 'starter';
  if (business.accessLevel === 'lifetime') return 'business';
  if (isPaidPlanExpired(business)) return 'starter';

  const plan = business.plan;
  if (plan === 'pro' || plan === 'business') return plan;
  return 'starter';
}

/** Product cap in force right now. */
export function productLimit(business: BusinessLike): number {
  return PRODUCT_LIMITS[effectivePlan(business)];
}

/** Staff-account cap in force right now. */
export function staffLimit(business: BusinessLike): number {
  return STAFF_LIMITS[effectivePlan(business)];
}

/** Monthly Zen AI allowance in force right now. */
export function aiMonthlyLimit(business: BusinessLike): number {
  return AI_MONTHLY_LIMITS[effectivePlan(business)];
}

/** Pro-tier features: also available to Business and lifetime. */
export function hasProFeatures(business: BusinessLike): boolean {
  const plan = effectivePlan(business);
  return plan === 'pro' || plan === 'business';
}

/** Business-tier only features. */
export function hasBusinessFeatures(business: BusinessLike): boolean {
  return effectivePlan(business) === 'business';
}

/**
 * Whether the base app is usable.
 *
 * An expired date is deliberately *not* part of this. The free plan never
 * expires, and a lapsed paid plan downgrades to it, so no date locks anyone
 * out. Only a business that has actually been removed is shut off.
 */
export function isSubscriptionActive(business: BusinessLike): boolean {
  if (!business) return true;
  return business.status !== 'deleted';
}

/**
 * True when a paying customer has just lapsed and should be nudged to renew.
 * Drives upsell copy only — never access.
 */
export function shouldPromptRenewal(business: BusinessLike): boolean {
  return isPaidPlanExpired(business);
}
