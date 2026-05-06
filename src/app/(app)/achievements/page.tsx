
'use client';

import * as React from 'react';
import { CachedImage } from "@/components/shared/cached-image";
import Image from "next/image";
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, DollarSign, PartyPopper, PlusCircle, Target, Users, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { usePOS } from '@/context/pos-context';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { secureStorage } from '@/lib/secure-storage';

const SALES_MILESTONES = [
    { value: 100000, label: '₦100k in Sales', image: '/badges/sales-pioneer.png' },
    { value: 500000, label: '₦500k in Sales', image: '/badges/sales-pioneer.png' },
    { value: 1000000, label: '₦1 Million in Sales', image: '/badges/millionaire-milestone.png' },
    { value: 5000000, label: '₦5 Million in Sales', image: '/badges/millionaire-milestone.png' },
    { value: 10000000, label: '₦10 Million in Sales', image: '/badges/five-figure-club.png' },
    { value: 30000000, label: '₦30 Million in Sales', image: '/badges/five-figure-club.png' },
    { value: 50000000, label: '₦50 Million in Sales', image: '/badges/high-roller.png' },
    { value: 100000000, label: '₦100 Million in Sales', image: '/badges/high-roller.png' },
];

const PRODUCT_MILESTONES = [
    { value: 100, label: '100 Products Added', image: '/badges/inventory-architect.png' },
    { value: 500, label: '500 Products Added', image: '/badges/inventory-architect.png' },
    { value: 1000, label: '1,000 Products Added', image: '/badges/inventory-architect.png' },
];

const CUSTOMER_MILESTONES = [
    { value: 50, label: '50 Customers', image: '/badges/community-cultivator.png' },
    { value: 100, label: '100 Customers', image: '/badges/community-cultivator.png' },
    { value: 500, label: '500 Customers', image: '/badges/community-cultivator.png' },
];

type GoalMetric = 'totalSales' | 'customerCount';
interface Goal {
    id: number;
    title: string;
    target: number;
    metric: GoalMetric;
}

