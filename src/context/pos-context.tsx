
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction, BusinessStats } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, orderBy, writeBatch, serverTimestamp, addDoc, runTransaction, updateDoc, limit, getDocs, or, increment, setDoc, and, startAfter, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';
import { 
  syncBusinessToOffline, 
  syncProductsToOffline, 
  syncProductToOffline,
  deleteProductFromOffline,
  deleteMultipleProductsFromOffline,
  getCachedProducts, 
  getCachedCustomers,
  syncCustomersToOffline,
  syncReceiptsToOffline,
  getCachedReceipts,
  getCachedBusiness,
  syncStatsToOffline,
  getCachedStats,
  getLastSyncMetadata, 
  setLastSyncMetadata 
} from '@/lib/sqlite-sync';

// Define localStorage keys
const POS_CART_KEY = 'zeneva-pos-cart';
const POS_CUSTOMER_KEY = 'zeneva-pos-customer';
const POS_TAX_RATE_KEY = 'zeneva-pos-tax-rate';
const POS_DISCOUNT_KEY = 'zeneva-pos-discount';
const POS_PAYMENT_METHOD_KEY = 'zeneva-pos-payment-method';
const POS_AUTO_PRINT_KEY = 'zeneva-pos-auto-print';
const QUEUED_ACTIONS_KEY = 'zeneva-queued-actions';

interface POSContextType {
  // Business Data
  business: BusinessInstance | null;
  products: Product[] | null;
  receipts: Receipt[] | null;
  customers: Customer[] | null;
  onlineOrders: OnlineOrder[] | null;
  stats: BusinessStats | null;
  searchCustomers: (term: string) => Promise<Customer[]>;
  searchCustomersByField: (field: string, value: string) => Promise<Customer[]>;
  searchReceipts: (term: string) => Promise<Receipt[]>;
  fetchReceiptsInRange: (from: Date, to: Date, limitCount?: number) => Promise<Receipt[]>;
  searchProducts: (term: string) => Promise<Product[]>;
  searchProductsByField: (field: string, value: string) => Promise<Product[]>;
  findProductBySku: (sku: string) => Promise<Product | null>;
  fetchDetailedAnalytics: (from: Date, to: Date) => Promise<{ revenue: number, count: number, customers: number }>;
  fetchMonthlyAnalytics: (months: number) => Promise<{ month: string, revenue: number, count: number }[]>;
  fetchMoreReceipts: () => Promise<number>;
  fetchMoreCustomers: () => Promise<number>;
  fetchMoreProducts: () => Promise<number>;
  currentUserProfile: UserProfile | null;
  isLoading: boolean;
  isUserLoading: boolean;
  user: any;

  // POS State
  cart: CartItem[];
  addToCart: (product: Product, unitName?: string, multiplier?: number, priceOverride?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  selectedCustomer: Customer | null;
  selectCustomer: (customer: Customer | null) => void;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  setTax: (taxRate: number) => void;
  setDiscount: (discountAmount: number) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  autoPrint: boolean;
  setAutoPrint: (autoPrint: boolean) => void;
  resetPOS: () => void;
  currencySymbol: string;
  currencyCode: string;
  triggerRefresh: () => void;

  // UI State
  isConfettiActive: boolean;
  triggerConfetti: () => void;
  setIsConfettiActive: (active: boolean) => void;

  // Offline Queue State
  queuedActions: QueuedAction[];
  isQueueProcessing: boolean;
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'description'>, description: string) => void;
  mutateBusiness: (data?: any) => Promise<any> | void;
  isSyncing: boolean;
  isSyncingCustomers: boolean;
  processQueue: () => Promise<void>;
  clearFailedActions: () => void;
  optimisticProducts: Product[];
  updateQueuedAction: (id: string, updates: Partial<QueuedAction>) => void;
  addProductWithImage: (productData: any, imageFile: File | null) => Promise<void>;
  removeFromQueue: (id: string) => void;

  // Impersonation
  impersonatedUserId: string | null;
  impersonateUser: (userId: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;

  // Subscription State
  isSubscriptionActive: boolean;
  firestore: any;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  // --- UI State ---
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);
  const [extraStats, setExtraStats] = useState({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0 });

