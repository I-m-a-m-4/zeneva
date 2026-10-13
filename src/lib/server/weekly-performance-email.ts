import {
  formatCurrencyNumber,
  type WeeklyBusinessStats,
} from './weekly-performance-stats';
import {
  escapeHtml,
  UNSUBSCRIBE_TOKEN,
  SOCIAL_LINKS,
} from '@/lib/email-templates';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space').replace(/\/+$/, '');

const BRAND = {
  orange: '#ea580c',
  orangeDeep: '#c2410c',
  orangeSoft: '#fff7ed',
  ink: '#1c1917',
  body: '#44403c',
  muted: '#78716c',
  faint: '#a8a29e',
  page: '#f5f5f4',
  card: '#ffffff',
  panel: '#fafaf9',
  line: '#e7e5e4',
};

const FONT_DISPLAY =
  "'Bricolage Grotesque','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const FONT_BODY =
  "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2'
  + '?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800'
  + '&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700'
  + '&display=swap';

function buildSocialRow(): string {
  return SOCIAL_LINKS
    .map(
      (s) =>
        `<td style="padding:0 8px;">
          <a href="${s.href}" style="color:#94a3b8;text-decoration:none;font-family:${FONT_BODY};font-size:12px;font-weight:600;letter-spacing:0.02em;">${s.label}</a>
        </td>`,
    )
    .join('');
}

/**
 * Generates sample statistics for instant admin previewing and test emails.
 */
export function getSampleWeeklyStats(): WeeklyBusinessStats {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    businessId: 'sample_store_id',
    businessName: 'Apex Supermarket (Sample Store)',
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
      '🚀 <strong>Momentum Alert:</strong> Your store revenue grew by <strong>+17.8%</strong> this week. Stock up early on <strong>Golden Penny Semovita</strong> to avoid stockouts, and test offering small snack cross-sells at checkout to maintain high basket value.',
    hasSales: true,
  };
}

/**
 * Renders the weekly performance email adhering strictly to the official Zeneva design system:
 * Bricolage Grotesque, DM Sans, warm neutral palette, 3D milestone hero, callout panel,
 * bulletproof pill button, founder sign-off, and social links footer.
 */
