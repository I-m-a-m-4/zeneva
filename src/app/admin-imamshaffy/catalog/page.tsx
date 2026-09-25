'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, orderBy, limit, getDocs, startAfter, where } from 'firebase/firestore';
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Loader, Tag, Package, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types';

const PAGE_SIZE = 50;

export default function CatalogPage() {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const firestore = useFirestore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [lastVisibleDocs, setLastVisibleDocs] = useState<any[]>([]); // Stack of last docs for going back
  const [currentLastDoc, setCurrentLastDoc] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async (isNextPage: boolean = false, isPrevPage: boolean = false) => {
    if (!firestore) return;
    setIsLoading(true);
    setError(null);

    try {
      let q = query(
        collectionGroup(firestore, 'products'),
        orderBy('createdAt', 'desc')
      );

      // Simple prefix search using lowercaseName if search query exists
      if (searchQuery.trim() !== '') {
        const term = searchQuery.toLowerCase().trim();
        q = query(
          collectionGroup(firestore, 'products'),
          orderBy('lowercaseName'),
          where('lowercaseName', '>=', term),
          where('lowercaseName', '<=', term + '\uf8ff')
        );
      }

      if (isNextPage && currentLastDoc) {
        q = query(q, startAfter(currentLastDoc), limit(PAGE_SIZE));
      } else if (isPrevPage && pageIndex > 1) {
        // Go back two steps in the stack to get the starting document of the previous page
        const prevLastDoc = lastVisibleDocs[pageIndex - 2];
        q = query(q, startAfter(prevLastDoc), limit(PAGE_SIZE));
      } else {
        q = query(q, limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];
      
      snapshot.forEach(doc => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
      });

      setProducts(fetchedProducts);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (isNextPage) {
          setLastVisibleDocs(prev => [...prev, currentLastDoc]);
          setPageIndex(prev => prev + 1);
        } else if (isPrevPage) {
          setLastVisibleDocs(prev => prev.slice(0, -1));
          setPageIndex(prev => prev - 1);
        } else {
          setLastVisibleDocs([]);
          setPageIndex(0);
        }
        setCurrentLastDoc(lastDoc);
      } else if (!isNextPage && !isPrevPage) {
         setCurrentLastDoc(null);
         setLastVisibleDocs([]);
         setPageIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch catalog:', err);
      // Fallback message if collectionGroup index is missing
      if (err.message?.includes('index')) {
        setError('A Firestore index is currently building. Please try again in a few minutes. If it persists, click the link in the console to create it.');
      } else {
        setError(err.message || 'Failed to load catalog');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, firestore]);

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 shrink-0">
        <div>
          <h2 className={cn(
            "text-2xl font-black tracking-tight flex items-center gap-2",
            isDarkMode ? 'text-white' : 'text-slate-900'
          )}>
            <ShoppingBag className="w-6 h-6 text-primary" />
            Global Catalog
          </h2>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          )}>
            Browse and search all products and categories across the platform.
          </p>
        </div>
        
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full rounded-xl bg-background"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className={cn(
        "flex-1 rounded-2xl border flex flex-col overflow-hidden",
        isDarkMode ? 'bg-[#0a0f1d]/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-sm text-left">
            <thead className={cn(
              "text-xs uppercase sticky top-0 z-10 font-bold backdrop-blur-md",
              isDarkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-50/90 text-slate-500'
            )}>
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 rounded-tr-2xl">Business ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Package className="w-10 h-10 text-muted-foreground opacity-20" />
                      <span className="text-muted-foreground">No products found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={`${product.businessId}-${product.id}`} className={cn(
                    "transition-colors",
                    isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                  )}>
                    <td className="px-6 py-4 font-medium">
                      {product.name}
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <Badge variant="outline" className="font-medium bg-background">
                          <Tag className="w-3 h-3 mr-1 opacity-50" />
                          {product.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-primary">
                        <DollarSign className="w-3.5 h-3.5 opacity-70" />
                        {(product.price || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-semibold",
                        (product.stock || 0) <= (product.lowStockThreshold || 0) 
                          ? 'text-red-500' 
                          : 'text-emerald-500'
                      )}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {product.businessId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex items-center justify-between shrink-0",
          isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'
        )}>
          <span className="text-xs text-muted-foreground font-medium">
            Showing Page {pageIndex + 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex === 0 || isLoading}
              onClick={() => fetchProducts(false, true)}
              className="h-8 bg-background"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore || isLoading}
              onClick={() => fetchProducts(true, false)}
              className="h-8 bg-background"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
