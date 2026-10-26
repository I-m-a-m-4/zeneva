# 🌌 ZENEVA | Master Codebase Guide for AI Agents

> **Notice for Antigravity & AI Assistants**: Read this file first before inspecting individual source files. This document is the single, authoritative, and comprehensive source of truth for the Zeneva architecture, data pipelines, core rules, design language, and operational invariants.

---

## 1. Executive Summary & Product Identity

**Zeneva** is an industrial-grade, local-first retail Operating System (POS & ERP) engineered for high-volume retail operations, multi-store physical storefronts, inventory analytics, and offline-resilient cashier lanes.

- **One Unified Codebase**: A single Next.js 15 repository powers three deployment targets:
  1. **Desktop App (Windows/macOS)**: Native desktop shell compiled via **Tauri 2.0** (Rust backend). Ultra-low memory footprint, interfaces directly with thermal receipt printers, 1D/2D laser barcode scanners, and local SQLite database (`zeneva.db`).
  2. **Mobile App (Android)**: Touch-first Progressive Web App (PWA) / Trusted Web Activity (TWA) with camera-assisted barcode scanning, WhatsApp receipt dispatch, and background offline queuing.
  3. **Cloud Web Portal**: Back-office management, multi-branch reporting, inventory auditing, Smart Importer, and global platform admin.

---

## 2. Technology Stack & Pinned Dependencies

| Layer | Technology | Purpose & Constraints |
| :--- | :--- | :--- |
| **Front-end** | Next.js 15.5.9 (App Router, Turbopack, React 19) | Server & client components, dynamic streaming. |
| **Styling** | Tailwind CSS v3.4.1, Framer Motion | Custom design system (Warm linen `#F9F8F6`, orange `#F47125`, slate `#1e293b`). |
| **Desktop Core** | Tauri 2.0 + Rust (`@tauri-apps/api`, `@tauri-apps/plugin-sql`) | Native OS windowing, hardware I/O, local SQLite, encrypted Stronghold vault. |
| **Cloud DB** | Google Cloud Firestore (Firebase SDK v11.9.1) | Multi-tenant cloud source of truth, partitioned strictly by `businessId`. |
| **Local DB** | SQLite (`zeneva.db`) + IndexedDB | Local-first persistence. Offline sales write to local DB and queue for sync. |
| **Admin Cache** | Upstash Redis (`@upstash/redis`) + Firebase Admin SDK | Caches multi-tenant global aggregates (GMV, ARR, MRR) to avoid high Firestore read costs. |
| **AI SDK Pair** | `ai@7.0.55` + `@ai-sdk/react@4.0.58` | **PINNED PAIR**: On `ai@7`, `useChat` parameters belong to the transport (not `api`/`body`). |
| **AI Models** | Google Gemini + Genkit v1.20.0 | Powers Zen AI conversational assistant, multi-source Smart Importer, and Vision OCR. |
| **Hardware** | `html5-qrcode`, `jspdf`, `html2canvas`, ESC/POS | Camera barcode scanning, PDF invoice generation, and raw thermal printing. |

---

## 3. High-Level Architecture Diagram

```
                 ┌──────────────────────────────────────────────┐
                 │          Next.js 15.5.9 + React 19           │
                 │      (App Router / Turbopack / Tailwind)     │
                 └──────────────────────┬───────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
  │  Desktop Shell   │        │   Mobile App     │        │   Cloud Portal   │
  │  (Tauri 2 / Rust)│        │ (PWA / Android)  │        │  (Web Browser)   │
  └────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘
           │                           │                           │
  ┌────────┴─────────┐        ┌────────┴─────────┐                 │
  │ SQLite: zeneva.db│        │ Service Worker / │                 │
  │ Tauri Stronghold │        │ IndexedDB Cache  │                 │
  └────────┬─────────┘        └────────┬─────────┘                 │
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                         All mutations choke-pointed via:
                       addToQueue() in pos-context.tsx
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │             Cloud Firestore             │
                  │   (Multi-tenant source of truth by      │
                  │   businessId, protected by rules)       │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │     Zen AI Engine     │             │  Platform Admin /     │
        │ 46 Typed Server Tools │             │  Upstash Redis Cache  │
        │ Proposals Only (No DB │             │  Sub-200ms Global     │
        │ Writes on Server)     │             │  Aggregations         │
        └───────────────────────┘             └───────────────────────┘
```

---

## 4. Complete Directory & Module Map

