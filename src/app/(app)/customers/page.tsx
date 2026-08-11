
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, User, Upload, ChevronRight, Loader2, Trash2, Award, ChevronLeft, Pencil, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Customer } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import { usePOS } from '@/context/pos-context';
import { useI18n } from '@/context/i18n-context';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import ImportCustomersDialog from '@/components/customers/import-customers-dialog';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import { logAuditEvent } from '@/lib/audit';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CustomerRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-12"><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-5 w-full" />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-5 w-full" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-5 w-full" />
      </TableCell>
      <TableCell className="text-end">
        <Skeleton className="h-5 w-1/2 ms-auto" />
      </TableCell>
      <TableCell className="text-end">
        <Skeleton className="h-8 w-8 ms-auto rounded-md" />
      </TableCell>
    </TableRow>
  )
}

const CUSTOMERS_PER_PAGE_WEB = 500;
const CUSTOMERS_PER_PAGE_NATIVE = 100000;

export default function CustomersPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isNative, setIsNative] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setIsNative(typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__);
  }, []);

  const itemsPerPage = isNative ? CUSTOMERS_PER_PAGE_NATIVE : CUSTOMERS_PER_PAGE_WEB;
  const { 
    customers, 
    receipts,
    isLoading: isPosLoading, 
    business, 
    currentUserProfile: currentUser, 
    triggerRefresh, 
    isFullSyncingCustomers,
    searchCustomers
  } = usePOS();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const firestore = useFirestore();

  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'recent' | 'spent' | 'loyalty' | 'name'>('spent');
  const [searchedCustomers, setSearchedCustomers] = React.useState<Customer[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  // Customers are fetched and branch-filtered by pos-context (via `customers`).
  // We do NOT run a separate Firestore query here as it would bypass branch filtering.

  const [isDataLoaded, setIsDataLoaded] = React.useState(false);
  


  // Always use the branch-filtered customers from POS context
  const displayCustomers = customers;
  
  const isLoading = isNative 
    ? (isPosLoading && (!customers || customers.length === 0))
    : isPosLoading;

  // Prevent flicker of "No Customers Found"
  React.useEffect(() => {
    if (isNative && customers && customers.length > 0) {
      setIsDataLoaded(true);
      return;
    }
    if (!isPosLoading && displayCustomers !== null) {
      // Small delay to ensure any background syncs have a chance to start
      const timer = setTimeout(() => setIsDataLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isPosLoading, displayCustomers, isNative, customers]);

  // Global Search Logic
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCustomers(searchTerm);
        setSearchedCustomers(results);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchCustomers]);

  const filtered = React.useMemo(() => {
    const receiptTotals: Record<string, number> = {};
    if (receipts) {
      receipts.forEach(r => {
        if (r.customer?.id) {
          receiptTotals[r.customer.id] = (receiptTotals[r.customer.id] || 0) + (Number(r.total) || 0);
        }
      });
    }

    let base = [...(displayCustomers || [])].map(c => {
      const fromReceipts = receiptTotals[c.id] || 0;
      return {
        ...c,
        computedTotalSpent: Math.max(Number(c.totalSpent) || 0, fromReceipts)
      };
    });
    
    // Combine with remote search results
    if (searchedCustomers && searchedCustomers.length > 0) {
      searchedCustomers.forEach(rc => {
        if (!base.find(bc => bc.id === rc.id)) {
          const fromReceipts = receiptTotals[rc.id] || 0;
          base.push({
            ...rc,
            computedTotalSpent: Math.max(Number(rc.totalSpent) || 0, fromReceipts)
          } as any);
        }
      });
    }

    let filtered = searchTerm.trim() 
      ? base.filter(c => 
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone?.includes(searchTerm) ||
          c.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : base;

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'spent') {
        return (Number((b as any).computedTotalSpent) || 0) - (Number((a as any).computedTotalSpent) || 0);
      }
      if (sortBy === 'loyalty') {
        return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: recent (createdAt)
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return Number(dateB) - Number(dateA);
    });

    return filtered;
  }, [searchTerm, displayCustomers, sortBy, searchedCustomers, receipts]);

  const currencySymbol = React.useMemo(() => {
    const code = business?.settings?.currency || 'NGN';
    return CURRENCY_SYMBOLS[code] || '₦';
  }, [business]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedCustomerIds(filtered.map(c => c.id));
    } else {
      setSelectedCustomerIds([]);
    }
  };

  const handleRowSelect = (customerId: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedCustomerIds.length === 0 || !business || !currentUser) {
      toast({ title: t('toast.error'), description: t('customers.deleteFailedSession'), variant: 'destructive' });
      return;
    }

    const batch = writeBatch(firestore);
    const auditPromises: Promise<void>[] = [];

    selectedCustomerIds.forEach(id => {
      const docRef = doc(firestore, 'customers', id);
      batch.delete(docRef);

      const deletedCustomer = displayCustomers?.find(p => p.id === id);
      if (deletedCustomer) {
        auditPromises.push(logAuditEvent(firestore, business.id, currentUser, {
          action: 'customer.delete',
          entity: { type: 'Customer', id: id, name: deletedCustomer.name },
          details: { customerName: deletedCustomer.name, customerEmail: deletedCustomer.email }
        }));
      }
    });

    try {
      await batch.commit();
      await Promise.all(auditPromises);

      toast({
        variant: 'success',
        title: t('customers.deletedTitle'),
        description: t('customers.deletedDescription', { count: selectedCustomerIds.length }),
      });
      setSelectedCustomerIds([]);
      triggerRefresh();
    } catch (e) {
      toast({ variant: 'destructive', title: t('toast.error'), description: t('customers.deleteFailed') });
    }
    setIsDeleteDialogOpen(false);
  };

  if (!mounted) return null;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('customers.title')}
                {isFullSyncingCustomers && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <div className="relative w-full max-w-sm group">
                  <User className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder={t('customers.searchNameEmailCode')}
                    className="ps-8 pe-8 ring-offset-background focus-visible:ring-primary"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute end-2.5 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-between font-normal bg-background">
                      <span>
                        {sortBy === 'spent'
                          ? t('customers.sortBiggestSpender')
                          : sortBy === 'loyalty'
                            ? t('customers.sortTopLoyalty')
                            : sortBy === 'name'
                              ? t('customers.sortName')
                              : t('customers.sortMostRecent')}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 ms-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    <DropdownMenuItem onClick={() => setSortBy('spent')}>{t('customers.sortBiggestSpender')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('loyalty')}>{t('customers.sortTopLoyalty')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>{t('customers.sortName')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('recent')}>{t('customers.sortMostRecent')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const visibleSelectedCount = selectedCustomerIds.filter(id => filtered.some(c => c.id === id)).length;
                return visibleSelectedCount > 0 && (
                  <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      {t('customers.deleteSelected', { count: visibleSelectedCount })}
                    </span>
                  </Button>
                );
              })()}

              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {t('common.import')}
                </span>
              </Button>
              <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddCustomerOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {t('customers.addCustomer')}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox disabled /></TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('customers.codeCol')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('common.phone')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('customers.loyaltyPoints')}</TableHead>
                  <TableHead className="text-end">{t('customers.totalSpent')}</TableHead>
                  <TableHead className="text-end text-destructive">{t('customers.debtCol')}</TableHead>
                  <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
              </TableBody>
            </Table>
          ) : !isDataLoaded ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox disabled /></TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('customers.codeCol')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('common.phone')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('customers.loyaltyPoints')}</TableHead>
                  <TableHead className="text-end">{t('customers.totalSpent')}</TableHead>
                  <TableHead className="text-end text-destructive">{t('customers.debtCol')}</TableHead>
                  <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
              </TableBody>
            </Table>
          ) : filtered && filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filtered.length > 0 && selectedCustomerIds.length === filtered.length ? true : selectedCustomerIds.length > 0 ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('customers.codeCol')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('common.phone')}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      {t('customers.loyaltyPoints')}
                    </div>
                  </TableHead>
                  <TableHead className="text-end">{t('customers.totalSpent')}</TableHead>
                  <TableHead className="text-end text-destructive">{t('customers.debtCol')}</TableHead>
                  <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => {
                  const totalSpent = (customer as any).computedTotalSpent ?? customer.totalSpent ?? 0;
                  const customerReceipts = (receipts || []).filter(r => r.customer?.id === customer.id && r.status === 'unpaid');
                  const debt = customerReceipts.reduce((sum, r) => sum + r.total, 0);
                  return (
                    <TableRow 
                      key={customer.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, input')) return;
                        NProgress.start(); 
                        router.push(`/customers/details?id=${customer.id}`); 
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedCustomerIds.includes(customer.id)}
                          onCheckedChange={() => handleRowSelect(customer.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {customer.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {customer.code ? (
                          <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{customer.code}</span>
                        ) : t('customers.notAvailable')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{customer.phone || t('customers.notAvailable')}</TableCell>
                      <TableCell className="hidden md:table-cell">{customer.loyaltyPoints || 0}</TableCell>
                      <TableCell className="text-end">{currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-end text-destructive font-bold">
                        {debt > 0 ? `${currencySymbol}${debt.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomerToEdit(customer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { NProgress.start(); router.push(`/customers/details?id=${customer.id}`); }}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed rounded-lg">
              <User className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">{t('customers.noneFound')}</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {searchTerm ? t('customers.noneFoundSearch') : t('customers.noneFoundHint')}
              </p>
              {!searchTerm && (
                <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddCustomerOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    {t('customers.addCustomer')}
                  </span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
        {filtered && filtered.length > 0 && (
          <CardFooter className="flex flex-col border-t py-4 gap-4">
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{t('customers.matched', { count: filtered.length })}</span>
              </div>
              {searchTerm && (
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setSearchTerm('')}>
                  {t('customers.clearFilters')}
                </Button>
              )}
            </div>

            {/* Background Sync & Deep Retrieval Bridge */}
            {isFullSyncingCustomers && (
              <div className="flex flex-col items-center justify-center pt-4 border-t w-full space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {t('customers.syncingCatalog')}
                </div>
              </div>
            )}
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('customers.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customers.deleteConfirmBody', { count: selectedCustomerIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentUser?.businessId && (
        <AddCustomerDialog
          isOpen={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          businessId={currentUser.businessId}
          customers={displayCustomers}
        />
      )}
      {currentUser?.businessId && (
        <ImportCustomersDialog
          isOpen={isImportOpen}
          onOpenChange={setIsImportOpen}
          businessId={currentUser.businessId}
          existingCustomers={displayCustomers || []}
          onSuccess={() => {
            triggerRefresh();
            setIsImportOpen(false);
          }}
        />
      )}
      <EditCustomerDialog
        isOpen={!!customerToEdit}
        onOpenChange={(open) => !open && setCustomerToEdit(null)}
        customer={customerToEdit}
      />
    </>
  );
}
