'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Suspense } from 'react';
import {
    ChevronLeft,
    Upload,
    Loader2,
    Barcode as BarcodeIcon,
    Plus,
    Trash,
    Trash2,
    Layers,
    QrCode,
    AlertCircle
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFieldArray } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Product, UserProfile, AuditLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { usePOS } from '@/context/pos-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { History as HistoryIcon } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import BarcodeDisplay from 'react-barcode';
import { Skeleton } from '@/components/ui/skeleton';
import { logAuditEvent } from '@/lib/audit';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const productSchema = z.object({
    name: z.string().min(3, "Product name must be at least 3 characters."),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be a positive number."),
    costPrice: z.coerce.number().min(0, "Cost price must be a positive number.").optional(),
    stock: z.coerce.number().int("Stock must be a whole number."),
    sku: z.string().optional(),
    category: z.string().optional(),
    categoryType: z.enum(['product', 'service']).default('product'),

    // Advanced Features
    type: z.enum(['single', 'variant', 'composite']).default('single'),
    baseUnit: z.string().optional(),
    uomConversions: z.array(z.object({
        unitName: z.string().min(1, "Unit name required"),
        multiplier: z.coerce.number().min(1, "Multiplier must be at least 1"),
        price: z.coerce.number().optional()
    })).optional(),
    components: z.array(z.object({
        productId: z.string().min(1, "Product required"),
        quantity: z.coerce.number().min(1, "Quantity required")
    })).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function useCurrentUserProfile() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

    return { profile: userProfile, isLoading };
}

function EditProductSkeleton() {
    return (
        <div className="grid flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-48" />
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent><div className="grid gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent><div className="grid gap-6 sm:grid-cols-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>
                </div>
                <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                    <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent><Skeleton className="aspect-square w-full" /></CardContent></Card>
                </div>
            </div>
        </div>
    )
}

function EditProductContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = searchParams.get('id');

    const { toast } = useToast();
    const { currentUserProfile, business, queuedActions, addToQueue, products } = usePOS();
    const firestore = useFirestore();

    const productDocRef = useMemoFirebase(() => (firestore && productId ? doc(firestore, 'products', productId) : null), [firestore, productId]);
    const { data: remoteProduct, isLoading: isRemoteProductLoading } = useDoc<Product>(productDocRef);

    const localProduct = React.useMemo(() => {
        return products?.find(p => p.id === productId) || null;
    }, [products, productId]);

    const product = remoteProduct || localProduct;
    const isProductLoading = isRemoteProductLoading && !localProduct;

    const [isSaving, setIsSaving] = React.useState(false);
    const isSubmitting = React.useRef(false);
    const [isMounted, setIsMounted] = React.useState(false);
    
    React.useEffect(() => {
        setIsMounted(true);
    }, []);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [stockLogs, setStockLogs] = React.useState<AuditLog[]>([]);
    const [isLogsLoading, setIsLogsLoading] = React.useState(true);

    // Fetch Stock Logs
    React.useEffect(() => {
        if (!business?.id || !firestore || !product?.id) {
            if (!isProductLoading) setIsLogsLoading(false);
            return;
        }

        const stockQuery = query(
            collection(firestore, 'businessInstances', business.id, 'auditLogs'),
            where('entityId', '==', product.id),
            where('action', 'in', ['product.stock_adjustment', 'product.create', 'product.update', 'product.bulk_update']),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        // Fallback timer for offline/slow connection to prevent infinite spinner
        const timeoutId = setTimeout(() => {
            setIsLogsLoading(false);
        }, 4000);


        const unsubscribe = onSnapshot(stockQuery, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
            // Filter to ensure we only show logs that actually affected stock or are explicit adjustments
            const filtered = logs.filter(log => {
                if (log.action === 'product.stock_adjustment' || log.action === 'product.create') return true;
                if (log.action === 'product.update' || log.action === 'product.bulk_update') {
                    // Show if it explicitly mentions stock or adjustment
                    return log.details?.adjustment !== undefined || 
                           log.details?.newStock !== undefined || 
                           log.details?.stock !== undefined;
                }
                return false;
            });
            setStockLogs(filtered);
            setIsLogsLoading(false);
            clearTimeout(timeoutId);
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [business?.id, firestore, product?.id, isProductLoading]);
    
    const combinedLogs = React.useMemo(() => {
        const pendingLogs = (queuedActions || [])
            .filter(a => a.type === 'add-audit-log' && a.payload.entityId === product?.id)
            .map(a => ({
                id: a.id,
                ...a.payload,
                isPending: true,
                createdAt: { toDate: () => new Date(a.timestamp) }
            }));

        const all = [...pendingLogs, ...stockLogs];
        return all.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
            return dateB.getTime() - dateA.getTime();
        });
    }, [queuedActions, stockLogs, product?.id]);



    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            costPrice: 0,
            stock: 0,
            sku: "",
            category: "",
            categoryType: "product",
            type: "single",
            baseUnit: "Piece",
            uomConversions: [],
            components: [],
        },
    });

    const { fields: uomFields, append: appendUom, remove: removeUom } = useFieldArray({
        control: form.control,
        name: "uomConversions"
    });

    const { fields: componentFields, append: appendComponent, remove: removeComponent } = useFieldArray({
        control: form.control,
        name: "components"
    });

    const productType = form.watch("type");
    const categoryType = form.watch("categoryType");


    React.useEffect(() => {
        if (product) {
            form.reset(product);
            if (product.imageUrl) {
                setImagePreview(product.imageUrl);
            }
        }
    }, [product, form]);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    variant: 'destructive',
                    title: 'Image Too Large',
                    description: 'Please select an image smaller than 5MB.',
                });
                event.target.value = '';
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (values: ProductFormValues) => {
        if (isSaving || isSubmitting.current) return;
        isSubmitting.current = true;
        setIsSaving(true);
        if (!product || !currentUserProfile || !business) {
            isSubmitting.current = false;
            setIsSaving(false);
            return;
        }

        let imageUrl = product?.imageUrl || '';

        try {
            // 1. If we have an image, we try to upload it backgrounding if possible, 
            // but for simplicity here we'll do it sequentially if online.
            if (imageFile && navigator.onLine) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) {
                    imageUrl = result.data.url;
                }
            }

            const updatedValues = { ...values, imageUrl };
            const cleanData = Object.fromEntries(
                Object.entries(updatedValues).filter(([_, v]) => v !== undefined)
            );

            // 2. Queue the update instead of direct write
            addToQueue({
                type: 'update-product',
                payload: {
                    productId: product.id,
                    values: cleanData
                }
            }, `Updating product: ${values.name}`);

            // 3. Log stock adjustment if changed via queue for offline support
            if (values.stock !== product.stock) {
                addToQueue({
                    type: 'add-audit-log',
                    payload: {
                        businessId: business.id,
                        userId: currentUserProfile.id,
                        userName: currentUserProfile.name,
                        userEmail: currentUserProfile.email,
                        userRole: currentUserProfile.role,
                        action: 'product.stock_adjustment',
                        entityType: 'Product',
                        entityId: product.id,
                        details: { 
                            entityName: product.name,
                            oldStock: product.stock, 
                            newStock: values.stock, 
                            adjustment: values.stock - (product.stock || 0),
                            reason: 'Full Edit Page'
                        }
                    }
                }, `Logging stock adjustment for ${product.name}`);
            }

            toast({ 
                variant: 'success', 
                title: 'Changes Queued', 
                description: `${values.name} will be updated ${navigator.onLine ? 'momentarily' : 'when connection is restored'}.` 
            });
            
            isSubmitting.current = false;
            setIsSaving(false);
            
            router.push('/inventory');

        } catch (error: any) {
            console.error("Failed to queue product update:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'An unexpected error occurred.' });
            isSubmitting.current = false;
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!productId || !business || !currentUserProfile) return;

        setIsDeleteDialogOpen(false);

        addToQueue({
            type: 'delete-product',
            payload: { productIds: [productId] }
        }, `Deleting product ${product?.name}`);

        toast({ variant: 'default', title: 'Deletion Queued', description: `${product?.name} will be deleted.` });
        router.push('/inventory');
    };

    const isLoading = !isMounted || isProductLoading || !firestore;
    const canManageProduct = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'manager';

    if (isLoading) {
        return <EditProductSkeleton />;
    }

    if (!product) {
        return <div>Product not found.</div>;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid flex-1 auto-rows-max gap-4 w-full max-w-full px-1.5 sm:px-0 overflow-x-hidden">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/inventory">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <h1 className="flex-1 min-w-0 text-xl font-semibold tracking-tight break-words leading-normal md:leading-relaxed">
                        Edit {categoryType === 'service' ? 'Service' : 'Product'}: {product.name}
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Button variant="outline" size="lg" type="button" onClick={() => router.push('/inventory')}>
                            Discard
                        </Button>
                        {canManageProduct && (
                            <Button variant="destructive" size="lg" type="button" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        {canManageProduct && (
                            <Button size="lg" type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save {categoryType === 'service' ? 'Service' : 'Product'}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                    <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>{categoryType === 'service' ? 'Service' : 'Product'} Details</CardTitle>
                                <CardDescription>
                                    Update the core details for your {categoryType === 'service' ? 'service' : 'product'}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Quantum HD Monitor" {...field} disabled={!canManageProduct} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="A detailed description of the product." className="min-h-32" {...field} disabled={!canManageProduct} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {categoryType === 'product' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Inventory Configuration</CardTitle>
                                    <CardDescription>Configure how this item is organized and sold.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Product Type</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-col sm:flex-row gap-4"
                                                        disabled={!canManageProduct}
                                                    >
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="single" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">Standard Item</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="composite" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">Composite (Bundle)</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormDescription>
                                                    {productType === 'composite' ? "This item is built from other products. Stock is automatically managed." : "Standard individual product with its own stock."}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Separator />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Units of Measure (UoM)</FormLabel>
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendUom({ unitName: "", multiplier: 1 })} disabled={!canManageProduct}>
                                                <Plus className="h-4 w-4 mr-2" /> Add UoM
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="baseUnit"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Base Unit</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. Piece" {...field} disabled={!canManageProduct} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {uomFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                                <FormField
                                                    control={form.control}
                                                    name={`uomConversions.${index}.unitName`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Unit Name</FormLabel>
                                                            <FormControl><Input placeholder="e.g. Carton" {...field} disabled={!canManageProduct} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`uomConversions.${index}.multiplier`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Contains (multiplier)</FormLabel>
                                                            <FormControl><Input type="number" {...field} disabled={!canManageProduct} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="flex gap-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`uomConversions.${index}.price`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormLabel className="text-xs">Price (Opt.)</FormLabel>
                                                                <FormControl><Input type="number" placeholder="Override" {...field} disabled={!canManageProduct} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeUom(index)} className="text-destructive" disabled={!canManageProduct}><Trash className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {productType === 'composite' && (
                                        <>
                                            <Separator />
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>Composite Components</FormLabel>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendComponent({ productId: "", quantity: 1 })} disabled={!canManageProduct}>
                                                        <Plus className="h-4 w-4 mr-2" /> Add Component
                                                    </Button>
                                                </div>
                                                <FormDescription>Select products that make up this bundle.</FormDescription>

                                                {componentFields.map((field, index) => (
                                                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                                        <FormField
                                                            control={form.control}
                                                            name={`components.${index}.productId`}
                                                            render={({ field }) => (
                                                                <FormItem className="sm:col-span-3">
                                                                    <FormLabel className="text-xs">Product</FormLabel>
                                                                        <FormControl>
                                                                            <Combobox
                                                                                options={products?.filter(p => (!p.type || p.type === 'single') && p.id !== productId).map(p => ({
                                                                                    label: `${p.name} (Stock: ${p.stock})`,
                                                                                    value: p.id
                                                                                })) || []}
                                                                                value={field.value}
                                                                                onChange={field.onChange}
                                                                                placeholder="Select component"
                                                                                searchPlaceholder="Search products..."
                                                                                disabled={!canManageProduct}
                                                                            />
                                                                        </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`components.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Qty</FormLabel>
                                                                    <FormControl><Input type="number" {...field} disabled={!canManageProduct} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(index)} className="text-destructive" disabled={!canManageProduct}><Trash className="h-4 w-4" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle>Pricing{categoryType === 'product' && ' & Stock'}</CardTitle>
                                <CardDescription>
                                    Manage {categoryType === 'service' ? 'pricing information for this service' : 'inventory and pricing information for this product'}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                                    {categoryType === 'product' && (
                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Barcode (SKU)</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl>
                                                            <Input placeholder="QHDM-001" {...field} disabled={!canManageProduct} />
                                                        </FormControl>
                                                        {canManageProduct && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => setIsScannerOpen(true)}
                                                                className="shrink-0"
                                                            >
                                                                <QrCode className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    {categoryType === 'product' && (
                                        <FormField
                                            control={form.control}
                                            name="stock"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="25" {...field} disabled={!canManageProduct} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="349.99" {...field} disabled={!canManageProduct} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="costPrice"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cost Price</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="250.00" {...field} disabled={!canManageProduct} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>


                    </div>
                    <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>{categoryType === 'service' ? 'Service' : 'Product'} Category</CardTitle>
                                <div className="mt-4 space-y-4 px-2">
                                    <FormField
                                        control={form.control}
                                        name="categoryType"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs">Type</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="flex gap-4"
                                                        disabled={!canManageProduct}
                                                    >
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="product" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal text-xs">Product</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="service" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal text-xs">Service</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManageProduct}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {business?.settings?.productCategories && business.settings.productCategories.length > 0 ? (
                                                        business.settings.productCategories.map((cat: string) => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                                            No categories defined.
                                                            <Button variant="link" asChild className="p-0 h-auto ml-1">
                                                                <Link href="/settings">Create one now</Link>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>{categoryType === 'service' ? 'Service' : 'Product'} Image</CardTitle>
                                <CardDescription>
                                    Upload an image (max 5MB) for your {categoryType === 'service' ? 'service' : 'product'}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt={categoryType === 'service' ? 'Service preview' : 'Product preview'} fill style={{ objectFit: "cover" }} />
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <Upload className="mx-auto h-8 w-8" />
                                                <p className="mt-2 text-sm">Click to upload</p>
                                            </div>
                                        )}
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/png, image/jpeg, image/gif"
                                            onChange={handleImageChange}
                                            disabled={!canManageProduct}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        {categoryType === 'product' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Barcode</CardTitle>
                                    <CardDescription>
                                        This barcode is generated from the product's SKU.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {product.sku ? (
                                        <div className="flex justify-center bg-white p-2 rounded-md w-full overflow-x-auto">
                                            <BarcodeDisplay value={product.sku} width={1.5} height={60} />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center">
                                            Add an SKU to generate a barcode for this product.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}


                    </div>
                </div>

                {categoryType === 'product' && (
                    <Card className="border-primary/10 shadow-sm overflow-hidden mt-4">
                        <CardHeader className="bg-primary/5 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <HistoryIcon className="h-4 w-4 text-primary" />
                                        Stock Adjustment History
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Track manual additions and changes to stock quantity. Changes made offline will appear as "Syncing".
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold py-2 px-4">Action</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2">Change</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2">User</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2 text-right px-4">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLogsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : combinedLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                                                No stock adjustment logs found for this product.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        combinedLogs.map((log: any) => {
                                            const adjustment = log.details?.adjustment !== undefined 
                                                ? log.details.adjustment 
                                                : (log.action === 'product.create' ? log.details?.stock : (log.details?.newStock !== undefined && log.details?.oldStock !== undefined ? log.details.newStock - log.details.oldStock : undefined));
                                            const isAddition = adjustment !== undefined && adjustment > 0;
                                            
                                            return (
                                                <TableRow key={log.id} className="hover:bg-muted/20">
                                                    <TableCell className="px-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium capitalize">
                                                                    {log.action.split('.').pop()?.replace('_', ' ')}
                                                                </span>
                                                                {log.isPending && (
                                                                    <Badge variant="outline" className="text-[8px] h-3.5 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-1 animate-pulse">
                                                                        Syncing
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {log.details?.reason && (
                                                                <span className="text-[10px] text-muted-foreground">{log.details.reason}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {adjustment !== undefined ? (
                                                            <Badge 
                                                                variant={isAddition ? "success" : "destructive"} 
                                                                className="text-[10px] h-5"
                                                            >
                                                                {isAddition ? '+' : ''}{adjustment}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Updated</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs">{log.userName}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase">{log.userRole?.replace('_', ' ')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-[10px] text-muted-foreground px-4">
                                                        {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 w-full px-4 md:hidden">
                    <Button variant="outline" size="lg" type="button" onClick={() => router.push('/inventory')}>
                        Discard
                    </Button>
                    {canManageProduct && (
                        <Button variant="destructive" size="lg" type="button" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    )}
                    {canManageProduct && (
                        <Button size="lg" type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save {categoryType === 'service' ? 'Service' : 'Product'}
                        </Button>
                    )}
                </div>
            </form>
            <BarcodeScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(code) => {
                    form.setValue('sku', code);
                    setIsScannerOpen(false);
                    toast({
                        title: "Barcode Scanned",
                        description: `SKU updated to: ${code}`,
                    });
                }}
            />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{product.name}</strong>. This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete Product
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Form>
    );
}

export default function EditProductPage() {
    return (
        <Suspense fallback={<EditProductSkeleton />}>
            <EditProductContent />
        </Suspense>
    );
}