### `src/app/` — Application Routes
- **`src/app/(app)/`**: Authenticated retail app shell (protected by auth & tenant context).
  - **`sales/`**: Multi-step POS cashier workflow (`select-products`, `customer`, `payment`, `review`).
  - **`inventory/`**: Catalog table, stock-take, SKU variant matrix, suppliers, health tab, and Smart Import.
  - **`ai-insights/`**: Zen AI conversational interface, proposal cards, and usage quotas.
  - **`audit-log/`**: Loss prevention scanner, cashier audits, transaction voids, and anomaly logs.
  - **`customers/`**: Customer directory, debt ledger, purchase histories, and WhatsApp hooks.
  - **`reports/`**: Financial reporting, business health score (4 revenue pillars), and sales velocity.
  - **`invoices/`**: B2B invoices, debt tracking, partial payments, and overdue reminders.
  - **`settings/`**: Store profile, receipt header customization, branch management, staff RBAC.
  - **`achievements/`**: Retail milestone ladders (revenue, sales volume, streak tracker).
  - **`storefront/`**: Public e-commerce configuration and WhatsApp order routing.
- **`src/app/(auth)/`**: Login, registration, password recovery, invite acceptance.
- **`src/app/admin-imamshaffy/`**: Super-admin platform dashboard (revenue velocity, telemetry, AI spend).
- **`src/app/api/`**: Serverless API routes (Chat, Paystack, Dodo Payments, Webhooks, Image Proxy).
  - *Note: `scripts/prepare-tauri.mjs` strips `src/app/api` for native desktop builds; native shells access hosted endpoints with CORS.*
- **`src/app/status/`**: Public observatory status page, 90-day uptime log, client platform release matrix.

### `src/context/` — State & Choke-Point Providers
- **`pos-context.tsx` (CRITICAL CORE)**: The 220KB+ central state engine. Houses `addToQueue`, offline transaction buffer, Firestore delta listeners, local cache hydration, SQLite synchronization, cart management, and tenant verification.
- **`branch-context.tsx`**: Active retail store branch selector, multi-location stock routing.
- **`i18n-context.tsx`**: Multi-language support (11 locale catalogs in `src/lib/i18n/messages/`).
- **`store-context.tsx`**: Public digital storefront cart and checkout state.

### `src/lib/` — Domain Libraries & Business Logic
- **`sqlite-sync.ts`**: Tauri SQLite bridge mirroring products, customers, and receipts to `zeneva.db`.
- **`forensics.ts`**: Pure mathematical loss-prevention algorithms (compares cashiers against peer medians).
- **`business-rating.ts`**: 4-pillar financial health scoring engine (`revenue = buyers × return rate × basket × margin`).
- **`achievements.ts`**: Verifiable achievement ladders (never fabricates dates).
- **`import/`**: 7-source Smart Import pipeline (XLSX, CSV, photo/OCR, clipboard, desktop UI scraper).
- **`plan.ts`**: Plan feature entitlement flags (`effectivePlan`, Starter, Pro, Business).
- **`ai-credits.ts`**: Weighted token meter (`tokensIn + tokensOut × 8`, 20,000 per credit).
- **`redis.ts`**: Upstash Redis client for admin dashboard payload serialization.

---

## 5. The 6 Invariable Architectural Laws

