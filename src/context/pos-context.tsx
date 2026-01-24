
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Product, CartItem, BusinessInstance, Receipt, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';

interface POSContextType {
  // Business Data
  business: BusinessInstance | null;
  products: Product[] | null;
  receipts: Receipt[] | null;
  customers: Customer[] | null;
  currentUserProfile: UserProfile | null;
  isLoading: boolean;

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
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);


  // --- Centralized Data Fetching ---
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  // STALE DATA GUARD: Ensure the profile belongs to the current user before proceeding.
  const isProfileReady = user && currentUserProfile && !isProfileLoading && user.uid === currentUserProfile.id;
  
  const businessId = isProfileReady ? currentUserProfile.businessId : null;

  const businessDocRef = useMemoFirebase(() => (businessId ? doc(firestore, 'businessInstances', businessId) : null), [businessId, firestore, refreshKey]);
  const { data: business, isLoading: isLoadingBusiness } = useDoc<BusinessInstance>(businessDocRef);

  const productsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "products"), where("businessId", "==", businessId)) : null), [businessId, firestore, refreshKey]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const receiptsQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "receipts"), where("businessId", "==", businessId)) : null), [businessId, firestore, refreshKey]);
  const { data: receipts, isLoading: isLoadingReceipts } = useCollection<Receipt>(receiptsQuery);

  const customersQuery = useMemoFirebase(() => (businessId ? query(collection(firestore, "customers"), where("businessId", "==", businessId)) : null), [businessId, firestore, refreshKey]);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  
  const isLoading = isAuthLoading || isProfileLoading || isLoadingBusiness || isLoadingProducts || isLoadingReceipts || isLoadingCustomers;
  
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // --- POS State Management ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  useEffect(() => {
    if (business) {
        setTaxRate(business.settings?.defaultTaxRate ?? 0);
    }
  }, [business]);

  const CURRENCY_SYMBOLS: Record<string, string> = { 'NGN': '₦', 'USD': '$' };
  const currencyCode = business?.settings?.currency || 'NGN';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    if (existingItem) {
        if (existingItem.quantity >= (product.stock || 0)) {
            toast({ title: 'Stock limit reached', description: `Cannot add more of ${product.name}.`, variant: 'destructive' });
            return;
        }
        setCart(prev => prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
        if ((product.stock || 0) <= 0) {
            toast({ title: 'Out of stock', description: `${product.name} is out of stock.`, variant: 'destructive' });
            return;
        }
        setCart(prev => [...prev, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

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
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;
  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setTaxRate(business?.settings?.defaultTaxRate ?? 0);
  };

  const value = useMemo(() => ({
    business,
    products,
    receipts,
    customers,
    currentUserProfile: isProfileReady ? currentUserProfile : null,
    isLoading,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    selectedCustomer,
    selectCustomer,
    subtotal,
    tax,
    taxRate,
    discount,
    total,
    setTax: setTaxRate,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    resetPOS,
    currencySymbol,
    currencyCode,
    triggerRefresh,
  }), [business, products, receipts, customers, isProfileReady, currentUserProfile, isLoading, cart, selectedCustomer, subtotal, tax, taxRate, discount, total, paymentMethod, currencySymbol, currencyCode, triggerRefresh]);

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

// Simplified hook for just business settings, if needed elsewhere.
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
