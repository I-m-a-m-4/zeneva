/**
 * What a Zen AI turn costs, and the reference figures the admin board compares
 * against.
 *
 * Kept out of `ai-analytics.ts` on purpose: that module is imported by the chat
 * route on every turn, and nothing here is needed to *record* a turn — only to
 * read one back. This is a pricing sheet, not part of the hot path.
 *
 * ## These are list prices, not your invoice
 *
 * The rates below are Google's published per-token prices for the model the
 * route actually calls. Real spend differs, and always downward:
 *
 *   - context caching bills repeated prompt prefixes at a large discount, and
 *     Zen AI resends a long system prompt on every turn, so this is the big one;
 *   - free-tier allowance is not modelled at all.
 *
 * So treat every money figure on the board as a **ceiling** — "no more than
 * this" — which is the useful direction for a bill you are trying not to be
 * surprised by. The board labels them that way rather than as an actual charge,
 * because a number that says "$4.10" next to an invoice reading $1.60 destroys
 * trust in the whole page.
 *
 * When the model in `src/app/api/chat/route.ts` changes, change `ZEN_MODEL`
 * here in the same commit — a stale rate is worse than no rate.
 */

/** The model `src/app/api/chat/route.ts` passes to `streamText`. */
export const ZEN_MODEL = {
  id: 'gemini-2.5-flash',
  label: 'Gemini 2.5 Flash',
  vendor: 'Google',
  /** USD per 1M tokens, list price, text in / text out. */
  inputPerMillion: 0.3,
  outputPerMillion: 2.5,
  /** Total context the model accepts, in tokens. */
  contextWindow: 1_000_000,
  /**
   * Published rates change without notice. The board shows this date so a
   * figure that drifted is visibly stale rather than quietly wrong.
   */
  ratesCheckedOn: '2026-08-11',
  pricingUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
} as const;

/** Ceiling cost in USD for a given split of input and output tokens. */
export function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  return (
    (tokensIn / 1_000_000) * ZEN_MODEL.inputPerMillion +
    (tokensOut / 1_000_000) * ZEN_MODEL.outputPerMillion
  );
}

/**
 * Money at the scale this board deals in.
 *
 * Sub-cent totals are the normal case for a single tenant on a quiet day, and
 * rounding those to "$0.00" reads as "free" when the honest answer is "too
 * small to bill". Extra precision only appears where it carries information.
 */
export function formatUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `<$0.01`;
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString()}`;
}

/** Compact token counts: 1_250_000 → "1.25M", 165_000 → "165.0k". */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

/**
 * Percentage change against a previous period.
 *
 * Returns `null` when the previous period is zero rather than the infinity a
 * naive divide produces. There is no honest percentage for "0 → 9": it is new
 * activity, and the board says that in words instead of drawing "+900%".
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Direction of travel, in terms of whether it is *good*.
 *
 * Rising turns are healthy; rising errors are not. The caller says which kind
 * of metric it is holding, because the number itself cannot know.
 */
export function deltaTone(
  change: number | null,
  higherIsBetter: boolean,
): 'up-good' | 'up-bad' | 'down-good' | 'down-bad' | 'flat' {
  if (change === null || Math.abs(change) < 0.5) return 'flat';
  const rising = change > 0;
  if (rising) return higherIsBetter ? 'up-good' : 'up-bad';
  return higherIsBetter ? 'down-bad' : 'down-good';
}
