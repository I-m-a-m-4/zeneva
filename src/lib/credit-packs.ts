/**
 * Top-up credit packs — one table, both currency rails, client and server.
 *
 * A pack is a one-off purchase that adds non-expiring credits to
 * `aiBonusCredits` (the historic name; see `src/lib/server/ai-credits.ts`). It is
 * not a subscription, does not renew, and does not change the plan.
 *
 * Two mechanisms sell these and they must quote the same price:
 *
 * - **NGN** — Paystack Inline on the client, then `purchaseAiCredits` in
 *   `src/actions/ai-credits.ts` verifies the reference server-side and grants.
 * - **USD** — a Dodo hosted checkout, granted by the signed webhook at
 *   `src/app/api/webhooks/dodo/route.ts`.
 *
 * So this table is the shared truth, and both server paths re-derive the price
 * from the pack id rather than trusting an amount the client sent. A client that
 * can name its own price can buy 5,000 credits for one naira.
 *
 * ## What is deliberately *not* here
 *
 * The Dodo product ids. They live in `src/app/api/dodo/checkout/route.ts` because
 * they come from `process.env.DODO_CREDITS_*_PRODUCT_ID`, which is server-only —
 * referenced from a module a client component imports, Next.js inlines
 * `undefined` and the checkout silently targets no product.
 *
 * ## What a credit costs us, and what these prices imply
 *
 * A credit is `TOKENS_PER_CREDIT` (20,000) weighted tokens, and the weighting
 * exists so that number costs about the same however it is split: 20,000 input
 * tokens at $0.30/1M is $0.0060, and the 2,500 output tokens that weigh the same
 * at $2.50/1M is $0.00625. Call it **$0.006 a credit**.
 *
 * Against that:
 *
 * | Pack  | USD    | per credit | vs cost | NGN     | per credit |
 * |-------|--------|-----------|---------|---------|------------|
 * | 250   | $2.50  | $0.0100   | +67%    | ₦2,500  | ₦10        |
 * | 1,000 | $8     | $0.0080   | +33%    | ₦8,000  | ₦8         |
 * | 5,000 | $35    | $0.0070   | +17%    | ₦35,000 | ₦7         |
 *
 * The naira column is priced off the **same list convention as the plans** —
 * Zeneva charges ₦10,000 or $10 for Pro, i.e. an internal ₦1,000/$ — so per
 * credit the two columns are identical by construction. Converted at the real
 * rate in `NGN_PER_USD` (₦1,500/$) they are not: ₦8,000 is $5.33, which is
 * $0.0053 a credit, *below* the $0.006 that Google charges. Gemini bills in
 * dollars, so the naira packs carry the same FX exposure the naira plan prices
 * already carry. That is a pre-existing pricing stance, not something this table
 * invented — but it is why the two larger naira packs must not be discounted
 * further without repricing the plans too.
 *
 * **These are considered estimates, not calibrated prices.** `TOKENS_PER_CREDIT`
 * is itself an estimate until the Cost ceiling column on
 * `/admin-imamshaffy/ai-usage` has real per-tenant token data, which it only
 * started collecting in August 2026. Reprice both together, there and here.
 *
 * ## Packs versus upgrading
 *
 * Worth knowing rather than hiding: at ₦8/credit the 1,000 pack is cheaper per
 * credit than the marginal credit in a Pro→Business upgrade (₦20,000 more a month
 * for 1,100 more credits is ₦18 each). So a shop that wants *only* AI is right to
 * buy packs, and a shop that wants multi-branch, unlimited staff and the rest is
 * still right to upgrade. The tiers sell the product; the packs sell the tokens.
 */

export type CreditPackId = 'credits_250' | 'credits_1000' | 'credits_5000';

export interface CreditPack {
  id: CreditPackId;
  /** Credits added to `aiBonusCredits`. Non-expiring. */
  credits: number;
  /** Price in whole naira. */
  ngn: number;
  /** Price in dollars. May carry cents — `$2.50` is the small pack. */
  usd: number;
  /** Card heading. */
  label: string;
  /** One line on who it is for. Display only. */
  blurb: string;
  /** Highlighted in the UI. Exactly one, or none. */
  featured?: boolean;
}

/**
 * The packs, cheapest first.
 *
 * Adding one means a matching product in the Dodo dashboard and its id in
 * `DODO_CREDIT_PRODUCT_IDS`, or the USD rail will refuse it while the NGN rail
 * happily sells it — a difference no customer can be expected to understand.
 */
export const CREDIT_PACKS: readonly CreditPack[] = [
  {
    id: 'credits_250',
    credits: 250,
    ngn: 2500,
    usd: 2.5,
    label: 'Small top-up',
    blurb: 'Enough to finish the month.',
  },
  {
    id: 'credits_1000',
    credits: 1000,
    ngn: 8000,
    usd: 8,
    label: 'Standard top-up',
    blurb: 'For regular reports and bulk AI work.',
    featured: true,
  },
  {
    id: 'credits_5000',
    credits: 5000,
    ngn: 35000,
    usd: 35,
    label: 'Bulk top-up',
    blurb: 'Heavy use — imports, scans, deep analysis.',
  },
] as const;

/** Look up a pack by id. Returns `undefined` for anything not in the table. */
export function creditPack(id: string | null | undefined): CreditPack | undefined {
  if (!id) return undefined;
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** Price in major units — naira, or dollars possibly with cents. */
export function packPrice(pack: CreditPack, currency: 'NGN' | 'USD'): number {
  return currency === 'USD' ? pack.usd : pack.ngn;
}

/**
 * Price in minor units — kobo or cents.
 *
 * What Paystack is initialised with and what its verify response reports, so the
 * comparison happens in integers. `$2.50 * 100` is 250 exactly, but rounding is
 * kept anyway: floating point on a price is not worth being clever about.
 */
export function packAmountMinor(pack: CreditPack, currency: 'NGN' | 'USD'): number {
  return Math.round(packPrice(pack, currency) * 100);
}

/** For a "₦8 per credit" line in the UI. Major units. */
export function pricePerCredit(pack: CreditPack, currency: 'NGN' | 'USD'): number {
  return packPrice(pack, currency) / pack.credits;
}
