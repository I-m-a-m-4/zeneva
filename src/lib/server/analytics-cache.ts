import { adminFirestore } from '@/firebase/admin';

/**
 * Calculates and caches platform-wide analytics in Firestore to optimize R/W operations.
 */
export async function getCachedPlatformAnalytics(forceRefresh = false) {
  const cacheDocRef = adminFirestore.collection('admin_analytics').doc('overview');
  const cacheDoc = await cacheDocRef.get();

  const now = new Date();
  const CACHE_TTL_HOURS = 6;

  if (!forceRefresh && cacheDoc.exists) {
    const data = cacheDoc.data();
    const lastUpdated = data?.lastUpdated?.toDate();
    
    if (lastUpdated && (now.getTime() - lastUpdated.getTime()) < CACHE_TTL_HOURS * 60 * 60 * 1000) {
      return { ...data, fromCache: true };
    }
  }

  // RE-CALCULATE EVERYTHING
  // Note: For very large datasets, you'd use a cloud function or limit the query range.
  const usersSnapshot = await adminFirestore.collection('users').get();
  const businessSnapshot = await adminFirestore.collection('businessInstances').get();
  const receiptsSnapshot = await adminFirestore.collection('receipts').limit(5000).get(); // Limit for safety
  const productSnapshot = await adminFirestore.collection('products').limit(10000).get();

  const users = usersSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const businesses = businessSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const receipts = receiptsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const products = productSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  // Basic stats
  const totalGmv = receipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
  const totalReceipts = receipts.length;
  
  // Platform stats
  const platformStatsDoc = await adminFirestore.collection('platform').doc('stats').get();
  const appInstalls = platformStatsDoc.exists ? platformStatsDoc.data()?.appInstalls || 0 : 0;

  const activatedBusinesses = businesses.filter((b: any) => {
      const bizProducts = products.filter((p: any) => p.businessId === b.id);
      const bizReceipts = receipts.filter((r: any) => r.businessId === b.id);
      return bizProducts.length >= 10 && bizReceipts.length >= 1;
  }).length;

  // New Analytics Result Object
  const analyticsPayload = {
    platformGmv: totalGmv,
    totalReceipts,
    totalUsers: users.length,
    totalBusinesses: businesses.length,
    activatedBusinessesCount: activatedBusinesses,
    appInstalls,
    lastUpdated: now,
    fromCache: false
  };

  await cacheDocRef.set(analyticsPayload);
  return analyticsPayload;
}
