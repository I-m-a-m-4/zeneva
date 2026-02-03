"use client";

import { businessAnalysis } from "@/ai/flows/business-analysis-flow";
import type { BusinessAnalysisOutput, RestockOpportunityItem, MoneyLockedInStockItem, StrategicInsight } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { usePOS } from "@/context/pos-context";
import {
  Lightbulb,
  Loader2,
  TrendingDown,
  CircleDollarSign,
  Package,
} from "lucide-react";
import React, { useState, useTransition, useEffect } from "react";
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppConfig } from "@/lib/config";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const GenerationProgress = ({ progress, statusText }: { progress: number; statusText: string }) => (
    <div className="relative">
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center p-4 rounded-lg">
            <div className="w-full max-w-lg text-center flex flex-col items-center">
                 <img src={AppConfig.logoIconUrl} alt="Zeneva Logo" className="h-20 w-20 mb-6 animate-pulse" />
                 <h3 className="text-xl font-semibold mb-4 text-gray-800">Zen AI is Analyzing Your Business...</h3>
                 <Progress value={progress} className="w-full h-1.5 mb-2 shadow-inner bg-gray-200" />
                 <p className="text-sm text-gray-500">{statusText}</p>
            </div>
        </div>
        <div className="grid gap-8 opacity-20 blur-sm pointer-events-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-48"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6 mt-2" /></CardContent></Card>
                <Card className="h-48"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6 mt-2" /></CardContent></Card>
             </div>
        </div>
    </div>
);

const InsightCard = ({ icon: Icon, title, value, narrative, variant }: { icon: React.ElementType, title: string, value: string, narrative: string, variant: 'warning' | 'destructive' }) => {
    const variantClasses = {
        warning: 'border-amber-400 bg-amber-50 text-amber-900',
        destructive: 'border-red-400 bg-red-50 text-red-900',
    }
    return (
        <Card className={cn("text-center p-6 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 border-t-4", variantClasses[variant])}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white border border-gray-200 mb-4">
                <Icon className={cn("h-8 w-8", variant === 'warning' ? 'text-amber-500' : 'text-red-500')} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</p>
            <p className="text-4xl font-bold my-1 text-gray-900">{value}</p>
            <p className="text-xs text-gray-600 max-w-xs font-medium italic">"{narrative}"</p>
        </Card>
    );
};