  // --- Impersonation State ---
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('zeneva_impersonated_user_id');
    }
    return null;
  });

  const isImpersonating = !!impersonatedUserId;

  // Effective User ID: Use impersonated ID if set, otherwise real user ID
  const effectiveUserId = impersonatedUserId || user?.uid;

  // Track the last user ID to prevent unnecessary POS resets
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // --- POS Local States (MOVED UP to prevent TDZ errors) ---
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedCart = localStorage.getItem(POS_CART_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch { return []; }
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedCustomer = localStorage.getItem(POS_CUSTOMER_KEY);
      return savedCustomer ? JSON.parse(savedCustomer) : null;
    } catch { return null; }
  });

  const [taxRate, setTaxRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const savedTax = localStorage.getItem(POS_TAX_RATE_KEY);
      return savedTax ? parseFloat(savedTax) : 0;
    } catch { return 0; }
  });

  const [discount, setDiscount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const savedDiscount = localStorage.getItem(POS_DISCOUNT_KEY);
      return savedDiscount ? parseFloat(savedDiscount) : 0;
    } catch { return 0; }
  });

  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Cash';
    try {
      const savedMethod = localStorage.getItem(POS_PAYMENT_METHOD_KEY);
      return savedMethod || 'Cash';
    } catch { return 'Cash'; }
  });

  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem(POS_AUTO_PRINT_KEY);
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });

  useEffect(() => { try { localStorage.setItem(POS_CART_KEY, JSON.stringify(cart)); } catch { } }, [cart]);
  useEffect(() => { try { localStorage.setItem(POS_CUSTOMER_KEY, JSON.stringify(selectedCustomer)); } catch { } }, [selectedCustomer]);
  useEffect(() => { try { localStorage.setItem(POS_TAX_RATE_KEY, String(taxRate)); } catch { } }, [taxRate]);
  useEffect(() => { try { localStorage.setItem(POS_DISCOUNT_KEY, String(discount)); } catch { } }, [discount]);
  useEffect(() => { try { localStorage.setItem(POS_PAYMENT_METHOD_KEY, paymentMethod); } catch { } }, [paymentMethod]);
  useEffect(() => { try { localStorage.setItem(POS_AUTO_PRINT_KEY, String(autoPrint)); } catch { } }, [autoPrint]);

  // --- POS Reset Function (MOVED UP and STABILIZED) ---
  const resetPOS = useCallback(async () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setTaxRate(0); // Reset to 0, business effect will pick up the correct one
    setPaymentMethod('Cash');
    setSyncedProducts([]);
    setSyncedCustomers([]);
    setSyncedReceipts([]);
    setQueuedActions([]);
    setExtraStats({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0 });

    // Clear local storage
    try {
      localStorage.removeItem(POS_CART_KEY);
      localStorage.removeItem(POS_CUSTOMER_KEY);
      localStorage.removeItem(POS_DISCOUNT_KEY);
      localStorage.removeItem(POS_TAX_RATE_KEY);
      localStorage.removeItem(POS_PAYMENT_METHOD_KEY);
      localStorage.removeItem(QUEUED_ACTIONS_KEY);
    } catch { }

    // Clear SQLite if on desktop
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { clearAllTables } = await import('@/lib/sqlite-sync');
        await clearAllTables();
        console.log('SQLite data cleared successfully on account reset/logout.');
      } catch (err) {
        console.error('Failed to clear SQLite data:', err);
      }
    }
  }, []); // Dependencies removed to break infinite loop

  // --- Offline Queue & Sync State ---
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [syncedProducts, setSyncedProducts] = useState<Product[]>([]);
  const [syncedCustomers, setSyncedCustomers] = useState<Customer[]>([]);
  const [syncedReceipts, setSyncedReceipts] = useState<Receipt[]>([]);
  const [offlineBusiness, setOfflineBusiness] = useState<BusinessInstance | null>(null);
  const [offlineStats, setOfflineStats] = useState<BusinessStats | null>(null);

  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(QUEUED_ACTIONS_KEY);
      if (savedQueue) {
        setQueuedActions(JSON.parse(savedQueue));
      }
    } catch (e) { console.error("Failed to load offline queue:", e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUED_ACTIONS_KEY, JSON.stringify(queuedActions));
    } catch (e) { console.error("Failed to save offline queue:", e); }
  }, [queuedActions]);

  // --- Centralized Data Fetching ---
  // MODIFIED: Ensure we have an authenticated user before fetching, even if impersonating.
  const userDocRef = useMemoFirebase(() => (user && effectiveUserId && (!isUserLoading || isImpersonating) ? doc(firestore, 'users', effectiveUserId) : null), [user, effectiveUserId, isUserLoading, isImpersonating, firestore, refreshKey]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  // MODIFIED: isProfileReady should be true if we have a user and a profile, and the profile matches our EFFECTIVE user ID.
  const isProfileReady = !!(user && currentUserProfile && (currentUserProfile.id === user.uid || currentUserProfile.id === impersonatedUserId));

  const businessId = isProfileReady ? currentUserProfile.businessId : null;

  const impersonateUser = useCallback((userId: string) => {
    // Log the impersonation event before switching context
    if (firestore && businessId && currentUserProfile) {
      logAuditEvent(firestore, businessId, currentUserProfile, {
        action: 'user.impersonate',
        entity: { type: 'user', id: userId },
        details: { targetUserId: userId }
      });
    }

    setImpersonatedUserId(userId);
    sessionStorage.setItem('zeneva_impersonated_user_id', userId);
    toast({ title: 'Impersonating User', description: 'Switching view to user dashboard...' });
    // Force refresh to ensure new data is fetched
    setRefreshKey(prev => prev + 1);
  }, [toast, firestore, businessId, currentUserProfile]);

  const stopImpersonation = useCallback(() => {
    if (firestore && businessId && currentUserProfile && impersonatedUserId) {
      logAuditEvent(firestore, businessId, currentUserProfile, {
        action: 'user.stop_impersonate',
        entity: { type: 'user', id: impersonatedUserId },
      });
    }
    setImpersonatedUserId(null);
    sessionStorage.removeItem('zeneva_impersonated_user_id');
    toast({ title: 'Impersonation Ended', description: 'Returning to your account.' });
    setRefreshKey(prev => prev + 1);
  }, [toast, firestore, businessId, currentUserProfile, impersonatedUserId]);

  const businessDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId) : null), [businessId, firestore, refreshKey]);
  const { data: initialBusiness, isLoading: isLoadingBusiness, mutate: mutateBusiness } = useDoc<BusinessInstance>(businessDocRef);

  const business = useMemo(() => {
    let base = initialBusiness || offlineBusiness;
    if (!base) return null;

    // Apply optimistic settings updates
    const settingsUpdates = queuedActions.filter(a => a.type === 'update-settings');
    if (settingsUpdates.length > 0) {
      let result = { ...base };
      settingsUpdates.forEach(action => {
        Object.keys(action.payload).forEach(key => {
          if (key.includes('.')) {
            const parts = key.split('.');
            let current: any = result;
            for (let i = 0; i < parts.length - 1; i++) {
              current[parts[i]] = { ...current[parts[i]] };
              current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = action.payload[key];
          } else {
            (result as any)[key] = action.payload[key];
          }
        });
      });
      return result;
    }

    return base;
  }, [initialBusiness, offlineBusiness, queuedActions]);

  const productsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "products"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: initialProducts, isLoading: isLoadingInitialProducts, mutate: mutateProducts } = useCollection<Product>(productsQuery);


  const products = useMemo(() => {
    // Merge initial 50 with synced results, prioritizing fresh synced data
    let merged = [...(initialProducts || [])];
    const existingIds = new Set(merged.map(p => p.id));
    syncedProducts.forEach(p => {
      if (!existingIds.has(p.id)) merged.push(p);
      else {
        // If it exists but synced is newer, update it (though usually initial 50 is fine)
        const idx = merged.findIndex(m => m.id === p.id);
        if (idx !== -1) merged[idx] = p;
      }
    });

    // APPLY QUEUED ACTIONS OPTIMISTICALLY
    // 1. Deletions
    const deletedIds = new Set(queuedActions.filter(a => a.type === 'delete-product').flatMap(a => a.payload.productIds));
    if (deletedIds.size > 0) {
      merged = merged.filter(p => !deletedIds.has(p.id));
    }

    // 2. Updates
    const updates = queuedActions.filter(a => a.type === 'update-product' || a.type === 'bulk-update-products');
    updates.forEach(action => {
      if (action.type === 'update-product') {
        const idx = merged.findIndex(p => p.id === action.payload.productId);
        if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values };
      } else if (action.type === 'bulk-update-products') {
        action.payload.productIds.forEach((id: string) => {
          const idx = merged.findIndex(p => p.id === id);
          if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values };
        });
      }
    });

    // 3. Additions (that aren't already in initial/synced)
    const additions = queuedActions.filter(a => a.type === 'add-product');
    additions.forEach(action => {
      if (!merged.find(p => p.id === action.payload.id)) {
        merged.push({ ...action.payload, isOptimistic: true });
      }
    });

    // 4. Stock Reductions from Queued Sales
    const sales = queuedActions.filter(a => a.type === 'complete-sale');
    if (sales.length > 0) {
      sales.forEach(action => {
        action.payload.items.forEach((item: any) => {
          const idx = merged.findIndex(p => p.id === item.productId);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], stock: (merged[idx].stock || 0) - item.quantity };
          }
        });
      });
    }

    return merged;
  }, [initialProducts, syncedProducts, queuedActions]);

  // Handle SQLite Redundant Sync
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && businessId && products && products.length > 0) {
      syncProductsToOffline(businessId, products);
    }
  }, [products, businessId]);

  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && business) {
      syncBusinessToOffline(business);
    }
  }, [business]);

  const isLoadingProducts = isLoadingInitialProducts;

  const statsDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId, 'stats', 'overall') : null), [businessId, firestore, refreshKey]);
  const { data: initialStats, isLoading: isLoadingStats } = useDoc<BusinessStats>(statsDocRef);

  const stats = useMemo(() => {
    return initialStats || offlineStats;
  }, [initialStats, offlineStats]);

  const receiptsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "receipts"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: initialReceipts, isLoading: isLoadingReceipts, mutate: mutateReceipts } = useCollection<Receipt>(receiptsQuery);

  const receipts = useMemo(() => {
    const merged = [...(initialReceipts || [])];
    if (syncedReceipts.length > 0) {
      const existingIds = new Set(merged.map(r => r.id));
      syncedReceipts.forEach(r => {
        if (!existingIds.has(r.id)) merged.push(r);
      });
    }
    return merged;
  }, [initialReceipts, syncedReceipts]);

  const customersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "customers"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: initialCustomers, isLoading: isLoadingInitialCustomers, mutate: mutateCustomers } = useCollection<Customer>(customersQuery);

  const customers = useMemo(() => {
    let base = [...(syncedCustomers.length > (initialCustomers?.length || 0) ? syncedCustomers : (initialCustomers || []))];
    
    if (base.length === syncedCustomers.length && initialCustomers) {
      const ids = new Set(base.map(c => c.id));
      initialCustomers.forEach(c => { if (!ids.has(c.id)) base.push(c); });
    }

    let merged = [...base];
    if (receipts && receipts.length > 0) {
      const spentMap: Record<string, number> = {};
      receipts.forEach(r => { if (r.customer?.id) spentMap[r.customer.id] = (spentMap[r.customer.id] || 0) + r.total; });
      merged = merged.map(c => {
        const memorySpent = spentMap[c.id] || 0;
        return (memorySpent > (c.totalSpent || 0)) ? { ...c, totalSpent: memorySpent } : c;
      });
    }

    // APPLY QUEUED ACTIONS OPTIMISTICALLY
    // 1. Deletions
    const deletedIds = new Set(queuedActions.filter(a => a.type === 'delete-customer').map(a => a.payload.id));
    if (deletedIds.size > 0) {
      merged = merged.filter(c => !deletedIds.has(c.id));
    }

    // 2. Updates
    const updates = queuedActions.filter(a => a.type === 'update-customer');
    updates.forEach(action => {
      const idx = merged.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values };
    });

    // 3. Additions
    const additions = queuedActions.filter(a => a.type === 'add-customer');
    additions.forEach(action => {
      if (!merged.find(c => c.id === action.payload.id)) {
        merged.push({ ...action.payload, isOptimistic: true });
      }
    });

    return merged;
  }, [initialCustomers, syncedCustomers, receipts, queuedActions]);

  const onlineOrdersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [businessId, firestore, refreshKey]);
  const { data: onlineOrders, isLoading: isLoadingOnlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);

  const calculateLoyaltyPoints = useCallback(async (amount: number) => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<number>('calculate_secure_loyalty', { amount });
      } catch (e) {
        console.error("Secure loyalty calculation failed, falling back to FE:", e);
      }
    }
    const pointsPerUnit = business?.settings?.pointsPerUnit || 0;
    return Math.floor(amount * pointsPerUnit);
  }, [business?.settings?.pointsPerUnit]);

  const isLoading = isUserLoading || 
    (!!user && isProfileLoading) || 
    (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ ? 
      (!business && isLoadingBusiness) : // On Tauri, only block if we have NO business (online or offline)
      (isLoadingBusiness || isLoadingProducts || isLoadingReceipts || isLoadingInitialCustomers || isLoadingOnlineOrders || isLoadingStats)
    );

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const triggerConfetti = useCallback(() => {
    setIsConfettiActive(true);
  }, []);

  useEffect(() => {
    if (businessId && firestore) {
      getInventoryStats().then(setExtraStats);
    }
  }, [businessId, firestore, refreshKey]);

  const mergedStats = useMemo(() => {
    if (!stats && !extraStats.totalProducts) return null;
    return {
      ...(stats as any || {}),
      ...extraStats
    } as BusinessStats;
  }, [stats, extraStats]);

  const processQueue = useCallback(async () => {
    if (isQueueProcessing || !navigator.onLine || !firestore || !businessId || !currentUserProfile) {
      return;
    }

    const pendingActions = queuedActions.filter(a => a.status === 'pending');
    if (pendingActions.length === 0) {
      return;
    }

    setIsQueueProcessing(true);
    toast({ title: "Syncing...", description: `Processing ${pendingActions.length} queued action(s).` });

    const results = await Promise.allSettled(pendingActions.map(async (action) => {
      try {
        const batch = writeBatch(firestore);
        const resultData: any = { id: action.id };

        switch (action.type) {
          case 'add-customer': {
            const customersRef = collection(firestore, 'customers');
            const newCustomerRef = doc(customersRef);
            batch.set(newCustomerRef, { 
              ...action.payload, 
              lowercaseName: action.payload.name.toLowerCase(),
              lowercaseEmail: action.payload.email?.toLowerCase() || '',
              createdAt: serverTimestamp(), 
              updatedAt: serverTimestamp() 
            });
            
            // Increment Stats
            const statsRef = doc(firestore, 'businessInstances', businessId, 'stats', 'overall');
            batch.set(statsRef, { totalCustomers: increment(1), updatedAt: serverTimestamp() }, { merge: true });

            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'customer.create',
              entity: { type: 'Customer', id: newCustomerRef.id, name: action.payload.name },
              details: { source: 'offline-queue' }
            });
            resultData.newId = newCustomerRef.id;
            break;
          }
          case 'update-customer': {
            const customerRef = doc(firestore, 'customers', action.payload.id);
            const updates = { ...action.payload.values, updatedAt: serverTimestamp() };
            if (updates.name) updates.lowercaseName = updates.name.toLowerCase();
            if (updates.email) updates.lowercaseEmail = updates.email.toLowerCase();
            batch.update(customerRef, updates);
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'customer.update',
              entity: { type: 'Customer', id: action.payload.id, name: action.payload.values.name || 'Customer' },
              details: { changes: Object.keys(action.payload.values), source: 'offline-queue' }
            });
            break;
          }
          case 'delete-customer': {
            const customerRef = doc(firestore, 'customers', action.payload.id);
            batch.delete(customerRef);
            // Decrement Stats
            const statsRef = doc(firestore, 'businessInstances', businessId, 'stats', 'overall');
            batch.set(statsRef, { totalCustomers: increment(-1), updatedAt: serverTimestamp() }, { merge: true });
            
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'customer.delete',
              entity: { type: 'Customer', id: action.payload.id, name: 'Customer' },
              details: { source: 'offline-queue' }
            });
            break;
          }
          case 'update-settings': {
            const businessDocRef = doc(firestore, 'businessInstances', businessId);
            batch.update(businessDocRef, { ...action.payload, updatedAt: serverTimestamp() });
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'business.settings_update',
              entity: { type: 'Business', id: businessId, name: 'Settings' },
              details: { fields: Object.keys(action.payload), source: 'offline-queue' }
            });
            break;
          }
          case 'update-product': {
            const productRef = doc(firestore, 'products', action.payload.productId);
            const cleanValues = Object.fromEntries(Object.entries(action.payload.values).filter(([_, v]) => v !== undefined));
            const updates: any = { ...cleanValues, updatedAt: serverTimestamp() };
            if (cleanValues.name) updates.lowercaseName = (cleanValues.name as string).toLowerCase();
            batch.update(productRef, updates);
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'product.update',
              entity: { type: 'Product', id: action.payload.productId, name: 'Product' }, // Name might be unknown without fetch, generic fallback
              details: { changes: Object.keys(action.payload.values), source: 'offline-queue' }
            });
            break;
          }
          case 'bulk-update-products': {
            action.payload.productIds.forEach((id: string) => {
              const productRef = doc(firestore, 'products', id);
              const updates: any = { ...action.payload.values, updatedAt: serverTimestamp() };
              if (action.payload.values.name) updates.lowercaseName = (action.payload.values.name as string).toLowerCase();
              batch.update(productRef, updates);
            });
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'product.update',
              entity: { type: 'Product', id: 'multiple', name: 'Multiple Products' },
              details: { count: action.payload.productIds.length, changes: Object.keys(action.payload.values), source: 'offline-queue-bulk' }
            });
            break;
          }
          case 'complete-sale': {
            const { receiptData, productUpdates } = action.payload;
            const newReceiptRef = doc(collection(firestore, 'receipts'));
            batch.set(newReceiptRef, { ...receiptData, createdAt: serverTimestamp() });

            productUpdates.forEach((update: { id: string, newStock: number }) => {
              const productRef = doc(firestore, 'products', update.id);
              batch.update(productRef, { stock: update.newStock, updatedAt: serverTimestamp() });
            });

            // Increment Stats
            const statsRef = doc(firestore, 'businessInstances', businessId, 'stats', 'overall');
            batch.set(statsRef, { 
              totalSales: increment(1), 
              totalRevenue: increment(receiptData.total),
              updatedAt: serverTimestamp() 
            }, { merge: true });

            if (receiptData.customer) {
              const customerRef = doc(firestore, 'customers', receiptData.customer.id);
              const updates: any = {
                totalSpent: increment(receiptData.total),
                lastPurchaseDate: serverTimestamp(),
                updatedAt: serverTimestamp()
              };

              if (business?.settings?.loyaltyProgramEnabled) {
                const pointsEarned = await calculateLoyaltyPoints(receiptData.total);
                updates.loyaltyPoints = increment(pointsEarned);
                resultData.pointsEarned = pointsEarned;
              }

              batch.update(customerRef, updates);
            }
            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'sale.create',
              entity: { type: 'Receipt', id: newReceiptRef.id, name: `Receipt #${newReceiptRef.id.slice(0, 8)}` },
              details: { total: receiptData.total, source: 'offline-queue' }
            });
            resultData.newReceiptId = newReceiptRef.id;
            break;
          }
          case 'add-product': {
            const productsRef = collection(firestore, 'products');
            const newProductRef = doc(productsRef, action.payload.id);
            const { id, ...productData } = action.payload;

            batch.set(newProductRef, {
              ...Object.fromEntries(Object.entries(productData).filter(([_, v]) => v !== undefined)),
              lowercaseName: action.payload.name.toLowerCase(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Increment Stats
            const statsRef = doc(firestore, 'businessInstances', businessId, 'stats', 'overall');
            batch.set(statsRef, { totalProducts: increment(1), updatedAt: serverTimestamp() }, { merge: true });

            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'product.create',
              entity: { type: 'Product', id: newProductRef.id, name: action.payload.name },
              details: { name: action.payload.name, price: action.payload.price, source: 'offline-queue' }
            });
            resultData.newId = newProductRef.id; // Usually same as payload.id
            break;
          }
          case 'delete-product':
            action.payload.productIds.forEach((id: string) => {
              const productRef = doc(firestore, 'products', id);
              batch.delete(productRef);
            });

            // Decrement Stats
            const statsRef = doc(firestore, 'businessInstances', businessId, 'stats', 'overall');
            batch.set(statsRef, { totalProducts: increment(-action.payload.productIds.length), updatedAt: serverTimestamp() }, { merge: true });

            await logAuditEvent(firestore, businessId, currentUserProfile, {
              action: 'product.delete',
              entity: { type: 'Product', id: 'multiple', name: 'Multiple Products' },
              details: { count: action.payload.productIds.length, source: 'offline-queue' }
            });
            break;
        }
        await batch.commit();
        return { status: 'fulfilled', ...resultData };
      } catch (error: any) {
        console.error(`Failed to process action ${action.id}:`, error);
        return { id: action.id, status: 'rejected', reason: error.message || 'An unknown error occurred.' };
      }
    }));

    // Optimistic Local State Updates (Mutation)
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const action = pendingActions[index];
        const resValue = result.value as any; // Type assertion since we return custom objects

        switch (action.type) {
          case 'add-customer':
            mutateCustomers((prev: Customer[] | null) => prev ? [...prev, { ...action.payload, id: resValue.newId, createdAt: new Date() as any, updatedAt: new Date() as any }] : null);
            break;
          case 'update-customer':
            mutateCustomers((prev: Customer[] | null) => prev ? prev.map(c => c.id === action.payload.id ? { ...c, ...action.payload.values, updatedAt: new Date() as any } : c) : null);
            break;
          case 'delete-customer':
            mutateCustomers((prev: Customer[] | null) => prev ? prev.filter(c => c.id !== action.payload.id) : null);
            break;
          case 'update-settings':
            mutateBusiness((prev: any) => {
              if (!prev) return prev;
              const result = { ...prev };
              // Simple nested path update (shallow for now as most updates are top-level or handled by UI)
              Object.keys(action.payload).forEach(key => {
                if (key.includes('.')) {
                  const parts = key.split('.');
                  let current = result;
                  for (let i = 0; i < parts.length - 1; i++) {
                    current[parts[i]] = { ...current[parts[i]] };
                    current = current[parts[i]];
                  }
                  current[parts[parts.length - 1]] = action.payload[key];
                } else {
                  result[key] = action.payload[key];
                }
              });
              return result;
            }, { revalidate: false });
            break;
          case 'update-product':
            mutateProducts((prev: Product[] | null) => prev ? prev.map((p: Product) => p.id === action.payload.productId ? { ...p, ...action.payload.values, updatedAt: new Date() as any } : p) : null);
            break;
          case 'bulk-update-products':
            mutateProducts((prev: Product[] | null) => prev ? prev.map((p: Product) => action.payload.productIds.includes(p.id) ? { ...p, ...action.payload.values, updatedAt: new Date() as any } : p) : null);
            break;
          case 'add-product':
            mutateProducts((prev: Product[] | null) => prev ? [...prev, { ...action.payload, createdAt: new Date() as any, updatedAt: new Date() as any }] : null);
            break;
          case 'delete-product':
            mutateProducts((prev: Product[] | null) => prev ? prev.filter((p: Product) => !action.payload.productIds.includes(p.id)) : null);
            break;
          case 'complete-sale':
            // 1. Add Receipt
            mutateReceipts((prev) => prev ? [{ ...action.payload.receiptData, id: resValue.newReceiptId, createdAt: new Date() as any }, ...prev] : null);
            // 2. Update Stock
            const updates = action.payload.productUpdates as { id: string, newStock: number }[];
            mutateProducts((prev: Product[] | null) => prev ? prev.map((p: Product) => {
              const update = updates.find(u => u.id === p.id);
              return update ? { ...p, stock: update.newStock, updatedAt: new Date() as any } : p;
            }) : null);

            // 3. Update Customer Stats
            if (action.payload.receiptData.customer) {
              mutateCustomers((prev) => prev ? prev.map(c => {
                if (c.id === action.payload.receiptData.customer.id) {
                    const updates: Partial<Customer> = {
                        totalSpent: (c.totalSpent || 0) + action.payload.receiptData.total,
                        updatedAt: new Date() as any,
                        lastPurchaseDate: new Date() as any
                    };
                    if (business?.settings?.loyaltyProgramEnabled && resValue.pointsEarned) {
                        updates.loyaltyPoints = (c.loyaltyPoints || 0) + resValue.pointsEarned;
                    }
                    return { ...c, ...updates };
                }
                return c;
              }) : null);
            }
            break;
        }
      }
    });

    setQueuedActions((prev: QueuedAction[]) => {
      const newQueue = [...prev];
      const successfulIds = new Set();
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successfulIds.add(pendingActions[idx].id);
        } else if (result.status === 'rejected') {
          const index = newQueue.findIndex(a => a.id === pendingActions[idx].id);
          if (index > -1) {
            newQueue[index].status = 'failed';
            newQueue[index].errorMessage = (result.reason as any)?.reason || 'Unknown error';
          }
        }
      });
      return newQueue.filter(a => !successfulIds.has(a.id));
    });

    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
      toast({ variant: 'destructive', title: 'Sync Partially Failed', description: `${failedCount} actions could not be synced. Check the queue for details.` });
    } else {
      toast({ variant: 'success', title: 'Sync Complete!', description: 'All queued actions have been synced.' });
    }

    setIsQueueProcessing(false);
  }, [isQueueProcessing, queuedActions, firestore, businessId, currentUserProfile, toast, business, customers, mutateCustomers, mutateProducts, mutateReceipts]);

  const clearFailedActions = useCallback(() => {
    setQueuedActions(prev => prev.filter(a => a.status !== 'failed'));
    toast({ title: 'Cleared Failed Actions', description: 'Removed failed items from the queue.' });
  }, []);

  const addToQueue = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'description'>, description: string) => {
    // Subscription Safeguard
    const isSubscriptionActive = business
      ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && business.trialExpiresAt.toDate() > new Date()))
      : (isLoading ? true : false);

    if (!isSubscriptionActive) {
      toast({
        variant: 'destructive',
        title: 'Action Blocked',
        description: 'Your trial or subscription has expired. Please subscribe to continue performing actions.'
      });
      return null;
    }

    const newActionId = uuidv4();
    const newAction: QueuedAction = {
      ...action,
      description,
      id: newActionId,
      timestamp: Date.now(),
      status: 'pending',
    };
    
    const isOnline = navigator.onLine;
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

    // IMMEDIATE OFFLINE PERSISTENCE (SQLite Hardening)
    if (isTauri && businessId) {
      const persistLocally = async () => {
        try {
          switch (action.type) {
            case 'add-product':
              await syncProductToOffline(businessId, { ...action.payload, id: action.payload.id || newActionId });
              break;
            case 'update-product': {
              const existingProduct = products?.find(p => p.id === action.payload.productId);
              if (existingProduct) {
                await syncProductToOffline(businessId, { ...existingProduct, ...action.payload.values });
              }
              break;
            }
            case 'bulk-update-products': {
              if (products) {
                const affectedProducts = products
                  .filter(p => action.payload.productIds.includes(p.id))
                  .map(p => ({ ...p, ...action.payload.values }));
                if (affectedProducts.length > 0) {
                  await syncProductsToOffline(businessId, affectedProducts);
                }
              }
              break;
            }
            case 'delete-product':
              await deleteMultipleProductsFromOffline(action.payload.productIds);
              break;
            case 'complete-sale':
              await syncReceiptsToOffline(businessId, [{ ...action.payload.receiptData, id: action.payload.receiptData.id || newActionId }]);
              // Also update local stock for products in the sale
              if (products) {
                const stockUpdates = action.payload.productUpdates.map((update: any) => {
                  const p = products.find(prod => prod.id === update.id);
                  if (p) return { ...p, stock: update.newStock };
                  return null;
                }).filter(Boolean);
                if (stockUpdates.length > 0) {
                  await syncProductsToOffline(businessId, stockUpdates);
                }
              }
              break;
            case 'add-customer':
              await syncCustomersToOffline(businessId, [{ ...action.payload, id: action.payload.id || newActionId }]);
              break;
          }
        } catch (e) {
          console.error("Critical: Local SQLite persistence failed for queued action:", e);
        }
      };
      persistLocally();
    }

    toast({
      title: isOnline ? 'Saving...' : 'Action Queued',
      description: isOnline ? `Saving "${description}" in the background.` : `"${description}" will sync when you're online.`
    });

    setQueuedActions(prev => [...prev, newAction]);
    return newAction.id;
  }, [business, businessId, products, toast]);

  const updateQueuedAction = useCallback((id: string, updates: Partial<QueuedAction>) => {
    setQueuedActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueuedActions(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Action Cancelled', description: 'Removed item from queue.' });
  }, [toast]);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();

    // 1. Local Search First
    if (customers && customers.length > 0) {
      const localResults = customers.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        c.email?.toLowerCase().includes(lower) ||
        c.phone?.includes(term)
      );
      if (localResults.length >= 10 || !isSyncingCustomers) {
        return localResults.slice(0, 20);
      }
    }

    if (!businessId || !firestore) return [];
    try {
      const customersRef = collection(firestore, 'customers');
      const q = (field: string) => query(
        customersRef,
        where('businessId', '==', businessId),
        where(field, '>=', lower),
        where(field, '<=', lower + '\uf8ff'),
        limit(20)
      );

      const [nameSnap, emailSnap] = await Promise.all([
        getDocs(q('lowercaseName')),
        getDocs(q('lowercaseEmail'))
      ]);

      const combined = [...nameSnap.docs, ...emailSnap.docs].map(d => ({ ...d.data() as any, id: d.id } as Customer));
      const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());

      return uniqueResults.slice(0, 20);
    } catch (e) {
      console.error("Error searching customers:", e);
      return [];
    }
  }, [businessId, firestore, customers, isSyncingCustomers]);

  const searchCustomersByField = useCallback(async (field: string, value: string) => {
    if (!value.trim() || !businessId || !firestore) return [];
    try {
      const q = query(
        collection(firestore, 'customers'),
        where('businessId', '==', businessId),
        where(field, '==', value),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
    } catch (e) {
      console.error(`Search customers by ${field} failed:`, e);
      return [];
    }
  }, [businessId, firestore]);

  const searchReceipts = useCallback(async (term: string) => {
    if (!businessId || !term.trim()) return [];
    const lower = term.toLowerCase().trim();
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

    // 1. Local Memory Search (contains synced items)
    if (receipts && receipts.length > 0) {
      const localResults = receipts.filter(r => 
        r.id.toLowerCase().includes(lower) || 
        r.customer?.name.toLowerCase().includes(lower) ||
        (r as any).receiptNumber?.toLowerCase().includes(lower)
      );
      if (localResults.length > 0) return localResults.slice(0, 20);
    }

    // On Desktop, we strictly search downloaded/local receipts to ensure performance and offline reliability.
    if (isTauri) {
      console.log("Desktop search: No local matches found for", term);
      return [];
    }

    if (!firestore) return [];
    try {
      const q = query(
        collection(firestore, 'receipts'),
        where('businessId', '==', businessId),
        where('id', '==', term), // Exact lookup for receipt ID
        limit(1)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
    } catch (e) {
      console.error("Receipt lookup failed:", e);
      return [];
    }
  }, [businessId, firestore, receipts]);

  const fetchReceiptsInRange = useCallback(async (from: Date, to: Date, limitCount: number = 1000) => {
    if (!businessId) return [];
    
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    
    // 1. If on Desktop, prioritize local memory lookup for speed and offline consistency
    if (isTauri && receipts && receipts.length > 0) {
      const local = receipts.filter(r => {
        let rd: Date;
        if (r.createdAt?.toDate) rd = r.createdAt.toDate();
        else if (r.createdAt instanceof Date) rd = r.createdAt;
        else rd = new Date(r.createdAt || 0);
        return rd >= from && rd <= to;
      });
      
      // If we have local results, return them. Even if partial, it's better than failing.
      // Usually, syncedReceipts contains up to 2000 items on Tauri.
      if (local.length > 0) {
        return local.slice(0, limitCount).sort((a,b) => {
          const ta = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const tb = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          return tb - ta;
        });
      }
    }

    if (!firestore) return [];
    try {
      const q = query(
        collection(firestore, 'receipts'),
        where('businessId', '==', businessId),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
    } catch (e) {
      console.error("Fetch receipts in range failed:", e);
      return [];
    }
  }, [businessId, firestore, receipts]);

  const fetchMoreReceipts = useCallback(async () => {
    if (!businessId || !firestore || !receipts || receipts.length === 0) return 0;
    try {
      const lastReceipt = receipts[receipts.length - 1];
      const q = query(
        collection(firestore, "receipts"),
        where("businessId", "==", businessId),
        orderBy("createdAt", "desc"),
        startAfter(lastReceipt.createdAt),
        limit(50)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
      if (more.length > 0) {
        mutateReceipts(prev => [...(prev || []), ...more]);
      }
      return more.length;
    } catch (e) {
      console.error("Fetch more receipts failed:", e);
      return 0;
    }
  }, [businessId, firestore, receipts, mutateReceipts]);

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lowerTerm = term.trim().toLowerCase();

    // 1. Prioritize Local Memory Search (already contains initial 50 + synced items)
    if (products && products.length > 0) {
      const localResults = products.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        p.sku?.toLowerCase().includes(lowerTerm)
      );
      
      // If we have enough results or syncing is finished, return local results
      if (localResults.length >= 10 || !isSyncing) {
        return localResults.slice(0, 30);
      }
    }

    // 2. Fallback to Firestore only if necessary (not fully synced or few results)
    if (!businessId || !firestore) return [];
    try {
      const productsRef = collection(firestore, 'products');
      const q = query(
        productsRef,
        where('businessId', '==', businessId),
        where('lowercaseName', '>=', lowerTerm),
        where('lowercaseName', '<=', lowerTerm + '\uf8ff'),
        limit(30)
      );

      const snap = await getDocs(q);
      const results = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

      return results;
    } catch (e) {
      console.error('Search products failed:', e);
      return [];
    }
  }, [businessId, firestore, products, isSyncing]);

  const searchProductsByField = useCallback(async (field: string, value: string) => {
    if (!value.trim()) return [];

    // Local filter first
    if (products && products.length > 0) {
      const local = products.filter(p => (p as any)[field] === value);
      if (local.length > 0 || !isSyncing) return local;
    }

    if (!businessId || !firestore) return [];
    try {
      const q = query(
        collection(firestore, 'products'),
        where('businessId', '==', businessId),
        where(field, '==', value),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    } catch (e) {
      console.error(`Search products by ${field} failed:`, e);
      return [];
    }
  }, [businessId, firestore, products, isSyncing]);

  // Background Loader: Deeply fills the products cache after initial fast-load
  // This is optimized for Tauri to use a differential sync (only fetch updates)
  useEffect(() => {
    if (!businessId || !firestore || isLoadingProducts || !initialProducts) return;
    
    let isMounted = true;
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    
    const fetchMegaBatch = async () => {
      if (!isMounted) return;
      setIsSyncing(true);
      
      try {
        let lastSync = 0;
        if (isTauri) {
          // 1. Initial Load from Local Cache for Instant UX
          const cached = await getCachedProducts(businessId);
          if (cached.length > 0 && isMounted) {
            setSyncedProducts(prev => {
              const ids = new Set(prev.map(p => p.id));
              const unique = cached.filter((p: any) => !ids.has(p.id));
              return [...prev, ...unique];
            });
            // We have data, so the user can start searching immediately.
          }
          lastSync = await getLastSyncMetadata(businessId, 'products');
        }

        // 2. Fetch only NEW or UPDATED items from Firestore
        const productsRef = collection(firestore, 'products');
        let q;
        
        if (isTauri && lastSync > 0) {
          // Differential sync: only get what changed since last time
          q = query(
            productsRef,
            where('businessId', '==', businessId),
            where('updatedAt', '>', new Date(lastSync)),
            limit(1000) // Small batches for updates
          );
        } else {
          // Standard full sync (first time)
          q = query(
            productsRef,
            where('businessId', '==', businessId),
            limit(10000) 
          );
        }

        const snap = await getDocs(q);
        if (!isMounted) return;

        const all = snap.docs.map((docSnap) => {
            const data = docSnap.data() as any;
            return { 
                ...data, 
                id: docSnap.id,
                lowercaseName: data.lowercaseName || data.name.toLowerCase()
            } as Product;
        });
        
        if (all.length > 0) {
          setSyncedProducts(prev => {
            const merged = [...prev];
            all.forEach(p => {
              const idx = merged.findIndex(m => m.id === p.id);
              if (idx >= 0) merged[idx] = p; // Update existing
              else merged.push(p); // Add new
            });
            return merged;
          });

          // 3. Persist to SQLite if on Tauri
          if (isTauri) {
            await syncProductsToOffline(businessId, all);
            await setLastSyncMetadata(businessId, 'products', Date.now());
          }
        }
        
        setIsSyncing(false);
      } catch (e) {
        console.error('Mega product sync failed:', e);
        setIsSyncing(false);
      }
    };

    const timer = setTimeout(fetchMegaBatch, isTauri ? 100 : 1000); // Shorter delay on Tauri
    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [businessId, firestore, initialProducts]); 

  // Background Loader: Deeply fills the customers cache
  useEffect(() => {
    if (!businessId || !firestore || !initialCustomers) return;

    let isMounted = true;
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

    const fetchMegaCustomers = async () => {
      setIsSyncingCustomers(true);
      try {
        let lastSync = 0;
        if (isTauri) {
          // 1. Load from SQLite
          const cached = await getCachedCustomers(businessId);
          if (cached.length > 0 && isMounted) {
            setSyncedCustomers(prev => {
              const ids = new Set(prev.map(c => c.id));
              const unique = cached.filter((c: any) => !ids.has(c.id));
              return [...prev, ...unique];
            });
          }
          lastSync = await getLastSyncMetadata(businessId, 'customers');
        }

        // 2. Fetch updates
        const customersRef = collection(firestore, 'customers');
        let q;
        if (isTauri && lastSync > 0) {
           q = query(
            customersRef,
            where('businessId', '==', businessId),
            where('updatedAt', '>', new Date(lastSync)),
            limit(500)
          );
        } else {
           q = query(
            customersRef,
            where('businessId', '==', businessId),
            limit(5000)
          );
        }

        const snap = await getDocs(q);
        if (!isMounted) return;

        const fetched = snap.docs.map(doc => {
          const data = doc.data() as any;
          return {
            ...data,
            id: doc.id,
            lowercaseName: data.lowercaseName || data.name.toLowerCase(),
            lowercaseEmail: data.lowercaseEmail || data.email?.toLowerCase() || ''
          } as Customer;
        });

        if (fetched.length > 0) {
          setSyncedCustomers(prev => {
            const merged = [...prev];
            fetched.forEach(c => {
              const idx = merged.findIndex(m => m.id === c.id);
              if (idx >= 0) merged[idx] = c;
              else merged.push(c);
            });
            return merged;
          });

          if (isTauri) {
            await syncCustomersToOffline(businessId, fetched);
            await setLastSyncMetadata(businessId, 'customers', Date.now());
          }
        }
      } catch (e) {
        console.error("Mega customer sync failed", e);
      } finally {
        setIsSyncingCustomers(false);
      }
    };

    const timer = setTimeout(fetchMegaCustomers, isTauri ? 500 : 2000);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [businessId, firestore, initialCustomers]);

  // Background Loader: Deeply fills the receipts cache
  useEffect(() => {
    if (!businessId || !firestore) return;

    let isMounted = true;
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

    const fetchMegaReceipts = async () => {
      if (!isMounted) return;
      try {
        let lastSync = 0;
        if (isTauri) {
          // 1. Initial Load from Local Cache
          const cached = await getCachedReceipts(businessId, 500);
          if (cached.length > 0 && isMounted) {
            setSyncedReceipts(prev => {
              const ids = new Set(prev.map(r => r.id));
              const unique = cached.filter((r: any) => !ids.has(r.id));
              return [...prev, ...unique];
            });
          }
          lastSync = await getLastSyncMetadata(businessId, 'receipts');
        }

        // 2. Fetch NEW items
        const receiptsRef = collection(firestore, 'receipts');
        let q;
        if (isTauri && lastSync > 0) {
          q = query(
            receiptsRef,
            where('businessId', '==', businessId),
            where('updatedAt', '>', new Date(lastSync)),
            limit(1000)
          );
        } else {
          q = query(
            receiptsRef,
            where('businessId', '==', businessId),
            orderBy('createdAt', 'desc'),
            limit(isTauri ? 2000 : 500)
          );
        }

        const snap = await getDocs(q);
        if (!isMounted) return;

        const fetched = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Receipt));
        
        if (fetched.length > 0) {
          setSyncedReceipts(prev => {
            const result = [...prev];
            fetched.forEach(p => {
              const idx = result.findIndex(r => r.id === p.id);
              if (idx >= 0) result[idx] = p;
              else result.push(p);
            });
            // Sort by date desc
            return result.sort((a,b) => {
              const ta = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
              const tb = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
              return tb - ta;
            });
          });

          if (isTauri) {
            await syncReceiptsToOffline(businessId, fetched);
            await setLastSyncMetadata(businessId, 'receipts', Date.now());
          }
        }
      } catch (e) {
        console.error("Mega receipt sync failed", e);
      }
    };

    const fetchOfflineMetadata = async () => {
      if (isTauri && businessId) {
        const [biz, stat] = await Promise.all([
          getCachedBusiness(businessId),
          getCachedStats(businessId)
        ]);
        if (isMounted) {
          if (biz) setOfflineBusiness(biz);
          if (stat) setOfflineStats(stat);
        }
      }
    }

    if (isTauri) fetchOfflineMetadata();

    const timer = setTimeout(fetchMegaReceipts, isTauri ? 1000 : 3000);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [businessId, firestore]);

  // Sync Stats to Offline
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && businessId && initialStats) {
      syncStatsToOffline(businessId, initialStats);
    }
  }, [initialStats, businessId]);

  const findProductBySku = useCallback(async (sku: string) => {
    if (!sku || !businessId || !firestore) return null;
    try {
      const q = query(
        collection(firestore, 'products'),
        where('businessId', '==', businessId),
        where('sku', '==', sku),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { ...snap.docs[0].data(), id: snap.docs[0].id } as Product;
    } catch (e) {
      console.error('Find product by SKU failed:', e);
      return null;
    }
  }, [businessId, firestore]);

  const fetchDetailedAnalytics = useCallback(async (from: Date, to: Date) => {
    if (!businessId || !firestore) return { revenue: 0, count: 0, customers: 0 };
    // We now have the last 2000 receipts in memory (syncedReceipts/receipts).
    // For dashboard and reports, we can calculate these locally with 100% accuracy for recent ranges.
    if (receipts && receipts.length > 0) {
      const filtered = receipts.filter(r => {
        let rd: Date;
        if (r.createdAt?.toDate) rd = r.createdAt.toDate();
        else if (r.createdAt instanceof Date) rd = r.createdAt;
        else rd = new Date(r.createdAt || 0);
        return rd >= from && rd <= to;
      });
      return {
        revenue: filtered.reduce((sum, r) => sum + r.total, 0),
        count: filtered.length,
        customers: new Set(filtered.map(r => r.customer?.id).filter(Boolean)).size
      };
    }
    
    // Fallback if cache is empty
    try {
      const q = query(
        collection(firestore, 'receipts'),
        where('businessId', '==', businessId),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to)
      );
      const snap = await getAggregateFromServer(q, {
        revenue: sum('total'),
        count: count()
      });
      return { revenue: snap.data().revenue || 0, count: snap.data().count || 0, customers: 0 };
    } catch (e) {
      return { revenue: 0, count: 0, customers: 0 };
    }
  }, [businessId, firestore, receipts]);

  const fetchMonthlyAnalytics = useCallback(async (monthsCount: number) => {
    if (!businessId) return [];
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const ranges = Array.from({ length: monthsCount }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (monthsCount - 1 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, month: monthNames[d.getMonth()] };
    });

    // Strategy 1: Local Calculation (Tauri/Offline Optimized)
    if (isTauri && receipts && receipts.length > 0) {
      const results = ranges.map(({ start, end, month }) => {
        const filtered = receipts.filter(r => {
          let rd: Date;
          if (r.createdAt?.toDate) rd = r.createdAt.toDate();
          else if (r.createdAt instanceof Date) rd = r.createdAt;
          else rd = new Date(r.createdAt || 0);
          return rd >= start && rd <= end;
        });
        return {
          month,
          revenue: filtered.reduce((sum, r) => sum + r.total, 0),
          count: filtered.length
        };
      });
      return results;
    }

    // Strategy 2: Firestore Aggregation (Web/Online Optimized)
    if (!firestore) return [];
    try {
      const receiptsRef = collection(firestore, 'receipts');
      const results = await Promise.all(ranges.map(async ({ start, end, month }) => {
        const q = query(
          receiptsRef,
          where('businessId', '==', businessId),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end)
        );
        const snap = await getAggregateFromServer(q, {
          revenue: sum('total'),
          count: count()
        });
        return {
          month,
          revenue: snap.data().revenue || 0,
          count: snap.data().count || 0
        };
      }));

      return results;
    } catch (e) {
      console.error('Monthly analytics failed:', e);
      return [];
    }
  }, [businessId, firestore, receipts]);

  const getInventoryStats = useCallback(async () => {
    if (!businessId || !firestore) return { totalProducts: 0, totalStockValue: 0, lowStockCount: 0 };
    try {
      const productsRef = collection(firestore, 'products');
      const q = query(productsRef, where('businessId', '==', businessId));
      
      const snap = await getAggregateFromServer(q, {
        totalProducts: count(),
        totalStockValue: sum('stockValue')
      });

      const lowStockQ = query(productsRef, where('businessId', '==', businessId), where('stock', '<', 5));
      const lowStockSnap = await getAggregateFromServer(lowStockQ, { count: count() });

      return {
        totalProducts: snap.data().totalProducts || 0,
        totalStockValue: snap.data().totalStockValue || 0,
        lowStockCount: lowStockSnap.data().count || 0
      };
    } catch (e) {
      console.error('Inventory stats from Firestore failed, calculating from memory:', e);
      // FALLBACK: Use products in memory if available
      if (products && products.length > 0) {
        return {
           totalProducts: products.length,
           totalStockValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
           lowStockCount: products.filter(p => (p.stock || 0) < 5).length
        };
      }
      return { totalProducts: 0, totalStockValue: 0, lowStockCount: 0 };
    }
  }, [businessId, firestore]);

  const fetchMoreProducts = useCallback(async () => {
    if (!businessId || !firestore || !products || products.length === 0) return 0;
    try {
      const lastProduct = products[products.length - 1];
      const q = query(
        collection(firestore, "products"),
        where("businessId", "==", businessId),
        orderBy("createdAt", "desc"),
        startAfter(lastProduct.createdAt),
        limit(50)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      if (more.length > 0) {
        mutateProducts(prev => [...(prev || []), ...more]);
      }
      return more.length;
    } catch (e) {
      console.error("Fetch more products failed:", e);
      return 0;
    }
  }, [businessId, firestore, products, mutateProducts]);

  const fetchMoreCustomers = useCallback(async () => {
    if (!businessId || !firestore || !customers || customers.length === 0) return 0;
    try {
      const lastCustomer = customers[customers.length - 1];
      const q = query(
        collection(firestore, "customers"),
        where("businessId", "==", businessId),
        orderBy("createdAt", "desc"),
        startAfter(lastCustomer.createdAt),
        limit(50)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      if (more.length > 0) {
        mutateCustomers(prev => [...(prev || []), ...more]);
      }
      return more.length;
    } catch (e) {
      console.error("Fetch more customers failed:", e);
      return 0;
    }
  }, [businessId, firestore, customers, mutateCustomers]);

  const addProductWithImage = useCallback(async (productData: any, imageFile: File | null) => {
    // 1. Generate local blob URL for optimistic UI if image exists
    const optimisticImageUrl = imageFile ? URL.createObjectURL(imageFile) : '';

    // 2. Add to queue immediately with optimistic data
    const actionId = addToQueue({
      type: 'add-product',
      payload: {
        ...productData,
        imageUrl: optimisticImageUrl,
      }
    }, `Adding ${productData.name}`);

    // If no image, we are done (queue processor will handle sync)
    // If online, addToQueue triggers sync. 
    // If we have an image, we need to upload it.
    if (imageFile) {
      // Start background upload
      // We don't await this function to block navigation, but we do want to ensure 
      // the upload happens. Since this function is in Context (persists), it's safe.

      const uploadImage = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          toast({ variant: 'default', title: 'Offline', description: 'Image will be uploaded when you come online.' });
          return;
        }

        try {
          const formData = new FormData();
          formData.append('image', imageFile);
          const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';

          const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');

          const result = await response.json();

          if (result.success) {
            // Update the queued action payload with real URL
            setQueuedActions(prev => prev.map(a => {
              if (a.id === actionId) {
                return {
                  ...a,
                  payload: {
                    ...a.payload,
                    imageUrl: result.data.url
                  }
                };
              }
              return a;
            }));

            addToQueue({
              type: 'update-product',
              payload: {
                productId: productData.id, // Assuming ID is consistent
                values: { imageUrl: result.data.url }
              }
            }, `Updating image for ${productData.name}`);

          } else {
            console.warn('Image Upload Failed:', result);
            toast({ variant: 'destructive', title: 'Image Upload Failed', description: 'Could not upload product image.' });
          }
        } catch (e: any) {
          // Suppress "Failed to fetch" errors which are common when offline/unstable
          if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
            console.warn("Background upload paused (network issue).");
          } else {
            console.error("Background upload error:", e);
          }
        }
      };

      uploadImage().catch(err => console.warn("Upload process error:", err));
    }
  }, [addToQueue, toast]);

  useEffect(() => {
    const goOnline = () => processQueue();
    window.addEventListener('online', goOnline);
    return () => window.removeEventListener('online', goOnline);
  }, [processQueue]);

  // Effect to ensure queue keeps processing if items are added while processing
  useEffect(() => {
    if (!isQueueProcessing && queuedActions.some(a => a.status === 'pending') && navigator.onLine) {
      processQueue();
    }
  }, [queuedActions, isQueueProcessing, processQueue]);




  // MOVED: Account change detection and reset logic
  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      if (lastUserId !== null || impersonatedUserId !== null) {
        console.log("User Logged Out - Clearing POS State & Impersonation");
        setImpersonatedUserId(null);
        sessionStorage.removeItem('zeneva_impersonated_user_id');
        resetPOS();
        setLastUserId(null);
      }
      return;
    }

    // Reset if we have a user and they are different from last
    if (effectiveUserId !== lastUserId) {
      if (lastUserId !== null) {
        console.log("Account Change Detected - Resetting POS State");
        resetPOS();
        // Force refresh to clear any cached SWR data if needed
        setRefreshKey(prev => prev + 1);
      }
      setLastUserId(effectiveUserId);
    }
  }, [effectiveUserId, lastUserId, resetPOS, user, isUserLoading, impersonatedUserId, setImpersonatedUserId]);

  useEffect(() => {
    if (business && localStorage.getItem(POS_TAX_RATE_KEY) === null) {
      setTaxRate(business.settings?.defaultTaxRate ?? 0);
    }
  }, [business]);

  const currencyCode = business?.settings?.currency || 'NGN';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const addToCart = useCallback((product: Product, unitName?: string, multiplier?: number, priceOverride?: number) => {
    // Unique key for cart item: product.id + unit (if any)
    const cartItemId = unitName ? `${product.id}-${unitName}` : product.id;
    const isService = product.categoryType === 'service';

    // 1. Find the item in current cart to check stock
    const existingItem = cart.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);
    const newQuantity = (existingItem?.quantity || 0) + 1;
    const totalQuantityInBaseUnit = newQuantity * (multiplier || 1);

    // 2. Perform side effects (toast) OUTSIDE of state update
    if (!isService && totalQuantityInBaseUnit > (product.stock || 0)) {
        toast({
            title: existingItem ? 'Backorder recorded' : 'Backorder started',
            description: existingItem 
                ? `${product.name} (${unitName || 'Base Unit'}) is now being recorded as a debt/backorder.`
                : `${product.name} is out of stock. Recording this as a debt.`,
            variant: 'backorder' as any
        });
    }

    // 3. Update state
    setCart(prev => {
      const exists = prev.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);

      if (exists) {
        return prev.map(item =>
          (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        const finalProduct = priceOverride ? { ...product, price: priceOverride } : product;
        return [...prev, { product: finalProduct, quantity: 1, unit: unitName, multiplier }];
      }
    });
  }, [toast, cart]);

  const removeFromCart = (cartItemId: string) => setCart(prev => prev.filter(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) !== cartItemId));

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const itemInCart = cart.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);
    if (!itemInCart) return;

    const isService = itemInCart.product.categoryType === 'service';
    const multiplier = itemInCart.multiplier || 1;
    if (!isService && (quantity * multiplier > (itemInCart.product.stock || 0))) {
      toast({
        title: 'Entering Backorder',
        description: `You are requesting more than the ${itemInCart.product.stock || 0} units available. This will be recorded as debt.`,
        variant: 'backorder' as any
      });
    }

    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCart(prev => prev.map(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => setCart([]);
  const selectCustomer = (customer: Customer | null) => setSelectedCustomer(customer);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
  const tax = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax - discount, [subtotal, tax, discount]);

  const [isSubscriptionActiveFromRust, setIsSubscriptionActiveFromRust] = useState(true);

  useEffect(() => {
    const checkRustSubscription = async () => {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (isTauri && business) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const expiry = business.trialExpiresAt?.seconds || (business.trialExpiresAt instanceof Date ? Math.floor(business.trialExpiresAt.getTime() / 1000) : 0);
          const result = await invoke('validate_subscription', { 
            accessLevel: business.accessLevel || 'starter', 
            trialExpiresAt: expiry 
          });
          setIsSubscriptionActiveFromRust(!!result);
        } catch (e) {
          console.error("Rust subscription check failed", e);
        }
      }
    };
    checkRustSubscription();
  }, [business]);

  const value = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile, isLoading, isUserLoading, user, firestore,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    selectedCustomer, selectCustomer,
    subtotal, tax, taxRate, discount, total, setTax: setTaxRate, setDiscount,
    paymentMethod, setPaymentMethod,
    autoPrint, setAutoPrint,
    resetPOS, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti, setIsConfettiActive,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions, updateQueuedAction, addProductWithImage, removeFromQueue,
    mutateBusiness,
    isSyncing,
    isSyncingCustomers,
    optimisticProducts: queuedActions
      .filter(a => a.type === 'add-product' && (a.status === 'pending' || a.status === 'processing'))
      .map(a => ({ ...a.payload, isOptimistic: true, status: 'pending', queueId: a.id })) as Product[],

    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating, searchCustomers, searchCustomersByField, searchReceipts,
    fetchReceiptsInRange,
    searchProducts,
    searchProductsByField,
    findProductBySku,
    fetchDetailedAnalytics,
    fetchMonthlyAnalytics,
    fetchMoreReceipts, fetchMoreCustomers, fetchMoreProducts,
    stats: mergedStats,

    isSubscriptionActive: business
      ? (
          (business.accessLevel === 'lifetime' || (business.trialExpiresAt && business.trialExpiresAt.toDate() > new Date())) &&
          isSubscriptionActiveFromRust
        )
      : (isLoading ? true : false)
  }), [
    business, products, receipts, customers, onlineOrders, currentUserProfile, isLoading, isUserLoading, user, firestore,
    cart, selectedCustomer, subtotal, tax, taxRate, discount, total, paymentMethod, autoPrint, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions, updateQueuedAction, addProductWithImage, removeFromQueue,
    addToCart, removeFromCart, updateQuantity, clearCart, selectCustomer, setDiscount, setPaymentMethod, setAutoPrint, resetPOS,
    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating, searchCustomers, searchReceipts, fetchReceiptsInRange, fetchMoreReceipts, fetchMoreCustomers, mergedStats, isSubscriptionActiveFromRust
  ]);

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const useBusiness = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a POSProvider');
  }
  return context.business;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'NGN': '₦',
  'USD': '$',
};


