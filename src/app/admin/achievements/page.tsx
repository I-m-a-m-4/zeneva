'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Trophy, Star, CheckCircle, Zap, Loader, PartyPopper, Download } from 'lucide-react';
import type { Receipt, Product, BusinessInstance } from '@/types';
import { cn } from '@/lib/utils';
import { usePOS } from '@/context/pos-context';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface Milestone {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    icon: React.ElementType;
    color: string;
    format?: (val: number) => string;
}

export default function AchievementsPage() {
    const firestore = useFirestore();
    const { triggerConfetti } = usePOS();
    const { toast } = useToast();
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const [selectedMilestone, setSelectedMilestone] = React.useState<Milestone | null>(null);

    const businessesQuery = useMemoFirebase(() => query(collection(firestore, 'businessInstances')), [firestore]);
    const productsQuery = useMemoFirebase(() => query(collection(firestore, 'products')), [firestore]);
    const receiptsQuery = useMemoFirebase(() => query(collection(firestore, 'receipts')), [firestore]);

    const { data: businesses, isLoading: bLoading } = useCollection<BusinessInstance>(businessesQuery);
    const { data: products, isLoading: pLoading } = useCollection<Product>(productsQuery);
    const { data: receipts, isLoading: rLoading } = useCollection<Receipt>(receiptsQuery);

    const isLoading = bLoading || pLoading || rLoading;

    const milestones: Milestone[] = useMemo(() => {
        if (!businesses || !products || !receipts) return [];

        const totalSales = receipts.length;
        const totalProducts = products.length;
        const activeBusinesses = businesses.filter(b => b.status !== 'deleted').length;
        const totalGMV = receipts.reduce((sum, r) => sum + r.total, 0);

        return [
            // Sales Achievements
            {
                id: 'sales_10',
                title: 'First 10 Sales',
                description: 'The platform successfully facilitated its first 10 sales.',
                target: 10,
                current: totalSales,
                icon: CheckCircle,
                color: 'text-zinc-500',
            },
            {
                id: 'sales_100',
                title: 'Century of Sales',
                description: 'We have successfully completed 100 sales across the entire platform.',
                target: 100,
                current: totalSales,
                icon: Trophy,
                color: 'text-yellow-500',
            },
            {
                id: 'sales_1000',
                title: 'Sales Master',
                description: 'We have breached 1,000 sales across the platform! Incredible momentum.',
                target: 1000,
                current: totalSales,
                icon: Star,
                color: 'text-purple-500',
            },
            {
                id: 'sales_10000',
                title: 'Ten Thousand Transactions',
                description: 'We successfully completed 10,000 sales platform-wide. Unstoppable.',
                target: 10000,
                current: totalSales,
                icon: Zap,
                color: 'text-red-500',
            },

            // GMV Achievements
            {
                id: 'gmv_1m',
                title: 'The First Million',
                description: 'The platform successfully processed ₦1,000,000 in total GMV.',
                target: 1000000,
                current: totalGMV,
                icon: Zap,
                color: 'text-blue-500',
                format: (val) => `₦${val.toLocaleString()}`
            },
            {
                id: 'gmv_10m',
                title: 'Ten Million Milestone',
                description: 'Phenomenal growth! We processed ₦10,000,000 in total GMV.',
                target: 10000000,
                current: totalGMV,
                icon: CheckCircle,
                color: 'text-emerald-500',
                format: (val) => `₦${val.toLocaleString()}`
            },
            {
                id: 'gmv_100m',
                title: 'One Hundred Million',
                description: 'A colossal achievement. We processed ₦100,000,000 in total GMV.',
                target: 100000000,
                current: totalGMV,
                icon: Trophy,
                color: 'text-orange-500',
                format: (val) => `₦${val.toLocaleString()}`
            },
            {
                id: 'gmv_1b',
                title: 'The Billionaire Club',
                description: 'Legendary status. The platform has officially moved ₦1,000,000,000 in GMV.',
                target: 1000000000,
                current: totalGMV,
                icon: Star,
                color: 'text-yellow-400',
                format: (val) => `₦${val.toLocaleString()}`
            },

            // Product Achievements
            {
                id: 'products_50',
                title: 'Catalog Starter',
                description: 'We reached 50 unique products listed on Zeneva.',
                target: 50,
                current: totalProducts,
                icon: CheckCircle,
                color: 'text-indigo-400',
            },
            {
                id: 'products_500',
                title: 'Inventory Builder',
                description: 'We officially host over 500 unique products on the platform.',
                target: 500,
                current: totalProducts,
                icon: CheckCircle,
                color: 'text-orange-500',
            },
            {
                id: 'products_5000',
                title: 'Massive Marketplace',
                description: '5,000 unique products are now available through businesses on Zeneva.',
                target: 5000,
                current: totalProducts,
                icon: Zap,
                color: 'text-pink-500',
            },

            // Business Achievements
            {
                id: 'businesses_10',
                title: 'Pioneers',
                description: 'Our first 10 active businesses trust Zeneva.',
                target: 10,
                current: activeBusinesses,
                icon: Trophy,
                color: 'text-cyan-500',
            },
            {
                id: 'businesses_100',
                title: 'A Growing Community',
                description: 'We successfully reached 100 active businesses running on Zeneva.',
                target: 100,
                current: activeBusinesses,
                icon: Trophy,
                color: 'text-indigo-500',
            },
            {
                id: 'businesses_500',
                title: 'Enterprise Scale',
                description: 'An army of 500 active businesses now operate via Zeneva.',
                target: 500,
                current: activeBusinesses,
                icon: Star,
                color: 'text-fuchsia-500',
            }
        ];
    }, [businesses, products, receipts]);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `zeneva-platform-achievement-${selectedMilestone?.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Downloaded!", description: "Your platform achievement card has been saved." });
        } catch (error) {
            console.error("Download failed", error);
            toast({ variant: "destructive", title: "Download Failed", description: "Could not save the image. Please try again." });
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg">Loading Achievements...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="mb-2">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    Platform Achievements
                </h1>
                <p className="text-muted-foreground mt-2">
                    Track the collective milestones and achievements we've reached as a platform.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                {milestones.map((milestone, index) => {
                    const isCompleted = milestone.current >= milestone.target;
                    const progressValue = Math.min((milestone.current / milestone.target) * 100, 100);

                    // Determine if we need a connector line to the next card
                    const showConnector = index < milestones.length - 1;

                    return (
                        <div key={milestone.id} className="relative group">
                            {showConnector && (
                                <div className="hidden lg:block absolute top-[50%] -right-[24px] w-[24px] border-t-2 border-dashed border-primary/30 z-0 animate-pulse" />
                            )}
                            <Card
                                onClick={() => {
                                    if (isCompleted) {
                                        setSelectedMilestone(milestone);
                                        triggerConfetti();
                                    }
                                }}
                                className={cn(
                                    "relative overflow-hidden transition-all duration-300 animate-in fade-in zoom-in",
                                    isCompleted ? "cursor-pointer hover:-translate-y-1 shadow-md hover:shadow-xl ring-1 ring-primary/20 hover:ring-primary/50" : "opacity-80 grayscale-[30%]"
                                )}
                            >
                                <div className="absolute inset-0 z-0 pointer-events-none">
                                    <Image
                                        src="/achievement_bg.png"
                                        alt="Card Background"
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover opacity-10 mix-blend-multiply dark:mix-blend-lighten"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-transparent" />
                                </div>

                                <CardHeader className="relative z-10 flex flex-row items-center gap-4 pb-2">
                                    <div className={cn("p-3 rounded-xl bg-background/80 backdrop-blur-sm border shadow-sm", milestone.color, isCompleted ? "bg-primary/10 border-primary/20 text-primary" : "text-muted-foreground")}>
                                        <milestone.icon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold">{milestone.title}</CardTitle>
                                        <CardDescription className="text-xs font-medium">{milestone.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10 space-y-4 pt-2">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1.5 font-semibold">
                                            <span>Progress</span>
                                            <span className={isCompleted ? "text-primary font-bold" : "text-muted-foreground font-medium"}>
                                                {milestone.format ? milestone.format(milestone.current) : milestone.current.toLocaleString()} / {milestone.format ? milestone.format(milestone.target) : milestone.target.toLocaleString()}
                                            </span>
                                        </div>
                                        <Progress value={progressValue} className={cn("h-2.5 bg-muted/50 overflow-hidden", isCompleted ? "[&>div]:bg-primary shadow-inner" : "")} />
                                    </div>
                                    {isCompleted && (
                                        <div className="flex items-center gap-2 text-xs text-primary font-bold bg-primary/10 p-2 rounded-lg border border-primary/20">
                                            <PartyPopper className="h-4 w-4 animate-bounce" />
                                            Achievement Unlocked - Click to view!
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>

            <Dialog open={!!selectedMilestone} onOpenChange={(open) => !open && setSelectedMilestone(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 gap-0">
                    <DialogTitle className="sr-only">Platform Achievement</DialogTitle>
                    <DialogDescription className="sr-only">Platform achievement milestone download view</DialogDescription>

                    <div ref={cardRef} className="relative p-8 flex flex-col items-center text-center bg-background min-h-[420px] justify-center">
                        <div className="absolute inset-0 z-0">
                            <Image
                                src="/achievement_bg.png"
                                alt="Background"
                                fill
                                sizes="100vw"
                                className="object-cover opacity-40"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
                        </div>

                        <div className="relative z-10 mb-4 px-3 py-1 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-full">
                            <p className="text-xs font-bold text-yellow-600 tracking-wide uppercase flex items-center gap-2">
                                <Trophy className="h-3 w-3" /> Zeneva Honors
                            </p>
                        </div>

                        <div className="relative z-10 w-32 h-32 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl mb-6 ring-4 ring-yellow-500/20 text-yellow-500">
                            {selectedMilestone && <selectedMilestone.icon className="h-16 w-16" />}
                        </div>

                        <div className="relative z-10 w-full mb-6">
                            <h2 className="text-2xl font-bold text-primary mb-2 leading-tight">
                                {selectedMilestone?.title}
                            </h2>
                            <p className="text-base text-foreground/80 font-medium px-4">
                                {selectedMilestone?.description}
                            </p>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 gap-4 w-full bg-white/60 backdrop-blur-sm border border-white/20 p-4 rounded-xl shadow-sm">
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Platform Wide Goal Reached</p>
                                <p className="text-sm font-bold mt-1 text-primary">
                                    {selectedMilestone?.format ? selectedMilestone.format(selectedMilestone.target) : selectedMilestone?.target.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <p className="text-[11px] font-black tracking-[0.2em] text-primary/80 uppercase">
                                zeneva.space
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/30 border-t flex flex-col gap-3">
                        <Button className="w-full gap-2 text-base h-11 shadow-md hover:shadow-lg transition-all" onClick={() => triggerConfetti()}>
                            <PartyPopper className="h-4 w-4" />
                            Celebrate Again!
                        </Button>
                        <Button variant="outline" className="w-full gap-2 h-11 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary" onClick={handleDownload} disabled={isDownloading}>
                            {isDownloading ? (
                                <>Downloading...</>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Download Certificate
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
