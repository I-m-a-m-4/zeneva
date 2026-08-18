'use client';

import * as React from 'react';
import { ZenMark } from './zen-mark';

/**
 * The "working" indicator.
 *
 * "Thinking..." says nothing about a retail system, so the copy is drawn from
 * POS/inventory vocabulary instead. When a tool is actually running we know
 * what it is doing and say so exactly; only the gap before the first tool call
 * uses the rotating generic lines.
 */

/** Shown while the model is deciding — no tool has been called yet. */
const IDLE_LINES = [
  'Reading the shelves',
  'Pulling the day book',
  'Cross-checking the ledger',
  'Counting stock on hand',
  'Running the numbers',
  'Reconciling the till',
  'Checking movement history',
  'Walking the aisles',
  'Auditing the shelf edge',
  'Tallying receipts',
];

/**
 * Exact copy per tool. Keys must match the tool names exported from
 * `src/app/api/chat/tools.ts` — an unlisted tool falls back to its own name,
 * which looks unfinished, so add new tools here too.
 */
const TOOL_LINES: Record<string, string> = {
  queryProducts: 'Scanning inventory',
  findSimilarProducts: 'Matching product names',
  showProductImage: 'Fetching the product photo',
  getProductDetails: 'Pulling the product record',
  getLowStockAlerts: 'Checking shelf levels',
  getInventoryValuation: 'Valuing stock on hand',
  getDeadStock: 'Hunting dead stock',
  getExpiringProducts: 'Checking expiry dates',
  getCategoryBreakdown: 'Grouping by category',
  getStockCoverage: 'Projecting days of cover',
  getReorderSuggestions: 'Building a reorder list',
  getMarginAnalysis: 'Working out margins',
  getDataHealthCheck: 'Auditing inventory data',
  getSalesMetrics: 'Totalling the takings',
  getDailyReport: 'Closing off the day book',
  getBusinessRating: 'Rating the business',
  linkToPage: 'Finding the right page',
  explainHowTo: 'Writing out the steps',
  getSalesTrend: 'Plotting the sales curve',
  comparePeriods: 'Comparing against last period',
  getTopSellingProducts: 'Ranking best sellers',
  getWorstSellingProducts: 'Finding slow movers',
  getPeakHours: 'Mapping trading hours',
  forecastRevenue: 'Projecting the run-rate',
  getGrowthRate: 'Measuring growth',
  forecastStockout: 'Projecting stockouts',
  getRecentTransactions: 'Reading the last receipts',
  getUnpaidInvoices: 'Chasing outstanding payments',
  queryCustomer: 'Looking up the customer',
  getTopCustomers: 'Ranking your regulars',
  getCustomerPurchaseHistory: 'Reading purchase history',
  getAtRiskCustomers: 'Spotting lapsed customers',
  getBranchPerformance: 'Comparing branches',
  getStaffPerformance: 'Totalling sales per staff',
  getAuditTrail: 'Reading the audit trail',
  runLossPreventionScan: 'Sweeping for losses',
  getBusinessOverview: 'Taking a full stock-take',
  proposeStockAdjustment: 'Drafting a stock adjustment',
  proposePriceChange: 'Drafting a price change',
  proposeLoyaltyAdjustment: 'Drafting a loyalty adjustment',
  proposeRestock: 'Drafting a restock',
  proposeLowStockThreshold: 'Drafting a threshold change',
  proposeSale: 'Ringing up the sale',
  reportUnanswered: 'Logging what I could not answer',
};

export function labelForTool(toolName: string): string {
  return TOOL_LINES[toolName] ?? toolName;
}

/**
 * Every tool Zen AI can call.
 *
 * Derived from `TOOL_LINES` on purpose. The real definitions live in
 * `src/app/api/chat/tools.ts`, but that module needs the firebase-admin `db`
 * and cannot be imported into a client bundle. `TOOL_LINES` already has to
 * list every tool or the status line renders raw camelCase, so it is the one
 * client-safe mirror that is kept honest — counting it means the admin figure
 * cannot quietly drift from reality the way a hardcoded number would.
 */
export const ZEN_TOOL_NAMES = Object.keys(TOOL_LINES);
export const ZEN_TOOL_COUNT = ZEN_TOOL_NAMES.length;

/** Read-only tools versus the ones that can propose a write, for the admin split. */
export const ZEN_WRITE_TOOL_NAMES = ZEN_TOOL_NAMES.filter((n) => n.startsWith('propose'));
export const ZEN_READ_TOOL_NAMES = ZEN_TOOL_NAMES.filter((n) => !n.startsWith('propose'));

/**
 * @param activeTool  name of the tool currently running, if any
 * @param showMark    draw the glyph. Off when the caller already renders an
 *                    avatar in the same row — two marks side by side reads as
 *                    a duplicate rather than an accent.
 */
export function ZenStatus({ activeTool, showMark = true }: { activeTool?: string | null; showMark?: boolean }) {
  const [tick, setTick] = React.useState(0);

  // Rotate the generic lines, but freeze as soon as a real tool is running —
  // the tool name is more informative than anything the rotation would say.
  React.useEffect(() => {
    if (activeTool) return;
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, [activeTool]);

  const label = activeTool ? labelForTool(activeTool) : IDLE_LINES[tick % IDLE_LINES.length];

  return (
    <div className="flex items-center gap-2.5">
      {showMark && (
        <div className="w-6 h-6 shrink-0">
          <ZenMark animated />
        </div>
      )}
      {/* key on the label so the fade-up replays whenever the text changes */}
      <span key={label} className="zen-status-in text-sm text-muted-foreground font-medium">
        {label}
        <span className="inline-block w-4 text-left">…</span>
      </span>
    </div>
  );
}
