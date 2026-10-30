import type { Product, Receipt } from '@/types';
import { safeToDate } from './utils';

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  /** Units sold over the analysis window (e.g. 30 days) */
  unitsSoldWindow: number;
  /** Average units sold per day */
  dailyVelocity: number;
  /** Estimated days until stock hits 0 */
  daysRemaining: number | null;
  /** Recommended reorder quantity for the specified target horizon */
  recommendedQty: number;
  /** Target forecast horizon in days */
  horizonDays: number;
  /** Urgency classification */
  urgency: 'critical' | 'low' | 'adequate' | 'healthy' | 'dormant';
  /** Human-readable explanation */
  insight: string;
}

/**
 * Calculates demand forecasting for a single product over a target time horizon.
 *
 * @param product The product being forecasted
 * @param receipts The list of historical sales receipts
 * @param horizonDays Target reorder horizon in days (default: 14 days)
 * @param windowDays Historical lookback window in days (default: 30 days)
 */
export function calculateProductDemandForecast(
  product: Product,
  receipts: Receipt[] | null | undefined,
  horizonDays: number = 14,
  windowDays: number = 30
): ProductDemandForecast {
  const currentStock = typeof product.stock === 'number' ? product.stock : 0;
  const reorderPoint = typeof product.lowStockThreshold === 'number' && product.lowStockThreshold > 0
    ? product.lowStockThreshold
    : 5;

  const now = Date.now();
  const windowStartMs = now - windowDays * 24 * 60 * 60 * 1000;

  let unitsSold = 0;

  if (Array.isArray(receipts) && receipts.length > 0) {
    for (const r of receipts) {
      const receiptDate = safeToDate(r.createdAt);
      if (!receiptDate) continue;

      const rTime = receiptDate.getTime();
      if (rTime >= windowStartMs && rTime <= now) {
        if (Array.isArray(r.items)) {
          for (const item of r.items) {
            if (item.productId === product.id) {
              unitsSold += Math.max(0, item.quantity || 0);
            }
          }
        }
      }
    }
  }

  // Daily velocity
  const dailyVelocity = unitsSold > 0 ? unitsSold / windowDays : 0;

  // Days remaining before stock-out
  let daysRemaining: number | null = null;
  if (currentStock <= 0) {
    daysRemaining = 0;
  } else if (dailyVelocity > 0) {
    daysRemaining = Math.max(0, Math.floor(currentStock / dailyVelocity));
  }

  // Forecast demand for horizonDays with 15% safety buffer
  let recommendedQty = 0;
  if (dailyVelocity > 0) {
    // Expected sales during horizon + safety stock to leave reorder point intact
    const projectedDemand = dailyVelocity * horizonDays * 1.15;
    const needed = projectedDemand + reorderPoint - currentStock;
    recommendedQty = Math.max(0, Math.ceil(needed));
  } else {
    // If no sales recorded in window (new item or dormant), default to standard reorder buffer
    const deficit = (reorderPoint * 2) - currentStock;
    recommendedQty = Math.max(0, deficit);
  }

  // Determine urgency
  let urgency: ProductDemandForecast['urgency'] = 'healthy';
  let insight = '';

  if (currentStock <= 0) {
    urgency = 'critical';
    insight = `Out of stock! Need ${recommendedQty} units to cover the next ${horizonDays} days.`;
  } else if (daysRemaining !== null && daysRemaining <= 3) {
    urgency = 'critical';
    insight = `Critical: Will run out in ~${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${dailyVelocity.toFixed(1)} units/day).`;
  } else if (daysRemaining !== null && daysRemaining <= 7) {
    urgency = 'low';
    insight = `Low stock: ${daysRemaining} days of cover remaining. Reorder ${recommendedQty} units for ${horizonDays} days.`;
  } else if (dailyVelocity === 0) {
    urgency = 'dormant';
    insight = `No sales recorded in the past ${windowDays} days.`;
  } else if (daysRemaining !== null && daysRemaining <= horizonDays) {
    urgency = 'adequate';
    insight = `Stock covers ~${daysRemaining} days. Suggested order: ${recommendedQty} units.`;
  } else {
    urgency = 'healthy';
    insight = `Sufficient stock (~${daysRemaining ?? 30}+ days of cover).`;
  }

  return {
    productId: product.id,
    productName: product.name,
    currentStock,
    reorderPoint,
    unitsSoldWindow: unitsSold,
    dailyVelocity: Number(dailyVelocity.toFixed(2)),
    daysRemaining,
    recommendedQty,
    horizonDays,
    urgency,
    insight,
  };
}

/**
 * Bulk forecasts a list of products over a target horizon.
 */
export function calculateBulkDemandForecast(
  products: Product[],
  receipts: Receipt[] | null | undefined,
  horizonDays: number = 14
): Map<string, ProductDemandForecast> {
  const map = new Map<string, ProductDemandForecast>();
  for (const p of products) {
    map.set(p.id, calculateProductDemandForecast(p, receipts, horizonDays));
  }
  return map;
}

