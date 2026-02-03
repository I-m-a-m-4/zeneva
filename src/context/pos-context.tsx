

'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile, OnlineOrder, QueuedAction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, orderBy, writeBatch, serverTimestamp, addDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/audit';

// Define localStorage keys
const POS_CART_KEY = 'zeneva-pos-cart';
const POS_CUSTOMER_KEY = 'zeneva-pos-customer';
const POS_TAX_RATE_KEY = 'zeneva-pos-tax-rate';
const POS_DISCOUNT_KEY = 'zeneva-pos-discount';
const POS_PAYMENT_METHOD_KEY = 'zeneva-pos-payment-method';
const QUEUED_ACTIONS_KEY = 'zeneva-queued-actions';

interface POSContextType {
  // Business Data
  business: BusinessInstance | null;
  products: Product[] | null;
  receipts: Receipt[] | null;
  customers: Customer[] | null;
  onlineOrders: OnlineOrder[] | null;
  currentUserProfile: UserProfile | null;
  users: UserProfile[] | null;
  isLoading: boolean;
  isUserLoading: boolean; 
  user: any; 

  // POS State
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  // --- UI State ---
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  // --- Centralized Data Fetching ---
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore, refreshKey]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isProfileReady = !!(user && currentUserProfile && user.uid === currentUserProfile.id);
  
  const businessId = isProfileReady ? currentUserProfile.businessId : null;

  const businessDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId) : null), [businessId, firestore, refreshKey]);
  const { data: business, isLoading: isLoadingBusiness } = useDoc<BusinessInstance>(businessDocRef);

  const productsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "products"), where("businessId", "==", businessId)) : null), [businessId, firestore, refreshKey]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const receiptsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "receipts"), where("businessId", "==", businessId), orderBy("createdAt", "desc")) : null), [businessId, firestore, refreshKey]);
  const { data: receipts, isLoading: isLoadingReceipts } = useCollection<Receipt>(receiptsQuery);

  const customersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "customers"), where("businessId", "==", businessId)) : null), [businessId, firestore, refreshKey]);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const onlineOrdersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, 'businessInstances', businessId, 'onlineOrders')) : null), [businessId, firestore, refreshKey]);
  const { data: onlineOrders, isLoading: isLoadingOnlineOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);
  
  const isAdmin = currentUserProfile?.role === 'admin';
  const usersQuery = useMemoFirebase(() => (businessId && isAdmin ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null), [businessId, isAdmin, firestore, refreshKey]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const isLoading = isUserLoading || (!!user && isProfileLoading) || isLoadingBusiness || isLoadingProducts || isLoadingReceipts || isLoadingCustomers || isLoadingOnlineOrders || (isAdmin && isLoadingUsers);
  
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
            switch (action.type) {
                case 'add-customer': {
                    const customersRef = collection(firestore, 'customers');
                    const newCustomerRef = doc(customersRef);
                    batch.set(newCustomerRef, { ...action.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                    await logAuditEvent(firestore, businessId, currentUserProfile, {
                      action: 'customer.create',
                      entity: { type: 'Customer', id: newCustomerRef.id, name: action.payload.name },
                      details: { source: 'offline-queue' }
                    });
                    break;
                }
                case 'update-product': {
                    const productRef = doc(firestore, 'products', action.payload.productId);
                    batch.update(productRef, { ...action.payload.values, updatedAt: serverTimestamp() });
                    await logAuditEvent(firestore, businessId, currentUserProfile, {
                      action: 'product.update',
                      entity: { type: 'Product', id: action.payload.productId },
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
                      entity: { type: 'Product', id: 'multiple' },
                      details: { count: action.payload.productIds.length, changes: Object.keys(action.payload.values), source: 'offline-queue-bulk' }
                    });
                    break;
                }
                case 'complete-sale': {
                    const { receiptData, productUpdates } = action.payload;
                    const newReceiptRef = doc(collection(firestore, 'receipts'));
                    batch.set(newReceiptRef, { ...receiptData, createdAt: serverTimestamp() });

                    productUpdates.forEach((update: {id: string, newStock: number}) => {
                        const productRef = doc(firestore, 'products', update.id);
                        batch.update(productRef, { stock: update.newStock, updatedAt: serverTimestamp() });
                    });
                    
                    if (receiptData.customer && business?.settings?.loyaltyProgramEnabled) {
                        const customerRef = doc(firestore, 'customers', receiptData.customer.id);
                        const pointsPerUnit = business.settings.pointsPerUnit || 0;
                        const pointsEarned = Math.floor(receiptData.total * pointsPerUnit);
                        const customer = customers?.find(c => c.id === receiptData.customer.id);
                        const currentPoints = customer?.loyaltyPoints || 0;
                        batch.update(customerRef, { loyaltyPoints: currentPoints + pointsEarned, updatedAt: serverTimestamp() });
                    }
                    await logAuditEvent(firestore, businessId, currentUserProfile, {
                      action: 'sale.create',
                      entity: { type: 'Receipt', id: newReceiptRef.id },
                      details: { total: receiptData.total, source: 'offline-queue' }
                    });
                    break;
                }
            }
            await batch.commit();
            return { id: action.id, status: 'fulfilled' };
        } catch (error: any) {
            console.error(`Failed to process action ${action.id}:`, error);
            return { id: action.id, status: 'rejected', reason: error.message || 'An unknown error occurred.' };
        }
    }));
    
    setQueuedActions(prev => {
        const newQueue = [...prev];
        const successfulIds = new Set();
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                successfulIds.add(result.value.id);
            } else if (result.status === 'rejected') {
                const index = newQueue.findIndex(a => a.id === result.reason.id);
                if (index > -1) {
                    newQueue[index].status = 'failed';
                    newQueue[index].errorMessage = result.reason.reason;
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
    triggerRefresh();

  }, [isQueueProcessing, queuedActions, firestore, businessId, currentUserProfile, toast, business, customers, triggerRefresh]);
  
  const clearFailedActions = useCallback(() => {
      setQueuedActions(prev => prev.filter(a => a.status !== 'failed'));
      toast({ title: 'Cleared Failed Actions', description: 'Removed failed items from the queue.' });
  }, []);

  const addToQueue = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'description'>, description: string) => {
    const newAction: QueuedAction = {
      ...action,
      description,
      id: uuidv4(),
      timestamp: Date.now(),
      status: 'pending',
    };
    setQueuedActions(prev => [...prev, newAction]);
    toast({ title: 'Action Queued', description: `"${description}" will sync when you're online.` });
    if(navigator.onLine) {
        setTimeout(processQueue, 500); 
    }
  }, [processQueue, toast]);

  useEffect(() => {
    const goOnline = () => processQueue();
    window.addEventListener('online', goOnline);
    return () => window.removeEventListener('online', goOnline);
  }, [processQueue]);

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

  useEffect(() => { try { localStorage.setItem(POS_CART_KEY, JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { try { localStorage.setItem(POS_CUSTOMER_KEY, JSON.stringify(selectedCustomer)); } catch {} }, [selectedCustomer]);
  useEffect(() => { try { localStorage.setItem(POS_TAX_RATE_KEY, String(taxRate)); } catch {} }, [taxRate]);
  useEffect(() => { try { localStorage.setItem(POS_DISCOUNT_KEY, String(discount)); } catch {} }, [discount]);
  useEffect(() => { try { localStorage.setItem(POS_PAYMENT_METHOD_KEY, paymentMethod); } catch {} }, [paymentMethod]);

  useEffect(() => {
    if (business && localStorage.getItem(POS_TAX_RATE_KEY) === null) {
        setTaxRate(business.settings?.defaultTaxRate ?? 0);
    }
  }, [business]);

  const CURRENCY_SYMBOLS: Record<string, string> = { 'NGN': '₦', 'USD': '$' };
  const currencyCode = business?.settings?.currency || 'NGN';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= (product.stock || 0)) {
        toast({ title: 'Stock limit reached', description: `Cannot add more of ${product.name}.`, variant: 'warning' });
        return;
      }
      setCart(prevCart => prevCart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if ((product.stock || 0) <= 0) {
        toast({ title: 'Out of stock', description: `${product.name} is out of stock.`, variant: 'destructive' });
        return;
      }
      setCart(prevCart => [...prevCart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  
  const updateQuantity = (productId: string, quantity: number) => {
    const itemInCart = cart.find(item => item.product.id === productId);
    if (!itemInCart) return;

    if (quantity > (itemInCart.product.stock || 0)) {
      toast({ title: 'Stock limit reached', description: `Only ${itemInCart.product.stock} units of ${itemInCart.product.name} available.`, variant: 'destructive' });
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: itemInCart.product.stock || 0 } : item));
      return;
    }
    
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
    }
  };
  
  const clearCart = () => setCart([]);
  const selectCustomer = (customer: Customer | null) => setSelectedCustomer(customer);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
  const tax = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax - discount, [subtotal, tax, discount]);

  const resetPOS = () => {
    clearCart();
    selectCustomer(null);
    setDiscount(0);
    setTaxRate(business?.settings?.defaultTaxRate ?? 0);
    setPaymentMethod('Cash');
    try {
        localStorage.removeItem(POS_CART_KEY);
        localStorage.removeItem(POS_CUSTOMER_KEY);
        localStorage.removeItem(POS_DISCOUNT_KEY);
        localStorage.removeItem(POS_TAX_RATE_KEY);
        localStorage.removeItem(POS_PAYMENT_METHOD_KEY);
    } catch {}
  };

  const value = useMemo(() => ({
    business, products, receipts, customers, onlineOrders, currentUserProfile, users, isLoading, isUserLoading, user,
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    selectedCustomer, selectCustomer,
    subtotal, tax, taxRate, discount, total, setTax: setTaxRate, setDiscount,
    paymentMethod, setPaymentMethod,
    resetPOS, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti, setIsConfettiActive,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions,
  }), [
    business, products, receipts, customers, onlineOrders, currentUserProfile, users, isLoading, isUserLoading, user,
    cart, selectedCustomer, subtotal, tax, taxRate, discount, total, paymentMethod, currencySymbol, currencyCode, triggerRefresh,
    isConfettiActive, triggerConfetti,
    queuedActions, isQueueProcessing, addToQueue, processQueue, clearFailedActions,
    addToCart, removeFromCart, updateQuantity, clearCart, selectCustomer, setDiscount, setPaymentMethod, resetPOS
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
