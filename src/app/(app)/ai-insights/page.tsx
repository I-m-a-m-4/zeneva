
"use client";

import { businessAnalysis } from "@/ai/flows/business-analysis-flow";
import type { BusinessAnalysis, TopPerformer, Underperformer, RestockSuggestion } from "@/types";
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
  Loader2,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  Warehouse,
  Flame,
  ShieldAlert,
  Info,
  Package,
  Zap,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ProductDataQualityTab from "@/components/ai-insights/product-data-quality";

// --- Skeleton Components ---
const HealthScoreSkeleton = () => (
    <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <Skeleton className="h-28 w-28 rounded-full flex-shrink-0" />
            <div className="space-y-3 flex-1 w-full">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
            </div>
        </CardContent>
    </Card>
);

const InsightCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader><Skeleton className="h-12 w-12 rounded-lg mb-2" /><Skeleton className="h-6 w-3/4" /></CardHeader>
        <CardContent className="flex-grow space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></CardContent>
        <CardFooter><Skeleton className="h-5 w-28" /></CardFooter>
    </Card>
);


const GenerationProgress = ({ progress, statusText }: { progress: number; statusText: string }) => (
    <div className="relative">
         <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">
                 <h3 className="text-xl font-semibold mb-4">Zen AI is Analyzing Your Business...</h3>
                 <Progress value={progress} className="w-full h-2 mb-2" />
                 <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
        </div>
        <div className="grid gap-8 opacity-40 blur-sm pointer-events-none">
             <HealthScoreSkeleton />
             <div>
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InsightCardSkeleton /><InsightCardSkeleton /><InsightCardSkeleton />
                </div>
            </div>
             <div>
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InsightCardSkeleton /><InsightCardSkeleton /><InsightCardSkeleton />
                </div>
            </div>
        </div>
    </div>
);


// --- Business Performance Tab Components ---

const HealthScoreHero = ({ score, status, summary }: { score: number, status: string, summary: string }) => {
    const getStatusColor = () => {
        if (status === 'At Risk') return 'text-destructive';
        if (status === 'Needs Attention') return 'text-amber-500';
        return 'text-green-600';
    }

    return (
        <Card>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <div
                    className="relative h-28 w-28 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--muted)) 0deg)` }}
                >
                    <div className="absolute h-24 w-24 rounded-full bg-card"></div>
                    <div className="z-10">
                        <span className="text-4xl font-bold text-primary">{score}</span>
                        <span className="text-lg text-muted-foreground">%</span>
                    </div>
                </div>
                <div className="text-center sm:text-left">
                     <Badge variant="outline" className={cn("text-base font-semibold", getStatusColor(), `border-current`)}>{status}</Badge>
                     <p className="text-base text-muted-foreground mt-2">{summary}</p>
                </div>
            </CardContent>
        </Card>
    );
};


const InsightCard = ({ icon: Icon, title, description, link, actionText }: { icon: React.ElementType, title: string, description: string, link: string, actionText: string }) => {
  return (
    <Card className="flex flex-col h-full">
        <CardHeader>
             <div className="relative w-12 h-12 flex items-center justify-center rounded-lg bg-muted mb-4">
                <div className="absolute inset-0 bg-primary/10 rounded-lg animate-[aura-pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <CardFooter>
            <Button variant="link" asChild className="p-0 h-auto text-primary font-semibold">
                <Link href={link}>{actionText} <ArrowRight className="ml-1 h-4 w-4"/></Link>
            </Button>
        </CardFooter>
    </Card>
  );
}

const SuggestionCard = ({ priority, title, description, link, actionText }: { priority: number, title: string, description: string, link: string, actionText: string }) => {
    return (
        <Card className="flex flex-col h-full border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">{priority}</div>
                    <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={link}>{actionText}</Link>
                </Button>
            </CardFooter>
        </Card>
    );
};


