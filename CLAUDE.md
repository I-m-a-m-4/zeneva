# Zeneva

Tauri + Next.js retail POS/ERP. Desktop (Windows/macOS), Android, iOS.

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
