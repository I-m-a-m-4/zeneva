'use client';

/**
 * Platform detection for the Tauri shells.
 *
 * The codebase already checks `window.__TAURI_INTERNALS__` inline in a number
 * of components; these helpers exist so the *routing* decisions that differ
 * between desktop and mobile live in exactly one place.
 */

/** Running inside a Tauri shell (desktop or mobile) rather than a browser. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

/** Running inside the Android or iOS build specifically - not desktop, not web. */
export function isMobileApp(): boolean {
  if (!isNativeApp()) return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Where a signed-out visitor should land.
 *
 * Mobile opens on the /welcome carousel, which has its own route through to
 * /login and /signup. Desktop and web go straight to /login, where the
 * split-screen layout already carries the marketing content.
 */
export function signedOutLandingRoute(): string {
  return isMobileApp() ? '/welcome' : '/login';
}

/** Where this install gets its updates from. */
export type UpdateChannel = 'play' | 'microsoft' | 'tauri' | 'web';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.zeneva.app';
const MS_STORE_URL =
  'https://apps.microsoft.com/detail/9nvn0f8njwmj';
/** Deep link that opens the Store app directly rather than the browser. */
const MS_STORE_PROTOCOL = 'ms-windows-store://pdp/?ProductId=9nvn0f8njwmj';

export function updateChannel(): UpdateChannel {
  if (!isNativeApp()) return 'web';
  if (isMobileApp()) return 'play';
  // Desktop. The MSI/EXE builds carry the Tauri updater and patch themselves,
  // so only the Store build needs to send the user somewhere. We cannot detect
  // the Store package from the webview, so treat Windows as Store-managed and
  // let TauriUpdater handle the sideloaded case - it shows its own banner and
  // this one stays hidden while an update is downloading.
  return navigator.userAgent.includes('Windows') ? 'microsoft' : 'tauri';
}

/** Store listing for this install, or null when there is nowhere to send them. */
export function storeUrl(channel: UpdateChannel = updateChannel()): string | null {
  switch (channel) {
    case 'play':
      return PLAY_STORE_URL;
    case 'microsoft':
      return MS_STORE_URL;
    default:
      return null;
  }
}

/** Human label for the update destination, e.g. "Google Play". */
export function storeName(channel: UpdateChannel = updateChannel()): string {
  switch (channel) {
    case 'play':
      return 'Google Play';
    case 'microsoft':
      return 'Microsoft Store';
    default:
      return 'Zeneva';
  }
}

/**
 * Opens the store listing. On Windows the ms-windows-store: protocol opens the
 * Store app directly; the https URL is the fallback when that is unavailable.
 */
export function openStore(channel: UpdateChannel = updateChannel()): void {
  if (channel === 'microsoft') {
    try {
      window.location.href = MS_STORE_PROTOCOL;
      return;
    } catch {
      // fall through to the browser URL
    }
  }
  const url = storeUrl(channel);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Semver compare limited to the numeric major.minor.patch prefix.
 * Returns true when `latest` is strictly newer than `current`.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    String(v ?? '')
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length, 3); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
