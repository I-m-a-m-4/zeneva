'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Product } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Search, ChevronRight, ChevronLeft, SlidersHorizontal, Check } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StoreFooter from '@/components/store/footer';
import { useStore } from '@/context/store-context';
import { cn } from '@/lib/utils';

const PRODUCTS_PER_PAGE = 24;

function ProductCard({
    product,
    businessId,
    currencySymbol,
    onAddToCart
}: {
    product: Product;
    businessId: string;
    currencySymbol: string;
    onAddToCart: (product: Product) => void;
}) {
    const isOutOfStock = !product.stock || product.stock <= 0;
    const [addedToast, setAddedToast] = React.useState(false);

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onAddToCart(product);
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 1500);
    };

    return (
        <Card className="overflow-hidden flex flex-col group cursor-pointer h-full border border-slate-200 hover:shadow-md transition-all duration-200 bg-white rounded-xl">
            <Link href={`/store/${businessId}/${product.id}`} className="contents">
                <CardHeader className="p-0 relative">
                    <div className="aspect-square relative overflow-hidden bg-slate-100">
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={44} />
                            </div>
                        )}
                        {isOutOfStock ? (
                            <Badge variant="destructive" className="absolute top-2.5 right-2.5 text-[10px] px-1.5 py-0.5">
                                Out of Stock
                            </Badge>
                        ) : (
                            <span className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                                In Stock
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-3.5 flex-grow">
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1 truncate">
                        {product.category || 'General'}
                    </p>
                    <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 text-slate-900 group-hover:text-orange-600 transition-colors">
                        {product.name}
                    </CardTitle>
                </CardContent>
            </Link>
            <CardFooter className="p-3.5 pt-0 flex flex-col items-start gap-2 mt-auto">
                <span className="text-base font-bold text-slate-900">
                    {currencySymbol}{product.price.toLocaleString()}
                </span>
                <Button
                    variant="default"
                    size="sm"
                    className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg"
                    onClick={handleAddToCartClick}
                    disabled={isOutOfStock}
                >
                    {addedToast ? (
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Added!</span>
                    ) : isOutOfStock ? (
                        'Out of Stock'
                    ) : (
                        'Add to Cart'
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function PublicStorePage() {
    const { business, products, addToCart } = useStore();
    const params = useParams();
    const businessId = (params.businessId as string) || '';
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortBy, setSortBy] = React.useState('default');

    const currencySymbol = business?.settings?.currency || '$';
    const storeSettings = business?.settings?.publicStore;

    React.useEffect(() => {
        const category = searchParams.get('category');
        if (category) {
            setCategoryFilter(category);
        }
    }, [searchParams]);

    const filteredProducts = React.useMemo(() => {
        if (!products) return [];
        let list = [...products];

        if (storeSettings?.hideOutOfStock) {
            list = list.filter((p) => p.stock && p.stock > 0);
        }

        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    (p.category && p.category.toLowerCase().includes(query)) ||
                    (p.sku && p.sku.toLowerCase().includes(query))
            );
        }

        if (categoryFilter !== 'all') {
            list = list.filter((p) => p.category === categoryFilter);
        }

        switch (sortBy) {
            case 'price-asc':
                list.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                list.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                break;
        }

        return list;
    }, [products, searchTerm, categoryFilter, sortBy, storeSettings?.hideOutOfStock]);

    const pageCount = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE) || 1;
    const paginatedProducts = React.useMemo(() => {
        const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
        return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    const gridClass = {
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
    }[storeSettings?.desktopColumns || 4];

    return (
        <div className="flex flex-col min-h-screen">
            {/* Store Header Banner */}
            <header className="h-[22rem] bg-slate-900 flex items-center justify-center relative overflow-hidden">
                {storeSettings?.bannerImageUrl ? (
                    <Image
                        src={storeSettings.bannerImageUrl}
                        alt="Store Banner"
                        fill
                        className="object-cover opacity-75"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-700 opacity-90" />
                )}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-white z-10">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                        {storeSettings?.headline || business?.name || 'Welcome to Our Store'}
                    </h1>
                    {storeSettings?.description && (
                        <p className="mt-2 text-sm sm:text-base text-white/90 max-w-xl line-clamp-2 drop-shadow">
                            {storeSettings.description}
                        </p>
                    )}
                </div>
            </header>

            {/* Filter & Search Bar */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 max-w-6xl">
                <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-200/80">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search our catalog by product name, category..."
                                className="pl-10 h-11 text-xs sm:text-sm bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <Select
                            onValueChange={(val) => {
                                setCategoryFilter(val);
                                setCurrentPage(1);
                            }}
                            value={categoryFilter}
                        >
                            <SelectTrigger className="h-11 text-xs sm:text-sm w-full sm:w-56 bg-slate-50 border-slate-200">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {business?.settings?.productCategories?.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={setSortBy} value={sortBy}>
                            <SelectTrigger className="h-11 text-xs sm:text-sm w-full sm:w-48 bg-slate-50 border-slate-200">
                                <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Featured</SelectItem>
                                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                <SelectItem value="name-asc">Alphabetical (A-Z)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Products Catalog Grid */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 max-w-6xl flex-1">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {categoryFilter === 'all' ? 'All Products' : categoryFilter}
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                        Showing {paginatedProducts.length} of {filteredProducts.length} items
                    </span>
                </div>

                {paginatedProducts.length > 0 ? (
                    <>
                        <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6", gridClass)}>
                            {paginatedProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    businessId={businessId}
                                    currencySymbol={currencySymbol}
                                    onAddToCart={addToCart}
                                />
                            ))}
                        </div>

                        {pageCount > 1 && (
                            <div className="flex justify-center items-center gap-3 mt-12">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    disabled={currentPage === 1}
                                    className="text-xs h-9"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <span className="text-xs text-slate-600 font-medium">
                                    Page {currentPage} of {pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    disabled={currentPage === pageCount}
                                    className="text-xs h-9"
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
                        <Package className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="text-sm font-semibold text-slate-700">No products found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            No products match your current search or category filter. Try clearing the search or choosing another category.
                        </p>
                    </div>
                )}
            </main>

            {/* Store Footer */}
            {business && (
                <StoreFooter
                    business={{
                        ...business,
                        settings: {
                            ...business.settings,
                            publicStore: storeSettings,
                        },
                    }}
                />
            )}
        </div>
    );
}

