import { UNSUBSCRIBE_TOKEN } from '@/lib/email-templates';

export interface RetailOutreachEmailData {
  businessName: string;
  category: string;
  recipientEmail: string;
  recipientName?: string;
  location?: string;
}

export function generateRetailOutreachHtml(data: RetailOutreachEmailData): { subject: string; html: string; text: string } {
  const { businessName, category, recipientName, location = 'Nigeria' } = data;
  const cleanName = recipientName ? recipientName.split(' ')[0] : 'there';
  const displayBiz = businessName.split(/[-–|]/)[0].trim() || 'your retail storefront';

  let categoryHook = "high-volume customer checkouts and multi-staff inventory accuracy";
  let categoryPillar = "Lightning-fast barcode scanning and instant end-of-day sales reconciliation without server timeouts.";

  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('electric') || lowerCat.includes('gadget') || lowerCat.includes('phone')) {
    categoryHook = "tracking high-value electronics, warranty receipts, and protecting margins against inventory shrinkage";
    categoryPillar = "Serial number tracking, variant matrices, and cashier accountability to eliminate phantom stock loss.";
  } else if (lowerCat.includes('supermarket') || lowerCat.includes('grocer') || lowerCat.includes('market')) {
    categoryHook = "keeping checkout lanes moving when internet dips and matching physical shelf stock to sales";
    categoryPillar = "Ultra-fast offline cashier lanes that never freeze during network downtime, with instant thermal receipts.";
  } else if (lowerCat.includes('pharmacy') || lowerCat.includes('drug') || lowerCat.includes('health') || lowerCat.includes('chem')) {
    categoryHook = "drug expiry tracking, supplier purchase reconciliation, and customer debt ledgers";
    categoryPillar = "Automated batch expiry reminders, supplier purchase tracking, and prescription debt accounting.";
  } else if (lowerCat.includes('cosmetic') || lowerCat.includes('skin') || lowerCat.includes('beauty')) {
    categoryHook = "customer retention, WhatsApp receipt dispatch, and branch inventory transfers";
    categoryPillar = "Customer purchase history, digital WhatsApp receipts, and multi-branch inventory routing.";
  } else if (lowerCat.includes('fashion') || lowerCat.includes('boutique') || lowerCat.includes('cloth')) {
    categoryHook = "size/color variant tracking, digital receipts, and customer debt records";
    categoryPillar = "SKU variant matrices (size, color, brand) with instant barcode label printing and debt tracking.";
  }

  const subject = `Quick question regarding checkout & inventory speed at ${displayBiz}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F9F8F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px; }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%); }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: #F47125; letter-spacing: 0.1em; }
    .content { padding: 32px; line-height: 1.6; font-size: 15px; color: #334155; }
    .feature-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .feature-item { margin-bottom: 12px; }
    .feature-title { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .btn-primary { display: inline-block; background-color: #F47125; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; font-size: 15px; margin: 16px 0 8px; }
    .btn-secondary { display: inline-block; background-color: #25D366; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; font-size: 14px; margin-left: 8px; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="background-color: #F9F8F6; padding: 20px 10px;">
    <div class="wrapper">
      <div class="header">
        <div class="logo-badge">
          <span style="font-size: 20px;">🌌</span> ZENEVA RETAIL OS
        </div>
        <h1 style="margin: 16px 0 0; font-size: 22px; color: #0f172a; line-height: 1.3;">
          Speed up cashier checkout and eliminate shelf stock discrepancies at ${displayBiz}.
        </h1>
      </div>

      <div class="content">
        <p>Hi ${cleanName},</p>

        <p>I came across ${displayBiz} while looking at high-performing retail businesses in ${location}.</p>

        <p>From our work with growing storefronts across Nigeria, owners consistently tell us their two biggest day-to-day headaches are:</p>

        <ol style="padding-left: 20px; margin: 16px 0;">
          <li style="margin-bottom: 8px;"><strong>Cashier lanes freezing or slowing down</strong> whenever the internet connection fluctuates.</li>
          <li><strong>Discrepancies at the end of the month</strong> between physical stock on shelves and recorded register sales.</li>
        </ol>

        <p>We engineered <strong>Zeneva (zeneva.space)</strong> specifically to solve this for retail stores like yours:</p>

        <div class="feature-card">
          <div class="feature-item">
            <div class="feature-title">⚡ 100% Offline-First Cashier Lanes</div>
            <div style="font-size: 14px; color: #475569;">Keep ringing up sales and printing thermal receipts even during full internet outages. Everything reconciles automatically once back online.</div>
          </div>
          <div class="feature-item">
            <div class="feature-title">📦 Tailored for ${category}</div>
            <div style="font-size: 14px; color: #475569;">${categoryPillar}</div>
          </div>
          <div class="feature-item">
            <div class="feature-title">🛡️ Mathematical Loss Prevention</div>
            <div style="font-size: 14px; color: #475569;">Instant anomaly audits on cashier voids, price overrides, and cash drawer discrepancies before they eat into your net margin.</div>
          </div>
          <div class="feature-item" style="margin-bottom: 0;">
            <div class="feature-title">📸 AI Visual Stock Take</div>
            <div style="font-size: 14px; color: #475569;">Scan physical shelves with your smartphone camera to audit in-store inventory counts in under 5 minutes.</div>
          </div>
        </div>

        <p>Store owners running Zeneva have reduced cashier checkout times by <strong>over 60%</strong> and virtually eliminated untracked inventory shrinkage.</p>

        <div style="text-align: center; margin: 28px 0 20px;">
          <a href="https://zeneva.space/sales/pos" class="btn-primary" target="_blank">
            Test Drive Interactive POS Demo →
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 0;">
          (No sign-up or credit card required — test the cashier workflow instantly in your browser)
        </p>

        <p style="margin-top: 28px;">
          Would you be open to a brief 5-minute video walkthrough or a trial on one of your checkout terminals this week? 
          Feel free to reply directly to this email or chat with our growth team on WhatsApp at 
          <a href="https://wa.me/2348146049223?text=Hi%20Zeneva%2C%20I%20would%20like%20to%20learn%20more%20about%20the%20POS%20for%20${encodeURIComponent(displayBiz)}" style="color: #25D366; font-weight: 600; text-decoration: none;">+234 814 604 9223</a>.
        </p>

        <p style="margin-top: 24px; margin-bottom: 0;">
          Warm regards,<br>
          <strong>Bello Imam</strong><br>
          <span style="color: #64748b; font-size: 13px;">Founder & Engineering Lead, Zeneva</span><br>
          <span style="color: #64748b; font-size: 13px;">hello@zeneva.space | <a href="https://zeneva.space" style="color: #F47125; text-decoration: none;">zeneva.space</a></span>
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px;">
          Zeneva Retail Technologies • Victoria Island, Lagos, Nigeria
        </p>
        <p style="margin: 0;">
          You received this message because ${displayBiz} operates in retail in ${location}.<br>
          If you prefer not to receive growth insights from us, you can <a href="${UNSUBSCRIBE_TOKEN}">unsubscribe here</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${cleanName},

I came across ${displayBiz} while looking at high-performing retail businesses in ${location}.

From our work with growing storefronts across Nigeria, owners consistently tell us their two biggest day-to-day headaches are:
1. Cashier lanes freezing or slowing down whenever the internet connection fluctuates.
2. Discrepancies at the end of the month between physical stock on shelves and recorded register sales.

We engineered Zeneva (zeneva.space) specifically to solve this for ${displayBiz}:
- 100% Offline-First Cashier Lanes: Keep ringing up sales and printing thermal receipts even during full internet outages.
- Tailored for ${category}: ${categoryPillar}
- Loss Prevention Forensics: Instant anomaly audits on cashier voids and cash drawer discrepancies.
- AI Visual Stock Take: Scan physical shelves with your smartphone camera to audit in-store inventory counts.

You can test drive our interactive live demo directly in your browser:
https://zeneva.space/sales/pos

Would you be open to a brief 5-minute walkthrough or a trial on one of your checkout terminals this week? Feel free to reply directly to this email or reach us on WhatsApp at +234 814 604 9223.

Warm regards,
Bello Imam
Founder & Engineering Lead, Zeneva
hello@zeneva.space | https://zeneva.space

Unsubscribe: ${UNSUBSCRIBE_TOKEN}`;

  return { subject, html, text };
}
