'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction, BusinessStats } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { collection, doc, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, increment, getDoc, setDoc, getDocs, startAfter, getAggregateFromServer, count, sum } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';
import { secureStorage } from '@/lib/secure-storage';
import { 
  syncProductsToOffline, 
  syncProductToOffline,
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
  setLastSyncMetadata,
  saveActionToOfflineQueue,
  getOfflineQueue,
  removeActionFromOfflineQueue,
  getMonthlyRevenue
} from '@/lib/sqlite-sync';

import { 
  POS_CART_KEY, 
  POS_CUSTOMER_KEY, 
  POS_TAX_RATE_KEY, 
  POS_DISCOUNT_KEY, 
  POS_PAYMENT_METHOD_KEY, 
  POS_AUTO_PRINT_KEY, 
  CURRENCY_SYMBOLS,
  USER_PROFILE_KEY,
  BUSINESS_INSTANCE_KEY,
  POS_HELD_SALES_KEY
} from '@/lib/constants';
import { safeToDate } from '@/lib/utils';

interface POSContextType {
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
  isConfettiActive: boolean;
  triggerConfetti: () => void;
  setIsConfettiActive: (active: boolean) => void;
  queuedActions: QueuedAction[];
  isQueueProcessing: boolean;
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'description'>, description: string) => string | null;
  mutateBusiness: (data?: any) => Promise<any> | void;
  isSyncing: boolean;
  isFullSyncingCustomers: boolean;
  processQueue: () => Promise<void>;
  clearFailedActions: () => void;
  optimisticProducts: Product[];
  updateQueuedAction: (id: string, updates: Partial<QueuedAction>) => void;
  addProductWithImage: (productData: any, imageFile: File | null) => Promise<void>;
  removeFromQueue: (id: string) => void;
  impersonatedUserId: string | null;
  impersonateUser: (userId: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  isSubscriptionActive: boolean;
  firestore: any;
  heldSales: HeldSale[];
  holdCurrentSale: (notes?: string) => void;
  resumeHeldSale: (heldSaleId: string) => void;
  deleteHeldSale: (heldSaleId: string) => void;
  voidReceipt: (receiptId: string) => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  // --- States ---
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => (typeof window !== 'undefined' ? sessionStorage.getItem('zeneva_impersonated_user_id') : null));
  const isImpersonating = !!impersonatedUserId;
  const effectiveUserId = impersonatedUserId || user?.uid;

  const [isMounted, setIsMounted] = useState(false);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const hasShownSyncToast = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullSyncingCustomers, setIsFullSyncingCustomers] = useState(false);
  const [isFullSyncingProducts, setIsFullSyncingProducts] = useState(false);
  const [extraStats, setExtraStats] = useState({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0 });

  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [syncedProducts, setSyncedProducts] = useState<Product[]>(() => secureStorage.getItem<Product[]>('pos_synced_products') || []);
  const [syncedCustomers, setSyncedCustomers] = useState<Customer[]>(() => secureStorage.getItem<Customer[]>('pos_synced_customers') || []);
  const [syncedReceipts, setSyncedReceipts] = useState<Receipt[]>(() => secureStorage.getItem<Receipt[]>('pos_synced_receipts') || []);
  const [offlineProfile, setOfflineProfile] = useState<UserProfile | null>(() => secureStorage.getItem<UserProfile>(USER_PROFILE_KEY));
  const [offlineBusiness, setOfflineBusiness] = useState<BusinessInstance | null>(() => secureStorage.getItem<BusinessInstance>(BUSINESS_INSTANCE_KEY));
  const [offlineStats, setOfflineStats] = useState<BusinessStats | null>(() => secureStorage.getItem<BusinessStats>('pos_offline_stats'));
  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<number>(() => Date.now());

  // --- POS Local States ---
  const [cart, setCart] = useState<CartItem[]>(() => secureStorage.getItem<CartItem[]>(POS_CART_KEY) || []);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => secureStorage.getItem<Customer>(POS_CUSTOMER_KEY));
  const [taxRate, setTaxRate] = useState<number>(() => secureStorage.getItem<number>(POS_TAX_RATE_KEY) || 0);
  const [discount, setDiscount] = useState<number>(() => secureStorage.getItem<number>(POS_DISCOUNT_KEY) || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>(() => secureStorage.getItem<string>(POS_PAYMENT_METHOD_KEY) || 'Cash');
  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    const s = secureStorage.getItem<boolean>(POS_AUTO_PRINT_KEY);
    return s === null ? true : s;
  });
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => secureStorage.getItem<HeldSale[]>(POS_HELD_SALES_KEY) || []);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [isSubscriptionActiveFromRust, setIsSubscriptionActiveFromRust] = useState(true);

  // --- Firebase Queries ---
  const userDocRef = useMemoFirebase(() => (user && effectiveUserId && (!isUserLoading || isImpersonating) ? doc(firestore, 'users', effectiveUserId) : null), [user, effectiveUserId, isUserLoading, isImpersonating, firestore, refreshKey]);
  const { data: currentUserProfile } = useDoc<UserProfile>(userDocRef);
  const isProfileReady = !!(user && currentUserProfile && (currentUserProfile.id === user.uid || currentUserProfile.id === impersonatedUserId));
  const businessId = isProfileReady ? currentUserProfile.businessId : (user ? null : (offlineProfile?.businessId || null));

  const businessDocRef = useMemoFirebase(() => (user && businessId ? doc(firestore, 'businessInstances', businessId) : null), [user, businessId, firestore]);
  const { data: initialBusiness, isLoading: isLoadingBusiness, mutate: mutateBusiness } = useDoc<BusinessInstance>(businessDocRef);

  // Sync to local storage for fast subsequent loads
  useEffect(() => {
    if (currentUserProfile) secureStorage.setItem(USER_PROFILE_KEY, currentUserProfile);
  }, [currentUserProfile]);

  useEffect(() => {
    if (initialBusiness) secureStorage.setItem(BUSINESS_INSTANCE_KEY, initialBusiness);
  }, [initialBusiness]);

  const canFetchSubData = !!businessId && !!initialBusiness && initialBusiness.status !== 'deleted' && !!user && isProfileReady;

  const productsQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "products"), where("businessId", "==", businessId), limit(200)) : null), [canFetchSubData, businessId, firestore]);
  const { data: initialProducts, isLoading: isLoadingProducts, mutate: mutateProducts } = useCollection<Product>(productsQuery);

  const statsDocRef = useMemoFirebase(() => (canFetchSubData ? doc(firestore, 'businessInstances', businessId, 'stats', 'overall') : null), [canFetchSubData, businessId, firestore]);
  const { data: initialStats } = useDoc<BusinessStats>(statsDocRef);

  // Background Stats Reconciliation
  useEffect(() => {
    if (!canFetchSubData || !firestore || !businessId || !initialStats) return;
    
    const reconcileStats = async () => {
      try {
        if (!getAuth().currentUser) return;
        const customersCount = await getAggregateFromServer(query(collection(firestore, "customers"), where("businessId", "==", businessId)), { total: count() });
        if (!getAuth().currentUser) return;
        const productsCount = await getAggregateFromServer(query(collection(firestore, "products"), where("businessId", "==", businessId)), { total: count() });
        if (!getAuth().currentUser) return;
        
        const realTotalCustomers = customersCount.data().total;
        const realTotalProducts = productsCount.data().total;

        if (realTotalCustomers !== initialStats.totalCustomers || realTotalProducts !== initialStats.totalProducts) {
          await setDoc(statsDocRef!, { 
            totalCustomers: realTotalCustomers,
            totalProducts: realTotalProducts 
          }, { merge: true });
        }
      } catch (e) {
        // Only log error if the user is actually still logged in (to suppress normal abort/logout permission errors)
        if (getAuth().currentUser) {
          console.error("Failed to reconcile stats:", e);
        }
      }
    };

    // Run reconciliation 5 seconds after load to avoid initial contention
    const timer = setTimeout(reconcileStats, 5000);
    return () => clearTimeout(timer);
  }, [canFetchSubData, businessId, !!initialStats]);

  const receiptsQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "receipts"), where("businessId", "==", businessId), limit(10000)) : null), [canFetchSubData, businessId, firestore]);
  const { data: initialReceipts, isLoading: isLoadingReceipts, mutate: mutateReceipts } = useCollection<Receipt>(receiptsQuery);

  const customersQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "customers"), where("businessId", "==", businessId), limit(200)) : null), [canFetchSubData, businessId, firestore]);
  const { data: initialCustomers, isLoading: isLoadingCustomers, mutate: mutateCustomers } = useCollection<Customer>(customersQuery);


  const onlineOrdersQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [canFetchSubData, businessId, firestore]);
  const { data: onlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);

  const products = useMemo(() => {
    if (initialProducts === null && syncedProducts.length === 0 && (typeof navigator !== 'undefined' && navigator.onLine) && !!businessId) return null;
    let merged = [...(initialProducts || [])];
    const existingIds = new Set(merged.map(p => p.id));
    syncedProducts.forEach(p => { if (!existingIds.has(p.id)) merged.push(p); else { const idx = merged.findIndex(m => m.id === p.id); if (idx !== -1) merged[idx] = p; } });
    const deletedIds = new Set(queuedActions.filter(a => a.type === 'delete-product').flatMap(a => a.payload.productIds));
    if (deletedIds.size > 0) merged = merged.filter(p => !deletedIds.has(p.id));
    queuedActions.forEach(action => {
      if (action.type === 'update-product') { const idx = merged.findIndex(p => p.id === action.payload.productId); if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values }; }
      else if (action.type === 'bulk-update-products') { action.payload.productIds.forEach((id: string) => { const idx = merged.findIndex(p => p.id === id); if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values }; }); }
      else if (action.type === 'add-product') { if (!merged.find(p => p.id === action.payload.id)) merged.push({ ...action.payload, isOptimistic: true }); }
      else if (action.type === 'complete-sale') { 
        const items = action.payload.receiptData?.items || action.payload.items;
        if (Array.isArray(items)) items.forEach((item: any) => { const idx = merged.findIndex(p => p.id === item.productId); if (idx !== -1) merged[idx] = { ...merged[idx], stock: (merged[idx].stock || 0) - item.quantity }; });
      }
    });
    // Client-side sort by createdAt desc
    return merged.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [initialProducts, syncedProducts, queuedActions, businessId]);

  const profile = useMemo(() => {
    if (currentUserProfile) return currentUserProfile;
    if (offlineProfile && user && offlineProfile.id === user.uid) return offlineProfile;
    return null;
  }, [currentUserProfile, offlineProfile, user?.uid]);

  const business = useMemo(() => {
    const base = initialBusiness || offlineBusiness;
    if (!base) return null;
    const settingsUpdates = queuedActions.filter(a => a.type === 'update-settings');
    if (settingsUpdates.length === 0) return base;
    let result = { ...base };
    settingsUpdates.forEach(action => {
      Object.keys(action.payload).forEach(key => {
        if (key.includes('.')) {
          const parts = key.split('.'); let curr: any = result;
          for (let i = 0; i < parts.length - 1; i++) { curr[parts[i]] = { ...curr[parts[i]] }; curr = curr[parts[i]]; }
          curr[parts[parts.length - 1]] = action.payload[key];
        } else (result as any)[key] = action.payload[key];
      });
    });
    return result;
  }, [initialBusiness, offlineBusiness, queuedActions]);

  const receipts = useMemo(() => {
    if (initialReceipts === null && syncedReceipts.length === 0 && (typeof navigator !== 'undefined' && navigator.onLine) && !!businessId) return null;
    let merged = [...(initialReceipts || [])];
    const existingIds = new Set(merged.map(r => r.id));
    syncedReceipts.forEach(r => { if (!existingIds.has(r.id)) merged.push(r); });
    const queuedSales = queuedActions.filter(a => a.type === 'complete-sale');
    queuedSales.forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt && !existingIds.has(receipt.id)) merged.push({ ...receipt, isOptimistic: true, createdAt: receipt.createdAt || new Date(action.timestamp) });
    });
    
    // Client-side sort by createdAt desc
    return merged.sort((a, b) => {
      const getMillis = (dateVal: any) => {
        if (!dateVal) return 0;
        if (dateVal.toMillis) return dateVal.toMillis();
        if (dateVal.seconds) return dateVal.seconds * 1000;
        if (dateVal instanceof Date) return dateVal.getTime();
        if (typeof dateVal === 'string' || typeof dateVal === 'number') return new Date(dateVal).getTime();
        return 0;
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
  }, [initialReceipts, syncedReceipts, queuedActions]);

  const customers = useMemo(() => {
    let merged = [...(initialCustomers || [])];
    const existingIds = new Set(merged.map(c => c.id));
    syncedCustomers.forEach(c => { 
      if (!existingIds.has(c.id)) {
        merged.push(c); 
      } else { 
        // Only overwrite if the local data is actually newer (using updatedAt)
        const idx = merged.findIndex(m => m.id === c.id); 
        if (idx !== -1) {
          const serverDate = safeToDate(merged[idx].updatedAt).getTime();
          const localDate = safeToDate(c.updatedAt).getTime();
          if (localDate > serverDate) {
            merged[idx] = { ...merged[idx], ...c };
          }
        }
      } 
    });
    const deletedIds = new Set(queuedActions.filter(a => a.type === 'delete-customer').map(a => a.payload.id));
    merged = merged.filter(c => !deletedIds.has(c.id));
    queuedActions.forEach(action => {
      if (action.type === 'update-customer') { 
        const idx = merged.findIndex(c => c.id === action.payload.id); 
        if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values }; 
      }
      else if (action.type === 'add-customer') { 
        if (!merged.find(c => c.id === action.payload.id)) merged.push({ ...action.payload, isOptimistic: true }); 
      }
      else if (action.type === 'complete-sale') {
        const { selectedCustomer, secureTotal } = action.payload;
        if (selectedCustomer?.id) {
          const idx = merged.findIndex(c => c.id === selectedCustomer.id);
          if (idx !== -1) {
            const current = merged[idx];
            merged[idx] = {
              ...current,
              totalSpent: (Number(current.totalSpent) || 0) + secureTotal,
              loyaltyPoints: (current.loyaltyPoints || 0) + (action.payload.pointsEarned || 0),
              lastPurchaseDate: action.timestamp
            };
          }
        }
      }
    });
    return merged.sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0));
  }, [initialCustomers, syncedCustomers, queuedActions]);

  const stats = useMemo(() => initialStats || offlineStats, [initialStats, offlineStats]);

  // --- Functions ---
  const refreshData = useCallback(async () => {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (!user || !businessId || !firestore || isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    try {
      // Delta Sync: Only fetch documents updated since our last check
      // This turns 10,000 reads into 1-10 reads.
      const lastCheck = new Date(lastSyncedTimestamp);
      
      const pQuery = query(collection(firestore, "products"), where("businessId", "==", businessId), where("updatedAt", ">", lastCheck), limit(500));
      const cQuery = query(collection(firestore, "customers"), where("businessId", "==", businessId), where("updatedAt", ">", lastCheck), limit(500));
      
      const [pSnap, cSnap] = await Promise.all([getDocs(pQuery), getDocs(cQuery)]);
      
      const newProducts = pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      const newCustomers = cSnap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));

      if (newProducts.length > 0) {
        setSyncedProducts(prev => {
          const merged = [...prev];
          newProducts.forEach(np => {
            const idx = merged.findIndex(p => p.id === np.id);
            if (idx !== -1) merged[idx] = np;
            else merged.push(np);
          });
          return merged;
        });
      }

      if (newCustomers.length > 0) {
        setSyncedCustomers(prev => {
          const merged = [...prev];
          newCustomers.forEach(nc => {
            const idx = merged.findIndex(c => c.id === nc.id);
            if (idx !== -1) merged[idx] = nc;
            else merged.push(nc);
          });
          return merged;
        });
      }

      setLastSyncedTimestamp(Date.now());
      if ((newProducts.length > 0 || newCustomers.length > 0) && !hasShownSyncToast.current) {
        toast({ title: "Product Sync Complete", description: `Successfully synchronized inventory and customer data.` });
        hasShownSyncToast.current = true;
      }
    } catch (error) {
      console.error("Delta Sync Failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [businessId, firestore, isSyncing, lastSyncedTimestamp, toast]);

  const fetchFullCustomers = useCallback(async () => {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (!businessId || !firestore || isFullSyncingCustomers || !isOnline) return;
    
    setIsFullSyncingCustomers(true);
    let allFetched: Customer[] = [];
    let lastDoc: any = null;
    let hasMore = true;
    const BATCH_SIZE = 5000;

    try {
      while (hasMore) {
        let q = query(
          collection(firestore, "customers"),
          where("businessId", "==", businessId),
          orderBy("totalSpent", "desc"),
          limit(BATCH_SIZE)
        );
        
        if (lastDoc) q = query(q, startAfter(lastDoc));
        
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
        } else {
          const batch = snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
          allFetched = [...allFetched, ...batch];
          
          setSyncedCustomers(prev => {
            const merged = [...prev];
            batch.forEach(nc => {
              const idx = merged.findIndex(c => c.id === nc.id);
              if (idx !== -1) merged[idx] = nc;
              else merged.push(nc);
            });
            return merged;
          });

          lastDoc = snap.docs[snap.docs.length - 1];
          if (snap.docs.length < BATCH_SIZE) hasMore = false;
        }
      }
      
      setLastSyncMetadata(businessId, 'full_customers_sync', Date.now());
      
      // Only show the toast if it's been more than 24 hours since the last success
      // to avoid annoying the user on every app start.
      const lastToast = Number(localStorage.getItem('last_sync_toast_time') || 0);
      if (Date.now() - lastToast > 24 * 60 * 60 * 1000) {
        toast({ title: "Full Sync Successful", description: `Synchronized ${allFetched.length} customers for offline access.` });
        localStorage.setItem('last_sync_toast_time', Date.now().toString());
      }
    } catch (error) {
      console.error("Full Customer Sync Failed:", error);
    } finally {
      setIsFullSyncingCustomers(false);
    }
  }, [businessId, firestore, isFullSyncingCustomers, toast]);

  const fetchFullProducts = useCallback(async () => {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (!businessId || !firestore || isFullSyncingProducts || !isOnline) return;
    
    setIsFullSyncingProducts(true);
    let allFetched: Product[] = [];
    let lastDoc: any = null;
    let hasMore = true;
    const BATCH_SIZE = 2000; // Smaller batch for products due to potential image data/complexity

    try {
      while (hasMore) {
        let q = query(
          collection(firestore, "products"),
          where("businessId", "==", businessId),
          orderBy("name", "asc"),
          limit(BATCH_SIZE)
        );
        
        if (lastDoc) q = query(q, startAfter(lastDoc));
        
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
        } else {
          const batch = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
          allFetched = [...allFetched, ...batch];
          
          setSyncedProducts(prev => {
            const merged = [...prev];
            batch.forEach(np => {
              const idx = merged.findIndex(p => p.id === np.id);
              if (idx !== -1) merged[idx] = np;
              else merged.push(np);
            });
            return merged;
          });

          lastDoc = snap.docs[snap.docs.length - 1];
          if (snap.docs.length < BATCH_SIZE) hasMore = false;
        }
      }
      
      setLastSyncMetadata(businessId, 'full_products_sync', Date.now());
      
      const lastToast = Number(localStorage.getItem('last_product_sync_toast_time') || 0);
      if (Date.now() - lastToast > 24 * 60 * 60 * 1000) {
        toast({ title: "Product Catalog Synced", description: `Synchronized ${allFetched.length} products for offline access.` });
        localStorage.setItem('last_product_sync_toast_time', Date.now().toString());
      }
    } catch (error) {
      console.error("Full Product Sync Failed:", error);
    } finally {
      setIsFullSyncingProducts(false);
    }
  }, [businessId, firestore, isFullSyncingProducts, toast]);

  const triggerRefresh = useCallback(() => {
    refreshData();
    setRefreshKey(prev => prev + 1); // Keep for legacy triggers
  }, [refreshData]);

  const triggerConfetti = useCallback(() => setIsConfettiActive(true), []);

  const calculateLoyaltyPoints = useCallback(async (amount: number) => {
    if (!business?.settings?.loyaltyProgramEnabled) return 0;
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try { const { invoke } = await import('@tauri-apps/api/core'); return await invoke<number>('calculate_secure_loyalty', { amount }); } catch { }
    }
    return Math.floor(amount * (business?.settings?.pointsPerUnit || 0));
  }, [business]);

  const processQueue = useCallback(async () => {
    if (isQueueProcessing || !navigator.onLine || !firestore || !businessId || !currentUserProfile) return;
    const pending = queuedActions.filter(a => a.status === 'pending');
    if (pending.length === 0) return;
    setIsQueueProcessing(true);
    
    try {
      const results = await Promise.allSettled(pending.map(async (action) => {
      const batch = writeBatch(firestore);
      const resultData: any = { id: action.id };
      try {
        switch (action.type) {
          case 'add-customer':
            const cRef = doc(collection(firestore, 'customers'));
            batch.set(cRef, { ...action.payload, lowercaseName: action.payload.name.toLowerCase(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalCustomers: increment(1) }, { merge: true });
            resultData.newId = cRef.id; break;
          case 'update-customer': batch.update(doc(firestore, 'customers', action.payload.id), { ...action.payload.values, updatedAt: serverTimestamp() }); break;
          case 'delete-customer': batch.delete(doc(firestore, 'customers', action.payload.id)); batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalCustomers: increment(-1) }, { merge: true }); break;
          case 'add-product':
            batch.set(doc(firestore, 'products', action.payload.id), { ...action.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalProducts: increment(1) }, { merge: true });
            // Update local state immediately
            setSyncedProducts(prev => [...prev, action.payload]);
            if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
              syncProductToOffline(businessId, action.payload);
            }
            break;
          case 'complete-sale':
            const rRef = doc(firestore, 'receipts', action.payload.receiptData.id);
            batch.set(rRef, { ...action.payload.receiptData, createdAt: serverTimestamp() });
            action.payload.productUpdates.forEach((u:any) => batch.update(doc(firestore, 'products', u.id), { stock: u.newStock, updatedAt: serverTimestamp() }));
            const totalUnits = action.payload.receiptData.items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;
            batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { 
              totalSales: increment(1), 
              totalRevenue: increment(action.payload.receiptData.total),
              totalUnitsSold: increment(totalUnits)
            }, { merge: true });

            // Low Stock Alert Check
            action.payload.productUpdates.forEach((u: any) => {
              const product = products?.find(p => p.id === u.id);
              if (product && product.lowStockThreshold && u.newStock <= product.lowStockThreshold) {
                 const notifRef = doc(collection(firestore, `users/${currentUserProfile.id}/notifications`));
                 batch.set(notifRef, {
                    title: "Low Stock Alert",
                    body: `${product.name} is running low. Remaining: ${u.newStock}`,
                    createdAt: serverTimestamp(),
                    read: false,
                    type: 'inventory',
                    productId: product.id
                 });
              }
            });

            const customerUpdate = action.payload.customerUpdate;
            if (customerUpdate && customerUpdate.id) {
              const custRef = doc(firestore, 'customers', customerUpdate.id);
              const updates: any = { 
                updatedAt: serverTimestamp() 
              };
              if (customerUpdate.loyaltyPoints !== undefined) updates.loyaltyPoints = customerUpdate.loyaltyPoints;
              if (customerUpdate.totalSpent !== undefined) updates.totalSpent = increment(customerUpdate.totalSpent);
              
              batch.update(custRef, updates);
            }

            resultData.newReceiptId = rRef.id; break;
          case 'delete-product':
            action.payload.productIds.forEach((id: string) => batch.delete(doc(firestore, 'products', id)));
            batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalProducts: increment(-action.payload.productIds.length) }, { merge: true });
            break;
          case 'update-product':
            batch.update(doc(firestore, 'products', action.payload.productId), { ...action.payload.values, updatedAt: serverTimestamp() });
            // Update local state immediately to prevent "revert flickers" when the queue clears
            setSyncedProducts(prev => prev.map(p => p.id === action.payload.productId ? { ...p, ...action.payload.values } : p));
            if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
              const current = syncedProducts.find(p => p.id === action.payload.productId);
              if (current) syncProductToOffline(businessId, { ...current, ...action.payload.values });
            }
            break;
          case 'bulk-update-products':
            action.payload.productIds.forEach((id: string) => {
              batch.update(doc(firestore, 'products', id), { ...action.payload.values, updatedAt: serverTimestamp() });
            });
            // Update local state immediately
            setSyncedProducts(prev => prev.map(p => action.payload.productIds.includes(p.id) ? { ...p, ...action.payload.values } : p));
            if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
              action.payload.productIds.forEach((id: string) => {
                const current = syncedProducts.find(p => p.id === id);
                if (current) syncProductToOffline(businessId, { ...current, ...action.payload.values });
              });
            }
            break;
          case 'add-audit-log':
            const auditLogRef = collection(firestore, 'businessInstances', businessId, 'auditLogs');
            batch.set(doc(auditLogRef), { ...action.payload, createdAt: serverTimestamp() });
            break;
        }

        await batch.commit();
        return { id: action.id, status: 'fulfilled', ...resultData };
      } catch (e: any) { 
        console.error(`Sync failed for action ${action.id} (${action.type}):`, e);
        return { id: action.id, status: 'rejected', reason: e.message }; 
      }
    }));

    setQueuedActions(prev => {
      const fulfilledResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successfulIds = new Set(fulfilledResults.filter(r => r.value.status === 'fulfilled').map(r => r.value.id));
      const failedActions = fulfilledResults.filter(r => r.value.status === 'rejected');
      
      if (failedActions.length > 0) {
        toast({ 
          variant: 'destructive', 
          title: "Sync Error", 
          description: `${failedActions.length} actions failed to sync. Check console for details.` 
        });
      }

      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        successfulIds.forEach(id => removeActionFromOfflineQueue(id as string));
      }

      // Clear successfully synced actions immediately
      return prev.filter(a => !successfulIds.has(a.id));
    });
    } finally {
      setIsQueueProcessing(false);
    }
  }, [isQueueProcessing, queuedActions, firestore, businessId, currentUserProfile, toast]);

  const addToQueue = useCallback((action: any, description: string) => {
    const isSubscriptionActive = business ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && safeToDate(business.trialExpiresAt).getTime() > Date.now())) : true;
    if (!isSubscriptionActive) { toast({ variant: 'destructive', title: 'Action Blocked', description: 'Your subscription has expired.' }); return null; }
    
    // --- RBAC Permission Check ---
    const permissions = currentUserProfile?.permissions || {};
    const userRole = currentUserProfile?.role;
    const isSuperAdmin = currentUserProfile?.email === 'belloimam431@gmail.com';
    
    // Debug Log to catch the culprit
    if (action.type === 'complete-sale' || action.type === 'add-product' || action.type === 'update-product' || action.type === 'delete-product') {
      console.log(`[POS RBAC] Checking action: ${action.type}`, {
        userRole,
        permissions,
        isSuperAdmin,
        isProfileReady
      });
    }

    if (!isSuperAdmin && isProfileReady) {
      // 1. Record Sales check
      if (action.type === 'complete-sale' && permissions.record_sales === false) {
        console.warn(`[POS RBAC] Blocked ${action.type} due to record_sales: false`);
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to record sales.' });
        return null;
      }
      
      // 2. Manage Inventory check
      const inventoryActions = ['add-product', 'update-product', 'delete-product', 'bulk-update-products'];
      if (inventoryActions.includes(action.type) && permissions.manage_inventory === false) {
        console.warn(`[POS RBAC] Blocked ${action.type} due to manage_inventory: false`);
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to manage inventory.' });
        return null;
      }

      // 3. Customer Management check
      const customerActions = ['add-customer', 'update-customer', 'delete-customer'];
      if (customerActions.includes(action.type) && permissions.view_customers === false) {
        console.warn(`[POS RBAC] Blocked ${action.type} due to view_customers: false`);
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to manage customers.' });
        return null;
      }
    }
    // --- End RBAC Check ---

    const id = uuidv4();
    const newAction: QueuedAction = { ...action, description, id, timestamp: Date.now(), status: 'pending' };
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && businessId) saveActionToOfflineQueue(newAction).catch(console.error);
    
    setQueuedActions(prev => [...prev, newAction]);
    
    // Proactive Sync: If online, trigger processQueue in the next tick
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        setTimeout(() => processQueue(), 100);
    }
    
    return id;
  }, [businessId, business, toast, processQueue, currentUserProfile]);

  const addProductWithImage = useCallback(async (productData: any, imageFile: File | null) => {
    // If there's an image, we handle it. Ideally in background but for now let's just queue the data.
    // In a real scenario, we might want to upload to Firebase Storage first if online,
    // or store locally in Tauri if offline.
    
    // For now, let's keep it simple: Add to queue.
    const description = `Added product: ${productData.name}`;
    
    // If we have an image, we'd normally want to process it. 
    // But since the user wants it to be fast and offline-first, 
    // we'll just queue the data and handle image upload in the processQueue if possible, 
    // or just save the product data.
    
    // TODO: Handle image persistence for offline
    
    addToQueue({
      type: 'add-product',
      payload: { 
        ...productData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }, description);

    toast({
      title: "Product Saved",
      description: `${productData.name} has been added and will sync when online.`,
    });
  }, [addToQueue, toast]);

  const resetPOS = useCallback(async () => {
    setCart([]); setSelectedCustomer(null); setDiscount(0); setTaxRate(0); setPaymentMethod('Cash');
    secureStorage.removeItem(POS_CART_KEY); 
    secureStorage.removeItem(POS_CUSTOMER_KEY);
  }, []);

  const nuclearReset = useCallback(async () => {
    await resetPOS(); setQueuedActions([]); setSyncedProducts([]); setSyncedCustomers([]); setSyncedReceipts([]);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) import('@/lib/sqlite-sync').then(m => m.clearAllTables());
  }, [resetPOS]);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (customers && customers.length > 0) {
      const local = customers.filter(c => c.name.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower) || c.phone?.includes(term));
      if (local.length >= 10 || !isOnline) return local.slice(0, 20);
    }
    
    if (!user || !businessId || !firestore || !isOnline) return [];
    try {
      const q = (field: string) => query(collection(firestore, 'customers'), where('businessId', '==', businessId), where(field, '>=', lower), where(field, '<=', lower + '\uf8ff'), limit(20));
      const [nameSnap, emailSnap] = await Promise.all([getDocs(q('lowercaseName')), getDocs(q('lowercaseEmail'))]);
      const combined = [...nameSnap.docs, ...emailSnap.docs].map(d => ({ ...d.data() as any, id: d.id } as Customer));
      return Array.from(new Map(combined.map(item => [item.id, item])).values()).slice(0, 20);
    } catch { return []; }
  }, [businessId, firestore, customers, isFullSyncingCustomers]);

  const searchCustomersByField = useCallback(async (field: string, value: string) => {
    if (!value) return [];
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (customers && customers.length > 0) {
      const local = customers.filter(c => (c as any)[field] === value);
      if (local.length > 0 || !isOnline) return local;
    }
    
    if (!user || !businessId || !firestore || !isOnline) return [];
    try {
      const q = query(collection(firestore, 'customers'), where('businessId', '==', businessId), where(field, '==', value), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
    } catch { return []; }
  }, [businessId, firestore, customers]);

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    if (products && products.length > 0) {
      const local = products.filter(p => p.name.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower));
      if (local.length >= 10 || !isOnline) return local.slice(0, 30);
    }
    
    if (!user || !businessId || !firestore || !isOnline) return [];
    try {
      const q = query(collection(firestore, 'products'), where('businessId', '==', businessId), where('lowercaseName', '>=', lower), where('lowercaseName', '<=', lower + '\uf8ff'), limit(30));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    } catch { return []; }
  }, [businessId, firestore, products, isSyncing]);

  const searchProductsByField = useCallback(async (field: string, value: string) => {
    if (!value) return [];
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (products && products.length > 0) {
      const local = products.filter(p => (p as any)[field] === value);
      if (local.length > 0 || !isOnline) return local;
    }
    
    if (!user || !businessId || !firestore || !isOnline) return [];
    try {
      const q = query(collection(firestore, 'products'), where('businessId', '==', businessId), where(field, '==', value), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
    } catch { return []; }
  }, [businessId, firestore, products]);

  const findProductBySku = useCallback(async (sku: string) => {
    if (!sku) return null;
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (products && products.length > 0) {
      const local = products.find(p => p.sku === sku);
      if (local) return local;
    }
    
    if (!user || !businessId || !firestore || !isOnline) return null;
    try {
      const q = query(collection(firestore, 'products'), where('businessId', '==', businessId), where('sku', '==', sku), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { ...snap.docs[0].data(), id: snap.docs[0].id } as Product;
    } catch { return null; }
  }, [businessId, firestore, products]);

  const fetchDetailedAnalytics = useCallback(async (from: Date, to: Date) => {
    if (!user || !businessId || !firestore) return { revenue: 0, count: 0, customers: 0 };
    
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      try {
        const q = query(
          collection(firestore, "receipts"),
          where("businessId", "==", businessId),
          where("createdAt", ">=", safeToDate(from)),
          where("createdAt", "<=", safeToDate(to))
        );
        
        // 100% Accurate Aggregation for Big Numbers
        const aggregateSnap = await getAggregateFromServer(q, {
          totalRevenue: sum('total'),
          totalOrders: count()
        });
        
        const revenue = aggregateSnap.data().totalRevenue || 0;
        const orderCount = aggregateSnap.data().totalOrders || 0;
        
        // For unique customers, we still need to fetch IDs or documents 
        // We cap this at 5,000 due to Firestore structured query limits
        const docSnap = await getDocs(query(q, limit(5000)));
        const customers = new Set(docSnap.docs.map(d => d.data().customer?.id).filter(Boolean)).size;
        
        return { revenue, count: orderCount, customers };
      } catch (err) {
        console.error("fetchDetailedAnalytics online failed:", err);
      }
    }

    // Fallback 1: SQLite (Tauri)
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const { getCachedReceipts } = await import('@/lib/sqlite-sync');
        const cached = await getCachedReceipts(businessId, 10000);
        if (cached && cached.length > 0) {
          const fromTime = from.getTime();
          const toTime = to.getTime();
          const filtered = cached.filter(r => {
            const rt = safeToDate(r.createdAt).getTime();
            return rt >= fromTime && rt <= toTime;
          });
          return {
            revenue: filtered.reduce((acc, r) => acc + r.total, 0),
            count: filtered.length,
            customers: new Set(filtered.map(r => r.customer?.id).filter(Boolean)).size
          };
        }
      } catch (err) {
        console.error("fetchDetailedAnalytics SQLite fallback failed:", err);
      }
    }

    // Fallback 2: State / SecureStorage receipts (Web/PWA)
    const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
    if (targetReceipts && targetReceipts.length > 0) {
      const fromTime = from.getTime();
      const toTime = to.getTime();
      const filtered = targetReceipts.filter(r => {
        const rt = safeToDate(r.createdAt).getTime();
        return rt >= fromTime && rt <= toTime;
      });
      return {
        revenue: filtered.reduce((acc, r) => acc + r.total, 0),
        count: filtered.length,
        customers: new Set(filtered.map(r => r.customer?.id).filter(Boolean)).size
      };
    }

    return { revenue: 0, count: 0, customers: 0 };
  }, [businessId, firestore, syncedReceipts, receipts, user]);

  const addToCart = useCallback((product: Product, unitName?: string, multiplier?: number, priceOverride?: number) => {
    const cartItemId = unitName ? `${product.id}-${unitName}` : product.id;
    const isService = product.categoryType === 'service';
    const existingItem = cart.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);
    const newQuantity = (existingItem?.quantity || 0) + 1;
    const totalQuantityInBaseUnit = newQuantity * (multiplier || 1);

    if (!isService && totalQuantityInBaseUnit > (product.stock || 0)) {
        toast({ title: existingItem ? 'Backorder recorded' : 'Backorder started', description: `${product.name} is out of stock. Recording as debt.`, variant: 'backorder' as any });
    }

    setCart(prev => {
      const exists = prev.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);
      if (exists) return prev.map(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      const finalProduct = priceOverride ? { ...product, price: priceOverride } : product;
      return [...prev, { 
        product: finalProduct, 
        quantity: 1, 
        unit: unitName, 
        multiplier,
        isPriceOverride: !!priceOverride,
        originalPrice: product.price
      }];
    });
  }, [toast, cart]);

  const removeFromCart = useCallback((cartItemId: string) => setCart(prev => prev.filter(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) !== cartItemId)), []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(cartItemId); return; }
    
    // Stock Check for Backorder Notification
    const item = cart.find(i => (i.unit ? `${i.product.id}-${i.unit}` : i.product.id) === cartItemId);
    if (item && item.product.categoryType !== 'service') {
        const multiplier = item.multiplier || 1;
        if (quantity * multiplier > (item.product.stock || 0)) {
            toast({
                title: 'Entering Backorder',
                description: `You are requesting more than the ${item.product.stock || 0} units available. This will be recorded as debt.`,
                variant: 'backorder' as any
            });
        }
    }

    setCart(prev => prev.map(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId ? { ...item, quantity } : item));
  }, [removeFromCart, cart, toast]);

  const clearCart = useCallback(() => setCart([]), []);

  // --- Effects ---
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { secureStorage.setItem(POS_CART_KEY, cart); }, [cart]);
  useEffect(() => { secureStorage.setItem(POS_CUSTOMER_KEY, selectedCustomer); }, [selectedCustomer]);
  useEffect(() => { secureStorage.setItem(POS_TAX_RATE_KEY, taxRate); }, [taxRate]);
  useEffect(() => { secureStorage.setItem(POS_DISCOUNT_KEY, discount); }, [discount]);
  useEffect(() => { secureStorage.setItem(POS_PAYMENT_METHOD_KEY, paymentMethod); }, [paymentMethod]);
  useEffect(() => { secureStorage.setItem(POS_AUTO_PRINT_KEY, autoPrint); }, [autoPrint]);
  useEffect(() => { secureStorage.setItem('pos_synced_products', syncedProducts); }, [syncedProducts]);
  useEffect(() => { secureStorage.setItem('pos_synced_customers', syncedCustomers); }, [syncedCustomers]);
  useEffect(() => { secureStorage.setItem('pos_synced_receipts', syncedReceipts); }, [syncedReceipts]);
  useEffect(() => { secureStorage.setItem(POS_HELD_SALES_KEY, heldSales); }, [heldSales]);

  // Background online-to-offline syncing effects for instant offline availability on all pages
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setSyncedProducts(prev => {
        const merged = [...prev];
        const existingIds = new Set(merged.map(p => p.id));
        initialProducts.forEach(p => {
          const idx = merged.findIndex(m => m.id === p.id);
          if (idx !== -1) merged[idx] = p;
          else merged.push(p);
        });
        return merged;
      });
    }
  }, [initialProducts]);

  useEffect(() => {
    if (initialCustomers && initialCustomers.length > 0) {
      setSyncedCustomers(prev => {
        const merged = [...prev];
        const existingIds = new Set(merged.map(c => c.id));
        initialCustomers.forEach(c => {
          const idx = merged.findIndex(m => m.id === c.id);
          if (idx !== -1) merged[idx] = c;
          else merged.push(c);
        });
        return merged;
      });
    }
  }, [initialCustomers]);

  useEffect(() => {
    if (initialReceipts && initialReceipts.length > 0) {
      setSyncedReceipts(prev => {
        const merged = [...prev];
        const existingIds = new Set(merged.map(r => r.id));
        initialReceipts.forEach(r => {
          const idx = merged.findIndex(m => m.id === r.id);
          if (idx !== -1) merged[idx] = r;
          else merged.push(r);
        });
        return merged;
      });
    }
  }, [initialReceipts]);

  useEffect(() => {
    if (initialStats) {
      setOfflineStats(initialStats);
      secureStorage.setItem('pos_offline_stats', initialStats);
    }
  }, [initialStats]);
  
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && isMounted && businessId) {
      // 1. Load Queue
      getOfflineQueue().then(queue => {
        if (queue.length > 0) {
          setQueuedActions(prev => [...prev, ...queue.filter(a => !prev.find(p => p.id === a.id))]);
          if (navigator.onLine) processQueue();
        }
      });
      
       // 2. Hydrate POS from SQLite for instant start
      getCachedProducts(businessId).then(p => { if (p.length > 0) setSyncedProducts(p); });
      getCachedCustomers(businessId).then(c => { if (c.length > 0) setSyncedCustomers(c); });
      getCachedReceipts(businessId).then(r => { if (r.length > 0) setSyncedReceipts(r); });
      getCachedBusiness(businessId).then(b => { if (b) setOfflineBusiness(b); });
      getCachedStats(businessId).then(s => { if (s) setOfflineStats(s); });
    }
  }, [isMounted, businessId, processQueue]);


  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { 
      if (lastUserId) nuclearReset(); 
      setLastUserId(null); 
      setImpersonatedUserId(null);
      if (typeof window !== 'undefined') sessionStorage.removeItem('zeneva_impersonated_user_id');
      return; 
    }
    if (effectiveUserId !== lastUserId) { 
      if (lastUserId) resetPOS(); 
      setLastUserId(effectiveUserId); 
    }
    
    // Safety check: only allow impersonation if current user is super admin
    const isSuperAdmin = user?.email === 'belloimam431@gmail.com';
    if (impersonatedUserId && !isSuperAdmin) {
      setImpersonatedUserId(null);
      if (typeof window !== 'undefined') sessionStorage.removeItem('zeneva_impersonated_user_id');
    }
  }, [user, isUserLoading, effectiveUserId, lastUserId, resetPOS, nuclearReset]);

  useEffect(() => {
    const handleOnline = () => processQueue();
    window.addEventListener('online', handleOnline);
    
    // Auto-trigger processQueue when actions are added if online
    if (navigator.onLine && queuedActions.some(a => a.status === 'pending') && !isQueueProcessing) {
      processQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue, queuedActions, isQueueProcessing]);
  
  // SQLite Continuity Sync
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && businessId) {
      if (products && products.length > 0) import('@/lib/sqlite-sync').then(m => m.syncProductsToOffline(businessId, products));
      if (customers && customers.length > 0) import('@/lib/sqlite-sync').then(m => m.syncCustomersToOffline(businessId, customers));
      if (receipts && receipts.length > 0) import('@/lib/sqlite-sync').then(m => m.syncReceiptsToOffline(businessId, receipts));
      if (business) import('@/lib/sqlite-sync').then(m => m.syncBusinessToOffline(business));
      if (stats) import('@/lib/sqlite-sync').then(m => m.syncStatsToOffline(businessId, stats));
    }
  }, [businessId, products, customers, receipts, business, stats]);

  // Handle Full Background Sync of Customers for Native
  useEffect(() => {
    if (!isMounted || !businessId || !firestore || isFullSyncingCustomers || !navigator.onLine) return;

    const checkFullSyncStatus = async () => {
      const [lastCustSync, lastProdSync] = await Promise.all([
        getLastSyncMetadata(businessId, 'full_customers_sync'),
        getLastSyncMetadata(businessId, 'full_products_sync')
      ]);
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (now - lastCustSync > oneHour && !isFullSyncingCustomers) {
        fetchFullCustomers();
      }

      if (now - lastProdSync > oneHour && !isFullSyncingProducts) {
        fetchFullProducts();
      }
    };

    checkFullSyncStatus();
  }, [isMounted, businessId, firestore]);


  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cart]);
  const tax = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax - discount, [subtotal, tax, discount]);

  const impersonateUser = useCallback((userId: string) => {
    setImpersonatedUserId(userId);
    sessionStorage.setItem('zeneva_impersonated_user_id', userId);
    toast({ title: 'Impersonating User', description: 'Redirecting to their view...' });
    triggerRefresh();
  }, [toast, triggerRefresh]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    sessionStorage.removeItem('zeneva_impersonated_user_id');
    toast({ title: 'Impersonation Ended', description: 'Returning to your administrator view.' });
    nuclearReset();
    triggerRefresh();
  }, [toast, nuclearReset, triggerRefresh]);

  const holdCurrentSale = useCallback((notes?: string) => {
    if (cart.length === 0) return;
    
    const newHeldSale: HeldSale = {
      id: uuidv4(),
      items: [...cart],
      customer: selectedCustomer,
      timestamp: Date.now(),
      total: total,
      notes
    };
    
    setHeldSales(prev => {
      const updated = [newHeldSale, ...prev];
      secureStorage.setItem(POS_HELD_SALES_KEY, updated);
      return updated;
    });
    
    resetPOS();
    toast({
      title: "Sale Parked",
      description: "You can resume this sale later from the 'Parked Sales' list.",
    });
  }, [cart, selectedCustomer, total, resetPOS, toast]);

  const resumeHeldSale = useCallback((heldSaleId: string) => {
    const saleToResume = heldSales.find(s => s.id === heldSaleId);
    if (!saleToResume) return;
    
    // Clear current POS state then set to resumed sale
    setCart(saleToResume.items);
    setSelectedCustomer(saleToResume.customer || null);
    
    // Remove from held sales
    const updatedHeldSales = heldSales.filter(s => s.id !== heldSaleId);
    setHeldSales(updatedHeldSales);
    secureStorage.setItem(POS_HELD_SALES_KEY, updatedHeldSales);
    
    toast({
      title: "Sale Resumed",
      description: "The parked items have been added back to your cart.",
    });
  }, [heldSales, toast]);

  const deleteHeldSale = useCallback((heldSaleId: string) => {
    const updated = heldSales.filter(s => s.id !== heldSaleId);
    setHeldSales(updated);
    secureStorage.setItem(POS_HELD_SALES_KEY, updated);
  }, [heldSales]);

  const voidReceipt = useCallback(async (receiptId: string) => {
    setSyncedReceipts(prev => prev.filter(r => r.id !== receiptId));
    try {
      const currentSynced = secureStorage.getItem<any[]>('pos_synced_receipts') || [];
      const updatedSynced = currentSynced.filter(r => r.id !== receiptId);
      secureStorage.setItem('pos_synced_receipts', updatedSynced);
    } catch (err) {
      console.error("Failed to update secureStorage for voided receipt:", err);
    }

    try {
      const { deleteReceiptFromOffline } = await import('@/lib/sqlite-sync');
      await deleteReceiptFromOffline(receiptId);
    } catch (err) {
      console.error("Failed to delete receipt from SQLite:", err);
    }
  }, []);



  const fetchReceiptsInRange = useCallback(async (from: Date, to: Date, limitCount: number = 5000) => {
    if (!businessId || !firestore) return [];
    
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      try {
        const q = query(
          collection(firestore, 'receipts'),
          where('businessId', '==', businessId),
          where('createdAt', '>=', safeToDate(from)),
          where('createdAt', '<=', safeToDate(to)),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        const snap = await getDocs(q);
        const receipts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
        
        // Sync these to offline for future use
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          import('@/lib/sqlite-sync').then(m => m.syncReceiptsToOffline(businessId, receipts));
        }
        
        return receipts;
      } catch (err) {
        console.error("Fetch Receipts In Range online failed:", err);
      }
    }

    // Fallback 1: SQLite (Tauri)
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const { getCachedReceipts } = await import('@/lib/sqlite-sync');
        const cached = await getCachedReceipts(businessId, limitCount);
        if (cached && cached.length > 0) {
          const fromTime = from.getTime();
          const toTime = to.getTime();
          return cached.filter(r => {
            const rt = safeToDate(r.createdAt).getTime();
            return rt >= fromTime && rt <= toTime;
          });
        }
      } catch (err) {
        console.error("Fetch Receipts In Range SQLite fallback failed:", err);
      }
    }

    // Fallback 2: State / SecureStorage receipts (Web/PWA)
    const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
    if (targetReceipts && targetReceipts.length > 0) {
      const fromTime = from.getTime();
      const toTime = to.getTime();
      return targetReceipts.filter(r => {
        const rt = safeToDate(r.createdAt).getTime();
        return rt >= fromTime && rt <= toTime;
      });
    }

    return [];
  }, [businessId, firestore, syncedReceipts, receipts]);

  const currencyCode = business?.settings?.currency || 'NGN';

  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const fetchMonthlyAnalytics = useCallback(async (monthCount: number = 12) => {
    if (!businessId || !firestore) return [];
    
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    // 1. If Online, fetch precise aggregates from Firestore
    if (isOnline) {
      try {
        const months = [];
        const now = new Date();
        const currentYear = now.getFullYear();

        // We fetch for all months of the current year up to now
        const monthPromises = [];
        for (let i = 0; i <= now.getMonth(); i++) {
          const startDate = new Date(currentYear, i, 1);
          const endDate = new Date(currentYear, i + 1, 0, 23, 59, 59, 999);
          
          const q = query(
            collection(firestore, "receipts"),
            where("businessId", "==", businessId),
            where("createdAt", ">=", startDate),
            where("createdAt", "<=", endDate)
          );
          
          monthPromises.push(getAggregateFromServer(q, {
            revenue: sum('total')
          }).then(snap => ({
            month: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
            revenue: snap.data().revenue || 0
          })));
        }

        const results = await Promise.all(monthPromises);
        
        // Update SQLite cache in background
        if (isTauri) {
          // We'd normally have a specialized sync for this, but let's just return for now
          // getMonthlyRevenue already exists but it's based on local receipts.
        }

        return results.sort((a,b) => b.month.localeCompare(a.month));
      } catch (err) {
        console.error("Firestore Aggregate Fetch Failed:", err);
      }
    }

    // 2. Fallback to SQLite (Last 12 months among synced receipts)
    if (isTauri) {
      try {
        const res = await getMonthlyRevenue(businessId, monthCount);
        if (res && res.length > 0) return res;
      } catch (err) {
        console.error("SQLite Monthly Fetch Failed:", err);
      }
    }

    // 3. Fallback to synced receipts (volatile or cached)
    const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
    if (targetReceipts && targetReceipts.length > 0) {
      const monthly: Record<string, number> = {};
      targetReceipts.forEach(r => {
        const date = safeToDate(r.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + (r.total || 0);
      });
      return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue })).sort((a,b) => b.month.localeCompare(a.month)).slice(0, monthCount);
    }
    
    return [];
  }, [businessId, firestore, syncedReceipts, receipts]);


  const value: POSContextType = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile: profile, 
    isLoading: (isUserLoading && !offlineProfile) ||
               (!!user && !businessId) ||
               (isLoadingBusiness && !business) || 
               ((isLoadingProducts || !canFetchSubData) && !!businessId && initialProducts === null && syncedProducts.length === 0 && (typeof navigator !== 'undefined' && navigator.onLine)) || 
               (isLoadingCustomers && (!customers || customers.length === 0) && (typeof navigator !== 'undefined' && navigator.onLine)) || 
               (isLoadingReceipts && (!receipts || receipts.length === 0) && (typeof navigator !== 'undefined' && navigator.onLine)) ||
               (isSyncing && (!products || products.length === 0) && (typeof navigator !== 'undefined' && navigator.onLine)) ||
               (isFullSyncingCustomers && (!customers || customers.length === 0) && (typeof navigator !== 'undefined' && navigator.onLine)) ||
               (isFullSyncingProducts && (!products || products.length === 0) && (typeof navigator !== 'undefined' && navigator.onLine)) ||
               !isMounted, 
    isUserLoading: isUserLoading || (!!user && !profile), 
    user, firestore,
    isProfileReady,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    selectedCustomer, selectCustomer: setSelectedCustomer,
    subtotal, tax, taxRate, discount, total, setTax: setTaxRate, setDiscount,
    paymentMethod, setPaymentMethod, autoPrint, setAutoPrint, resetPOS, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti, setIsConfettiActive,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions: () => {}, updateQueuedAction: () => {}, addProductWithImage, removeFromQueue: () => {},
    mutateBusiness, isSyncing, isFullSyncingCustomers, isFullSyncingProducts, optimisticProducts: [],

    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating,
    searchCustomers, searchCustomersByField, searchReceipts: async () => [],
    fetchReceiptsInRange, searchProducts, searchProductsByField, findProductBySku,
    fetchDetailedAnalytics, 
    fetchMonthlyAnalytics,
    fetchMoreReceipts: async () => 0, fetchMoreCustomers: async () => 0, fetchMoreProducts: async () => 0,

    heldSales, holdCurrentSale, resumeHeldSale, deleteHeldSale, voidReceipt,

    stats, 
    isSubscriptionActive: business ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && safeToDate(business.trialExpiresAt).getTime() > Date.now())) : true
  }), [business, products, receipts, customers, onlineOrders, currentUserProfile, isUserLoading, user, firestore, cart, selectedCustomer, taxRate, discount, paymentMethod, autoPrint, isConfettiActive, triggerRefresh, triggerConfetti, queuedActions, isQueueProcessing, addToQueue, processQueue, mutateBusiness, isSyncing, isFullSyncingCustomers, impersonatedUserId, isImpersonating, stats, currencySymbol, currencyCode, subtotal, tax, total, impersonateUser, stopImpersonation, searchCustomers, searchProducts, fetchDetailedAnalytics, fetchMonthlyAnalytics, isProfileReady, isLoadingBusiness, isLoadingProducts, isLoadingCustomers, isMounted, heldSales, voidReceipt]);

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) throw new Error('usePOS must be used within a POSProvider');
  return context;
};

export const useBusiness = () => {
  const context = useContext(POSContext);
  if (context === undefined) throw new Error('useBusiness must be used within a POSProvider');
  return context.business;
};