### Law 1: All Client Mutations Must Go Through `addToQueue`
- **Rule**: Never call `updateDoc`, `setDoc`, or `deleteDoc` directly from UI components for products, customers, or sales.
- **Why**: `addToQueue` in [`pos-context.tsx`](file:///c:/Users/Bello%20Imam/Downloads/zeneva/src/context/pos-context.tsx) is the single write choke-point. It automatically:
  1. Enforces Role-Based Access Control (RBAC).
  2. Injects the active `branchId`.
  3. Writes mutations synchronously to local SQLite (`zeneva.db`).
  4. Manages the offline reconciliation queue without losing sales during network outages.

### Law 2: Local Cache Ownership & Tenancy Isolation
- **Rule**: `pos_cache_owner_business_id` must validate any cached blob before hydration.
- **Why**: LocalStorage and IndexedDB keys (`pos_synced_products`, `pos_synced_customers`) are global keys with no embedded business ID. A cache stamped for another business must be rejected upon user switch or impersonation.

### Law 3: Zen AI Hard Security Boundaries
- **Server Write Prohibition**: Zen AI tools (`src/app/api/chat/tools.ts`) **never write to the database on the server**. Write tools return a proposal card (e.g. `proposeRestock`, `proposePriceChange`). The client approves it through [`proposal-guard.ts`](file:///c:/Users/Bello%20Imam/Downloads/zeneva/src/components/ai-insights/proposal-guard.ts), which re-validates live data and commits via `addToQueue`.
- **Zero Raw Prompt Retention**: User prompts are never archived in plain text to preserve tenant privacy. Only anonymized intent labels and allow-listed keywords are recorded for platform analytics.
- **Credit Metering**: AI turns must pass through `reserveCredits` and `settleCredits` in `ai-credits.ts`.

### Law 4: Loss Prevention & Rating Are Pure Arithmetic (No Hallucinations)
- **Loss Prevention** ([`src/lib/forensics.ts`](file:///c:/Users/Bello%20Imam/Downloads/zeneva/src/lib/forensics.ts)): Detectors name specific employees and flag potential internal theft, so every conclusion is calculated strictly via mathematical medians (excluding the subject from the median). Generative AI is forbidden here.
- **Business Rating** ([`src/lib/business-rating.ts`](file:///c:/Users/Bello%20Imam/Downloads/zeneva/src/lib/business-rating.ts)): Scores financial health across 4 core pillars (`buyers × return rate × basket × margin`). It is opt-in (`settings.ratingEnabled`), pure arithmetic, and accepts `now` as an argument.

### Law 5: Dev Server & Cache Invariants
- **Port 9007**: Development runs strictly on `http://127.0.0.1:9007`.
- **Never Run A Second `next dev`**: Multiple dev servers sharing `.next` corrupt webpack cache packs (`invalid code lengths set`). If a server is already bound to 9007, reuse it rather than spawning a duplicate process.
- **Clean Service Workers in Dev**: `npm run predev` executes `node scripts/clean-sw.mjs` to unregister stale production service workers so they don't serve cached build chunks over fresh edits.

### Law 6: Empty State vs. Unverified State
- **Rule**: An unreadable cache or a dropped connection must never render "No products found".
- `null` represents *loading / unverified*; `[]` represents *confirmed empty*.
- `catalogConfirmedEmpty` is the only witness that a store genuinely has 0 products on the server.

---

## 6. Design System & UI Conventions

- **Theme & Colors**:
  - Background: Warm linen (`bg-[#F9F8F6]`) for marketing/public pages, clean white/slate for authenticated tables.
  - Primary Accent: Tangerine Orange (`#F47125`, `hsl(var(--primary))`).
  - Dark Accent: Midnight Slate (`#1e293b`, `#0f172a`).
  - Success/Status: Emerald (`text-emerald-600`, `bg-emerald-50`, `border-emerald-200`).
- **Typography**:
  - Display/Headings: `font-display` or `font-bricolage` (Bricolage Grotesque).
  - Body & UI: `font-dm-sans` (DM Sans).
- **The Signature Zeneva Card**:
  ```tsx
  <div className="group relative p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden transition-all duration-300 isolate shadow-sm hover:shadow-md">
    {/* Animated hover slide-in background */}
    <div className="absolute inset-0 w-0 group-hover:w-full transition-all duration-500 ease-out bg-[#FFF7ED] -z-10" />

    {/* Signature Corner Accent Brackets */}
    <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
    <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

    {/* Pastel Icon Container */}
    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 relative z-10">
      <Package className="w-6 h-6" />
    </div>

    <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
  </div>
  ```

---

## 7. Key Operational Commands & Workflows

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs predev service worker cleanup and launches Next.js on `http://127.0.0.1:9007`. |
| `npm run typecheck` | Executes `tsc --noEmit` across the repository. |
| `npm run test:import` | Runs 110 automated checks on the Smart Importer pipeline (`scripts/test-import.ts`). |
| `npm run test:zen-cost` | Validates AI tool payloads, token stripping, and derives `ZEN_TOOL_COUNT`. |
| `npm run test:achievements`| Tests milestone calculations and prevents milestone date fabrication. |
| `git push origin main` | Pushes to GitHub and triggers continuous deployment on Vercel. |

---

## 8. Security & Secret Safety

- **Never read or display live secrets**: Files like `.env`, `.env.local`, `*.keystore`, and service account JSONs must never have their raw contents printed or logged.
- To inspect configuration, reference `.env.example` or check variable existence via key names only.
