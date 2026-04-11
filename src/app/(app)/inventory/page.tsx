
'use client';

import * as React from 'react';
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Inbox,
  Upload,
  Trash2,
  Package,
  PackageOpen,
  Edit,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Barcode as BarcodeIcon,
  TrendingDown,
  Layers,
  Box,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, query, where, orderBy, limit, startAfter, onSnapshot, count, getAggregateFromServer, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import VisualCountDialog from '@/components/inventory/visual-count-dialog';
import type { Product, UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import ImportDialog from '@/components/inventory/import-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import QuickEditDialog from '@/components/inventory/quick-edit-dialog';
import { usePOS } from '@/context/pos-context';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { logAuditEvent } from '@/lib/audit';
import BulkEditDialog from '@/components/inventory/bulk-edit-dialog';
import BarcodeDialog from '@/components/inventory/barcode-dialog';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { QrCode } from 'lucide-react';

function ProductRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-12"><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell className="hidden w-[100px] sm:table-cell">
        <Skeleton className="h-16 w-16 rounded-md" />
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-full" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-6 w-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 ml-auto" />
      </TableCell>
    </TableRow>
  )
}

const PRODUCTS_PER_PAGE = 60;

export default function InventoryPage() {
    return (
        <React.Suspense fallback={<DashboardSkeleton />}>
            <InventoryPageContent />
        </React.Suspense>
    );
}

function InventoryPageContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { 
    products, 
    receipts, 
    onlineOrders, 
    optimisticProducts, 
    isLoading: isPosLoading, 
    business, 
    currencySymbol, 
    currentUserProfile, 
    triggerRefresh, 
    removeFromQueue, 
    addToQueue,
    searchProducts,
    fetchMoreProducts,
    queuedActions
  } = usePOS();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [quickEditProduct, setQuickEditProduct] = React.useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = React.useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isManualSearching, setIsManualSearching] = React.useState(false);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
  const initialSortBy = (searchParams.get('sortBy') as any) || 'name';

  const [stockFilter, setStockFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock-desc' | 'stock-asc'>(initialSortBy);

  const [searchResults, setSearchResults] = React.useState<Product[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(products ? products.length >= 50 : true);

  const isLoading = isPosLoading || isSearching;
  const isPageLoading = isLoading;

  // Surgical Search Effect
  React.useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setSearchResults(null);
        return;
      }
      setIsSearching(true);
      const results = await searchProducts(searchTerm.trim());
      setSearchResults(results);
      setIsSearching(false);
    };

    const handler = setTimeout(performSearch, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchProducts]);

  // Update hasMore if products change
  React.useEffect(() => {
    if (products && products.length < 50) {
      setHasMore(false);
    }
  }, [products]);

  React.useEffect(() => {
    const s = searchParams.get('sortBy');
    if (s === 'stock-desc' || s === 'stock-asc' || s === 'name') {
      setSortBy(s);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (business) {
      const isTrialActive = business.trialExpiresAt && business.trialExpiresAt.toDate() > new Date();
      const isPaidPlan = business.plan && business.plan !== 'starter';
      const isLifetime = business.accessLevel === 'lifetime';

      if (!isTrialActive && !isPaidPlan && !isLifetime) {
        toast({
          variant: 'destructive',
          title: 'Subscription Required',
          description: 'Please subscribe to a plan to manage your inventory.',
        });
        router.push('/billing');
      }
    }
  }, [business, router, toast]);

  const userRole = currentUserProfile?.role;
  const canManageStock = userRole === 'admin' || userRole === 'manager';

  // Get IDs of products queued for deletion
  const queuedDeletionIds = React.useMemo(() => {
    return queuedActions
      .filter(a => a.type === 'delete-product' && (a.status === 'pending' || a.status === 'processing'))
      .flatMap(a => a.payload.productIds as string[]);
  }, [queuedActions]);

  const filteredProducts = React.useMemo(() => {
    let base = searchTerm.trim() ? (searchResults || []) : (products || []);
    
    // 1. Combine with optimistic products
    let combined = [...(optimisticProducts || []), ...base];
    
    // 2. Filter out queued deletions
    let valid = combined.filter(p => !queuedDeletionIds.includes(p.id));

    // 3. Category
    if (categoryFilter !== 'all') {
      valid = valid.filter(p => p.category === categoryFilter);
    }

    // 4. Stock Status
    if (stockFilter === 'out-of-stock') {
      valid = valid.filter(p => (p.stock || 0) === 0);
    } else if (stockFilter === 'debt') {
      valid = valid.filter(p => (p.stock || 0) < 0);
    } else if (stockFilter === 'in-stock') {
      valid = valid.filter(p => (p.stock || 0) > 0);
    } else if (stockFilter === 'low-stock') {
      valid = valid.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 10));
    }

    // 5. Apply Sorting
    valid.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'stock-desc') {
        const stockDiff = (b.stock || 0) - (a.stock || 0);
        if (stockDiff !== 0) return stockDiff;
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'stock-asc') {
        const stockDiff = (a.stock || 0) - (b.stock || 0);
        if (stockDiff !== 0) return stockDiff;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return valid;
  }, [products, searchResults, optimisticProducts, queuedDeletionIds, searchTerm, categoryFilter, stockFilter, sortBy]);

  // Handle Pagination Locally
  const totalCount = filteredProducts.length;
  const pagedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const pageCount = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  const handleLoadMore = async () => {
    setIsFetchingMore(true);
    const count = await fetchMoreProducts();
    if (count === 0) setHasMore(false);
    setIsFetchingMore(false);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter, categoryFilter, sortBy]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleRowSelect = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0 || !business || !currentUserProfile) return;

    addToQueue({
      type: 'delete-product',
      payload: { productIds: selectedProductIds }
    }, `Deleting ${selectedProductIds.length} product(s)`);

    // We don't need to manually mutate here because we will filter in the UI based on queuedActions
    toast({ variant: 'default', title: 'Deletion Queued', description: `${selectedProductIds.length} product(s) will be deleted.` });

    setSelectedProductIds([]);
    setIsDeleteDialogOpen(false);
  };

  const handleImportSuccess = () => {
    setIsImportOpen(false);
  };

  const handleBulkEditSuccess = () => {
    setSelectedProductIds([]);
  }

  const handleVisualAddItems = async (items: { name: string; quantity: number }[]) => {
    if (!business || !items.length) return;

    const batch = writeBatch(firestore);
    const productsRef = collection(firestore, 'businesses', business.id, 'products');

    items.forEach(item => {
      const newDocRef = doc(productsRef);
      batch.set(newDocRef, {
        name: item.name,
        stock: item.quantity,
        price: 0,
        costPrice: 0,
        category: 'Uncategorized',
        sku: '',
        barcode: '',
        description: '',
        imageUrl: '',
        lowStockThreshold: 5,
        trackStock: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    triggerRefresh();
    toast({
      title: "Success",
      description: `Added ${items.length} items to inventory.`,
    });
  };

  const handleExport = async () => {
    if (!business?.id) return;
    
    toast({ variant: 'default', title: 'Preparing Export', description: 'Fetching all product data...' });

    try {
      const q = query(collection(firestore, 'products'), where('businessId', '==', business.id));
      const snap = await getDocs(q);
      const allProductsData = snap.docs.map(doc => doc.data() as Product);

      const csvData = Papa.unparse(
        allProductsData.map(p => ({
          Name: p.name,
          SKU: p.sku,
          Category: p.category,
          Price: p.price,
          Stock: p.stock,
          Description: p.description,
          ImageURL: p.imageUrl,
        }))
      );
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `zeneva-products-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: 'success',
        title: 'Export Complete',
        description: 'Your product data has been downloaded.',
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not fetch data for export.' });
    }
  };

  const activeFilterCount = (stockFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);

  return (
    <div className="flex flex-col h-full w-full pb-16 md:pb-0">
      <div className="flex items-center pb-4 gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // If there's an exact match, maybe we want to highlight it or do something
                // For inventory page, just leave it as is since it filters the list
              }
            }}
          />
        </div>
        <div className="hidden md:flex items-center gap-2">
            {selectedProductIds.length > 0 && (
              <>
                <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setIsBulkEditDialogOpen(true)}>
                  <Edit className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">
                    Bulk Edit ({selectedProductIds.length})
                  </span>
                </Button>
                <Button variant="destructive" size="sm" className="h-9 gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">
                    Delete ({selectedProductIds.length})
                  </span>
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ml-1">{activeFilterCount}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions & Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" /> Search by Barcode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Stock Status</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={stockFilter} onValueChange={setStockFilter}>
                      <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="in-stock">In Stock</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="low-stock">Low Stock</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="out-of-stock">Out of Stock</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="debt">Negative Stock (Debt)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                      <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                      {business?.settings?.productCategories?.map((cat: string) => (
                        <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Sort By</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <DropdownMenuRadioItem value="name">Name (A-Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="stock-desc">Highest Stock First</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="stock-asc">Lowest Stock First</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {activeFilterCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => { setStockFilter('all'); setCategoryFilter('all'); setSortBy('name'); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      Clear Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => handleExport()}>
              <Download className="h-3.5 w-3.5" />
              <span className="sm:whitespace-nowrap">Export</span>
            </Button>
            {canManageStock && (
              <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                <span className="sm:whitespace-nowrap">Import</span>
              </Button>
            )}
            <Button size="sm" asChild variant="secondary" className="h-9 gap-1">
              <Link href="/inventory/debts">
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="sm:whitespace-nowrap">Manage Debts</span>
              </Link>
            </Button>
            {canManageStock && (
              <Button size="sm" asChild className="h-9 gap-1">
                <Link href="/inventory/add">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">Add Product</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Actions Modal/Menu */}
          <div className="flex md:hidden items-center gap-2">
            {selectedProductIds.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="h-9 px-3 gap-2">
                    <Activity className="h-4 w-4" />
                    <span>{selectedProductIds.length} Selected</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsBulkEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Bulk Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Inventory Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" /> Scan Barcode
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />

                {/* Mobile Filter Group */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ListFilter className="mr-2 h-4 w-4" />
                    Filter & Sort {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Stock Status</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={stockFilter} onValueChange={setStockFilter}>
                          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="in-stock">In Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="low-stock">Low Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="out-of-stock">Out of Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="debt">Negative Stock (Debt)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                          <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                          {business?.settings?.productCategories?.map((cat: string) => (
                            <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Sort By</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                          <DropdownMenuRadioItem value="name">Name (A-Z)</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="stock-desc">Highest Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="stock-asc">Lowest Stock</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handleExport()}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </DropdownMenuItem>
                
                {canManageStock && (
                  <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Import CSV
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/inventory/debts">
                    <TrendingDown className="mr-2 h-4 w-4" /> Manage Debts
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                
                {canManageStock && (
                  <DropdownMenuItem asChild className="bg-primary text-primary-foreground focus:bg-primary/90">
                    <Link href="/inventory/add">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
      <Card className="h-full flex flex-col w-full">
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Manage your products and view their sales performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-y-auto">
          {(isLoading || isPageLoading) ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox disabled /></TableHead>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageStock && <TableHead>Price</TableHead>}
                  {canManageStock && <TableHead className="hidden md:table-cell">Stock</TableHead>}
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <ProductRowSkeleton />
                <ProductRowSkeleton />
                <ProductRowSkeleton />
                <ProductRowSkeleton />
                <ProductRowSkeleton />
              </TableBody>
            </Table>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageStock && <TableHead>Price</TableHead>}
                  {canManageStock && <TableHead className="hidden md:table-cell">Stock</TableHead>}
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProducts.map((product) => (
                  <TableRow key={product.id} data-state={selectedProductIds.includes(product.id) && "selected"} className={cn((product as any).isOptimistic && "opacity-70 bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => handleRowSelect(product.id)}
                        disabled={(product as any).isOptimistic}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell cursor-pointer" onClick={() => !(product as any).isOptimistic && router.push(`/inventory/${product.id}`)}>
                      {product.imageUrl ? (
                        <div className="relative h-16 w-16">
                          <Image
                            alt={product.name}
                            className="aspect-square rounded-md object-cover"
                            fill // Changed to fill for better responsiveness/layout in relative container
                            src={product.imageUrl}
                            data-ai-hint={product.imageHint || product.category}
                          />
                          {(product as any).isOptimistic && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors relative">
                          <Package />
                          {(product as any).isOptimistic && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal">
                      <div className="flex items-center gap-2">
                        <Link href={(product as any).isOptimistic ? '#' : `/inventory/${product.id}`} className={cn("hover:underline font-medium", (product as any).isOptimistic && "pointer-events-none")}>
                          {product.name}
                        </Link>
                        {product.type === 'composite' && (
                          <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 text-primary border-primary/20 gap-1 px-1">
                            <Layers className="h-2 w-2" /> Bundle
                          </Badge>
                        )}
                        {(product as any).isOptimistic && <Badge variant="secondary" className="text-[10px] h-4">Saving...</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span className="font-mono text-[10px] bg-muted px-1 rounded">{product.sku || 'NO-SKU'}</span>
                        {product.baseUnit && <span className="text-[10px]">• Sold in {product.baseUnit}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.categoryType === 'service' ? (
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/50 flex items-center gap-1 w-fit">
                          <Activity className="h-3 w-3" /> Service Only
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            (product.stock || 0) > (product.lowStockThreshold || 5) ? "outline" :
                              (product.stock || 0) > 0 ? "secondary" :
                                (product.stock || 0) < 0 ? "destructive" : "destructive"
                          }
                          className={cn(
                            "whitespace-nowrap",
                            (product.stock || 0) < 0 && "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/50"
                          )}
                        >
                          {(product.stock || 0) > 0 ? "In Stock" : (product.stock || 0) < 0 ? "Backordered" : "Out of Stock"}
                        </Badge>
                      )}
                    </TableCell>
                    {canManageStock && <TableCell>{currencySymbol}{product.price.toLocaleString()}</TableCell>}
                    {canManageStock && (
                      <TableCell className="hidden md:table-cell">
                        {product.categoryType === 'service' ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-primary">{(product as any).totalSoldAcrossAll || 0} Sold</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Revenue Service</span>
                          </div>
                        ) : (
                          product.stock || 0
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu 
                        open={openMenuId === product.id} 
                        onOpenChange={(open) => setOpenMenuId(open ? product.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                            disabled={false} // Enable for cancellation
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {/* Cancel Optimistic Action */}
                          {(product as any).isOptimistic && (product as any).queueId && (
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onSelect={() => removeFromQueue((product as any).queueId)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Discard
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer" onSelect={() => { NProgress.start(); router.push(`/inventory/${product.id}`); }} disabled={!canManageStock || (product as any).isOptimistic}>
                            <Edit className="mr-2 h-4 w-4" /> Full Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setQuickEditProduct(product) }} disabled={!canManageStock || (product as any).isOptimistic}>
                            <Edit className="mr-2 h-4 w-4" /> Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setBarcodeProduct(product); }} disabled={!product.sku}>
                            <BarcodeIcon className="mr-2 h-4 w-4" /> Print Barcode
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 m-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-xl transform scale-150 opacity-50" />
                <PackageOpen className="h-24 w-24 text-muted-foreground/30 relative z-10" strokeWidth={1} />
                <div className="text-muted-foreground/30 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full h-8 w-0.5 border-l-2 border-dashed border-muted-foreground/30" />
                {/* Since we can't easily add arbitrary SVG paths outside the icon, I'll stick to the icon + styling */}
              </div>
              <h3 className="text-xl font-semibold text-foreground">{searchTerm || stockFilter !== 'all' || categoryFilter !== 'all' ? 'No product found' : 'No products yet'}</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
                {searchTerm || stockFilter !== 'all' || categoryFilter !== 'all' ? `We couldn't find any products matching your search.` : 'Get started by creating your first product.'}
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/inventory/add">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Product
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        {filteredProducts && filteredProducts.length > 0 && (
          <CardFooter className="flex flex-col border-t py-4 gap-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                Showing <strong>{(currentPage - 1) * PRODUCTS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)}</strong> of <strong>{filteredProducts.length}</strong> products
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= pageCount}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {!searchTerm && hasMore && (
              <div className="flex justify-center w-full pt-4 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLoadMore} 
                  disabled={isFetchingMore}
                  className="text-muted-foreground hover:text-primary"
                >
                  {isFetchingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-2" />
                  )}
                  Load More from Database
                </Button>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
      
      {business && (
        <ImportDialog
          isOpen={isImportOpen}
          onOpenChange={setIsImportOpen}
          businessId={business.id}
          products={products}
          onSuccess={handleImportSuccess}
        />
      )}

      {isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will queue the deletion of {selectedProductIds.length} products. This is permanent once synced.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {quickEditProduct && currentUserProfile && (
        <QuickEditDialog
          product={quickEditProduct}
          isOpen={!!quickEditProduct}
          onOpenChange={(open) => !open && setQuickEditProduct(null)}
          userProfile={currentUserProfile}
        />
      )}

      {isBulkEditDialogOpen && (
        <BulkEditDialog
          productIds={selectedProductIds}
          isOpen={isBulkEditDialogOpen}
          onOpenChange={setIsBulkEditDialogOpen}
          onSuccess={handleBulkEditSuccess}
        />
      )}

      {barcodeProduct && (
        <BarcodeDialog
          product={barcodeProduct}
          isOpen={!!barcodeProduct}
          onOpenChange={(open) => !open && setBarcodeProduct(null)}
        />
      )}

      {isScannerOpen && (
        <BarcodeScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(sku) => {
            setSearchTerm(sku);
            setIsScannerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

