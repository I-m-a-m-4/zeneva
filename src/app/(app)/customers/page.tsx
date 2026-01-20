
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
import { PlusCircle, User, MoreHorizontal, Edit, Trash2, Upload } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, deleteDoc } from 'firebase/firestore';
import type { Customer, UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import AddCustomerDialog from '@/components/customers/add-customer-dialog';
import { useBusiness, CURRENCY_SYMBOLS } from '@/context/pos-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditCustomerDialog from '@/components/customers/edit-customer-dialog';
import ImportCustomersDialog from '@/components/customers/import-customers-dialog';

// Hook to get current user's profile
function useCurrentUserProfile() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);
    return { profile: userProfile, isLoading };
}

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
  const { profile: currentUser, isLoading: isProfileLoading } = useCurrentUserProfile();
  const firestore = useFirestore();
  const business = useBusiness();
  const { toast } = useToast();

  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);

  const customersQuery = useMemoFirebase(() => {
    if (!currentUser?.businessId || !firestore) return null;
    return query(collection(firestore, "customers"), where("businessId", "==", currentUser.businessId));
  }, [currentUser?.businessId, firestore]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const currencySymbol = React.useMemo(() => {
    const code = business?.settings?.currency || 'NGN';
    return CURRENCY_SYMBOLS[code] || '₦';
  }, [business]);

  const isLoading = isProfileLoading || isLoadingCustomers;

  const handleDeleteCustomer = async () => {
    if (!customerToDelete || !firestore) return;
    const customerRef = doc(firestore, 'customers', customerToDelete.id);
    try {
        await deleteDoc(customerRef);
        toast({ title: 'Customer Deleted', description: `${customerToDelete.name} has been removed.`, variant: 'success' });
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete customer.', variant: 'destructive' });
    } finally {
        setCustomerToDelete(null);
    }
  };

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
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.email}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{customer.phone || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">{customer.loyaltyPoints || 0}</TableCell>
                <TableCell className="text-right">{currencySymbol}0.00</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setCustomerToEdit(customer); }}>
                            <Edit className="mr-2 h-4 w-4"/> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => { e.preventDefault(); setCustomerToDelete(customer); }}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
    <EditCustomerDialog
        isOpen={!!customerToEdit}
        onOpenChange={(open) => !open && setCustomerToEdit(null)}
        customer={customerToEdit}
    />
    <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the customer <strong>{customerToDelete?.name}</strong>. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive hover:bg-destructive/90">Delete Customer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
