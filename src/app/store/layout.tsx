'use client';
import { StoreProvider } from '@/context/store-context';
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import CheckoutDialog from '@/components/store/checkout-dialog';
import { useParams, notFound } from 'next/navigation';
import { useStore } from '@/context/store-context';
import { AppConfig } from '@/lib/config';

function StorefrontSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-[40vh] bg-muted"></div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-24 sm:-mt-16 relative z-10">
                 <div className="p-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg border h-36">
                     <div className="h-12 w-3/4 bg-muted rounded-md"></div>
                     <div className="h-10 w-1/2 bg-muted rounded-md mt-4"></div>
                 </div>
                 <div className="h-8 w-1/2 bg-muted rounded-md mt-12 mb-8"></div>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="border rounded-lg">
                            <div className="aspect-square bg-muted"></div>
                            <div className="p-4 space-y-2">
                                <div className="h-5 w-3/4 bg-muted rounded"></div>
                                <div className="h-5 w-1/2 bg-muted rounded"></div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    )
}

function StoreLayoutContent({ children }: { children: React.ReactNode }) {
    const { cart, subtotal, updateQuantity, clearCart, business, isLoading } = useStore();
    
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        const color = business?.settings?.primaryColor;
        const defaultColor = '22 90% 55%';
        const finalColor = color || defaultColor;

        document.documentElement.style.setProperty('--primary', finalColor);
        document.documentElement.style.setProperty('--accent', finalColor);
        
        const styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme-override';
        styleTag.innerHTML = `
            #nprogress .bar { background: hsl(${finalColor}) !important; }
            #nprogress .peg { box-shadow: 0 0 10px hsl(${finalColor}), 0 0 5px hsl(${finalColor}) !important; }
            ::-webkit-scrollbar-thumb { background-color: hsl(${finalColor} / 0.7); }
            ::-webkit-scrollbar-thumb:hover { background-color: hsl(${finalColor}); }
        `;
        document.head.appendChild(styleTag);
        
        return () => {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--accent');
            const existingTag = document.getElementById('dynamic-theme-override');
            if (existingTag) {
                document.head.removeChild(existingTag);
            }
        };
    }, [business?.settings?.primaryColor]);

    if (isLoading) {
        return <StorefrontSkeleton />;
    }

    if (!business) {
        return notFound();
    }
    
    return (
        <div>
            {children}
            
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg text-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 z-50">
                        <ShoppingCart className="h-7 w-7" />
                        {cart.length > 0 && 
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full z-10">
                                {cart.reduce((acc, item) => acc + item.quantity, 0)}
                            </Badge>
                        }
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                    <SheetHeader><SheetTitle>Your Cart</SheetTitle></SheetHeader>
                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4">
                        {cart.length > 0 ? cart.map(item => (
                            <div key={item.product.id} className="flex gap-4">
                                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    {item.product.imageUrl ? <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover"/> : <div className="flex items-center justify-center h-full w-full"><Image src={AppConfig.logoIconUrl} alt="Zeneva" width={32} height={32}/></div>}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{item.product.name}</p>
                                    <p className="text-sm text-muted-foreground">₦{item.product.price.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-4 w-4"/></Button>
                                    <span>{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground pt-16">
                                <ShoppingCart className="mx-auto h-12 w-12 opacity-50"/>
                                <p className="mt-4">Your cart is empty.</p>
                            </div>
                        )}
                        </div>
                    </ScrollArea>
                    {cart.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between font-semibold text-lg">
                                    <span>Subtotal</span>
                                    <span>₦{subtotal.toLocaleString()}</span>
                                </div>
                                <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}>
                                    Proceed to Checkout
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <CheckoutDialog
                isOpen={isCheckoutOpen}
                onOpenChange={setIsCheckoutOpen}
            />
        </div>
    );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return (
        <StoreProvider>
            <StoreLayoutContent>
                {children}
            </StoreLayoutContent>
        </StoreProvider>
    )
}