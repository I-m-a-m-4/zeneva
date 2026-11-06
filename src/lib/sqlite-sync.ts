
import Database from '@tauri-apps/plugin-sql';

/**
 * Zeneva SQLite Sync Utility
 * This ensures that critical business data is mirrored to a local SQLite database
 * for absolute continuity even if IndexedDB (Firebase) is cleared or fails.
 */

let db: Database | null = null;
let initPromise: Promise<Database | null> | null = null;

/**
 * Has the local SQLite store ever been proven usable in this session?
 *
 * `null` = not yet determined, `true` = a handle was obtained and the schema
 * applied, `false` = `Database.load` or the `CREATE TABLE` pass failed.
 *
 * This exists because a silent SQLite failure is indistinguishable from an empty
 * shop to everything downstream, and desktop had *no other store*: the
 * localStorage blob is gated off by `isDesktopApp` and the IndexedDB mirror by
 * `isNativeApp()`. So when the driver was missing (see `src-tauri/Cargo.toml`),
 * the catalogue had nowhere to live and every offline launch showed an empty
 * till. Callers use this to keep a second store alive rather than trusting one
 * that has already failed.
 */
let dbUsable: boolean | null = null;

/** What the last `getOfflineDb()` attempt proved about the local store. */
export function offlineDbUsable(): boolean | null {
  return dbUsable;
}

/**
 * Current additive schema version.
 *
 * There was no migration path at all: `CREATE TABLE IF NOT EXISTS` cannot change
 * a table that already exists, so `sync_queue` could never gain the tenant column
 * and indexes could never be added to an installed database. Each step below is
 * additive and idempotent - no table is rebuilt and no row is deleted.
 */
const SCHEMA_VERSION = 1;

