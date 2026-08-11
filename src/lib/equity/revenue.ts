'use client';

/**
 * Zeneva's own trading figures, for the Valuation tab.
 *
 * The cap table engine is pure and takes revenue as an input; this is the piece
 * that goes and gets it. Kept out of `engine.ts` deliberately — it touches
 * Firestore and React, and the arithmetic in the engine is worth being able to
 * reason about without either.
 *
 * ## Which "revenue"
 *
 * The admin dashboard carries two figures that both get called revenue, and only
 * one of them is Zeneva's:
 *
 * - **`platformGmv`** — the sum of tenant receipts. That is what the shops using
 *   Zeneva sold to *their* customers. It is not Zeneva's money and belongs
 *   nowhere near Zeneva's valuation. (`admin-imamshaffy/page.tsx` labels it
 *   "Total Revenue" in one card, which is a mislabel, not a second source.)
 * - **`purchases`** — subscription payments made *to* Zeneva. That is the
 *   company's revenue, and it is what this module reads.
 *
 * ## Why MRR is derived from plans, not from payments
 *
 * The obvious MRR — sum the last 30 days of purchases — is wrong in both
 * directions. An annual subscriber who paid in January contributes nothing in
 * March despite still being a paying customer, and a subscriber who just paid
 * twelve months up front contributes twelve months of revenue to a single month.
 * So MRR here counts *currently-active paid subscriptions* at list price, which
 * is what the number is supposed to mean.
 */

import * as React from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { PLAN_MONTHLY_PRICE, effectivePlan, type PlanId } from '@/lib/plan';
import type { EquityRecord, RevenueInputs } from './types';
import { isKind } from './types';
import { toDate } from './engine';

/**
 * USD to NGN, for folding dollar subscriptions into one currency.
 *
 * Hardcoded, and therefore wrong the moment the rate moves — which is why
 * `usdConverted` is reported back to the UI, so a valuation resting on a stale
 * rate says so instead of looking precise. The existing dashboard hardcodes
 * 1500 in `getStandardMRR`; kept identical so the two pages agree.
 */
export const NGN_PER_USD = 1500;

/**
 * Accounts belonging to the company itself.
 *
 * Their payments are test transactions, not sales, and a plan they sit on is not
 * a subscription. Counting either would inflate a valuation with the founder's
 * own money — the one error in this file that would flatter rather than
 * understate, which is exactly the kind to guard against.
 *
 * The same two addresses are hardcoded in `admin-imamshaffy/page.tsx` (search
 * `excludedEmails`) for the SaaS metrics cards. If one list changes the other
 * must too, or the dashboard and the valuation will quote different revenue.
 */
export const INTERNAL_ACCOUNT_EMAILS = ['belloimam431@gmail.com', 'bimex4@gmail.com'];

/** Money as recorded on a purchase, normalised to NGN. */
function toNgn(amount: number, currency: string | undefined): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return (currency ?? 'NGN').toUpperCase() === 'USD' ? value * NGN_PER_USD : value;
}

/** Monthly list price of a plan, in NGN. */
function monthlyPriceNgn(plan: PlanId): number {
  return PLAN_MONTHLY_PRICE[plan]?.NGN ?? 0;
}

export interface PurchaseLike {
  amount?: number;
  currency?: string;
  plan?: string;
  businessId?: string;
  timestamp?: any;
}

export interface BusinessLike {
  id: string;
  plan?: string | null;
  accessLevel?: string | null;
  trialExpiresAt?: any;
  status?: string | null;
  ownerId?: string | null;
}

