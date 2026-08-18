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