async function ensureSchema(loadedDb: Database) {
  try {
    const queueColumns = await loadedDb.select<any[]>('PRAGMA table_info(sync_queue)');
    if (!queueColumns.some((c) => c.name === 'business_id')) {
      await loadedDb.execute('ALTER TABLE sync_queue ADD COLUMN business_id TEXT');
    }
  } catch (err) {
    console.error('SQLite Migration Error (sync_queue.business_id):', err);
  }

  /*
   * Every lookup the app makes addressed these tables by `business_id` with no
   * supporting index, so each read was a table scan plus a temporary B-tree. The
   * receipts index also covers `ORDER BY created_at DESC`, which is the receipts
   * page and the monthly-revenue query.
   *
   * The customer index is an expression index over the JSON payload because
   * `getCachedCustomerReceipts` filters on `$.customer.id`; it is partial so a
   * malformed blob cannot abort index creation, and each statement is guarded so
   * one unsupported index never takes the store down.
   */
  const statements = [
    'CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id)',
    'CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id)',
    'CREATE INDEX IF NOT EXISTS idx_receipts_business_created ON receipts(business_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id)',
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_business_status ON sync_queue(business_id, status)',
    "CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(business_id, json_extract(data, '$.customer.id')) WHERE json_valid(data)",
  ];
  for (const sql of statements) {
    try {
      await loadedDb.execute(sql);
    } catch (err) {
      console.error('SQLite Index Creation Error:', err);
    }
  }

  try {
    await loadedDb.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  } catch (err) {
    console.error('SQLite user_version Error:', err);
  }

  /*
   * WAL hygiene. The live database was carrying a WAL more than six times the
   * size of the database itself because `journal_size_limit` was unset (-1) and
   * nothing ever checkpointed explicitly, so every clear/sync left the WAL to grow
   * without reclaiming the file. Truncating at startup is safe: it runs before
   * hydration opens a read snapshot.
   */
  try {
    await loadedDb.execute('PRAGMA journal_size_limit = 4194304');
  } catch (err) {
    console.error('SQLite journal_size_limit Error:', err);
  }
  try {
    await loadedDb.execute('PRAGMA busy_timeout = 5000');
  } catch (err) {
    console.error('SQLite busy_timeout Error:', err);
  }
  try {
    await loadedDb.execute('PRAGMA optimize');
  } catch (err) {
    console.error('SQLite optimize Error:', err);
  }
  try {
    await loadedDb.execute('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (err) {
    // Busy here only means another connection is reading; the limit above still
    // caps future growth.
    console.error('SQLite WAL checkpoint Error:', err);
  }
}

export async function getOfflineDb() {
  if (db) return db;
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return null;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const loadedDb = await Database.load('sqlite:zeneva.db');
      
      // Initialize tables
      await loadedDb.execute(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          last_sync_timestamp INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS business (
          id TEXT PRIMARY KEY,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS receipts (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          data TEXT,
          created_at INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS stats (
          id TEXT PRIMARY KEY,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          action_type TEXT,
          payload TEXT,
          description TEXT,
          timestamp INTEGER,
          status TEXT DEFAULT 'pending',
          business_id TEXT
        );

        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          business_id TEXT,
          data TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await ensureSchema(loadedDb);

      db = loadedDb;
      dbUsable = true;
      return db;
    } catch (err) {
      console.error('Failed to initialize SQLite offline DB:', err);
      dbUsable = false;
      initPromise = null; // Reset so we can attempt to load again
      return null;
    }
  })();

  return initPromise;
}

/**
 * Upserts many rows in as few round-trips as possible.
 *
 * This plugin build exposes no `batch` command - only `execute` - so a
 * row-at-a-time loop costs one IPC hop per row, which is thousands of hops for
 * a real catalog and leaves partial data behind if it is interrupted. One
 * multi-row INSERT per chunk is a single hop and a single atomic statement.
 *
 * Chunks are sized to stay under SQLite's 999 bound-variable ceiling; exceeding
 * it fails the whole statement with "too many SQL variables".
 */
const MAX_BIND_VARIABLES = 900;

async function upsertRows(
  db: Database,
  table: string,
  columns: string[],
  rows: any[][]
) {
  if (rows.length === 0) return;

  const rowsPerChunk = Math.max(1, Math.floor(MAX_BIND_VARIABLES / columns.length));
  const columnList = columns.join(', ');

  for (let offset = 0; offset < rows.length; offset += rowsPerChunk) {
    const chunk = rows.slice(offset, offset + rowsPerChunk);
    const placeholders: string[] = [];
    const binds: any[] = [];

    chunk.forEach((row, rowIndex) => {
      const base = rowIndex * columns.length;
      placeholders.push(`(${columns.map((_, i) => `$${base + i + 1}`).join(', ')})`);
      binds.push(...row);
    });

    // updated_at is omitted so its DEFAULT CURRENT_TIMESTAMP applies per row.
    /*
     * One multi-row INSERT is itself atomic in SQLite, which is the guarantee
     * that matters here: a chunk either applies completely or not at all.
     *
     * Do not wrap this in `BEGIN`/`COMMIT`. The Tauri plugin hands each `execute`
     * to a sqlx connection pool, so the two statements can land on different
     * connections - the transaction would then hold a write lock on one while the
     * insert waits on another, blocking the till until `busy_timeout` expires.
     */
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (${columnList}) VALUES ${placeholders.join(', ')}`,
      binds
    );
  }
}

export async function syncBusinessToOffline(business: any) {
  const db = await getOfflineDb();
  if (!db || !business?.id) return;
  
  try {
    await db.execute(
      'INSERT OR REPLACE INTO business (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [business.id, JSON.stringify(business)]
    );
  } catch (err) {
    console.error('SQLite Sync Error (Business):', err);
  }
}

/**
 * Returns whether the rows actually reached disk.
 *
 * The caller writes a `full_products_sync` stamp once the catalogue is
 * persisted, and that stamp is what lets the device skip the daily sync for 24
 * hours. This used to swallow its error and return `undefined`, so a failed
 * write still got stamped as persisted — a device that then lost its in-memory
 * state showed an empty catalogue and refused to re-fetch it. Report the
 * failure so the stamp can be withheld.
 *
 * `false` here means "not on disk"; `true` on a non-Tauri caller means "there is
 * no SQLite mirror on this platform", which is not a failure.
 */
export async function syncProductsToOffline(businessId: string, products: any[]): Promise<boolean> {
  const db = await getOfflineDb();
  if (!db) return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;
  if (products.length === 0) return true;

  try {
    // A caller can hand us a mixed page (e.g. a stale in-memory collection that
    // still holds the previous tenant's rows). Filing those under `businessId`
    // is how the column and the payload end up disagreeing, so drop them here.
    const rows = products
      .filter(p => p?.id && (!p.businessId || p.businessId === businessId))
      .map(p => [p.id, businessId, JSON.stringify(p)]);
    await upsertRows(db, 'products', ['id', 'business_id', 'data'], rows);
    return true;
  } catch (err) {
    console.error('SQLite Sync Error (Products):', err);
    return false;
  }
}

export async function syncProductToOffline(businessId: string, product: any) {
  const db = await getOfflineDb();
  if (!db || !product?.id) return;
  
  try {
    await db.execute(
      'INSERT OR REPLACE INTO products (id, business_id, data, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [product.id, businessId, JSON.stringify(product)]
    );
  } catch (err) {
    console.error('SQLite Sync Error (Single Product):', err);
  }
}

export async function deleteProductFromOffline(productId: string) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute('DELETE FROM products WHERE id = $1', [productId]);
  } catch (err) {
    console.error('SQLite Delete Error (Product):', err);
  }
}

/**
 * Removes products from the local mirror, and says whether it actually happened.
 *
 * Returns `boolean` for the same reason `syncProductsToOffline` above does, and
 * it is the same class of bug: on desktop this table is the *only* durable
 * product store, so a swallowed `DELETE` leaves a product the server no longer
 * has sitting in the mirror, ready to be hydrated back onto the shelf at the
 * next launch. That is the "I deleted it and it came back" report. The caller
 * checks the result and reports an anomaly, rather than assuming disk agreed.
 *
 * As there, `!db` off Tauri is normal and counts as success; a failed
 * `Database.load` on Tauri does not.
 */
export async function deleteMultipleProductsFromOffline(productIds: string[]): Promise<boolean> {
  const db = await getOfflineDb();
  if (!db) return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;
  if (productIds.length === 0) return true;

  try {
    for (const id of productIds) {
      await db.execute('DELETE FROM products WHERE id = $1', [id]);
    }
    return true;
  } catch (err) {
    console.error('SQLite Delete Error (Multiple Products):', err);
    return false;
  }
}

/**
 * Reads the cached catalogue and says whether the *store* answered.
 *
 * On desktop this table is the only place products live — the localStorage blob
 * is reclaimed after the first successful hydration and never rewritten — while
 * `getLastSyncMetadata` falls back to localStorage when SQLite is unavailable.
 * So a locked, missing or recreated database used to return `[]` here and a
 * fresh timestamp there, and the app concluded the shop had no products and had
 * no reason to re-fetch them.
 *
 * `ok: false` means the store could not be read at all, which is a different
 * fact from a shop with nothing in it, and the only one worth re-syncing over.
 */
export async function getCachedProductsResult(
  businessId: string
): Promise<{ ok: boolean; rows: any[] }> {
  const db = await getOfflineDb();
  if (!db) {
    // No SQLite on this platform is normal; a failed Database.load is not.
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    return { ok: !isTauri, rows: [] };
  }

  try {
    const result: any[] = await db.select('SELECT data FROM products WHERE business_id = $1', [businessId]);
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // One corrupt row must not lose the rest of the catalogue.
      }
    }
    return { ok: true, rows };
  } catch (err) {
    console.error('SQLite Retrieval Error (Products):', err);
    return { ok: false, rows: [] };
  }
}

export async function getCachedProducts(businessId: string) {
  return (await getCachedProductsResult(businessId)).rows;
}

export async function setLastSyncMetadata(businessId: string, type: string, timestamp: number) {
  const key = `zeneva_sync_metadata_${businessId}_${type}`;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, timestamp.toString());
    } catch (e) {}
  }
 
  const db = await getOfflineDb();
  if (!db) return;
  const id = `${businessId}_${type}`;
  try {
    await db.execute(
      'INSERT OR REPLACE INTO sync_metadata (id, business_id, last_sync_timestamp) VALUES ($1, $2, $3)',
      [id, businessId, timestamp]
    );
  } catch (err) {
    console.error('SQLite Metadata Sync Error:', err);
  }
}

export async function getLastSyncMetadata(businessId: string, type: string): Promise<number> {
  const key = `zeneva_sync_metadata_${businessId}_${type}`;
  
  // 1. Attempt SQLite retrieval first if available
  const db = await getOfflineDb();
  if (db) {
    const id = `${businessId}_${type}`;
    try {
      const result: any[] = await db.select('SELECT last_sync_timestamp FROM sync_metadata WHERE id = $1', [id]);
      if (result.length > 0 && result[0].last_sync_timestamp) {
        return Number(result[0].last_sync_timestamp);
      }
    } catch (err) {}
  }

  // 2. Perfect fallback to localStorage if on Web or SQLite metadata is missing
  if (typeof window !== 'undefined') {
    try {
      const localVal = localStorage.getItem(key);
      if (localVal) return Number(localVal);
    } catch (e) {}
  }

  return 0;
}

/**
 * Read the cached customers, distinguishing an empty book from an unreadable one.
 *
 * Same contract and same reason as `getCachedProductsResult`: `getCachedCustomers`
 * returning `[]` cannot tell "this shop has no customers on file" from "the
 * SQLite store could not be opened", and only the second is worth re-syncing
 * over. A corrupt row is skipped rather than losing the whole book with it.
 */
export async function getCachedCustomersResult(
  businessId: string
): Promise<{ ok: boolean; rows: any[] }> {
  const db = await getOfflineDb();
  if (!db) {
    // No SQLite on this platform is normal; a failed Database.load is not.
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    return { ok: !isTauri, rows: [] };
  }

  try {
    const result: any[] = await db.select('SELECT data FROM customers WHERE business_id = $1', [businessId]);
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // One corrupt row must not lose the rest of the customer book.
      }
    }
    return { ok: true, rows };
  } catch (err) {
    console.error('SQLite Retrieval Error (Customers):', err);
    return { ok: false, rows: [] };
  }
}

export async function getCachedCustomers(businessId: string) {
  return (await getCachedCustomersResult(businessId)).rows;
}

export async function getCachedBusiness(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return null;
  
  try {
    const result: any[] = await db.select('SELECT data FROM business WHERE id = $1', [businessId]);
    return result.length > 0 ? JSON.parse(result[0].data) : null;
  } catch (err) {
    console.error('SQLite Retrieval Error (Business):', err);
    return null;
  }
}

/**
 * The signed-in user's profile, keyed by uid.
 *
 * This is the row that makes the whole offline cache reachable: every getter
 * here is keyed by businessId, and offline that value can only come from the
 * cached profile. It used to live in localStorage alone, where a large catalog's
 * blobs would exhaust the quota and silently drop it - leaving a full SQLite
 * database that nothing could address.
 */
export async function syncProfileToOffline(profile: any) {
  const db = await getOfflineDb();
  if (!db || !profile?.id) return;

  try {
    await db.execute(
      'INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [profile.id, JSON.stringify(profile)]
    );
  } catch (err) {
    console.error('SQLite Sync Error (Profile):', err);
  }
}

export async function getCachedProfile(userId: string) {
  const db = await getOfflineDb();
  if (!db || !userId) return null;

  try {
    const result: any[] = await db.select('SELECT data FROM profiles WHERE id = $1', [userId]);
    return result.length > 0 ? JSON.parse(result[0].data) : null;
  } catch (err) {
    console.error('SQLite Retrieval Error (Profile):', err);
    return null;
  }
}

export async function syncUsersToOffline(businessId: string, users: any[]) {
  const db = await getOfflineDb();
  if (!db || users.length === 0) return;

  try {
    const rows = users
      .filter(u => u?.id && (!u.businessId || u.businessId === businessId))
      .map(u => [u.id, businessId, JSON.stringify(u)]);
    await upsertRows(db, 'users', ['id', 'business_id', 'data'], rows);
  } catch (err) {
    console.error('SQLite Sync Error (Users):', err);
  }
}

export async function getCachedUsers(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return [];

  try {
    const result: any[] = await db.select('SELECT data FROM users WHERE business_id = $1', [businessId]);
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // One corrupt row must not lose the rest of the staff list.
      }
    }
    return rows;
  } catch (err) {
    console.error('SQLite Retrieval Error (Users):', err);
    return [];
  }
}

export async function syncAuditLogsToOffline(businessId: string, logs: any[]) {
  const db = await getOfflineDb();
  if (!db || logs.length === 0) return;

  try {
    const rows = logs
      .filter(l => l?.id && (!l.businessId || l.businessId === businessId))
      .map(l => [l.id, businessId, JSON.stringify(l)]);
    await upsertRows(db, 'audit_logs', ['id', 'business_id', 'data'], rows);
  } catch (err) {
    console.error('SQLite Sync Error (Audit Logs):', err);
  }
}

export async function getCachedAuditLogs(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return [];

  try {
    const result: any[] = await db.select('SELECT data FROM audit_logs WHERE business_id = $1', [businessId]);
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // One corrupt row must not lose the rest of the audit trail.
      }
    }
    return rows;
  } catch (err) {
    console.error('SQLite Retrieval Error (Audit Logs):', err);
    return [];
  }
}

export async function syncStatsToOffline(businessId: string, stats: any) {
  const db = await getOfflineDb();
  if (!db || !businessId) return;
  
  try {
    await db.execute(
      'INSERT OR REPLACE INTO stats (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [businessId, JSON.stringify(stats)]
    );
  } catch (err) {
    console.error('SQLite Sync Error (Stats):', err);
  }
}

export async function getCachedStats(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return null;
  
  try {
    const result: any[] = await db.select('SELECT data FROM stats WHERE id = $1', [businessId]);
    return result.length > 0 ? JSON.parse(result[0].data) : null;
  } catch (err) {
    console.error('SQLite Retrieval Error (Stats):', err);
    return null;
  }
}

/**
 * Mirror customers to SQLite, reporting whether they reached disk.
 *
 * Returns `boolean` for the same reason `syncProductsToOffline` does: this used
 * to swallow its error and return `void`, so `fetchFullCustomers` wrote the
 * `full_customers_sync` stamp over a write that had failed. The stamp carries a
 * 24-hour throttle, so a device whose `zeneva.db` was locked or corrupt ended up
 * with zero customers and a fresh stamp saying the sync had succeeded — and then
 * refused to try again for a day. That is the same defect as the empty-POS bug
 * CLAUDE.md documents for products, one collection over.
 *
 * `false` means "not on disk"; `true` on a non-Tauri caller means "there is no
 * SQLite mirror on this platform", which is not a failure.
 */
export async function syncCustomersToOffline(businessId: string, customers: any[]): Promise<boolean> {
  const db = await getOfflineDb();
  if (!db) return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;
  if (customers.length === 0) return true;

  try {
    const rows = customers
      .filter(c => c?.id && (!c.businessId || c.businessId === businessId))
      .map(c => [c.id, businessId, JSON.stringify(c)]);
    await upsertRows(db, 'customers', ['id', 'business_id', 'data'], rows);
    return true;
  } catch (err) {
    console.error('SQLite Sync Error (Customers):', err);
    return false;
  }
}

/**
 * Seconds since the epoch for a receipt's createdAt.
 *
 * The value arrives in three shapes: a Firestore Timestamp ({seconds}) from a
 * server read, a JS Date from a just-completed sale re-injected into the cache,
 * and an ISO string once it has been through JSON (the offline queue, or any
 * cached copy that round-tripped through storage). Only the first has .seconds,
 * so reading that field alone quietly fell back to "now" for the other two -
 * which stamped backdated and offline sales with the current date in the
 * created_at column used for ordering and for monthly revenue grouping.
 */
function receiptCreatedAtSeconds(receipt: any): number {
  const raw = receipt?.createdAt;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!raw) return nowSeconds;

  if (typeof raw.seconds === 'number') return raw.seconds;
  if (typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? nowSeconds : Math.floor(d.getTime() / 1000);
  }

  const parsed = raw instanceof Date ? raw : new Date(raw);
  return isNaN(parsed.getTime()) ? nowSeconds : Math.floor(parsed.getTime() / 1000);
}

/**
 * Mirror receipts to SQLite, reporting whether the page reached disk.
 *
 * Same contract as `syncProductsToOffline`: the caller stamps
 * `full_receipts_sync`, and that stamp suppresses the next 24 hours of syncing.
 * This used to return `void` and swallow its error, so a failed write was
 * stamped as a successful full sync - the exact defect fixed for products and
 * customers, one collection over.
 */
export async function syncReceiptsToOffline(businessId: string, receipts: any[]): Promise<boolean> {
  const db = await getOfflineDb();
  if (!db) return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;
  if (receipts.length === 0) return true;

  try {
    const rows = receipts
      .filter(r => r?.id && (!r.businessId || r.businessId === businessId))
      .map(r => [r.id, businessId, JSON.stringify(r), receiptCreatedAtSeconds(r)]);
    await upsertRows(db, 'receipts', ['id', 'business_id', 'data', 'created_at'], rows);
    return true;
  } catch (err) {
    console.error('SQLite Sync Error (Receipts):', err);
    return false;
  }
}

export async function syncReceiptToOffline(businessId: string, receipt: any) {
  const db = await getOfflineDb();
  if (!db || !receipt?.id) return;

  try {
    const createdAt = receiptCreatedAtSeconds(receipt);
    await db.execute(
      'INSERT OR REPLACE INTO receipts (id, business_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [receipt.id, businessId, JSON.stringify(receipt), createdAt]
    );
  } catch (err) {
    console.error('SQLite Sync Error (Single Receipt):', err);
  }
}

export async function deleteReceiptFromOffline(receiptId: string) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute('DELETE FROM receipts WHERE id = $1', [receiptId]);
  } catch (err) {
    console.error('SQLite Delete Error (Receipt):', err);
  }
}


export async function getCachedReceipts(businessId: string, limit: number = 50) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select(
      'SELECT data FROM receipts WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2', 
      [businessId, limit]
    );
    // One corrupt row must not lose the rest of the sales history.
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // skip
      }
    }
    return rows;
  } catch (err) {
    console.error('SQLite Retrieval Error (Receipts):', err);
    return [];
  }
}

export async function getCachedCustomerReceipts(businessId: string, customerId: string) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    /*
     * `json_valid` in the predicate matters: a single malformed blob used to
     * abort the whole query with "malformed JSON", so one corrupt receipt hid
     * every receipt for that customer. The expression index above carries the
     * same predicate, so the query remains eligible for it.
     */
    const result: any[] = await db.select(
      `SELECT data FROM receipts 
       WHERE business_id = $1 
       AND json_valid(data)
       AND json_extract(data, '$.customer.id') = $2
       ORDER BY created_at DESC`, 
      [businessId, customerId]
    );
    const rows: any[] = [];
    for (const r of result) {
      try {
        rows.push(JSON.parse(r.data));
      } catch {
        // skip the single corrupt row
      }
    }
    return rows;
  } catch (err) {
    console.error('SQLite Customer Receipts Error:', err);
    return [];
  }
}

/**
 * Persist a queued mutation with the tenant that created it.
 *
 * The queue was global: every pending write on the machine was replayed by
 * whoever logged in next, under that session's active `businessId`. Tagging the
 * row is what lets `getOfflineQueue` and `processQueue` leave another tenant's
 * work pending until its owner signs back in, instead of writing it into the
 * wrong business.
 */
export async function saveActionToOfflineQueue(action: any, businessId?: string) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute(
      'INSERT OR REPLACE INTO sync_queue (id, action_type, payload, description, timestamp, status, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [action.id, action.type, JSON.stringify(action.payload), action.description, action.timestamp, action.status, businessId || null]
    );
  } catch (err) {
    console.error('SQLite Queue Save Error:', err);
  }
}

/**
 * Pending writes belonging to `businessId`.
 *
 * Legacy rows (written before the tenant column existed) have no `business_id`.
 * They are attributed from the payload when it names a tenant, and otherwise
 * kept - dropping them would lose a queued sale that was never sent anywhere,
 * which is a worse outcome than the pre-existing behaviour. Corrupt payloads are
 * skipped rather than failing the whole read.
 */
export async function getOfflineQueue(businessId?: string) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select('SELECT * FROM sync_queue WHERE status != $1 ORDER BY timestamp ASC', ['synced']);
    const queue: any[] = [];
    for (const r of result) {
      let payload: any;
      try {
        payload = JSON.parse(r.payload);
      } catch {
        console.error('SQLite Queue Retrieval Error: unparsable payload for action', r.id);
        continue;
      }

      if (businessId) {
        const owner =
          r.business_id ||
          payload?.businessId ||
          payload?.receiptData?.businessId ||
          payload?.product?.businessId ||
          payload?.customer?.businessId;
        if (owner && owner !== businessId) continue;
      }

      queue.push({
        id: r.id,
        type: r.action_type,
        payload,
        description: r.description,
        timestamp: r.timestamp,
        status: r.status
      });
    }
    return queue;
  } catch (err) {
    console.error('SQLite Queue Retrieval Error:', err);
    return [];
  }
}

export async function getMonthlyRevenue(businessId: string, monthCount: number = 12) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    // Group by month and sum totals from JSON data
    const result: any[] = await db.select(`
      SELECT 
        strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
        SUM(CAST(json_extract(data, '$.total') AS REAL)) as revenue
      FROM receipts 
      WHERE business_id = $1
      AND json_valid(data)
      GROUP BY month
      ORDER BY month DESC
      LIMIT $2
    `, [businessId, monthCount]);
    
    return result.map(r => ({
      month: r.month,
      revenue: r.revenue || 0
    }));
  } catch (err) {
    console.error('SQLite Monthly Revenue Error:', err);
    return [];
  }
}

export async function removeActionFromOfflineQueue(actionId: string) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute('DELETE FROM sync_queue WHERE id = $1', [actionId]);
  } catch (err) {
    console.error('SQLite Queue Delete Error:', err);
  }
}

/**
 * Repair the mirror's tenancy, for the business that just signed in.
 *
 * Two misfilings are possible and both were observed in the live database,
 * because the continuity write used to file the whole in-memory state under the
 * freshly selected business:
 *
 *  - a row whose payload names this business but which was filed under another
 *    business's column - it is adopted, so the current tenant's cache is whole;
 *  - a row filed under this business's column whose payload names a different
 *    tenant - it is re-filed to its real owner, not deleted. The payload is the
 *    authoritative tenant, and re-filing repairs the other tenant's cache as a
 *    side effect instead of forcing it to re-sync what it already had locally.
 *
 * Rows with no `businessId` in the payload are left untouched: there is no
 * evidence about who they belong to, and guessing is how data gets destroyed.
 */
export async function purgeForeignRows(businessId: string): Promise<number> {
  const db = await getOfflineDb();
  if (!db || !businessId) return 0;

  const tables = ['products', 'customers', 'receipts', 'users', 'audit_logs'];
  let affected = 0;

  /*
   * Each statement is atomic on its own. No explicit transaction: the Tauri
   * plugin executes through a connection pool, so `BEGIN` and `COMMIT` are not
   * guaranteed to use the same connection. Both statements are idempotent, so a
   * failure between them simply retries on the next launch.
   */
  try {
    for (const table of tables) {
      const adopted: any = await db.execute(
        `UPDATE ${table} SET business_id = $1
         WHERE json_valid(data)
           AND json_extract(data, '$.businessId') = $1
           AND (business_id IS NULL OR business_id <> $1)`,
        [businessId]
      );
      if (typeof adopted?.rowsAffected === 'number') affected += adopted.rowsAffected;

      const refiled: any = await db.execute(
        `UPDATE ${table} SET business_id = json_extract(data, '$.businessId')
         WHERE business_id = $1
           AND json_valid(data)
           AND json_extract(data, '$.businessId') IS NOT NULL
           AND json_extract(data, '$.businessId') <> $1`,
        [businessId]
      );
      if (typeof refiled?.rowsAffected === 'number') affected += refiled.rowsAffected;
    }
  } catch (err) {
    console.error('SQLite Tenancy Repair Error:', err);
    return affected;
  }

  return affected;
}

/**
 * Wipe cached rows - all of them, or just one tenant's.
 *
 * Scoped mode exists for impersonation end: the impersonated tenant's rows are
 * removed (including any that were misfiled under the admin's column) while the
 * admin's own cache is left intact. The queue is never deleted: pending writes
 * are real work that has not reached the server, and it is now tenant-scoped at
 * read and replay time instead.
 *
 * There is deliberately no explicit transaction. The Tauri plugin executes
 * through a sqlx pool, so `BEGIN` and `COMMIT` are not guaranteed to run on the
 * same connection; the wipe stops at the first failed table and reports it, and
 * every step is a plain delete that is safe to repeat.
 */
export async function clearAllTables(businessId?: string): Promise<boolean> {
  const db = await getOfflineDb();
  if (!db) return typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__;

  const statements: Array<[string, any[]]> = [];
  const collection = (table: string): [string, any[]] =>
    businessId
      ? [
          /*
           * Delete by payload ownership, not by the column alone. A row filed
           * under this column but owned by another tenant is not this tenant's
           * to delete - it is left for that owner's `purgeForeignRows` to re-file.
           * Rows with no readable payload tenant fall back to the column.
           */
          `DELETE FROM ${table}
           WHERE (json_valid(data) AND json_extract(data, '$.businessId') = $1)
              OR (business_id = $1
                  AND (NOT json_valid(data) OR json_extract(data, '$.businessId') IS NULL))`,
          [businessId],
        ]
      : [`DELETE FROM ${table}`, []];

  for (const table of ['products', 'customers', 'receipts', 'users', 'audit_logs']) {
    statements.push(collection(table));
  }

  statements.push(
    businessId ? ['DELETE FROM business WHERE id = $1', [businessId]] : ['DELETE FROM business', []]
  );
  statements.push(
    businessId ? ['DELETE FROM stats WHERE id = $1', [businessId]] : ['DELETE FROM stats', []]
  );
  statements.push(
    businessId
      ? ['DELETE FROM sync_metadata WHERE business_id = $1', [businessId]]
      : ['DELETE FROM sync_metadata', []]
  );
  statements.push(
    businessId
      ? [`DELETE FROM profiles WHERE json_valid(data) AND json_extract(data, '$.businessId') = $1`, [businessId]]
      : ['DELETE FROM profiles', []]
  );

  try {
    for (const [sql, args] of statements) {
      await db.execute(sql, args);
    }
    console.log(businessId ? `SQLite: Cleared rows for ${businessId}.` : 'SQLite: All tables cleared.');
    return true;
  } catch (err) {
    console.error('SQLite Clear Error:', err);
    return false;
  }
}
