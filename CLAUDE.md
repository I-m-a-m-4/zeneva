# Zeneva

Tauri + Next.js retail POS/ERP. Desktop (Windows/macOS), Android, iOS.

`docs/technology.md` is the map of the whole stack — what each piece is for and
why it is there. `docs/blueprint.md` is the product and design-language view
(the palette is orange, not the blue the old blueprint claimed). Read those
once; the sections below are the specific things that have cost real time.

## Local cache is global-keyed — check the owner before trusting it

`pos_synced_products`, `pos_synced_customers`, `pos_synced_receipts`,
`pos_synced_users`, `pos_synced_audit_logs`, `pos_offline_stats` and the cached
business doc are **single localStorage/IndexedDB keys with no businessId in
them** — unlike the SQLite mirror, which is keyed by businessId throughout. So
`pos_cache_owner_business_id` records who the blobs belong to, and the hydration
effect in `pos-context.tsx` refuses a cache stamped for a different business.

Why it matters: the backfills are deliberately gated on "the cache is empty" to
save Firestore reads, so a populated-but-wrong cache is never corrected — it is
trusted. That is how impersonating a tenant used to show the admin's own
products. Three rules:

- **A missing marker is a legacy install, not a mismatch.** Adopt and stamp it,
  or every existing install pays a full re-sync on upgrade.
- **`nuclearReset` leaves the marker standing on purpose.** Its `idb.clear()` is
  async and unawaited, so the stale marker is what makes the next hydration
  refuse the cache rather than race an unfinished wipe.
- While impersonating, `offlineProfile` must not supply the `businessId` — it is
  the *admin's* cached profile, and letting it through latched hydration onto the
  wrong business before the impersonated profile arrived.

Products are capped at `IMPERSONATION_PRODUCT_CAP` (500) while impersonating and
the run deliberately does **not** write `full_products_sync` — that stamp is keyed
by business, not by who fetched it, so writing it would make the real owner skip
their own full sync and try to sell from 500 of their 12,000 products.

### The stamp survives what it is stamping — the empty-POS bug

`full_products_sync` lives in **localStorage**; the products it certifies live in
**SQLite**. Nothing keeps those two storages in step, and the stamp carries a 24-hour
throttle, so a desktop install whose `zeneva.db` is locked or corrupt gets zero products
and a fresh stamp saying the sync succeeded — then refuses to try again for a day. That is
what put "No products found" on paying users' tills. Three defects, all now fixed, and the
shape of each is worth keeping:

- `fetchFullProducts` set `hasFullSyncedProducts` in its **`finally`**, so any throw still
  flipped `allProducts` from `null` (skeleton) to `[]` (empty state). It is set on the
  success path only.
- `syncProductsToOffline` swallowed write errors, so the stamp was written when nothing had
  reached disk. It returns `boolean` now, and the caller checks it.
- Nothing reconciled "stamp says synced, cache holds nothing". `cacheContradictsStamp`
  forces one re-sync per session, and `getCachedProductsResult` distinguishes *the mirror
  is empty* from *the mirror could not be read* — `getCachedProducts` returning `[]` could
  not.

`productSyncError` (`null | 'network' | 'permission' | 'cache'`) and
`isProductCatalogPending` are the context's answers for the UI; the POS reads both. Never
reintroduce a code path where an unreadable cache is indistinguishable from an empty shop.

## Loss prevention — read before touching a detector or an audit-log write

`docs/loss-prevention.md` is required reading for anything touching
`src/lib/forensics.ts`, the audit log page's forensic scan, or the
`runLossPreventionScan` tool.

The short version:

- **It is deliberately not AI.** The report names a member of staff and says
  their numbers look like theft, so every conclusion is arithmetic and `now` is
  an input. The model's only job is to relay `summary`.
- **Detectors compare a person against the median of their colleagues**, with
  the subject excluded from that median — in a three-cashier shop, including them
  lets a thief hide behind their own numbers.
- **Four audit-log details exist only to make detection possible** and cannot be
  backfilled: `saleCreatedAt`/`soldBy` on a void (the void *deletes* the
  receipt), `changes.{price,costPrice}` on `product.update`, `stockAtDeletion` on
  `product.delete`, and `priceOverridden`/`listPrice` on receipt items. Removing
  any of them silently kills a check.
- **`gap > 0` in T5 is load-bearing.** Receipts committed in one batch share a
  timestamp, so `gap >= 0` made every cashier who had worked offline look like
  they were generating sales.
- Receipt numbers are random (`rec-<uuid fragment>`), so **no detector may look
  for a numbering gap.**

## Business rating — read before touching the score or a surface that shows it

`docs/business-rating.md` is required reading for anything touching
`src/lib/business-rating.ts`, `src/hooks/use-business-rating.ts`, the Reports →
Business Rating tab, the top-bar badge, the dashboard focus card, the badge grid
on `/achievements`, or `getBusinessRating`.

The short version:

