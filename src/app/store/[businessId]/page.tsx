'use client';

import * as React from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDoc, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import type { BusinessInstance, Product, CartItem } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package, ShoppingBag, AlertTriangle, ArrowLeft, Search, ShoppingCart, X, Plus, Minus, Twitter, Instagram, Facebook, Phone, ChevronRight, ChevronLeft, Mail, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendReceiptEmail } from '@/lib/email';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import usePaystack from '@/hooks/use-paystack';
import StoreFooter from './footer';
import { Switch } from '@/components/ui/switch';
import { AppConfig } from '@/lib/config';
import { useStore } from '@/context/store-context';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const PRODUCTS_PER_PAGE = 24;

function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: (product: Product) => void }) {
    const params = useParams();
    const isOutOfStock = !product.stock || product.stock <= 0;

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onAddToCart(product);
    };

    return (
        <Card className="overflow-hidden flex flex-col group cursor-pointer h-full">
            <Link href={`${product.id}`} className="contents">
                <CardHeader className="p-0">
                    <div className="aspect-square relative overflow-hidden bg-muted">
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Package size={48} />
                            </div>
                        )}
                        {isOutOfStock && <Badge variant="destructive" className="absolute top-2 right-2">Out of Stock</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-2">{product.name}</CardTitle>
                </CardContent>
            </Link>
            <CardFooter className="p-4 flex flex-col items-start gap-2 mt-auto bg-muted/50">
                <span className="text-lg font-bold text-primary">₦{product.price.toLocaleString()}</span>
                <Button variant="default" size="sm" className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddToCartClick} disabled={isOutOfStock}>
                    Add to Cart
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function PublicStorePage() {
    const { business, products, isLoading } = useStore();
    const searchParams = useSearchParams();

    const { addToCart } = useStore();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortBy, setSortBy] = React.useState('default');

    const showOutOfStock = business?.settings?.publicStore?.hideOutOfStock ? false : true;

    React.useEffect(() => {
        const category = searchParams.get('category');
        if (category) {
            setCategoryFilter(category);
        }
    }, [searchParams]);

    const filteredAndSortedProducts = React.useMemo(() => {
        let prods = products || [];

        if (!showOutOfStock) {
            prods = prods.filter(p => p.stock && p.stock > 0);
        }

        if (searchTerm) {
            prods = prods.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (categoryFilter !== 'all') {
            prods = prods.filter(p => p.category === categoryFilter);
        }

        let sortedProds = [...prods];
        switch (sortBy) {
            case 'price-asc':
                sortedProds.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                sortedProds.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                sortedProds.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return dateB - dateA;
                });
                break;
            case 'name-asc':
                sortedProds.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                sortedProds.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        return sortedProds;
    }, [products, searchTerm, categoryFilter, showOutOfStock, sortBy]);

    const pageCount = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
    const paginatedProducts = filteredAndSortedProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, sortBy, showOutOfStock]);

    if (isLoading) {
        return null;
    }

    if (!business) {
        return notFound();
    }

    const desktopCols = business.settings?.publicStore?.desktopColumns || 4;
    const gridClass = {
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
    }[desktopCols];

    const settings = business.settings?.publicStore;

    return (
        <>
            <header className="h-[50vh] bg-muted flex items-center justify-center relative">
                {settings?.bannerImageUrl ? (
                    <Image src={settings.bannerImageUrl} alt={`${business.name} banner`} fill className="object-cover" />
                ) : (
                    <div className="text-muted-foreground"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex items-center justify-center p-8">
                    <h1 className="text-4xl md:text-6xl font-bold text-white text-center drop-shadow-lg">{settings?.headline || `Welcome to ${business.name}`}</h1>
                </div>
            </header>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-24 sm:-mt-16 relative z-10">
                <div className="p-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg border">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-10 h-12 text-base"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select onValueChange={setCategoryFilter} value={categoryFilter}>
                            <SelectTrigger className="h-12 text-base w-full sm:w-64">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {business?.settings?.productCategories?.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between mt-4 flex-wrap gap-4 border-t pt-4">
                        <div className="flex items-center space-x-2">
                            {/* "Show out of stock" is now an admin setting, removed from public view */}
                        </div>
                        <Select onValueChange={setSortBy} value={sortBy}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="newest">Newest Arrivals</SelectItem>
                                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                <SelectItem value="name-asc">Alphabetical (A-Z)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24">
                <h2 className="text-3xl font-bold mb-8">Our Products</h2>
                {paginatedProducts && paginatedProducts.length > 0 ? (
                    <>
                        <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-6", gridClass)}>
                            {paginatedProducts.map(product => (
                                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                            ))}
                        </div>
                        {pageCount > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12">
                                <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="hover:bg-primary hover:text-primary-foreground">
                                    <ChevronLeft /> Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {pageCount}</span>
                                <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === pageCount} className="hover:bg-primary hover:text-primary-foreground">
                                    Next <ChevronRight />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
                    </div>
                )}
            </main>

            <StoreFooter business={business} />
        </>
    );
}
