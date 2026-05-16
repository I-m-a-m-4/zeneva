'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction, BusinessStats, AuditLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { collection, doc, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, increment, getDoc, setDoc, getDocs, startAfter, getAggregateFromServer, count, sum } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';
import { secureStorage } from '@/lib/secure-storage';
import { idb } from '@/lib/idb';
import {   syncProductsToOffline, 
  syncProductToOffline,
  deleteMultipleProductsFromOffline,
  getCachedProducts, 
  getCachedCustomers,
  syncCustomersToOffline,
  syncReceiptsToOffline,
  getCachedReceipts,
  getCachedBusiness,
  syncBusinessToOffline,
  syncStatsToOffline,
  getCachedStats,
  getLastSyncMetadata, 
  setLastSyncMetadata,
  saveActionToOfflineQueue,
  getOfflineQueue,
  removeActionFromOfflineQueue,
  getMonthlyRevenue,
  clearAllTables,
  deleteReceiptFromOffline
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
  isFullSyncingProducts: boolean;
  isFullSyncingReceipts: boolean;
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
  users: UserProfile[];
  auditLogs: AuditLog[];
  isOnline: boolean;
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
  const hasHydratedRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullSyncingCustomers, setIsFullSyncingCustomers] = useState(false);
  const [isFullSyncingProducts, setIsFullSyncingProducts] = useState(false);
  const [isFullSyncingReceipts, setIsFullSyncingReceipts] = useState(false);
  const [extraStats, setExtraStats] = useState({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0 });

  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>(() => secureStorage.getItem<QueuedAction[]>('pos_queued_actions') || []);
  const queuedActionsRef = useRef<QueuedAction[]>(queuedActions);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [syncedProducts, setSyncedProducts] = useState<Product[]>(() => secureStorage.getItem<Product[]>('pos_synced_products') || []);
  const [syncedCustomers, setSyncedCustomers] = useState<Customer[]>(() => secureStorage.getItem<Customer[]>('pos_synced_customers') || []);
  const [syncedReceipts, setSyncedReceipts] = useState<Receipt[]>(() => secureStorage.getItem<Receipt[]>('pos_synced_receipts') || []);
  const [syncedUsers, setSyncedUsers] = useState<UserProfile[]>(() => secureStorage.getItem<UserProfile[]>('pos_synced_users') || []);
  const [syncedAuditLogs, setSyncedAuditLogs] = useState<AuditLog[]>(() => secureStorage.getItem<AuditLog[]>('pos_synced_audit_logs') || []);
  const [offlineProfile, setOfflineProfile] = useState<UserProfile | null>(() => secureStorage.getItem<UserProfile>(USER_PROFILE_KEY));
  const [offlineBusiness, setOfflineBusiness] = useState<BusinessInstance | null>(() => secureStorage.getItem<BusinessInstance>(BUSINESS_INSTANCE_KEY));
  const [offlineStats, setOfflineStats] = useState<BusinessStats | null>(() => secureStorage.getItem<BusinessStats>('pos_offline_stats'));
  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<number>(() => {
    const stored = secureStorage.getItem<number>('pos_last_synced_timestamp');
    // If no previous sync, default to 24 hours ago to catch recent changes on first load
    return stored || (Date.now() - 24 * 60 * 60 * 1000);
  });

  // 🌐 INTELLIGENT CONNECTIVITY ENGINE
  // navigator.onLine can give false positives (e.g. connected to a WiFi hotspot with no cellular data)
  // We solve this by performing a direct lightweight WAN ping in the background to guarantee REAL internet!
  const [isRealOnline, setIsRealOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') return navigator.onLine;
    return true;
  });

  const consecutiveFailuresRef = useRef<number>(0);

  const verifyConnectivity = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // 1. Native Disconnect is absolute and immediate
    if (!navigator.onLine) {
      consecutiveFailuresRef.current = 2; // Force threshold ceiling
      setIsRealOnline(false);
      return false;
    }

    // Channel 1: Micro-fetch sensor (Routed through whitelisted CSP endpoint)
    const checkFetch = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        // INCREASE TIMEOUT WINDOW TO 8.5 SECONDS TO ACCOMMODATE WEAK/SLUGGISH CELLULAR LINKS
        const id = setTimeout(() => controller.abort(), 8500);
        await fetch("https://fonts.googleapis.com", {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(id);
        return true;
      } catch {
        return false;
      }
    };

    // Channel 2 & 3: Browser-native Image Beaconing (bypasses ALL CORS/CORB/CSP limitations)
    const checkImage = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.onload = null;
          img.onerror = null;
          img.src = "";
          resolve(false);
        }, 8500); // Expanded timeout to 8.5s
        
        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        // Force bypass local cache with timestamp query
        img.src = `${url}?cacheBust=${Date.now()}`;
      });
    };

    // Define multiple disparate endpoints to bypass any regional or provider blocks
    const tasks = [
      checkFetch(),
      checkImage("https://www.google.com/favicon.ico"),
      checkImage("https://www.cloudflare.com/favicon.ico")
    ];

    // Custom Race: Resolve to TRUE immediately on the FIRST successful probe.
    let finishedCount = 0;
    const hasConnection = await new Promise<boolean>((resolve) => {
      let resolved = false;
      tasks.forEach(task => {
        task.then(isSuccessful => {
          if (resolved) return;
          if (isSuccessful) {
            resolved = true;
            resolve(true);
          } else {
            finishedCount++;
            if (finishedCount === tasks.length) {
              resolved = true;
              resolve(false);
            }
          }
        });
      });
    });

    if (hasConnection) {
      // SUCCESS: Instantly restore connection and reset fails!
      consecutiveFailuresRef.current = 0;
      setIsRealOnline(true);
    } else {
      // PROBE FAILURE: Log it, but BUFFER the decision!
      consecutiveFailuresRef.current += 1;
      
      // Only declare offline in UI if BOTH probes in CONSECUTIVE runs fail entirely!
      // This flawlessly prevents flickering on high-latency or weak connections.
      if (consecutiveFailuresRef.current >= 2) {
        setIsRealOnline(false);
      }
    }
    
    return hasConnection;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnlineEvent = () => {
      // Wait 500ms to allow interface initialization, then execute WAN ping
      setTimeout(verifyConnectivity, 500);
    };
    const handleOfflineEvent = () => {
      setIsRealOnline(false);
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);
    
    // Periodic background check every 16 seconds to balance cellular data usage and responsiveness
    const interval = setInterval(verifyConnectivity, 16000);
    
    // Perform verification on component load
    verifyConnectivity();

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
      clearInterval(interval);
    };
  }, [verifyConnectivity]);

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
  const businessId = isProfileReady ? currentUserProfile.businessId : (offlineProfile?.businessId || null);

  const businessDocRef = useMemoFirebase(() => (user && businessId ? doc(firestore, 'businessInstances', businessId) : null), [user, businessId, firestore]);
  const { data: initialBusiness, isLoading: isLoadingBusiness, mutate: mutateBusiness } = useDoc<BusinessInstance>(businessDocRef);

  // Sync to local storage for fast subsequent loads
  useEffect(() => {
    if (currentUserProfile) secureStorage.setItem(USER_PROFILE_KEY, currentUserProfile);
  }, [currentUserProfile]);

  useEffect(() => {
    secureStorage.setItem('pos_queued_actions', queuedActions);
    queuedActionsRef.current = queuedActions;
  }, [queuedActions]);

  useEffect(() => {
    secureStorage.setItem('pos_synced_products', syncedProducts);
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (!isTauri) idb.set('pos_synced_products', syncedProducts);
  }, [syncedProducts]);

  useEffect(() => {
    secureStorage.setItem('pos_synced_customers', syncedCustomers);
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (!isTauri) idb.set('pos_synced_customers', syncedCustomers);
  }, [syncedCustomers]);

  useEffect(() => {
    secureStorage.setItem('pos_synced_receipts', syncedReceipts);
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (!isTauri) idb.set('pos_synced_receipts', syncedReceipts);
  }, [syncedReceipts]);
 
  useEffect(() => {
    secureStorage.setItem('pos_synced_users', syncedUsers);
  }, [syncedUsers]);

  useEffect(() => {
    secureStorage.setItem('pos_synced_audit_logs', syncedAuditLogs);
  }, [syncedAuditLogs]);

  useEffect(() => {
    if (initialBusiness) secureStorage.setItem(BUSINESS_INSTANCE_KEY, initialBusiness);
  }, [initialBusiness]);

  const canFetchSubData = !!businessId && !!initialBusiness && initialBusiness.status !== 'deleted' && !!user && isProfileReady;

  // Optimized: Disabled real-time listener for large collection to cut Firestore read costs. 
  // System relies on fast local SQLite cache (syncedProducts) and periodic background/delta syncs.
  const productsQuery = useMemoFirebase(() => null, []);
  const { data: initialProducts, isLoading: isLoadingProducts, mutate: mutateProducts } = useCollection<Product>(productsQuery);

  const statsDocRef = useMemoFirebase(() => (canFetchSubData ? doc(firestore, 'businessInstances', businessId, 'stats', 'overall') : null), [canFetchSubData, businessId, firestore]);
  const { data: initialStats } = useDoc<BusinessStats>(statsDocRef);

  useEffect(() => {
    if (initialStats) secureStorage.setItem('pos_offline_stats', initialStats);
  }, [initialStats]);

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

  // Optimized: Disabled real-time listener to avoid quadratic listener scaling cost.
  const receiptsQuery = useMemoFirebase(() => null, []);
  const { data: initialReceipts, isLoading: isLoadingReceipts, mutate: mutateReceipts } = useCollection<Receipt>(receiptsQuery);

  // Optimized: Disabled real-time listener for customers to minimize daily reads.
  const customersQuery = useMemoFirebase(() => null, []);
  const { data: initialCustomers, isLoading: isLoadingCustomers, mutate: mutateCustomers } = useCollection<Customer>(customersQuery);


  const onlineOrdersQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [canFetchSubData, businessId, firestore]);
  const { data: onlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);

  const products = useMemo(() => {
    if (initialProducts === null && syncedProducts.length === 0 && isRealOnline && !!businessId) return null;
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
  }, [initialProducts, syncedProducts, queuedActions, isRealOnline, businessId]);

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
    const queuedSales = queuedActions.filter(a => a.type === 'complete-sale');
    if (initialReceipts === null && syncedReceipts.length === 0 && queuedSales.length === 0 && isRealOnline && !!businessId) return null;
    
    let merged = [...(initialReceipts || [])];
    const existingIds = new Set(merged.map(r => r.id));
    syncedReceipts.forEach(r => { 
      if (!existingIds.has(r.id)) {
        merged.push(r); 
        existingIds.add(r.id);
      }
    });
    queuedSales.forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt && !existingIds.has(receipt.id)) {
        merged.push({ 
          ...receipt, 
          isOptimistic: true, 
          createdAt: receipt.createdAt || new Date(action.timestamp) 
        });
        existingIds.add(receipt.id);
      }
    });
    
    // Filter out voided receipts currently in the sync queue
    const voidedIds = new Set(queuedActions.filter(a => a.type === 'delete-receipt').map(a => a.payload.receiptId));
    if (voidedIds.size > 0) {
      merged = merged.filter(r => !voidedIds.has(r.id));
    }
    
    // Client-side sort by createdAt desc
    return merged.sort((a, b) => {
      const getMillis = (dateVal: any) => {
        const date = safeToDate(dateVal);
        return date.getTime();
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
  }, [initialReceipts, syncedReceipts, queuedActions, isRealOnline, businessId]);

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

  const users = useMemo(() => {
    if (syncedUsers.length > 0) return syncedUsers;
    return [];
  }, [syncedUsers]);

  const auditLogs = useMemo(() => {
    if (syncedAuditLogs.length > 0) return syncedAuditLogs;
    return [];
  }, [syncedAuditLogs]);

  const stats = useMemo(() => {
    const baseStats = initialStats || offlineStats;
    if (!baseStats) return null;

    const queuedSales = queuedActions.filter(a => a.type === 'complete-sale' && a.status === 'pending');
    if (queuedSales.length === 0) return baseStats;

    // Optimistically apply pending offline sales to display metrics
    let pendingRevenue = 0;
    let pendingUnits = 0;
    
    queuedSales.forEach(sale => {
      const data = sale.payload.receiptData || sale.payload;
      pendingRevenue += Number(data.total) || 0;
      const items = data.items || [];
      items.forEach((i: any) => pendingUnits += (Number(i.quantity) || 0));
    });

    return {
      ...baseStats,
      totalRevenue: (baseStats.totalRevenue || 0) + pendingRevenue,
      totalSales: (baseStats.totalSales || 0) + queuedSales.length,
      totalUnitsSold: (baseStats.totalUnitsSold || 0) + pendingUnits,
    };
  }, [initialStats, offlineStats, queuedActions]);

  // --- Functions ---
  const refreshData = useCallback(async (silent = false) => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || isSyncing || !isOnline) return;
    
    if (!silent) setIsSyncing(true);
    try {
      // Delta Sync: Only fetch documents updated since our last check
      // This turns 10,000 reads into 1-10 reads.
      const lastCheck = new Date(lastSyncedTimestamp);
      
      const pQuery = query(collection(firestore, "products"), where("businessId", "==", businessId), where("updatedAt", ">", lastCheck), limit(500));
      const cQuery = query(collection(firestore, "customers"), where("businessId", "==", businessId), where("updatedAt", ">", lastCheck), limit(500));
      const rQuery = query(collection(firestore, "receipts"), where("businessId", "==", businessId), where("createdAt", ">", lastCheck), limit(100));
      
      const [pSnap, cSnap, rSnap] = await Promise.all([getDocs(pQuery), getDocs(cQuery), getDocs(rQuery)]);
      
      const newProducts = pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      const newCustomers = cSnap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      const newReceipts = rSnap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));

      // Anti-Ghosting Guard: Prevent network delta-sync from re-injecting items currently pending deletion
      const deletedProductIds = new Set(queuedActionsRef.current.filter(a => a.type === 'delete-product').flatMap(a => a.payload.productIds));
      const deletedCustomerIds = new Set(queuedActionsRef.current.filter(a => a.type === 'delete-customer').map(a => a.payload.id));
      const voidedReceiptIds = new Set(queuedActionsRef.current.filter(a => a.type === 'delete-receipt').map(a => a.payload.receiptId));

      const filteredProducts = newProducts.filter(p => !deletedProductIds.has(p.id));
      const filteredCustomers = newCustomers.filter(c => !deletedCustomerIds.has(c.id));
      const filteredReceipts = newReceipts.filter(r => !voidedReceiptIds.has(r.id));

      if (filteredProducts.length > 0) {
        setSyncedProducts(prev => {
          const merged = [...prev];
          filteredProducts.forEach(np => {
            const idx = merged.findIndex(p => p.id === np.id);
            if (idx !== -1) merged[idx] = np;
            else merged.push(np);
          });
          return merged;
        });
      }

      if (filteredCustomers.length > 0) {
        setSyncedCustomers(prev => {
          const merged = [...prev];
          filteredCustomers.forEach(nc => {
            const idx = merged.findIndex(c => c.id === nc.id);
            if (idx !== -1) merged[idx] = nc;
            else merged.push(nc);
          });
          return merged;
        });
      }
      if (filteredReceipts.length > 0) {
        setSyncedReceipts(prev => {
          const merged = [...prev];
          filteredReceipts.forEach(nr => {
            const idx = merged.findIndex(r => r.id === nr.id);
            if (idx !== -1) merged[idx] = nr;
            else merged.push(nr);
          });
          return merged;
        });
      }
      const now = Date.now();
      setLastSyncedTimestamp(now);
      secureStorage.setItem('pos_last_synced_timestamp', now);

      if ((newProducts.length > 0 || newCustomers.length > 0 || newReceipts.length > 0) && !hasShownSyncToast.current && !silent) {
        toast({ title: "Operational Sync Complete", description: `Successfully synchronized inventory, customer, and recent sales data.` });
        hasShownSyncToast.current = true;
      }
    } catch (error) {
      if (!silent) console.error("Delta Sync Failed:", error);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [businessId, firestore, isSyncing, lastSyncedTimestamp, toast, isRealOnline]);

  const fetchInitialReceipts = useCallback(async () => {
    if (!user || !businessId || !firestore || !isRealOnline) return;
    try {
      const q = query(collection(firestore, "receipts"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(q);
      const fetchedRecs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
      
      // 1. Anti-Ghosting Guard: Prevent re-injecting receipts that this CLIENT has queued for deletion
      const voidedReceiptIds = new Set(queuedActionsRef.current.filter(a => a.type === 'delete-receipt').map(a => a.payload.receiptId));
      const filteredRecs = fetchedRecs.filter(r => !voidedReceiptIds.has(r.id));
      
      // 2. Server Deletion Reconciliation: Detect and purge items deleted from Firestore by OTHER clients
      const serverIds = new Set(fetchedRecs.map(r => r.id));
      const purgedLocalIds: string[] = [];

      setSyncedReceipts(prev => {
        if (fetchedRecs.length === 0) return prev;
        
        // Extract the timestamp of the oldest server document in our top 200 retrieval window
        const oldestFetchedDate = safeToDate(fetchedRecs[fetchedRecs.length - 1].createdAt).getTime();
        
        const prunedPrev = prev.filter(localR => {
          // If it exists in the fetched payload, keep it (it will be updated below)
          if (serverIds.has(localR.id)) return true;
          
          // If the local client is actively pending a write/complete-sale for this receipt, DO NOT delete it
          const pendingSale = queuedActionsRef.current.some(a => a.type === 'complete-sale' && (a.payload.receiptData?.id === localR.id || a.payload.id === localR.id));
          if (pendingSale) return true;
          
          const localTime = safeToDate(localR.createdAt).getTime();
          
          // If the receipt timestamp is newer than the oldest retrieved document BUT the document is MISSING
          // from the server payload, it must have been deleted from Firestore by another client!
          if (localTime >= oldestFetchedDate) {
            purgedLocalIds.push(localR.id);
            return false; // Prune it from the array!
          }
          
          // Keep older historical records that are beyond the 200-item retrieval window limit
          return true;
        });

        const merged = [...prunedPrev];
        filteredRecs.forEach(nr => {
          const idx = merged.findIndex(r => r.id === nr.id);
          if (idx !== -1) {
            merged[idx] = nr;
          } else {
            merged.push(nr);
          }
        });
        
        return merged
          .sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
      });
      
      // 3. Sync changes and propagate deletions down to offline SQLite storage if in Tauri desktop environment
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        await syncReceiptsToOffline(businessId, fetchedRecs);
        
        for (const idToPurge of purgedLocalIds) {
          await deleteReceiptFromOffline(idToPurge);
        }
      }
    } catch (error) {
      console.error("Failed to fetch initial receipts:", error);
    }
  }, [businessId, firestore, user, isRealOnline]);

  // Effect to pull initial historical receipts once on startup if the local array is empty.
  useEffect(() => {
    const isOnline = isRealOnline;
    if (user && businessId && firestore && isOnline) {
      fetchInitialReceipts();
    }
  }, [businessId, firestore, fetchInitialReceipts, refreshKey, user, isRealOnline]);

  const fetchInitialUsers = useCallback(async () => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || !isOnline) return;
    try {
      const snap = await getDocs(query(collection(firestore, "users"), where("businessId", "==", businessId)));
      const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      if (fetched.length > 0) {
        setSyncedUsers(prev => {
          const merged = [...prev];
          fetched.forEach(nu => {
            const idx = merged.findIndex(u => u.id === nu.id);
            if (idx !== -1) merged[idx] = nu;
            else merged.push(nu);
          });
          return merged;
        });
      }
    } catch (e: any) { 
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) return;
      console.error("Fetch initial users failed:", e); 
    }
  }, [businessId, firestore, user, isRealOnline]);

  const fetchInitialAuditLogs = useCallback(async () => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || !isOnline) return;
    try {
      const snap = await getDocs(query(collection(firestore, 'businessInstances', businessId, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50)));
      const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog));
      if (fetched.length > 0) {
        setSyncedAuditLogs(prev => {
          const merged = [...prev];
          fetched.forEach(na => {
            const idx = merged.findIndex(a => a.id === na.id);
            if (idx !== -1) merged[idx] = na;
            else merged.push(na);
          });
          return merged.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime()).slice(0, 200);
        });
      }
    } catch (e: any) { 
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) return;
      console.error("Fetch initial audit logs failed:", e); 
    }
  }, [businessId, firestore, user, isRealOnline]);

  useEffect(() => {
    const isOnline = isRealOnline;
    if (user && businessId && firestore && isOnline) {
      fetchInitialUsers();
      fetchInitialAuditLogs();
    }
  }, [businessId, firestore, fetchInitialUsers, fetchInitialAuditLogs, refreshKey, user, isRealOnline]);

  const fetchFullCustomers = useCallback(async () => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || isFullSyncingCustomers || !isOnline) return;
    
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
  }, [businessId, firestore, isFullSyncingCustomers, toast, user, isRealOnline]);

  const fetchFullProducts = useCallback(async () => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || isFullSyncingProducts || !isOnline) return;
    
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
  }, [businessId, firestore, isFullSyncingProducts, toast, user, isRealOnline]);

  const fetchFullReceipts = useCallback(async () => {
    const isOnline = isRealOnline;
    if (!user || !businessId || !firestore || isFullSyncingReceipts || !isOnline) return;
    
    setIsFullSyncingReceipts(true);
    let allFetched: Receipt[] = [];
    let lastDoc: any = null;
    let hasMore = true;
    const BATCH_SIZE = 2500; 

    try {
      while (hasMore) {
        let q = query(
          collection(firestore, "receipts"),
          where("businessId", "==", businessId),
          orderBy("createdAt", "desc"),
          limit(BATCH_SIZE)
        );
        
        if (lastDoc) q = query(q, startAfter(lastDoc));
        
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
        } else {
          const batch = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
          allFetched = [...allFetched, ...batch];
          
          setSyncedReceipts(prev => {
            const merged = [...prev];
            batch.forEach(nr => {
              const idx = merged.findIndex(r => r.id === nr.id);
              if (idx !== -1) merged[idx] = nr;
              else merged.push(nr);
            });
            return merged.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
          });

          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
             await syncReceiptsToOffline(businessId, batch);
          } else {
             const cumulative = await idb.get<Receipt[]>('pos_synced_receipts') || [];
             const mergedIndexed = [...cumulative];
             batch.forEach(nr => {
                const idx = mergedIndexed.findIndex(r => r.id === nr.id);
                if (idx !== -1) mergedIndexed[idx] = nr;
                else mergedIndexed.push(nr);
             });
             await idb.set('pos_synced_receipts', mergedIndexed);
          }

          lastDoc = snap.docs[snap.docs.length - 1];
          if (snap.docs.length < BATCH_SIZE) hasMore = false;
        }
      }
      
      setLastSyncMetadata(businessId, 'full_receipts_sync', Date.now());
      
      const lastToast = Number(localStorage.getItem('last_receipt_sync_toast_time') || 0);
      if (Date.now() - lastToast > 24 * 60 * 60 * 1000) {
        toast({ title: "Sales History Synced", description: `Synchronized ${allFetched.length} receipts and invoices for full offline access.` });
        localStorage.setItem('last_receipt_sync_toast_time', Date.now().toString());
      }
    } catch (error) {
      console.error("Full Receipt Sync Failed:", error);
    } finally {
      setIsFullSyncingReceipts(false);
    }
  }, [businessId, firestore, isFullSyncingReceipts, toast, user, isRealOnline]);

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
    const effectiveProfile = currentUserProfile || offlineProfile;
    if (isQueueProcessing || !isRealOnline || !firestore || !businessId || !effectiveProfile) return;
    const pending = queuedActions.filter(a => a.status === 'pending');
    if (pending.length === 0) return;
    setIsQueueProcessing(true);
    
    try {
      // PERFORMANCE & COST OPTIMIZATION:
      // Efficiently gather sequential 'complete-sale' triggers into unified Firestore batches.
      // This guarantees transactional consistency while collapsing high-traffic writes.
      const operationalSequence: any[][] = [];
      let activeSalesAccum: any[] = [];

      for (const action of pending) {
        if (action.type === 'complete-sale') {
          activeSalesAccum.push(action);
          if (activeSalesAccum.length >= 10) { // Groups up to 10 sales into ONE network payload
            operationalSequence.push(activeSalesAccum);
            activeSalesAccum = [];
          }
        } else {
          // Flush cumulative sale block before interrupting with different operations
          if (activeSalesAccum.length > 0) {
            operationalSequence.push(activeSalesAccum);
            activeSalesAccum = [];
          }
          operationalSequence.push([action]); // Individual execution path for administrative security
        }
      }
      if (activeSalesAccum.length > 0) operationalSequence.push(activeSalesAccum);

      const successfullyCommitIds: string[] = [];

      // Execute each defined operation sequence loop
      for (const chunk of operationalSequence) {
        const batch = writeBatch(firestore);

        // ----------------------------------------------------------------
        // MODE A: The Sale Aggregation Pipeline
        // ----------------------------------------------------------------
        if (chunk.length > 1 || (chunk.length === 1 && chunk[0].type === 'complete-sale')) {
          
          const combinedStocks = new Map<string, number>();
          const consolidatedCust = new Map<string, { totalSpent: number, loyaltyPoints?: number }>();
          let aggregateSales = 0;
          let aggregateRev = 0;
          let aggregateUnits = 0;

          try {
            chunk.forEach(action => {
              // Write Discrete Receipt Record
              const rRef = doc(firestore, 'receipts', action.payload.receiptData.id);
              batch.set(rRef, { ...action.payload.receiptData, businessId: businessId, createdAt: serverTimestamp() });

              // Cascade product stock values (LIFO sequence logic applies naturally via Map overwrite)
              action.payload.productUpdates.forEach((u: any) => combinedStocks.set(u.id, u.newStock));

              // Cumulate operational metrics
              aggregateSales += 1;
              aggregateRev += (action.payload.receiptData.total || 0);
              aggregateUnits += (action.payload.receiptData.items?.reduce((a: number, item: any) => a + (item.quantity || 0), 0) || 0);

              // Aggregate Customer Ledger Deltas
              const cu = action.payload.customerUpdate;
              if (cu && cu.id) {
                const existing = consolidatedCust.get(cu.id) || { totalSpent: 0 };
                consolidatedCust.set(cu.id, {
                  totalSpent: existing.totalSpent + (cu.totalSpent || 0),
                  loyaltyPoints: cu.loyaltyPoints !== undefined ? cu.loyaltyPoints : existing.loyaltyPoints
                });
              }
            });

            // Step B: Flush all cumulative values from the local aggregation buffer into Firestore batch commands.
            combinedStocks.forEach((stockVal, pId) => {
              batch.update(doc(firestore, 'products', pId), { stock: stockVal, updatedAt: serverTimestamp() });
            });

            consolidatedCust.forEach((data, cId) => {
              const updatesObj: any = { updatedAt: serverTimestamp() };
              if (data.totalSpent > 0) updatesObj.totalSpent = increment(data.totalSpent);
              if (data.loyaltyPoints !== undefined) updatesObj.loyaltyPoints = data.loyaltyPoints;
              batch.update(doc(firestore, 'customers', cId), updatesObj);
            });

            // Ship the final, lightweight consolidated payload!
            await batch.commit();

            // ----------------------------------------------------------------
            // Secondary Non-Critical Operations (Stats & Notifications)
            // We run these separately so a permission error for a vendor operator
            // doesn't cause the entire sale batch to fail and get stuck in the queue.
            // ----------------------------------------------------------------
            try {
              const secondaryBatch = writeBatch(firestore);
              let hasSecondaryWrites = false;

              if (aggregateSales > 0 || aggregateRev > 0 || aggregateUnits > 0) {
                secondaryBatch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), {
                  totalSales: increment(aggregateSales),
                  totalRevenue: increment(aggregateRev),
                  totalUnitsSold: increment(aggregateUnits)
                }, { merge: true });
                hasSecondaryWrites = true;
              }

              chunk.forEach(action => {
                action.payload.productUpdates.forEach((u: any) => {
                  const currentProduct = products?.find(p => p.id === u.id);
                  if (currentProduct && currentProduct.lowStockThreshold && u.newStock <= currentProduct.lowStockThreshold) {
                    const alertRef = doc(collection(firestore, `users/${effectiveProfile.id}/notifications`));
                    secondaryBatch.set(alertRef, {
                      title: "Low Stock Alert",
                      body: `${currentProduct.name} is running low. Remaining: ${u.newStock}`,
                      createdAt: serverTimestamp(),
                      read: false,
                      type: 'inventory',
                      productId: currentProduct.id
                    });
                    hasSecondaryWrites = true;
                  }
                });
              });

              if (hasSecondaryWrites) await secondaryBatch.commit();
            } catch (secondaryError) {
              console.warn("POS Queue :: Non-critical stats/notification update failed (likely RBAC). Sale was safely recorded.", secondaryError);
            }

            // Mark chunk as successfully processed
            chunk.forEach(c => successfullyCommitIds.push(c.id));

            // 🚀 OPTIMIZATION FIX: Re-inject transaction records into the local edge cache
            // since real-time Firestore listeners have been severed to eliminate cost overruns.
            const finalizedReceipts = chunk.map(c => {
              const rd = c.payload.receiptData;
              return {
                 ...rd,
                 createdAt: safeToDate(rd.createdAt) || new Date() // Formally coerce timestamps into healthy JS Dates
              };
            });

            // 1. Instant UI population for the Receipts Page
            setSyncedReceipts(prev => {
              const deduped = [...prev];
              finalizedReceipts.forEach(r => {
                const exists = deduped.some(d => d.id === r.id);
                if (!exists) deduped.unshift(r); // Adds new records to top
              });
              return deduped;
            });

            // 2. Fast-track locally synchronized stock reductions to avoid edge-desync
            if (combinedStocks.size > 0) {
              setSyncedProducts(prev => {
                 const fresh = [...prev];
                 combinedStocks.forEach((stockVal, productId) => {
                   const idx = fresh.findIndex(p => p.id === productId);
                   if (idx !== -1) fresh[idx] = { ...fresh[idx], stock: stockVal };
                 });
                 return fresh;
              });
            }

            // 3. Cascade customer total-spend velocity changes directly to local state
            if (consolidatedCust.size > 0) {
              setSyncedCustomers(prev => {
                 const fresh = [...prev];
                 consolidatedCust.forEach((cData, cId) => {
                   const idx = fresh.findIndex(c => c.id === cId);
                   if (idx !== -1) {
                     fresh[idx] = {
                       ...fresh[idx],
                       totalSpent: (Number(fresh[idx].totalSpent) || 0) + cData.totalSpent,
                       loyaltyPoints: cData.loyaltyPoints !== undefined ? cData.loyaltyPoints : fresh[idx].loyaltyPoints
                     };
                   }
                 });
                 return fresh;
              });
            }

          } catch (execError: any) {
            console.error("❌ POS Queue Engine :: Batch write execution failed.", execError);
            
            // Detect non-retryable permanent errors (e.g. Permission Denied, Resource Exhausted, Failed Precondition)
            const errCode = execError?.code || '';
            const isPermanentError = ['permission-denied', 'not-found', 'already-exists', 'invalid-argument', 'failed-precondition'].includes(errCode);
            
            if (isPermanentError) {
              console.warn("⚠️ Permanent Firestore rejection on aggregate batch. Discarding chunk to unblock queue.");
              chunk.forEach(action => successfullyCommitIds.push(action.id)); // Discard to unblock queue
              
              toast({
                title: "Sync Rejection",
                description: `The server rejected a batch of actions: ${execError.message || 'Permission Denied'}.`,
                variant: "destructive"
              });
              continue; // Skip breaking, continue processing remainder
            }
            
            break; // Stop further processing on this tick for temporary network/server blips to preserve safe retry
          }
        }
        
        // ----------------------------------------------------------------
        // MODE B: Single Secure Command (Inherits 100% of original logic)
        // ----------------------------------------------------------------
        else if (chunk.length === 1) {
          const action = chunk[0];
          try {
            switch (action.type) {
              case 'add-customer': {
                const cRef = doc(firestore, 'customers', action.payload.id);
                batch.set(cRef, { ...action.payload, lowercaseName: action.payload.name?.toLowerCase() || '', lowercaseEmail: action.payload.email?.toLowerCase() || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalCustomers: increment(1) }, { merge: true });
                break;
              }
              case 'update-customer': {
                const updateVals = { ...action.payload.values, updatedAt: serverTimestamp() };
                if (updateVals.name) updateVals.lowercaseName = updateVals.name.toLowerCase();
                if ('email' in updateVals) updateVals.lowercaseEmail = updateVals.email?.toLowerCase() || '';
                batch.update(doc(firestore, 'customers', action.payload.id), updateVals); 
                break;
              }
              case 'delete-customer': 
                batch.delete(doc(firestore, 'customers', action.payload.id)); 
                batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalCustomers: increment(-1) }, { merge: true }); 
                break;
              case 'add-product':
                batch.set(doc(firestore, 'products', action.payload.id), { ...action.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalProducts: increment(1) }, { merge: true });
                setSyncedProducts(prev => [...prev, action.payload]);
                if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) syncProductToOffline(businessId, action.payload);
                break;
              case 'delete-product':
                action.payload.productIds.forEach((id: string) => batch.delete(doc(firestore, 'products', id)));
                batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalProducts: increment(-action.payload.productIds.length) }, { merge: true });
                break;
              case 'update-product':
                batch.update(doc(firestore, 'products', action.payload.productId), { ...action.payload.values, updatedAt: serverTimestamp() });
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
                setSyncedProducts(prev => prev.map(p => action.payload.productIds.includes(p.id) ? { ...p, ...action.payload.values } : p));
                if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                  action.payload.productIds.forEach((id: string) => {
                    const current = syncedProducts.find(p => p.id === id);
                    if (current) syncProductToOffline(businessId, { ...current, ...action.payload.values });
                  });
                }
                break;
              case 'add-audit-log': {
                const auditLogRef = collection(firestore, 'businessInstances', businessId, 'auditLogs');
                batch.set(doc(auditLogRef), { ...action.payload, createdAt: serverTimestamp() });
                break;
              }
              case 'delete-receipt': {
                batch.delete(doc(firestore, 'receipts', action.payload.receiptId));
                break;
              }
            }

            await batch.commit();
            successfullyCommitIds.push(action.id);

          } catch (singularErr: any) {
            console.error(`❌ Standalone sync step failed [${action.type}]:`, singularErr);
            
            // Detect non-retryable permanent errors (e.g. Permission Denied, Not Found, Failed Precondition)
            const errCode = singularErr?.code || '';
            const isPermanentError = ['permission-denied', 'not-found', 'already-exists', 'invalid-argument', 'failed-precondition'].includes(errCode);
            
            if (isPermanentError) {
              console.warn(`⚠️ Permanent Firestore rejection for ${action.type} [ID: ${action.id}]. Discarding to unblock queue.`);
              successfullyCommitIds.push(action.id); // Remove from state queue to unblock remaining actions
              
              toast({
                title: "Operation Denied",
                description: `Server rejected: "${action.description || action.type}". Reason: ${singularErr.message || 'Permission Denied'}.`,
                variant: "destructive"
              });
              continue; // Resume execution of the remaining queue
            }
            
            break; // Preserve synchronous safety for temporary network errors
          }
        }
      }

      // State Resolution Phase
      setQueuedActions(prev => {
        const successes = new Set(successfullyCommitIds);
        const failCount = pending.length - successfullyCommitIds.length;

        if (failCount > 0) {
           // We simply notify internal log and naturally leave unresolved items in React state queue to auto-trigger retry 
           console.warn(`Queue resolved with ${failCount} items remaining due to retry conditions.`);
        }

        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          successfullyCommitIds.forEach(id => removeActionFromOfflineQueue(id));
        }

        // Retain non-committed items for safe transparent retries
        return prev.filter(a => !successes.has(a.id));
      });

    } finally {
      setIsQueueProcessing(false);
    }
  }, [isQueueProcessing, queuedActions, firestore, businessId, currentUserProfile, offlineProfile, products, syncedProducts, toast, isRealOnline]);


  const addToQueue = useCallback((action: any, description: string) => {
    const isSubscriptionActive = business ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && safeToDate(business.trialExpiresAt).getTime() > Date.now())) : true;
    if (!isSubscriptionActive) { toast({ variant: 'destructive', title: 'Action Blocked', description: 'Your subscription has expired.' }); return null; }
    
    // --- RBAC Permission Check ---
    const effectiveProfile = currentUserProfile || offlineProfile;
    const permissions = effectiveProfile?.permissions || {};
    const userRole = effectiveProfile?.role;
    const isSuperAdmin = effectiveProfile?.email === 'belloimam431@gmail.com';
    
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
    if (isRealOnline) {
        setTimeout(() => processQueue(), 100);
    }
    
    return id;
  }, [businessId, business, toast, processQueue, currentUserProfile, isRealOnline]);

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
    idb.clear();
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) clearAllTables();
  }, [resetPOS]);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    const isOnline = isRealOnline;
    
    let local: Customer[] = [];
    if (customers && customers.length > 0) {
      local = customers.filter(c => c.name?.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower) || c.phone?.includes(term) || c.code?.toLowerCase().includes(lower));
    }
    
    if (!user || !businessId || !firestore || !isOnline) return local.slice(0, 20);
    try {
      const q = (field: string) => query(collection(firestore, 'customers'), where('businessId', '==', businessId), where(field, '>=', lower), where(field, '<=', lower + '\uf8ff'), limit(20));
      const [nameSnap, emailSnap] = await Promise.all([getDocs(q('lowercaseName')), getDocs(q('lowercaseEmail'))]);
      const combined = [...local, ...nameSnap.docs.map(d => ({ ...d.data() as any, id: d.id } as Customer)), ...emailSnap.docs.map(d => ({ ...d.data() as any, id: d.id } as Customer))];
      return Array.from(new Map(combined.map(item => [item.id, item])).values()).slice(0, 20);
    } catch { return local.slice(0, 20); }
  }, [businessId, firestore, customers, isFullSyncingCustomers, user, isRealOnline]);

  const searchCustomersByField = useCallback(async (field: string, value: string) => {
    if (!value) return [];
    const isOnline = isRealOnline;
    
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
  }, [businessId, firestore, customers, isRealOnline]);

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    const isOnline = isRealOnline;

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
  }, [businessId, firestore, products, isSyncing, isRealOnline]);

  const searchProductsByField = useCallback(async (field: string, value: string) => {
    if (!value) return [];
    const isOnline = isRealOnline;
    
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
  }, [businessId, firestore, products, isRealOnline]);

  const findProductBySku = useCallback(async (sku: string) => {
    if (!sku) return null;
    const isOnline = isRealOnline;
    
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
  }, [businessId, firestore, products, isRealOnline]);

  const fetchDetailedAnalytics = useCallback(async (from: Date, to: Date) => {
    if (!user || !businessId || !firestore) return { revenue: 0, count: 0, customers: 0 };
    
    let result = { revenue: 0, count: 0, customers: 0 };
    let uniqueCustomerIds = new Set<string>();

    const isOnline = isRealOnline;
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
        
        result.revenue = aggregateSnap.data().totalRevenue || 0;
        result.count = aggregateSnap.data().totalOrders || 0;
        
        // For unique customers, we cap this at 5,000 due to Firestore structured query limits
        const docSnap = await getDocs(query(q, limit(5000)));
        docSnap.docs.forEach(d => {
          const cId = d.data().customer?.id;
          if (cId) uniqueCustomerIds.add(cId);
        });
        result.customers = uniqueCustomerIds.size;
      } catch (err) {
        console.error("fetchDetailedAnalytics online failed:", err);
      }
    }

    // Fallback 1: SQLite (Tauri)
    if (result.count === 0) {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          const cached = await getCachedReceipts(businessId, 10000);
          if (cached && cached.length > 0) {
            const fromTime = from.getTime();
            const toTime = to.getTime();
            const filtered = cached.filter(r => {
              const rt = safeToDate(r.createdAt).getTime();
              return rt >= fromTime && rt <= toTime;
            });
            result.revenue = filtered.reduce((acc, r) => acc + r.total, 0);
            result.count = filtered.length;
            uniqueCustomerIds.clear();
            filtered.forEach(r => { if (r.customer?.id) uniqueCustomerIds.add(r.customer.id); });
            result.customers = uniqueCustomerIds.size;
          }
        } catch (err) {
          console.error("fetchDetailedAnalytics SQLite fallback failed:", err);
        }
      }
    }

    // Fallback 2: State / SecureStorage receipts (Web/PWA)
    if (result.count === 0) {
      const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
      if (targetReceipts && targetReceipts.length > 0) {
        const fromTime = from.getTime();
        const toTime = to.getTime();
        const filtered = targetReceipts.filter(r => {
          const rt = safeToDate(r.createdAt).getTime();
          return rt >= fromTime && rt <= toTime;
        });
        result.revenue = filtered.reduce((acc, r) => acc + r.total, 0);
        result.count = filtered.length;
        uniqueCustomerIds.clear();
        filtered.forEach(r => { if (r.customer?.id) uniqueCustomerIds.add(r.customer.id); });
        result.customers = uniqueCustomerIds.size;
      }
    }

    // 🚨 Inject ALL Pending Offline Sales into metrics to guarantee immediate 100% consistent accuracy!
    const fromTime = from.getTime();
    const toTime = to.getTime();
    
    queuedActions.filter(a => a.type === 'complete-sale' && a.status === 'pending').forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt) {
        const rDate = safeToDate(receipt.createdAt || new Date(action.timestamp));
        const rTime = rDate.getTime();
        if (rTime >= fromTime && rTime <= toTime) {
          result.revenue += (receipt.total || 0);
          result.count += 1;
          if (receipt.customer?.id) {
            uniqueCustomerIds.add(receipt.customer.id);
          }
        }
      }
    });
    
    result.customers = uniqueCustomerIds.size;

    return result;
  }, [businessId, firestore, syncedReceipts, receipts, user, queuedActions, isRealOnline]);

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
  useEffect(() => { secureStorage.setItem('pos_synced_users', syncedUsers); }, [syncedUsers]);
  useEffect(() => { secureStorage.setItem('pos_synced_audit_logs', syncedAuditLogs); }, [syncedAuditLogs]);
  useEffect(() => { secureStorage.setItem(POS_HELD_SALES_KEY, heldSales); }, [heldSales]);
  useEffect(() => { secureStorage.setItem('pos_queued_actions', queuedActions); }, [queuedActions]);

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
    if (!isMounted || !businessId || hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      // 1. Load Queue
      getOfflineQueue().then(queue => {
        if (queue.length > 0) {
          setQueuedActions(prev => [...prev, ...queue.filter(a => !prev.find(p => p.id === a.id))]);
          if (isRealOnline) processQueue();
        }
      });
      
       // 2. Hydrate POS from SQLite for instant start
      getCachedProducts(businessId).then(p => { if (p.length > 0) setSyncedProducts(p); });
      getCachedCustomers(businessId).then(c => { if (c.length > 0) setSyncedCustomers(c); });
      getCachedReceipts(businessId, 10000).then(r => { if (r.length > 0) setSyncedReceipts(r); });
      getCachedBusiness(businessId).then(b => { if (b) setOfflineBusiness(b); });
      getCachedStats(businessId).then(s => { if (s) setOfflineStats(s); });
    } else {
      // 2. Hydrate POS from IndexedDB for instant startup on Web/PWA (Evades 5MB LocalStorage Cap)
      idb.get<Product[]>('pos_synced_products').then(p => { if (p && p.length > 0) setSyncedProducts(p); });
      idb.get<Customer[]>('pos_synced_customers').then(c => { if (c && c.length > 0) setSyncedCustomers(c); });
      idb.get<Receipt[]>('pos_synced_receipts').then(r => { if (r && r.length > 0) setSyncedReceipts(r); });
    }
  }, [isMounted, businessId, processQueue, isRealOnline]);


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
    if (isRealOnline && queuedActions.some(a => a.status === 'pending') && !isQueueProcessing) {
      processQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue, queuedActions, isQueueProcessing, isRealOnline]);
  
  // SQLite Continuity Sync
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && businessId) {
      if (products && products.length > 0) syncProductsToOffline(businessId, products);
      if (customers && customers.length > 0) syncCustomersToOffline(businessId, customers);
      if (receipts && receipts.length > 0) syncReceiptsToOffline(businessId, receipts);
      if (business) syncBusinessToOffline(business);
      if (stats) syncStatsToOffline(businessId, stats);
    }
  }, [businessId, products, customers, receipts, business, stats]);

  useEffect(() => {
    if (!isMounted || !businessId || !firestore || isFullSyncingCustomers || !isRealOnline) return;

    const checkFullSyncStatus = async () => {
      const [lastCustSync, lastProdSync, lastReceiptSync] = await Promise.all([
        getLastSyncMetadata(businessId, 'full_customers_sync'),
        getLastSyncMetadata(businessId, 'full_products_sync'),
        getLastSyncMetadata(businessId, 'full_receipts_sync')
      ]);
      
      const now = Date.now();
      const dayInterval = 24 * 60 * 60 * 1000; // Changed from 1 hour to 24 hours to save reads
      
      if (now - lastCustSync > dayInterval && !isFullSyncingCustomers) {
        fetchFullCustomers();
      }

      if (now - lastProdSync > dayInterval && !isFullSyncingProducts) {
        fetchFullProducts();
      }

      if (now - lastReceiptSync > dayInterval && !isFullSyncingReceipts) {
        fetchFullReceipts();
      }
    };

    checkFullSyncStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, businessId, firestore, isRealOnline]);
  
  // Initial Delta Sync (Silent Catch-up on mount)
  useEffect(() => {
    if (!businessId || !isRealOnline || !firestore) return;

    const timeout = setTimeout(() => {
      refreshData(true); // Run silently to avoid flickering or showing messages
    }, 2000);

    return () => clearTimeout(timeout);
  }, [businessId, isRealOnline, firestore, refreshData]);


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
  }, [heldSales]);

  const deleteHeldSale = useCallback((heldSaleId: string) => {
    const updated = heldSales.filter(s => s.id !== heldSaleId);
    setHeldSales(updated);
    secureStorage.setItem(POS_HELD_SALES_KEY, updated);
  }, [heldSales]);

  const voidReceipt = useCallback(async (receiptId: string) => {
    // 1. Optimistic local state updates
    setSyncedReceipts(prev => prev.filter(r => r.id !== receiptId));
    try {
      const currentSynced = secureStorage.getItem<any[]>('pos_synced_receipts') || [];
      const updatedSynced = currentSynced.filter(r => r.id !== receiptId);
      secureStorage.setItem('pos_synced_receipts', updatedSynced);
    } catch (err) {
      console.error("Failed to update secureStorage for voided receipt:", err);
    }

    // 2. Local SQLite removal
    try {
      await deleteReceiptFromOffline(receiptId);
    } catch (err) {
      console.error("Failed to delete receipt from SQLite:", err);
    }

    // 3. Dispatch global delete command to Firestore sync engine
    addToQueue({
      type: 'delete-receipt',
      payload: { receiptId }
    }, `Voided receipt ${receiptId}`);

    toast({
      title: "Receipt Voided",
      description: "The sale has been voided and will be removed globally.",
    });
  }, [addToQueue, toast]);



  const fetchReceiptsInRange = useCallback(async (from: Date, to: Date, limitCount: number = 5000) => {
    if (!businessId || !firestore) return [];
    
    let results: Receipt[] = [];
    
    const isOnline = isRealOnline;
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
        results = snap.docs.map(d => ({ ...d.data(), id: d.id } as Receipt));
        
        // Sync these to offline for future use
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          syncReceiptsToOffline(businessId, results);
        }
      } catch (err) {
        console.error("Fetch Receipts In Range online failed:", err);
      }
    }

    // Fallback 1: SQLite (Tauri)
    if (results.length === 0) {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          const cached = await getCachedReceipts(businessId, limitCount);
          if (cached && cached.length > 0) {
            const fromTime = from.getTime();
            const toTime = to.getTime();
            results = cached.filter(r => {
              const rt = safeToDate(r.createdAt).getTime();
              return rt >= fromTime && rt <= toTime;
            });
          }
        } catch (err) {
          console.error("Fetch Receipts In Range SQLite fallback failed:", err);
        }
      }
    }

    // Fallback 2: State / SecureStorage receipts (Web/PWA)
    if (results.length === 0) {
      const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
      if (targetReceipts && targetReceipts.length > 0) {
        const fromTime = from.getTime();
        const toTime = to.getTime();
        results = targetReceipts.filter(r => {
          const rt = safeToDate(r.createdAt).getTime();
          return rt >= fromTime && rt <= toTime;
        });
      }
    }

    // 🚨 Inject ALL Pending Offline Receipts into the results for realtime calculations!
    const fromTime = from.getTime();
    const toTime = to.getTime();
    const existingIds = new Set(results.map(r => r.id));

    queuedActions.filter(a => a.type === 'complete-sale' && a.status === 'pending').forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt && !existingIds.has(receipt.id)) {
        const rDate = safeToDate(receipt.createdAt || new Date(action.timestamp));
        const rTime = rDate.getTime();
        if (rTime >= fromTime && rTime <= toTime) {
          results.push({ ...receipt, isOptimistic: true, createdAt: rDate });
          existingIds.add(receipt.id);
        }
      }
    });

    // Sort final outputs descendingly by Date
    return results.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
  }, [businessId, firestore, syncedReceipts, receipts, queuedActions, isRealOnline]);

  const currencyCode = business?.settings?.currency || 'NGN';

  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const fetchMonthlyAnalytics = useCallback(async (monthCount: number = 12) => {
    if (!businessId || !firestore) return [];
    
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    const isOnline = isRealOnline;
    let results: { month: string, revenue: number }[] = [];

    // 1. If Online, fetch precise aggregates from Firestore
    if (isOnline) {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();

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

        results = await Promise.all(monthPromises);
      } catch (err) {
        console.error("Firestore Aggregate Fetch Failed:", err);
      }
    }

    // 2. Fallback to SQLite (Last 12 months among synced receipts)
    if (results.length === 0 && isTauri) {
      try {
        const res = await getMonthlyRevenue(businessId, monthCount);
        if (res && res.length > 0) {
          results = res;
        }
      } catch (err) {
        console.error("SQLite Monthly Fetch Failed:", err);
      }
    }

    // 3. Fallback to synced receipts (volatile or cached)
    if (results.length === 0) {
      const targetReceipts = syncedReceipts.length > 0 ? syncedReceipts : (receipts || []);
      if (targetReceipts && targetReceipts.length > 0) {
        const monthly: Record<string, number> = {};
        targetReceipts.forEach(r => {
          const date = safeToDate(r.createdAt);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthly[key] = (monthly[key] || 0) + (r.total || 0);
        });
        results = Object.entries(monthly).map(([month, revenue]) => ({ month, revenue }));
      }
    }

    // 🚨 Inject ALL Pending Offline Revenue into corresponding month aggregates!
    queuedActions.filter(a => a.type === 'complete-sale' && a.status === 'pending').forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt) {
        const rDate = safeToDate(receipt.createdAt || new Date(action.timestamp));
        const key = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
        
        const existing = results.find(m => m.month === key);
        if (existing) {
          existing.revenue += (receipt.total || 0);
        } else {
          results.push({ month: key, revenue: receipt.total || 0 });
        }
      }
    });

    return results.sort((a,b) => b.month.localeCompare(a.month)).slice(0, monthCount);
  }, [businessId, firestore, syncedReceipts, receipts, queuedActions, isRealOnline]);


  const value: POSContextType = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile: profile, 
    isLoading: (isUserLoading && !offlineProfile) ||
               (!!user && !businessId) ||
               (isLoadingBusiness && !business) || 
               ((() => {
                 const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
                 if (isTauri) {
                   return syncedProducts.length === 0;
                 }
                 return ((isLoadingProducts || !canFetchSubData) && !!businessId && initialProducts === null && syncedProducts.length === 0 && isRealOnline) || 
                        (isLoadingCustomers && (!customers || customers.length === 0) && isRealOnline) || 
                        (isLoadingReceipts && (!receipts || receipts.length === 0) && isRealOnline) ||
                        (isFullSyncingCustomers && (!customers || customers.length === 0) && isRealOnline) ||
                        (isFullSyncingProducts && (!products || products.length === 0) && isRealOnline);
               })()) ||
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
    mutateBusiness, isSyncing, isFullSyncingCustomers, isFullSyncingProducts, isFullSyncingReceipts, optimisticProducts: [],

    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating,
    searchCustomers, searchCustomersByField, searchReceipts: async () => [],
    fetchReceiptsInRange, searchProducts, searchProductsByField, findProductBySku,
    fetchDetailedAnalytics, 
    fetchMonthlyAnalytics,
    fetchMoreReceipts: async () => 0, fetchMoreCustomers: async () => 0, fetchMoreProducts: async () => 0,

    heldSales, holdCurrentSale, resumeHeldSale, deleteHeldSale, voidReceipt,
    users, auditLogs,
    isOnline: isRealOnline,

    stats, 
    isSubscriptionActive: business ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && safeToDate(business.trialExpiresAt).getTime() > Date.now())) : true
  }), [business, products, receipts, customers, onlineOrders, currentUserProfile, isUserLoading, user, firestore, cart, selectedCustomer, taxRate, discount, paymentMethod, autoPrint, isConfettiActive, triggerRefresh, triggerConfetti, queuedActions, isQueueProcessing, addToQueue, processQueue, mutateBusiness, isSyncing, isFullSyncingCustomers, isFullSyncingProducts, isFullSyncingReceipts, impersonatedUserId, isImpersonating, stats, currencySymbol, currencyCode, subtotal, tax, total, impersonateUser, stopImpersonation, searchCustomers, searchProducts, fetchDetailedAnalytics, fetchMonthlyAnalytics, isProfileReady, isLoadingBusiness, isLoadingProducts, isLoadingCustomers, isMounted, heldSales, voidReceipt, users, auditLogs, isRealOnline]);

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