- **It is off until the owner opts in.** `settings.ratingEnabled` has **three**
  states and the middle one is load-bearing: `undefined` (never asked — the only
  state that shows the invitation card on the Reports tab), `false` (asked,
  declined — nothing anywhere, just a pointer to Settings), `true`. Collapsing
  `undefined` into `false` re-pitches the score to somebody who declined every
  time they open Reports. And `enabled === false` is **not** `score === null`,
  which already means "not enough sales to score yet".
- **Gating the four components is not enough.** Two `localStorage` effects in the
  hook are guarded on `enabled` too — the history write, and the **tier high-water
  seeding**, which is a one-shot: if it runs while the rating is off, the owner's
  first real level-up after opting in is already marked as claimed.
- **Zen AI needs the prompt edited, not just the tool.** The system prompt asks for
  the rating by name, so `RATING_SECTION_ON`/`_OFF` are spliced at
  `RATING_SECTION_TOKEN` in `src/app/api/chat/route.ts` per request;
  `getBusinessRating` refuses with an untagged result. Costs no read — the route
  already loads the business doc for the quota check. `useRatingBenchmark(enabled)`
  needs the flag too, or an opted-out shop pays a read per 12 hours.
- **Opting out is display-only.** `analytics-cache.ts` still counts them in the
  anonymous peer cohort, which needs the volume and costs the shop nothing.
- **It scores money, not tidiness.** Four pillars, one per term of
  `revenue = buyers × return rate × basket × margin`. Inventory condition is
  scored on the Inventory page's Health tab — **adding a fifth pillar for it**
  tells a shop that tidying product records is how it grows, which is false.
- **`now` is an input** and the scorer is pure, as in `src/lib/forensics.ts`.
  "Why did I drop four points" cannot be answered by a function that reads
  the clock.
- **The dormant-buyer trap.** The receipt listener holds 200 receipts while
  customers sync in full, so "customers with no receipt in the window" is mostly
  people whose receipt fell off the listener. Only `lapsedBuyers` (observed in
  the window, quiet for 30 days) gets a money figure, valued at **each buyer's
  own basket**. `neverSeenCustomers` is counted, never priced. Pricing that group
  produced "Win back 2,900 quiet buyers · ₦14.5M" — a number measuring the cap.
- **`customers: null` ≠ `[]`.** Null means the caller has no customer list and
  sets `customersKnown: false`; an empty array asserts nobody is on file.
- **Money on opportunities, points on pillars, never converted.** `headroom` is
  renormalised over the *measured* pillars so the four sum to `100 − score`.
- **An unmeasured pillar drops out of the weighting**, never scores zero.
- **Only the Reports panel fires the confetti.** The hook reports `leveledUpTo`
  and exposes `acknowledgeLevelUp()`; the top bar is mounted on every page, so
  celebrating in the hook fires twice and over whatever the owner was doing.
- **History is per-device localStorage** (the owner pays per read), so badges
  must not depend on it — `longestStreak` is derived from receipts instead.
- **`today` re-arms at midnight.** A desktop till stays open for days; a frozen
  `today` freezes the score, the streak and the history day key with it.
- **The peer benchmark costs no extra Firestore reads.** It rides inside the
  existing six-hourly `getCachedPlatformAnalytics` scan, which already holds
  every receipt and product in memory. It publishes to
  `platform_stats/rating_benchmark`, already readable by any signed-in user and
  Admin-SDK-written — **no rules change**. Keep the cohort floors (20 sales to
  join, 5 businesses to publish, applied per pillar too) and write it as a
  **plain nested object** — `set()` does not parse dots as field paths.
- **The daily insight may not invent a statistic.** In
  `src/lib/rating-insights.ts`, `principle`/`because` are figure-free claims about
  how retail works and `yours` is always their own arithmetic. "83% of small
  businesses fail because…" is banned — nobody measured it here. And `peer` carries
  **both** sides itself, both pillar scores: pairing it with `yours` would draw a
  share of sales beside a score out of 100.
- **Praise needs a cohort; a flawless shop still gets a card.** `ahead-*` exists
  only against a real median, so `ceilingInsight` is the fallback — it names the
  weakest measured pillar and reuses **that pillar's own `fix`**. Without it the
  card vanished for shops in the nineties, which is who keeps the habit.
- **A `npx tsx` harness must be `.ts`, not `.mts`.** No `"type": "module"` here, so
  `src/**` compiles to CJS and a true-ESM importer fails named-import interop —
  reporting `does not provide an export named 'RATING_WINDOW_DAYS'` for a constant
  that is plainly exported.

## Achievements — read before touching a badge, a date on one, or the unlock card

`src/lib/achievements.ts` (pure ladders), `src/hooks/use-achievements.ts` (the seen
set and the unlock queue), `src/components/achievements/*` and
`src/app/(app)/achievements/page.tsx`. `npm run test:achievements` is 48 checks over
the pure module and is the fastest way to know you have not broken a date.

