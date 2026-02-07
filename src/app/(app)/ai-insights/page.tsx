
"use client";

import { businessAnalysis } from "@/ai/flows/business-analysis-flow";
import type { BusinessAnalysisOutput, SmartStockRecommendation, RevenueOpportunity, SmartMerchandising, SlowMovingInventory, Product, Customer, CustomerSegment, PricingRecommendation, BusinessInstance } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { usePOS } from "@/context/pos-context";
import { Lightbulb, Loader2, Package, TrendingUp, ShoppingCart, AlertTriangle, Users, Bot, Layers, DollarSign, Send, Edit, Copy, Mail, Search } from "lucide-react";
import React, { useState, useTransition, useEffect, useMemo } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays } from "date-fns";
import PageTitle from "@/components/shared/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FeatureGate from "@/components/shared/feature-gate";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ProductDataQualityTab from "@/components/ai-insights/product-data-quality";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { AppConfig } from "@/lib/config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from "@/components/ui/label";


// --- Skeleton Components ---
const AnalysisPageSkeleton = () => (
    <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-5 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div></CardContent></Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48" /></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent><Skeleton className="h-32" /></CardContent></Card>
    </div>
);

const GenerationProgress = ({ progress, statusText }: { progress: number; statusText: string }) => (
    <div className="relative">
         <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4 rounded-lg">
            <div className="w-full max-w-lg text-center flex flex-col items-center">
                 <img src={AppConfig.logoIconUrl} alt="Zeneva Logo" className="h-20 w-20 mb-6 animate-pulse" />
                 <h3 className="text-xl font-semibold mb-4 text-foreground">Zen AI is Analyzing Your Business...</h3>
                 <Progress value={progress} className="w-full h-1.5 mb-2 shadow-inner bg-muted" />
                 <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
        </div>
        <AnalysisPageSkeleton />
    </div>
);

const GenerateBriefingCTA = ({ analysis, handleGenerateAnalysis, isPending }: { analysis: BusinessAnalysisOutput | null, handleGenerateAnalysis: () => void, isPending: boolean }) => (
    <div className="flex items-center justify-end gap-4 mt-4">
        {analysis?.createdAt && (
            <p className="text-xs text-muted-foreground">
                Last generated:{" "}
                {formatDistanceToNow(analysis.createdAt.toDate ? analysis.createdAt.toDate() : new Date(analysis.createdAt), { addSuffix: true })}
            </p>
        )}
        <Button variant={analysis ? "outline" : "default"} onClick={handleGenerateAnalysis} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {analysis ? "Regenerate Briefing" : "Generate Briefing"}
        </Button>
    </div>
);

// --- Client-side calculated top product type ---
export interface TopPerformingProduct {
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    peakDay: string;
    peakTime: string;
    insight: string;
    imageUrl?: string;
}

