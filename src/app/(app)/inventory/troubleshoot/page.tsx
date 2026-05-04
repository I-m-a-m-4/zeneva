
"use client";

import { productTroubleshoot } from "@/ai/flows/product-troubleshoot-flow";
import type { Product, AISuggestions } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePOS } from "@/context/pos-context";
import { AlertTriangle, CheckCircle, Lightbulb, Loader2, PartyPopper, Package, FileText, DollarSign, BarChart, Zap, Edit, Flame, ShieldAlert, Info } from "lucide-react";
import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFirestore } from "@/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

function IssueDetailsDialog({ isOpen, onOpenChange, issue }: { isOpen: boolean, onOpenChange: (open: boolean) => void, issue: { title: string, items: Product[] } | null }) {
  if (!issue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{issue.title}</DialogTitle>
          <DialogDescription>
            Found {issue.items.length} products with this issue. Click on a product to go to its edit page and resolve the issue.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="space-y-2 pr-4">
            {issue.items.map(product => (
              <Link href={`/inventory/details?id=${product.id}`} key={product.id} className="block p-3 rounded-md border hover:bg-muted" onClick={() => onOpenChange(false)}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku || 'No SKU'}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <div className="flex items-center">
                            <Edit className="h-4 w-4 mr-2"/> Fix
                        </div>
                    </Button>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function IssueCard({ icon: Icon, title, count, items, unit = "items", onFixClick }: { icon: React.ElementType, title: string, count: number, items: Product[], unit?: string, onFixClick: () => void }) {
    if (count === 0) return null;
    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Icon className="h-5 w-5 text-destructive"/>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-3xl font-bold text-destructive">{count}</p>
                <p className="text-xs text-muted-foreground">{unit} with this issue</p>
                {items.length > 0 && (
                     <ul className="text-xs text-muted-foreground mt-4 space-y-1">
                        {items.slice(0, 2).map(p => <li key={p.id} className="truncate" title={p.name}>- {p.name}</li>)}
                        {items.length > 2 && <li>...and {items.length - 2} more</li>}
                     </ul>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="secondary" className="w-full" onClick={onFixClick}>
                    <Edit className="h-4 w-4 mr-2" />
                    View & Fix
                </Button>
            </CardFooter>
        </Card>
    )
}

const severityIcons = {
    High: <Flame className="h-5 w-5 text-destructive" />,
    Medium: <ShieldAlert className="h-5 w-5 text-amber-500" />,
    Low: <Info className="h-5 w-5 text-sky-500" />,
}

export default function TroubleshootPage() {
    const { products, business, isLoading: isDataLoading, currentUserProfile, isLoading: isUserLoading } = usePOS();
    const isLoading = isDataLoading || isUserLoading;
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && currentUserProfile) {
            const hasPermission = currentUserProfile.permissions?.manage_inventory ?? (currentUserProfile.role === 'admin' || currentUserProfile.role === 'manager');
            if (!hasPermission) {
                router.push('/dashboard');
            }
        }
    }, [currentUserProfile, isLoading, router]);

    const [isPending, startTransition] = useTransition();
    const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<{ title: string, items: Product[] } | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (business?.settings?.aiTroubleshootSuggestions) {
            setSuggestions(business.settings.aiTroubleshootSuggestions);
        }
    }, [business]);
    
    const analysis = useMemo(() => {
        if (!products) return null;
        const productsWithoutPrice = products.filter(p => !p.price || p.price <= 0);
        const productsWithoutCategory = products.filter(p => !p.category);
        const productsWithoutDescription = products.filter(p => !p.description || p.description.length < 10);
        const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5));
        
        const totalPoints = products.length * 4;
        const issuePoints = productsWithoutPrice.length + productsWithoutCategory.length + productsWithoutDescription.length + lowStockProducts.length;
        const dataQualityScore = totalPoints > 0 ? Math.round(((totalPoints - issuePoints) / totalPoints) * 100) : 100;

        return {
            productsWithoutPrice,
            productsWithoutCategory,
            productsWithoutDescription,
            lowStockProducts,
            dataQualityScore,
            totalProducts: products.length
        }
    }, [products]);

    const handleFixClick = (title: string, items: Product[]) => {
        setSelectedIssue({ title, items });
        setIsModalOpen(true);
    };

    const handleGetSuggestions = () => {
        if (!products || products.length === 0 || !business?.id || !firestore) {
            toast({ variant: 'destructive', title: 'Cannot Run AI Analysis', description: 'Product or business data is not available.' });
            return;
        }
        startTransition(async () => {
            const sanitizedProducts = products.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                category: p.category,
                sku: p.sku,
            }));

            const result = await productTroubleshoot({ products: sanitizedProducts });
            
            const dataToSave: AISuggestions = { ...result, createdAt: serverTimestamp() };

            try {
                const businessDocRef = doc(firestore, 'businessInstances', business.id);
                await updateDoc(businessDocRef, {
                    'settings.aiTroubleshootSuggestions': dataToSave
                });
                setSuggestions({ ...result, createdAt: new Date() });
                toast({ variant: 'success', title: 'Suggestions Saved', description: 'Your AI suggestions have been generated and saved.' });
            } catch (error) {
                console.error("Failed to save AI suggestions:", error);
                toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the AI suggestions.' });
                setSuggestions({ ...result, createdAt: new Date() });
            }
        });
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
    }
    
    if (!analysis || analysis.totalProducts === 0) {
         return (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Inventory Health Check</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                     <Package className="h-16 w-16 mx-auto text-muted-foreground/50"/>
                     <h3 className="text-xl font-semibold mt-4">No Products to Analyze</h3>
                     <p className="text-muted-foreground mt-2">Add some products to your inventory to get started.</p>
                </CardContent>
            </Card>
         )
    }

    const canUseAIFeature = ['pro', 'business'].includes(business?.plan || '') || business?.accessLevel === 'lifetime';

    const allIssues = [
        { icon: DollarSign, title: "Missing Price", count: analysis.productsWithoutPrice.length, items: analysis.productsWithoutPrice },
        { icon: BarChart, title: "Low Stock", count: analysis.lowStockProducts.length, items: analysis.lowStockProducts },
        { icon: FileText, title: "Short Description", count: analysis.productsWithoutDescription.length, items: analysis.productsWithoutDescription },
        { icon: Package, title: "Missing Category", count: analysis.productsWithoutCategory.length, items: analysis.productsWithoutCategory },
    ];
    
    const hasIssues = allIssues.some(issue => issue.count > 0);

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Inventory Health Check</CardTitle>
                    <CardDescription>Automated analysis of your {analysis.totalProducts} products to identify potential issues.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Overall Data Quality</span>
                            <span className="text-sm font-bold">{analysis.dataQualityScore}%</span>
                        </div>
                        <Progress value={analysis.dataQualityScore} aria-label={`${analysis.dataQualityScore}% data quality`} />
                        <p className="text-xs text-muted-foreground mt-2">A score based on data completeness and stock levels.</p>
                    </div>

                    {hasIssues ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {allIssues.map(issue => <IssueCard key={issue.title} {...issue} onFixClick={() => handleFixClick(issue.title, issue.items)} />)}
                        </div>
                    ) : (
                        <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 [&>svg]:text-green-600">
                           <CheckCircle className="h-4 w-4" />
                           <AlertTitle className="font-semibold">Excellent Data Quality!</AlertTitle>
                           <AlertDescription>All your products have prices, categories, descriptions, and healthy stock levels.</AlertDescription>
                       </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Lightbulb className="text-primary"/> AI-Powered Suggestions</CardTitle>
                    <CardDescription>
                        Use GenAI to get advanced merchandising and data quality recommendations for your live inventory. Suggestions are saved and can be revisited anytime.
                    </CardDescription>
                </CardHeader>
                {canUseAIFeature ? (
                    <>
                        <CardContent>
                            {isPending ? (
                                <div className="space-y-2 p-8 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    <p className="text-muted-foreground">AI is analyzing your inventory...</p>
                                </div>
                            ) : suggestions?.suggestions?.length > 0 ? (
                                <Accordion type="multiple" className="w-full space-y-2">
                                    {suggestions.suggestions.map((suggestion, index) => (
                                        <AccordionItem key={index} value={`item-${index}`} className="border-b-0 rounded-lg border bg-muted/50 px-4">
                                            <AccordionTrigger className="py-3 hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    {severityIcons[suggestion.severity]}
                                                    <span className="font-medium text-base">{suggestion.title}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 text-muted-foreground">
                                                {suggestion.description}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>

                            ) : (
                                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                    <PartyPopper className="mx-auto h-12 w-12" />
                                    <p className="mt-4 font-medium">Ready for some AI magic?</p>
                                    <p className="text-sm">Click the button to get merchandising and SEO tips based on your products.</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <Button onClick={handleGetSuggestions} disabled={isPending || analysis.totalProducts === 0}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isPending ? "Analyzing..." : suggestions ? "Regenerate Suggestions" : "Get AI Suggestions"}
                            </Button>
                            {suggestions?.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                    Last generated: {formatDistanceToNow(suggestions.createdAt.toDate ? suggestions.createdAt.toDate() : new Date(suggestions.createdAt), { addSuffix: true })}
                                </p>
                            )}
                        </CardFooter>
                    </>
                ) : (
                    <CardContent className="text-center py-12">
                        <Zap className="h-16 w-16 mx-auto text-muted-foreground/50"/>
                        <h3 className="text-xl font-semibold mt-4">Upgrade to Unlock AI Suggestions</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Get advanced merchandising, data quality recommendations, and more by upgrading to our Pro or Business plan.</p>
                        <Button asChild className="mt-6">
                            <Link href="/billing">Upgrade Your Plan</Link>
                        </Button>
                    </CardContent>
                )}
            </Card>

            <IssueDetailsDialog 
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                issue={selectedIssue}
            />
        </div>
    );
}
