import { tool } from 'ai';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Zen AI's toolkit.
 *
 * Split out of `route.ts` because it outgrew it — the route now only handles
 * auth, quotas and streaming.
 *
 * ── Two rules every tool here follows ──────────────────────────────────────
 *
 * 1. NEVER add a `.where()` that needs a composite index we do not ship in
 *    `firestore.indexes.json`. The receipts indexes cover
 *    `businessId + createdAt` (and `+ total`, `+ customer.id`) and nothing
 *    else. In particular there is NO `businessId + status + createdAt` index,
 *    so `status` is always filtered in memory. Adding it to the query makes
 *    the tool throw "The query requires an index" at runtime — which is what
 *    silently broke getSalesMetrics and getTopSellingProducts.
 *
 * 2. Every tool returns a plain object and never throws. Errors come back as
 *    `{ error }` so the model can explain them instead of killing the stream.
 *
 * Outputs carry a `type` discriminator the client switches on to render
 * generative UI (see `src/components/ai-insights/tool-renderer.tsx`):
 *   PROPOSAL       — write approval card
 *   PRODUCT_LIST   — POS-style product cards
 *   PRODUCT_PICKER — "did you mean…" disambiguation
 *   METRICS        — stat tiles
 *   TABLE          — ranked rows
 * Anything without a `type` is summarised by the model as prose.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

/** Firestore Timestamp | Date | ISO string | millis → millis (0 if unusable). */
function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return 0;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Only 'paid' receipts count as revenue. Legacy docs have no status — treat
 *  those as paid, which is how the rest of the app reads them. */
const isPaid = (r: any) => (r.status ?? 'paid') === 'paid';

const PERIOD_DAYS: Record<string, number> = {
  today: 1, yesterday: 1, last7days: 7, last30days: 30, last90days: 90, thisMonth: 31, lastMonth: 31,
};

/** Resolve a named period to an absolute [start, end) window. */
function periodRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'today':
      return { start: midnight, end: new Date(midnight.getTime() + DAY_MS), label: 'Today' };
    case 'yesterday':
      return { start: new Date(midnight.getTime() - DAY_MS), end: midnight, label: 'Yesterday' };
    case 'last7days':
      return { start: new Date(now.getTime() - 7 * DAY_MS), end: now, label: 'Last 7 days' };
    case 'last30days':
      return { start: new Date(now.getTime() - 30 * DAY_MS), end: now, label: 'Last 30 days' };
    case 'last90days':
      return { start: new Date(now.getTime() - 90 * DAY_MS), end: now, label: 'Last 90 days' };
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: 'This month' };
    case 'lastMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1),
        label: 'Last month',
      };
    default:
      return { start: midnight, end: new Date(midnight.getTime() + DAY_MS), label: 'Today' };
  }
}

/**
 * Similarity of a query to a product name, 0..1.
 *
 * Deliberately simple (no dependency): exact > prefix > substring > shared
 * word > character bigram overlap. Good enough to catch typos and short forms
 * ("cetaphil" → "Cetaphil Moisturizing Cream 250g") which is all the
 * disambiguation picker needs.
 */
function similarity(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = (target ?? '').trim().toLowerCase();
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.startsWith(q)) return 0.95;
  if (t.includes(q)) return 0.85;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);
  const shared = qWords.filter((w) => tWords.some((tw) => tw.startsWith(w) || w.startsWith(tw)));
  if (shared.length) return 0.5 + 0.3 * (shared.length / Math.max(qWords.length, 1));

  const bigrams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const a = bigrams(q);
  const b = bigrams(t);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((g) => { if (b.has(g)) overlap++; });
  return (2 * overlap) / (a.size + b.size);
}

/** Trim a product doc to what the UI card and the model actually need. */
function slimProduct(p: any) {
  return {
    id: p.id,
    name: p.name ?? 'Unnamed',
    sku: p.sku ?? null,
    category: p.category ?? null,
    categoryType: p.categoryType ?? 'product',
    price: p.price ?? 0,
    costPrice: p.costPrice ?? null,
    stock: p.stock ?? 0,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    imageUrl: p.imageUrl ?? null,
    baseUnit: p.baseUnit ?? null,
    expiryDate: p.expiryDate ? new Date(toMillis(p.expiryDate)).toISOString() : null,
  };
}

type Ctx = { db: Firestore; businessId: string; currency: string };