- **Nothing may invent a date.** The page this replaced stamped product and customer
  milestones with `new Date()` plus `milestone.value / 10` milliseconds so the
  timeline would sort — and then printed that on a downloadable certificate.
  `products.length >= 100` has no event behind it, so `earnedAt` is `null` and the
  surface shows the *figure* instead. Sales crossings do have an event, and
  `salesCrossingDates` finds it by walking the held receipts forward from
  `base = max(0, lifetimeRevenue − heldSum)`. A threshold passed before the window
  never satisfies `before < value`, so it gets honest silence rather than being pinned
  to the oldest receipt in the cache. The clamp matters: the counter can lag a receipt
  already in the cache, and a negative base moves *every* date one rung early.
- **The module never reads the clock at all** — stronger than the "`now` is an input"
  rule in `forensics.ts`/`business-rating.ts`, and for the same reason.
- **One figure, one ladder.** Sales badges use lifetime `stats.totalRevenue`, the same
  figure `notification-rules.ts` announces. The old page summed the **200** held
  receipts and filtered them to the current year, so a shop was told it had crossed
  ₦1 million and found no badge for it. `revenueIsFloor` marks the fallback so a floor
  is never stated as a total.
- **`safeToDate` returns the epoch, not null**, so epoch receipts are filtered in
  `computeAchievements` and re-checked at every render site. Miss that and a receipt
  with no timestamp dates a milestone to 1 January 1970.
- **`productCount: null` ≠ `0`** — null drops the ladder out of the earned/total tally
  and out of `focus`; `0` asserts an empty catalogue. Impersonation passes `null`
  because products are capped at `IMPERSONATION_PRODUCT_CAP` (500) and the ladder tops
  out at 1,000, so a 12,000-product shop would be shown 500 as its ceiling.
- **`focus` is the nearest rung, not the biggest prize.** Two customers short beats a
  ₦95m gap for getting somebody to act.
- **Celebration history is keyed per business** (`zeneva_ach_seen_<id>`), and so are
  the goals (`zeneva_goals_<id>`). Both were bare global keys — the same trap CLAUDE.md
  documents for the `pos_synced_*` blobs. The legacy `seenMilestones` is **not**
  migrated (it holds labels, not ids, and its owner is unknowable); legacy `userGoals`
  is adopted once, and **not** while impersonating.
- **The first run seeds silently.** Without it an existing shop is walked through eight
  cards at once. Same one-shot risk as the rating's tier high-water seeding: it is
  gated on `!isLoading` and a present business doc, or it seeds an empty set against
  half-hydrated data and the real figures arrive as eight fresh unlocks.
- **Only the top rung per ladder is celebrated, and `ids` retires the whole batch.**
  Retiring only the rung shown makes ₦500k announce itself *after* ₦1m.
- **Owner only, never while impersonating**, computed exactly as the notification
  trigger pass in `(app)/layout.tsx` computes it. A cashier is not who wants to be told
  the shop crossed ₦1m — the milestone notification is already `target: 'owner'`.
- **One mount, in the layout.** `<AchievementCelebration />` sits beside
  `<UpdateRequiredModal />` because the moment worth celebrating is the sale that
  crosses the line, at the till — and because the rating's confetti already taught that
  a hook consumed by two components fires twice.

## Loading skeletons — read before adding one, or before a page shows an empty state

There used to be exactly **one** skeleton for the whole app: `src/app/(app)/loading.tsx`,
a route-group fallback shared by all thirty routes. It drew a four-up stat grid over five
full-width bars, which is the shape of almost none of them — the POS is a product grid,
Receipts is one card holding a table, Settings is a two-column split. It is **deleted**.
Each route now has its own `loading.tsx`; `src/components/shared/page-skeletons.tsx` holds
the twelve primitives they share, with every height traced back to the component it stands
in for.

Four rules:

- **Never add page padding.** `(app)/layout.tsx` renders `<main>` with `p-4 sm:p-6`
  already. The old universal skeleton wrapped itself in `p-4 sm:p-6` too, so it sat at
  double the real gutter and the whole page slid left the moment data arrived. Use
  `SkeletonPage` for the vertical rhythm and let `main` do the gutters. Two documented
  exceptions: `/ai-insights` is the only full-bleed route (`isFullBleedRoute`) and supplies
  its own, and `onboarding` is a `fixed inset-0 z-50` overlay that ignores `main` entirely —
  its skeleton must be the same overlay or it flashes as a strip at the top.
  `sales/pos/layout.tsx` adds its **own** `p-4 sm:p-6` on top of `main`'s and keeps the
  4-step progress nav mounted across steps, so the four POS step skeletons add neither.
