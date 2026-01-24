'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { usePOS } from "@/context/pos-context";
import { PlusCircle, Search, ShoppingCart, Trash2, Package, PackageOpen, Columns, Loader2, ChevronsUp, ListFilter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import *as React from "react";
import type { Product } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

function ProductCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <Skeleton className="w-full h-32" />
            </CardContent>
            <CardHeader className="p-2 h-20">
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardFooter className="p-2 flex justify-between items-center">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-7 w-7 rounded-full" />
            </CardFooter>
        </Card>
    );
}

const CartContents = () => {
    const { cart, removeFromCart, updateQuantity, subtotal, currencySymbol } = usePOS();
    return (
        <>
            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                    <ShoppingCart className="h-12 w-12" />
                    <p className="mt-4">Your cart is empty.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">{currencySymbol}{item.product.price.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                                    className="w-16 h-8"
                                    min="1"
                                    max={item.product.stock}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeFromCart(item.product.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>{currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}
        </>
    );
};


export default function SelectProductsPage() {
    const { cart, addToCart, subtotal, currencySymbol, products, isLoading, business } = usePOS();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [columnClass, setColumnClass] = React.useState('lg:grid-cols-4');
    const [isNavigating, setIsNavigating] = React.useState(false);
    
    React.useEffect(() => {
        if (business) {
            const isTrialActive = business.trialExpiresAt && business.trialExpiresAt.toDate() > new Date();
            const isPaidPlan = business.plan && business.plan !== 'starter';
            const isLifetime = business.accessLevel === 'lifetime';

            if (!isTrialActive && !isPaidPlan && !isLifetime) {
            toast({
                variant: 'destructive',
                title: 'Subscription Required',
                description: 'Please subscribe to a plan to create sales.',
            });
            router.push('/billing');
            }
        }
    }, [business, router, toast]);

    const filteredProducts = React.useMemo(() => {
        if (!products) return [];
        
        let filtered = products;

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === categoryFilter);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        return filtered;
    }, [products, searchTerm, categoryFilter]);
    
    const handleAddToCart = (product: Product) => {
        addToCart(product);
    };

    const handleNext = () => {
        setIsNavigating(true);
        router.push('/sales/pos/customer');
    };

    return (
        <div className="grid md:grid-cols-3 md:gap-8">
            <div className="md:col-span-2">
                 <div className="flex items-center mb-4 gap-4 sticky top-0 bg-background py-2 z-10">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or SKU..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="hidden sm:inline-flex h-10">
                                <ListFilter className="h-4 w-4 mr-2" />
                                Filter
                                {categoryFilter !== 'all' && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ml-2">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                                <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                                {business?.settings?.productCategories?.map(cat => (
                                    <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Select onValueChange={setColumnClass} defaultValue={columnClass}>
                        <SelectTrigger className="w-[150px] hidden lg:flex">
                           <Columns className="h-4 w-4 mr-2" />
                           <SelectValue placeholder="Layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="lg:grid-cols-3">3 Columns</SelectItem>
                            <SelectItem value="lg:grid-cols-4">4 Columns</SelectItem>
                            <SelectItem value="lg:grid-cols-5">5 Columns</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="pb-24 md:pb-0">
                    {isLoading ? (
                        <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-4", columnClass)}>
                            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    ) : filteredProducts && filteredProducts.length > 0 ? (
                        <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-4", columnClass)}>
                            {filteredProducts.map(product => (
                                <Card key={product.id} className="overflow-hidden flex flex-col">
                                    <CardContent className="p-0 relative aspect-square w-full">
                                    {product.imageUrl ? (
                                        <Image
                                            src={product.imageUrl}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                            data-ai-hint={product.imageHint}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                            <Package size={48} />
                                        </div>
                                    )}
                                    </CardContent>
                                    <CardHeader className="p-2 flex-grow flex justify-center">
                                        <CardTitle className="text-sm font-medium leading-snug">{product.name}</CardTitle>
                                    </CardHeader>
                                    <CardFooter className="p-2 flex justify-between items-center mt-auto">
                                        <span className="text-sm font-semibold">{currencySymbol}{product.price.toLocaleString()}</span>
                                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleAddToCart(product)}>
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                            <PackageOpen className="h-12 w-12 text-muted-foreground" />
                            <h3 className="text-xl font-semibold mt-4">No Products Found</h3>
                            <p className="text-muted-foreground mt-2 mb-4">
                                {searchTerm || categoryFilter !== 'all' ? `No products match your search or filter criteria.` : "You haven't added any products yet."}
                            </p>
                            {!searchTerm && categoryFilter === 'all' && (
                                <Button size="sm" asChild className="h-8 gap-1">
                                    <Link href="/inventory/add">
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="sm:whitespace-nowrap">
                                        Add Product
                                    </span>
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Desktop Cart */}
            <div className="hidden md:block">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            <span>Cart</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ScrollArea className="h-96 pr-3">
                           <CartContents />
                       </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleNext} disabled={cart.length === 0 || isNavigating}>
                            {isNavigating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next: Customer
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Mobile Cart Sheet */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="default" className="fixed bottom-[70px] left-4 right-4 z-20 h-16 shadow-lg rounded-xl text-lg">
                             <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                     <ChevronsUp className="h-5 w-5"/>
                                    <span>View Cart ({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
                                </div>
                                <span>{currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                             </div>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[75%] flex flex-col">
                        <SheetHeader className="p-4 border-b text-left">
                            <SheetTitle>Your Cart</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="flex-1 p-4">
                            <CartContents />
                        </ScrollArea>
                        <SheetFooter className="p-4 border-t bg-background">
                            <Button className="w-full" size="lg" onClick={handleNext} disabled={cart.length === 0 || isNavigating}>
                                {isNavigating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Next: Customer
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    )
}
