'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Product } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, ArrowLeft, Check } from 'lucide-react';
import { useStore } from '@/context/store-context';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

function ProductDetailSkeleton() {
    return (
        <div className="animate-pulse container mx-auto px-4 py-12 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="aspect-square bg-slate-200 rounded-2xl"></div>
                <div className="space-y-4">
                    <div className="h-8 w-3/4 bg-slate-200 rounded-md"></div>
                    <div className="h-10 w-1/4 bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-full bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-2/3 bg-slate-200 rounded-md"></div>
                    <div className="h-12 w-1/2 bg-slate-200 rounded-xl mt-6"></div>
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { productId } = params as { businessId: string; productId: string };
    const firestore = useFirestore();
    const { addToCart, business } = useStore();

    const [added, setAdded] = React.useState(false);

    const productDocRef = useMemoFirebase(
        () => (firestore && productId ? doc(firestore, 'products', productId) : null),
        [firestore, productId]
    );
    const { data: product, isLoading, error } = useDoc<Product>(productDocRef);

    const currencySymbol = business?.settings?.currency || '$';

    React.useEffect(() => {
        if (product && business) {
            document.title = `${product.name} - ${business.name}`;
        }
    }, [product, business]);

    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (!product || error) {
        return notFound();
    }

    const images = product.imageUrl ? [product.imageUrl] : [];
    const isOutOfStock = !product.stock || product.stock <= 0;

    const handleAddToCart = () => {
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mb-8 text-xs text-slate-600 gap-1.5 hover:text-slate-900"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to catalog
            </Button>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs">
                {/* Product Images */}
                <div className="w-full">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {images.length > 0 ? (
                                images.map((img, index) => (
                                    <CarouselItem key={index}>
                                        <div className="aspect-square relative rounded-xl overflow-hidden bg-slate-50 border">
                                            <Image
                                                src={img}
                                                alt={`${product.name} image ${index + 1}`}
                                                fill
                                                className="object-contain p-4"
                                                priority
                                            />
                                        </div>
                                    </CarouselItem>
                                ))
                            ) : (
                                <CarouselItem>
                                    <div className="aspect-square relative rounded-xl overflow-hidden bg-slate-50 border flex items-center justify-center text-slate-300">
                                        <Package size={64} />
                                    </div>
                                </CarouselItem>
                            )}
                        </CarouselContent>
                        {images.length > 1 && (
                            <>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </>
                        )}
                    </Carousel>
                </div>

                {/* Product Details */}
                <div className="flex flex-col justify-center space-y-5">
                    {product.category && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                            {product.category}
                        </span>
                    )}

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                        {product.name}
                    </h1>

                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-slate-900">
                            {currencySymbol}{product.price.toLocaleString()}
                        </span>
                        {isOutOfStock ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                Out of Stock
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                In Stock ({product.stock} units)
                            </span>
                        )}
                    </div>

                    {product.sku && (
                        <p className="text-xs text-slate-400 font-mono">
                            SKU / Barcode: {product.sku}
                        </p>
                    )}

                    <div className="pt-4 border-t space-y-2">
                        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                            Description
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {product.description?.replace(/\\n/g, '\n').replace(/<[^>]*>?/gm, '') ||
                                'No description provided for this product.'}
                        </p>
                    </div>

                    <div className="pt-6">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto min-w-[200px] bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl h-12 shadow-sm"
                            style={{
                                backgroundColor: business?.settings?.primaryColor
                                    ? `hsl(${business.settings.primaryColor})`
                                    : undefined,
                            }}
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                        >
                            {added ? (
                                <span className="flex items-center gap-2">
                                    <Check className="h-4 w-4" /> Added to Cart!
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" />
                                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

