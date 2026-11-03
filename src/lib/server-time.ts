/**
 * Server-synchronized time utility for Zeneva.
 * Prevents issues where desktop or laptop clocks are skewed, drifted, or wrong
 * (e.g. wrong date/time setting, dead CMOS battery, or daylight savings offset).
 */

const STORAGE_KEY = 'zeneva_clock_offset_ms';

let clockOffsetMs: number = (() => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (_) {}
  }
  return 0;
})();

let isSyncing = false;
let lastSyncTimestamp = 0;

/**
 * Returns a Date object adjusted for local machine clock drift.
 */
export function getSynchronizedNow(): Date {
  return new Date(Date.now() + clockOffsetMs);
}

/**
 * Returns current clock offset in milliseconds (server - local).
 */
export function getClockOffsetMs(): number {
  return clockOffsetMs;
}

/**
 * True if the local machine clock is off by more than 2 minutes.
 */
export function hasSignificantClockDrift(): boolean {
  return Math.abs(clockOffsetMs) > 2 * 60 * 1000;
}

/**
 * Synchronize local time with server time.
 * Can be called during app initialization, on page focus, or after reconnecting.
 */
export async function syncServerTime(force = false): Promise<number> {
  if (typeof window === 'undefined') return 0;
  
  // Throttle: avoid calling more than once every 60 seconds unless forced
  const now = Date.now();
  if (!force && now - lastSyncTimestamp < 60000) {
    return clockOffsetMs;
  }

  if (isSyncing) return clockOffsetMs;
  isSyncing = true;

  try {
    const startTime = Date.now();
    const res = await fetch('/api/time', {
      method: 'GET',
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const endTime = Date.now();
      const roundTripMs = endTime - startTime;
      
      // Target server time is data.serverTime + estimated one-way latency (roundTrip / 2)
      const estimatedServerNow = data.serverTime + Math.round(roundTripMs / 2);
      const measuredOffset = estimatedServerNow - endTime;

      // Update offset if it's statistically meaningful (> 500ms) or if current offset is 0
      clockOffsetMs = measuredOffset;
      lastSyncTimestamp = Date.now();

      try {
        sessionStorage.setItem(STORAGE_KEY, clockOffsetMs.toString());
      } catch (_) {}

      if (Math.abs(clockOffsetMs) > 60000) {
        console.warn(`[ServerTime] Detected laptop clock skew: ${Math.round(clockOffsetMs / 1000)}s offset. Synchronizing timestamps automatically.`);
      }
    }
  } catch (err) {
    // Network offline or endpoint unreachable: keep last known offset
  } finally {
    isSyncing = false;
  }

  return clockOffsetMs;
}

// Auto-sync in browser environment
if (typeof window !== 'undefined') {
  // Sync on startup after a minimal delay to avoid blocking initial render
  setTimeout(() => {
    syncServerTime();
  }, 1000);

  // Sync when window regains focus or comes back online
  window.addEventListener('focus', () => syncServerTime());
  window.addEventListener('online', () => syncServerTime(true));
}
