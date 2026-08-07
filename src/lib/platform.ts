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
