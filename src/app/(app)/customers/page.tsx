
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { PlusCircle, User, Upload, ChevronRight } from "lucide-react";
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import type { Customer } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import { usePOS, CURRENCY_SYMBOLS } from '@/context/pos-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import ImportCustomersDialog from '@/components/customers/import-customers-dialog';
import RefreshButton from '@/components/shared/refresh-button';
import { useRouter } from 'next/navigation';

function CustomerRowSkeleton() {
    return (
        <TableRow>
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


export default function CustomersPage() {
  const { customers, receipts, isLoading, business, currentUserProfile: currentUser } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

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

  const currencySymbol = React.useMemo(() => {
    const code = business?.settings?.currency || 'NGN';
    return CURRENCY_SYMBOLS[code] || '₦';
  }, [business]);

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Customers</CardTitle>
                <CardDescription>
                Manage your customers and view their purchase history.
                </CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <RefreshButton />
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
                    <TableHead>Name</TableHead>
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
        ) : customers && customers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Loyalty Points</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const totalSpent = customerTotals[customer.id]?.total ?? 0;
              return (
              <TableRow key={customer.id} className="cursor-pointer" onClick={() => router.push(`/customers/${customer.id}`)}>
                <TableCell>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.email}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{customer.phone || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">{customer.loyaltyPoints || 0}</TableCell>
                <TableCell className="text-right">{currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
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
    </Card>
    {currentUser?.businessId && (
        <AddCustomerDialog
            isOpen={isAddCustomerOpen}
            onOpenChange={setIsAddCustomerOpen}
            businessId={currentUser.businessId}
        />
    )}
     {currentUser?.businessId && (
        <ImportCustomersDialog
            isOpen={isImportOpen}
            onOpenChange={setIsImportOpen}
            businessId={currentUser.businessId}
            existingCustomers={customers || []}
            onSuccess={() => setIsImportOpen(false)}
        />
     )}
    </>
  );
}