export interface RevenueSnapshot extends RevenueInputs {
  /** Purchase documents counted. Shown so a zero can be told from a failed read. */
  purchaseCount: number;
  /** True when at least one purchase was in USD and got converted at a fixed rate. */
  usdConverted: boolean;
  /** Businesses on a paid plan that has not lapsed — the MRR base. */
  activeSubscriptions: number;
  /**
   * Businesses that have paid at any point, including ones that have since
   * lapsed. Bigger than `payingCustomers` and a different question: this is reach,
   * that is the run rate's base.
   */
  everPaidCustomers: number;
  /** Lifetime-access businesses: real customers, but contributing no MRR. */
  lifetimeAccounts: number;
  /** Payments from the company's own accounts, left out of every figure above. */
  internalRevenueExcluded: number;
  internalPurchasesExcluded: number;
}

/**
 * Fold purchases, businesses and closed rounds into the figures the valuation
 * needs. Pure — every input is passed in, including `asOf`.
 */
export function computeRevenueSnapshot({
  purchases,
  businesses,
  records,
  internalOwnerIds,
  asOf,
}: {
  purchases: PurchaseLike[];
  businesses: BusinessLike[];
  records: EquityRecord[];
  /** Auth uids of the company's own accounts — see INTERNAL_ACCOUNT_EMAILS. */
  internalOwnerIds: Set<string>;
  asOf: Date;
}): RevenueSnapshot {
  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const isInternal = (businessId: string | undefined) => {
    const ownerId = businessId ? businessById.get(businessId)?.ownerId : null;
    return Boolean(ownerId && internalOwnerIds.has(ownerId));
  };

  let lifetimeRevenue = 0;
  let trailingTwelveMonthRevenue = 0;
  let internalRevenueExcluded = 0;
  let internalPurchasesExcluded = 0;
  let counted = 0;
  let usdConverted = false;

  const twelveMonthsAgo = new Date(asOf);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  for (const p of purchases) {
    const ngn = toNgn(p.amount ?? 0, p.currency);
    if (ngn <= 0) continue;

    if (isInternal(p.businessId)) {
      internalRevenueExcluded += ngn;
      internalPurchasesExcluded += 1;
      continue;
    }

    if ((p.currency ?? 'NGN').toUpperCase() === 'USD') usdConverted = true;

    lifetimeRevenue += ngn;
    counted += 1;

    // An undated purchase counts toward lifetime but not toward the trailing
    // window — guessing a date either way would move a valuation input.
    const at = toDate(p.timestamp);
    if (at && at >= twelveMonthsAgo && at <= asOf) trailingTwelveMonthRevenue += ngn;
  }

  // MRR from who is subscribed right now, at list price. `effectivePlan` already
  // returns 'starter' for a lapsed paid plan, so an expired subscription drops
  // out without a second expiry check here.
  let mrr = 0;
  let activeSubscriptions = 0;
  let lifetimeAccounts = 0;

  for (const b of businesses) {
    if (b.status === 'deleted') continue;
    if (b.ownerId && internalOwnerIds.has(b.ownerId)) continue;

    // Lifetime access reports as 'business' but never pays again. Counting it at
    // ₦30,000/month would invent recurring revenue that does not exist.
    if (b.accessLevel === 'lifetime') {
      lifetimeAccounts += 1;
      continue;
    }

    const plan = effectivePlan(b);
    const price = monthlyPriceNgn(plan);
    if (price <= 0) continue;

    mrr += price;
    activeSubscriptions += 1;
  }

  // Only closed rounds. A planned round is a hope, and adding its cash to the
  // valuation would price money that has not arrived.
  const capitalRaised = records
    .filter(isKind('round'))
    .filter((r) => r.status === 'closed')
    .reduce((sum, r) => sum + Math.max(0, Number(r.amountRaised) || 0), 0);

  const payingCustomers = new Set(
    purchases
      .filter((p) => !isInternal(p.businessId))
      .map((p) => p.businessId)
      .filter((id): id is string => Boolean(id)),
  ).size;

  return {
    lifetimeRevenue,
    trailingTwelveMonthRevenue,
    mrr,
    // Deliberately the *active* count, not the historical one. This feeds the
    // concentration warning in `revenueValuation`, which says the run rate rests
    // on N customers — and a business that stopped paying two years ago is not
    // holding up the run rate.
    payingCustomers: activeSubscriptions,
    capitalRaised,
    asOf,
    purchaseCount: counted,
    usdConverted,
    activeSubscriptions,
    everPaidCustomers: payingCustomers,
    lifetimeAccounts,
    internalRevenueExcluded,
    internalPurchasesExcluded,
  };
}

