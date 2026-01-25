
'use client';

import * as React from 'react';
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft,
  Upload,
  Loader2,
  Barcode
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile, Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusiness } from '@/context/pos-context';
import { logAuditEvent } from '@/lib/audit';

const productSchema = z.object({
    name: z.string().min(3, "Product name must be at least 3 characters."),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be a positive number."),
    costPrice: z.coerce.number().min(0, "Cost price must be a positive number.").optional(),
    stock: z.coerce.number().int("Stock must be a whole number.").min(0),
    sku: z.string().optional(),
    category: z.string().optional(),
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
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2"/><Skeleton className="h-4 w-48"/></CardHeader><CardContent><div className="grid gap-6"><Skeleton className="h-10 w-full"/><Skeleton className="h-20 w-full"/></div></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2"/><Skeleton className="h-4 w-48"/></CardHeader><CardContent><div className="grid gap-6 sm:grid-cols-3"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></CardContent></Card>
                </div>
                <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                    <Card><CardHeader><Skeleton className="h-6 w-32"/></CardHeader><CardContent><Skeleton className="h-10 w-full"/></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32 mb-2"/><Skeleton className="h-4 w-48"/></CardHeader><CardContent><Skeleton className="aspect-square w-full"/></CardContent></Card>
                </div>
            </div>
        </div>
    )
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const { toast } = useToast();
    const { profile: userProfile, isLoading: isProfileLoading } = useCurrentUserProfile();
    const business = useBusiness();
    const firestore = useFirestore();
    
    const productDocRef = useMemoFirebase(() => (firestore && productId ? doc(firestore, 'products', productId) : null), [firestore, productId]);
    const { data: product, isLoading: isProductLoading } = useDoc<Product>(productDocRef);

    const [isSaving, setIsSaving] = React.useState(false);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: { name: "", description: "", price: 0, costPrice: 0, stock: 0, sku: "", category: "" },
    });

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
        if (!productDocRef || !product || !userProfile || !firestore || !business) return;

        setIsSaving(true);
        let imageUrl = product?.imageUrl || '';

        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';
                if (!apiKey || apiKey === "your_api_key_here") throw new Error("ImgBB API key is not configured.");
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error(result.error?.message || 'Image upload failed.');
                imageUrl = result.data.url;
            }

            const updatedValues = { ...values, imageUrl };
            await updateDoc(productDocRef, {
                ...updatedValues,
                updatedAt: serverTimestamp(),
            });

            // Log audit event
            logAuditEvent(firestore, business.id, userProfile, {
                action: 'product.update',
                entity: { type: 'Product', id: product.id, name: product.name },
                details: { changes: Object.keys(values).filter(key => values[key as keyof typeof values] !== product[key as keyof typeof product])}
            });


            toast({ variant: 'success', title: 'Product Updated', description: `${values.name} has been updated.` });
            router.push('/inventory');

        } catch (error: any) {
            console.error("Failed to update product:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = isProfileLoading || isProductLoading;
    const canManageProduct = userProfile?.role === 'admin' || userProfile?.role === 'manager';

    if (isLoading) {
        return <EditProductSkeleton />;
    }

    if (!product) {
        return <div>Product not found.</div>;
    }
    
    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/inventory">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Edit: {product.name}
            </h1>
            <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button variant="outline" size="lg" type="button" onClick={() => router.push('/inventory')}>
                Discard
            </Button>
            {canManageProduct && (
                <Button size="lg" type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            )}
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
            <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
                <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                    Update the core details for your product.
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
            <Card>
                <CardHeader>
                <CardTitle>Stock &amp; Pricing</CardTitle>
                <CardDescription>
                    Manage inventory and pricing information for this product.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Barcode (SKU)</FormLabel>
                            <FormControl>
                                <Input placeholder="QHDM-001" {...field} disabled={!canManageProduct}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="25" {...field} disabled={!canManageProduct}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="349.99" {...field} disabled={!canManageProduct}/>
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
                                <Input type="number" step="0.01" placeholder="250.00" {...field} disabled={!canManageProduct}/>
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
                <CardTitle>Product Category</CardTitle>
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
                                    business.settings.productCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No categories defined.
                                        <Button variant="link" asChild className="p-0 h-auto ml-1">
                                            <Link href="/settings#product-categories">Create one now</Link>
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
                <CardTitle>Product Image</CardTitle>
                <CardDescription>
                    Upload an image (max 5MB) for your product.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2">
                        <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Product preview" fill style={{objectFit: "cover"}} />
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
            </div>
        </div>
        <div className="flex items-center justify-center gap-2 md:hidden">
            <Button variant="outline" size="lg" type="button" onClick={() => router.push('/inventory')}>
            Discard
            </Button>
            {canManageProduct && (
                 <Button size="lg" type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            )}
        </div>
        </form>
        </Form>
    );
}
