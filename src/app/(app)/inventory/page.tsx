
'use client';

import * as React from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
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
  Edit,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Barcode as BarcodeIcon,
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
import { doc, writeBatch } from 'firebase/firestore';
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

const PRODUCTS_PER_PAGE = 10;

export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { products: allProducts, isLoading, business, currencySymbol, currentUserProfile, triggerRefresh } = usePOS();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [quickEditProduct, setQuickEditProduct] = React.useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = React.useState<Product | null>(null);
  const [stockFilter, setStockFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');

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

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!allProducts) return [];
    let filtered = allProducts
      .filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        const stock = p.stock || 0;
        const lowStockThreshold = p.lowStockThreshold || 5;
        if (stockFilter === 'in-stock') return stock > 0;
        if (stockFilter === 'out-of-stock') return stock <= 0;
        if (stockFilter === 'low-stock') return stock > 0 && stock <= lowStockThreshold;
        return true;
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, searchTerm, stockFilter, categoryFilter]);

  const pageCount = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);

  const paginatedProducts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter, categoryFilter]);

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
    if (!firestore || selectedProductIds.length === 0 || !business || !currentUserProfile) return;

    const batch = writeBatch(firestore);
    selectedProductIds.forEach(id => {
      const docRef = doc(firestore, 'products', id);
      batch.delete(docRef);

      const deletedProduct = allProducts?.find(p => p.id === id);
      if (deletedProduct) {
        logAuditEvent(firestore, business.id, currentUserProfile, {
          action: 'product.delete',
          entity: { type: 'Product', id: id, name: deletedProduct.name },
          details: { name: deletedProduct.name }
        });
      }
    });

    try {
      await batch.commit();
      toast({ variant: 'success', title: 'Products Deleted', description: `${selectedProductIds.length} products have been removed.` });
      setSelectedProductIds([]);
      triggerRefresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete products.' });
    }
    setIsDeleteDialogOpen(false);
  };

  const handleImportSuccess = () => {
    setIsImportOpen(false);
  };

  const handleBulkEditSuccess = () => {
    setSelectedProductIds([]);
  }

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

  const activeFilterCount = (stockFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center pb-4 gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedProductIds.length > 0 && (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setIsBulkEditDialogOpen(true)}>
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Bulk Edit ({selectedProductIds.length})
                </span>
              </Button>
              <Button variant="destructive" size="sm" className="h-9 gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Delete ({selectedProductIds.length})
                </span>
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ml-1">{activeFilterCount}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { setStockFilter('all'); setCategoryFilter('all'); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => handleExport()}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Import
            </span>
          </Button>
          <Button size="sm" asChild className="h-9 gap-1">
            <Link href="/inventory/add">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Product
              </span>
            </Link>
          </Button>
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
                  <TableRow key={product.id} data-state={selectedProductIds.includes(product.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => handleRowSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell cursor-pointer" onClick={() => router.push(`/inventory/${product.id}`)}>
                      {product.imageUrl ? (
                        <Image
                          alt={product.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={product.imageUrl}
                          width="64"
                          data-ai-hint={product.imageHint || product.category}
                        />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                          <Package />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal">
                      <Link href={`/inventory/${product.id}`} className="hover:underline">{product.name}</Link>
                      <div className="text-sm text-muted-foreground">{product.sku}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(product.stock || 0) > 0 ? "outline" : "destructive"}>
                        {(product.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                    {canManageStock && <TableCell>{currencySymbol}{product.price.toLocaleString()}</TableCell>}
                    {canManageStock && <TableCell className="hidden md:table-cell">{product.stock || 0}</TableCell>}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer" onSelect={() => { NProgress.start(); router.push(`/inventory/${product.id}`); }} disabled={!canManageStock}>
                            <Edit className="mr-2 h-4 w-4" /> Full Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setQuickEditProduct(product) }} disabled={!canManageStock}>
                            <Edit className="mr-2 h-4 w-4" /> Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setBarcodeProduct(product); }} disabled={!product.sku}>
                            <BarcodeIcon className="mr-2 h-4 w-4" /> Print Barcode
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); setSelectedProductIds([product.id]); }} disabled={!canManageStock}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed rounded-lg m-6">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">{searchTerm || stockFilter !== 'all' || categoryFilter !== 'all' ? 'No Products Found' : 'No Products Yet'}</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {searchTerm || stockFilter !== 'all' || categoryFilter !== 'all' ? `Your search and filter criteria did not match any products.` : 'Get started by adding your first product or importing a CSV file.'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" asChild className="h-8 gap-1">
                  <Link href="/inventory/add">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sm:whitespace-nowrap">
                      Add Product
                    </span>
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsImportOpen(true)}>
                  <Upload className="h-3.5 w-3.5" />
                  <span className="sm:whitespace-nowrap">
                    Import
                  </span>
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
    </div>
  );
}
