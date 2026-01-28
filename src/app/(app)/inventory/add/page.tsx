
'use client';

import * as React from 'react';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft,
  Upload,
  CalendarIcon
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
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { usePOS } from '@/context/pos-context';
import { logAuditEvent } from '@/lib/audit';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const productSchema = z.object({
    name: z.string().min(3, "Product name must be at least 3 characters."),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be a positive number."),
    costPrice: z.coerce.number().min(0, "Cost price must be a positive number.").optional(),
    stock: z.coerce.number().int("Stock must be a whole number.").min(0),
    sku: z.string().optional(),
    category: z.string().optional(),
    expiryDate: z.date().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const PRODUCT_LIMITS = {
  starter: 500,
  pro: 1500,
  business: Infinity,
};

export default function AddProductPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { business, products, currentUserProfile, isLoading } = usePOS();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    
    const userProfile = currentUserProfile;

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
        },
    });

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
        if (!userProfile || !firestore || !business || !products) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session data not found. Please refresh.' });
            return;
        }

        const canAddProduct = userProfile.role === 'admin' || userProfile.role === 'manager';
        if (!canAddProduct) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to add products.' });
            return;
        }

        const currentPlan = business.plan || 'starter';
        const limit = PRODUCT_LIMITS[currentPlan as keyof typeof PRODUCT_LIMITS] || 500;

        if (limit !== Infinity && products.length >= limit) {
             toast({
                variant: 'destructive',
                title: 'Product Limit Reached',
                description: `You have reached your limit of ${limit} products for the ${currentPlan} plan. Please upgrade to add more.`,
            });
            router.push('/billing');
            return;
        }


        setIsSaving(true);
        let imageUrl = '';

        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                
                const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';
                if (!apiKey || apiKey === "your_api_key_here") {
                    throw new Error("ImgBB API key is not configured.");
                }

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error?.message || 'Image upload failed.');
                }
                imageUrl = result.data.url;
            }

            const productsCollection = collection(firestore, 'products');
            const newDocRef = await addDoc(productsCollection, {
                ...values,
                businessId: userProfile.businessId,
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Log audit event (fire-and-forget)
            logAuditEvent(firestore, business.id, userProfile, {
                action: 'product.create',
                entity: { type: 'Product', id: newDocRef.id, name: values.name },
                details: { name: values.name, price: values.price, stock: values.stock }
            });

            toast({ variant: 'success', title: 'Product Saved', description: `${values.name} has been added to your inventory.` });
            router.push('/inventory');

        } catch (error: any) {
            console.error("Failed to save product:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

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
          Add New Product
        </h1>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <Button variant="outline" size="default" type="button" onClick={() => router.push('/inventory')}>
            Discard
          </Button>
          <Button size="default" type="submit" disabled={isSaving || isLoading}>
            {(isSaving || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Provide the core details for your new product.
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
                        <Input placeholder="e.g. Quantum HD Monitor" {...field} />
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
                        <Textarea placeholder="A detailed description of the product." className="min-h-32" {...field} />
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
                            <Input placeholder="QHDM-001" {...field} />
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
                            <Input type="number" placeholder="25" {...field} />
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
                            <Input type="number" step="0.01" placeholder="349.99" {...field} />
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
                            <Input type="number" step="0.01" placeholder="250.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
              </div>
               <div className="mt-6">
                <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormDescription>
                            Optional: For perishable goods.
                        </FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        />
                     </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 md:hidden">
        <Button variant="outline" size="default" type="button" onClick={() => router.push('/inventory')}>
          Discard
        </Button>
        <Button size="default" type="submit" disabled={isSaving || isLoading}>
            {(isSaving || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
        </Button>
      </div>
    </form>
    </Form>
  );
}
