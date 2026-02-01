'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { BusinessInstance, Product } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package, ShoppingCart, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/context/store-context';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AppConfig } from '@/lib/config';

function ProductDetailSkeleton() {
    return (
        <div className="animate-pulse container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                    <div className="aspect-square bg-muted rounded-lg"></div>
                    <div className="flex gap-2 mt-2">
                        <div className="w-16 h-16 bg-muted rounded"></div>
                        <div className="w-16 h-16 bg-muted rounded"></div>
                        <div className="w-16 h-16 bg-muted rounded"></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-8 w-3/4 bg-muted rounded-md"></div>
                    <div className="h-12 w-1/4 bg-muted rounded-md"></div>
                    <div className="h-5 w-full bg-muted rounded-md"></div>
                    <div className="h-5 w-full bg-muted rounded-md"></div>
                    <div className="h-5 w-2/3 bg-muted rounded-md"></div>
                    <div className="h-12 w-1/2 bg-muted rounded-md mt-4"></div>
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { businessId, productId } = params as { businessId: string; productId: string; };
    const firestore = useFirestore();
    const { toast } = useToast();
    const { addToCart, business } = useStore();

    const productDocRef = useMemoFirebase(() => (firestore && productId ? doc(firestore, 'products', productId) : null), [firestore, productId]);
    const { data: product, isLoading, error } = useDoc<Product>(productDocRef);

    React.useEffect(() => {
        if (product && business) {
            document.title = `${product.name} - ${business.name}`;
            
            const setMeta = (property: string, content: string) => {
                let element = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement;
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', property);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            };

            const title = `${product.name} - ${business.name}`;
            const description = product.description?.replace(/\\n/g, ' ').replace(/<[^>]*>?/gm, '').substring(0, 150) || `Check out ${product.name} at ${business.name}!`;
            const imageUrl = product.imageUrl || business.settings?.logoUrl || AppConfig.logoUrl;

            setMeta('og:title', title);
            setMeta('twitter:title', title);
            setMeta('og:description', description);
            setMeta('twitter:description', description);
            setMeta('og:image', imageUrl);
            setMeta('twitter:image', imageUrl);

        }
    }, [product, business]);
    
    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (!product || error) {
        return notFound();
    }
    
    // Fallback for single image
    const images = product.imageUrl ? [product.imageUrl] : [];

    const handleAddToCart = () => {
        addToCart(product);
    };
    
    const isOutOfStock = !product.stock || product.stock <= 0;

    return (
        <div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Button variant="ghost" onClick={() => router.back()} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to products
                </Button>
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {images.length > 0 ? (
                                images.map((img, index) => (
                                    <CarouselItem key={index}>
                                        <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                                            <Image src={img} alt={`${product.name} image ${index + 1}`} fill className="object-contain" />
                                        </div>
                                    </CarouselItem>
                                ))
                            ) : (
                                <CarouselItem>
                                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
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

                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{product.name}</h1>
                        <div className="mt-4">
                            <span className="text-4xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
                        </div>
                        
                        <div className="mt-6">
                           {isOutOfStock ? (
                                <p className="text-lg font-semibold text-destructive">Out of Stock</p>
                           ) : (
                               <p className="text-lg font-semibold text-green-600">In Stock</p>
                           )}
                        </div>

                        <div className="mt-6 space-y-2">
                            <h3 className="text-xl font-semibold">Product Description</h3>
                            <div className="prose dark:prose-invert max-w-full">
                                <p>{product.description?.replace(/\\n/g, ' ').replace(/<[^>]*>?/gm, '') || 'No description available.'}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddToCart} disabled={isOutOfStock}>
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
    