'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { usePOS } from "@/context/pos-context";
import { PlusCircle, Search, ShoppingCart, Trash2, Package, PackageOpen, Columns, Loader2, ChevronsUp, ListFilter, Archive, History, Clock } from "lucide-react";
import { CachedImage } from "@/components/shared/cached-image";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { QrCode } from "lucide-react";
import { ImageDialog } from "@/components/shared/image-dialog";
import HeldSalesDrawer from "@/components/pos/held-sales-drawer";
import { useI18n } from "@/context/i18n-context";


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

const ProductItem = React.memo(({ product, currencySymbol, handleAddToCart, addToCart, onPreview }: {
    product: Product,
    currencySymbol: string,
    handleAddToCart: (product: Product) => void,
    addToCart: any,
    onPreview: (src: string, alt: string) => void
}) => {
    const { t } = useI18n();
    return (
        <Card key={product.id} className="overflow-hidden flex flex-col shadow-none border-[0.5px] border-border/40 bg-card/40 rounded-xl backdrop-blur-sm">
            <CardContent 
                className="p-4 relative h-44 w-full bg-muted/20 flex items-center justify-center cursor-zoom-in"
                onClick={() => product.imageUrl && onPreview(product.imageUrl, product.name)}
            >
                {product.imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <CachedImage
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain hover:scale-105 transition-transform"
                        />
                    </div>

                ) : (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                        <Package size={40} />
                    </div>
                )}
            </CardContent>
            <CardHeader className="px-4 py-1 flex-grow">
                <CardTitle className="text-sm font-medium leading-tight line-clamp-3 min-h-[3.25rem] text-foreground flex items-center gap-1.5 flex-wrap">
                    <Link
                        href={`/inventory/details?id=${product.id}`}
                        className="hover:text-primary hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {product.name}
                    </Link>
                    {(product.categoryType === 'service' || product.category?.toLowerCase() === 'service' || product.category?.toLowerCase() === 'services') ? (
                        <Badge variant="outline" className="text-[10px] h-4 bg-blue-500/10 text-blue-500 border-blue-500/20 px-1 py-0">{t('pos.serviceBadge')}</Badge>
                    ) : (
                        (product.stock || 0) <= 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1 py-0 bg-red-500/10 text-red-500 border-red-500/20">{t('pos.outOfStock')}</Badge>
                    )}
                </CardTitle>
            </CardHeader>

            <CardFooter className="px-4 pb-4 pt-0 flex justify-between items-end mt-auto">
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground dark:text-white"><span className="text-orange-500 mr-0.5">{currencySymbol}</span>{product.price.toLocaleString()}</span>
                    {product.baseUnit && <span className="text-[10px] text-muted-foreground">{t('pos.perUnit', { unit: product.baseUnit })}</span>}
                </div>

                {product.uomConversions && product.uomConversions.length > 0 ? (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg border-border/50 hover:bg-accent flex items-center justify-center">
                                <PlusCircle className="h-6 w-6 text-foreground dark:text-white" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('pos.selectUnit')}</DropdownMenuLabel>
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
                                <DropdownMenuRadioItem value="base">1 {product.baseUnit || t('pos.piece')} (<span className="text-orange-500 mr-0.5">{currencySymbol}</span>{product.price.toLocaleString()})</DropdownMenuRadioItem>
                                {product.uomConversions.map((uom) => (
                                    <DropdownMenuRadioItem key={uom.unitName} value={uom.unitName}>
                                        1 {uom.unitName} ({uom.multiplier} {product.baseUnit || t('pos.pcs')}) - <span className="text-orange-500 mr-0.5">{currencySymbol}</span>{(uom.price || product.price).toLocaleString()}
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
    const { 
        cart, 
        removeFromCart, 
        updateQuantity, 
        subtotal, 
        currencySymbol, 
        clearCart,
        holdCurrentSale,
        heldSales,
        resumeHeldSale,
        deleteHeldSale
    } = usePOS();
    const { t } = useI18n();

    // Suppress SSR/client hydration mismatch: cart is read from localStorage which
    // doesn't exist on the server. Render a neutral placeholder until mounted.
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <ShoppingCart className="h-12 w-12 opacity-20" />
            </div>
        );
    }

    return (
        <>
            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                    <ShoppingCart className="h-12 w-12" />
                    <p className="mt-4">{t('pos.cartEmpty')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => holdCurrentSale()}
                                className="h-8 gap-1.5 px-2 text-xs font-medium border-dashed"
                            >
                                <Archive className="h-3.5 w-3.5" />
                                {t('pos.hold')}
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCart}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5 px-2 text-xs font-medium"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('pos.clearCart')}
                        </Button>
                    </div>
                    {cart.map(item => {
                        const cartItemId = item.unit ? `${item.product.id}-${item.unit}` : item.product.id;
                        return (
                            <div key={cartItemId} className="flex justify-between items-center">
                                <div className="flex-1 me-4">
                                    <p className="font-medium text-sm line-clamp-1">
                                        {item.product.name}
                                        {item.unit && <Badge variant="secondary" className="ms-2 text-[10px] py-0 h-4">{item.unit}</Badge>}
                                    </p>
                                    <p className="text-xs text-muted-foreground"><span className="text-orange-500 mr-0.5">{currencySymbol}</span>{(item.product.price * item.quantity).toLocaleString()}</p>
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
                        <span>{t('common.subtotal')}</span>
                        <span><span className="text-orange-500 mr-0.5">{currencySymbol}</span>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}
        </>
    );
};


export default function SelectProductsPage() {
    const { 
        cart, 
        addToCart, 
        subtotal, 
        currencySymbol, 
        products, 
        isLoading: isPosLoading, 
        business,
        searchProducts,
        searchProductsByField,
        findProductBySku,
        fetchMoreProducts,
        isSyncing,
        isFullSyncingProducts,
        heldSales,
        resumeHeldSale,
        deleteHeldSale,
        holdCurrentSale
    } = usePOS();
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [columnClass, setColumnClass] = React.useState('lg:grid-cols-4');
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);


    const [previewImage, setPreviewImage] = React.useState<{ src: string, alt: string } | null>(null);


    // Subscription status is now managed by the background glassmorphism overlay in layout.tsx.

    const [isFetchingMore, setIsFetchingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(products ? products.length >= 50 : true);

    const isNative = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    // On native, one cached product is enough to render — the rest streams in.
    // On web there is no cache on a first login, and `isPosLoading` goes false
    // as soon as the listener attaches, which is before any document arrives.
    // Without the sync guard the grid falls straight through to "No products
    // found" while the catalogue is still downloading.
    const isLoading = isNative
        ? (isPosLoading && (!products || products.length === 0))
        : (isPosLoading || (isFullSyncingProducts && (!products || products.length === 0)));

    const performManualSearch = () => {
        if (!searchTerm.trim()) return;
        
        const exactMatch = products?.find(p =>
            p.sku?.toLowerCase() === searchTerm.toLowerCase() ||
            p.name.toLowerCase() === searchTerm.toLowerCase()
        );

        if (exactMatch) {
            addToCart(exactMatch);
            setSearchTerm('');
            toast({
                title: t('pos.addedToCart'),
                description: exactMatch.name
            });
        }
    };


    const filteredProducts = React.useMemo(() => {
        let base = [...(products || [])];
        
        // Apply instant local substring filter
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            base = base.filter(p => 
                p.name.toLowerCase().includes(lower) || 
                p.sku?.toLowerCase().includes(lower) ||
                p.category?.toLowerCase().includes(lower)
            );
        }

        if (categoryFilter !== 'all') {
            base = base.filter(p => p.category === categoryFilter);
        }

        return base;
    }, [products, searchTerm, categoryFilter]);

    const handleLoadMore = async () => {
        setIsFetchingMore(true);
        const count = await fetchMoreProducts();
        if (count === 0) setHasMore(false);
        setIsFetchingMore(false);
    };

    const handleAddToCart = React.useCallback((product: Product) => {
        addToCart(product);
    }, [addToCart]);

    const handleScan = (sku: string) => {
        const product = products?.find(p => p.sku === sku);
        
        if (product) {
            addToCart(product);
            toast({
                title: t('pos.productAdded'),
                description: t('pos.productAddedDescription', { name: product.name }),
            });
            setIsScannerOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: t('pos.productNotFound'),
                description: t('pos.productNotFoundDescription', { sku }),
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
                <div className="flex flex-col mb-4 gap-2 sticky top-0 bg-background py-2 z-10 border-b">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder={t('pos.searchNameOrSku')}
                                className="ps-8 ring-offset-background focus-visible:ring-primary h-11"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        performManualSearch();
                                    }
                                }}
                            />

                        </div>
                        <Button 
                            variant="secondary" 
                            size="icon"
                            className="h-11 w-11 shrink-0 border shadow-sm hover:shadow-md transition-all active:scale-95"
                            onClick={performManualSearch}
                            aria-label={t('common.search')}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 md:hidden shrink-0 border-primary/20 text-primary hover:bg-primary/5"
                            onClick={() => setIsScannerOpen(true)}
                            aria-label={t('pos.scanBarcode')}
                        >
                            <QrCode className="h-6 w-6" />
                        </Button>
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-11 gap-1.5 min-w-[44px]">
                                    <ListFilter className="h-4 w-4" />
                                    <span className="sr-only sm:not-sr-only">{t('inventory.filter')}</span>
                                    {categoryFilter !== 'all' && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center ms-1">1</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('pos.filterByCategory')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <DropdownMenuRadioItem value="all">{t('inventory.allCategories')}</DropdownMenuRadioItem>
                                    {business?.settings?.productCategories?.map(cat => (
                                        <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[150px] h-11 hidden lg:flex justify-between font-normal bg-background">
                                    <span className="flex items-center">
                                        <Columns className="h-4 w-4 me-2" />
                                        {columnClass === 'lg:grid-cols-3' ? t('pos.columnsCount', { n: 3 }) : columnClass === 'lg:grid-cols-4' ? t('pos.columnsCount', { n: 4 }) : t('pos.columnsCount', { n: 5 })}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[150px]">
                                <DropdownMenuItem onClick={() => setColumnClass('lg:grid-cols-3')}>{t('pos.columnsCount', { n: 3 })}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setColumnClass('lg:grid-cols-4')}>{t('pos.columnsCount', { n: 4 })}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setColumnClass('lg:grid-cols-5')}>{t('pos.columnsCount', { n: 5 })}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {isSyncing && (
                        <div className="flex items-center gap-2 ms-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none">{t('pos.globalCatalogSyncing')}</span>
                        </div>
                    )}
                </div>
                <div className="pb-24 md:pb-0">
                    {isLoading || products === null ? (
                        // Skeleton tiles rather than a spinner: on a first login the
                        // catalogue streams in from Firestore, and an empty grid used
                        // to read as "you have no products". Tiles in the grid's own
                        // shape say "these are loading" without claiming a count.
                        <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-4", columnClass)}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <ProductCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <>
                            {filteredProducts && filteredProducts.length > 0 ? (
                                <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-4", columnClass)}>
                                    {filteredProducts.map(product => (
                                        <ProductItem
                                            key={product.id}
                                            product={product}
                                            currencySymbol={currencySymbol}
                                            handleAddToCart={() => handleAddToCart(product)}
                                            addToCart={addToCart}
                                            onPreview={(src, alt) => setPreviewImage({ src, alt })}
                                        />


                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg min-h-[400px]">
                                    <Package className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
                                    <h3 className="text-xl font-semibold">{t('pos.noProductsFound')}</h3>
                                    <p className="text-muted-foreground mt-2 mb-6 max-w-[250px] mx-auto">
                                        {searchTerm ? t('pos.noProductsSearchHint', { term: searchTerm }) : t('pos.categoryEmpty')}
                                    </p>
                                    {searchTerm ? (
                                        <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); }}>
                                            {t('pos.clearSearch')}
                                        </Button>
                                    ) : (
                                        <Button size="sm" asChild>
                                            <Link href="/inventory/add">
                                                <PlusCircle className="h-4 w-4 me-2" /> {t('inventory.addProduct')}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Pagination removed as per user request for full catalog search */}
                        </>
                    )}
                </div>
            </div>


            {/* Desktop Cart */}
            <div className="hidden md:block">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            <span>{t('pos.cart')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96 pe-3">
                            <CartContents />
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleNext} disabled={cart.length === 0 || isNavigating}>
                            {isNavigating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {t('pos.nextCustomer')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Mobile Cart Sheet */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="default" className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+6px)] start-4 end-4 z-20 h-16 shadow-lg rounded-xl text-lg">
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                    <ChevronsUp className="h-5 w-5" />
                                    <span>{t('pos.viewCart', { n: cart.reduce((acc, item) => acc + item.quantity, 0) })}</span>
                                </div>
                                <span>{currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[75%] flex flex-col">
                        <SheetHeader className="p-4 border-b text-start">
                            <SheetTitle>{t('pos.yourCart')}</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="flex-1 p-4">
                            <CartContents />
                        </ScrollArea>
                        <SheetFooter className="p-4 border-t bg-background">
                            <Button className="w-full" size="lg" onClick={handleNext} disabled={cart.length === 0 || isNavigating}>
                                {isNavigating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t('pos.nextCustomer')}
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
            <ImageDialog 
                isOpen={!!previewImage} 
                onClose={() => setPreviewImage(null)} 
                src={previewImage?.src || null} 
                alt={previewImage?.alt || ''} 
            />
        </div>

    )
}
