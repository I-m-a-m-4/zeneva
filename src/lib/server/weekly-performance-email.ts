import {
  formatCurrencyNumber,
  type WeeklyBusinessStats,
} from './weekly-performance-stats';
import { UNSUBSCRIBE_TOKEN } from '@/lib/email-templates';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space').replace(/\/+$/, '');

/**
 * Generates sample statistics for instant admin previewing and test emails.
 */
export function getSampleWeeklyStats(): WeeklyBusinessStats {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    businessId: 'sample_store_id',
    businessName: 'Apex Supermarket & Retail',
    ownerName: 'Emmanuel Adeyemi',
    ownerEmail: 'emmanuel@example.com',
    currencySymbol: '₦',
    startDate: currentStart,
    endDate: now,
    dateRangeLabel: 'Past 7 Days',
    revenue: 485200,
    priorRevenue: 412000,
    revenueGrowthPct: 17.8,
    salesCount: 84,
    priorSalesCount: 71,
    salesGrowthPct: 18.3,
    unitsSold: 216,
    averageOrderValue: 5776,
    estimatedProfit: 162400,
    topProducts: [
      { productId: '1', name: 'Golden Penny Semovita 2kg', quantity: 38, revenue: 95000 },
      { productId: '2', name: 'Peak Milk Refill 400g', quantity: 29, revenue: 81200 },
      { productId: '3', name: 'Milo Choco Drink 500g', quantity: 24, revenue: 64800 },
      { productId: '4', name: 'Devon King Vegetable Oil 1L', quantity: 18, revenue: 52200 },
    ],
    strategyTip:
      '🚀 <strong>Momentum Alert:</strong> Your store revenue grew by <strong>+17.8%</strong> this week! Stock up early on <strong>Golden Penny Semovita</strong> to avoid stockouts, and test offering small snack cross-sells at checkout to maintain high basket value.',
    hasSales: true,
  };
}

/**
 * Renders the weekly performance email as an email-client proof HTML document.
 */