const GenerateBriefingCTA = ({ analysis, handleGenerateAnalysis, isPending }: { analysis: BusinessAnalysis | null, handleGenerateAnalysis: () => void, isPending: boolean }) => (
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

type DetailItem = TopPerformer | Underperformer | RestockSuggestion;

const DetailedAnalysisCard = ({ title, icon: Icon, items, emptyText }: { title: string; icon: React.ElementType; items: DetailItem[] | undefined; emptyText: string }) => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Icon className="text-primary" />{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {items && items.length > 0 ? (
                <div className="space-y-3">
                    {items.map(item => (
                        <div key={item.productId} className="p-3 border rounded-md hover:bg-muted/50">
                            <Link href={`/inventory/${item.productId}`}>
                                <h4 className="font-semibold hover:underline">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.reason}</p>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-4">{emptyText}</div>
            )}
        </CardContent>
    </Card>
);

function BusinessPerformanceTab() {
  const [isPending, startTransition] = useTransition();
  const { products, receipts, business, currencySymbol, triggerRefresh } = usePOS();
  const [analysis, setAnalysis] = useState<BusinessAnalysis | null>(business?.settings?.businessAnalysis || null);
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
    const statuses = ["Analyzing sales data...", "Identifying key trends...", "Checking inventory health...", "Generating actionable suggestions..."];

    if (isPending) {
        setProgress(10);
        let statusIndex = 0;
        setStatusText(statuses[statusIndex]);

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
            statusIndex = (statusIndex + 1) % statuses.length;
            setStatusText(statuses[statusIndex]);
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
            const dataToSave: BusinessAnalysis = { ...result, createdAt: new Date() };

            const businessDocRef = doc(firestore, 'businessInstances', business.id);
            await updateDoc(businessDocRef, { 'settings.businessAnalysis': { ...result, createdAt: serverTimestamp() } });
            
            setProgress(100);
            setAnalysis(dataToSave);
            triggerRefresh(); // This will trigger a refresh of the context
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

  const getInsightIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('inactivity') || lowerTitle.includes('stagnant') || lowerTitle.includes('risk')) {
      return TrendingDown;
    }
    if (lowerTitle.includes('integrity') || lowerTitle.includes('issues') || lowerTitle.includes('concerns')) {
      return ShieldAlert;
    }
    return TrendingUp;
  };

  return (
    <FeatureGate
      requiredPlan="business"
      currentPlan={business?.plan}
      hasLifetimeAccess={business?.accessLevel === "lifetime"}
      featureName="AI Executive Briefing"
      featureDescription="Unlock a comprehensive AI-powered analysis of your sales, inventory, and customer trends."
    >
      <div className="grid gap-6 mt-6">
        {isPending ? (
            <GenerationProgress progress={progress} statusText={statusText} />
        ) : !displayData || !displayData.health ? (
            <Card className="text-center p-8">
              <CardTitle className="text-xl">Awaiting Analysis</CardTitle>
              <CardDescription className="mt-2 mb-4 max-w-md mx-auto">Click "Generate Briefing" to get your first AI-powered executive summary.</CardDescription>
              <Button onClick={handleGenerateAnalysis}>Generate Your First Briefing</Button>
            </Card>
        ) : (
            <div className="grid gap-8">
             <HealthScoreHero score={displayData.health.score} status={displayData.health.status} summary={displayData.health.summary} />
             
             <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="text-primary"/> What Zen AI Notices
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {displayData.keyInsights.map((insight, i) => (
                    <InsightCard key={i} {...insight} icon={getInsightIcon(insight.title)} />
                    ))}
                </div>
            </div>

             <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="text-primary"/> What You Should Do Next
                </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {displayData.actionableSuggestions.sort((a, b) => a.priority - b.priority).map((suggestion, i) => (
                        <SuggestionCard key={i} {...suggestion} />
                    ))}
                </div>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                    <CardDescription>A deeper look into specific areas of your business performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="working" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="working">What's Working</TabsTrigger>
                            <TabsTrigger value="wasting">Capital at Risk</TabsTrigger>
                            <TabsTrigger value="restock">Restock Watchlist</TabsTrigger>
                        </TabsList>
                        <TabsContent value="working" className="mt-4">
                            <DetailedAnalysisCard icon={TrendingUp} title="Top Performers" items={displayData.whatIsWorking} emptyText="No top performing products identified in this period."/>
                        </TabsContent>
                        <TabsContent value="wasting" className="mt-4">
                             <DetailedAnalysisCard icon={TrendingDown} title="Capital at Risk" items={displayData.whatIsWastingMoney} emptyText="No significant underperforming products found."/>
                        </TabsContent>
                        <TabsContent value="restock" className="mt-4">
                            <DetailedAnalysisCard icon={Warehouse} title="Restock Watchlist" items={displayData.whatToRestock} emptyText="No products currently require immediate restocking."/>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            </div>
        )}
      
        <GenerateBriefingCTA analysis={analysis} handleGenerateAnalysis={handleGenerateAnalysis} isPending={isPending} />
      </div>
    </FeatureGate>
  );
}

export default function AiInsightsPage() {
  const { isLoading, business } = usePOS();
  return (
    <div className="space-y-6">
      <PageTitle
        title="Zen AI Insights Center"
        subtitle="Your AI-powered command center for business intelligence."
      />
       {isLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
            <Tabs defaultValue="business-performance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="business-performance">Executive Briefing</TabsTrigger>
                    <TabsTrigger value="product-quality">Product Data Quality</TabsTrigger>
                </TabsList>
                <TabsContent value="business-performance">
                    <BusinessPerformanceTab />
                </TabsContent>
                 <TabsContent value="product-quality">
                    <ProductDataQualityTab />
                </TabsContent>
            </Tabs>
        )}
    </div>
  );
}

    