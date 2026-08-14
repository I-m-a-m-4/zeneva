
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CachedImage } from "@/components/shared/cached-image";
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
import { useI18n } from '@/context/i18n-context';
import { useBranch } from '@/context/branch-context';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { logAuditEvent } from '@/lib/audit';
import BulkEditDialog from '@/components/inventory/bulk-edit-dialog';
import BarcodeDialog from '@/components/inventory/barcode-dialog';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { QrCode } from 'lucide-react';
import { ImageDialog } from "@/components/shared/image-dialog";


function ProductRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-12"><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell className="w-16 sm:w-[100px]">
        <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-md" />
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
        <Skeleton className="h-8 w-8 ms-auto" />
      </TableCell>
    </TableRow>
  )
}

const PRODUCTS_PER_PAGE = 60;

/**
 * A service has no stock to run out of.
 *
 * Services sit in the same collection as products and carry `stock: 0` because
 * the field is shared, not because there is none left. So every stock-health
 * check has to skip them — counting a haircut as "out of stock" tells the owner
 * to restock something that was never stocked, and buries the products that
 * genuinely did run out.
 *
 * Module-level on purpose: the stock filter, the health tiles and the health
 * table all need the same answer, and this used to be defined inside one memo
 * where the other two could not reach it.
 */
const isService = (p: Product) =>
  p.categoryType === 'service' ||
  p.category?.toLowerCase() === 'service' ||
  p.category?.toLowerCase() === 'services';

function InventoryPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export default function InventoryPage() {
    return (
        <React.Suspense fallback={<InventoryPageSkeleton />}>
            <InventoryPageContent />
        </React.Suspense>
    );
}

function InventoryPageContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const { activeBranchId } = useBranch();
  const { 
    products, 
    receipts, 
    onlineOrders, 
    optimisticProducts, 
    isLoading: isPosLoading, 
    isSyncing,
    business, 
    currencySymbol, 
    currentUserProfile, 
    triggerRefresh, 
    removeFromQueue, 
    addToQueue,
    searchProducts,
    searchProductsByField,
    fetchMoreProducts,
    queuedActions
  } = usePOS();

  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [quickEditProduct, setQuickEditProduct] = React.useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = React.useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('all');
  const [healthFilter, setHealthFilter] = React.useState<'all'|'missing-image'|'out-of-stock'|'low-stock'|'negative'>('all');
  const [isManualSearching, setIsManualSearching] = React.useState(false);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [previewImage, setPreviewImage] = React.useState<{ src: string, alt: string } | null>(null);

  const searchParams = useSearchParams();
  const initialSortBy = (searchParams.get('sortBy') as any) || 'name';

  const [stockFilter, setStockFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock-desc' | 'stock-asc' | 'newest'>((searchParams.get('sortBy') as any) || 'newest');

  const isLoading = isPosLoading;
  const isPageLoading = isLoading;

  // Manual search button helper
  const performSearch = React.useCallback(async (term: string) => {
    // No-op for remote search, local filtering is instant via filteredProducts useMemo
  }, []);


  // Update sorting from URL
  React.useEffect(() => {
    const s = searchParams.get('sortBy');
    if (s === 'stock-desc' || s === 'stock-asc' || s === 'name' || s === 'newest') {
      setSortBy(s as any);
    }
  }, [searchParams]);

  // Subscription logic removed here as it is now handled by the root layout's subscription guard overlay.

  const userRole = currentUserProfile?.role;
  const canManageStock = currentUserProfile?.permissions?.manage_inventory ?? (userRole === 'admin' || userRole === 'manager');

  // Get IDs of products queued for deletion
  const queuedDeletionIds = React.useMemo(() => {
    return queuedActions
      .filter(a => a.type === 'delete-product' && (a.status === 'pending' || a.status === 'processing' || a.status === 'synced'))
      .flatMap(a => a.payload.productIds as string[]);

  }, [queuedActions]);

  const filteredProducts = React.useMemo(() => {
    // Local products only
    let base = [...(products || [])];
    
    // Apply local search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      base = base.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.sku?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
      );
    }

    
    // 1. Combine with optimistic products
    let combined = [...(optimisticProducts || []), ...base];
    
    // 2. Filter out queued deletions
    let valid = combined.filter(p => !queuedDeletionIds.includes(p.id));

  // 3. Category
    if (categoryFilter !== 'all') {
      valid = valid.filter(p => p.category === categoryFilter);
    }

    // 4. Stock Status — services are skipped, see `isService`.
    if (stockFilter === 'out-of-stock') {
      valid = valid.filter(p => !isService(p) && (p.stock || 0) === 0);
    } else if (stockFilter === 'debt') {
      valid = valid.filter(p => !isService(p) && (p.stock || 0) < 0);
    } else if (stockFilter === 'in-stock') {
      valid = valid.filter(p => isService(p) || (p.stock || 0) > 0);
    } else if (stockFilter === 'low-stock') {
      valid = valid.filter(p => !isService(p) && (p.stock || 0) <= (p.lowStockThreshold || 10));
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
      } else if (sortBy === 'newest') {
        const dateA = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds || 0;
        const dateB = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds || 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return valid;
  }, [products, optimisticProducts, queuedDeletionIds, searchTerm, categoryFilter, stockFilter, sortBy]);

  const healthMetrics = React.useMemo(() => {
    if (!products) return { missingImages: 0, outOfStock: 0, lowStock: 0, negativeStock: 0, total: 0 };
    let missing = 0, oos = 0, low = 0, neg = 0, total = 0;
    products.forEach(p => {
      let isUnhealthy = false;
      // A missing image is worth flagging on a service too — it still shows on
      // the storefront. The three stock counts below are not: see `isService`.
      if (!p.imageUrl) { missing++; isUnhealthy = true; }
      if (!isService(p)) {
        if (p.stock === 0) { oos++; isUnhealthy = true; }
        if (p.stock !== undefined && p.stock > 0 && p.stock <= 5) { low++; isUnhealthy = true; }
        if (p.stock !== undefined && p.stock < 0) { neg++; isUnhealthy = true; }
      }
      if (isUnhealthy) total++;
    });
    const score = products.length > 0 ? Math.round(((products.length - total) / products.length) * 100) : 100;
    return { missingImages: missing, outOfStock: oos, lowStock: low, negativeStock: neg, total, score };
  }, [products]);

  const displayedProducts = React.useMemo(() => {
    if (activeTab === 'all') return filteredProducts;

    // Health tab filtering. Mirrors healthMetrics above exactly — a tile that
    // counts 4 and a table that lists 7 is worse than either alone.
    return filteredProducts.filter(p => {
      if (healthFilter === 'missing-image') return !p.imageUrl;
      if (healthFilter === 'out-of-stock') return !isService(p) && p.stock === 0;
      if (healthFilter === 'low-stock') return !isService(p) && p.stock !== undefined && p.stock > 0 && p.stock <= 5;
      if (healthFilter === 'negative') return !isService(p) && p.stock !== undefined && p.stock < 0;

      // 'all' health issues
      if (!p.imageUrl) return true;
      if (isService(p)) return false;
      return p.stock === 0 || (p.stock !== undefined && p.stock > 0 && p.stock <= 5) || (p.stock !== undefined && p.stock < 0);
    });
  }, [filteredProducts, activeTab, healthFilter]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedProductIds(displayedProducts.map(p => p.id));
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
    }, t('inventory.queueDeleting', { count: selectedProductIds.length }));

    // We don't need to manually mutate here because we will filter in the UI based on queuedActions
    toast({
      variant: 'default',
      title: t('inventory.deletionQueuedTitle'),
      description: t('inventory.deletionQueuedDescription', { count: selectedProductIds.length }),
    });

    setSelectedProductIds([]);
    setIsDeleteDialogOpen(false);
  };

  const handleImportSuccess = () => {
    setIsImportOpen(false);
  };

  const handleBulkEditSuccess = () => {
    setSelectedProductIds([]);
  }

  const handleVisualAddItems = async (items: any[]) => {
    if (!business?.id || items.length === 0) return;
    setIsLoading(true);

    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

    try {
        if (isTauri) {
            items.forEach(item => {
                const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random();
                addToQueue({
                    type: 'add-product',
                    payload: { 
                      ...item, 
                      id: newId, 
                      businessId: business.id,
                      ...(activeBranchId && activeBranchId !== 'all' ? { branchId: activeBranchId } : {})
                    }
                }, t('inventory.queueImporting', { name: item.name }));
            });

            toast({
              title: t('inventory.importQueuedTitle'),
              description: t('inventory.importQueuedDescription', { count: items.length }),
            });
            triggerRefresh();
        } else {
            const batch = writeBatch(firestore);
            const productsRef = collection(firestore, 'products');
            items.forEach(item => {
                const productRef = doc(productsRef);
                batch.set(productRef, {
                    ...item,
                    businessId: business.id,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    ...(activeBranchId && activeBranchId !== 'all' ? { branchId: activeBranchId } : {})
                });
            });
            await batch.commit();
            toast({
              title: t('inventory.importSuccessTitle'),
              description: t('inventory.importSuccessDescription', { count: items.length }),
            });
            triggerRefresh();
        }
    } catch (error) {
        toast({ title: t('inventory.importFailedTitle'), description: t('inventory.importFailedDescription'), variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!business?.id) return;
    
    toast({ variant: 'default', title: t('inventory.preparingExportTitle'), description: t('inventory.preparingExportDescription') });

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
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        link.setAttribute('href', url);
        link.setAttribute('download', `zeneva-products-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      reader.readAsDataURL(blob);
      toast({
        variant: 'success',
        title: t('inventory.exportCompleteTitle'),
        description: t('inventory.exportCompleteDescription'),
      });
    } catch (e) {
      toast({ variant: 'destructive', title: t('inventory.exportFailedTitle'), description: t('inventory.exportFailedDescription') });
    }
  };

  const activeFilterCount = (stockFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);
  return (
    <div className="flex flex-col flex-1 w-full pb-16 md:pb-0">
      <div className="flex items-center sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3.5 gap-4 z-10 border-b mb-4">
        <div className="flex flex-col flex-1">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder={t('inventory.searchProducts')}
                className="w-full rounded-lg bg-background ps-8 ring-offset-background focus-visible:ring-primary h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    performSearch(searchTerm);
                  }
                }}
              />

            </div>
            <Button 
               variant="secondary" 
               size="icon"
               className="h-10 w-10 shrink-0 border shadow-sm hover:shadow-md transition-all active:scale-95"
               onClick={() => performSearch(searchTerm)}
               aria-label={t('inventory.searchAria')}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
            {selectedProductIds.length > 0 && canManageStock && (
              <>
                <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setIsBulkEditDialogOpen(true)}>
                  <Edit className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">
                    {t('inventory.bulkEditCount', { count: selectedProductIds.length })}
                  </span>
                </Button>
                <Button variant="destructive" size="sm" className="h-9 gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">
                    {t('inventory.deleteCount', { count: selectedProductIds.length })}
                  </span>
                </Button>
              </>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1" suppressHydrationWarning>
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>{t('inventory.filter')}</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ms-1">{activeFilterCount}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('inventory.actionsAndFilters')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="me-2 h-4 w-4" /> {t('inventory.searchByBarcode')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>{t('inventory.stockStatus')}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={stockFilter} onValueChange={setStockFilter}>
                      <DropdownMenuRadioItem value="all">{t('common.all')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="in-stock">{t('inventory.statusInStock')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="low-stock">{t('inventory.statusLowStock')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="out-of-stock">{t('inventory.statusOutOfStock')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="debt">{t('inventory.statusNegative')}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>{t('inventory.category')}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                      <DropdownMenuRadioItem value="all">{t('inventory.allCategories')}</DropdownMenuRadioItem>
                      {business?.settings?.productCategories?.map((cat: string) => (
                        <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>{t('inventory.sortBy')}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <DropdownMenuRadioItem value="newest">{t('inventory.sortNewest')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name">{t('inventory.sortNameAz')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="stock-desc">{t('inventory.sortStockDescLong')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="stock-asc">{t('inventory.sortStockAscLong')}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {activeFilterCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => { setStockFilter('all'); setCategoryFilter('all'); setSortBy('newest'); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      {t('inventory.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => handleExport()}>
              <Download className="h-3.5 w-3.5" />
              <span className="sm:whitespace-nowrap">{t('common.export')}</span>
            </Button>
            {canManageStock && (
              <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                <span className="sm:whitespace-nowrap">{t('common.import')}</span>
              </Button>
            )}
            {canManageStock && (
              <Button size="sm" asChild variant="secondary" className="h-9 gap-1">
                <Link href="/inventory/debts">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">{t('inventory.manageDebts')}</span>
                </Link>
              </Button>
            )}
            {canManageStock && (
              <Button size="sm" asChild className="h-9 gap-1">
                <Link href="/inventory/add">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">{t('inventory.addProduct')}</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Actions Modal/Menu */}
          <div className="flex md:hidden items-center gap-2">
            {selectedProductIds.length > 0 && canManageStock && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="h-9 px-3 gap-2">
                    <Activity className="h-4 w-4" />
                    <span>{t('inventory.selectedCount', { count: selectedProductIds.length })}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsBulkEditDialogOpen(true)}>
                    <Edit className="me-2 h-4 w-4" /> {t('inventory.bulkEdit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="me-2 h-4 w-4" /> {t('inventory.deleteSelected')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('inventory.inventoryOptions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="me-2 h-4 w-4" /> {t('inventory.scanBarcode')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Mobile Filter Group */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ListFilter className="me-2 h-4 w-4" />
                    {t('inventory.filterAndSort')} {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>{t('inventory.filterBy')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('inventory.stockStatus')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={stockFilter} onValueChange={setStockFilter}>
                          <DropdownMenuRadioItem value="all">{t('common.all')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="in-stock">{t('inventory.statusInStock')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="low-stock">{t('inventory.statusLowStock')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="out-of-stock">{t('inventory.statusOutOfStock')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="debt">{t('inventory.statusNegative')}</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('inventory.category')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                          <DropdownMenuRadioItem value="all">{t('inventory.allCategories')}</DropdownMenuRadioItem>
                          {business?.settings?.productCategories?.map((cat: string) => (
                            <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('inventory.sortBy')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                          <DropdownMenuRadioItem value="newest">{t('inventory.sortNewest')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="name">{t('inventory.sortNameAz')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="stock-desc">{t('inventory.sortStockDesc')}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="stock-asc">{t('inventory.sortStockAsc')}</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleExport()}>
                  <Download className="me-2 h-4 w-4" /> {t('inventory.exportCsv')}
                </DropdownMenuItem>

                {canManageStock && (
                  <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                    <Upload className="me-2 h-4 w-4" /> {t('inventory.importCsv')}
                  </DropdownMenuItem>
                )}

                {canManageStock && (
                  <DropdownMenuItem asChild>
                    <Link href="/inventory/debts">
                      <TrendingDown className="me-2 h-4 w-4" /> {t('inventory.manageDebts')}
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {canManageStock && (
                  <DropdownMenuItem asChild className="bg-primary text-primary-foreground focus:bg-primary/90">
                    <Link href="/inventory/add">
                      <PlusCircle className="me-2 h-4 w-4" /> {t('inventory.addNewProduct')}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>

      <div className="w-full mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">{t('inventory.tabAllProducts')}</TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-1.5">
              {t('inventory.tabHealth')}
              {healthMetrics.total > 0 && <span className="flex h-2 w-2 rounded-full bg-red-500" />}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'health' && (
        <div className="flex flex-col gap-4 mb-6">
          <Card className="bg-gradient-to-r from-slate-50 to-muted/30 dark:from-slate-900/30 dark:to-muted/10 border-border overflow-hidden">
            <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-xs md:text-sm uppercase tracking-wider text-muted-foreground">Overall Health Score</h3>
                  <span className={cn("text-2xl font-black", healthMetrics.score >= 90 ? "text-green-600" : healthMetrics.score >= 70 ? "text-orange-500" : "text-red-600")}>
                    {healthMetrics.score}%
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000 ease-out rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]", healthMetrics.score >= 90 ? "bg-green-500" : healthMetrics.score >= 70 ? "bg-orange-500" : "bg-red-500")}
                    style={{ width: `${healthMetrics.score}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {healthMetrics.score >= 90 ? "Your inventory is in great shape! Products are well-stocked and detailed." : 
                   healthMetrics.score >= 70 ? "Your inventory is okay, but some products need restocking or missing details." : 
                   "Your inventory needs attention. Many items are out of stock or missing details."}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={cn("cursor-pointer transition-colors hover:bg-muted/50", healthFilter === 'all' && "border-primary")}
            onClick={() => setHealthFilter('all')}
          >
            <CardContent className="p-4 flex flex-col gap-1 text-center">
              <span className="text-2xl font-bold">{healthMetrics.total}</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('inventory.healthTotalIssues')}</span>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-colors hover:bg-red-50/50 dark:hover:bg-red-950/20", healthFilter === 'out-of-stock' && "border-red-500 bg-red-50 dark:bg-red-950/20")}
            onClick={() => setHealthFilter('out-of-stock')}
          >
            <CardContent className="p-4 flex flex-col gap-1 text-center">
              <span className="text-2xl font-bold text-red-600">{healthMetrics.outOfStock}</span>
              <span className="text-xs text-red-600/80 font-medium uppercase tracking-wider">{t('inventory.healthOutOfStock')}</span>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-950/20", healthFilter === 'low-stock' && "border-orange-500 bg-orange-50 dark:bg-orange-950/20")}
            onClick={() => setHealthFilter('low-stock')}
          >
            <CardContent className="p-4 flex flex-col gap-1 text-center">
              <span className="text-2xl font-bold text-orange-600">{healthMetrics.lowStock}</span>
              <span className="text-xs text-orange-600/80 font-medium uppercase tracking-wider">{t('inventory.healthLowStock')}</span>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20", healthFilter === 'missing-image' && "border-blue-500 bg-blue-50 dark:bg-blue-950/20")}
            onClick={() => setHealthFilter('missing-image')}
          >
            <CardContent className="p-4 flex flex-col gap-1 text-center">
              <span className="text-2xl font-bold text-blue-600">{healthMetrics.missingImages}</span>
              <span className="text-xs text-blue-600/80 font-medium uppercase tracking-wider">{t('inventory.healthMissingImages')}</span>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      <Card className="flex-1 flex flex-col min-h-0 w-full overflow-hidden mb-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t('inventory.productsTitle')}
          </CardTitle>
          <CardDescription>
            {t('inventory.productsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto min-h-0">
          {(isLoading && displayedProducts.length === 0) || products === null ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50 mb-4" />
              <p className="text-muted-foreground animate-pulse font-medium">{t('inventory.scanningCatalogs')}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-widest">{t('inventory.justAMoment')}</p>
            </div>
          ) : (
            displayedProducts && displayedProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={displayedProducts.length > 0 && selectedProductIds.length === displayedProducts.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16 sm:w-[100px]">
                      <span className="sr-only">{t('inventory.colImage')}</span>
                    </TableHead>
                    <TableHead className="font-semibold">{t('common.name')}</TableHead>
                    <TableHead className="font-semibold">{t('common.status')}</TableHead>
                    {canManageStock && <TableHead className="font-semibold">{t('common.price')}</TableHead>}
                    {canManageStock && <TableHead className="hidden md:table-cell font-semibold">{t('inventory.colStock')}</TableHead>}
                    <TableHead className="text-end font-semibold pe-6">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProducts.map((product) => (
                    <TableRow 
                      key={product.id} 
                      data-state={selectedProductIds.includes(product.id) && "selected"} 
                      className={cn(
                        "group hover:bg-muted/50 cursor-pointer transition-colors",
                        (product as any).isOptimistic && "opacity-70 bg-muted/50"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => handleRowSelect(product.id)}
                          disabled={(product as any).isOptimistic}
                        />
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => !(product as any).isOptimistic && router.push(`/inventory/details?id=${product.id}`)}>
                        {product.imageUrl ? (
                          <div 
                            className="relative h-12 w-12 sm:h-16 sm:w-16" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({ src: product.imageUrl!, alt: product.name });
                            }}
                          >
                            <CachedImage
                              alt={product.name}
                              className="aspect-square rounded-md object-cover hover:ring-2 ring-primary/50 transition-all w-full h-full"
                              src={product.imageUrl}
                            />
                            {(product as any).isOptimistic && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors relative">
                            <Package className="h-5 w-5 sm:h-6 sm:w-6" />
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
                          <Link href={(product as any).isOptimistic ? '#' : `/inventory/details?id=${product.id}`} className={cn("hover:underline font-medium", (product as any).isOptimistic && "pointer-events-none")}>
                            {product.name}
                          </Link>
                          {product.type === 'composite' && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 text-primary border-primary/20 gap-1 px-1">
                              <Layers className="h-2 w-2" /> {t('inventory.bundleBadge')}
                            </Badge>
                          )}
                          {(product as any).isOptimistic && <Badge variant="secondary" className="text-[10px] h-4">{t('common.saving')}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <span className="font-mono text-[10px] bg-muted px-1 rounded">{product.sku || 'NO-SKU'}</span>
                          {((product as any).material || product.variantValue) && (
                            <span className="text-[10px] flex items-center gap-1 opacity-80">
                               • {((product as any).material ? (product as any).material : '')} 
                               {product.variantValue && <Badge variant="secondary" className="text-[8px] h-3 px-1 ms-0.5 font-normal">{product.variantValue}</Badge>}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (product.categoryType === 'service' || product.category?.toLowerCase() === 'service' || product.category?.toLowerCase() === 'services') ? "outline" :
                            (product.stock || 0) > 0 ? "outline" : "destructive"
                          }
                          className={cn(
                            "whitespace-nowrap",
                            (product.categoryType === 'service' || product.category?.toLowerCase() === 'service' || product.category?.toLowerCase() === 'services') && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            (product.categoryType !== 'service' && product.category?.toLowerCase() !== 'service' && product.category?.toLowerCase() !== 'services') && (product.stock || 0) < 0 && "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/50"
                          )}
                        >
                          {(product.categoryType === 'service' || product.category?.toLowerCase() === 'service' || product.category?.toLowerCase() === 'services') ? t('inventory.statusService') : (product.stock || 0) > 0 ? t('inventory.statusInStock') : (product.stock || 0) < 0 ? t('inventory.statusBackordered') : t('inventory.statusOutOfStock')}
                        </Badge>
                      </TableCell>
                      {canManageStock && <TableCell>{currencySymbol}{product.price.toLocaleString()}</TableCell>}
                      {canManageStock && (
                        <TableCell className="hidden md:table-cell">
                          {product.categoryType === 'service' ? (
                            <span className="text-muted-foreground/40 italic">{t('inventory.notAvailable')}</span>
                          ) : (
                            <>
                              {product.stock || 0} <span className="text-[10px] text-muted-foreground">{product.baseUnit || ''}</span>
                            </>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-end pe-6">
                        <DropdownMenu modal={false}
                          open={openMenuId === product.id} 
                          onOpenChange={(open) => setOpenMenuId(open ? product.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManageStock && (
                              <>
                                <DropdownMenuItem onSelect={() => router.push(`/inventory/details?id=${product.id}`)}>
                                  <Edit className="me-2 h-4 w-4" /> {t('inventory.fullEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setQuickEditProduct(product)}>
                                  <Edit className="me-2 h-4 w-4" /> {t('inventory.quickEdit')}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onSelect={() => setBarcodeProduct(product)} disabled={!product.sku}>
                              <BarcodeIcon className="me-2 h-4 w-4" /> {t('inventory.printBarcode')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>


                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 min-h-[400px]">
                <PackageOpen className="h-24 w-24 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold">
                  {activeTab === 'health' ? t('inventory.noHealthIssues') : (searchTerm ? t('inventory.noProductFound') : t('inventory.emptyInventory'))}
                </h3>
                <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
                  {activeTab === 'health'
                    ? t('inventory.healthyHint')
                    : (searchTerm ? t('inventory.searchHint') : t('inventory.startAddingHint'))}
                </p>
                {activeTab === 'all' && (!searchTerm && stockFilter === 'all' && categoryFilter === 'all') && (
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href="/inventory/add">
                        <PlusCircle className="me-2 h-4 w-4" /> {t('inventory.addProduct')}
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                      <Upload className="me-2 h-4 w-4" /> {t('inventory.importCsv')}
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
        {filteredProducts && filteredProducts.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t py-4">
            <div className="text-sm text-muted-foreground">
              {t('inventory.totalFound', { count: filteredProducts.length })}
            </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.deleteConfirmBody', { count: selectedProductIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      <ImageDialog 
          isOpen={!!previewImage} 
          onClose={() => setPreviewImage(null)} 
          src={previewImage?.src || null} 
          alt={previewImage?.alt || ''} 
      />
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

