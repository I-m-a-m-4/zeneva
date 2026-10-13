import { adminFirestore } from '@/firebase/admin';

export interface WeeklyProductPerformance {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface WeeklyBusinessStats {
  businessId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  currencySymbol: string;
  startDate: Date;
  endDate: Date;
  dateRangeLabel: string;
  revenue: number;
  priorRevenue: number;
  revenueGrowthPct: number | null;
  salesCount: number;
  priorSalesCount: number;
  salesGrowthPct: number | null;
  unitsSold: number;
  averageOrderValue: number;
  estimatedProfit: number;
  topProducts: WeeklyProductPerformance[];
  strategyTip: string;
  hasSales: boolean;
}

/** Formats a number with commas and 0 decimals */
export function formatCurrencyNumber(val: number): string {
  return Math.round(val).toLocaleString('en-US');
}

/** Formats date range label like "Oct 6 – Oct 12, 2026" */
function formatDateRange(from: Date, to: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const fromStr = from.toLocaleDateString('en-US', options);
  const toStr = to.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  return `${fromStr} – ${toStr}`;
}

/**
 * Computes deterministic business strategy & reach advice tailored to the week's performance.
 */
function generateWeeklyStrategyTip(
  revenue: number,
  revenueGrowthPct: number | null,
  salesCount: number,
  topProduct?: WeeklyProductPerformance
): string {
  if (salesCount === 0 || revenue === 0) {
    return '🎯 <strong>Re-Engagement Strategy:</strong> No transactions were recorded this past week. Consider sending a friendly broadcast or special offer to your customer book, or check that all in-store sales are being rung up on Zeneva POS.';
  }

  if (revenueGrowthPct !== null && revenueGrowthPct >= 20) {
    const itemHighlight = topProduct ? `especially <strong>${topProduct.name}</strong>` : 'your fast movers';
    return `🚀 <strong>Momentum Alert:</strong> Your store revenue grew by <strong>+${revenueGrowthPct.toFixed(1)}%</strong> this week! Stock up early on ${itemHighlight} to prevent stockouts, and test offering small cross-sell bundles at checkout to maintain high basket value.`;
  }

  if (revenueGrowthPct !== null && revenueGrowthPct <= -15) {
    return '💡 <strong>Sales Recovery Strategy:</strong> Weekly volume dipped compared to the previous week. Check your slow-moving inventory on the Inventory tab and consider a weekend flash clearance or bundle promotion to turn tied-up capital into cash flow.';
  }

  if (topProduct && topProduct.quantity >= 5) {
    return `⭐ <strong>Top Seller Focus:</strong> <strong>${topProduct.name}</strong> was your champion item this week (${topProduct.quantity} units sold). Keep adequate safety stock on hand and ask buyers at checkout if they need complementary accessories.`;
  }

  return '📈 <strong>Consistent Growth:</strong> Steady performance throughout the week! Keep capturing customer phone numbers at checkout to build your loyalty base, and check the Reports tab for peak transaction hours.';
}

/**
 * Fetches and aggregates weekly performance data for a specific business using Firebase Admin SDK.
 */
export async function getWeeklyBusinessPerformance(
  businessId: string,
  businessData?: any
): Promise<WeeklyBusinessStats | null> {
  if (!adminFirestore) {
    throw new Error('Firebase Admin Firestore is not initialized.');
  }

  // 1. Resolve business details
  let biz = businessData;
  if (!biz) {
    const bizDoc = await adminFirestore.collection('businessInstances').doc(businessId).get();
    if (!bizDoc.exists) return null;
    biz = { id: bizDoc.id, ...bizDoc.data() };
  }

  if (biz.status === 'deleted') return null;

  const businessName = biz.name || 'Your Store';
  const currencySymbol = biz.settings?.currency === 'USD' ? '$'
    : biz.settings?.currency === 'GBP' ? '£'
    : biz.settings?.currency === 'EUR' ? '€'
    : biz.settings?.currency === 'GHS' ? 'GH₵'
    : biz.settings?.currency === 'KES' ? 'KSh'
    : biz.settings?.currency === 'ZAR' ? 'R'
    : '₦'; // Default to NGN

  // 2. Resolve Owner / Primary User
  const ownerId = biz.ownerId;
  let ownerName = 'Merchant';
  let ownerEmail = '';

  if (ownerId) {
    const userDoc = await adminFirestore.collection('users').doc(ownerId).get();
    if (userDoc.exists) {
      const uData = userDoc.data();
      ownerName = uData?.name || ownerName;
      ownerEmail = uData?.email || '';
      if (uData?.marketingOptOut) {
        return null; // Skip opted-out users
      }
    }
  }

  // If no owner user email, look for any active admin user associated with this business
  if (!ownerEmail) {
    const userSnap = await adminFirestore
      .collection('users')
      .where('businessId', '==', businessId)
      .limit(5)
      .get();
    
    const validUser = userSnap.docs.find((d: any) => {
      const data = d.data();
      return data.email && !data.marketingOptOut && (data.role === 'admin' || data.role === 'owner');
    });

    if (validUser) {
      const uData = validUser.data();
      ownerName = uData.name || ownerName;
      ownerEmail = uData.email;
    }
  }

  if (!ownerEmail) return null;

  // 3. Define Windows (Past 7 Days vs Prior 7 Days)
  const now = new Date();
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  currentStart.setHours(0, 0, 0, 0);

  const priorStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  priorStart.setHours(0, 0, 0, 0);

  // 4. Fetch Receipts for the past 14 days
  let receiptsDocs: any[] = [];
  try {
    const receiptsSnap = await adminFirestore
      .collection('receipts')
      .where('businessId', '==', businessId)
      .where('createdAt', '>=', priorStart)
      .get();
    receiptsDocs = receiptsSnap.docs;
  } catch (err) {
    // Fallback: If compound query index is missing, fetch by businessId and filter in memory
    const fallbackSnap = await adminFirestore
      .collection('receipts')
      .where('businessId', '==', businessId)
      .get();
    receiptsDocs = fallbackSnap.docs.filter((d: any) => {
      const data = d.data();
      const createdDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return !isNaN(createdDate.getTime()) && createdDate >= priorStart;
    });
  }

  let revenue = 0;
  let priorRevenue = 0;
  let salesCount = 0;
  let priorSalesCount = 0;
  let unitsSold = 0;
  let totalCost = 0;

  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const doc of receiptsDocs) {
    const r = doc.data();
    const createdDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
    const total = Number(r.total) || 0;
    const isCurrentWindow = createdDate >= currentStart;

    if (isCurrentWindow) {
      revenue += total;
      salesCount += 1;

      for (const item of r.items || []) {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const costPrice = Number(item.costPrice) || 0;
        unitsSold += qty;
        totalCost += costPrice * qty;

        const pid = item.productId || item.name || 'unknown';
        const existing = productMap.get(pid) || {
          name: item.name || 'Product',
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += qty;
        existing.revenue += price * qty;
        productMap.set(pid, existing);
      }
    } else {
      priorRevenue += total;
      priorSalesCount += 1;
    }
  }

  // Calculate percentage growths
  let revenueGrowthPct: number | null = null;
  if (priorRevenue > 0) {
    revenueGrowthPct = ((revenue - priorRevenue) / priorRevenue) * 100;
  } else if (revenue > 0) {
    revenueGrowthPct = 100;
  }

  let salesGrowthPct: number | null = null;
  if (priorSalesCount > 0) {
    salesGrowthPct = ((salesCount - priorSalesCount) / priorSalesCount) * 100;
  } else if (salesCount > 0) {
    salesGrowthPct = 100;
  }

  const averageOrderValue = salesCount > 0 ? revenue / salesCount : 0;
  const estimatedProfit = Math.max(0, revenue - totalCost);

  // Top Products
  const topProducts: WeeklyProductPerformance[] = Array.from(productMap.entries())
    .map(([productId, val]) => ({
      productId,
      name: val.name,
      quantity: val.quantity,
      revenue: val.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  const strategyTip = generateWeeklyStrategyTip(
    revenue,
    revenueGrowthPct,
    salesCount,
    topProducts[0]
  );

  return {
    businessId,
    businessName,
    ownerName,
    ownerEmail,
    currencySymbol,
    startDate: currentStart,
    endDate: now,
    dateRangeLabel: formatDateRange(currentStart, now),
    revenue,
    priorRevenue,
    revenueGrowthPct,
    salesCount,
    priorSalesCount,
    salesGrowthPct,
    unitsSold,
    averageOrderValue,
    estimatedProfit,
    topProducts,
    strategyTip,
    hasSales: salesCount > 0,
  };
}

export type WeeklyPerformanceStats = WeeklyBusinessStats;
export const calculateWeeklyPerformanceStats = getWeeklyBusinessPerformance;