// ─────────────────────────────────────────────────────────────────────────────
export function createZenTools({ db, businessId, currency }: Ctx) {
  // Per-request caches. A single turn can call six tools that all need the
  // same receipts; without this that is six identical Firestore reads.
  let productCache: any[] | null = null;
  const receiptCache = new Map<number, any[]>();

  async function allProducts(): Promise<any[]> {
    if (productCache) return productCache;
    const snap = await db.collection('products').where('businessId', '==', businessId).get();
    productCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return productCache;
  }

  /** Receipts created within the last `days`. Widest window wins the cache. */
  async function receiptsSince(days: number): Promise<any[]> {
    const cached = [...receiptCache.entries()].find(([d]) => d >= days);
    if (cached) {
      const cutoff = Date.now() - days * DAY_MS;
      return cached[1].filter((r) => toMillis(r.createdAt) >= cutoff);
    }
    const start = new Date(Date.now() - days * DAY_MS);
    const snap = await db
      .collection('receipts')
      .where('businessId', '==', businessId)
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    receiptCache.set(days, rows);
    return rows;
  }

  /** Paid receipts inside an absolute window. */
  async function paidBetween(start: Date, end: Date): Promise<any[]> {
    const days = Math.max(1, Math.ceil((Date.now() - start.getTime()) / DAY_MS));
    const rows = await receiptsSince(days);
    const s = start.getTime();
    const e = end.getTime();
    return rows.filter((r) => {
      const t = toMillis(r.createdAt);
      return t >= s && t < e && isPaid(r);
    });
  }

  /** Units sold per productId over `days`, for velocity maths. */
  async function unitsSold(days: number): Promise<Map<string, number>> {
    const rows = (await receiptsSince(days)).filter(isPaid);
    const sold = new Map<string, number>();
    for (const r of rows) {
      for (const item of r.items ?? []) {
        if (!item?.productId) continue;
        sold.set(item.productId, (sold.get(item.productId) ?? 0) + (item.quantity ?? 0));
      }
    }
    return sold;
  }

  const money = (label: string, value: number, hint?: string) => ({
    label, value: round2(value), format: 'currency' as const, currency, hint,
  });
  const count = (label: string, value: number, hint?: string) => ({
    label, value, format: 'number' as const, hint,
  });
  const percent = (label: string, value: number, hint?: string) => ({
    label, value: round2(value), format: 'percent' as const, hint,
  });

  const fail = (what: string, e: any) => ({ error: `${what}: ${e?.message ?? 'unknown error'}` });

  return {
    // ═══════════════════════════════════════════════════════════════════════
    // INVENTORY — read
    // ═══════════════════════════════════════════════════════════════════════

    queryProducts: tool({
      description:
        'Search and retrieve products from inventory (stock levels, prices, categories). Returns product cards. READ-ONLY. If the user named a product loosely or you are unsure which item they mean, use findSimilarProducts instead.',
      inputSchema: z.object({
        searchTerm: z.string().optional().describe('Product name or SKU keyword.'),
        category: z.string().optional().describe('Filter by exact category.'),
        lowStockOnly: z.boolean().optional().describe('Only items at or below their low stock threshold.'),
        limit: z.number().min(1).max(50).default(12).describe('Max results.'),
      }),
      execute: async ({ searchTerm, category, lowStockOnly, limit }) => {
        try {
          let products = await allProducts();
          if (category) {
            const c = category.toLowerCase();
            products = products.filter((p) => (p.category ?? '').toLowerCase() === c);
          }
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            products = products
              .map((p) => ({ p, score: Math.max(similarity(q, p.name), (p.sku ?? '').toLowerCase() === q ? 1 : 0) }))
              .filter((x) => x.score > 0.34)
              .sort((a, b) => b.score - a.score)
              .map((x) => x.p);
          }
          if (lowStockOnly) {
            products = products.filter((p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5));
          }
          const total = products.length;
          return {
            type: 'PRODUCT_LIST',
            title: searchTerm ? `Results for "${searchTerm}"` : lowStockOnly ? 'Low stock items' : 'Inventory',
            totalMatches: total,
            shown: Math.min(total, limit ?? 12),
            currency,
            products: products.slice(0, limit ?? 12).map(slimProduct),
          };
        } catch (e: any) { return fail('Failed to query products', e); }
      },
    }),

    findSimilarProducts: tool({
      description:
        'Resolve an ambiguous product name to a specific item. Use this FIRST whenever the user names a product and you are not certain which one they mean — it returns a picker the user can click. If exactly one confident match exists it resolves automatically.',
      inputSchema: z.object({
        name: z.string().describe('The product name the user typed, verbatim.'),
        limit: z.number().min(2).max(8).default(5).describe('Max candidates to offer.'),
      }),
      execute: async ({ name, limit }) => {
        try {
          const products = await allProducts();
          const scored = products
            .map((p) => ({ product: p, score: similarity(name, p.name) }))
            .filter((x) => x.score > 0.3)
            .sort((a, b) => b.score - a.score);

          if (scored.length === 0) {
            return { type: 'PRODUCT_PICKER', query: name, resolved: false, candidates: [], note: `No product resembling "${name}" exists in this inventory.` };
          }
          // One clear winner: exact-ish, and comfortably ahead of runner-up.
          const [best, next] = scored;
          if (best.score >= 0.95 && (!next || best.score - next.score > 0.2)) {
            return { type: 'PRODUCT_LIST', title: `Matched "${name}"`, resolved: true, totalMatches: 1, shown: 1, currency, products: [slimProduct(best.product)] };
          }
          return {
            type: 'PRODUCT_PICKER',
            query: name,
            resolved: false,
            currency,
            note: 'Ask the user which one they meant before acting.',
            candidates: scored.slice(0, limit ?? 5).map((x) => ({ ...slimProduct(x.product), confidence: round2(x.score) })),
          };
        } catch (e: any) { return fail('Failed to search products', e); }
      },
    }),

    getProductDetails: tool({
      description: 'Full detail for one product by its document ID, including sales velocity and days of stock cover.',
      inputSchema: z.object({ productId: z.string().describe('Firestore document ID of the product.') }),
      execute: async ({ productId }) => {
        try {
          const doc = await db.collection('products').doc(productId).get();
          if (!doc.exists) return { error: 'Product not found.' };
          const data: any = { id: doc.id, ...doc.data() };
          if (data.businessId !== businessId) return { error: 'Product not found.' };

          const sold30 = (await unitsSold(30)).get(productId) ?? 0;
          const perDay = sold30 / 30;
          const stock = data.stock ?? 0;
          return {
            type: 'PRODUCT_LIST',
            title: data.name,
            totalMatches: 1, shown: 1, currency,
            products: [slimProduct(data)],
            velocity: {
              unitsSoldLast30Days: sold30,
              unitsPerDay: round2(perDay),
              daysOfCover: perDay > 0 ? Math.floor(stock / perDay) : null,
              margin: data.costPrice ? round2(((data.price - data.costPrice) / data.price) * 100) : null,
            },
          };
        } catch (e: any) { return fail('Failed to load product', e); }
      },
    }),

    getLowStockAlerts: tool({
      description: 'List every item at or below its low stock threshold, most urgent first.',
      inputSchema: z.object({ limit: z.number().min(1).max(60).default(25).describe('Max items to return.') }),
      execute: async ({ limit }) => {
        try {
          const items = (await allProducts())
            .filter((p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5))
            .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
          return {
            type: 'PRODUCT_LIST',
            title: 'Low stock',
            totalMatches: items.length,
            shown: Math.min(items.length, limit ?? 25),
            currency,
            products: items.slice(0, limit ?? 25).map(slimProduct),
          };
        } catch (e: any) { return fail('Failed to fetch low stock data', e); }
      },
    }),

    getInventoryValuation: tool({
      description: 'Total value of inventory on hand, at cost and at retail, with potential profit locked in stock.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const products = await allProducts();
          let atCost = 0, atRetail = 0, units = 0, missingCost = 0;
          for (const p of products) {
            const stock = Math.max(0, p.stock ?? 0);
            units += stock;
            atRetail += stock * (p.price ?? 0);
            if (p.costPrice != null) atCost += stock * p.costPrice; else missingCost++;
          }
          return {
            type: 'METRICS',
            title: 'Inventory valuation',
            tiles: [
              money('Retail value', atRetail),
              money('Cost value', atCost),
              money('Potential profit', atRetail - atCost),
              count('Units on hand', units),
              count('SKUs', products.length),
            ],
            caveat: missingCost > 0 ? `${missingCost} product(s) have no cost price, so cost value is understated.` : null,
          };
        } catch (e: any) { return fail('Failed to value inventory', e); }
      },
    }),

    getDeadStock: tool({
      description: 'Products that have not sold at all in a given number of days, with the capital tied up in them.',
      inputSchema: z.object({
        days: z.number().min(7).max(365).default(60).describe('Days with zero sales to qualify as dead.'),
        limit: z.number().min(1).max(40).default(15),
      }),
      execute: async ({ days, limit }) => {
        try {
          const sold = await unitsSold(days);
          const dead = (await allProducts())
            .filter((p) => (p.stock ?? 0) > 0 && !sold.has(p.id))
            .map((p) => ({ ...slimProduct(p), capitalTiedUp: round2((p.stock ?? 0) * (p.costPrice ?? p.price ?? 0)) }))
            .sort((a, b) => b.capitalTiedUp - a.capitalTiedUp);
          return {
            type: 'PRODUCT_LIST',
            title: `No sales in ${days} days`,
            totalMatches: dead.length,
            shown: Math.min(dead.length, limit ?? 15),
            currency,
            totalCapitalTiedUp: round2(dead.reduce((s, d) => s + d.capitalTiedUp, 0)),
            products: dead.slice(0, limit ?? 15),
          };
        } catch (e: any) { return fail('Failed to find dead stock', e); }
      },
    }),

    getExpiringProducts: tool({
      description: 'Products whose expiry date falls within the next N days, or already expired.',
      inputSchema: z.object({ withinDays: z.number().min(1).max(365).default(30) }),
      execute: async ({ withinDays }) => {
        try {
          const now = Date.now();
          const horizon = now + withinDays * DAY_MS;
          const rows = (await allProducts())
            .filter((p) => p.expiryDate && toMillis(p.expiryDate) > 0)
            .map((p) => ({ p, at: toMillis(p.expiryDate) }))
            .filter((x) => x.at <= horizon)
            .sort((a, b) => a.at - b.at)
            .map((x) => ({
              ...slimProduct(x.p),
              daysRemaining: Math.ceil((x.at - now) / DAY_MS),
              expired: x.at < now,
              valueAtRisk: round2((x.p.stock ?? 0) * (x.p.costPrice ?? x.p.price ?? 0)),
            }));
          return {
            type: 'PRODUCT_LIST',
            title: `Expiring within ${withinDays} days`,
            totalMatches: rows.length, shown: rows.length, currency,
            expiredCount: rows.filter((r) => r.expired).length,
            totalValueAtRisk: round2(rows.reduce((s, r) => s + r.valueAtRisk, 0)),
            products: rows.slice(0, 25),
          };
        } catch (e: any) { return fail('Failed to check expiry dates', e); }
      },
    }),

    getCategoryBreakdown: tool({
      description: 'Inventory split by category — SKU count, units, retail value and share of total.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const products = await allProducts();
          const byCat = new Map<string, { skus: number; units: number; value: number }>();
          for (const p of products) {
            const key = p.category || 'Uncategorised';
            const row = byCat.get(key) ?? { skus: 0, units: 0, value: 0 };
            row.skus++;
            row.units += Math.max(0, p.stock ?? 0);
            row.value += Math.max(0, p.stock ?? 0) * (p.price ?? 0);
            byCat.set(key, row);
          }
          const total = [...byCat.values()].reduce((s, r) => s + r.value, 0);
          return {
            type: 'TABLE',
            title: 'Inventory by category',
            currency,
            columns: ['Category', 'SKUs', 'Units', 'Retail value', 'Share'],
            rows: [...byCat.entries()]
              .sort((a, b) => b[1].value - a[1].value)
              .map(([name, r]) => ({
                Category: name, SKUs: r.skus, Units: r.units,
                'Retail value': round2(r.value),
                Share: total > 0 ? `${round2((r.value / total) * 100)}%` : '0%',
              })),
          };
        } catch (e: any) { return fail('Failed to break down categories', e); }
      },
    }),

    getStockCoverage: tool({
      description:
        'Days of stock remaining per product based on recent sales velocity. Flags items about to run out. Use for "what will I run out of" questions.',
      inputSchema: z.object({
        withinDays: z.number().min(1).max(90).default(14).describe('Flag items projected to run out inside this many days.'),
        limit: z.number().min(1).max(40).default(15),
      }),
      execute: async ({ withinDays, limit }) => {
        try {
          const sold = await unitsSold(30);
          const rows = (await allProducts())
            .map((p) => {
              const perDay = (sold.get(p.id) ?? 0) / 30;
              const stock = p.stock ?? 0;
              return { p, perDay, days: perDay > 0 ? stock / perDay : Infinity };
            })
            .filter((x) => x.perDay > 0 && x.days <= withinDays)
            .sort((a, b) => a.days - b.days);
          return {
            type: 'PRODUCT_LIST',
            title: `Running out within ${withinDays} days`,
            totalMatches: rows.length,
            shown: Math.min(rows.length, limit ?? 15),
            currency,
            products: rows.slice(0, limit ?? 15).map((x) => ({
              ...slimProduct(x.p),
              unitsPerDay: round2(x.perDay),
              daysOfCover: Math.floor(x.days),
            })),
          };
        } catch (e: any) { return fail('Failed to compute stock coverage', e); }
      },
    }),

    getReorderSuggestions: tool({
      description: 'Suggest what to reorder and how many units, to hold a target number of days of cover.',
      inputSchema: z.object({
        targetDaysOfCover: z.number().min(7).max(180).default(30),
        limit: z.number().min(1).max(40).default(15),
      }),
      execute: async ({ targetDaysOfCover, limit }) => {
        try {
          const sold = await unitsSold(30);
          const rows = (await allProducts())
            .map((p) => {
              const perDay = (sold.get(p.id) ?? 0) / 30;
              const target = Math.ceil(perDay * targetDaysOfCover);
              const gap = target - (p.stock ?? 0);
              return { p, perDay, target, gap, cost: gap * (p.costPrice ?? p.price ?? 0) };
            })
            .filter((x) => x.perDay > 0 && x.gap > 0)
            .sort((a, b) => b.cost - a.cost);
          return {
            type: 'TABLE',
            title: `Reorder to ${targetDaysOfCover} days of cover`,
            currency,
            estimatedTotalCost: round2(rows.reduce((s, r) => s + r.cost, 0)),
            columns: ['Product', 'In stock', 'Sells/day', 'Order', 'Est. cost'],
            rows: rows.slice(0, limit ?? 15).map((x) => ({
              Product: x.p.name, 'In stock': x.p.stock ?? 0,
              'Sells/day': round2(x.perDay), Order: x.gap, 'Est. cost': round2(x.cost),
            })),
          };
        } catch (e: any) { return fail('Failed to build reorder list', e); }
      },
    }),

    getMarginAnalysis: tool({
      description: 'Profit margin per product. Flags items sold at or below cost. Use for pricing questions.',
      inputSchema: z.object({
        sort: z.enum(['lowest', 'highest']).default('lowest').describe('Show thinnest or fattest margins first.'),
        limit: z.number().min(1).max(40).default(15),
      }),
      execute: async ({ sort, limit }) => {
        try {
          const rows = (await allProducts())
            .filter((p) => p.costPrice != null && (p.price ?? 0) > 0)
            .map((p) => ({
              name: p.name,
              price: p.price, cost: p.costPrice,
              marginPct: round2(((p.price - p.costPrice) / p.price) * 100),
              profitPerUnit: round2(p.price - p.costPrice),
            }))
            .sort((a, b) => (sort === 'lowest' ? a.marginPct - b.marginPct : b.marginPct - a.marginPct));
          const losses = rows.filter((r) => r.marginPct <= 0);
          return {
            type: 'TABLE',
            title: sort === 'lowest' ? 'Thinnest margins' : 'Best margins',
            currency,
            sellingAtALoss: losses.length,
            columns: ['Product', 'Cost', 'Price', 'Margin', 'Profit/unit'],
            rows: rows.slice(0, limit ?? 15).map((r) => ({
              Product: r.name, Cost: r.cost, Price: r.price,
              Margin: `${r.marginPct}%`, 'Profit/unit': r.profitPerUnit,
            })),
          };
        } catch (e: any) { return fail('Failed to analyse margins', e); }
      },
    }),

    getDataHealthCheck: tool({
      description:
        'Audit inventory data quality: negative stock, missing cost price, missing SKU, missing image, zero price. Use when the owner asks what is wrong with their data or why numbers look off.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const products = await allProducts();
          const negative = products.filter((p) => (p.stock ?? 0) < 0);
          const issues = {
            negativeStock: negative.length,
            missingCostPrice: products.filter((p) => p.costPrice == null).length,
            missingSku: products.filter((p) => !p.sku).length,
            missingImage: products.filter((p) => !p.imageUrl).length,
            zeroPrice: products.filter((p) => !(p.price > 0)).length,
          };
          return {
            type: 'METRICS',
            title: 'Inventory data health',
            tiles: [
              count('Negative stock', issues.negativeStock, 'Stock below zero means sales were recorded without stock in'),
              count('No cost price', issues.missingCostPrice, 'Profit cannot be computed for these'),
              count('No SKU', issues.missingSku),
              count('No image', issues.missingImage),
              count('No price', issues.zeroPrice),
            ],
            worstNegative: negative
              .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
              .slice(0, 8)
              .map((p) => ({ name: p.name, stock: p.stock })),
            totalProducts: products.length,
          };
        } catch (e: any) { return fail('Failed to check data health', e); }
      },
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // SALES
    // ═══════════════════════════════════════════════════════════════════════

    getSalesMetrics: tool({
      description: 'Revenue, profit, transaction count and average order value for a period.',
      inputSchema: z.object({
        period: z.enum(['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'thisMonth', 'lastMonth']),
      }),
      execute: async ({ period }) => {
        try {
          const { start, end, label } = periodRange(period);
          const receipts = await paidBetween(start, end);
          const revenue = receipts.reduce((s, r) => s + (r.total ?? 0), 0);
          const profit = receipts.reduce((s, r) => s + (r.profit ?? 0), 0);
          const byMethod: Record<string, number> = {};
          for (const r of receipts) {
            const m = r.paymentMethod ?? 'Unknown';
            byMethod[m] = round2((byMethod[m] ?? 0) + (r.total ?? 0));
          }
          return {
            type: 'METRICS',
            title: `Sales — ${label}`,
            tiles: [
              money('Revenue', revenue),
              money('Profit', profit),
              count('Transactions', receipts.length),
              money('Avg order', receipts.length ? revenue / receipts.length : 0),
              percent('Margin', revenue > 0 ? (profit / revenue) * 100 : 0),
            ],
            byPaymentMethod: byMethod,
          };
        } catch (e: any) { return fail('Failed to get sales metrics', e); }
      },
    }),

    getSalesTrend: tool({
      description: 'Day-by-day revenue and transaction counts over a period. Use to describe trends and spot spikes or dips.',
      inputSchema: z.object({ days: z.number().min(2).max(90).default(14) }),
      execute: async ({ days }) => {
        try {
          const receipts = (await receiptsSince(days)).filter(isPaid);
          const buckets = new Map<string, { revenue: number; transactions: number }>();
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * DAY_MS);
            buckets.set(d.toISOString().slice(0, 10), { revenue: 0, transactions: 0 });
          }
          for (const r of receipts) {
            const key = new Date(toMillis(r.createdAt)).toISOString().slice(0, 10);
            const b = buckets.get(key);
            if (b) { b.revenue = round2(b.revenue + (r.total ?? 0)); b.transactions++; }
          }
          const series = [...buckets.entries()].map(([date, v]) => ({ date, ...v }));
          const revenues = series.map((s) => s.revenue);
          const best = series[revenues.indexOf(Math.max(...revenues))];
          return {
            type: 'TABLE',
            title: `Daily sales — last ${days} days`,
            currency,
            bestDay: best ? { date: best.date, revenue: best.revenue } : null,
            total: round2(revenues.reduce((s, v) => s + v, 0)),
            columns: ['date', 'revenue', 'transactions'],
            rows: series,
          };
        } catch (e: any) { return fail('Failed to build sales trend', e); }
      },
    }),

    comparePeriods: tool({
      description: 'Compare a period against the one immediately before it — revenue, profit and transaction growth.',
      inputSchema: z.object({ period: z.enum(['today', 'last7days', 'last30days', 'thisMonth']) }),
      execute: async ({ period }) => {
        try {
          const { start, end, label } = periodRange(period);
          const span = end.getTime() - start.getTime();
          const prevStart = new Date(start.getTime() - span);
          const [current, previous] = await Promise.all([
            paidBetween(start, end),
            paidBetween(prevStart, start),
          ]);
          const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
          const growth = (a: number, b: number) => (b > 0 ? round2(((a - b) / b) * 100) : a > 0 ? 100 : 0);
          const curRev = sum(current, 'total'), prevRev = sum(previous, 'total');
          const curProfit = sum(current, 'profit'), prevProfit = sum(previous, 'profit');
          return {
            type: 'METRICS',
            title: `${label} vs previous`,
            tiles: [
              money('Revenue', curRev, `was ${round2(prevRev)}`),
              percent('Revenue growth', growth(curRev, prevRev)),
              money('Profit', curProfit, `was ${round2(prevProfit)}`),
              count('Transactions', current.length, `was ${previous.length}`),
              percent('Transaction growth', growth(current.length, previous.length)),
            ],
          };
        } catch (e: any) { return fail('Failed to compare periods', e); }
      },
    }),

    getTopSellingProducts: tool({
      description: 'Best sellers ranked by units sold or revenue generated.',
      inputSchema: z.object({
        period: z.enum(['today', 'last7days', 'last30days', 'last90days', 'thisMonth']),
        rankBy: z.enum(['quantity', 'revenue']).default('revenue'),
        topN: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ period, rankBy, topN }) => {
        try {
          const { start, end, label } = periodRange(period);
          const receipts = await paidBetween(start, end);
          const totals = new Map<string, { name: string; quantity: number; revenue: number }>();
          for (const r of receipts) {
            for (const item of r.items ?? []) {
              if (!item?.productId) continue;
              const row = totals.get(item.productId) ?? { name: item.name ?? 'Unknown', quantity: 0, revenue: 0 };
              row.quantity += item.quantity ?? 0;
              row.revenue += (item.price ?? 0) * (item.quantity ?? 0);
              totals.set(item.productId, row);
            }
          }
          const ranked = [...totals.entries()]
            .sort(([, a], [, b]) => (rankBy === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue))
            .slice(0, topN ?? 10);
          return {
            type: 'TABLE',
            title: `Top sellers — ${label}`,
            currency,
            columns: ['#', 'Product', 'Units', 'Revenue'],
            rows: ranked.map(([, r], i) => ({ '#': i + 1, Product: r.name, Units: r.quantity, Revenue: round2(r.revenue) })),
          };
        } catch (e: any) { return fail('Failed to get top products', e); }
      },
    }),

    getWorstSellingProducts: tool({
      description: 'Slowest-moving products that DID sell at least once in the period — the tail end of the catalogue.',
      inputSchema: z.object({
        period: z.enum(['last7days', 'last30days', 'last90days']).default('last30days'),
        topN: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ period, topN }) => {
        try {
          const { start, end, label } = periodRange(period);
          const receipts = await paidBetween(start, end);
          const totals = new Map<string, { name: string; quantity: number; revenue: number }>();
          for (const r of receipts) {
            for (const item of r.items ?? []) {
              if (!item?.productId) continue;
              const row = totals.get(item.productId) ?? { name: item.name ?? 'Unknown', quantity: 0, revenue: 0 };
              row.quantity += item.quantity ?? 0;
              row.revenue += (item.price ?? 0) * (item.quantity ?? 0);
              totals.set(item.productId, row);
            }
          }
          const ranked = [...totals.values()].sort((a, b) => a.quantity - b.quantity).slice(0, topN ?? 10);
          return {
            type: 'TABLE',
            title: `Slowest movers — ${label}`,
            currency,
            note: 'Products with zero sales are not listed here — use getDeadStock for those.',
            columns: ['Product', 'Units', 'Revenue'],
            rows: ranked.map((r) => ({ Product: r.name, Units: r.quantity, Revenue: round2(r.revenue) })),
          };
        } catch (e: any) { return fail('Failed to get slow movers', e); }
      },
    }),

    getPeakHours: tool({
      description: 'Busiest hours of the day and days of the week by revenue — for staffing and opening-hours decisions.',
      inputSchema: z.object({ days: z.number().min(7).max(90).default(30) }),
      execute: async ({ days }) => {
        try {
          const receipts = (await receiptsSince(days)).filter(isPaid);
          const hours = Array.from({ length: 24 }, () => ({ revenue: 0, transactions: 0 }));
          const dow = Array.from({ length: 7 }, () => ({ revenue: 0, transactions: 0 }));
          for (const r of receipts) {
            const d = new Date(toMillis(r.createdAt));
            const h = hours[d.getHours()];
            h.revenue = round2(h.revenue + (r.total ?? 0)); h.transactions++;
            const w = dow[d.getDay()];
            w.revenue = round2(w.revenue + (r.total ?? 0)); w.transactions++;
          }
          const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const busiestHour = hours.reduce((best, h, i) => (h.revenue > hours[best].revenue ? i : best), 0);
          const busiestDay = dow.reduce((best, d, i) => (d.revenue > dow[best].revenue ? i : best), 0);
          return {
            type: 'TABLE',
            title: `Trading patterns — last ${days} days`,
            currency,
            busiestHour: `${String(busiestHour).padStart(2, '0')}:00`,
            busiestDay: names[busiestDay],
            columns: ['Day', 'Revenue', 'Transactions'],
            rows: dow.map((d, i) => ({ Day: names[i], Revenue: d.revenue, Transactions: d.transactions })),
            hourly: hours.map((h, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, ...h })).filter((h) => h.transactions > 0),
          };
        } catch (e: any) { return fail('Failed to compute peak hours', e); }
      },
    }),

    getRecentTransactions: tool({
      description: 'The most recent sales, newest first, with items and payment method.',
      inputSchema: z.object({ limit: z.number().min(1).max(25).default(10) }),
      execute: async ({ limit }) => {
        try {
          const rows = (await receiptsSince(30))
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
            .slice(0, limit ?? 10);
          return {
            type: 'TABLE',
            title: 'Recent transactions',
            currency,
            columns: ['When', 'Receipt', 'Items', 'Total', 'Method', 'Status'],
            rows: rows.map((r) => ({
              When: new Date(toMillis(r.createdAt)).toISOString(),
              Receipt: r.receiptNumber ?? r.id.slice(0, 8),
              Items: (r.items ?? []).length,
              Total: round2(r.total ?? 0),
              Method: r.paymentMethod ?? '—',
              Status: r.status ?? 'paid',
            })),
          };
        } catch (e: any) { return fail('Failed to load transactions', e); }
      },
    }),

    getUnpaidInvoices: tool({
      description: 'Outstanding receipts that are unpaid or pending — money owed to the business.',
      inputSchema: z.object({ days: z.number().min(7).max(365).default(90) }),
      execute: async ({ days }) => {
        try {
          const rows = (await receiptsSince(days))
            .filter((r) => r.status === 'unpaid' || r.status === 'pending')
            .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
          const owed = rows.reduce((s, r) => s + (r.total ?? 0), 0);
          return {
            type: 'TABLE',
            title: 'Outstanding payments',
            currency,
            totalOwed: round2(owed),
            count: rows.length,
            columns: ['Age (days)', 'Receipt', 'Customer', 'Amount', 'Status'],
            rows: rows.slice(0, 25).map((r) => ({
              'Age (days)': Math.floor((Date.now() - toMillis(r.createdAt)) / DAY_MS),
              Receipt: r.receiptNumber ?? r.id.slice(0, 8),
              Customer: r.customer?.name ?? 'Walk-in',
              Amount: round2(r.total ?? 0),
              Status: r.status,
            })),
          };
        } catch (e: any) { return fail('Failed to load unpaid invoices', e); }
      },
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // CUSTOMERS
    // ═══════════════════════════════════════════════════════════════════════

    queryCustomer: tool({
      description: 'Find a customer by name or email. Returns profile, loyalty points and total spent.',
      inputSchema: z.object({ searchTerm: z.string().describe('Name, email or phone.') }),
      execute: async ({ searchTerm }) => {
        try {
          const lower = searchTerm.toLowerCase();
          const byName = await db.collection('customers')
            .where('businessId', '==', businessId)
            .where('lowercaseName', '>=', lower)
            .where('lowercaseName', '<=', lower + '')
            .limit(5).get();

          const map = (d: any) => {
            const c = d.data();
            return {
              id: d.id, name: c.name, email: c.email, phone: c.phone ?? null,
              loyaltyPoints: c.loyaltyPoints ?? 0, totalSpent: c.totalSpent ?? 0,
              lastPurchaseDate: c.lastPurchaseDate ? new Date(toMillis(c.lastPurchaseDate)).toISOString() : null,
            };
          };
          const results = byName.docs.map(map);
          if (results.length === 0) {
            const byEmail = await db.collection('customers')
              .where('businessId', '==', businessId)
              .where('lowercaseEmail', '==', lower)
              .limit(3).get();
            results.push(...byEmail.docs.map(map));
          }
          return { count: results.length, customers: results, currency };
        } catch (e: any) { return fail('Failed to query customers', e); }
      },
    }),

    getTopCustomers: tool({
      description: 'Highest-spending customers, ranked by lifetime spend.',
      inputSchema: z.object({ limit: z.number().min(1).max(25).default(10) }),
      execute: async ({ limit }) => {
        try {
          const snap = await db.collection('customers')
            .where('businessId', '==', businessId)
            .orderBy('totalSpent', 'desc')
            .limit(limit ?? 10).get();
          return {
            type: 'TABLE',
            title: 'Top customers',
            currency,
            columns: ['#', 'Customer', 'Total spent', 'Loyalty points'],
            rows: snap.docs.map((d, i) => {
              const c = d.data();
              return { '#': i + 1, Customer: c.name, 'Total spent': round2(c.totalSpent ?? 0), 'Loyalty points': c.loyaltyPoints ?? 0 };
            }),
          };
        } catch (e: any) { return fail('Failed to load top customers', e); }
      },
    }),

    getCustomerPurchaseHistory: tool({
      description: 'Every recorded purchase for one customer, newest first.',
      inputSchema: z.object({
        customerId: z.string().describe('Firestore document ID of the customer.'),
        limit: z.number().min(1).max(30).default(15),
      }),
      execute: async ({ customerId, limit }) => {
        try {
          const snap = await db.collection('receipts')
            .where('businessId', '==', businessId)
            .where('customer.id', '==', customerId)
            .orderBy('createdAt', 'desc')
            .limit(limit ?? 15).get();
          const rows = snap.docs.map((d) => d.data());
          return {
            type: 'TABLE',
            title: 'Purchase history',
            currency,
            lifetimeValue: round2(rows.reduce((s, r) => s + (r.total ?? 0), 0)),
            columns: ['When', 'Items', 'Total', 'Method'],
            rows: rows.map((r) => ({
              When: new Date(toMillis(r.createdAt)).toISOString(),
              Items: (r.items ?? []).map((i: any) => `${i.quantity}× ${i.name}`).join(', '),
              Total: round2(r.total ?? 0),
              Method: r.paymentMethod ?? '—',
            })),
          };
        } catch (e: any) { return fail('Failed to load purchase history', e); }
      },
    }),

    getAtRiskCustomers: tool({
      description: 'Previously active customers who have not purchased in a long time — win-back candidates.',
      inputSchema: z.object({
        inactiveDays: z.number().min(14).max(365).default(60),
        limit: z.number().min(1).max(30).default(15),
      }),
      execute: async ({ inactiveDays, limit }) => {
        try {
          const cutoff = Date.now() - inactiveDays * DAY_MS;
          const snap = await db.collection('customers').where('businessId', '==', businessId).get();
          const rows = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((c) => (c.totalSpent ?? 0) > 0 && c.lastPurchaseDate && toMillis(c.lastPurchaseDate) < cutoff)
            .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0));
          return {
            type: 'TABLE',
            title: `No purchase in ${inactiveDays}+ days`,
            currency,
            atRiskCount: rows.length,
            revenueAtRisk: round2(rows.reduce((s, c) => s + (c.totalSpent ?? 0), 0)),
            columns: ['Customer', 'Last purchase', 'Days ago', 'Lifetime spend'],
            rows: rows.slice(0, limit ?? 15).map((c) => ({
              Customer: c.name,
              'Last purchase': new Date(toMillis(c.lastPurchaseDate)).toISOString().slice(0, 10),
              'Days ago': Math.floor((Date.now() - toMillis(c.lastPurchaseDate)) / DAY_MS),
              'Lifetime spend': round2(c.totalSpent ?? 0),
            })),
          };
        } catch (e: any) { return fail('Failed to find at-risk customers', e); }
      },
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════

    getBranchPerformance: tool({
      description: 'Revenue and transaction count per branch. Only useful when multi-branch is enabled.',
      inputSchema: z.object({ period: z.enum(['today', 'last7days', 'last30days', 'thisMonth']).default('last30days') }),
      execute: async ({ period }) => {
        try {
          const { start, end, label } = periodRange(period);
          const [receipts, branchSnap] = await Promise.all([
            paidBetween(start, end),
            db.collection('branches').where('businessId', '==', businessId).get(),
          ]);
          const names = new Map(branchSnap.docs.map((d) => [d.id, (d.data() as any).name]));
          const totals = new Map<string, { revenue: number; transactions: number }>();
          for (const r of receipts) {
            const key = r.branchId ?? 'unassigned';
            const row = totals.get(key) ?? { revenue: 0, transactions: 0 };
            row.revenue = round2(row.revenue + (r.total ?? 0)); row.transactions++;
            totals.set(key, row);
          }
          return {
            type: 'TABLE',
            title: `Branch performance — ${label}`,
            currency,
            columns: ['Branch', 'Revenue', 'Transactions', 'Avg order'],
            rows: [...totals.entries()]
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([id, r]) => ({
                Branch: names.get(id) ?? (id === 'unassigned' ? 'Unassigned' : id),
                Revenue: r.revenue, Transactions: r.transactions,
                'Avg order': round2(r.transactions ? r.revenue / r.transactions : 0),
              })),
          };
        } catch (e: any) { return fail('Failed to load branch performance', e); }
      },
    }),

    getStaffPerformance: tool({
      description: 'Sales attributed to each staff member over a period, by the user who rang up the sale.',
      inputSchema: z.object({ period: z.enum(['today', 'last7days', 'last30days', 'thisMonth']).default('last30days') }),
      execute: async ({ period }) => {
        try {
          const { start, end, label } = periodRange(period);
          const [receipts, userSnap] = await Promise.all([
            paidBetween(start, end),
            db.collection('users').where('businessId', '==', businessId).get(),
          ]);
          const names = new Map(userSnap.docs.map((d) => [d.id, (d.data() as any).name]));
          const totals = new Map<string, { revenue: number; transactions: number }>();
          for (const r of receipts) {
            const key = r.createdBy ?? 'unknown';
            const row = totals.get(key) ?? { revenue: 0, transactions: 0 };
            row.revenue = round2(row.revenue + (r.total ?? 0)); row.transactions++;
            totals.set(key, row);
          }
          return {
            type: 'TABLE',
            title: `Staff performance — ${label}`,
            currency,
            columns: ['Staff', 'Revenue', 'Transactions', 'Avg order'],
            rows: [...totals.entries()]
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([id, r]) => ({
                Staff: names.get(id) ?? (id === 'unknown' ? 'Unattributed' : id),
                Revenue: r.revenue, Transactions: r.transactions,
                'Avg order': round2(r.transactions ? r.revenue / r.transactions : 0),
              })),
          };
        } catch (e: any) { return fail('Failed to load staff performance', e); }
      },
    }),

    getAuditTrail: tool({
      description: 'Recent audit log entries — who changed what and when. Use for "who edited this" or suspicious-activity questions.',
      inputSchema: z.object({
        limit: z.number().min(1).max(40).default(20),
        action: z.string().optional().describe('Filter by action prefix, e.g. "product." or "sale.void".'),
      }),
      execute: async ({ limit, action }) => {
        try {
          // No (businessId, createdAt) composite index exists for auditLogs —
          // only single-field overrides — so this must not orderBy in the
          // query. Sort in memory instead. See the header note.
          const snap = await db.collection('auditLogs')
            .where('businessId', '==', businessId)
            .limit(400).get();
          let rows = snap.docs
            .map((d) => d.data() as any)
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
          if (action) rows = rows.filter((r) => (r.action ?? '').startsWith(action));
          rows = rows.slice(0, limit ?? 20);
          return {
            type: 'TABLE',
            title: 'Audit trail',
            columns: ['When', 'User', 'Action', 'Entity'],
            rows: rows.map((r) => ({
              When: new Date(toMillis(r.createdAt)).toISOString(),
              User: r.userName ?? r.userEmail ?? r.userId,
              Action: r.action,
              Entity: `${r.entityType ?? ''} ${r.entityId ?? ''}`.trim(),
            })),
          };
        } catch (e: any) { return fail('Failed to load audit trail', e); }
      },
    }),

    getBusinessOverview: tool({
      description:
        'One-shot health snapshot: today and this month revenue, inventory value, low stock count, data issues. Use for open-ended questions like "how is my business doing".',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const today = periodRange('today');
          const month = periodRange('thisMonth');
          const [todayRows, monthRows, products] = await Promise.all([
            paidBetween(today.start, today.end),
            paidBetween(month.start, month.end),
            allProducts(),
          ]);
          const sum = (rows: any[], k: string) => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
          const retail = products.reduce((s, p) => s + Math.max(0, p.stock ?? 0) * (p.price ?? 0), 0);
          const low = products.filter((p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5)).length;
          const negative = products.filter((p) => (p.stock ?? 0) < 0).length;
          return {
            type: 'METRICS',
            title: 'Business snapshot',
            tiles: [
              money('Revenue today', sum(todayRows, 'total')),
              count('Sales today', todayRows.length),
              money('Revenue this month', sum(monthRows, 'total')),
              money('Profit this month', sum(monthRows, 'profit')),
              money('Stock at retail', retail),
              count('Low stock items', low),
            ],
            flags: [
              low > 0 ? `${low} item(s) at or below the low stock threshold.` : null,
              negative > 0 ? `${negative} item(s) have negative stock — the inventory data needs correcting.` : null,
            ].filter(Boolean),
            totalProducts: products.length,
          };
        } catch (e: any) { return fail('Failed to build overview', e); }
      },
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // WRITES — proposals only. Nothing here touches the database.
    // ═══════════════════════════════════════════════════════════════════════

    proposeStockAdjustment: tool({
      description: 'Propose a stock quantity change. Streams an approval card. Does NOT write to the database.',
      inputSchema: z.object({
        productId: z.string(), productName: z.string(),
        currentStock: z.number(), newStock: z.number().min(0),
        reason: z.string().describe('Why this change is needed.'),
      }),
      execute: async (p) => {
        if (p.newStock < 0) return { error: 'Cannot set stock to a negative value.' };
        return {
          type: 'PROPOSAL', action: 'STOCK_ADJUSTMENT',
          proposalId: `prop_stock_${p.productId}_${p.newStock}`,
          productId: p.productId, productName: p.productName,
          currentValue: p.currentStock, newValue: p.newStock,
          change: p.newStock - p.currentStock, reason: p.reason,
          status: 'PENDING_APPROVAL', currency,
        };
      },
    }),

    proposePriceChange: tool({
      description: 'Propose a selling price change. Streams an approval card. Does NOT write to the database.',
      inputSchema: z.object({
        productId: z.string(), productName: z.string(),
        currentPrice: z.number(), newPrice: z.number().min(0.01),
        reason: z.string(),
      }),
      execute: async (p) => {
        if (p.newPrice <= 0) return { error: 'Price must be a positive number.' };
        if (p.currentPrice <= 0) return { error: 'Current price is zero or missing, so the change cannot be validated.' };
        const changePercent = round2(((p.newPrice - p.currentPrice) / p.currentPrice) * 100);
        if (Math.abs(changePercent) > 200) {
          return { error: `Blocked: a ${changePercent}% price change is unusually large. Verify the figure and propose a smaller adjustment.` };
        }
        return {
          type: 'PROPOSAL', action: 'PRICE_CHANGE',
          proposalId: `prop_price_${p.productId}_${p.newPrice}`,
          productId: p.productId, productName: p.productName,
          currentValue: p.currentPrice, newValue: p.newPrice,
          changePercent, reason: p.reason,
          status: 'PENDING_APPROVAL', currency,
        };
      },
    }),

    proposeLoyaltyAdjustment: tool({
      description: 'Propose adding or deducting customer loyalty points. Requires approval.',
      inputSchema: z.object({
        customerId: z.string(), customerName: z.string(),
        currentPoints: z.number(), pointsChange: z.number(),
        reason: z.string(),
      }),
      execute: async (p) => {
        const newPoints = p.currentPoints + p.pointsChange;
        if (newPoints < 0) {
          return { error: `Cannot deduct ${Math.abs(p.pointsChange)} points — the customer only has ${p.currentPoints}.` };
        }
        return {
          type: 'PROPOSAL', action: 'LOYALTY_ADJUSTMENT',
          proposalId: `prop_loyalty_${p.customerId}_${newPoints}`,
          customerId: p.customerId, customerName: p.customerName,
          currentValue: p.currentPoints, newValue: newPoints,
          change: p.pointsChange, reason: p.reason,
          status: 'PENDING_APPROVAL', currency,
        };
      },
    }),

    proposeRestock: tool({
      description:
        'Propose raising a product\'s stock by a given number of units, e.g. after a delivery arrives. Requires approval.',
      inputSchema: z.object({
        productId: z.string(), productName: z.string(),
        currentStock: z.number(), unitsToAdd: z.number().min(1),
        reason: z.string(),
      }),
      execute: async (p) => {
        const newStock = p.currentStock + p.unitsToAdd;
        return {
          type: 'PROPOSAL', action: 'STOCK_ADJUSTMENT',
          proposalId: `prop_restock_${p.productId}_${newStock}`,
          productId: p.productId, productName: p.productName,
          currentValue: p.currentStock, newValue: newStock,
          change: p.unitsToAdd, reason: p.reason,
          status: 'PENDING_APPROVAL', currency,
        };
      },
    }),

    proposeLowStockThreshold: tool({
      description: 'Propose changing the low-stock alert threshold for a product. Requires approval.',
      inputSchema: z.object({
        productId: z.string(), productName: z.string(),
        currentThreshold: z.number(), newThreshold: z.number().min(0),
        reason: z.string(),
      }),
      execute: async (p) => ({
        type: 'PROPOSAL', action: 'THRESHOLD_CHANGE',
        proposalId: `prop_threshold_${p.productId}_${p.newThreshold}`,
        productId: p.productId, productName: p.productName,
        currentValue: p.currentThreshold, newValue: p.newThreshold,
        change: p.newThreshold - p.currentThreshold, reason: p.reason,
        status: 'PENDING_APPROVAL', currency,
      }),
    }),
  };
}
