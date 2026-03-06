
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
import { PlusCircle, User, Upload, ChevronRight, Loader2, Trash2, Award, ChevronLeft, Pencil } from "lucide-react";
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { Customer } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import { usePOS, CURRENCY_SYMBOLS } from '@/context/pos-context';
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
      <TableCell className="text-right">
        <Skeleton className="h-5 w-1/2 ml-auto" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 ml-auto rounded-md" />
      </TableCell>
    </TableRow>
  )
}

const CUSTOMERS_PER_PAGE = 10;

export default function CustomersPage() {
  const { customers, receipts, isLoading: isPosLoading, business, currentUserProfile: currentUser, triggerRefresh, searchCustomers } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);

  const [displayedCustomers, setDisplayedCustomers] = React.useState<Customer[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'recent' | 'spent' | 'loyalty' | 'name'>('spent');

  const isLoading = isPosLoading || isSearching;

  const customerTotals = React.useMemo(() => {
    const totals: Record<string, { total: number }> = {};
    if (receipts) {
      for (const receipt of receipts) {
        if (receipt.customer?.id) {
          if (!totals[receipt.customer.id]) {
            totals[receipt.customer.id] = { total: 0 };
          }
          totals[receipt.customer.id].total += receipt.total;
        }
      }
    }
    return totals;
  }, [receipts]);

  React.useEffect(() => {
    if (!customers) {
      setDisplayedCustomers(null);
      return;
    }

    let filtered = [...customers];

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => {
        return (
          (customer.name && customer.name.toLowerCase().includes(lowerTerm)) ||
          (customer.email && customer.email.toLowerCase().includes(lowerTerm)) ||
          (customer.code && customer.code.toLowerCase().includes(lowerTerm)) ||
          (customer.phone && customer.phone.toLowerCase().includes(lowerTerm))
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'spent') {
        const spentA = customerTotals[a.id]?.total ?? 0;
        const spentB = customerTotals[b.id]?.total ?? 0;
        return spentB - spentA;
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

    setDisplayedCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, customers, sortBy, customerTotals]);

  const paginatedCustomers = React.useMemo(() => {
    if (!displayedCustomers) return [];
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    return displayedCustomers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [displayedCustomers, currentPage]);

  const pageCount = Math.ceil((displayedCustomers?.length || 0) / CUSTOMERS_PER_PAGE);

  const currencySymbol = React.useMemo(() => {
    const code = business?.settings?.currency || 'NGN';
    return CURRENCY_SYMBOLS[code] || '₦';
  }, [business]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedCustomerIds(displayedCustomers?.map(c => c.id) || []);
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
      toast({ title: 'Error', description: 'Could not perform deletion. Session data missing.', variant: 'destructive' });
      return;
    }

    const batch = writeBatch(firestore);
    const auditPromises: Promise<void>[] = [];

    selectedCustomerIds.forEach(id => {
      const docRef = doc(firestore, 'customers', id);
      batch.delete(docRef);

      const deletedCustomer = customers?.find(p => p.id === id);
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
      // Ensure audit logs are written (best effort, but awaited so they run)
      await Promise.all(auditPromises);

      toast({ variant: 'success', title: 'Customers Deleted', description: `${selectedCustomerIds.length} customers have been removed.` });
      setSelectedCustomerIds([]);
      triggerRefresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete customers.' });
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customers</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <div className="relative w-full max-w-sm">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or unique code..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spent">Biggest Spender</SelectItem>
                    <SelectItem value="loyalty">Top Loyalty</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedCustomerIds.length > 0 && (
                <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Delete ({selectedCustomerIds.length})
                  </span>
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Import
                </span>
              </Button>
              <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddCustomerOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Customer
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
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Loyalty Points</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
                <CustomerRowSkeleton />
              </TableBody>
            </Table>
          ) : displayedCustomers && displayedCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={displayedCustomers.length > 0 && selectedCustomerIds.length === displayedCustomers.length ? true : selectedCustomerIds.length > 0 ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      Loyalty Points
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => {
                  const totalSpent = customerTotals[customer.id]?.total ?? 0;
                  return (
                    <TableRow key={customer.id} data-state={selectedCustomerIds.includes(customer.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomerIds.includes(customer.id)}
                          onCheckedChange={() => handleRowSelect(customer.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className="font-medium hover:underline cursor-pointer"
                          onClick={() => { NProgress.start(); router.push(`/customers/${customer.id}`); }}
                        >
                          {customer.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {customer.code ? (
                          <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{customer.code}</span>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{customer.phone || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{customer.loyaltyPoints || 0}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomerToEdit(customer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { NProgress.start(); router.push(`/customers/${customer.id}`); }}>
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
              <h3 className="text-xl font-semibold mt-4">No Customers Found</h3>
              <p className="text-muted-foreground mt-2 mb-4">Get started by adding your first customer.</p>
              <Button size="sm" asChild className="h-8 gap-1">
                <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddCustomerOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Customer
                  </span>
                </Button>
              </Button>
            </div>
          )}
        </CardContent>
        {displayedCustomers && displayedCustomers.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t py-4">
            <div className="text-sm text-muted-foreground">
              Showing <strong>{(currentPage - 1) * CUSTOMERS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * CUSTOMERS_PER_PAGE, displayedCustomers.length)}</strong> of <strong>{displayedCustomers.length}</strong> customers
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
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCustomerIds.length} customer(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentUser?.businessId && (
        <AddCustomerDialog
          isOpen={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          businessId={currentUser.businessId}
          customers={customers}
        />
      )}
      {currentUser?.businessId && (
        <ImportCustomersDialog
          isOpen={isImportOpen}
          onOpenChange={setIsImportOpen}
          businessId={currentUser.businessId}
          existingCustomers={customers || []}
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
