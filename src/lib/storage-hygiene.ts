/**
 * Storage Hygiene Utility
 * 
 * Protects mobile and web browsers against DOMException: QuotaExceededError.
 * Mobile Chrome/Safari restricts localStorage to a strict ~5MB quota per domain.
 * Large collections (products, receipts, audit logs) belong exclusively in IndexedDB (idb)
 * or SQLite, never in localStorage.
 */

export function purgeBloatedLocalStorage(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  let purgedAny = false;
  try {
    // 1. Explicitly remove heavy POS cache keys that belong strictly in IndexedDB or SQLite
    const heavyKeys = [
      'pos_synced_products',
      'pos_synced_receipts',
      'pos_synced_customers',
      'pos_synced_audit_logs',
      'pos_synced_users',
      'zeneva_image_failures',
      'failed_logs',
      'pos_offline_stats'
    ];

    for (const key of heavyKeys) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        purgedAny = true;
      }
    }

    // 2. Scan all remaining keys. If any single key exceeds 25KB, remove it unless
    // it is a critical auth credential or user preference.
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Preserve active auth keys unless explicitly corrupted
      if (
        key.startsWith('firebase:authUser:') ||
        key === 'zeneva_active_branch' ||
        key === 'zeneva_locale' ||
        key === 'pos_cache_owner_business_id' ||
        key === 'pos_queued_actions'
      ) {
        continue;
      }

      const val = localStorage.getItem(key);
      if (val && val.length > 25000) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      purgedAny = true;
    }

    // 3. Test if localStorage has free quota now
    const testKey = '__quota_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);

    return true;
  } catch (err) {
    console.warn('Storage hygiene quota recovery triggered:', err);
    // Emergency recovery: Preserve only auth keys and clear the rest
    try {
      const preserved: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('firebase:authUser:') || key === 'pos_queued_actions')) {
          const val = localStorage.getItem(key);
          if (val) preserved[key] = val;
        }
      }
      localStorage.clear();
      for (const [k, v] of Object.entries(preserved)) {
        try { localStorage.setItem(k, v); } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }
}
