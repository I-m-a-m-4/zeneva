'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import type { Product } from '@/types';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';

interface ProductContextType {
  products: Product[] | null;
  isLoading: boolean;
  error: any;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

function useCurrentBusinessId() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userDocRef);

    return userProfile?.businessId;
}

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const businessId = useCurrentBusinessId();
  const firestore = useFirestore();

  // This is the single source of truth for product data.
  // It fetches ALL products for the business once.
  const productsQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return query(collection(firestore, "products"), where("businessId", "==", businessId));
  }, [businessId, firestore]);

  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

  const contextValue = useMemo(() => ({
    products,
    isLoading,
    error,
  }), [products, isLoading, error]);

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