// --- Modals ---
function ProductDetailModal({ product, isOpen, onOpenChange, currencySymbol }: { product: TopPerformingProduct | null; isOpen: boolean; onOpenChange: (open: boolean) => void; currencySymbol: string; }) {
    if (!product) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-lg">
                        <Image src={product.imageUrl || `https://picsum.photos/seed/${product.productId}/300`} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-lg font-bold">{currencySymbol}{product.revenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Units Sold</p>
                            <p className="text-lg font-bold">{product.unitsSold}</p>
                        </div>
                         <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Peak Day</p>
                            <p className="text-lg font-bold">{product.peakDay}</p>
                        </div>
                         <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Peak Time</p>
                            <p className="text-lg font-bold">{product.peakTime}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Insight</p>
                        <p className="text-sm text-muted-foreground">{product.insight}</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button asChild><Link href={`/inventory/${product.productId}`}>Go to Product</Link></Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function StockRecDetailModal({ recommendation, product, isOpen, onOpenChange }: { recommendation: SmartStockRecommendation | null; product: Product | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    if (!recommendation || !product) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{recommendation.name}</DialogTitle>
                     <DialogDescription>AI-powered stock recommendation details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-lg">
                        <Image src={product.imageUrl || `https://picsum.photos/seed/${product.id}/300`} alt={product.name} fill className="object-cover" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Current Stock</p>
                            <p className="text-2xl font-bold">{product.stock}</p>
                        </div>
                         <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/20">
                            <p className="text-xs text-primary/80">Recommended Stock</p>
                            <p className="text-2xl font-bold text-primary">{recommendation.recommendedStock}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Reasoning</p>
                        <p className="text-sm text-muted-foreground italic">"{recommendation.reason}"</p>
                    </div>
                     <div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <div className="cursor-help">
                                        <p className="text-sm font-semibold">Confidence</p>
                                        <Progress value={recommendation.confidence} className="h-2 mt-1" />
                                        <p className="text-xs text-muted-foreground text-right mt-1">{recommendation.confidence}%</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Confidence increases with more sales data over a longer period and consistent purchasing patterns.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button asChild><Link href={`/inventory/${product.id}`}>Go to Product</Link></Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CustomerSegmentDetailModal({ segment, isOpen, onOpenChange, business, businessPrimaryColor }: { segment: CustomerSegment | null; isOpen: boolean; onOpenChange: (open: boolean) => void; business: BusinessInstance | null; businessPrimaryColor?: string; }) {
    const { toast } = useToast();
    if (!segment || !business) return null;

    const customerEmails = (segment.customers || []).map(c => c.email).join(',');

    const handleSendEmail = () => {
        const subject = encodeURIComponent(segment.suggestedCampaign.title);
        const body = encodeURIComponent(segment.suggestedCampaign.body.replace(/\{\{customerName\}\}/g, 'Valued Customer'));
        window.location.href = `mailto:?bcc=${customerEmails}&subject=${subject}&body=${body}`;
    }
    
    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast({ title: "Copied to clipboard!" });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{segment.segmentName}</DialogTitle>
                    <DialogDescription>{segment.description}</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 max-h-[70vh]">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Customers in this Segment ({(segment.customers || []).length})</h4>
                        <ScrollArea className="h-96 border rounded-lg">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(segment.customers || []).map(customer => (
                                        <TableRow key={customer.email}>
                                            <TableCell className="font-medium">{customer.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold">Suggested Email Campaign</h4>
                        <div className="border rounded-lg bg-muted/30 flex flex-col h-full">
                             <div className="p-4 border-b">
                                <Label>Subject</Label>
                                <Input value={segment.suggestedCampaign.title} readOnly />
                             </div>
                             <ScrollArea className="flex-1 bg-gray-200 dark:bg-gray-800">
                                 <div className="p-4 md:p-8">
                                    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                                        <div className="p-4 flex justify-between items-center" style={{ backgroundColor: `hsl(${businessPrimaryColor || '24 9.8% 10%'})` }}>
                                            <div className="flex items-center gap-2">
                                                <img src={business.settings?.logoUrl || AppConfig.logoIconUrl} alt={`${business.name} Logo`} className="h-8 w-8 rounded-md bg-white p-1" />
                                                <span className="font-bold text-white text-lg">{business.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-white/80">Your Reward Points</p>
                                                <p className="text-sm font-bold text-white">1,250 pts</p>
                                            </div>
                                        </div>

                                        <div className="p-6 text-foreground">
                                            <h2 className="text-2xl font-bold mb-4">{segment.suggestedCampaign.title}</h2>
                                            <div 
                                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground" 
                                                dangerouslySetInnerHTML={{ __html: segment.suggestedCampaign.body.replace(/\n/g, '<br />').replace(/\{\{customerName\}\}/g, 'Valued Customer') }} 
                                            />
                                        </div>

                                        <div className="px-6 pb-6">
                                            <Button className="w-full h-12 text-base" style={{ backgroundColor: `hsl(${businessPrimaryColor || '24 9.8% 10%'})` }}>
                                                {segment.suggestedCampaign.ctaText || 'Learn More'}
                                            </Button>
                                        </div>
                                        
                                        <div className="bg-muted p-4 text-center text-xs text-muted-foreground">
                                            <p>{business.address}</p>
                                            <p>© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
                                        </div>
                                    </div>
                                 </div>
                             </ScrollArea>
                             <div className="flex flex-wrap gap-2 p-4 border-t bg-background rounded-b-lg">
                                <Button size="sm" variant="default" onClick={handleSendEmail}><Mail className="mr-2 h-4 w-4" /> Send Email</Button>
                                <Button size="sm" variant="outline" onClick={() => handleCopy(segment.suggestedCampaign.body)}><Copy className="mr-2 h-4 w-4"/> Copy Body</Button>
                                <Button size="sm" variant="outline" onClick={() => handleCopy(customerEmails)}><Users className="mr-2 h-4 w-4"/> Copy Emails ({(segment.customers || []).length})</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- New UI Card Components ---

const TopPerformingProductsCard = ({ products, onProductClick, currencySymbol }: { products: TopPerformingProduct[], onProductClick: (product: TopPerformingProduct) => void, currencySymbol: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp/> Top Performing Products</CardTitle>
            <CardDescription>Your highest-revenue products from the last 30 days. Click a product for details.</CardDescription>
        </CardHeader>
        <CardContent>
             {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {products.map(p => (
                        <button key={p.productId} onClick={() => onProductClick(p)} className="block group text-left">
                            <Card className="overflow-hidden h-full flex flex-col hover:border-primary transition-all">
                                <div className="aspect-square bg-muted relative overflow-hidden">
                                    <Image 
                                        src={p.imageUrl || `https://picsum.photos/seed/${p.productId}/300`} 
                                        alt={p.name} 
                                        fill 
                                        className="object-cover group-hover:scale-105 transition-transform"
                                    />
                                </div>
                                <div className="p-3 flex-grow flex flex-col">
                                    <h4 className="text-sm font-semibold line-clamp-2">{p.name}</h4>
                                    <p className="text-lg font-bold text-primary mt-1">{currencySymbol}{p.revenue.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{p.unitsSold} units sold</p>
                                    <Badge variant="secondary" className="mt-2 text-xs w-full text-center block whitespace-normal h-auto line-clamp-2">{p.insight}</Badge>
                                </div>
                            </Card>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No sales data available to determine top products.</p>
                </div>
            )}
        </CardContent>
    </Card>
);

const SmartStockRecommendationCard = ({ recommendations, allProducts, searchTerm, onSearchChange, onRowClick }: { recommendations: SmartStockRecommendation[], allProducts: Product[], searchTerm: string, onSearchChange: (term: string) => void, onRowClick: (rec: SmartStockRecommendation) => void }) => {
    const filteredRecommendations = useMemo(() => {
        if (!recommendations) return [];
        const filtered = recommendations.filter(rec =>
            rec.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return filtered;
    }, [recommendations, searchTerm]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> Smart Stock Recommendation</CardTitle>
                <CardDescription>Predictive forecast to avoid stockouts. The AI will recommend at least 20 items if enough data is available.</CardDescription>
                <div className="relative pt-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                    <Input placeholder="Search for a product..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
                </div>
            </CardHeader>
            <CardContent>
                {recommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>This recommendation becomes more accurate as more sales data is collected over time. Keep selling to unlock predictive insights!</p>
                    </div>
                ) : (
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-center">Current Stock</TableHead>
                                    <TableHead className="text-center">Recommended Stock</TableHead>
                                    <TableHead>AI Reasoning</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecommendations.length > 0 ? filteredRecommendations.map(r => {
                                    const product = allProducts.find(p => p.id === r.productId);
                                    return (
                                        <TableRow key={r.productId} onClick={() => onRowClick(r)} className="cursor-pointer">
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <div className="w-10 h-10 bg-muted rounded-md relative flex-shrink-0">
                                                    {product?.imageUrl && <Image src={product.imageUrl} alt={r.name} fill className="object-cover rounded-md" />}
                                                </div>
                                                <span className="line-clamp-2">{r.name}</span>
                                            </TableCell>
                                            <TableCell className="text-center text-lg font-medium">{product?.stock}</TableCell>
                                            <TableCell className="text-center text-lg font-bold text-primary">{r.recommendedStock}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground italic">"{r.reason}"</TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            No recommendation found for "{searchTerm}".
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};

const CustomerSegmentsCard = ({ segments, onSegmentClick }: { segments: CustomerSegment[], onSegmentClick: (segment: CustomerSegment) => void }) => {
    if (!segments || segments.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> AI Customer Segments</CardTitle>
                    <CardDescription>Groups of customers with similar behaviors, and ready-to-use email campaigns to engage them.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    <p>Link sales to customers in the POS to unlock valuable CRM insights here.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> AI Customer Segments</CardTitle>
                <CardDescription>Groups of customers with similar behaviors, with targeted campaigns to re-engage them.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible defaultValue={segments[0]?.segmentName}>
                    {segments.map((segment) => (
                        <AccordionItem key={segment.segmentName} value={segment.segmentName}>
                            <AccordionTrigger>
                                <div className="text-left">
                                    <p className="font-semibold">{segment.segmentName}</p>
                                    <p className="text-sm text-muted-foreground">{(segment.customers || []).length} Customers</p>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">{segment.description}</p>
                                <Button onClick={() => onSegmentClick(segment)}>View Details & Campaign</Button>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    )
};


const StrategicInsightsAccordion = ({ opportunities, merchandising, slowMoving, pricing, currencySymbol, allProducts }: { opportunities: RevenueOpportunity[], merchandising: SmartMerchandising[], slowMoving: SlowMovingInventory[], pricing: PricingRecommendation[], currencySymbol: string, allProducts: Product[] }) => {
    const allEmpty = !opportunities?.length && !merchandising?.length && !slowMoving?.length && !pricing?.length;

    return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb/> Strategic Recommendations</CardTitle>
            <CardDescription>AI-generated suggestions to boost revenue and efficiency.</CardDescription>
        </CardHeader>
        <CardContent>
            {allEmpty ? (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No specific strategic recommendations at this time. More data will unlock insights on revenue opportunities, product bundling, and slow-moving stock.</p>
                </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                    {opportunities && opportunities.length > 0 && (
                        <AccordionItem value="revenue-opportunities" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-left hover:no-underline [&>svg]:text-amber-600">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 border border-amber-200"><DollarSign /></div><h4 className="font-semibold text-foreground">Revenue Opportunities</h4></div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0 space-y-3">
                                {opportunities.map((opp, i) => {
                                    return (
                                        <div key={`opp-${i}`} className="p-2 border-b last:border-b-0">
                                            <p className="text-muted-foreground text-sm">Lost Revenue on <Link href={`/inventory/${opp.productId}`} className="font-semibold text-foreground hover:underline">{opp.name}</Link>: <strong className="text-destructive">{currencySymbol}{opp.lostRevenue.toLocaleString()}</strong> due to {opp.reason}.</p>
                                            <p className="text-sm text-foreground mt-1"><strong className="text-primary">Suggestion:</strong> {opp.suggestion}</p>
                                        </div>
                                    )
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {merchandising && merchandising.length > 0 && (
                        <AccordionItem value="smart-merchandising" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-left hover:no-underline [&>svg]:text-sky-600">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-100 text-sky-600 border border-sky-200"><ShoppingCart /></div><h4 className="font-semibold text-foreground">Smart Merchandising</h4></div>
                            </AccordionTrigger>
                             <AccordionContent className="p-4 pt-0 grid sm:grid-cols-2 gap-4">
                                {merchandising.map((merch, i) => {
                                    const product1 = allProducts.find(p => p.name === merch.primaryProductName);
                                    const product2 = allProducts.find(p => p.name === merch.pairedProductName);
                                    return (
                                        <Card key={`merch-${i}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                                            <div className="flex gap-2 p-4 bg-muted/30">
                                                <Link href={`/inventory/${product1?.id}`} className="block w-20 h-20 bg-muted rounded-md relative hover:scale-105 transition-transform"><Image src={product1?.imageUrl || `https://picsum.photos/seed/${merch.primaryProductName}/100`} alt={merch.primaryProductName} fill className="object-cover rounded-md" /></Link>
                                                <Link href={`/inventory/${product2?.id}`} className="block w-20 h-20 bg-muted rounded-md relative hover:scale-105 transition-transform"><Image src={product2?.imageUrl || `https://picsum.photos/seed/${merch.pairedProductName}/100`} alt={merch.pairedProductName} fill className="object-cover rounded-md" /></Link>
                                            </div>
                                            <div className="p-4 pt-2">
                                                <p className="text-muted-foreground text-sm font-medium">{merch.insight}</p>
                                                <p className="text-sm text-foreground mt-2"><strong className="text-primary">Suggestion:</strong> {merch.recommendation}</p>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {slowMoving && slowMoving.length > 0 && (
                        <AccordionItem value="slow-moving-inventory" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-left hover:no-underline [&>svg]:text-red-600">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-600 border border-red-200"><Layers /></div><h4 className="font-semibold text-foreground">Slow-Moving Inventory</h4></div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0 space-y-3">
                                {slowMoving.filter(item => item.capitalLocked > 0).map((item, i) => {
                                    return (
                                        <div key={`slow-${i}`} className="p-2 border-b last:border-b-0">
                                            <p className="text-muted-foreground text-sm"><Link href={`/inventory/${item.productId}`} className="font-semibold text-foreground hover:underline">{item.name}</Link> has <strong className="text-destructive">{currencySymbol}{item.capitalLocked.toLocaleString()}</strong> in capital locked up and has been unsold for {item.daysUnsold} days.</p>
                                            <p className="text-sm text-foreground mt-1"><strong className="text-primary">Suggestion:</strong> {item.suggestion}</p>
                                        </div>
                                    )
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {pricing && pricing.length > 0 && (
                         <AccordionItem value="pricing-recommendations" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-left hover:no-underline [&>svg]:text-green-600">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 text-green-600 border border-green-200"><DollarSign /></div><h4 className="font-semibold text-foreground">Pricing Strategies</h4></div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0 space-y-3">
                                {pricing.map((item, i) => (
                                    <div key={`price-${i}`} className="p-2 border-b last:border-b-0">
                                        <p className="text-sm">For <Link href={`/inventory/${item.productId}`} className="font-semibold text-foreground hover:underline">{item.name}</Link>, consider a <strong className="text-primary">{item.strategy}</strong> strategy.</p>
                                        <p className="text-sm text-muted-foreground mt-1">Change price from <strong>{currencySymbol}{item.currentPrice.toLocaleString()}</strong> to <strong className="text-green-600">{currencySymbol}{item.suggestedPrice.toLocaleString()}</strong>. {item.reasoning}</p>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            )}
        </CardContent>
    </Card>
)};


// --- Main Page Component ---

function ExecutiveBriefingTab() {
  const [isPending, startTransition] = useTransition();
  const { products, receipts, business, currencySymbol, onlineOrders, customers, triggerRefresh } = usePOS();
  const [analysis, setAnalysis] = useState<BusinessAnalysisOutput | null>(business?.settings?.businessAnalysis || null);
  const [detailProduct, setDetailProduct] = React.useState<TopPerformingProduct | null>(null);
  const [stockRecProduct, setStockRecProduct] = React.useState<SmartStockRecommendation | null>(null);
  const [segmentDetail, setSegmentDetail] = React.useState<CustomerSegment | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState('Initializing...');
  const [stockSearchTerm, setStockSearchTerm] = React.useState('');

   useEffect(() => {
    if (business?.settings?.businessAnalysis) {
      setAnalysis(business.settings.businessAnalysis);
    }
  }, [business?.settings?.businessAnalysis]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    let statusTimer: NodeJS.Timeout | undefined;
    const statuses = ["Analyzing sales data...", "Identifying time-based patterns...", "Forecasting demand...", "Generating strategic recommendations..."];
    
    if (isPending) {
        setProgress(10);
        let currentStatusIndex = 0;
        setStatusText(statuses[currentStatusIndex]);

        timer = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 5, 95));
        }, 300);

        statusTimer = setInterval(() => {
            currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
            setStatusText(statuses[currentStatusIndex]);
        }, 1500);
    }
    return () => {
        clearInterval(timer);
        clearInterval(statusTimer);
    };
  }, [isPending]);

  const topPerformingProducts = useMemo(() => {
    if (!receipts && !onlineOrders) return [];
    
    const allSales = [...(receipts || []), ...(onlineOrders || [])];
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSales = allSales.filter(s => {
        const saleDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return saleDate >= thirtyDaysAgo;
    });

    const totalRevenueLast30Days = recentSales.reduce((sum, s) => sum + s.total, 0);
    
    const productSales: Record<string, { name: string; revenue: number; unitsSold: number; salesTimestamps: Date[] }> = {};

    recentSales.forEach(sale => {
        const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);

        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { name: item.name, revenue: 0, unitsSold: 0, salesTimestamps: [] };
            }
            productSales[item.productId].revenue += item.price * item.quantity;
            productSales[item.productId].unitsSold += item.quantity;
            productSales[item.productId].salesTimestamps.push(saleDate);
        });
    });

    const getPeakTimes = (timestamps: Date[]) => {
        if (timestamps.length === 0) return { peakDay: 'N/A', peakTime: 'N/A' };
        
        const dayCounts: Record<string, number> = {};
        const hourCounts: Record<string, number> = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        timestamps.forEach(ts => {
            const day = days[ts.getDay()];
            dayCounts[day] = (dayCounts[day] || 0) + 1;
            const hour = ts.getHours();
            let timeRange = "12-3 AM"; // Default
            if (hour >= 3 && hour < 6) timeRange = "3-6 AM";
            else if (hour >= 6 && hour < 9) timeRange = "6-9 AM";
            else if (hour >= 9 && hour < 12) timeRange = "9-12 PM";
            else if (hour >= 12 && hour < 15) timeRange = "12-3 PM";
            else if (hour >= 15 && hour < 18) timeRange = "3-6 PM";
            else if (hour >= 18 && hour < 21) timeRange = "6-9 PM";
            else if (hour >= 21) timeRange = "9-12 AM";
            hourCounts[timeRange] = (hourCounts[timeRange] || 0) + 1;
        });

        const peakDay = Object.keys(dayCounts).length > 0 ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : 'N/A';
        const peakTime = Object.keys(hourCounts).length > 0 ? Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b) : 'N/A';

        return { peakDay, peakTime };
    };

    const sortedProducts: TopPerformingProduct[] = Object.entries(productSales)
        .map(([productId, data]) => {
            const productInfo = products?.find(p => p.id === productId);
            let insight = "A top performing product.";
            if (totalRevenueLast30Days > 0 && data.revenue > 0) {
                 insight = `Accounts for ${((data.revenue / totalRevenueLast30Days) * 100).toFixed(0)}% of recent revenue.`;
            }
            if (recentSales.length <= 1 && productSales[productId]) {
                insight = "This product represents the entirety of the sales data provided. Further sales data is required to identify true top performers and patterns.";
            }
            return {
                productId,
                ...data,
                ...getPeakTimes(data.salesTimestamps),
                insight,
                imageUrl: productInfo?.imageUrl,
            }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    return sortedProducts;
  }, [receipts, onlineOrders, products]);


  const handleGenerateAnalysis = () => {
    if (!products || !business?.id || !firestore) {
      toast({
        variant: "destructive",
        title: "Cannot Run Analysis",
        description: "Sufficient data is not yet available for analysis.",
      });
      return;
    }
    startTransition(async () => {
        const serializeDate = (date: any): string | null => {
            if (!date) return null;
            if (date instanceof Date) return date.toISOString();
            if(date.toDate) return date.toDate().toISOString(); // Handle firestore timestamps
            const seconds = date.seconds || (date._seconds);
            if (seconds) {
                return new Date(seconds * 1000).toISOString();
            }
            return date.toString();
        };
        
        // --- DATA OPTIMIZATION ---
        const ninetyDaysAgo = subDays(new Date(), 90);
        const allSales = [...(receipts || []), ...(onlineOrders || [])];
        const recentSales = allSales.filter(s => {
            const saleDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return saleDate >= ninetyDaysAgo;
        });

        const productInput = products.map(p => ({
            id: p.id, name: p.name, price: p.price,
            costPrice: p.costPrice || 0, stock: p.stock || 0, category: p.category,
        }));

        const salesInput = recentSales.map(r => ({
            id: r.id, createdAt: serializeDate(r.createdAt),
            items: r.items.map(item => ({...item, costPrice: products.find(p => p.id === item.productId)?.costPrice || 0})),
            total: r.total,
        }));
        
        const recentCustomerIds = new Set(recentSales.map(sale => 'customer' in sale && sale.customer ? sale.customer.id : null).filter(Boolean));

        const customerSpend: Record<string, { orderCount: number, totalSpent: number}> = {};
        recentSales.forEach(sale => {
            const customerId = 'customer' in sale && sale.customer ? sale.customer.id : null;
            if (customerId && customers?.find(c => c.id === customerId)) {
                if(!customerSpend[customerId]) customerSpend[customerId] = { orderCount: 0, totalSpent: 0 };
                customerSpend[customerId].orderCount += 1;
                customerSpend[customerId].totalSpent += sale.total;
            }
        });

        const customerInput = (customers || [])
            .filter(c => recentCustomerIds.has(c.id))
            .map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                orderCount: customerSpend[c.id]?.orderCount || 0,
                totalSpent: customerSpend[c.id]?.totalSpent || 0,
            }));
        // --- END DATA OPTIMIZATION ---

        try {
            const result = await businessAnalysis({ products: productInput, receipts: salesInput, customers: customerInput, currencySymbol });
            const dataToSave: BusinessAnalysisOutput = { ...result, createdAt: new Date() };

            const businessDocRef = doc(firestore, 'businessInstances', business.id);
            await updateDoc(businessDocRef, { 'settings.businessAnalysis': { ...result, createdAt: serverTimestamp() } });
            
            setProgress(100);
            setAnalysis(dataToSave);
            triggerRefresh();
            toast({ variant: 'success', title: 'Analysis Complete!', description: 'Your new business insights are ready.' });
            setTimeout(() => setProgress(0), 1000);

        } catch (e: any) {
             console.error("Failed to generate or save business analysis:", e);
             toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'An unexpected error occurred. This can happen if the AI server is busy. Please try again in a moment.'});
             setProgress(0);
        }
    });
  };
  
  const displayData = analysis;

  return (
    <FeatureGate
      requiredPlan="business"
      currentPlan={business?.plan}
      hasLifetimeAccess={business?.accessLevel === "lifetime"}
      featureName="AI Executive Briefing"
      featureDescription="Unlock a comprehensive AI-powered analysis of your sales, inventory, and customer trends."
    >
      <div className="space-y-6">
        {isPending ? (
            <GenerationProgress progress={progress} statusText={statusText} />
        ) : !displayData ? (
            <Card className="text-center p-8 bg-card border">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 text-primary">
                    <Bot className="h-8 w-8" />
                </div>
              <CardTitle className="text-xl text-foreground">Awaiting Analysis</CardTitle>
              <CardDescription className="mt-2 mb-4 max-w-md mx-auto text-muted-foreground">Click "Generate Briefing" to get your first AI-powered executive summary of your business.</CardDescription>
              <Button onClick={handleGenerateAnalysis}>Generate Your First Briefing</Button>
            </Card>
        ) : (
            <div className="space-y-6">
                <TopPerformingProductsCard 
                    products={topPerformingProducts}
                    onProductClick={(p) => setDetailProduct(p)} 
                    currencySymbol={currencySymbol} 
                />
                
                <SmartStockRecommendationCard
                    recommendations={displayData.smartStockRecommendations || []}
                    allProducts={products || []}
                    searchTerm={stockSearchTerm}
                    onSearchChange={setStockSearchTerm}
                    onRowClick={setStockRecProduct}
                />
                
                <CustomerSegmentsCard segments={displayData.customerSegments || []} onSegmentClick={setSegmentDetail} />

                <StrategicInsightsAccordion 
                    opportunities={displayData.revenueOpportunities || []} 
                    merchandising={displayData.smartMerchandising || []}
                    slowMoving={displayData.slowMovingInventory || []}
                    pricing={displayData.pricingRecommendations || []}
                    currencySymbol={currencySymbol}
                    allProducts={products || []}
                />
            </div>
        )}
      
        <GenerateBriefingCTA analysis={analysis} handleGenerateAnalysis={handleGenerateAnalysis} isPending={isPending} />
      </div>
       <ProductDetailModal
            product={detailProduct}
            isOpen={!!detailProduct}
            onOpenChange={(open) => !open && setDetailProduct(null)}
            currencySymbol={currencySymbol}
        />
        <StockRecDetailModal
            recommendation={stockRecProduct}
            product={stockRecProduct ? products?.find(p => p.id === stockRecProduct.productId) || null : null}
            isOpen={!!stockRecProduct}
            onOpenChange={(open) => !open && setStockRecProduct(null)}
        />
        <CustomerSegmentDetailModal
            segment={segmentDetail}
            isOpen={!!segmentDetail}
            onOpenChange={(open) => !open && setSegmentDetail(null)}
            business={business}
            businessPrimaryColor={business?.settings?.primaryColor}
        />
    </FeatureGate>
  );
}

export default function AiInsightsPage() {
  const { isLoading: isPosLoading } = usePOS();
  return (
    <div className="space-y-6">
      <PageTitle
        title="Zen AI"
        subtitle="Your AI-powered command center for business intelligence."
      />
       {isPosLoading ? (
            <div className="mt-6 space-y-6">
                <Skeleton className="h-10 w-full" />
                <Card>
                    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    </CardContent>
                </Card>
            </div>
        ) : (
            <Tabs defaultValue="business-performance" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
                    <TabsTrigger value="business-performance">Executive Briefing</TabsTrigger>
                    <TabsTrigger value="product-quality">Inventory Health</TabsTrigger>
                </TabsList>
                <TabsContent value="business-performance" className="pt-6">
                    <ExecutiveBriefingTab />
                </TabsContent>
                 <TabsContent value="product-quality" className="pt-6">
                    <ProductDataQualityTab />
                </TabsContent>
            </Tabs>
        )}
    </div>
  );
}
