'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, orderBy, limit, increment, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Zap, TrendingUp, AlertTriangle, Search, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const GLOBAL_LIMIT = 1500;

export default function AdminAIUsage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [globalCount, setGlobalCount] = useState(0);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [grantAmount, setGrantAmount] = useState(100);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [isGranting, setIsGranting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!firestore || !user) return;
    loadData();
  }, [firestore, user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fetch Global limit
      const globalDoc = await getDoc(doc(firestore, 'platform_stats', 'ai_usage_global'));
      if (globalDoc.exists()) {
        const data = globalDoc.data();
        if (data.date === todayStr) {
          setGlobalCount(data.count || 0);
        } else {
          setGlobalCount(0); // new day
        }
      }

      // Fetch active businesses with AI usage
      const bSnap = await getDocs(query(collection(firestore, 'businessInstances'), where('status', '==', 'active')));
      
      const bData = bSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => (b as any).aiUsageCount > 0 || (b as any).aiBonusCredits > 0)
        .sort((a: any, b: any) => {
          const aCount = a.aiUsageCurrentDate === todayStr ? (a.aiUsageCount || 0) : 0;
          const bCount = b.aiUsageCurrentDate === todayStr ? (b.aiUsageCount || 0) : 0;
          return bCount - aCount;
        });

      setBusinesses(bData);
    } catch (error) {
      console.error('Failed to load AI usage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedBusiness || !firestore) return;
    setIsGranting(true);
    try {
      const bRef = doc(firestore, 'businessInstances', selectedBusiness.id);
      await updateDoc(bRef, {
        aiBonusCredits: increment(grantAmount)
      });
      toast({ title: 'Credits Granted', description: `Successfully granted ${grantAmount} bonus credits to ${selectedBusiness.name}.` });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to grant credits.' });
    } finally {
      setIsGranting(false);
    }
  };

  const filteredBusinesses = businesses.filter(b => b.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Zap className="w-8 h-8 animate-pulse text-gray-300" /></div>;
  }

  const usagePercent = Math.min((globalCount / GLOBAL_LIMIT) * 100, 100);
  const isDanger = usagePercent > 90;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-orange-500" />
            AI Usage Tracker
          </h1>
          <p className="text-slate-500 mt-1">Monitor daily Gemini usage and grant bonus credits to businesses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={isDanger ? 'border-red-200 bg-red-50' : 'border-slate-200'}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Global Daily Usage (Today)</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-4xl font-bold text-slate-900">{globalCount.toLocaleString()}</h2>
                  <span className="text-sm font-medium text-slate-500">/ {GLOBAL_LIMIT.toLocaleString()}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {isDanger ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${isDanger ? 'bg-red-500' : 'bg-orange-500'}`} 
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Top AI Users</CardTitle>
              <CardDescription>Businesses sorted by their daily AI query usage.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search businesses..."
                className="pl-9 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Business Name</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium text-center">Today's Usage</th>
                  <th className="px-6 py-4 font-medium text-center">Bonus Credits</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBusinesses.map((b) => {
                  const todayUsage = b.aiUsageCurrentDate === todayStr ? (b.aiUsageCount || 0) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{b.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-slate-600">{b.plan || 'starter'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {todayUsage}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {b.aiBonusCredits ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            {b.aiBonusCredits} available
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Dialog open={isDialogOpen && selectedBusiness?.id === b.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedBusiness(b);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <PlusCircle className="w-3.5 h-3.5" />
                              Grant Credits
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Grant Bonus AI Credits</DialogTitle>
                              <DialogDescription>
                                Add bonus AI queries to {b.name}. These credits do not expire and will be used if the daily tier limit is reached.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <label className="text-sm font-medium text-slate-700 mb-2 block">Amount of Credits to Grant</label>
                              <Input 
                                type="number" 
                                min={1} 
                                value={grantAmount} 
                                onChange={(e) => setGrantAmount(Number(e.target.value))}
                                className="text-lg"
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleGrantCredits} disabled={isGranting} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                                {isGranting ? <Zap className="w-4 h-4 animate-bounce" /> : <CheckCircle2 className="w-4 h-4" />}
                                Grant Credits
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  );
                })}
                {filteredBusinesses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No AI usage data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
