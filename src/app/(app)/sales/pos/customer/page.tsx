
'use client';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePOS } from "@/context/pos-context";
import { PlusCircle, Search, User, UserCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Customer, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

function AddCustomerForm({ businessId, onCustomerAdded }: { businessId: string, onCustomerAdded: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { triggerRefresh, customers } = usePOS();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            toast({ title: 'Missing fields', description: 'Name and email are required.', variant: 'destructive' });
            return;
        }

        const emailExists = customers?.some(c => c.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            toast({ title: 'Customer Exists', description: 'A customer with this email already exists.', variant: 'destructive' });
            return;
        }

        if (phone) {
            const phoneExists = customers?.some(c => c.phone === phone);
            if (phoneExists) {
                toast({ title: 'Duplicate Phone Number', description: 'A customer with this phone number already exists.', variant: 'destructive' });
                return;
            }
        }

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'customers'), {
                name,
                email,
                phone,
                businessId,
                loyaltyPoints: 0,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Customer Added', description: `${name} has been added.`, variant: 'success' });
            triggerRefresh();
            onCustomerAdded();
        } catch (error) {
            toast({ title: 'Error', description: 'Could not add customer.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right">Name</label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="email" className="text-right">Email</label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="phone" className="text-right">Phone</label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Customer
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function CustomerPage() {
    const { selectedCustomer, selectCustomer, customers, isLoading: isPosLoading, currentUserProfile: currentUser, searchCustomers } = usePOS();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [searchedCustomers, setSearchedCustomers] = React.useState<Customer[] | null>(null);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
    const [isNavigating, setIsNavigating] = React.useState(false);

    const filteredCustomers = searchedCustomers || customers || [];
    const isLoading = isPosLoading || isSearching;

    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim()) {
                setIsSearching(true);
                const results = await searchCustomers(searchTerm);
                setSearchedCustomers(results);
                setIsSearching(false);
            } else {
                setSearchedCustomers(null);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, searchCustomers]);



    const handleNext = () => {
        setIsNavigating(true);
        router.push('/sales/pos/payment');
    };

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Select a Customer</CardTitle>
                        <CardDescription>Search for an existing customer or add a new one.</CardDescription>
                        <div className="flex items-center gap-4 pt-4">
                            <div className="relative w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search customers by name or email..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add New
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New Customer</DialogTitle>
                                        <DialogDescription>
                                            Enter the details for the new customer.
                                        </DialogDescription>
                                    </DialogHeader>
                                    {currentUser?.businessId && <AddCustomerForm businessId={currentUser.businessId} onCustomerAdded={() => setIsAddCustomerOpen(false)} />}
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : filteredCustomers && filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                                <button key={customer.id} onClick={() => selectCustomer(customer)} className="w-full text-left">
                                    <Card className={selectedCustomer?.id === customer.id ? "border-primary" : ""}>
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{customer.name}</p>
                                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                                            </div>
                                            {selectedCustomer?.id === customer.id && <UserCheck className="h-5 w-5 text-primary" />}
                                        </CardContent>
                                    </Card>
                                </button>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center pt-8">{searchTerm ? "No customers found." : "No customers added yet."}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Selected Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        {selectedCustomer ? (
                            <div>
                                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="font-semibold mt-2">{selectedCustomer.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                                <Button variant="link" onClick={() => selectCustomer(null)}>Clear selection</Button>
                            </div>
                        ) : (
                            <div className="py-8">
                                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">No customer selected.</p>
                                <p className="text-xs text-muted-foreground">This is optional.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/sales/pos/select-products">Back</Link>
                        </Button>
                        <Button className="w-full" onClick={handleNext} disabled={isNavigating}>
                            {isNavigating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next: Payment
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