export function renderWeeklyPerformanceEmail(stats: WeeklyBusinessStats): {
  subject: string;
  html: string;
} {
  const {
    businessName,
    ownerName,
    currencySymbol,
    dateRangeLabel,
    revenue,
    revenueGrowthPct,
    salesCount,
    salesGrowthPct,
    unitsSold,
    averageOrderValue,
    topProducts,
    strategyTip,
  } = stats;

  const subject = `📊 Weekly Performance for ${businessName}: ${currencySymbol}${formatCurrencyNumber(revenue)} in sales`;

  const revenueGrowthBadge = revenueGrowthPct !== null
    ? revenueGrowthPct >= 0
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:#ecfdf5;color:#047857;font-size:12px;font-weight:700;">+${revenueGrowthPct.toFixed(1)}% vs last wk</span>`
      : `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;">${revenueGrowthPct.toFixed(1)}% vs last wk</span>`
    : '';

  const salesGrowthBadge = salesGrowthPct !== null
    ? salesGrowthPct >= 0
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:#ecfdf5;color:#047857;font-size:11px;font-weight:700;">+${salesGrowthPct.toFixed(1)}%</span>`
      : `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:#fef2f2;color:#b91c1c;font-size:11px;font-weight:700;">${salesGrowthPct.toFixed(1)}%</span>`
    : '';

  // Top products rows
  const topProductsHtml = topProducts.length > 0
    ? topProducts.map((p, idx) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">
          <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background-color:#ffedd5;color:#ea580c;font-size:11px;font-weight:800;margin-right:8px;">${idx + 1}</span>
          ${p.name}
        </td>
        <td align="center" style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;font-weight:600;">
          ${p.quantity} units
        </td>
        <td align="right" style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:700;">
          ${currencySymbol}${formatCurrencyNumber(p.revenue)}
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="3" align="center" style="padding:16px;color:#94a3b8;font-size:13px;">
          No itemized sales recorded this week.
        </td>
      </tr>
    `;

  const html = `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${subject}</title>
<style type="text/css">
  body, table, td, p, h1, h2, h3, a { -webkit-font-smoothing:antialiased; }
  a { text-decoration:none; }
  @media only screen and (max-width: 600px) {
    .container-table { width: 100% !important; border-radius: 0 !important; }
    .col-half { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    .header-pad { padding: 24px 16px !important; }
    .body-pad { padding: 16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="background-color:#f8fafc;margin:0;padding:0;">
<tr>
<td align="center" style="padding:24px 8px;">

  <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" class="container-table" style="width:580px;max-width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.04);">
    
    <!-- Top Brand Header Bar -->
    <tr>
      <td bgcolor="#0f172a" style="background-color:#0f172a;padding:28px 32px;text-align:left;" class="header-pad">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <img src="https://i.ibb.co/tMp65gRP/5c1014423d18.png" alt="Zeneva" width="36" height="36" style="width:36px;height:36px;display:block;border:0;" />
                  </td>
                  <td valign="middle">
                    <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;line-height:1;">zeneva</span>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle">
              <span style="display:inline-block;padding:6px 12px;border-radius:20px;background-color:#1e293b;border:1px solid #334155;color:#f97316;font-size:12px;font-weight:700;letter-spacing:0.3px;">
                ${dateRangeLabel}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Container -->
    <tr>
      <td style="padding:32px;" class="body-pad">
        
        <!-- Greeting -->
        <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">
          Weekly Performance Digest
        </h1>
        <p style="margin:0 0 24px 0;font-size:14px;color:#64748b;line-height:1.5;">
          Hello <strong>${ownerName}</strong>, here is how <strong>${businessName}</strong> performed over the last 7 days.
        </p>

        <!-- Big Highlight Revenue Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:16px;margin-bottom:20px;">
          <tr>
            <td style="padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#ea580c;letter-spacing:0.8px;">Total Weekly Revenue</span>
                    <div style="font-size:32px;font-weight:900;color:#0f172a;margin-top:6px;letter-spacing:-0.5px;">
                      ${currencySymbol}${formatCurrencyNumber(revenue)}
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    ${revenueGrowthBadge}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Metric Grid (Sales, Units, Average Basket) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          <tr>
            <!-- Orders -->
            <td width="32%" valign="top" style="padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;" class="col-half">
              <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Sales Completed</span>
              <div style="font-size:20px;font-weight:800;color:#0f172a;margin:6px 0 2px;">${salesCount}</div>
              ${salesGrowthBadge}
            </td>
            <td width="2%">&nbsp;</td>
            <!-- Units Sold -->
            <td width="32%" valign="top" style="padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;" class="col-half">
              <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Units Sold</span>
              <div style="font-size:20px;font-weight:800;color:#0f172a;margin:6px 0 2px;">${unitsSold}</div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;">items ringing up</span>
            </td>
            <td width="2%">&nbsp;</td>
            <!-- Avg Basket -->
            <td width="32%" valign="top" style="padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;" class="col-half">
              <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Average Basket</span>
              <div style="font-size:20px;font-weight:800;color:#0f172a;margin:6px 0 2px;">${currencySymbol}${formatCurrencyNumber(averageOrderValue)}</div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;">per customer</span>
            </td>
          </tr>
        </table>

        <!-- Strategy & Reach Advice Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:26px;">
          <tr>
            <td style="padding:16px 20px;">
              <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#15803d;letter-spacing:0.6px;display:block;margin-bottom:6px;">Strategic Tip &amp; Growth Reach</span>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#166534;">
                ${strategyTip}
              </p>
            </td>
          </tr>
        </table>

        <!-- Top Selling Products Table -->
        <h2 style="margin:0 0 12px 0;font-size:15px;font-weight:800;color:#0f172a;">
          Top Performing Products
        </h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px;">
          <thead>
            <tr bgcolor="#f8fafc">
              <th align="left" style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Product</th>
              <th align="center" style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Quantity</th>
              <th align="right" style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topProductsHtml}
          </tbody>
        </table>

        <!-- Primary Call to Action Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
          <tr>
            <td align="center" bgcolor="#f47125" style="background-color:#f47125;border-radius:12px;text-align:center;">
              <a href="${BASE_URL}/reports" style="display:block;padding:14px 24px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                Open Workspace &amp; View Full Analytics &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="text-align:center;margin:8px 0 0;font-size:12px;color:#94a3b8;">
          Track inventory stock levels, profit margins, and peak shopping hours on your dashboard.
        </p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td bgcolor="#f8fafc" style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;">
        <p style="margin:0 0 6px;">
          Sent to <strong>${stats.ownerEmail}</strong> for <strong>${businessName}</strong>.
        </p>
        <p style="margin:0 0 10px;">
          Weekly automated performance report dispatched by Zeneva Industrial Retail OS.
        </p>
        <p style="margin:0;">
          <a href="${BASE_URL}/settings" style="color:#64748b;text-decoration:underline;margin-right:12px;">Notification Settings</a>
          <a href="${UNSUBSCRIBE_TOKEN}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;

  return { subject, html };
}
