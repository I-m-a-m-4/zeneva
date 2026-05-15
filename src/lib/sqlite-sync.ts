
import Database from '@tauri-apps/plugin-sql';

/**
 * Zeneva SQLite Sync Utility
 * This ensures that critical business data is mirrored to a local SQLite database
 * for absolute continuity even if IndexedDB (Firebase) is cleared or fails.
 */

let db: Database | null = null;
let initPromise: Promise<Database | null> | null = null;

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
          status TEXT DEFAULT 'pending'
        );
      `);
      
      db = loadedDb;
      return db;
    } catch (err) {
      console.error('Failed to initialize SQLite offline DB:', err);
      initPromise = null; // Reset so we can attempt to load again
      return null;
    }
  })();

  return initPromise;
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

export async function syncProductsToOffline(businessId: string, products: any[]) {
  const db = await getOfflineDb();
  if (!db || products.length === 0) return;
  
  for (const product of products) {
    if (!product || !product.id) continue;
    try {
      await db.execute(
        'INSERT OR REPLACE INTO products (id, business_id, data, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [product.id, businessId, JSON.stringify(product)]
      );
    } catch (err) {
      console.error(`SQLite Sync Error (Product ${product.id}):`, err);
    }
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

export async function deleteMultipleProductsFromOffline(productIds: string[]) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    for (const id of productIds) {
      await db.execute('DELETE FROM products WHERE id = $1', [id]);
    }
  } catch (err) {
    console.error('SQLite Delete Error (Multiple Products):', err);
  }
}

export async function getCachedProducts(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select('SELECT data FROM products WHERE business_id = $1', [businessId]);
    return result.map(r => JSON.parse(r.data));
  } catch (err) {
    console.error('SQLite Retrieval Error (Products):', err);
    return [];
  }
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

export async function getCachedCustomers(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select('SELECT data FROM customers WHERE business_id = $1', [businessId]);
    return result.map(r => JSON.parse(r.data));
  } catch (err) {
    console.error('SQLite Retrieval Error (Customers):', err);
    return [];
  }
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

export async function syncCustomersToOffline(businessId: string, customers: any[]) {
  const db = await getOfflineDb();
  if (!db || customers.length === 0) return;
  
  for (const customer of customers) {
    if (!customer || !customer.id) continue;
    try {
      await db.execute(
        'INSERT OR REPLACE INTO customers (id, business_id, data, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [customer.id, businessId, JSON.stringify(customer)]
      );
    } catch (err) {
      console.error(`SQLite Sync Error (Customer ${customer.id}):`, err);
    }
  }
}

export async function syncReceiptsToOffline(businessId: string, receipts: any[]) {
  const db = await getOfflineDb();
  if (!db || receipts.length === 0) return;
  
  for (const receipt of receipts) {
    if (!receipt || !receipt.id) continue;
    try {
      const createdAt = receipt.createdAt?.seconds || Math.floor(Date.now() / 1000);
      await db.execute(
        'INSERT OR REPLACE INTO receipts (id, business_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [receipt.id, businessId, JSON.stringify(receipt), createdAt]
      );
    } catch (err) {
      console.error(`SQLite Sync Error (Receipt ${receipt.id}):`, err);
    }
  }
}

export async function syncReceiptToOffline(businessId: string, receipt: any) {
  const db = await getOfflineDb();
  if (!db || !receipt?.id) return;
  
  try {
    const createdAt = receipt.createdAt?.seconds || Math.floor(Date.now() / 1000);
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
    return result.map(r => JSON.parse(r.data));
  } catch (err) {
    console.error('SQLite Retrieval Error (Receipts):', err);
    return [];
  }
}

export async function getCachedCustomerReceipts(businessId: string, customerId: string) {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select(
      `SELECT data FROM receipts 
       WHERE business_id = $1 
       AND json_extract(data, '$.customer.id') = $2
       ORDER BY created_at DESC`, 
      [businessId, customerId]
    );
    return result.map(r => JSON.parse(r.data));
  } catch (err) {
    console.error('SQLite Customer Receipts Error:', err);
    return [];
  }
}

export async function saveActionToOfflineQueue(action: any) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute(
      'INSERT OR REPLACE INTO sync_queue (id, action_type, payload, description, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [action.id, action.type, JSON.stringify(action.payload), action.description, action.timestamp, action.status]
    );
  } catch (err) {
    console.error('SQLite Queue Save Error:', err);
  }
}

export async function getOfflineQueue() {
  const db = await getOfflineDb();
  if (!db) return [];
  
  try {
    const result: any[] = await db.select('SELECT * FROM sync_queue WHERE status != $1 ORDER BY timestamp ASC', ['synced']);
    return result.map(r => ({
      id: r.id,
      type: r.action_type,
      payload: JSON.parse(r.payload),
      description: r.description,
      timestamp: r.timestamp,
      status: r.status
    }));
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

export async function clearAllTables() {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    await db.execute('DELETE FROM products');
    await db.execute('DELETE FROM customers');
    await db.execute('DELETE FROM receipts');
    await db.execute('DELETE FROM business');
    await db.execute('DELETE FROM sync_metadata');
    await db.execute('DELETE FROM stats');
    console.log("SQLite: All tables cleared.");
  } catch (err) {
    console.error('SQLite Clear Error:', err);
  }
}