function GoalSetting() {
    const { receipts, customers } = usePOS();
    const [goals, setGoals] = React.useState<Goal[]>(() => {
        return secureStorage.getItem<Goal[]>('userGoals') || [];
    });
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [newGoal, setNewGoal] = React.useState({ title: '', target: '', metric: 'totalSales' as GoalMetric });
    const { toast } = useToast();

    React.useEffect(() => {
        secureStorage.setItem('userGoals', goals);
    }, [goals]);

    const handleAddGoal = () => {
        if (!newGoal.title || !newGoal.target) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide a title and target for your goal.' });
            return;
        }
        const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
        setGoals([...goals, { ...newGoal, id: newId, target: Number(newGoal.target) }]);
        setIsDialogOpen(false);
        setNewGoal({ title: '', target: '', metric: 'totalSales' });
        toast({ variant: 'success', title: 'Goal Set!', description: 'Your new goal has been added.' });
    };

    const handleDeleteGoal = (id: number) => {
        setGoals(goals.filter(g => g.id !== id));
        toast({ title: 'Goal Removed' });
    }

    const calculateProgress = (goal: Goal) => {
        if (goal.metric === 'totalSales') {
            const totalSales = receipts?.reduce((sum, r) => sum + r.total, 0) || 0;
            return (totalSales / goal.target) * 100;
        }
        if (goal.metric === 'customerCount') {
            const totalCustomers = customers?.length || 0;
            return (totalCustomers / goal.target) * 100;
        }
        return 0;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target />
                        Your Goals
                    </div>
                    <Button size="sm" onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Set New Goal</Button>
                </CardTitle>
                <CardDescription>Set custom targets for your business and track your progress. Goals are saved on this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {goals.length > 0 ? (
                    goals.map(goal => {
                        const progress = calculateProgress(goal);
                        const isAchieved = progress >= 100;
                        return (
                            <div key={goal.id}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{goal.title}</span>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>Delete</Button>
                                </div>
                                <Progress value={progress} />
                                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                    <span>Progress: {progress.toFixed(1)}%</span>
                                    <span>Target: {goal.metric === 'totalSales' ? `₦${goal.target.toLocaleString()}` : goal.target.toLocaleString()}</span>
                                </div>
                                {isAchieved && (
                                    <div className="text-green-600 font-semibold text-sm mt-2 flex items-center gap-2">
                                        <PartyPopper className="h-4 w-4" /> Goal Achieved!
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>You haven't set any goals yet.</p>
                        <p className="text-sm">Click "Set New Goal" to get started!</p>
                    </div>
                )}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set a New Goal</DialogTitle>
                        <DialogDescription>Define a new target for your business to work towards.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="goal-title">Goal Title</Label>
                            <Input id="goal-title" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g., Reach 1,000 Customers" />
                        </div>
                        <div>
                            <Label htmlFor="goal-metric">Metric to Track</Label>
                            <Select value={newGoal.metric} onValueChange={(value: GoalMetric) => setNewGoal({ ...newGoal, metric: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="totalSales"><DollarSign className="inline-block mr-2 h-4 w-4" />Total Sales</SelectItem>
                                    <SelectItem value="customerCount"><Users className="inline-block mr-2 h-4 w-4" />Customer Count</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="goal-target">Target Value</Label>
                            <Input id="goal-target" type="number" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} placeholder="e.g., 1000" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddGoal}>Add Goal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

export default function AchievementsPage() {
    const { toast } = useToast();
    const { receipts, products, customers, triggerConfetti, business } = usePOS();
    const [seenMilestones, setSeenMilestones] = React.useState<Set<string>>(new Set());
    const [selectedMilestone, setSelectedMilestone] = React.useState<{ label: string; date: Date; description: string; imageUrl: string; details?: string } | null>(null);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 3, // Higher scale for better quality
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `zeneva-achievement-${selectedMilestone?.label.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Downloaded!", description: "Your achievement card has been saved." });
        } catch (error) {
            console.error("Download failed", error);
            toast({ variant: "destructive", title: "Download Failed", description: "Could not save the image. Please try again." });
        } finally {
            setIsDownloading(false);
        }
    };

    React.useEffect(() => {
        const stored = secureStorage.getItem<string[]>('seenMilestones');
        if (stored) {
            setSeenMilestones(new Set(stored));
        }
    }, []);

    const milestones = React.useMemo(() => {
        const achieved: { id: string; label: string; date: Date; description: string; imageUrl: string; details: string }[] = [];
        const currentYear = new Date().getFullYear();

        if (receipts) {
            const sortedReceipts = [...receipts].sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());

            let yearTotal = 0;
            for (const receipt of sortedReceipts) {
                const receiptDate = receipt.createdAt.toDate();
                if (receiptDate.getFullYear() === currentYear) {
                    yearTotal += receipt.total;
                    for (const milestone of SALES_MILESTONES) {
                        if (yearTotal >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                            achieved.push({
                                id: `sales-${milestone.value}-${currentYear}`,
                                label: `Crossed ${milestone.label}`,
                                date: receiptDate,
                                description: "You're on a roll! Keep up the incredible momentum.",
                                imageUrl: milestone.image,
                                details: `Total Year Sales: ₦${yearTotal.toLocaleString()}`
                            });
                        }
                    }
                }
            }
        }

        if (products) {
            for (const milestone of PRODUCT_MILESTONES) {
                if (products.length >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                    // Offset date slightly so higher milestones appear "newer" (top of list)
                    // or "older" (bottom) depending on sort.
                    // We want: 500 (Newest/Top), 100 (Oldest/Bottom).
                    // So 500 should be T, 100 should be T - delta.
                    // Value increases -> Date increases.
                    // We can use milestone.value to add milliseconds.
                    const date = new Date();
                    date.setMilliseconds(date.getMilliseconds() + (milestone.value / 10)); // Higher value = later time

                    achieved.push({
                        id: `products-${milestone.value}`,
                        label: `Reached ${milestone.label}`,
                        date: date,
                        description: "Your catalog is growing fast. Great job!",
                        imageUrl: milestone.image,
                        details: `Catalog Size: ${products.length} Products`
                    });
                }
            }
        }

        if (customers) {
            for (const milestone of CUSTOMER_MILESTONES) {
                if (customers.length >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                    const date = new Date();
                    date.setMilliseconds(date.getMilliseconds() + (milestone.value / 10));

                    achieved.push({
                        id: `customers-${milestone.value}`,
                        label: `Joined by ${milestone.label}`,
                        date: date,
                        description: "Your community is expanding. Fantastic work!",
                        imageUrl: milestone.image,
                        details: `Community Size: ${customers.length} Customers`
                    });
                }
            }
        }

        return achieved.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [receipts, products, customers]);

    React.useEffect(() => {
        if (milestones.length > 0 && triggerConfetti) {
            const newSeen = new Set(seenMilestones);
            let hasNewMilestone = false;
            milestones.forEach(m => {
                if (!newSeen.has(m.label)) {
                    newSeen.add(m.label);
                    hasNewMilestone = true;
                }
            });
            if (hasNewMilestone) {
                triggerConfetti();
                setSeenMilestones(newSeen);
                secureStorage.setItem('seenMilestones', Array.from(newSeen));
            }
        }
    }, [milestones, seenMilestones, triggerConfetti]);


    return (
        <div className="space-y-6">
            <PageTitle title="Achievements & Goals" subtitle="Celebrate your milestones and set new targets for your business." />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-primary">
                        <div className="flex items-center gap-2">
                            <Award />
                            Your Milestone Timeline
                        </div>
                        <Button variant="outline" size="sm" onClick={() => triggerConfetti?.()}>
                            <PartyPopper className="mr-2 h-4 w-4" />
                            Celebrate!
                        </Button>
                    </CardTitle>
                    <CardDescription>A timeline of your major major achievements. Click on any card to see details!</CardDescription>
                </CardHeader>
                <CardContent>
                    {milestones.length > 0 ? (
                        <div className="relative pl-2 md:pl-6 before:absolute before:left-2 md:before:left-6 before:top-0 before:h-full before:w-0.5 before:bg-border before:-translate-x-1/2">
                            {milestones.map((milestone, index) => (
                                <div key={index} className="relative pb-12">
                                    <div className="absolute left-2 md:left-6 top-1/2 w-4 h-4 mt-[-8px] -translate-x-1/2 rounded-full bg-primary border-4 border-background ring-4 ring-primary/20"></div>
                                    <div className="ml-6 md:ml-10">
                                        <p className="text-xs text-muted-foreground mb-1">{format(milestone.date, 'PPP')}</p>
                                        <div
                                            onClick={() => {
                                                setSelectedMilestone(milestone);
                                                triggerConfetti?.();
                                            }}
                                            className="relative flex items-center gap-3 md:gap-6 p-4 md:p-6 rounded-xl border overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:scale-[1.01]"
                                        >
                                            {/* Background Image with Overlay */}
                                            <div className="absolute inset-0 z-0">
                                                <Image
                                                    src="/achievement_bg.png"
                                                    alt="Background"
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover opacity-20"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/40" />
                                            </div>

                                            <div className="relative z-10 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm flex-shrink-0 overflow-hidden border shadow-sm group-hover:scale-110 transition-transform duration-500">
                                                 <CachedImage src={milestone.imageUrl} alt={milestone.label} className="object-contain p-2 w-full h-full" />
                                            </div>
                                            <div className="flex-1 relative z-10">
                                                <p className="font-bold text-base md:text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{milestone.label}</p>
                                                <p className="text-sm md:text-base text-muted-foreground">{milestone.description}</p>
                                            </div>
                                            <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                    <PartyPopper className="h-5 w-5 text-primary" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                            <p>Your milestones will appear here as you grow!</p>
                            <p className="text-sm">Keep adding products and making sales.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <GoalSetting />

            <Dialog open={!!selectedMilestone} onOpenChange={(open) => !open && setSelectedMilestone(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 gap-0">
                    <DialogTitle className="sr-only">Achievement Details</DialogTitle>
                    <DialogDescription className="sr-only">Detailed view of your selected achievement milestone</DialogDescription>

                    <div ref={cardRef} className="relative p-8 flex flex-col items-center text-center bg-background min-h-[420px] justify-center">
                        {/* Dynamic Background for Modal */}
                        <div className="absolute inset-0 z-0">
                            <Image
                                src="/achievement_bg.png"
                                alt="Background"
                                fill
                                sizes="100vw"
                                className="object-cover opacity-40" // Increased opacity
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
                        </div>

                        {/* Business Name Badge */}
                        <div className="relative z-10 mb-4 px-3 py-1 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full">
                            <p className="text-xs font-bold text-primary tracking-wide uppercase">
                                {business?.name || 'My Store'}
                            </p>
                        </div>

                        <div className="relative z-10 w-32 h-32 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl mb-6 ring-4 ring-primary/20">
                            {selectedMilestone && (
                                <CachedImage
                                    src={selectedMilestone.imageUrl}
                                    alt="Achievement"
                                    className="object-cover rounded-full w-full h-full" // Removed p-2, added object-cover
                                />
                            )}
                        </div>

                        <div className="relative z-10 w-full mb-6">
                            <h2 className="text-2xl font-bold text-primary mb-2 leading-tight">
                                {selectedMilestone?.label}
                            </h2>
                            <p className="text-base text-foreground/80 font-medium px-4">
                                {selectedMilestone?.description}
                            </p>
                        </div>

                        <div className="relative z-10 grid grid-cols-2 gap-4 w-full bg-white/60 backdrop-blur-sm border border-white/20 p-4 rounded-xl shadow-sm">
                            <div className="text-center border-r border-slate-200/60">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Achieved On</p>
                                <p className="font-mono text-sm font-bold mt-1 text-slate-700">
                                    {selectedMilestone?.date && format(selectedMilestone.date, 'MMM do, yyyy')}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Milestone</p>
                                <p className="text-sm font-bold mt-1 text-primary">
                                    {selectedMilestone?.details?.split(':')[1]?.trim() || selectedMilestone?.details}
                                </p>
                            </div>
                        </div>

                        {/* Footer Branding */}
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <p className="text-[11px] font-black tracking-[0.2em] text-primary/80 uppercase">
                                zeneva.space
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons Area - Not captured */}
                    <div className="p-4 bg-muted/30 border-t flex flex-col gap-3">
                        <Button className="w-full gap-2 text-base h-11 shadow-md hover:shadow-lg transition-all" onClick={() => triggerConfetti?.()}>
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

