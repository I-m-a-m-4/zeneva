
import Database from '@tauri-apps/plugin-sql';

/**
 * Zeneva SQLite Sync Utility
 * This ensures that critical business data is mirrored to a local SQLite database
 * for absolute continuity even if IndexedDB (Firebase) is cleared or fails.
 */

let db: Database | null = null;

export async function getOfflineDb() {
  if (db) return db;
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return null;
  
  try {
    db = await Database.load('sqlite:zeneva.db');
    
    // Initialize tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id TEXT PRIMARY KEY,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    `);
    
    return db;
  } catch (err) {
    console.error('Failed to initialize SQLite offline DB:', err);
    return null;
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

export async function syncProductsToOffline(businessId: string, products: any[]) {
  const db = await getOfflineDb();
  if (!db) return;
  
  try {
    // We do it in a transaction for speed
    for (const product of products) {
      await db.execute(
        'INSERT OR REPLACE INTO products (id, business_id, data, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [product.id, businessId, JSON.stringify(product)]
      );
    }
  } catch (err) {
    console.error('SQLite Sync Error (Products):', err);
  }
}

export async function getCachedBusiness(businessId: string) {
  const db = await getOfflineDb();
  if (!db) return null;
  
  try {
    const result: any[] = await db.select('SELECT data FROM business WHERE id = $1', [businessId]);
    return result.length > 0 ? JSON.parse(result[0].data) : null;
  } catch (err) {
    return null;
  }
}