export function renderWeeklyPerformanceEmail(
  stats: WeeklyBusinessStats,
  options: { unsubscribeUrl?: string; isLocalPreview?: boolean } = {}
): {
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

  const unsubscribeUrl = options.unsubscribeUrl ?? UNSUBSCRIBE_TOKEN;
  const firstName = (ownerName || '').trim().split(/\s+/)[0] || 'there';
  const cleanBizName = escapeHtml(businessName || 'Your Store');
  const year = new Date().getFullYear();

  // Subject line matching founder-to-merchant tonality: clean, direct, no spam triggers
  const subject = `Weekly performance for ${businessName}`;
  const preheader = `${cleanBizName} generated ${currencySymbol}${formatCurrencyNumber(revenue)} in sales across ${salesCount} transactions over the past 7 days.`;

  // Hero 3D illustration asset
  const heroImgUrl = options.isLocalPreview
    ? '/emails/3d-milestone.jpg'
    : `${BASE_URL}/emails/3d-milestone.jpg`;

  // Growth badge for the callout panel
  const growthBadge =
    revenueGrowthPct !== null
      ? revenueGrowthPct >= 0
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background-color:#dcfce7;color:#15803d;font-size:12px;font-weight:700;margin-left:8px;vertical-align:middle;">+${revenueGrowthPct.toFixed(1)}% vs last week</span>`
        : `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background-color:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;margin-left:8px;vertical-align:middle;">${revenueGrowthPct.toFixed(1)}% vs last week</span>`
      : '';

  // Top products table markup
  const topProductsMarkup =
    topProducts.length > 0
      ? topProducts
          .map(
            (p, idx) => `
            <tr>
              <td style="padding:10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${FONT_BODY};font-size:13px;color:${BRAND.ink};font-weight:600;">
                <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background-color:${BRAND.orangeSoft};color:${BRAND.orangeDeep};font-size:11px;font-weight:700;margin-right:6px;">${idx + 1}</span>
                ${escapeHtml(p.name)}
              </td>
              <td align="center" style="padding:10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${FONT_BODY};font-size:13px;color:${BRAND.body};">
                ${p.quantity} units
              </td>
              <td align="right" style="padding:10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${FONT_DISPLAY};font-size:13px;font-weight:700;color:${BRAND.ink};">
                ${currencySymbol}${formatCurrencyNumber(p.revenue)}
              </td>
            </tr>
          `,
          )
          .join('')
      : `
        <tr>
          <td colspan="3" align="center" style="padding:14px;font-family:${FONT_BODY};color:${BRAND.muted};font-size:13px;">
            No item breakdown available for this period.
          </td>
        </tr>
      `;

  const socialRow = buildSocialRow();

  const html = `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${subject}</title>
<!--[if !mso]><!-->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<!--<![endif]-->
<style type="text/css">
  @import url('${GOOGLE_FONTS_HREF}');
  body, table, td, p, h1, a { -webkit-font-smoothing:antialiased; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .z-pad { padding-left:22px !important; padding-right:22px !important; }
    .z-h1 { font-size:24px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, h1, a { font-family:'Segoe UI',Arial,sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};font-family:${FONT_BODY};">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background-color:${BRAND.page};margin:0;padding:0;">
<tr>
<td align="center" style="padding:36px 12px;">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.line};border-radius:24px;overflow:hidden;font-family:${FONT_BODY};box-shadow:0 4px 24px rgba(0,0,0,0.03);">

    <!-- Header / Brand Logo with Wordmark -->
    <tr>
      <td class="z-pad" align="center" style="padding:32px 32px 14px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center" valign="middle" style="padding-right:10px;">
              <img src="https://i.ibb.co/tMp65gRP/5c1014423d18.png" alt="Zeneva" width="44" height="44"
                   style="width:44px;height:44px;display:block;border:0;outline:none;text-decoration:none;object-fit:contain;" />
            </td>
            <td align="left" valign="middle">
              <span style="font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;letter-spacing:-0.8px;color:${BRAND.orangeDeep};line-height:1;display:inline-block;">zeneva</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Eyebrow & Headline -->
    <tr>
      <td class="z-pad" align="center" style="padding:0 32px 4px;text-align:center;">
        <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.orangeDeep};">
          WEEKLY DIGEST &middot; ${dateRangeLabel}
        </p>
        <h1 class="z-h1" style="margin:0;font-family:${FONT_DISPLAY};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.7px;color:${BRAND.ink};">
          Your week in numbers.
        </h1>
      </td>
    </tr>

    <!-- 3D Hero Illustration -->
    <tr>
      <td align="center" style="padding:18px 32px 14px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center">
              <img src="${heroImgUrl}" alt="Weekly Performance Milestone" width="240" height="240"
                   style="display:block;width:100%;max-width:240px;height:auto;border-radius:20px;margin:0 auto;border:0;outline:none;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Intro Prose -->
    <tr>
      <td class="z-pad" align="center" style="padding:6px 32px 0;font-family:${FONT_BODY};text-align:center;">
        <div style="max-width:460px;margin:0 auto;text-align:left;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${BRAND.body};">
            Hi ${firstName}, here is a summary of how <strong>${cleanBizName}</strong> performed over the past 7 days.
          </p>
        </div>
      </td>
    </tr>

    <!-- The Proof-You-Looked Callout Panel (Zeneva Design System) -->
    <tr>
      <td class="z-pad" align="center" style="padding:6px 32px 4px;text-align:center;">
        <div style="max-width:460px;margin:0 auto;text-align:left;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.panel}" style="background-color:${BRAND.panel};border:1px solid ${BRAND.line};border-left:3px solid ${BRAND.orange};border-radius:0 12px 12px 0;">
            <tr>
              <td style="padding:16px 20px;font-family:${FONT_BODY};">
                
                <!-- Main KPI: Revenue -->
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${BRAND.muted};margin-bottom:6px;">
                  Gross Revenue (7 Days)
                </div>
                <div style="font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;letter-spacing:-0.8px;color:${BRAND.ink};line-height:1;margin-bottom:14px;">
                  ${currencySymbol}${formatCurrencyNumber(revenue)}
                  ${growthBadge}
                </div>

                <!-- Secondary Metric Tiles -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;border-top:1px solid ${BRAND.line};padding-top:12px;">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:8px;">
                      <div style="font-size:11px;color:${BRAND.muted};font-weight:600;margin-bottom:2px;">Sales Transactions</div>
                      <div style="font-family:${FONT_DISPLAY};font-size:18px;font-weight:700;color:${BRAND.ink};">
                        ${salesCount} receipts
                      </div>
                      <div style="font-size:11px;color:${BRAND.muted};">Avg order: ${currencySymbol}${formatCurrencyNumber(averageOrderValue)}</div>
                    </td>
                    <td width="50%" valign="top" style="padding-left:8px;">
                      <div style="font-size:11px;color:${BRAND.muted};font-weight:600;margin-bottom:2px;">Total Units Sold</div>
                      <div style="font-family:${FONT_DISPLAY};font-size:18px;font-weight:700;color:${BRAND.ink};">
                        ${unitsSold} items
                      </div>
                      <div style="font-size:11px;color:${BRAND.muted};">Recorded across all sales</div>
                    </td>
                  </tr>
                </table>

                <!-- Top Products Ranking -->
                <div style="border-top:1px solid ${BRAND.line};padding-top:12px;margin-bottom:6px;">
                  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND.muted};margin-bottom:8px;">
                    Best-Selling Products
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${topProductsMarkup}
                  </table>
                </div>

              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- Strategic Tip Box (Zeneva Accent) -->
    <tr>
      <td class="z-pad" align="center" style="padding:14px 32px 0;font-family:${FONT_BODY};text-align:center;">
        <div style="max-width:460px;margin:0 auto;text-align:left;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.orangeSoft}" style="background-color:${BRAND.orangeSoft};border:1px solid #fed7aa;border-left:3px solid ${BRAND.orange};border-radius:0 10px 10px 0;">
            <tr>
              <td style="padding:14px 18px;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${BRAND.body};">
                ${strategyTip}
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- Bulletproof Orange Pill CTA Button -->
    <tr>
      <td class="z-pad" align="center" style="padding:24px 32px 18px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center" bgcolor="${BRAND.orange}" style="background-color:${BRAND.orange};border-radius:9999px;">
              <a href="${BASE_URL}/reports" style="display:inline-block;padding:14px 36px;font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;letter-spacing:-0.2px;">
                Open Full Reports &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Founder Sign-off -->
    <tr>
      <td class="z-pad" align="center" style="padding:4px 32px 28px;text-align:center;">
        <p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:14px;color:${BRAND.body};">Thanks for reading,</p>
        <p style="margin:0;font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;color:${BRAND.ink};">Imam Shaffy</p>
        <p style="margin:2px 0 0;font-family:${FONT_BODY};font-size:12px;color:${BRAND.muted};">Founder, Zeneva</p>
      </td>
    </tr>

    <!-- Footer with Text Social Links and Unsubscribe -->
    <tr>
      <td bgcolor="${BRAND.panel}" style="background-color:${BRAND.panel};border-top:1px solid ${BRAND.line};padding:22px 32px 24px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px;">
          <tr>${socialRow}</tr>
        </table>
        <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${BRAND.muted};">
          <a href="${BASE_URL}" style="color:${BRAND.orangeDeep};font-weight:600;text-decoration:none;">zeneva.space</a>
          &nbsp;&middot;&nbsp;
          <a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:11px;color:${BRAND.faint};">
          &copy; ${year} Zeneva POS &amp; Inventory. All rights reserved.
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
