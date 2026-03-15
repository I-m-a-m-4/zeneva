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
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { QrCode } from "lucide-react";

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

const ProductItem = React.memo(({ product, currencySymbol, handleAddToCart, addToCart }: {
    product: Product,
    currencySymbol: string,
    handleAddToCart: (product: Product) => void,
    addToCart: any
}) => {
    return (
        <Card key={product.id} className="overflow-hidden flex flex-col shadow-none border-[0.5px] border-border/40 bg-card/40 rounded-xl backdrop-blur-sm">
            <CardContent className="p-4 relative aspect-square w-full bg-muted/20 flex items-center justify-center">
                {product.imageUrl ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                        <Package size={48} />
                    </div>
                )}
            </CardContent>
            <CardHeader className="px-4 py-1 flex-grow">
                <CardTitle className="text-sm font-medium leading-tight line-clamp-3 min-h-[3.25rem] text-foreground">{product.name}</CardTitle>
            </CardHeader>
            <CardFooter className="px-4 pb-4 pt-0 flex justify-between items-end mt-auto">
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground dark:text-white">{currencySymbol}{product.price.toLocaleString()}</span>
                    {product.baseUnit && <span className="text-[10px] text-muted-foreground">per {product.baseUnit}</span>}
                </div>

                {product.uomConversions && product.uomConversions.length > 0 ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg border-border/50 hover:bg-accent flex items-center justify-center">
                                <PlusCircle className="h-6 w-6 text-foreground dark:text-white" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Select Unit</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup onValueChange={(unit) => {
                                if (unit === 'base') {
                                    handleAddToCart(product);
                                } else {
                                    const uom = product.uomConversions?.find(u => u.unitName === unit);
                                    if (uom) {
                                        addToCart(product, uom.unitName, uom.multiplier, uom.price);
                                    }
                                }
                            }}>
                                <DropdownMenuRadioItem value="base">1 {product.baseUnit || 'Piece'} ({currencySymbol}{product.price.toLocaleString()})</DropdownMenuRadioItem>
                                {product.uomConversions.map((uom) => (
                                    <DropdownMenuRadioItem key={uom.unitName} value={uom.unitName}>
                                        1 {uom.unitName} ({uom.multiplier} {product.baseUnit || 'pcs'}) - {currencySymbol}{(uom.price || product.price).toLocaleString()}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg border-border/50 hover:bg-accent flex items-center justify-center" onClick={() => handleAddToCart(product)}>
                        <PlusCircle className="h-6 w-6 text-foreground dark:text-white" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
});

ProductItem.displayName = 'ProductItem';

const CartContents = () => {
    const { cart, removeFromCart, updateQuantity, subtotal, currencySymbol, clearCart } = usePOS();
    return (
        <>
            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                    <ShoppingCart className="h-12 w-12" />
                    <p className="mt-4">Your cart is empty.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCart}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5 px-2 text-xs font-medium"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear Cart
                        </Button>
                    </div>
                    {cart.map(item => {
                        const cartItemId = item.unit ? `${item.product.id}-${item.unit}` : item.product.id;
                        return (
                            <div key={cartItemId} className="flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                    <p className="font-medium text-sm line-clamp-1">
                                        {item.product.name}
                                        {item.unit && <Badge variant="secondary" className="ml-2 text-[10px] py-0 h-4">{item.unit}</Badge>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{currencySymbol}{item.product.price.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(cartItemId, parseInt(e.target.value))}
                                        className="w-16 h-8 text-center"
                                        min="1"
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeFromCart(cartItemId)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
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
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);

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

    const handleAddToCart = React.useCallback((product: Product) => {
        addToCart(product);
    }, [addToCart]);

    const handleScan = (sku: string) => {
        const product = products?.find(p => p.sku === sku);
        if (product) {
            addToCart(product);
            toast({
                title: "Product Added",
                description: `${product.name} has been added to the cart.`,
            });
            setIsScannerOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Product Not Found",
                description: `No product found with SKU: ${sku}`,
            });
        }
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const exactMatch = products?.find(p =>
                                        p.sku?.toLowerCase() === searchTerm.toLowerCase() ||
                                        p.name.toLowerCase() === searchTerm.toLowerCase()
                                    );
                                    if (exactMatch) {
                                        handleAddToCart(exactMatch);
                                        setSearchTerm('');
                                        toast({
                                            title: "Product Added",
                                            description: `${exactMatch.name} has been added to the cart.`,
                                        });
                                    }
                                }
                            }}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 md:hidden shrink-0 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => setIsScannerOpen(true)}
                    >
                        <QrCode className="h-5 w-5" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 gap-1.5">
                                <ListFilter className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">Filter</span>
                                {categoryFilter !== 'all' && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ml-1">1</Badge>}
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
                                <ProductItem
                                    key={product.id}
                                    product={product}
                                    currencySymbol={currencySymbol}
                                    handleAddToCart={handleAddToCart}
                                    addToCart={addToCart}
                                />
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
                                    <ChevronsUp className="h-5 w-5" />
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

            {isScannerOpen && (
                <BarcodeScanner
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScan}
                />
            )}
        </div>
    )
}