- **A page with an in-page skeleton needs a colocated `skeleton.tsx`, not a second
  drawing.** `loading.tsx` covers the route transition; the in-page branch covers the data
  wait, which is far longer and the one users actually watch. Five routes have both
  (`dashboard`, `inventory`, `inventory/details`, `billing`, `settings`) and each exports one
  `…BodySkeleton` that both import. They had all drifted: billing's predated the AI credits
  rail, settings' had no tab bar, and `inventory/details` — which is the **edit form** — was
  being covered by a skeleton drawn for a read-only product view.
- **Mirror the real box, and check what actually renders.** The dashboard's showed four
  cards at `lg:grid-cols-4`; an owner gets eight (nine with recorded debts) at
  `lg:grid-cols-3`, and staff without `view_reports` get three and no charts — which is why
  `DashboardBodySkeleton` takes `cards` and `charts`, and why `hasReportPermission` is
  computed *above* the early return.
- **No text in a skeleton.** A `loading.tsx` is a server component and cannot reach
  `useI18n`, so any copy ships as untranslated English in an eleven-language app.
  `role="status"` + `aria-busy` with no label is the deliberate choice; the bars say
  nothing worth reading anyway.

**And the empty state is not the loading state.** `null` means "still coming", `[]` means
"there are none" — collapsing them is what put "No products found" on a POS whose
catalogue had simply failed to load. Keep the skeleton up while the value is `null`
(`select-products/page.tsx:470`, `inventory/page.tsx`'s table body), and give the failure
its own branch that says *why* and offers Retry. `products === null` is load-bearing in
both.

## Never run a second `next dev` in this repo

Two dev servers share `.next`. That corrupts
`.next/cache/webpack/server-development.pack.gz` (`invalid code lengths set`) and
then fails **unrelated** modules with:

```
⨯ TypeError: Cannot read properties of undefined (reading 'call')
    at eval (webpack-internal:///(ssr)/./src/components/ui/tabs.tsx:12:78)
```

The stack names whatever imported the broken module — `ui/tabs.tsx` here — so it
sends you looking in a file that is fine. Pages still answer `200` (Next falls back
to client render) until the cache degrades far enough to serve a hard `500`.

Recovery: stop every dev server, then

```bash
rm -rf .next/cache/webpack/*-development*   # leave the production packs alone
npm run dev
```

A server is usually already running. Reuse it on **`127.0.0.1:9007`** — not
`localhost`, which resolves to `::1` where a stale server can answer. Note the
listener binds `::`, so `Get-NetTCPConnection -LocalPort 9007` is how you find the
real PID before assuming the port is free.

## Notifications — read before adding one, or debugging one that never arrived

`docs/notifications.md` is required reading for anything touching
`src/lib/native-notifications.ts`, either of the two document→OS bridges,
`src/lib/notification-rules.ts`, or an admin surface that sends something.

The short version:

- **A notification is a Firestore document.** Writing the document is what raises
  the OS notification, fills the bell and gives the tap somewhere to land. There
  is no second way in, and exactly two bridges turn documents into popups:
  `users/{uid}/notifications` in
  `src/components/shared/native-notification-listener.tsx`, and the platform-wide
  `notifications` collection in `src/app/(app)/layout.tsx`.
- **Tauri shells only.** The browser `Notification` API is deliberately unused —
  it is inconsistent across the web app, the PWA and the TWA, and the bell plus a
  toast already cover them. Three `new Notification(...)` call sites were removed;
  do not add a fourth.
- **A `system_broadcasts` document only drives the banner.** It is read by neither
  bridge and not by the bell, which is why an admin broadcast reached the bell but
  never a phone. Send Broadcast now writes an announcement alongside it.
- The Alerts page's `pushToPhones` switch defaulted to **off**, so a send reported
  success and pushed nothing. It defaults on.
- **Announcements are filtered on read, not by rules** — the collection is
  readable by every tenant by design. Every reader must call
  `filterVisibleAnnouncements`, or soft-deleted announcements and alerts addressed
  to one person show up in everybody's bell.
- Triggers are **pure rules with `now` as an input** and read only what the POS
  context already holds, so the whole feature costs writes and **no reads**. Every
  rule needs a deterministic id (that is the idempotency guarantee), a day
  component if it recurs, and a cap.
- `owner`-targeted rules run **only on the owner's device** — Firestore rules do
  not let a cashier write into the owner's feed — and the runner is skipped
  entirely while impersonating.
- The **overdue-credit-sales figure is a floor, not a total.** It is computed from
  the 200 receipts the listener holds, so an older unpaid sale is not in memory to
  be counted — the same capped-window trap as the rating's dormant buyers. It links
  to `/invoices` because that page queries properly; never restate it as the shop's
  total debt.

### Telling the platform owner — `error_logs`, not a new channel

A silent failure on a paying user's till is only a bug report if somebody sees it. The
channel that reaches the owner already exists, so **reuse it**: `error_logs` is
`allow create: if true` / read by super-admin only (`firestore.rules:222`, `:386`), and
`src/app/admin-imamshaffy/layout.tsx` holds a live `onSnapshot` on the newest 20 that
badges unread against `localStorage.zeneva_last_viewed_errors` and calls
`notify(...)` → `/admin-imamshaffy/developer-logs` for anything under 60 s old.

`reportAnomaly(code, message, ctx)` in `src/lib/error-logger.ts` writes into it with
`type: 'anomaly'`, and it is **deliberately not routed through `logErrorToFirestore`**:
that path's `NOISE_PATTERNS` drops exactly the strings an anomaly is made of
("permission-denied", "Failed to fetch"), and its 5-per-session budget is for a page
that is falling over — an anomaly must not be crowded out of it.

- **Throttled per code, per device, per day** (`zeneva_anomaly_<code>` + a session set).
  A device with a broken `zeneva.db` hits the same anomaly on every launch; the point is
  to learn that it happened, not to buy a document each time. If the write itself fails
  the throttle key is **removed again** so the next launch retries, and the payload goes
  into the `failed_logs` queue.
- **An anomaly is a condition, not an exception.** The five that exist are the
  empty-POS causes — `product_cache_write_failed`, `product_sync_permission_denied`,
  `product_sync_failed`, `product_cache_unreadable`, `product_cache_lost` — and three of
  those throw nothing at all. Anything that leaves a shop unable to trade belongs here;
  a caught `console.error` does not.
- The admin popup reads `data.message || data.errorMessage || …` and titles anomalies
  **"Zeneva Anomaly Detected"**, so they are distinguishable from crash logs at a glance.

## Zen AI — read before touching the chat client or a stale-bundle bug

`docs/zen-ai.md` is required reading for anything touching `/ai-insights` or
`src/app/api/chat/route.ts`.

The short version:

- `ai@7` + `@ai-sdk/react@4` are the **matching pair**; the version numbers are
  not meant to line up. On v7, `useChat` accepts **neither `api` nor `body`** —
  they belong to the transport. Passing them is silently ignored, which strips
  `businessId`/`userId` from the request and makes every prompt 401.
- **A stack-trace line number that doesn't match the source means a stale
  service worker, not a bad edit.** `npm run build` leaves a production
  `public/sw.js` behind, and the dev server happily serves it; the worker then
  serves precached *built* chunks over your source changes. A normal refresh
  goes through the worker and does not help.
- The dev guard in `src/components/shared/client-initializer.tsx` unregisters
  stray workers but deliberately spares `firebase-messaging-sw.js` — killing
  that one breaks push notifications in dev.
- **Zen AI never writes on the server.** A `propose*` tool returns a card; the
  write happens on the client through `addToQueue` after the owner approves, and
  `proposal-guard.ts` re-validates it against live data first. `addToQueue` is
  the only thing that enforces RBAC, injects `activeBranchId`, survives offline
  and updates the SQLite mirror — a direct `updateDoc` skips all four.
- **Every Gemini call meters, or it is free.** `src/lib/server/ai-credits.ts` is
  the only place that prices AI work or moves a balance — the chat route and all
  five `src/ai/flows/*` server actions go through it. A new call site that does
  not `reserveCredits` costs the platform money silently, which is exactly how
  `visualCount` ran unmetered on the platform key for months. Credits come from
  **weighted tokens** (`tokensIn + tokensOut × 8`, `20_000` per credit), so a
  24-step forensic scan costs what it costs and `linkToPage` costs 1. Reserve
  inside a transaction, settle in `onFinish`, release on error — with a
  `creditsResolved` latch, because nothing promises only one of those fires.
  **`aiUsageCount` counts credits, not messages**, and `AI_MONTHLY_LIMITS` is now
  15/400/1,500 — so every surface that renders it must say "credits". The
  allowance is hand-typed in four places besides the constant (both `plans.proF5`
  / `plans.bizF3` across all eleven catalogs, `use-cases/page.tsx`,
  `help-center/page.tsx`). No new **top-level** field was added on purpose:
  `fieldsUnchanged()` is a deny-list, so the reservation moves the two fields
  already in `entitlementFieldsLocked()`. `docs/zen-ai.md` has the rest.
- **Credits are purchasable, and the client never writes the balance.** Prices live in
  `src/lib/credit-packs.ts` (250/1,000/5,000; ₦2,500/₦8,000/₦35,000, $2.50/$8/$35) and
  **both servers re-derive the price from the `packId`** — `metadata` is not a price
  list. Three writers touch `aiBonusCredits`: `purchaseAiCredits`
  (`src/actions/ai-credits.ts`, Paystack/NGN, replay-guarded on the `reference`), the
  Dodo webhook (USD), and the admin grant — all Admin SDK or super-admin, because the
  field is in `entitlementFieldsLocked()`. Four things that already went wrong:
  the Dodo credit branch must sit **before** `if (businessId && planId)` or a pack (which
  has no `planId`) returns 200 and grants nothing; `kind: 'credits'` on the `purchases`
  row is what keeps a one-off pack out of MRR/ARPU (`purchaseKind` reads a **missing**
  `kind` as `'subscription'`, and lifetime/TTM totals keep packs on purpose — they are
  totals, not rates); it is always `FieldValue.increment`, never `previous + credits`,
  because a chat turn is debiting the same field; and `ai_credit_ledger` needs **no
  `firestore.rules` entry** (the super-admin catch-all covers it) which also means no
  tenant can read it. Buying happens in exactly one place —
  `settings/ai-credits-section.tsx`, mounted on `/billing` as a **sibling** of the plans
  card because `subscription-section.tsx` early-returns for `accessLevel === 'lifetime'`,
  and rendering **one** rail per shop. `/ai-insights` only links there
  (`/billing?topup=1#ai-credits`).
- The tools live in `src/app/api/chat/tools.ts`, not the route — and the count is
  derived from `TOOL_LINES` in `zen-status.tsx`, so don't hardcode it anywhere.
  Two of their query shapes have **no Firestore composite index** (`receipts` by
  status+date, `auditLogs` by date) and filter in memory on purpose —
  "fixing" that into a proper query makes the tool throw at call time.
- **Zen AI never stores prompt text.** The admin board at
  `/admin-imamshaffy/ai-usage` answers "what are people asking" from an intent
  label plus a fixed keyword allow-list (`src/lib/ai-analytics.ts`), written
  per day to `platform_stats/ai_usage_global/daily/{date}`. That is a privacy
  boundary, not a missing feature — the board is platform-wide, so a raw
  prompt archive would expose every tenant's customers to the platform owner.
  The rollup uses **nested maps**, not the dotted field paths used on the
  business doc in the same batch: `set()` does not parse dots as paths.
- Chat UI is four components in `src/components/ai-insights/`, plus
  `proposal-guard.ts`. Adding a tool means a `TOOL_LINES` entry in
  `zen-status.tsx` too, or the status line renders raw camelCase — and check that
  `groupForTool` in `src/lib/ai-analytics.ts` actually matches the new name, or it
  is filed under Inventory by default. `ZenMark`'s
  paths are copied verbatim from `AppConfig.logoIconUrl`; its gradient ids must
  stay per-instance, and its sheen is SMIL, so reduced-motion is handled in JS
  rather than CSS.

## Smart import — read before touching the importer or adding a source

`docs/smart-import.md` is required reading for anything touching
`src/lib/import/*`, `src/components/inventory/smart-import/*`, or
`src/app/api/import/route.ts`.

The short version:

- **Seven sources, one pipeline.** Excel/CSV, paste, photo of stock, photo of an
  invoice, typed sentence, capture from another Windows program, barcode — all become
  `RawTable` → `mapColumns` → `DraftProduct[]` → `stageRows` → `addToQueue`. Rows read
  off a photo go through `aiRowsToTable` into the *same* mapper and coercion as a
  spreadsheet, which is why `₦12,000` means the same thing from all seven and why a
  money-parser fix fixes all seven.
- **Structured data is free; understanding mess costs credits.** A clean spreadsheet
  import is free at any size, including a headerless one — `column-map.ts` infers from
  the *values* (two money columns: the higher mean is the selling price). Only the
  residue reaches a model. `IMPORT_CREDIT_FLOORS` in `src/lib/import/pricing.ts` is
  client-safe on purpose so the UI **quotes before it spends**; the server charges
  `max(measured, floor)` via the new `floor` argument to `settleCredits`. The floors
  are a product decision, not a measurement, and the module says so.
- **It is a route, not a Genkit flow, and that is not stylistic.**
  `prepare-tauri.mjs` wipes `src/ai` for native builds, which is why `visualCount`
  never worked on desktop/Android/iOS — it returned a canned string. Its dialog was
  also never mounted, so it was dead on the web too. `/api/import` has `OPTIONS` +
  CORS so the shells reach it, and `generateObject` reports real tokens.
- **The model is never an authority.** Every response is re-validated by pure code:
  `applyAiMapping` only fills unclaimed columns, `applyAiMatches` can only pick from
  candidates the local index produced (checked on both sides — a hallucinated id would
  merge a row into an unrelated product), and `bulk-op` returns a *rule* that is
  previewed before a single write. Nothing server-side writes to `products`.
- **Duplicates: be certain, or ask.** SKU is the barcode here, so a code match is a
  fact and is never a question. `50cl` and `500ml` reduce to the same normalised name
  via `extractSize` — no string metric finds that, they share no characters. A
  *disagreeing* size costs 0.45 of the score. An unanswered question always resolves
  to `create`, never a merge: a visible duplicate is deletable, a wrong merge silently
  corrupts a stock figure for months. A certain match **claims** its product so a
  second row for it is forced to be a question.
- **`ImportIntent` is asked once per batch, never inferred per row.** The same file
  means "my correct figures" or "goods that just arrived" and no cleverness recovers
  which. `overwrite` writes only the fields the draft actually carries — `undefined`
  means the source said nothing, `0` means it said zero, which is why `parseMoney`
  returns `number | null`. `add-stock` takes cost from an invoice, never the selling
  price, and fills a missing SKU but never replaces one.
- **The XLSX reader is hand-written** because npm's SheetJS is pinned at 0.18.5 with
  CVE-2023-30533 and this parses supplier files. `fflate` is now a **direct** dep
  (it was transitive via `jspdf`). Cells are placed by **column letter**, rich text is
  joined across `<r><t>` runs, and dates need `styles.xml` or an expiry imports as
  `46388`.
- **Bulk edit emits a rule, not values.** Margin ≠ markup (50% on ₦100 is ₦200 vs
  ₦150) and shopkeepers say "50%" for both. A margin with no cost price is **skipped**,
  never computed from 0 — that sets the price to 0 and the POS sells it free.
  `groupWrites` turns a uniform `set` over 1,000 products into one queued action.
- **The desktop bot has two paths and both are needed.** `src-tauri/src/win_grid.rs`
  reads a legacy program's grid directly via UI Automation (`list_desktop_windows`,
  `read_desktop_grid`) — **read-only**: tree navigation plus `Name` and `ControlType`,
  nothing that sends input. It is a tree *walk* rather than `FindAll` with a property
  condition because `windows` 0.61 has no `VARIANT::from(i32)`, and because a walk is
  bounded where a descendants-scope `FindAll` materialises every cell first. All of it
  is `cfg(target_os = "windows")` with same-named stubs elsewhere — **the mobile targets
  build from this crate**, so an ungated module breaks Android and iOS. Both branches
  are `cargo check`ed. Apps that draw their own grid expose nothing to UIA, which is
  why the focus-triggered clipboard bridge stays as the fallback.