const ItemListCard = ({ title, items, currencySymbol }: { title: string, items: (MoneyLockedInStockItem | RestockOpportunityItem)[], currencySymbol: string }) => (
    <Card className="h-full bg-white border">
        <CardHeader>
            <CardTitle className="text-lg text-gray-900">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {items && items.length > 0 ? (
                <ScrollArea className="h-64">
                    <div className="space-y-3 pr-4">
                        {items.map(item => (
                            <Link href={`/inventory/${item.productId}`} key={item.productId} className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold truncate pr-2 text-gray-800">{item.name}</h4>
                                    {'valueLocked' in item ? (
                                        <p className="font-bold text-sm text-primary flex-shrink-0">{currencySymbol}{item.valueLocked.toLocaleString()}</p>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">Restock: {item.recommendedRestockQuantity}</Badge>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {'daysSinceLastSale' in item ? `Days since last sale: ${item.daysSinceLastSale}` : `Est. stockout in: ${item.estimatedStockoutDays} days`}
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="text-center text-gray-500 py-16">No items to show.</div>
            )}
        </CardContent>
    </Card>
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


function ExecutiveBriefingTab() {
  const [isPending, startTransition] = useTransition();
  const { products, receipts, business, currencySymbol, triggerRefresh } = usePOS();
  const [analysis, setAnalysis] = useState<BusinessAnalysisOutput | null>(business?.settings?.businessAnalysis || null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState('Initializing...');

   useEffect(() => {
    if (business?.settings?.businessAnalysis) {
      setAnalysis(business.settings.businessAnalysis);
    }
  }, [business?.settings?.businessAnalysis]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    let statusTimer: NodeJS.Timeout | undefined;
    const statuses = ["Analyzing sales data...", "Identifying capital at risk...", "Forecasting restock needs...", "Generating strategic insights..."];
    
    if (isPending) {
        setProgress(10);
        let currentStatusIndex = 0;
        setStatusText(statuses[currentStatusIndex]);

        timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    clearInterval(timer);
                    return prev;
                }
                if (prev < 70) return prev + 5;
                if (prev < 90) return prev + 2;
                return prev + 1;
            });
        }, 300);

        statusTimer = setInterval(() => {
            currentStatusIndex = (currentStatusIndex + 1);
            if(currentStatusIndex < statuses.length) {
                setStatusText(statuses[currentStatusIndex]);
            } else {
                clearInterval(statusTimer);
            }
        }, 1200);
    }
    return () => {
        clearInterval(timer);
        clearInterval(statusTimer);
    };
  }, [isPending]);

  const handleGenerateAnalysis = () => {
    if (!products || !receipts || !business?.id || !firestore) {
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
            const seconds = date.seconds || (date._seconds);
            if (seconds) {
                return new Date(seconds * 1000).toISOString();
            }
            return date.toString();
        };

        const ninetyDaysAgo = subDays(new Date(), 90);
        const recentReceipts = receipts.filter(r => {
            let createdAtDate;
             const seconds = r.createdAt?.seconds || r.createdAt?._seconds;
            if (seconds) {
                createdAtDate = new Date(seconds * 1000);
            } else {
                try {
                    createdAtDate = new Date(r.createdAt);
                } catch(e) {
                     return false;
                }
            }
            return createdAtDate > ninetyDaysAgo;
        });

        const productInput = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            costPrice: p.costPrice || 0,
            stock: p.stock || 0,
            category: p.category,
            expiryDate: serializeDate(p.expiryDate),
        }));

        const receiptInput = recentReceipts.map(r => ({
            id: r.id,
            createdAt: serializeDate(r.createdAt),
            items: r.items.map(item => ({...item, costPrice: item.costPrice || 0})),
            total: r.total,
            discount: r.discount || 0,
        }));

        try {
            const result = await businessAnalysis({ products: productInput, receipts: receiptInput, currencySymbol });
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
             toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'Could not generate AI insights.'});
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
      <div className="grid gap-6">
        {isPending ? (
            <GenerationProgress progress={progress} statusText={statusText} />
        ) : !displayData || (!displayData.moneyLockedInStock && !displayData.restockOpportunities && !displayData.strategicInsights) ? (
            <Card className="text-center p-8 bg-white border">
              <CardTitle className="text-xl text-gray-900">Awaiting Analysis</CardTitle>
              <CardDescription className="mt-2 mb-4 max-w-md mx-auto text-gray-600">Click "Generate Briefing" to get your first AI-powered executive summary.</CardDescription>
              <Button onClick={handleGenerateAnalysis}>Generate Your First Briefing</Button>
            </Card>
        ) : (
            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {displayData.moneyLockedInStock && (
                    <InsightCard 
                        icon={CircleDollarSign}
                        title="Money Locked in Stock"
                        value={`${currencySymbol}${displayData.moneyLockedInStock.totalValueLocked.toLocaleString()}`}
                        narrative={displayData.moneyLockedInStock.narrative}
                        variant="destructive"
                    />
                 )}
                 {displayData.restockOpportunities && (
                    <InsightCard 
                        icon={TrendingDown}
                        title="Potential Monthly Revenue at Risk"
                        value={`${currencySymbol}${displayData.restockOpportunities.potentialMonthlyRevenueLoss.toLocaleString()}`}
                        narrative={displayData.restockOpportunities.narrative}
                        variant="warning"
                    />
                 )}
                </div>
             
                {displayData.strategicInsights && displayData.strategicInsights.length > 0 && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                           Strategic Recommendations
                        </h3>
                        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
                            {displayData.strategicInsights.map((insight, i) => (
                                <AccordionItem key={i} value={`item-${i}`} className="border-none">
                                    <Card className="border-primary/20 bg-primary/5">
                                        <AccordionTrigger className="p-6 text-left hover:no-underline [&>svg]:text-primary">
                                             <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                                                    <Lightbulb className="h-5 w-5" />
                                                </div>
                                                <h4 className="text-lg font-semibold text-gray-900">{insight.title}</h4>
                                             </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6">
                                            <div className="prose prose-sm max-w-none text-gray-600 space-y-4">
                                                <p>{insight.description}</p>
                                                <div className="p-3 rounded-md bg-background/60 border">
                                                    <p className="text-xs font-semibold text-primary mb-1">Recommendation</p>
                                                    <p className="text-foreground">{insight.recommendation}</p>
                                                </div>
                                                {insight.link && <Button asChild variant="secondary" size="sm"><Link href={insight.link}>Take Action</Link></Button>}
                                            </div>
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayData.moneyLockedInStock && (
                        <ItemListCard 
                            title="Top Products Locking Up Cash"
                            items={displayData.moneyLockedInStock.items}
                            currencySymbol={currencySymbol}
                        />
                    )}
                    {displayData.restockOpportunities && (
                        <ItemListCard 
                            title="Top Restock Opportunities"
                            items={displayData.restockOpportunities.items}
                            currencySymbol={currencySymbol}
                        />
                    )}
                </div>

            </div>
        )}
      
        <GenerateBriefingCTA analysis={analysis} handleGenerateAnalysis={handleGenerateAnalysis} isPending={isPending} />
      </div>
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
                    <TabsTrigger value="product-quality">Product Data Quality</TabsTrigger>
                </TabsList>
                <TabsContent value="business-performance" className="pt-6">
                    <ExecutiveBriefingTab />
                </TabsContent>
                 <TabsContent value="product-quality">
                    <ProductDataQualityTab />
                </TabsContent>
            </Tabs>
        )}
    </div>
  );
}
