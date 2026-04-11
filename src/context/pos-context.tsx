
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction, BusinessStats } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, orderBy, writeBatch, serverTimestamp, addDoc, runTransaction, updateDoc, limit, getDocs, or, increment, setDoc, and, startAfter, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';

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
  searchReceipts: (term: string) => Promise<Receipt[]>;
  searchProducts: (term: string) => Promise<Product[]>;
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
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  // --- UI State ---
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  // --- Impersonation State ---
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('zeneva_impersonated_user_id');
    }
    return null;
  });

  // Track the last user ID to prevent unnecessary POS resets
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const impersonateUser = useCallback((userId: string) => {
    setImpersonatedUserId(userId);
    sessionStorage.setItem('zeneva_impersonated_user_id', userId);
    toast({ title: 'Impersonating User', description: 'Switching view to user dashboard...' });
    // Force refresh to ensure new data is fetched
    setRefreshKey(prev => prev + 1);
  }, [toast]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    sessionStorage.removeItem('zeneva_impersonated_user_id');
    toast({ title: 'Impersonation Ended', description: 'Returning to your account.' });
    setRefreshKey(prev => prev + 1);
  }, [toast]);

  const isImpersonating = !!impersonatedUserId;
  // Effective User ID: Use impersonated ID if set, otherwise real user ID
  const effectiveUserId = impersonatedUserId || user?.uid;

  // --- Centralized Data Fetching ---
  // MODIFIED: Ensure we have an authenticated user before fetching, even if impersonating.
  const userDocRef = useMemoFirebase(() => (user && effectiveUserId && (!isUserLoading || isImpersonating) ? doc(firestore, 'users', effectiveUserId) : null), [user, effectiveUserId, isUserLoading, isImpersonating, firestore, refreshKey]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  // MODIFIED: isProfileReady should be true if we have a user and a profile, and the profile matches our EFFECTIVE user ID.
  const isProfileReady = !!(user && currentUserProfile && (currentUserProfile.id === user.uid || currentUserProfile.id === impersonatedUserId));

  const businessId = isProfileReady ? currentUserProfile.businessId : null;

  const businessDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId) : null), [businessId, firestore, refreshKey]);
  const { data: business, isLoading: isLoadingBusiness, mutate: mutateBusiness } = useDoc<BusinessInstance>(businessDocRef);

  const productsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "products"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: products, isLoading: isLoadingProducts, mutate: mutateProducts } = useCollection<Product>(productsQuery);

  const statsDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId, 'stats', 'overall') : null), [businessId, firestore, refreshKey]);
  const { data: stats, isLoading: isLoadingStats } = useDoc<BusinessStats>(statsDocRef);

  const receiptsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "receipts"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: receipts, isLoading: isLoadingReceipts, mutate: mutateReceipts } = useCollection<Receipt>(receiptsQuery);

  const customersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "customers"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(50)) : null), [businessId, firestore, refreshKey]);
  const { data: customers, isLoading: isLoadingCustomers, mutate: mutateCustomers } = useCollection<Customer>(customersQuery);

  const onlineOrdersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [businessId, firestore, refreshKey]);
  const { data: onlineOrders, isLoading: isLoadingOnlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);

  const isLoading = isUserLoading || (!!user && isProfileLoading) || isLoadingBusiness || isLoadingProducts || isLoadingReceipts || isLoadingCustomers || isLoadingOnlineOrders || isLoadingStats;

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const triggerConfetti = useCallback(() => {
    setIsConfettiActive(true);
  }, []);

  // --- Offline Queue State ---
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

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
            batch.set(newCustomerRef, { ...action.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            
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
          case 'update-product': {
            const productRef = doc(firestore, 'products', action.payload.productId);
            const cleanValues = Object.fromEntries(Object.entries(action.payload.values).filter(([_, v]) => v !== undefined));
            batch.update(productRef, { ...cleanValues, updatedAt: serverTimestamp() });
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
              batch.update(productRef, { ...action.payload.values, updatedAt: serverTimestamp() });
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

            if (receiptData.customer && business?.settings?.loyaltyProgramEnabled) {
              const customerRef = doc(firestore, 'customers', receiptData.customer.id);
              const pointsPerUnit = business.settings.pointsPerUnit || 0;
              const pointsEarned = Math.floor(receiptData.total * pointsPerUnit);
              batch.update(customerRef, { 
                loyaltyPoints: increment(pointsEarned),
                totalSpent: increment(receiptData.total),
                lastPurchaseDate: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
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

            // 3. Update Loyalty Points
            if (action.payload.receiptData.customer && business?.settings?.loyaltyProgramEnabled) {
              const pointsPerUnit = business.settings.pointsPerUnit || 0;
              const pointsEarned = Math.floor(action.payload.receiptData.total * pointsPerUnit);
              mutateCustomers((prev) => prev ? prev.map(c => c.id === action.payload.receiptData.customer.id ? { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + pointsEarned, updatedAt: new Date() as any } : c) : null);
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

    const newAction: QueuedAction = {
      ...action,
      description,
      id: uuidv4(),
      timestamp: Date.now(),
      status: 'pending',
    };
    const isOnline = navigator.onLine;
    toast({
      title: isOnline ? 'Saving...' : 'Action Queued',
      description: isOnline ? `Saving "${description}" in the background.` : `"${description}" will sync when you're online.`
    });
    setQueuedActions(prev => [...prev, newAction]);
    return newAction.id;
  }, [business, toast]);

  const updateQueuedAction = useCallback((id: string, updates: Partial<QueuedAction>) => {
    setQueuedActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueuedActions(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Action Cancelled', description: 'Removed item from queue.' });
  }, [toast]);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim() || !businessId || !firestore) return [];
    try {
      const lowerTerm = term.toLowerCase();
      const upperTerm = term.toUpperCase();

      // Search by name prefix
      const nameQuery = query(
        collection(firestore, 'customers'),
        where('businessId', '==', businessId),
        where('name', '>=', term),
        where('name', '<=', term + '\uf8ff'),
        limit(20)
      );

      // Search by code prefix
      const codeQuery = query(
        collection(firestore, 'customers'),
        where('businessId', '==', businessId),
        where('code', '>=', upperTerm),
        where('code', '<=', upperTerm + '\uf8ff'),
        limit(20)
      );

      // Search by email prefix
      const emailQuery = query(
        collection(firestore, 'customers'),
        where('businessId', '==', businessId),
        where('email', '>=', lowerTerm),
        where('email', '<=', lowerTerm + '\uf8ff'),
        limit(20)
      );

      const [nameSnap, codeSnap, emailSnap] = await Promise.all([
        getDocs(nameQuery),
        getDocs(codeQuery),
        getDocs(emailQuery)
      ]);

      const nameResults = nameSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const codeResults = codeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const emailResults = emailSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

      // Merge and remove duplicates
      const combined = [...nameResults, ...codeResults, ...emailResults];
      const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());

      return uniqueResults.slice(0, 20);
    } catch (e) {
      console.error("Error searching customers:", e);
      return [];
    }
  }, [businessId, firestore]);

  const searchReceipts = useCallback(async (term: string) => {
    if (!businessId || !term.trim() || !firestore) return [];
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
  }, [businessId, firestore]);

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
    if (!term.trim() || !businessId || !firestore) return [];
    try {
      const lowerTerm = term.trim().toLowerCase();
      const productsRef = collection(firestore, 'products');

      // Helper for prefix search (handles common casing issues)
      const qPrefix = (field: string, text: string) => query(
        productsRef,
        where('businessId', '==', businessId),
        where(field, '>=', text),
        where(field, '<=', text + '\uf8ff'),
        limit(20)
      );

      // We search for multiple permutations to overcome Firestore's case-sensitivity
      const capitalized = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
      const allUpper = term.toUpperCase();

      const [snapLower, snapNormal, snapCap, snapUpper] = await Promise.all([
        getDocs(qPrefix('lowercaseName', lowerTerm)),
        getDocs(qPrefix('name', term.trim())),
        getDocs(qPrefix('name', capitalized)),
        getDocs(qPrefix('name', allUpper))
      ]);

      const results: Product[] = [];
      const addFromSnap = (snap: any) => {
        snap.docs.forEach((doc: any) => {
          const data = { ...doc.data(), id: doc.id } as Product;
          if (!results.find(r => r.id === data.id)) results.push(data);
        });
      };

      addFromSnap(snapLower);
      addFromSnap(snapNormal);
      addFromSnap(snapCap);
      addFromSnap(snapUpper);

      return results.slice(0, 30);
    } catch (e) {
      console.error('Search products failed:', e);
      return [];
    }
  }, [businessId, firestore]);

  // Background Loader: Deeply fills the products cache after initial fast-load
  useEffect(() => {
    if (!businessId || !firestore || isLoadingProducts || !products || products.length === 0) return;
    
    let isMounted = true;
    
    const fetchRemainingRecursive = async (lastDoc: any = null) => {
      if (!isMounted) return;
      try {
        const q = query(
          collection(firestore, 'products'),
          where('businessId', '==', businessId),
          orderBy('name', 'asc'),
          ...(lastDoc ? [startAfter(lastDoc)] : []),
          limit(1000) 
        );
        const snap = await getDocs(q);
        if (snap.empty) return;
        
        const all = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        
        mutateProducts(prev => {
          const existingIds = new Set(prev?.map(p => p.id) || []);
          const uniqueNew = all.filter(p => !existingIds.has(p.id));
          return [...(prev || []), ...uniqueNew];
        });

        // If we got a full batch, there's likely more. Continue syncing.
        if (snap.docs.length === 1000) {
            // Wait 2 seconds between batches to avoid performance stalls
            setTimeout(() => fetchRemainingRecursive(snap.docs[snap.docs.length - 1]), 2000);
        }
      } catch (e) {
        console.error('Background product sync failed:', e);
      }
    };

    const timer = setTimeout(() => fetchRemainingRecursive(), 3000);
    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [businessId, firestore]); 

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
    try {
      const receiptsRef = collection(firestore, 'receipts');
      const q = query(
        receiptsRef,
        where('businessId', '==', businessId),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to)
      );
      
      const snap = await getAggregateFromServer(q, {
        revenue: sum('total'),
        count: count()
      });

      // For customers, we might need a separate query if they have a createdAt
      const customersRef = collection(firestore, 'customers');
      const cq = query(
        customersRef,
        where('businessId', '==', businessId),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to)
      );
      const cSnap = await getAggregateFromServer(cq, {
        count: count()
      });

      return {
        revenue: snap.data().revenue || 0,
        count: snap.data().count || 0,
        customers: cSnap.data().count || 0
      };
    } catch (e) {
      console.error('Detailed analytics failed:', e);
      return { revenue: 0, count: 0, customers: 0 };
    }
  }, [businessId, firestore]);

  const fetchMonthlyAnalytics = useCallback(async (monthsCount: number) => {
    if (!businessId || !firestore) return [];
    try {
      const results = [];
      const receiptsRef = collection(firestore, 'receipts');
      
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        
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
        
        results.push({
          month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          revenue: snap.data().revenue || 0,
          count: snap.data().count || 0
        });
      }
      return results;
    } catch (e) {
      console.error('Monthly analytics failed:', e);
      return [];
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

  // POS State
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
    if (typeof window === 'undefined') return business?.settings?.defaultTaxRate ?? 0;
    try {
      const savedTax = localStorage.getItem(POS_TAX_RATE_KEY);
      return savedTax ? parseFloat(savedTax) : (business?.settings?.defaultTaxRate ?? 0);
    } catch { return business?.settings?.defaultTaxRate ?? 0; }
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

  const resetPOS = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setTaxRate(business?.settings?.defaultTaxRate ?? 0);
    setPaymentMethod('Cash');
    try {
      localStorage.removeItem(POS_CART_KEY);
      localStorage.removeItem(POS_CUSTOMER_KEY);
      localStorage.removeItem(POS_DISCOUNT_KEY);
      localStorage.removeItem(POS_TAX_RATE_KEY);
      localStorage.removeItem(POS_PAYMENT_METHOD_KEY);
    } catch { }
  }, [business]);

  // Effect to reset POS state and CLEAR IMPERSONATION when user changes/logs out
  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        setImpersonatedUserId(null);
        sessionStorage.removeItem('zeneva_impersonated_user_id');
        resetPOS();
        setLastUserId(null);
      } else {
        // If user changed, reset POS
        if (lastUserId && user.uid !== lastUserId) {
          resetPOS();
        }
        setLastUserId(user.uid);
      }
    }
  }, [user, isUserLoading, resetPOS, setImpersonatedUserId, lastUserId]);

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

    setCart(prev => {
      const existingItem = prev.find(item => (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId);

      if (existingItem) {
        // Stock check logic - only for non-services
        const isService = product.categoryType === 'service';
        const totalQuantityInBaseUnit = (existingItem.quantity + 1) * (multiplier || 1);
        if (!isService && totalQuantityInBaseUnit > (product.stock || 0)) {
          toast({
            title: 'Backorder recorded',
            description: `${product.name} (${unitName || 'Base Unit'}) is now being recorded as a debt/backorder.`,
            variant: 'backorder' as any
          });
        }

        return prev.map(item =>
          (item.unit ? `${item.product.id}-${item.unit}` : item.product.id) === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        const finalProduct = priceOverride ? { ...product, price: priceOverride } : product;

        const isService = product.categoryType === 'service';
        if (!isService && (product.stock || 0) <= 0) {
          toast({
            title: 'Backorder started',
            description: `${product.name} is out of stock. Recording this as a debt.`,
            variant: 'backorder' as any
          });
        }

        return [...prev, { product: finalProduct, quantity: 1, unit: unitName, multiplier }];
      }
    });
  }, [toast]);

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


  const value = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile, isLoading, isUserLoading, user,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    selectedCustomer, selectCustomer,
    subtotal, tax, taxRate, discount, total, setTax: setTaxRate, setDiscount,
    paymentMethod, setPaymentMethod,
    autoPrint, setAutoPrint,
    resetPOS, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti, setIsConfettiActive,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions, updateQueuedAction, addProductWithImage, removeFromQueue,
    optimisticProducts: queuedActions
      .filter(a => a.type === 'add-product' && (a.status === 'pending' || a.status === 'processing'))
      .map(a => ({ ...a.payload, isOptimistic: true, status: 'pending', queueId: a.id })) as Product[],

    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating, searchCustomers, searchReceipts,
    searchProducts,
    findProductBySku,
    fetchDetailedAnalytics,
    fetchMonthlyAnalytics,
    fetchMoreReceipts, fetchMoreCustomers, fetchMoreProducts,
    stats,

    isSubscriptionActive: business
      ? (business.accessLevel === 'lifetime' || (business.trialExpiresAt && business.trialExpiresAt.toDate() > new Date()))
      : (isLoading ? true : false)
  }), [
    business, products, receipts, customers, onlineOrders, currentUserProfile, isLoading, isUserLoading, user,
    cart, selectedCustomer, subtotal, tax, taxRate, discount, total, paymentMethod, autoPrint, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions, updateQueuedAction, addProductWithImage, removeFromQueue,
    addToCart, removeFromCart, updateQuantity, clearCart, selectCustomer, setDiscount, setPaymentMethod, setAutoPrint, resetPOS,
    impersonatedUserId, impersonateUser, stopImpersonation, isImpersonating, searchCustomers, searchReceipts, fetchMoreReceipts, fetchMoreCustomers, stats
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