- **`localYmd` exists because `toISOString()` is a day early in Lagos.**
  `new Date('3 April 2027')` is local midnight = `2027-04-02T23:00Z`.
- `npm run test:import` — 110 checks, and it must be `.ts` not `.mts` (same
  CJS-interop trap as the rating harness). It found both of the above on first run.
- Two adjacent things found while building this and worth knowing: the chat route's
  global daily counter **only ever incremented**, so the `date` guard made day two read
  day one's total and 429 everybody from the second request onward (fixed —
  `globalDateIsToday`); and **`update-settings` has no case in the queue's commit
  switch**, so a queued settings write updates the screen, never reaches Firestore and
  retries forever. New categories use a direct `updateDoc` because of it.

## Android signing — read before touching release builds

`docs/android-signing.md` is required reading if the task involves the
Android release, signing keys, or a Play Console upload rejection.

The short version, because this cost two days once already:

- The registered upload key has alias **`zeneva`**, SHA1
  `65:A6:D6:7D:31:85:86:53:10:7C:ED:1F:97:4F:0A:C4:F9:0D:AE:FF`.
  Local `key.properties` says `keyAlias=upload` — that is wrong and is what
  caused the "signed with the wrong key" rejection.
- **Never generate a signing keystore in CI.** `generate-keystore.yml` used
  to do this and silently replaced the key Play had registered. It is
  disabled; leave it that way.
