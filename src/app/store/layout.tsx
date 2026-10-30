'use client';

import * as React from 'react';
import { StoreProvider, useStore } from '@/context/store-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Minus, Plus, Package, Store } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import CheckoutDialog from '@/components/store/checkout-dialog';
import StoreChatWidget from '@/components/store/store-chat-widget';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function StorefrontSkeleton() {
    return (
        <div className="animate-pulse min-h-screen bg-slate-50">
            <div className="h-64 bg-slate-200"></div>
            <div className="container mx-auto px-4 py-8 -mt-20 relative z-10 max-w-6xl">
                <div className="p-6 bg-white rounded-xl shadow-md border h-32 mb-8">
                    <div className="h-8 w-1/3 bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-1/4 bg-slate-200 rounded-md mt-3"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="border rounded-xl bg-white p-3 space-y-3">
                            <div className="aspect-square bg-slate-100 rounded-lg"></div>
                            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                            <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StoreLayoutContent({ children }: { children: React.ReactNode }) {
    const { cart, subtotal, updateQuantity, clearCart, business, isLoading } = useStore();

    const [isCartOpen, setIsCartOpen] = React.useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);

    const currencySymbol = business?.settings?.currency || '$';

    React.useEffect(() => {
        const color = business?.settings?.primaryColor;
        const defaultColor = '22 90% 55%';
        const finalColor = color || defaultColor;

        document.documentElement.style.setProperty('--primary', finalColor);
        document.documentElement.style.setProperty('--accent', finalColor);

        return () => {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--accent');
        };
    }, [business?.settings?.primaryColor]);

    if (isLoading) {
        return <StorefrontSkeleton />;
    }

    if (!business) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Store className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Storefront Not Found</h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        The storefront link you visited doesn't match an active store, or the link has changed.
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs h-9">
                            <Link href="/storefront">Go to Storefront Dashboard</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full text-xs h-9">
                            <Link href="/login">Merchant Login</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!business.settings?.publicStore?.enabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Store className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Store Currently Offline</h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        <strong>{business.name}</strong> has temporarily paused public ordering.
                    </p>
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-[11px] border border-amber-200">
                        If you are the business owner, please navigate to your dashboard and toggle "Enable Public Store" to online.
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs h-9">
                            <Link href="/storefront">Enable Store in Settings</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full text-xs h-9">
                            <Link href="/login">Merchant Login</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
            <div className="flex-1">
                {children}
            </div>

            {/* Floating Shopping Cart Trigger */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-xl bg-orange-500 hover:bg-orange-600 text-white z-40 active:scale-95 transition-transform"
                        style={{ backgroundColor: business?.settings?.primaryColor ? `hsl(${business.settings.primaryColor})` : undefined }}
                        aria-label="Open Cart"
                    >
                        <ShoppingCart className="h-6 w-6" />
                        {totalCartCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white animate-in zoom-in-50">
                                {totalCartCount}
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-lg font-bold">Your Cart ({totalCartCount})</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="flex-1 -mx-6 px-6 my-2">
                        <div className="space-y-4 py-2">
                            {cart.length > 0 ? (
                                cart.map((item) => (
                                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                                        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                                            {item.product.imageUrl ? (
                                                <Image
                                                    src={item.product.imageUrl}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full w-full text-slate-400">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-xs text-slate-900 truncate">
                                                {item.product.name}
                                            </p>
                                            <p className="text-xs font-bold text-orange-600 mt-0.5">
                                                {currencySymbol}{item.product.price.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7 rounded-md"
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-xs font-bold w-6 text-center">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7 rounded-md"
                                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-400 py-16 space-y-3">
                                    <ShoppingCart className="mx-auto h-12 w-12 opacity-30" />
                                    <p className="text-xs font-medium">Your cart is currently empty.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {cart.length > 0 && (
                        <div className="pt-4 border-t space-y-3">
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span>Subtotal</span>
                                <span className="text-base font-bold text-slate-900">
                                    {currencySymbol}{subtotal.toLocaleString()}
                                </span>
                            </div>
                            <Button
                                size="lg"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                                style={{ backgroundColor: business?.settings?.primaryColor ? `hsl(${business.settings.primaryColor})` : undefined }}
                                onClick={() => {
                                    setIsCartOpen(false);
                                    setIsCheckoutOpen(true);
                                }}
                            >
                                Proceed to Checkout
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Customer Live Chat Widget */}
            {business?.id && (
                <StoreChatWidget
                    businessId={business.id}
                    businessName={business.name || 'Store'}
                    primaryColor={business?.settings?.primaryColor}
                />
            )}

            {/* Checkout Dialog */}
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
    );
}
