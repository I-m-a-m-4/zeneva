'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction, BusinessStats } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, orderBy, writeBatch, serverTimestamp, limit, getDocs, increment, getAggregateFromServer, sum, count, startAfter } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';
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
  CURRENCY_SYMBOLS
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
  isSyncingCustomers: boolean;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);
  const [extraStats, setExtraStats] = useState({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0 });

  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [syncedProducts, setSyncedProducts] = useState<Product[]>([]);
  const [syncedCustomers, setSyncedCustomers] = useState<Customer[]>([]);
  const [syncedReceipts, setSyncedReceipts] = useState<Receipt[]>([]);
  const [offlineBusiness, setOfflineBusiness] = useState<BusinessInstance | null>(null);
  const [offlineStats, setOfflineStats] = useState<BusinessStats | null>(null);

  // --- POS Local States ---
  const [cart, setCart] = useState<CartItem[]>(() => { try { const s = typeof window !== 'undefined' ? localStorage.getItem(POS_CART_KEY) : null; return s ? JSON.parse(s) : []; } catch { return []; } });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => { try { const s = typeof window !== 'undefined' ? localStorage.getItem(POS_CUSTOMER_KEY) : null; return s ? JSON.parse(s) : null; } catch { return null; } });
  const [taxRate, setTaxRate] = useState<number>(() => { try { const s = typeof window !== 'undefined' ? localStorage.getItem(POS_TAX_RATE_KEY) : null; return s ? parseFloat(s) : 0; } catch { return 0; } });
  const [discount, setDiscount] = useState<number>(() => { try { const s = typeof window !== 'undefined' ? localStorage.getItem(POS_DISCOUNT_KEY) : null; return s ? parseFloat(s) : 0; } catch { return 0; } });
  const [paymentMethod, setPaymentMethod] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem(POS_PAYMENT_METHOD_KEY) : 'Cash') || 'Cash');
  const [autoPrint, setAutoPrint] = useState<boolean>(() => { try { const s = typeof window !== 'undefined' ? localStorage.getItem(POS_AUTO_PRINT_KEY) : null; return s === null ? true : s === 'true'; } catch { return true; } });
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [isSubscriptionActiveFromRust, setIsSubscriptionActiveFromRust] = useState(true);

  // --- Firebase Queries ---
  const userDocRef = useMemoFirebase(() => (user && effectiveUserId && (!isUserLoading || isImpersonating) ? doc(firestore, 'users', effectiveUserId) : null), [user, effectiveUserId, isUserLoading, isImpersonating, firestore, refreshKey]);
  const { data: currentUserProfile } = useDoc<UserProfile>(userDocRef);
  const isProfileReady = !!(user && currentUserProfile && (currentUserProfile.id === user.uid || currentUserProfile.id === impersonatedUserId));
  const businessId = isProfileReady ? currentUserProfile.businessId : null;

  const businessDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId) : null), [businessId, firestore, refreshKey]);
  const { data: initialBusiness, isLoading: isLoadingBusiness, mutate: mutateBusiness } = useDoc<BusinessInstance>(businessDocRef);

  const canFetchSubData = isProfileReady && !!businessId && !!initialBusiness;

  const productsQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "products"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [canFetchSubData, businessId, firestore, refreshKey]);
  const { data: initialProducts, isLoading: isLoadingProducts, mutate: mutateProducts } = useCollection<Product>(productsQuery);

  const statsDocRef = useMemoFirebase(() => (canFetchSubData ? doc(firestore, 'businessInstances', businessId, 'stats', 'overall') : null), [canFetchSubData, businessId, firestore, refreshKey]);
  const { data: initialStats } = useDoc<BusinessStats>(statsDocRef);

  const receiptsQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "receipts"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [canFetchSubData, businessId, firestore, refreshKey]);
  const { data: initialReceipts, mutate: mutateReceipts } = useCollection<Receipt>(receiptsQuery);

  const customersQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, "customers"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [canFetchSubData, businessId, firestore, refreshKey]);
  const { data: initialCustomers, mutate: mutateCustomers } = useCollection<Customer>(customersQuery);

  const onlineOrdersQuery = useMemoFirebase(() => (canFetchSubData ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [canFetchSubData, businessId, firestore, refreshKey]);
  const { data: onlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);

  // --- Derived Sync States ---
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

  const products = useMemo(() => {
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
    return merged;
  }, [initialProducts, syncedProducts, queuedActions]);

  const receipts = useMemo(() => {
    let merged = [...(initialReceipts || [])];
    const existingIds = new Set(merged.map(r => r.id));
    syncedReceipts.forEach(r => { if (!existingIds.has(r.id)) merged.push(r); });
    const queuedSales = queuedActions.filter(a => a.type === 'complete-sale');
    queuedSales.forEach(action => {
      const receipt = action.payload.receiptData;
      if (receipt && !existingIds.has(receipt.id)) merged.push({ ...receipt, isOptimistic: true, createdAt: receipt.createdAt || new Date(action.timestamp) });
    });
    return merged.sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
  }, [initialReceipts, syncedReceipts, queuedActions]);

  const customers = useMemo(() => {
    let merged = [...(syncedCustomers.length > (initialCustomers?.length || 0) ? syncedCustomers : (initialCustomers || []))];
    const deletedIds = new Set(queuedActions.filter(a => a.type === 'delete-customer').map(a => a.payload.id));
    merged = merged.filter(c => !deletedIds.has(c.id));
    queuedActions.forEach(action => {
      if (action.type === 'update-customer') { const idx = merged.findIndex(c => c.id === action.payload.id); if (idx !== -1) merged[idx] = { ...merged[idx], ...action.payload.values }; }
      else if (action.type === 'add-customer') { if (!merged.find(c => c.id === action.payload.id)) merged.push({ ...action.payload, isOptimistic: true }); }
    });
    return merged;
  }, [initialCustomers, syncedCustomers, queuedActions]);

  const stats = useMemo(() => initialStats || offlineStats, [initialStats, offlineStats]);

  // --- Functions ---
  const triggerRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);
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
    toast({ title: "Syncing...", description: `Processing ${pending.length} actions.` });
    
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
          case 'add-product': batch.set(doc(firestore, 'products', action.payload.id), { ...action.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalProducts: increment(1) }, { merge: true }); break;
          case 'complete-sale':
            const rRef = doc(firestore, 'receipts', action.payload.receiptData.id);
            batch.set(rRef, { ...action.payload.receiptData, createdAt: serverTimestamp() });
            action.payload.productUpdates.forEach((u:any) => batch.update(doc(firestore, 'products', u.id), { stock: u.newStock, updatedAt: serverTimestamp() }));
            batch.set(doc(firestore, 'businessInstances', businessId, 'stats', 'overall'), { totalSales: increment(1), totalRevenue: increment(action.payload.receiptData.total) }, { merge: true });
            resultData.newReceiptId = rRef.id; break;
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

      // Mark as synced first
      const nextActions = prev.map(a => 
        successfulIds.has(a.id) ? { ...a, status: 'synced' as any } : a
      );

      // Actually clear them after 2 seconds
      if (successfulIds.size > 0) {
        setTimeout(() => {
          setQueuedActions(current => current.filter(a => !successfulIds.has(a.id)));
        }, 2000);
      }

      return nextActions;
    });
    setIsQueueProcessing(false);
  }, [isQueueProcessing, queuedActions, firestore, businessId, currentUserProfile, toast]);

  const addToQueue = useCallback((action: any, description: string) => {
    const isSubscriptionActive = business ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && safeToDate(business.trialExpiresAt).getTime() > Date.now())) : true;
    if (!isSubscriptionActive) { toast({ variant: 'destructive', title: 'Action Blocked', description: 'Your subscription has expired.' }); return null; }
    
    const id = uuidv4();
    const newAction: QueuedAction = { ...action, description, id, timestamp: Date.now(), status: 'pending' };
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && businessId) saveActionToOfflineQueue(newAction).catch(console.error);
    setQueuedActions(prev => [...prev, newAction]);
    return id;
  }, [businessId, business, toast]);

  const resetPOS = useCallback(async () => {
    setCart([]); setSelectedCustomer(null); setDiscount(0); setTaxRate(0); setPaymentMethod('Cash');
    if (typeof window !== 'undefined') { localStorage.removeItem(POS_CART_KEY); localStorage.removeItem(POS_CUSTOMER_KEY); }
  }, []);

  const nuclearReset = useCallback(async () => {
    await resetPOS(); setQueuedActions([]); setSyncedProducts([]); setSyncedCustomers([]); setSyncedReceipts([]);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) import('@/lib/sqlite-sync').then(m => m.clearAllTables());
  }, [resetPOS]);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    if (customers && customers.length > 0) {
      const local = customers.filter(c => c.name.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower) || c.phone?.includes(term));
      if (local.length >= 10 || !isSyncingCustomers) return local.slice(0, 20);
    }
    if (!businessId || !firestore) return [];
    try {
      const q = (field: string) => query(collection(firestore, 'customers'), where('businessId', '==', businessId), where(field, '>=', lower), where(field, '<=', lower + '\uf8ff'), limit(20));
      const [nameSnap, emailSnap] = await Promise.all([getDocs(q('lowercaseName')), getDocs(q('lowercaseEmail'))]);
      const combined = [...nameSnap.docs, ...emailSnap.docs].map(d => ({ ...d.data() as any, id: d.id } as Customer));
      return Array.from(new Map(combined.map(item => [item.id, item])).values()).slice(0, 20);
    } catch { return []; }
  }, [businessId, firestore, customers, isSyncingCustomers]);

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const lower = term.toLowerCase().trim();
    if (products && products.length > 0) {
      const local = products.filter(p => p.name.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower));
      if (local.length >= 10 || !isSyncing) return local.slice(0, 30);
    }
    if (!businessId || !firestore) return [];
    try {
      const q = query(collection(firestore, 'products'), where('businessId', '==', businessId), where('lowercaseName', '>=', lower), where('lowercaseName', '<=', lower + '\uf8ff'), limit(30));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    } catch { return []; }
  }, [businessId, firestore, products, isSyncing]);

  const fetchDetailedAnalytics = useCallback(async (from: Date, to: Date) => {
    if (!businessId || !firestore) return { revenue: 0, count: 0, customers: 0 };
    if (receipts && receipts.length > 0) {
      const filtered = receipts.filter(r => { const rd = safeToDate(r.createdAt); return rd >= from && rd <= to; });
      return { revenue: filtered.reduce((sum, r) => sum + r.total, 0), count: filtered.length, customers: new Set(filtered.map(r => r.customer?.id).filter(Boolean)).size };
    }
    return { revenue: 0, count: 0, customers: 0 };
  }, [businessId, firestore, receipts]);

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
      return [...prev, { product: finalProduct, quantity: 1, unit: unitName, multiplier }];
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
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem(POS_CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem(POS_CUSTOMER_KEY, JSON.stringify(selectedCustomer)); }, [selectedCustomer]);
  
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (isTauri && isMounted) {
      getOfflineQueue().then(queue => {
        if (queue.length > 0) {
          setQueuedActions(prev => [...prev, ...queue.filter(a => !prev.find(p => p.id === a.id))]);
          if (navigator.onLine) processQueue();
        }
      });
    }
  }, [isMounted, processQueue]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { if (lastUserId) nuclearReset(); setLastUserId(null); return; }
    if (effectiveUserId !== lastUserId) { if (lastUserId) resetPOS(); setLastUserId(effectiveUserId); }
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

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
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
    toast({ title: 'Impersonation Stopped', description: 'Returning to your profile.' });
    nuclearReset();
    triggerRefresh();
  }, [toast, nuclearReset, triggerRefresh]);

  const currencyCode = business?.settings?.currency || 'NGN';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const value: POSContextType = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile, isLoading: isUserLoading || (!!user && !isProfileReady), isUserLoading, user, firestore,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    selectedCustomer, selectCustomer: setSelectedCustomer,
    subtotal, tax, taxRate, discount, total, setTax: setTaxRate, setDiscount,
    paymentMethod, setPaymentMethod, autoPrint, setAutoPrint, resetPOS, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti, setIsConfettiActive,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions: () => {}, updateQueuedAction: () => {}, addProductWithImage: async () => {}, removeFromQueue: () => {},
    mutateBusiness, isSyncing, isSyncingCustomers, optimisticProducts: [],
    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating,
    searchCustomers, searchCustomersByField: async () => [], searchReceipts: async () => [],
    fetchReceiptsInRange: async () => [], searchProducts, searchProductsByField: async () => [],
    fetchDetailedAnalytics, 
    fetchMonthlyAnalytics: useCallback(async (monthCount: number = 12) => {
      if (!businessId) return [];
      
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          const res = await getMonthlyRevenue(businessId, monthCount);
          if (res && res.length > 0) return res;
        } catch (err) {
          console.error("SQLite Monthly Fetch Failed:", err);
        }
      }

      // Fallback to receipts in state if Firestore is not available/slow
      if (receipts && receipts.length > 0) {
        const monthly: Record<string, number> = {};
        receipts.forEach(r => {
          const date = safeToDate(r.createdAt);
          const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
          monthly[key] = (monthly[key] || 0) + (r.total || 0);
        });
        return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue })).sort((a,b) => b.month.localeCompare(a.month)).slice(0, monthCount);
      }
      
      return [];
    }, [businessId, receipts]),
    fetchMoreReceipts: async () => 0, fetchMoreCustomers: async () => 0, fetchMoreProducts: async () => 0,
    stats, isSubscriptionActive: true
  }), [business, products, receipts, customers, onlineOrders, currentUserProfile, isUserLoading, user, firestore, cart, selectedCustomer, taxRate, discount, paymentMethod, autoPrint, isConfettiActive, triggerRefresh, triggerConfetti, queuedActions, isQueueProcessing, addToQueue, processQueue, mutateBusiness, isSyncing, isSyncingCustomers, impersonatedUserId, isImpersonating, stats, currencySymbol, currencyCode, subtotal, tax, total, impersonateUser, stopImpersonation, searchCustomers, searchProducts, fetchDetailedAnalytics, isProfileReady]);

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