- **Search git history before believing a key is lost.** The "lost" key was
  in history at blob `faedf5a` the whole time.
- `release.yml` verifies the built AAB's fingerprint against the `EXPECTED`
  value in its *Verify AAB signing certificate* step and fails the job on
  mismatch. Rotating the key means updating that value *and* the hash in
  `public/.well-known/assetlinks.json`.

## Build env — read before editing release.yml

`tauri.conf.json`'s `beforeBuildCommand` runs `scripts/tauri-prebuild.mjs`,
which calls `npm run build` a **second** time from inside the `tauri-action`
step. That rebuild is the one that gets bundled.

So `NEXT_PUBLIC_*` secrets must be declared in the **workflow-level `env:`
block**, never only on a step. Declaring them per-step means the nested
rebuild sees `undefined`, Firebase initialises with an empty config, and
every login fails with "Invalid email or password" on a correct password.
That shipped in 3.1.2 across desktop, Android and iOS.

`release.yml` has a *Verify Firebase config is present* step that fails the
build if any required value is missing. Keep it.

## API routes — check the filename before debugging the client

A route only exists if the file is named exactly `route.ts`. Several were
renamed to **`route.ts.bak`** during an old static-export experiment and were
never restored, so `zeneva.space/api/<name>` answers the **HTML 404 page**.
Client code then calls `response.json()` on `<!DOCTYPE html>` and reports:

