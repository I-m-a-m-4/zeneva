'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Trophy, Star, CheckCircle, Zap, Loader } from 'lucide-react';
import type { Receipt, Product, BusinessInstance, UserProfile } from '@/types';
import { cn } from '@/lib/utils';

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
            {
                id: 'sales_100',
                title: 'Century of Sales',
                description: 'Complete 100 sales across the platform.',
                target: 100,
                current: totalSales,
                icon: Trophy,
                color: 'text-yellow-500',
            },
            {
                id: 'sales_1000',
                title: 'Sales Master',
                description: 'Complete 1,000 sales across the platform.',
                target: 1000,
                current: totalSales,
                icon: Star,
                color: 'text-purple-500',
            },
            {
                id: 'gmv_1m',
                title: 'The First Million',
                description: 'Process ₦1,000,000 in total GMV.',
                target: 1000000,
                current: totalGMV,
                icon: Zap,
                color: 'text-blue-500',
                format: (val) => `₦${val.toLocaleString()}`
            },
            {
                id: 'gmv_10m',
                title: 'Ten Million Milestone',
                description: 'Process ₦10,000,000 in total GMV.',
                target: 10000000,
                current: totalGMV,
                icon: CheckCircle,
                color: 'text-emerald-500',
                format: (val) => `₦${val.toLocaleString()}`
            },
            {
                id: 'products_500',
                title: 'Inventory Builder',
                description: 'Host 500 unique products on the platform.',
                target: 500,
                current: totalProducts,
                icon: CheckCircle,
                color: 'text-orange-500',
            },
            {
                id: 'businesses_100',
                title: 'A Growing Community',
                description: 'Reach 100 active businesses on the platform.',
                target: 100,
                current: activeBusinesses,
                icon: Trophy,
                color: 'text-indigo-500',
            }
        ];
    }, [businesses, products, receipts]);

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {milestones.map(milestone => {
                    const isCompleted = milestone.current >= milestone.target;
                    const progressValue = Math.min((milestone.current / milestone.target) * 100, 100);

                    return (
                        <Card key={milestone.id} className={cn("transition-all", isCompleted ? "border-green-500/50 shadow-sm shadow-green-500/20" : "")}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={cn("p-3 rounded-full bg-muted", milestone.color, isCompleted ? "bg-green-100 dark:bg-green-900/30" : "")}>
                                    <milestone.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{milestone.title}</CardTitle>
                                    <CardDescription>{milestone.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1 font-medium">
                                        <span>Progress</span>
                                        <span className={isCompleted ? "text-green-600 dark:text-green-400 font-bold" : "text-muted-foreground"}>
                                            {milestone.format ? milestone.format(milestone.current) : milestone.current.toLocaleString()} / {milestone.format ? milestone.format(milestone.target) : milestone.target.toLocaleString()}
                                        </span>
                                    </div>
                                    <Progress value={progressValue} className={cn("h-2", isCompleted ? "[&>div]:bg-green-500" : "")} />
                                </div>
                                {isCompleted && (
                                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                        <Trophy className="h-4 w-4" />
                                        Achievement Unlocked
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
