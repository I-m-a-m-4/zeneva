
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Customer, Product, CartItem, BusinessInstance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface POSContextType {
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
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function useBusiness() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile } = useDoc(userDocRef);
    const businessDocRef = useMemoFirebase(() => (userProfile ? doc(firestore, 'businessInstances', (userProfile as any).businessId) : null), [userProfile, firestore]);
    const { data: business } = useDoc<BusinessInstance>(businessDocRef);
    return business;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
    'NGN': '₦',
    'USD': '$',
};

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const business = useBusiness();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const currencyCode = business?.settings?.currency || 'NGN';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₦';

  useEffect(() => {
    if (business) {
        setTaxRate(business.settings?.defaultTaxRate ?? 0);
    }
  }, [business]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            toast({
                title: 'Stock limit reached',
                description: `Cannot add more of ${product.name}.`,
                variant: 'destructive',
            });
            return;
        }
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            )
        );
    } else {
        if (product.stock <= 0) {
            toast({
                title: 'Out of stock',
                description: `${product.name} is out of stock.`,
                variant: 'destructive',
            });
            return;
        }
        setCart((prevCart) => [...prevCart, { product, quantity: 1 }]);
    }
};

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const itemInCart = cart.find((item) => item.product.id === productId);
    if (!itemInCart) return;

    if (quantity > itemInCart.product.stock) {
        toast({
            title: 'Stock limit reached',
            description: `Only ${itemInCart.product.stock} units of ${itemInCart.product.name} available.`,
            variant: 'destructive',
        });
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.product.id === productId ? { ...item, quantity: itemInCart.product.stock } : item
            )
        );
        return;
    }
    
    if (quantity <= 0) {
        removeFromCart(productId);
    } else {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    }
};
  
  const clearCart = () => setCart([]);

  const selectCustomer = (customer: Customer | null) => setSelectedCustomer(customer);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;

  const setTax = (rate: number) => setTaxRate(rate);
  const setDiscountAmount = (amount: number) => setDiscount(amount);
  const setPayment = (method: string) => setPaymentMethod(method);

  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setTaxRate(business?.settings?.defaultTaxRate ?? 0);
  }

  return (
    <POSContext.Provider
      value={{
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
        setTax,
        setDiscount: setDiscountAmount,
        paymentMethod,
        setPaymentMethod: setPayment,
        resetPOS,
        currencySymbol,
        currencyCode,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
