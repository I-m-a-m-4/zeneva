# Zeneva

Tauri + Next.js retail POS/ERP. Desktop (Windows/macOS), Android, iOS.

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
- The 41 tools live in `src/app/api/chat/tools.ts`, not the route. Two of their
  query shapes have **no Firestore composite index** (`receipts` by
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
  `zen-status.tsx` too, or the status line renders raw camelCase. `ZenMark`'s
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

Routes restored so far: `api/chat`, `api/admin/*`, `api/dodo/checkout`,
`api/webhooks/dodo`. **Still `.bak`, so still 404 in production:** every
`api/paystack/*` route and `api/webhooks/paystack` (the NGN checkout path),
plus `api/platform-stats`, `api/download/[platform]`, `api/track`,
`api/upload` and `api/auth/create-login-token`.

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
