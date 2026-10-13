import { writeFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZENEVA - Zenith Bank Hackathon Pitch Deck</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 1920px 1080px;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #070A12;
      color: #F8FAFC;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slide {
      width: 1920px;
      height: 1080px;
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 70px 90px;
      background: radial-gradient(circle at 85% 15%, rgba(255, 107, 0, 0.12) 0%, transparent 45%),
                  radial-gradient(circle at 10% 85%, rgba(220, 38, 38, 0.08) 0%, transparent 40%),
                  #070A12;
      border-bottom: 2px solid rgba(255, 255, 255, 0.05);
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
      z-index: 0;
    }
    .slide-content {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(255, 107, 0, 0.12);
      border: 1px solid rgba(255, 107, 0, 0.35);
      color: #FF8A34;
    }
    .badge-zenith {
      background: rgba(220, 38, 38, 0.12);
      border: 1px solid rgba(220, 38, 38, 0.35);
      color: #F87171;
    }
    .slide-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      color: #64748B;
      font-weight: 700;
    }
    h1.slide-title {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: #FFFFFF;
      margin-top: 14px;
    }
    p.slide-subtitle {
      font-size: 20px;
      color: #94A3B8;
      margin-top: 8px;
      font-weight: 500;
    }
    .accent-orange { color: #FF7A1A; }
    .accent-red { color: #EF4444; }
    .accent-green { color: #10B981; }

    /* Cards & Layouts */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      flex: 1;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
      flex: 1;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    .card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .card-highlight {
      border-color: rgba(255, 107, 0, 0.4);
      background: linear-gradient(145deg, rgba(255, 107, 0, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%);
    }
    .card-zenith {
      border-color: rgba(220, 38, 38, 0.35);
      background: linear-gradient(145deg, rgba(220, 38, 38, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%);
    }
    .card-title {
      font-size: 22px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-body {
      font-size: 16px;
      line-height: 1.6;
      color: #94A3B8;
      flex: 1;
    }
    .card-body ul {
      list-style-type: none;
      padding-left: 0;
    }
    .card-body li {
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .card-body li::before {
      content: "•";
      color: #FF7A1A;
      font-weight: bold;
      font-size: 20px;
      line-height: 1;
    }

    /* Metric Tiles */
    .metric-hero {
      background: linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid rgba(255, 107, 0, 0.35);
      border-radius: 24px;
      padding: 36px 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 52px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.03em;
    }
    .metric-label {
      font-size: 18px;
      font-weight: 600;
      color: #FF8A34;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 6px;
    }
    .metric-sub {
      font-size: 14px;
      color: #94A3B8;
      margin-top: 4px;
    }

    /* Footer */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 14px;
      color: #64748B;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      color: #E2E8F0;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #FF7A1A;
    }

    /* Cover Specific */
    .cover-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      max-width: 1400px;
    }
    .cover-title {
      font-size: 84px;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.05;
      color: #FFFFFF;
      margin-bottom: 20px;
    }
    .cover-subtitle {
      font-size: 32px;
      font-weight: 500;
      color: #CBD5E1;
      line-height: 1.4;
      margin-bottom: 40px;
      max-width: 1100px;
    }
    .pill-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 50px;
    }
    .traction-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .traction-pill-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
      color: #FF8A34;
    }
    .traction-pill-lbl {
      font-size: 15px;
      color: #94A3B8;
      font-weight: 500;
    }
  </style>
</head>
<body>

  <!-- ================= SLIDE 1: COVER ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div style="display: flex; gap: 12px;">
          <div class="badge">Zenith Bank Tech Fair & Hackathon</div>
          <div class="badge badge-zenith">Smart SME Financing & Growth</div>
        </div>
        <div class="slide-num">01 / 08</div>
      </div>

      <div class="cover-container">
        <h1 class="cover-title">ZENEVA<span class="accent-orange">.</span></h1>
        <p class="cover-subtitle">The Industrial Retail Operating System & Gateway to Automated SME Banking</p>

        <div class="pill-group">
          <div class="traction-pill">
            <span class="dot"></span>
            <span class="traction-pill-val">₦307,091,466+</span>
            <span class="traction-pill-lbl">Verified GMV</span>
          </div>
          <div class="traction-pill">
            <span class="dot"></span>
            <span class="traction-pill-val">4,645</span>
            <span class="traction-pill-lbl">Checkout Receipts</span>
          </div>
          <div class="traction-pill">
            <span class="dot"></span>
            <span class="traction-pill-val">35,967</span>
            <span class="traction-pill-lbl">Units Sold</span>
          </div>
          <div class="traction-pill">
            <span class="dot"></span>
            <span class="traction-pill-val">99</span>
            <span class="traction-pill-lbl">Registered Businesses</span>
          </div>
          <div class="traction-pill">
            <span class="dot"></span>
            <span class="traction-pill-val">₦1.3M / Day</span>
            <span class="traction-pill-lbl">Sales Velocity</span>
          </div>
        </div>

        <div style="display: flex; gap: 40px; font-size: 18px; color: #94A3B8;">
          <div><strong>Presenter:</strong> Bello Imam & Engineering Team</div>
          <div><strong>Platform:</strong> Desktop (Tauri Rust), Android (PWA), Cloud Portal</div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">
          <span style="color: #FF7A1A; font-weight: 800;">ZENEVA</span>
          <span>×</span>
          <span style="color: #EF4444; font-weight: 800;">ZENITH BANK PLC</span>
        </div>
        <div>Confidential • Hackathon Pitch Deck 2026</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 2: THE PROBLEM ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge">The Market Challenge</div>
          <h1 class="slide-title">The SME Dilemma in Nigeria</h1>
          <p class="slide-subtitle">Informal Retail Powers Nigeria's Economy, but Operates Blind, Vulnerable & Unbanked</p>
        </div>
        <div class="slide-num">02 / 08</div>
      </div>

      <div class="grid-3">
        <div class="card card-highlight">
          <div class="card-title">
            <span class="accent-orange">01</span> The "Fake Alert" Crisis
          </div>
          <div class="card-body">
            <ul>
              <li><strong>70%+ of retail checkout</strong> in Nigeria is conducted via direct bank transfers.</li>
              <li>Merchants lose millions to <strong>counterfeit SMS alerts</strong>, photoshopped transfer screenshots, and cashier collusion.</li>
              <li>Cashiers stall checkout queues waiting for alerts on the store owner's personal phone.</li>
              <li>No automated link between bank transfers and cash register tills.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="accent-orange">02</span> The Offline Reality
          </div>
          <div class="card-body">
            <ul>
              <li>Frequent telecom network dropouts and power cuts paralyze standard cloud-only POS systems.</li>
              <li>When the internet drops, checkout grinds to a halt—forcing manual paper receipts or lost customers.</li>
              <li>Heavy web POS apps crash on low-spec counter PCs and budget Android phones.</li>
            </ul>
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">03</span> The "Invisible" Merchant
          </div>
          <div class="card-body">
            <ul>
              <li>Over <strong>95% of informal retailers</strong> keep fragmented or unverified financial records.</li>
              <li><strong>Zenith Bank cannot safely underwrite them:</strong> No audited books, no clean transaction history, no visibility on stock velocity.</li>
              <li>Banks miss lucrative SME lending margins; retailers stay starved of working capital.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Retail Infrastructure</div>
        <div>Problem Statement • Nigerian Retail Realities</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 3: THE SOLUTION ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge">The Solution</div>
          <h1 class="slide-title">Zeneva: The Local-First Retail OS</h1>
          <p class="slide-subtitle">Unifying Native Point-of-Sale, Zero-Fraud Virtual Terminals, and Predictive AI</p>
        </div>
        <div class="slide-num">03 / 08</div>
      </div>

      <div class="grid-2">
        <div class="card card-highlight">
          <div class="card-title">
            <span class="dot"></span> Local-First Architecture (Sub-10ms)
          </div>
          <div class="card-body">
            <p style="margin-bottom: 16px;">Built with <strong>Tauri 2.0 (Rust)</strong> and Next.js 15. Runs with a tiny 25MB footprint on Windows desktop, tablets, and Android.</p>
            <ul>
              <li><strong>100% Offline Functional:</strong> Local SQLite mirror records checkout sales instantly with zero internet.</li>
              <li><strong>Automatic Background Sync:</strong> Silently syncs to Cloud Firestore when connectivity restores. No cashier interruption.</li>
            </ul>
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">✦</span> Virtual POS: Instant Transfer Confirmation
          </div>
          <div class="card-body">
            <p style="margin-bottom: 16px;">Dedicated virtual transfer accounts provisioned per store with real-time webhook confirmation.</p>
            <ul>
              <li><strong>Instant Settlement:</strong> Real-time webhook captures customer transfers within 1.5 seconds.</li>
              <li><strong>Audible Cashier Chime:</strong> Loud audio alert & visual badge confirm receipt on the counter.</li>
              <li><strong>Auto-Reconciliation:</strong> Pending receipts flip automatically to "Paid" and print instantly. Fake alerts are mathematically impossible.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="dot"></span> Owner Privacy & Anti-Theft Protection
          </div>
          <div class="card-body">
            <ul>
              <li>Cashiers confirm transfer receipts on the POS terminal <strong>without viewing the owner's master bank account balance</strong>.</li>
              <li>Forensic audit trails log every void, discount override, and cart change to eradicate employee theft.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="dot"></span> Zen AI Predictive Analytics
          </div>
          <div class="card-body">
            <ul>
              <li>Powered by <strong>Google GenAI & Genkit</strong> with 41 specialized business data tools.</li>
              <li>Diagnoses "trapped capital" in dead stock, automates reorder thresholds, and flags margin erosion before cash flow collapses.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Product Core</div>
        <div>Solution Architecture & Differentiators</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 4: TRACTION ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge">Live Traction</div>
          <h1 class="slide-title">Proven Market Traction (Not an Idea)</h1>
          <p class="slide-subtitle">Live in Production with ₦307M+ in Audited Retail Commerce</p>
        </div>
        <div class="slide-num">04 / 08</div>
      </div>

      <div class="grid-4" style="margin-bottom: 30px;">
        <div class="metric-hero">
          <div class="metric-value">₦307.1M</div>
          <div class="metric-label">Platform GMV</div>
          <div class="metric-sub">Processed through Zeneva cash registers</div>
        </div>
        <div class="metric-hero">
          <div class="metric-value">4,645</div>
          <div class="metric-label">Total Receipts</div>
          <div class="metric-sub">Generated across physical checkouts</div>
        </div>
        <div class="metric-hero">
          <div class="metric-value">35,967</div>
          <div class="metric-label">Units Sold</div>
          <div class="metric-sub">Physical goods rung up by merchants</div>
        </div>
        <div class="metric-hero">
          <div class="metric-value">₦1.30M</div>
          <div class="metric-label">Daily Velocity</div>
          <div class="metric-sub">Platform sales momentum per 24 hours</div>
        </div>
      </div>

      <div class="grid-3" style="flex: 1;">
        <div class="card card-highlight">
          <div class="card-title">Anchor Merchant #1</div>
          <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">Safeway Dermatology</div>
          <div style="font-size: 22px; font-weight: 700; color: #FF7A1A; margin-bottom: 12px;">₦198,130,778 GMV</div>
          <div class="card-body">
            1,067 active SKU variants. Multi-staff clinic and retail counter running daily operations on Zeneva desktop.
          </div>
        </div>

        <div class="card">
          <div class="card-title">Anchor Merchant #2</div>
          <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">Uv Electric Ltd</div>
          <div style="font-size: 22px; font-weight: 700; color: #10B981; margin-bottom: 12px;">₦100,141,000 GMV</div>
          <div class="card-body">
            154 high-value industrial equipment and electrical SKUs. Continuous invoicing and counter checkouts.
          </div>
        </div>

        <div class="card">
          <div class="card-title">Device Ecosystem</div>
          <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">48.7% Native App</div>
          <div style="font-size: 22px; font-weight: 700; color: #38BDF8; margin-bottom: 12px;">48 PC / 13 Mobile / 60 Web</div>
          <div class="card-body">
            Merchants with installed Windows desktop apps log <strong>3.8x more daily transactions</strong> than web-only visitors, driving high retention.
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Telemetry & Growth</div>
        <div>Live Production Metrics (October 2026 Snapshot)</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 5: INNOVATION & ARCHITECTURE ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge">Under The Hood</div>
          <h1 class="slide-title">Industrial Resilience & Fraud Prevention</h1>
          <p class="slide-subtitle">Engineered for Sub-10ms Speed, Cryptographic Security & Financial Integrity</p>
        </div>
        <div class="slide-num">05 / 08</div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span class="dot"></span> Offline-First Sync & Cryptographic Vault
          </div>
          <div class="card-body">
            <ul>
              <li><strong>Local SQLite (`@tauri-apps/plugin-sql`):</strong> Mirrors catalog, customer, and receipt ledgers locally.</li>
              <li><strong>Rust Stronghold Vault:</strong> Offline transaction tokens and business credentials encrypted in OS hardware-backed memory.</li>
              <li><strong>Cache Tenancy Seal:</strong> Multi-tenant isolation verified by <code>pos_cache_owner_business_id</code> to prevent cross-account cache leakage.</li>
            </ul>
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">✦</span> HMAC-SHA512 Webhook Reconciliation Engine
          </div>
          <div class="card-body">
            <ul>
              <li><strong>Constant-Time Verification:</strong> <code>crypto.timingSafeEqual</code> prevents timing-attack spoofing on payment webhooks.</li>
              <li><strong>Sub-Second POS Matching:</strong> Ingested transfers instantly locate matching pending receipts by amount and reference, marking them "Paid" in real time.</li>
              <li><strong>Zero Cashier Account Access:</strong> Protects store owners while removing checkout bottlenecks.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="dot"></span> Real-Time Forensic Anomaly Engine
          </div>
          <div class="card-body">
            <ul>
              <li><strong><code>forensics.ts</code> Scanner:</strong> Evaluates cart actions against heuristic threat rules.</li>
              <li>Flags abnormal void frequencies, suspicious cost-price overrides, and off-hour sales patterns to detect internal retail embezzlement.</li>
            </ul>
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">
            <span class="accent-orange">✦</span> Business Health Index (BHI)
          </div>
          <div class="card-body">
            <ul>
              <li>Continuous telemetry calculations in <code>business-rating.ts</code>: Sales consistency, margin discipline, and inventory turnover.</li>
              <li>Turns raw unstructured retail operations into a tamper-evident credit rating score ready for banking underwriting.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Architecture</div>
        <div>Technical Specifications & Security Architecture</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 6: ZENITH BANK SYNERGY ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge badge-zenith">Strategic Value Proposition</div>
          <h1 class="slide-title">How Zenith Bank Wins with Zeneva</h1>
          <p class="slide-subtitle">A Direct Trojan Horse into Grassroots SME Deposits & Zero-Risk Credit Underwriting</p>
        </div>
        <div class="slide-num">06 / 08</div>
      </div>

      <div class="grid-2">
        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">01</span> Low-Cost Deposit Mobilization (CASA)
          </div>
          <div class="card-body">
            <p style="margin-bottom: 14px;">Every retail merchant onboarded onto Zeneva is automatically provisioned with a <strong>Zenith Bank Corporate / Collection Account</strong>.</p>
            <ul>
              <li>All store collections (cash, cards, and bank transfers) flow directly into Zenith Bank accounts.</li>
              <li>Mobilizes hundreds of millions of Naira in sticky, low-cost operating float away from digital fintechs.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="accent-orange">02</span> Direct Merchant Acquiring Expansion
          </div>
          <div class="card-body">
            <p style="margin-bottom: 14px;">Integrate <strong>Zenith Bank NIP Rails</strong> directly into Zeneva's Virtual POS.</p>
            <ul>
              <li>Zenith Bank earns transaction and processing fees on every retail transfer rung up across our merchants.</li>
              <li>Replaces generic fintech subaccounts with native Zenith payment acquiring rails.</li>
            </ul>
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">
            <span class="accent-orange">03</span> Automated, Zero-Collateral SME Underwriting
          </div>
          <div class="card-body">
            <p style="margin-bottom: 14px;">Zenith Bank can safely deploy credit using Zeneva's <strong>Business Health Index (BHI)</strong>.</p>
            <ul>
              <li>Disburse <strong>1-click inventory restocking loans</strong> directly inside the POS when stock runs low.</li>
              <li>Repayments are deducted automatically from incoming daily store GMV, ensuring virtually zero non-performing loans (NPLs).</li>
            </ul>
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">04</span> Elimination of the "Fake Alert" Epidemic
          </div>
          <div class="card-body">
            <p style="margin-bottom: 14px;">Zenith Bank becomes the standard of trust for retail checkouts across Nigeria.</p>
            <ul>
              <li>Instant cryptographic settlement confirmation protects merchants from fraudulent alerts and screenshots.</li>
              <li>Solidifies merchant loyalty to Zenith Bank's commercial network.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA × ZENITH BANK</div>
        <div>Strategic Partnership & Commercial Value Creation</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 7: BUSINESS MODEL ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge">Commercial Model</div>
          <h1 class="slide-title">Business Model & Unit Economics</h1>
          <p class="slide-subtitle">Multi-Tiered Revenue Model Built on Software SaaS, Payments & Financial Services</p>
        </div>
        <div class="slide-num">07 / 08</div>
      </div>

      <div class="grid-4" style="margin-bottom: 28px;">
        <div class="card card-highlight">
          <div class="card-title" style="font-size: 20px;">SaaS Subscriptions</div>
          <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">Recurring MRR</div>
          <div class="card-body" style="font-size: 15px;">
            Tiered subscription plans (Starter: Free / Pro: ₦8,500/mo / Business: ₦25,000/mo) for multi-branch sync and advanced AI inventory forecasts.
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title" style="font-size: 20px;">Payment Revenue</div>
          <div style="font-size: 28px; font-weight: 800; color: #EF4444; margin-bottom: 8px;">0.5% – 1% Fee</div>
          <div class="card-body" style="font-size: 15px;">
            Transaction processing fee on every dedicated Virtual POS transfer confirmation and payment gateway settlement.
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="font-size: 20px;">Lending Origination</div>
          <div style="font-size: 28px; font-weight: 800; color: #10B981; margin-bottom: 8px;">1.5% – 2.5%</div>
          <div class="card-body" style="font-size: 15px;">
            Loan origination and credit distribution commission shared with Zenith Bank on disbursed working capital and inventory restocking loans.
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="font-size: 20px;">Hardware Packages</div>
          <div style="font-size: 28px; font-weight: 800; color: #38BDF8; margin-bottom: 8px;">₦65k – ₦150k</div>
          <div class="card-body" style="font-size: 15px;">
            Bundled sales of thermal receipt printers, wireless barcode scanners, and pre-configured counter workstations.
          </div>
        </div>
      </div>

      <div class="card" style="flex: 1; display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 30px 50px;">
        <div>
          <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">High Merchant Stickiness & LTV</div>
          <p style="font-size: 16px; color: #94A3B8; max-width: 900px;">
            Once a retailer digitizes their catalog (1,000+ SKUs) and links daily staff workflows to Zeneva, switching costs are exceptionally high. 
            Native desktop merchants demonstrate a <strong>3.8x higher daily transaction frequency</strong>, yielding long customer lifespans.
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: 800; color: #FF7A1A;">₦56,000+</div>
          <div style="font-size: 14px; color: #94A3B8; font-weight: 600; text-transform: uppercase;">Average Estimated LTV</div>
        </div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Monetization</div>
        <div>Financial Modeling & Unit Economics</div>
      </div>
    </div>
  </div>

  <!-- ================= SLIDE 8: ROADMAP & ASK ================= -->
  <div class="slide">
    <div class="grid-bg"></div>
    <div class="slide-content">
      <div class="slide-header">
        <div>
          <div class="badge badge-zenith">The Path Ahead</div>
          <h1 class="slide-title">Roadmap & The Partnership Ask</h1>
          <p class="slide-subtitle">Scaling from ₦307M GMV to ₦5B+ in Annual Commercial Flow with Zenith Bank</p>
        </div>
        <div class="slide-num">08 / 08</div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span class="accent-orange">✦</span> Execution Roadmap
          </div>
          <div class="card-body">
            <ul>
              <li><strong>Q1 2027 (Next 3 Months):</strong> Direct Zenith Bank NIP API integration. Enable automated corporate account opening from Zeneva's onboarding screen.</li>
              <li><strong>Q2 2027 (Next 6 Months):</strong> Pilot embedded inventory restocking loans for top 25 high-velocity merchants with automated daily GMV deductions.</li>
              <li><strong>Q3–Q4 2027 (Next 12 Months):</strong> Scale to 5,000 active retail merchants across Lagos, Ibadan, Abuja, and Port Harcourt, driving over ₦10B in annualized Zenith processing volume.</li>
            </ul>
          </div>
        </div>

        <div class="card card-zenith">
          <div class="card-title">
            <span class="accent-red">✦</span> The Ask from Zenith Bank
          </div>
          <div class="card-body">
            <ul>
              <li><strong>Incubator & Accelerator Acceptance:</strong> Selection into the Zenith Bank / Beyond Limits Acceleration Cohort.</li>
              <li><strong>Core Banking & NIP Sandbox Access:</strong> Direct API partnership for virtual account generation, instant webhook settlements, and automated account opening.</li>
              <li><strong>Commercial Pilot Partnership:</strong> Co-branding Zeneva as Zenith Bank's preferred smart retail POS for emerging SME customers.</li>
              <li><strong>Executive Mentorship:</strong> Direct guidance from Zenith Bank's SME Banking & Digital Payments leadership.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card card-highlight" style="margin-top: 24px; padding: 24px 40px; display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 20px; font-weight: 700; color: #FFFFFF;">Ready to Revolutionize Nigerian Retail Together</div>
          <div style="font-size: 15px; color: #CBD5E1; margin-top: 4px;">Contact: Bello Imam • belloimam431@gmail.com • zeneva.space</div>
        </div>
        <div class="badge badge-zenith" style="font-size: 16px; padding: 10px 24px;">ZENITH BANK × ZENEVA</div>
      </div>

      <div class="slide-footer">
        <div class="footer-brand">ZENEVA • Scaling Tomorrow</div>
        <div>Thank You • Zenith Bank Hackathon 2026</div>
      </div>
    </div>
  </div>

</body>
</html>
`;

const htmlPath = path.resolve('public/pitch-deck.html');
const pdfPath = path.resolve('Zeneva_Zenith_Bank_Pitch_Deck.pdf');

console.log('Writing pitch deck HTML to:', htmlPath);
writeFileSync(htmlPath, htmlContent, 'utf-8');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

console.log('Rendering PDF using Chrome headless...');
const cmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" --run-all-compositor-stages-before-draw "file:///${htmlPath.replace(/\\\\/g, '/')}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  if (existsSync(pdfPath)) {
    const size = statSync(pdfPath).size;
    console.log(`SUCCESS: PDF generated successfully at ${pdfPath} (${(size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('PDF file was not found after execution.');
  }
} catch (err) {
  console.error('Error running Chrome headless:', err);
}
