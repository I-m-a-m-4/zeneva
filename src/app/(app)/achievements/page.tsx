
'use client';

import * as React from 'react';
import Image from 'next/image';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, DollarSign, PartyPopper, PlusCircle, Target, Users } from 'lucide-react';
import { usePOS } from '@/context/pos-context';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
        if (typeof window !== 'undefined') {
            const savedGoals = localStorage.getItem('userGoals');
            return savedGoals ? JSON.parse(savedGoals) : [];
        }
        return [];
    });
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [newGoal, setNewGoal] = React.useState({ title: '', target: '', metric: 'totalSales' as GoalMetric });
    const { toast } = useToast();

    React.useEffect(() => {
        localStorage.setItem('userGoals', JSON.stringify(goals));
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
                    <Button size="sm" onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Set New Goal</Button>
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
                            <Input id="goal-title" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g., Reach 1,000 Customers" />
                        </div>
                         <div>
                            <Label htmlFor="goal-metric">Metric to Track</Label>
                            <Select value={newGoal.metric} onValueChange={(value: GoalMetric) => setNewGoal({...newGoal, metric: value})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="totalSales"><DollarSign className="inline-block mr-2 h-4 w-4"/>Total Sales</SelectItem>
                                    <SelectItem value="customerCount"><Users className="inline-block mr-2 h-4 w-4"/>Customer Count</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="goal-target">Target Value</Label>
                            <Input id="goal-target" type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} placeholder="e.g., 1000" />
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
    const { receipts, products, customers, triggerConfetti } = usePOS();
    const [seenMilestones, setSeenMilestones] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('seenMilestones');
                if (stored) {
                    setSeenMilestones(new Set(JSON.parse(stored)));
                }
            } catch (e) {
                console.error("Could not parse seen milestones from localStorage", e);
            }
        }
    }, []);

    const milestones = React.useMemo(() => {
        const achieved: { label: string; date: Date; description: string; imageUrl: string; }[] = [];
        const currentYear = new Date().getFullYear();

        if (receipts) {
            const sortedReceipts = [...receipts].sort((a,b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
            
            let yearTotal = 0;
            for (const receipt of sortedReceipts) {
                const receiptDate = receipt.createdAt.toDate();
                if (receiptDate.getFullYear() === currentYear) {
                    yearTotal += receipt.total;
                     for (const milestone of SALES_MILESTONES) {
                         if (yearTotal >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                            achieved.push({ label: `Crossed ${milestone.label} This Year`, date: receiptDate, description: "You're on a roll! Keep up the incredible momentum.", imageUrl: milestone.image });
                        }
                    }
                }
            }
        }
        
        if(products) {
            for (const milestone of PRODUCT_MILESTONES) {
                if (products.length >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                    achieved.push({ label: `Reached ${milestone.label}`, date: new Date(), description: "Your catalog is growing fast. Great job!", imageUrl: milestone.image });
                }
            }
        }
        
        if (customers) {
             for (const milestone of CUSTOMER_MILESTONES) {
                if (customers.length >= milestone.value && !achieved.some(a => a.label.includes(milestone.label))) {
                    achieved.push({ label: `Reached ${milestone.label}`, date: new Date(), description: "Your community is expanding. Fantastic work!", imageUrl: milestone.image });
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
                 if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem('seenMilestones', JSON.stringify(Array.from(newSeen)));
                    } catch (e) {
                       console.error("Could not save milestones to localStorage", e);
                    }
                 }
            }
        }
    }, [milestones, seenMilestones, triggerConfetti]);


    return (
        <div className="space-y-6">
            <PageTitle title="Achievements & Goals" subtitle="Celebrate your milestones and set new targets for your business." />
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Award />
                        Your Milestone Timeline
                    </CardTitle>
                    <CardDescription>A timeline of your major business achievements. You're going at a high speed!</CardDescription>
                </CardHeader>
                <CardContent>
                    {milestones.length > 0 ? (
                        <div className="relative pl-6 before:absolute before:left-6 before:top-0 before:h-full before:w-0.5 before:bg-border before:-translate-x-1/2">
                            {milestones.map((milestone, index) => (
                                <div key={index} className="relative pb-12">
                                    <div className="absolute left-6 top-1/2 w-4 h-4 mt-[-8px] -translate-x-1/2 rounded-full bg-primary border-4 border-background ring-4 ring-primary/20"></div>
                                    <div className="ml-10">
                                        <p className="text-xs text-muted-foreground mb-1">{format(milestone.date, 'PPP')}</p>
                                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted flex-shrink-0 overflow-hidden">
                                                <Image src={milestone.imageUrl} alt={milestone.label} width={48} height={48} className="object-contain p-1" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-foreground">{milestone.label}</p>
                                                <p className="text-sm text-muted-foreground">{milestone.description}</p>
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
        </div>
    );
}

