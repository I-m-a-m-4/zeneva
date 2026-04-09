
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
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { products: allProducts, receipts, onlineOrders, optimisticProducts, isLoading, business, currencySymbol, currentUserProfile, triggerRefresh, removeFromQueue, addToQueue } = usePOS();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [quickEditProduct, setQuickEditProduct] = React.useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = React.useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const initialSortBy = (searchParams.get('sortBy') as any) || 'name';

  const [stockFilter, setStockFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock-desc' | 'stock-asc'>(initialSortBy);

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
  const { queuedActions } = usePOS();
  const queuedDeletionIds = React.useMemo(() => {
    return queuedActions
      .filter(a => a.type === 'delete-product' && (a.status === 'pending' || a.status === 'processing'))
      .flatMap(a => a.payload.productIds as string[]);
  }, [queuedActions]);

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!allProducts) return [];

    // Combine real and optimistic products
    const combinedProducts = [...(optimisticProducts || []), ...allProducts];

    // Filter out products queued for deletion
    const validProducts = combinedProducts.filter(p => !queuedDeletionIds.includes(p.id));

    const filtered = validProducts
      .filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    // Augmented products with Sales Data
    const productsWithStats = filtered.map(p => {
      let totalSoldFromReceipts = 0;
      receipts?.forEach(r => {
        r.items.forEach(i => {
          if (i.productId === p.id) {
            totalSoldFromReceipts += i.quantity;
          }
        });
      });

      let totalSoldFromOnline = 0;
      onlineOrders?.forEach(o => {
        o.items.forEach(i => {
          if (i.productId === p.id) {
            totalSoldFromOnline += i.quantity;
          }
        });
      });

      return {
        ...p,
        totalSoldAcrossAll: totalSoldFromReceipts + totalSoldFromOnline
      };
    });

    let finalFiltered = productsWithStats;

    // Stock filter (Only if user is filtering by stock, we might want to skip services)
    if (stockFilter !== 'all') {
      finalFiltered = finalFiltered.filter(p => {
        if (p.categoryType === 'service') {
          // You decide: should services show in "In Stock"? Maybe yes (as they are always available).
          // But usually they don't have stock, so if I filter by "Out of Stock", a service shouldn't appear.
          if (stockFilter === 'in-stock') return true;
          return false; // Services don't go low-stock or debt or out-of-stock
        }
        const stock = p.stock || 0;
        const lowStockThreshold = p.lowStockThreshold || 5;
        if (stockFilter === 'in-stock') return stock > 0;
        if (stockFilter === 'out-of-stock') return stock === 0;
        if (stockFilter === 'low-stock') return stock > 0 && stock <= lowStockThreshold;
        if (stockFilter === 'debt') return stock < 0;
        return true;
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      finalFiltered = finalFiltered.filter(p => p.category === categoryFilter);
    }

    return finalFiltered.sort((a, b) => {
      if (sortBy === 'stock-desc') {
        return (b.stock || 0) - (a.stock || 0);
      }
      if (sortBy === 'stock-asc') {
        return (a.stock || 0) - (b.stock || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [allProducts, optimisticProducts, searchTerm, stockFilter, categoryFilter, sortBy]);

  const pageCount = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);

  const paginatedProducts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter, categoryFilter, sortBy]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedProductIds(filteredAndSortedProducts.map(p => p.id));
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

  const handleExport = () => {
    if (!allProducts) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No product data available to export.',
      });
      return;
    }
    const csvData = Papa.unparse(
      allProducts.map(p => ({
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
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 border-primary/20 text-primary hover:bg-primary/5"
          onClick={() => {
            // Manual search trigger if needed, though it's already real-time
            toast({
              title: "Search Active",
              description: `Showing results for "${searchTerm || 'all products'}"`,
            });
          }}
        >
          <Search className="h-5 w-5" />
        </Button>
          {/* Desktop Actions */}
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
          {isLoading ? (
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
          ) : paginatedProducts && paginatedProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredAndSortedProducts.length > 0 && selectedProductIds.length === filteredAndSortedProducts.length ? true : selectedProductIds.length > 0 ? "indeterminate" : false}
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
                {paginatedProducts.map((product) => (
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
                      <DropdownMenu>
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
        {filteredAndSortedProducts.length > 0 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page <strong>{currentPage}</strong> of <strong>{pageCount}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= pageCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      <ImportDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={handleImportSuccess}
        businessId={business?.id}
        products={allProducts}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedProductIds.length} product(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {currentUserProfile && (
        <QuickEditDialog
          product={quickEditProduct}
          userProfile={currentUserProfile}
          isOpen={!!quickEditProduct}
          onOpenChange={(open) => {
            if (!open) {
              setQuickEditProduct(null);
            }
          }}
        />
      )}
      {currentUserProfile && (
        <BulkEditDialog
          productIds={selectedProductIds}
          isOpen={isBulkEditDialogOpen}
          onOpenChange={setIsBulkEditDialogOpen}
          onSuccess={handleBulkEditSuccess}
        />
      )}
      <BarcodeDialog
        product={barcodeProduct}
        isOpen={!!barcodeProduct}
        onOpenChange={(open) => {
          if (!open) {
            setBarcodeProduct(null);
          }
        }}
      />
      {isScannerOpen && (
        <BarcodeScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(sku) => {
            setSearchTerm(sku);
            setIsScannerOpen(false);
            toast({
              title: "Barcode Scanned",
              description: `Searching for SKU: ${sku}`,
            });
          }}
        />
      )}
    </div>
  );
}
