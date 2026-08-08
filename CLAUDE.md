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