// ---------------------------------------------------------------------------
// The read.
// ---------------------------------------------------------------------------

interface RawBooks {
  purchases: PurchaseLike[];
  businesses: BusinessLike[];
  internalOwnerIds: Set<string>;
}

/**
 * Module-scoped, so switching tabs and coming back does not pay for the read
 * again. Radix unmounts an inactive `TabsContent`, so without this every visit
 * to the Valuation tab would re-query both collections. Lives for the lifetime
 * of the page; `refresh()` clears it.
 */
let cachedBooks: RawBooks | null = null;
let inflight: Promise<RawBooks> | null = null;

async function readBooks(firestore: Firestore, selfUid: string): Promise<RawBooks> {
  const [purchasesSnap, businessesSnap, internalUsersSnap] = await Promise.all([
    getDocs(query(collection(firestore, 'purchases'))),
    getDocs(query(collection(firestore, 'businessInstances'))),
    // Two documents, not the whole user list: equality on one field is
    // auto-indexed, so this needs no composite index and costs almost nothing.
    // Tolerated failing — `selfUid` below covers the account actually signed in,
    // and the UI reports what was excluded rather than claiming completeness.
    getDocs(
      query(collection(firestore, 'users'), where('email', 'in', INTERNAL_ACCOUNT_EMAILS)),
    ).catch(() => null),
  ]);

  // Whoever is reading this page is the platform owner, so their own business is
  // internal by definition — free, and it covers a stored email whose casing does
  // not match the list above.
  const internalOwnerIds = new Set<string>([selfUid]);
  internalUsersSnap?.docs.forEach((d) => internalOwnerIds.add(d.id));

  return {
    purchases: purchasesSnap.docs.map((d) => d.data() as PurchaseLike),
    businesses: businessesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BusinessLike),
    internalOwnerIds,
  };
}

/**
 * Read the collections the snapshot needs.
 *
 * `enabled` gates the whole thing so opening the cap table costs nothing — the
 * fetch only happens once the Valuation tab is actually opened, and the result
 * is cached for the rest of the page's life. The owner pays this bill.
 */
export function useRevenueSnapshot(
  enabled: boolean,
  records: EquityRecord[],
): {
  snapshot: RevenueSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const firestore = useFirestore();
  const { user } = useUser();
  const selfUid = user?.uid ?? null;

  const [books, setBooks] = React.useState<RawBooks | null>(cachedBooks);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    // Waits for the uid rather than fetching without it. The owner's own business
    // is excluded by uid, and the result is cached — so a read that started
    // before auth resolved would latch a snapshot that counts the founder's own
    // test business as a paying customer, and nothing would ever correct it.
    if (!enabled || !firestore || !selfUid) return;
    if (cachedBooks) {
      setBooks(cachedBooks);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Shared across mounts, so two components asking at once make one round trip.
    inflight = inflight ?? readBooks(firestore as Firestore, selfUid);

    void inflight
      .then((result) => {
        cachedBooks = result;
        if (!cancelled) {
          setBooks(result);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Could not read the revenue figures.');
      })
      .finally(() => {
        inflight = null;
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, firestore, selfUid, attempt]);

  const refresh = React.useCallback(() => {
    cachedBooks = null;
    inflight = null;
    setBooks(null);
    setAttempt((n) => n + 1);
  }, []);

  const snapshot = React.useMemo(() => {
    if (!books) return null;
    return computeRevenueSnapshot({
      purchases: books.purchases,
      businesses: books.businesses,
      records,
      internalOwnerIds: books.internalOwnerIds,
      asOf: new Date(),
    });
  }, [books, records]);

  return { snapshot, isLoading, error, refresh };
}
