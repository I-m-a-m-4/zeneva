'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, orderBy, limit, getDocs, startAfter, where } from 'firebase/firestore';
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Loader, Tag, Package, DollarSign, Boxes, TrendingUp, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Product } from '@/types';

const PAGE_SIZE = 50;

export default function CatalogPage() {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const firestore = useFirestore();

  const [products, setProducts] = useState<Product[]>([]);
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [lastVisibleDocs, setLastVisibleDocs] = useState<any[]>([]);
  const [currentLastDoc, setCurrentLastDoc] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Global Catalog Metrics across all businesses
  useEffect(() => {
    if (!firestore) return;

    const fetchGlobalMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const q = query(
          collectionGroup(firestore, 'products'),
          limit(2500)
        );
        const snapshot = await getDocs(q);
        const items: Product[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setAllCatalogProducts(items);
      } catch (err: any) {
        console.error('Error calculating catalog metrics:', err);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchGlobalMetrics();
  }, [firestore]);

  // Compute Valuation Metrics
  const catalogMetrics = useMemo(() => {
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let totalStockUnits = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const categoryMap = new Map<string, number>();

    allCatalogProducts.forEach((p) => {
      const stock = Math.max(0, Number(p.stock) || 0);
      const price = Math.max(0, Number(p.price) || 0);
      const cost = Math.max(0, Number(p.costPrice) || 0);

      totalStockUnits += stock;
      totalRetailValue += price * stock;
      totalCostValue += cost * stock;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= (p.lowStockThreshold || 5)) {
        lowStockCount++;
      }

      const cat = p.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (price * stock));
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalRetailValue,
      totalCostValue,
      totalStockUnits,
      uniqueSkus: allCatalogProducts.length,
      outOfStockCount,
      lowStockCount,
      topCategories,
    };
  }, [allCatalogProducts]);

  // 2. Fetch Paginated Products
  const fetchProducts = async (isNextPage: boolean = false, isPrevPage: boolean = false) => {
    if (!firestore) return;
    setIsLoading(true);
    setError(null);

    try {
      let q = query(
        collectionGroup(firestore, 'products'),
        orderBy('createdAt', 'desc')
      );

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
            Global Platform Catalog
          </h2>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          )}>
            Platform-wide product catalog valuation, stock quantities, and tenant inventory directory.
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

      {/* ======================== PLATFORM CATALOG METRICS CARDS ======================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Retail Valuation Card */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Catalog Retail Valuation</span>
              <DollarSign className="h-4 w-4 text-primary opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              {isLoadingMetrics ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${catalogMetrics.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total potential value (Price × Stock) across all businesses
            </p>
          </CardContent>
        </Card>

        {/* Wholesale Cost Valuation */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Catalog Cost Valuation</span>
              <TrendingUp className="h-4 w-4 text-emerald-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {isLoadingMetrics ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `₦${catalogMetrics.totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Wholesale procurement cost value of stock
            </p>
          </CardContent>
        </Card>

        {/* Physical Stock Quantity */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Total Stock Units</span>
              <Boxes className="h-4 w-4 text-blue-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              {isLoadingMetrics ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `${catalogMetrics.totalStockUnits.toLocaleString()} units`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sum of all inventory stock items across tenants
            </p>
          </CardContent>
        </Card>

        {/* Unique SKUs & Health */}
        <Card className={cn("shadow-xs border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Unique Catalog SKUs</span>
              <Package className="h-4 w-4 text-purple-500 opacity-80" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              {isLoadingMetrics ? (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              ) : (
                `${catalogMetrics.uniqueSkus.toLocaleString()} products`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-500" />
              Out of stock: {catalogMetrics.outOfStockCount} • Low stock: {catalogMetrics.lowStockCount}
            </p>
          </CardContent>
        </Card>
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
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Stock Qty</th>
                <th className="px-6 py-4">Est. Retail Value</th>
                <th className="px-6 py-4 rounded-tr-2xl">Business ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Package className="w-10 h-10 text-muted-foreground opacity-20" />
                      <span className="text-muted-foreground">No products found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stock = Math.max(0, Number(product.stock) || 0);
                  const price = Math.max(0, Number(product.price) || 0);
                  const totalVal = stock * price;

                  return (
                    <tr key={`${product.businessId}-${product.id}`} className={cn(
                      "transition-colors",
                      isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    )}>
                      <td className="px-6 py-4 font-medium">
                        <div>{product.name}</div>
                        {product.sku && <div className="text-[11px] font-mono text-muted-foreground">SKU: {product.sku}</div>}
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
                      <td className="px-6 py-4 font-mono font-semibold text-primary">
                        ₦{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "font-semibold font-mono",
                          stock <= (product.lowStockThreshold || 5) 
                            ? 'text-red-500' 
                            : 'text-emerald-500'
                        )}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        ₦{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        {product.businessId}
                      </td>
                    </tr>
                  );
                })
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
