'use client';

/**
 * Client half of the importer's AI.
 *
 * Every call goes through `apiBase()`, so the web app hits its own origin and the
 * desktop/Android/iOS shells hit the hosted deployment — a relative fetch in a
 * Tauri build resolves against `tauri://localhost` and 404s, and a hardcoded
 * `https://zeneva.space` on the web sends every `npm run dev` request to
 * production.
 *
 * The two things worth knowing before adding a call here:
 *
 * 1. **Nothing this module returns is trusted.** Each response is fed back into the
 *    pure functions in this folder — `applyAiMapping`, `applyAiMatches`,
 *    `previewBulkOp` — which constrain it to what the deterministic pass already
 *    established. The model is a suggestion engine, not an authority.
 * 2. **Every call spends the shop's money.** So each one is triggered by an explicit
 *    press with a quote next to it, never by an effect. `AiCreditsError` carries the
 *    balance back so the UI can offer a top-up instead of a stack trace.
 */

import { apiBase } from '@/lib/platform';
import { idToken } from '@/lib/id-token';
import type { ImportAiAction } from './pricing';
import type { ImportField } from './types';
import type { BulkFilter, BulkField, BulkMode } from './bulk-ops';

/** Raised on 402, so a caller can show a balance and a top-up rather than an error. */
export class AiCreditsError extends Error {
  readonly code = 'credits_exhausted' as const;
  readonly remaining: number;
  readonly hint?: string;

  constructor(message: string, remaining: number, hint?: string) {
    super(message);
    this.name = 'AiCreditsError';
    this.remaining = remaining;
    this.hint = hint;
  }
}

/** Raised for everything else, already worded for a human. */
export class ImportAiError extends Error {}

/** What the server charged, echoed on every successful response. */
export type CreditReceipt = { charged: number; remaining: number };

async function call<T>(action: ImportAiAction, payload: Record<string, unknown>): Promise<T & { credits?: CreditReceipt }> {
  const token = await idToken();
  if (!token) throw new ImportAiError('You are signed out. Sign in again to use AI import.');

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    // A native shell with no connection lands here. Worth naming the offline case
    // explicitly, because the free paths still work and the owner should be told so.
    throw new ImportAiError(
      'Could not reach Zeneva. AI import needs a connection — Excel, CSV and paste imports work offline.',
    );
  }

  // A route that is missing or misnamed answers with the HTML 404 page, and
  // `response.json()` on `<!DOCTYPE html>` reports a JSON syntax error that sends
  // you looking in the wrong place entirely. See the API routes section of
  // CLAUDE.md — this check turns that into a sentence naming the real cause.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ImportAiError(
      `AI import is not available on this deployment (the server answered ${response.status} with ${contentType || 'no content type'}).`,
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 402) {
      throw new AiCreditsError(
        body?.error ?? 'You are out of AI credits.',
        Number(body?.quote?.remaining) || 0,
        body?.hint,
      );
    }
    throw new ImportAiError(body?.error ?? `AI import failed (${response.status}).`);
  }

  return body as T & { credits?: CreditReceipt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

/** A row exactly as the model described it — all values still raw text. */
export type AiRow = {
  name: string;
  sku?: string;
  category?: string;
  price?: string;
  costPrice?: string;
  stock?: string;
  unit?: string;
  expiryDate?: string;
};

export type AiRowsResponse = {
  rows: AiRow[];
  intent?: 'restock' | 'replace' | null;
  note?: string | null;
  credits?: CreditReceipt;
};

/**
 * Ask the model what unrecognised columns mean.
 *
 * `columns` should be **only** the ones the deterministic pass could not place.
 * Sending all of them costs no more but invites the model to contradict a mapping
 * that was already certain, and `applyAiMapping` would then discard the answer
 * anyway — so the request would have been paid for and thrown away.
 */
export function aiMapColumns(
  columns: { index: number; header: string }[],
  samples: string[][],
): Promise<{ mappings: { index: number; field: ImportField | null }[]; credits?: CreditReceipt }> {
  return call('map-columns', { columns, samples });
}

export function aiParseText(text: string, currency?: string): Promise<AiRowsResponse> {
  return call('parse-text', { text, currency });
}

/**
 * Read products off a photograph.
 *
 * `kind` picks the prompt, and the difference is not cosmetic: on an invoice the
 * money is what the shop **paid** and belongs in `costPrice`, while on a shelf photo
 * a legible price tag is what they **sell** for. Getting that backwards would set
 * every selling price to the wholesale price.
 *
 * `categories` lets the model reuse a category the shop already has instead of
 * inventing a parallel one, which is how a catalogue ends up with both "Drinks" and
 * "Beverages".
 */
export function aiParseImage(
  kind: 'photo' | 'invoice',
  imageBase64: string,
  opts: { mimeType?: string; currency?: string; categories?: string[] } = {},
): Promise<AiRowsResponse> {
  return call(kind === 'invoice' ? 'parse-invoice' : 'parse-photo', {
    imageBase64,
    mimeType: opts.mimeType,
    currency: opts.currency,
    categories: opts.categories,
  });
}

export function aiMatchProducts(
  items: { key: string; name: string; candidates: { productId: string; name: string; sku?: string }[] }[],
): Promise<{ verdicts: { key: string; productId: string | null }[]; credits?: CreditReceipt }> {
  return call('match', { items });
}

/**
 * Turn an instruction into a bulk operation, or a refusal.
 *
 * `useSelection` comes back as a flag rather than a list of ids: the client owns
 * the selection and substitutes it, so the model never gets to name which products
 * an edit touches.
 */
export function aiBulkOp(
  instruction: string,
  context: { categories?: string[]; selectedCount?: number; currency?: string } = {},
): Promise<{
  op?: { field: BulkField; mode: BulkMode; filter: BulkFilter; useSelection?: boolean };
  explanation?: string;
  refusal?: string;
  credits?: CreditReceipt;
}> {
  return call('bulk-op', { instruction, ...context });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bridging AI rows into the shared pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Turn model rows into a `RawTable`, so they go through the same coercion as a
 * spreadsheet.
 *
 * This is the bit that keeps six sources honest. Rows read off a photograph are not
 * parsed by the photograph code path — they are turned into a table with known
 * headers and handed to `mapColumns` and `buildDrafts` like anything else. So
 * `₦12,000` from a photo, from a paste and from Excel all become 12000 by the same
 * rule, and a fix to the money parser fixes all three at once.
 *
 * The header row is fixed and recognised by the alias table, so the mapping step
 * that follows is free and cannot need AI a second time.
 */
export function aiRowsToTable(rows: AiRow[], label: string) {
  const headers = ['Name', 'SKU', 'Category', 'Price', 'Cost Price', 'Stock', 'Unit', 'Expiry Date'];
  return {
    headers,
    rows: rows.map((row) => [
      row.name ?? '',
      row.sku ?? '',
      row.category ?? '',
      row.price ?? '',
      row.costPrice ?? '',
      row.stock ?? '',
      row.unit ?? '',
      row.expiryDate ?? '',
    ]),
    hasHeaderRow: true,
    label,
  };
}