```
SyntaxError: Failed to execute 'json' on 'Response':
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

That message is about JSON parsing and the fault is a missing file — so when a
`fetch` to your own API reports a parse error, check for a `.bak` first:

```bash
find src/app/api -name "route.ts.bak"
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://zeneva.space/api/<name>
```

Two things that travel with that rename and must not come back:

- **`export const dynamic = 'force-static'`** was injected at the top of these
  files. It is meaningless on a POST handler. Use `force-dynamic`.
- A stray **UTF-8 BOM** was written into the middle of some of them by a
  PowerShell `>` redirect (see the Shell section). `grep -P '\xEF\xBB\xBF'`.

A live route and a leftover `.bak` can sit in the same folder, so
`find … -name "route.ts.bak"` **over-reports**: nine of them are stale
duplicates next to a working `route.ts`. Ask which of the two exists:

```bash
for d in $(find src/app/api -name "route.ts.bak" | xargs -n1 dirname); do
  [ -f "$d/route.ts" ] && echo "dupe (live): ${d#src/app/api/}" \
                       || echo "STILL 404:   ${d#src/app/api/}"
done
```

**Still 404** — only a `.bak` exists — re-verified against disk **18 August 2026**,
and it is down to **three**:
`api/auth/create-login-token`, `api/paystack` (the bare root), `api/upload`.

Everything else has a live `route.ts`, including six that this file listed as 404
for months and are not: `api/download/[platform]`,
`api/paystack/activate-terminal`, `api/paystack/banks`,
`api/paystack/create-subaccount`, `api/paystack/resolve-account`,
`api/paystack/verify-customer`. `api/paystack/banks` was probed in production and
returned a real Paystack bank array, which proves both that it is deployed and that
`PAYSTACK_SECRET_KEY` is configured live.

So the NGN checkout path is **not** broken at the route level any more — only the
bare `api/paystack` entry point is still missing, and nothing calls it.

Also live: `api/chat`, `api/admin/*`, `api/dodo/checkout`, `api/webhooks/dodo`,
`api/webhooks/paystack`, `api/paystack/verify`, `api/paystack/verify-transaction`,
`api/platform-stats`, `api/track`.

**Re-check the list rather than trusting it.** Six entries here were wrong because a
route was restored and this file was not updated — the `find` above takes a second
and is the only thing that actually answers the question.

`scripts/prepare-tauri.mjs` deletes `src/app/api` wholesale for native builds,
so the desktop and mobile shells call the hosted API by absolute URL. A route
handler therefore needs `OPTIONS` + CORS headers or the native apps cannot
reach it — a JSON body triggers a preflight.

**Fixing a route only takes effect once zeneva.space is redeployed.** Rebuilding
the desktop app does not help; it has no API of its own.

## Announcing an update to store users

Play Store and Microsoft Store installs cannot self-patch, so the in-app
banner (`src/components/update-prompt.tsx`) tells them a new version exists.
It reads Firestore `system_config/app_release` and stays hidden until that
document exists.

```bash
npm run announce-release -- --show          # what is currently announced
npm run announce-release -- 3.1.7 --notes "Faster receipts"
npm run announce-release -- --clear         # hide the banner again
```

Only announce a version that is **already live in the stores**. Announcing
during a rollout sends users to a listing still serving the build they have.
The script refuses any version not newer than `package.json` as a backstop,
but it cannot know whether the store rollout finished — that part is on you.

## Releasing

Version is read from `package.json`, not the git tag. Bump `package.json`,
`package-lock.json`, and `src-tauri/tauri.conf.json` together, then tag
`v<version>`. A tag that disagrees with `package.json` publishes artifacts
to the wrong release.

## Shell

Windows dev machine. The Bash tool is available and is the better choice for
heredocs, `git commit -F -`, and anything POSIX. In PowerShell:

- `&&` and `||` do not exist — use `;` and `if ($?)`.
- Never use `>` to write binary; it inserts a BOM and corrupts the file.
  Use `cmd /c "... > file"` instead.

## Secrets — never open the file, only learn the name

Every tool result is transmitted to the model provider in full. Reading a file
that holds a live credential publishes that credential, and no later edit or
deletion un-sends it. So: **never open a file that contains a secret value.**

That covers `.env`, `.env.local`, `.env.*.local`, `.env.production`,
`key.properties`, `*.jks`/`*.keystore`, `*serviceAccount*.json`,
`firebase-adminsdk*.json`, `AuthKey_*.p8`, `*.p12`, `*.pem`. These are denied
in `~/.claude/settings.json`, but the rule is the point, not the enforcement.

To work with a secret you only ever need its **name**, never its value:

```bash
cat .env.example                       # names only, safe and readable
grep -rho 'process\.env\.[A-Z0-9_]*' src | sort -u
grep -c PAYSTACK_SECRET_KEY .env.local  # confirm presence without printing it
```

`.env.example`, `.env.sample`, and `.env.template` are deliberately *not*
denied — they are the sanctioned way to see what a deployment expects.

If a value genuinely must be verified, the owner checks it outside the session
and reports only yes/no. Never echo, `cat`, or print a credential into a
transcript, and never paste one into the chat — a key that has appeared in a
session is burned and must be rotated.

The deny list only constrains the `Read` tool. `cat .env.local` through Bash or
PowerShell is not blocked by it, so treat shell reads of these paths as equally
off-limits.
