'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Suspense } from 'react';
import {
    ChevronLeft,
    ChevronDown,
    Upload,
    Loader2,
    Barcode as BarcodeIcon,
    Plus,
    Trash,
    Trash2,
    Layers,
    QrCode,
    AlertCircle,
    Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useFieldArray } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Product, UserProfile, AuditLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { usePOS } from '@/context/pos-context';
import { useI18n } from '@/context/i18n-context';
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
import { Label } from "@/components/ui/label";
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
import { EditProductBodySkeleton } from './skeleton';
import { logAuditEvent } from '@/lib/audit';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const makeProductSchema = (t: (key: string) => string) => z.object({
    name: z.string().min(3, t('inventory.valNameMin')),
    description: z.string().optional(),
    price: z.coerce.number().min(0, t('inventory.valPricePositive')),
    costPrice: z.coerce.number().min(0, t('inventory.valCostPositive')).optional(),
    stock: z.coerce.number().int(t('inventory.valStockWhole')),
    sku: z.string().optional(),
    category: z.string().optional(),
    categoryType: z.enum(['product', 'service']).default('product'),

    // Advanced Features
    type: z.enum(['single', 'variant', 'composite']).default('single'),
    baseUnit: z.string().optional(),
    uomConversions: z.array(z.object({
        unitName: z.string().min(1, t('inventory.valUnitNameRequired')),
        multiplier: z.coerce.number().min(1, t('inventory.valMultiplierMin')),
        price: z.coerce.number().optional()
    })).optional(),
    components: z.array(z.object({
        productId: z.string().min(1, t('inventory.valProductRequired')),
        quantity: z.coerce.number().min(1, t('inventory.valQuantityRequired'))
    })).optional(),
});

type ProductFormValues = z.infer<ReturnType<typeof makeProductSchema>>;

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
    return <EditProductBodySkeleton />;
}

function EditProductContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = searchParams.get('id');

    const { toast } = useToast();
    const { currentUserProfile, business, queuedActions, addToQueue, products } = usePOS();
    const { t } = useI18n();
    const firestore = useFirestore();

    const productSchema = React.useMemo(() => makeProductSchema(t), [t]);

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

    // Category Management
    const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState("");
    const [isAddingCategory, setIsAddingCategory] = React.useState(false);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !business || !firestore) return;
        setIsAddingCategory(true);
        try {
            const updatedCategories = [...(business.settings?.productCategories || []), newCategoryName.trim()];
            await updateDoc(doc(firestore, 'businessInstances', business.id), {
                'settings.productCategories': updatedCategories
            });
            form.setValue('category', newCategoryName.trim());
            setNewCategoryName("");
            toast({ title: t('inventory.categoryCreatedTitle'), description: t('inventory.categoryCreatedBody', { name: newCategoryName.trim() }), variant: 'success' });
        } catch (err) {
            toast({ title: t('common.error'), description: t('inventory.categoryCreateFailed'), variant: 'destructive' });
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleDeleteCategory = async (catToDelete: string) => {
        if (!business || !firestore) return;
        try {
            const updatedCategories = (business.settings?.productCategories || []).filter(c => c !== catToDelete);
            await updateDoc(doc(firestore, 'businessInstances', business.id), {
                'settings.productCategories': updatedCategories
            });
            if (form.getValues('category') === catToDelete) {
                form.setValue('category', '');
            }
            toast({ title: t('inventory.categoryDeletedTitle'), description: t('inventory.categoryDeletedBody', { name: catToDelete }), variant: 'success' });
        } catch (err) {
            toast({ title: t('common.error'), description: t('inventory.categoryDeleteFailed'), variant: 'destructive' });
        }
    };

    // Fetch Stock Logs
    React.useEffect(() => {
        if (!business?.id || !firestore || !product?.id) {
            if (!isProductLoading) setIsLogsLoading(false);
            return;
        }

        const stockQuery = query(
            collection(firestore, 'businessInstances', business.id, 'auditLogs'),
            where('entityId', '==', product.id),
            where('action', 'in', ['product.stock_adjustment', 'product.create', 'product.update', 'product.bulk_update', 'product.sale']),
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
                if (log.action === 'product.stock_adjustment' || log.action === 'product.create' || log.action === 'product.sale') return true;
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

    const [logFilter, setLogFilter] = React.useState('all');

    const filteredLogs = React.useMemo(() => {
        if (logFilter === 'all') return combinedLogs;
        return combinedLogs.filter((log: any) => {
            if (logFilter === 'sale') return log.action === 'product.sale';
            if (logFilter === 'stock_adjustment') return log.action === 'product.stock_adjustment';
            if (logFilter === 'update') return log.action === 'product.create' || log.action === 'product.update' || log.action === 'product.bulk_update';
            return true;
        });
    }, [combinedLogs, logFilter]);



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
                    title: t('inventory.imageTooLargeTitle'),
                    description: t('inventory.imageTooLargeBody'),
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
                formData.append('file', imageFile);
                try {
                    const response = await fetch(`/api/upload`, { method: 'POST', body: formData });
                    const result = await response.json();
                    if (response.ok && result.url) {
                        imageUrl = result.url;
                    } else {
                        console.error("Image upload failed:", result.error);
                    }
                } catch (error) {
                    console.error("Failed to upload image:", error);
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

            // 4. Log price and cost movements as a before/after pair.
            //
            // The loss-prevention scan pairs a cut with a later restore to spot
            // the price-swap (drop the price, sell it cheap, put it back). Both
            // edits leave the catalogue looking untouched, so this pair of logs
            // is the only trace it happened. See src/lib/forensics.ts, check S7.
            const priceMoved = values.price !== product.price;
            const costMoved = (values.costPrice ?? 0) !== (product.costPrice ?? 0);
            if (priceMoved || costMoved) {
                const changes: Record<string, { from: any; to: any }> = {};
                if (priceMoved) changes.price = { from: product.price ?? 0, to: values.price };
                if (costMoved) changes.costPrice = { from: product.costPrice ?? 0, to: values.costPrice ?? 0 };

                addToQueue({
                    type: 'add-audit-log',
                    payload: {
                        businessId: business.id,
                        userId: currentUserProfile.id,
                        userName: currentUserProfile.name,
                        userEmail: currentUserProfile.email,
                        userRole: currentUserProfile.role,
                        action: 'product.update',
                        entityType: 'Product',
                        entityId: product.id,
                        details: {
                            entityName: product.name,
                            changes,
                            reason: 'Full Edit Page',
                        }
                    }
                }, `Logging price change for ${product.name}`);
            }

            toast({
                variant: 'success',
                title: t('inventory.changesQueuedTitle'),
                description: navigator.onLine
                    ? t('inventory.changesQueuedOnline', { name: values.name })
                    : t('inventory.changesQueuedOffline', { name: values.name }),
            });

            isSubmitting.current = false;
            setIsSaving(false);

            router.push('/inventory');

        } catch (error: any) {
            console.error("Failed to queue product update:", error);
            toast({ variant: 'destructive', title: t('inventory.updateFailedTitle'), description: error.message || t('inventory.unexpectedError') });
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

        // Record what the system still believed was on the shelf.
        //
        // Deleting a product removes the item *and* its outstanding count in one
        // action, so a shortage disappears with no adjustment left behind to
        // question — the cleanest way to erase missing stock. `stockAtDeletion`
        // is the only thing that makes that visible afterwards, and it cannot be
        // reconstructed once the product document is gone. Forensics check S6.
        addToQueue({
            type: 'add-audit-log',
            payload: {
                businessId: business.id,
                userId: currentUserProfile.id,
                userName: currentUserProfile.name,
                userEmail: currentUserProfile.email,
                userRole: currentUserProfile.role,
                action: 'product.delete',
                entityType: 'Product',
                entityId: productId,
                details: {
                    entityName: product?.name ?? null,
                    stockAtDeletion: product?.stock ?? 0,
                    price: product?.price ?? 0,
                    costPrice: product?.costPrice ?? 0,
                    sku: product?.sku ?? null,
                }
            }
        }, `Logging deletion of ${product?.name}`);

        toast({ variant: 'default', title: t('inventory.deletionQueuedTitle'), description: t('inventory.deletionQueuedNamed', { name: product?.name ?? '' }) });
        router.push('/inventory');
    };

    const isLoading = !isMounted || isProductLoading || !firestore;
    const canManageProduct = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'manager';

    if (isLoading) {
        return <EditProductSkeleton />;
    }

    if (!product) {
        return <div>{t('inventory.productNotFound')}</div>;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid flex-1 auto-rows-max gap-4 w-full max-w-full px-1.5 sm:px-0 overflow-x-hidden">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/inventory">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">{t('common.back')}</span>
                        </Link>
                    </Button>
                    <h1 className="flex-1 min-w-0 text-xl font-semibold tracking-tight break-words leading-normal md:leading-relaxed">
                        {categoryType === 'service'
                            ? t('inventory.editServiceTitle', { name: product.name })
                            : t('inventory.editProductTitle', { name: product.name })}
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Button variant="outline" size="lg" type="button" onClick={() => router.push('/inventory')}>
                            {t('common.discard')}
                        </Button>
                        {canManageProduct && (
                            <Button variant="destructive" size="lg" type="button" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                            </Button>
                        )}
                        {canManageProduct && (
                            <Button size="lg" type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {categoryType === 'service' ? t('inventory.saveService') : t('inventory.saveProduct')}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                    <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>{categoryType === 'service' ? t('inventory.serviceDetails') : t('inventory.productDetails')}</CardTitle>
                                <CardDescription>
                                    {categoryType === 'service' ? t('inventory.serviceDetailsUpdateHint') : t('inventory.productDetailsUpdateHint')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('common.name')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('inventory.namePlaceholder')} {...field} disabled={!canManageProduct} />
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
                                                <FormLabel>{t('common.description')}</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder={t('inventory.descriptionPlaceholder')} className="min-h-32" {...field} disabled={!canManageProduct} />
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
                                    <CardTitle>{t('inventory.inventoryConfig')}</CardTitle>
                                    <CardDescription>{t('inventory.inventoryConfigHint')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>{t('inventory.productType')}</FormLabel>
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
                                                            <FormLabel className="font-normal">{t('inventory.standardItem')}</FormLabel>
                                                        </FormItem>
                                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                                <FormControl>
                                                                    <RadioGroupItem value="variant" />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">{t('inventory.variant')}</FormLabel>
                                                            </FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormDescription>
                                                        {productType === 'variant' ? t('inventory.variantTypeHint') : t('inventory.singleTypeHint')}
                                                    </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Separator />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-1.5">
                                                {t('inventory.uomTitle')}
                                                <TooltipProvider>
                                                    <Tooltip delayDuration={300}>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[250px]">
                                                            <p>{t('inventory.uomTooltip')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendUom({ unitName: "", multiplier: 1 })} disabled={!canManageProduct}>
                                                <Plus className="h-4 w-4 mr-2" /> {t('inventory.addUom')}
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="baseUnit"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">{t('inventory.baseUnit')}</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder={t('inventory.baseUnitPlaceholder')} {...field} disabled={!canManageProduct} />
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
                                                            <FormLabel className="text-xs">{t('inventory.unitName')}</FormLabel>
                                                            <FormControl><Input placeholder={t('inventory.unitNamePlaceholder')} {...field} disabled={!canManageProduct} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`uomConversions.${index}.multiplier`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">{t('inventory.uomMultiplier')}</FormLabel>
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
                                                                <FormLabel className="text-xs">{t('inventory.priceOptional')}</FormLabel>
                                                                <FormControl><Input type="number" placeholder={t('inventory.priceOverride')} {...field} disabled={!canManageProduct} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeUom(index)} className="text-destructive" disabled={!canManageProduct}><Trash className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle>{categoryType === 'product' ? t('inventory.pricingAndStockTitle') : t('inventory.pricingTitle')}</CardTitle>
                                <CardDescription>
                                    {categoryType === 'service' ? t('inventory.pricingServiceHint') : t('inventory.pricingProductHint')}
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
                                                    <FormLabel>{t('inventory.barcodeSku')}</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl>
                                                            <Input placeholder={t('inventory.skuPlaceholder')} {...field} disabled={!canManageProduct} />
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
                                                    <FormLabel>{t('inventory.stock')}</FormLabel>
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
                                                <FormLabel>{t('common.price')}</FormLabel>
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
                                                <FormLabel className="flex items-center gap-1.5">
                                                    {t('inventory.costPrice')}
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={300}>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-[250px]">
                                                                <p>{t('inventory.costPriceTooltip')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </FormLabel>
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
                                <div className="flex items-center justify-between">
                                    <CardTitle>{categoryType === 'service' ? t('inventory.serviceCategory') : t('inventory.productCategory')}</CardTitle>
                                    {canManageProduct && (
                                        <>
                                            {isMounted && isNewCategoryModalOpen && createPortal(
                                                <div 
                                                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] transition-opacity animate-in fade-in-0" 
                                                    onClick={() => setIsNewCategoryModalOpen(false)} 
                                                />,
                                                document.body
                                            )}
                                            <Dialog open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen} modal={false}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" type="button" className="h-7 text-xs">
                                                        <Plus className="h-3 w-3 mr-1" /> {t('inventory.manageCategories')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[480px]">
                                                    <DialogHeader>
                                                        <DialogTitle>{t('inventory.manageCategories')}</DialogTitle>
                                                        <DialogDescription className="text-xs text-muted-foreground">
                                                            {t('inventory.manageCategoriesHint')}
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <div className="space-y-3 py-2 border-b pb-4">
                                                        <Label className="text-xs font-semibold">{t('inventory.addNewCategory')}</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder={t('inventory.newCategoryPlaceholder')}
                                                                value={newCategoryName}
                                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddCategory();
                                                                    }
                                                                }}
                                                            />
                                                            <Button type="button" onClick={handleAddCategory} disabled={!newCategoryName.trim() || isAddingCategory} className="shrink-0">
                                                                {isAddingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                                                {t('common.add')}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2">
                                                        <Label className="text-xs font-semibold">{t('inventory.existingCategories')}</Label>
                                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                                            {business?.settings?.productCategories && business.settings.productCategories.length > 0 ? (
                                                                business.settings.productCategories.map((cat: string) => (
                                                                    <div key={cat} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-sm">
                                                                        <span className="font-medium">{cat}</span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => handleDeleteCategory(cat)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            <span className="sr-only">{t('inventory.deleteCategoryAria', { name: cat })}</span>
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground italic py-2">{t('inventory.noCategoriesYet')}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <DialogFooter className="pt-2">
                                                        <Button type="button" variant="outline" onClick={() => setIsNewCategoryModalOpen(false)}>{t('common.done')}</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </>
                                    )}
                                </div>
                                <div className="mt-4 space-y-4 px-2">
                                    <FormField
                                        control={form.control}
                                        name="categoryType"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs">{t('common.type')}</FormLabel>
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
                                                            <FormLabel className="font-normal text-xs">{t('inventory.typeProduct')}</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="service" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal text-xs">{t('inventory.typeService')}</FormLabel>
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
                                             <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" type="button" className="w-full justify-between font-normal bg-background h-10 px-3 border-input" disabled={!canManageProduct}>
                                                        <span>{field.value || t('inventory.selectCategory')}</span>
                                                        <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto z-50">
                                                    {business?.settings?.productCategories && business.settings.productCategories.length > 0 ? (
                                                        business.settings.productCategories.map((cat: string) => (
                                                            <DropdownMenuItem key={cat} onClick={() => field.onChange(cat)} className="cursor-pointer">
                                                                {cat}
                                                            </DropdownMenuItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                                            {t('inventory.noCategoriesDefined')}
                                                        </div>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>{categoryType === 'service' ? t('inventory.serviceImage') : t('inventory.productImage')}</CardTitle>
                                <CardDescription>
                                    {categoryType === 'service' ? t('inventory.serviceImageHint') : t('inventory.productImageHint')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt={categoryType === 'service' ? t('inventory.servicePreviewAlt') : t('inventory.productPreviewAlt')} fill style={{ objectFit: "cover" }} />
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <Upload className="mx-auto h-8 w-8" />
                                                <p className="mt-2 text-sm">{t('inventory.clickToUpload')}</p>
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
                                    <CardTitle>{t('inventory.barcode')}</CardTitle>
                                    <CardDescription>
                                        {t('inventory.barcodeGeneratedHint')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {product.sku ? (
                                        <div className="flex justify-center bg-white p-2 rounded-md w-full overflow-x-auto">
                                            <BarcodeDisplay value={product.sku} width={1.5} height={60} />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center">
                                            {t('inventory.addSkuForBarcode')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}


                    </div>
                </div>

                {(categoryType === 'product' || categoryType === 'service') && (
                    <Card className="border-primary/10 shadow-sm overflow-hidden mt-4">
                        <CardHeader className="bg-primary/5 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <HistoryIcon className="h-4 w-4 text-primary" />
                                        {categoryType === 'service' ? t('inventory.serviceHistoryTitle') : t('inventory.stockHistoryTitle')}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {categoryType === 'service'
                                            ? t('inventory.serviceHistoryHint')
                                            : t('inventory.stockHistoryHint')}
                                    </CardDescription>
                                </div>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-[150px] h-8 text-[11px] justify-between bg-background font-normal">
                                            <span>
                                                {logFilter === 'all' ? t('inventory.logFilterAll') : logFilter === 'sale' ? t('inventory.logFilterSales') : logFilter === 'stock_adjustment' ? t('inventory.logFilterAdjustments') : t('inventory.logFilterUpdates')}
                                            </span>
                                            <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[150px]">
                                        <DropdownMenuItem onClick={() => setLogFilter('all')}>{t('inventory.logFilterAll')}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setLogFilter('sale')}>{t('inventory.logFilterSales')}</DropdownMenuItem>
                                        {categoryType === 'product' && <DropdownMenuItem onClick={() => setLogFilter('stock_adjustment')}>{t('inventory.logFilterAdjustments')}</DropdownMenuItem>}
                                        <DropdownMenuItem onClick={() => setLogFilter('update')}>{t('inventory.logFilterUpdates')}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold py-2 px-4">{t('inventory.colAction')}</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2">{t('inventory.colChange')}</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2">{t('inventory.colUser')}</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold py-2 text-right px-4">{t('common.date')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLogsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                                                {t('inventory.noLogsFound')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log: any) => {
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
                                                                        {t('inventory.syncingBadge')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {log.details?.reason && (() => {
                                                                const match = log.details.reason.match(/(rec-[a-f0-9]+)/i);
                                                                if (match) {
                                                                    const receiptNumber = match[1];
                                                                    const parts = log.details.reason.split(receiptNumber);
                                                                    const receiptId = log.details?.receiptId;
                                                                    const href = receiptId 
                                                                        ? `/receipts/details?id=${receiptId}`
                                                                        : `/receipts?search=${receiptNumber}`;
                                                                    return (
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            {parts[0]}
                                                                            <Link 
                                                                                href={href} 
                                                                                className="text-primary hover:underline font-mono font-medium"
                                                                            >
                                                                                {receiptNumber}
                                                                            </Link>
                                                                            {parts[1]}
                                                                        </span>
                                                                    );
                                                                }
                                                                return <span className="text-[10px] text-muted-foreground">{log.details.reason}</span>;
                                                            })()}
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
                                                            <span className="text-xs text-muted-foreground">{t('inventory.updatedLabel')}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs">{log.userName}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase">{log.userRole?.replace('_', ' ')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-[10px] text-muted-foreground px-4">
                                                        {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : t('inventory.justNow')}
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
                        {t('common.discard')}
                    </Button>
                    {canManageProduct && (
                        <Button variant="destructive" size="lg" type="button" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                        </Button>
                    )}
                    {canManageProduct && (
                        <Button size="lg" type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {categoryType === 'service' ? t('inventory.saveService') : t('inventory.saveProduct')}
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
                        title: t('inventory.barcodeScannedTitle'),
                        description: t('inventory.barcodeScannedBody', { code }),
                    });
                }}
            />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('inventory.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('inventory.deleteOneConfirmBody', { name: product.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {t('inventory.deleteProductButton')}
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
