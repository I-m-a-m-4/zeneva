
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

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const PRODUCTS_PER_PAGE = 24;

function StorefrontSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-[70vh] bg-muted"></div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <div className="h-8 w-1/2 bg-muted rounded-md mb-8"></div>
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
            <Link href={`/store/${params.businessId}/${product.id}`} className="contents">
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

function CheckoutDialog({ isOpen, onOpenChange, cart, total, business, onOrderPlaced }: { isOpen: boolean; onOpenChange: (open: boolean) => void; cart: CartItem[]; total: number; business: BusinessInstance; onOrderPlaced: () => void; }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { initializePayment, isScriptLoaded } = usePaystack();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  
  const handleSuccessfulPayment = React.useCallback(async (transaction: { reference: string }) => {
    if (!firestore || !business) {
        toast({ variant: 'destructive', title: 'Error', description: 'Session expired. Please refresh.' });
        setIsSubmitting(false);
        return;
    }
    
    // Server-side verification
    toast({ title: "Processing...", description: "Verifying your payment securely." });
    const verifyResponse = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: transaction.reference }),
    });

    if (!verifyResponse.ok) {
        throw new Error('Payment verification failed.');
    }
    const verifyResult = await verifyResponse.json();
    if (verifyResult.data.amount !== total * 100) {
        throw new Error('Paid amount does not match order total.');
    }
     if (verifyResult.status !== 'success') {
        throw new Error(verifyResult.message || 'Payment not successful.');
    }

    // Payment successful, now create the order
    const ordersRef = collection(firestore, 'businessInstances', business.id, 'onlineOrders');
    const newOrderRef = await addDoc(ordersRef, {
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: address,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      total,
      status: 'paid', // Mark as paid since Paystack confirmed
      paymentMethod: 'Paystack',
      paymentReference: transaction.reference,
      createdAt: serverTimestamp(),
    });
    
    toast({ variant: 'success', title: 'Order Placed!', description: `Thank you, ${name}! Your order has been sent.` });
    
    const canSendEmail = business.plan === 'pro' || business.plan === 'business' || business.accessLevel === 'lifetime';
      
    if(canSendEmail) {
        // Fire-and-forget email sending
        sendReceiptEmail({
            to_email: email,
            to_name: name,
            business_name: business.name,
            receipt_id: newOrderRef.id.substring(0, 8),
            items_html: cart.map(item => `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity} x ${item.product.name}</td><td style="padding: 8px; text-align:right; border-bottom: 1px solid #ddd;">₦${(item.quantity * item.product.price).toLocaleString()}</td></tr>`).join(''),
            currency_symbol: '₦',
            subtotal: total.toLocaleString(),
            tax: '0.00',
            discount: '0.00',
            total: total.toLocaleString(),
        }).catch(err => console.error("Receipt email failed to send:", err));
    }
    onOrderPlaced();

  }, [firestore, business, cart, total, name, email, phone, address, onOrderPlaced, toast]);


  const handlePlaceOrder = async () => {
    if (!name || !email || !address || !phone) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
      return;
    }
    
    if (!isScriptLoaded) {
        toast({ variant: "destructive", title: "Payment Gateway Not Ready", description: "Please wait a moment." });
        return;
    }
    
    setIsSubmitting(true);
    
    if (!business.settings?.paystackSubaccount) {
        toast({
            variant: 'destructive',
            title: 'Payment Not Configured',
            description: 'The store owner has not configured online payments for this store.',
        });
        setIsSubmitting(false);
        return;
    }
    
    initializePayment({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: total * 100, // Paystack expects amount in kobo
        currency: 'NGN',
        reference: `z-${business.id.substring(0, 6)}-${Date.now()}`,
        subaccount: business.settings.paystackSubaccount,
        onSuccess: handleSuccessfulPayment,
        onClose: () => {
          setIsSubmitting(false); // Re-enable button if user closes modal
        },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" style={{'--primary': business.settings?.primaryColor, '--accent': business.settings?.primaryColor} as React.CSSProperties}>
        <DialogHeader>
          <DialogTitle>Complete Your Order</DialogTitle>
          <DialogDescription>Provide your details for fulfillment and payment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} required /></div>
                <div><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            </div>
             <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
             <div><Label htmlFor="address">Delivery Address</Label><Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} required /></div>
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Payment Instructions</h4>
             <p className="text-sm text-muted-foreground mb-2">You can pay securely with your card via Paystack, or use the bank details below for a direct transfer.</p>
            {business.settings?.paymentBankName && (
                 <p className="text-sm text-muted-foreground mt-2"><strong>Bank:</strong> {business.settings.paymentBankName}</p>
            )}
            {business.settings?.paymentBankAccountId && (
                 <p className="text-sm text-muted-foreground"><strong>Account:</strong> {business.settings.paymentBankAccountId}</p>
            )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {business.settings?.paystackSubaccount ? (
            <Button onClick={handlePlaceOrder} disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Pay ₦{total.toLocaleString()} with Paystack
            </Button>
           ) : (
            <Button disabled>Paystack Not Configured</Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PublicStorePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const businessIdOrSlug = params.businessId as string;
    const firestore = useFirestore();
    
    const [business, setBusiness] = React.useState<BusinessInstance | null>(null);
    const [businessLoading, setBusinessLoading] = React.useState(true);
    const [businessError, setBusinessError] = React.useState<Error | null>(null);
    
    const [cart, setCart] = React.useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = React.useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortBy, setSortBy] = React.useState('default');
    const [showOutOfStock, setShowOutOfStock] = React.useState(true);

    React.useEffect(() => {
        if (business) {
            document.title = `${business.name} | Powered by Zeneva`;
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = business.settings?.logoUrl || AppConfig.logoUrl;

             const setMeta = (property: string, content: string) => {
                let element = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement;
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', property);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            };

            const title = business.name;
            const description = business.settings?.publicStore?.description || `Check out the amazing products at ${business.name}!`;
            const imageUrl = business.settings?.publicStore?.bannerImageUrl || business.settings?.logoUrl || AppConfig.logoUrl;


            setMeta('og:title', title);
            setMeta('twitter:title', title);
            setMeta('og:description', description);
            setMeta('twitter:description', description);
            setMeta('og:image', imageUrl);
            setMeta('twitter:image', imageUrl);
            setMeta('og:url', window.location.href);

        } else if (!businessLoading) {
            document.title = 'Store Not Found | Zeneva';
        }
    }, [business, businessLoading]);

    // Effect to fetch the business info by slug or ID
    React.useEffect(() => {
        if (!firestore || !businessIdOrSlug) {
            setBusinessLoading(false);
            return;
        }

        const findBusiness = async () => {
            setBusinessLoading(true);
            setBusiness(null);
            setBusinessError(null);
            try {
                let foundBusiness: BusinessInstance | null = null;
                const businessCollection = collection(firestore, 'businessInstances');
                
                const q = query(businessCollection, where('settings.publicStore.slug', '==', businessIdOrSlug), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const businessDoc = querySnapshot.docs[0];
                    const businessData = { id: businessDoc.id, ...businessDoc.data() } as BusinessInstance;
                    if (businessData.settings?.publicStore?.enabled) {
                        foundBusiness = businessData;
                    }
                } else {
                    const docRef = doc(firestore, 'businessInstances', businessIdOrSlug);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                         const businessData = { id: docSnap.id, ...docSnap.data() } as BusinessInstance;
                         if (businessData.settings?.publicStore?.enabled) {
                            foundBusiness = businessData;
                        }
                    }
                }
                setBusiness(foundBusiness);
                 if (foundBusiness) {
                    setShowOutOfStock(!foundBusiness.settings?.publicStore?.hideOutOfStock);
                }
            } catch (error: any) {
                console.error("Error finding business:", error);
                setBusinessError(error);
            } finally {
                setBusinessLoading(false);
            }
        };

        findBusiness();
    }, [firestore, businessIdOrSlug]);

    React.useEffect(() => {
        const category = searchParams.get('category');
        if(category) {
            setCategoryFilter(category);
        }
    }, [searchParams]);

    // Now, fetch products *only after* we have a stable business ID.
    const productsQuery = useMemoFirebase(() => {
        if (business?.id) {
            return query(collection(firestore, "products"), where("businessId", "==", business.id));
        }
        return null;
    }, [business?.id, firestore]);
    
    const { data: products, isLoading: isLoadingProducts, error: productsError } = useCollection<Product>(productsQuery);

    const isLoading = businessLoading || (!!business && isLoadingProducts);

    const subtotal = React.useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
    const { toast } = useToast();

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existingItem = prev.find((item) => item.product.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= (product.stock || 0)) {
                    toast({ title: 'Stock limit reached', description: `Cannot add more of ${product.name}.`, variant: 'warning' });
                    return prev;
                }
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            } else {
                 if ((product.stock || 0) <= 0) {
                    toast({ title: 'Out of stock', description: `${product.name} is out of stock.`, variant: 'destructive' });
                    return prev;
                }
                return [...prev, { product, quantity: 1 }];
            }
        });
    };
    
    const updateQuantity = (productId: string, quantity: number) => {
        const itemInCart = cart.find(item => item.product.id === productId);
        if (!itemInCart) return;
        
        const stockLimit = itemInCart.product.stock || 0;
        if (quantity > stockLimit) {
            quantity = stockLimit;
             toast({ title: 'Stock limit reached', description: `Only ${stockLimit} units available.`, variant: 'warning' });
        }

        if (quantity <= 0) {
            setCart(prev => prev.filter(item => item.product.id !== productId));
        } else {
            setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
        }
    }

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
                sortedProds.sort((a,b) => a.name.localeCompare(b.name));
                break;
            default:
                // Default sort might be by name or relevance if we had that
                sortedProds.sort((a,b) => a.name.localeCompare(b.name));
                break;
        }

        return sortedProds;
    }, [products, searchTerm, categoryFilter, showOutOfStock, sortBy]);

    const pageCount = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
    const paginatedProducts = filteredAndSortedProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
    
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, sortBy, showOutOfStock]);

    const storeStyle = {
        '--primary': business?.settings?.primaryColor || '22 90% 55%',
        '--accent': business?.settings?.primaryColor || '22 90% 55%',
        '--primary-foreground': (business?.settings?.primaryColor?.split(' ')[2].replace('%','') ?? 55) > 50 ? '0 0% 0%' : '0 0% 100%',
    } as React.CSSProperties;

    if (isLoading) {
        return <StorefrontSkeleton />;
    }

    if (!business) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
                 <div>
                    <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4"/>
                    <h1 className="text-4xl font-bold font-headline">Store Not Available</h1>
                    <p className="text-muted-foreground mt-2">This online store is currently offline or does not exist.</p>
                     <Button asChild variant="link" className="mt-4">
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Return to Zeneva Home</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (businessError || productsError) {
         return (
            <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
                 <div>
                    <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4"/>
                    <h1 className="text-4xl font-bold font-headline">An Error Occurred</h1>
                    <p className="text-muted-foreground mt-2">Could not load store data. Please try again later.</p>
                </div>
            </div>
        );
    }

    const desktopCols = business.settings?.publicStore?.desktopColumns || 4;
    const gridClass = {
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
    }[desktopCols];
    
    const settings = business.settings.publicStore;
    
    return (
        <div style={storeStyle} className="bg-background text-foreground">
            <header className="h-[60vh] sm:h-[70vh] md:h-[80vh] bg-muted flex items-center justify-center relative">
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
                            <SelectContent style={storeStyle}>
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
                            <SelectContent style={storeStyle}>
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
                        <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4"/>
                        <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
                    </div>
                )}
            </main>
            
            <StoreFooter business={business} />

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg text-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95">
                        <ShoppingCart className="h-7 w-7" />
                        {cart.length > 0 && <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground">{cart.reduce((acc, item) => acc + item.quantity, 0)}</Badge>}
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col" style={{'--primary': business.settings?.primaryColor, '--accent': business.settings?.primaryColor, '--primary-foreground': (business?.settings?.primaryColor?.split(' ')[2].replace('%','') ?? 55) > 50 ? '0 0% 0%' : '0 0% 100%'} as React.CSSProperties}>
                    <SheetHeader><SheetTitle>Your Cart</SheetTitle></SheetHeader>
                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4">
                        {cart.length > 0 ? cart.map(item => (
                            <div key={item.product.id} className="flex gap-4">
                                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    {item.product.imageUrl && <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover"/>}
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
                cart={cart}
                total={subtotal}
                business={business}
                onOrderPlaced={() => {
                    setIsCheckoutOpen(false);
                    setCart([]);
                }}
            />
        </div>
    );
}
