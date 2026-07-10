'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBranch } from '@/context/branch-context';
import { usePOS } from '@/context/pos-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Store, MapPin, Plus, Trash2, Loader2, AlertTriangle, Users, Package, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch } from '@/types';

export default function BranchesSettingsPage() {
  const router = useRouter();
  const { branches, isMultiBranchEnabled, isLoadingBranches, activeBranchId, setActiveBranchId } = useBranch();
  const { business, products, receipts, currencySymbol, currentUserProfile } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isOwnerOrAdmin = currentUserProfile && (
    currentUserProfile.role === 'admin' ||
    currentUserProfile.role === 'owner' ||
    business?.ownerId === currentUserProfile.id
  );

  if (currentUserProfile && !isOwnerOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Multi-branch management and location settings are strictly restricted to the business owner and administrators.
        </p>
      </div>
    );
  }

  const handleSelectBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zeneva_active_branch', branchId);
    }
    toast({
      title: "Branch Switched",
      description: `You are now operating under the selected branch.`,
    });
  };

  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (!business?.id || !firestore) return;
    const fetchUsers = async () => {
      try {
        const q = query(collection(firestore, 'users'), where('businessId', '==', business.id));
        const snap = await getDocs(q);
        setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching users for branch stats:", err);
      }
    };
    fetchUsers();
  }, [business?.id, firestore]);

  const getBranchStats = (branchId: string, isPrimary: boolean) => {
    const branchUsers = usersList.filter(u => {
      if (u.branchId === branchId) return true;
      if (isPrimary && (!u.branchId || u.branchId === 'all')) return true;
      return false;
    });

    const activeUsersCount = branchUsers.filter(u => {
      if (!u.lastSeen) return false;
      const date = u.lastSeen.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
      return Math.abs(Date.now() - date.getTime()) < 15 * 60 * 1000;
    }).length;

    const branchProducts = (products || []).filter(p => {
      if (p.branchId === branchId) return true;
      if (isPrimary && (!p.branchId || p.branchId === 'all')) return true;
      return false;
    });

    const lowStockCount = branchProducts.filter(p => p.stock <= (p.lowStockThreshold || 5)).length;

    const branchReceipts = (receipts || []).filter(r => {
      if (r.branchId === branchId) return true;
      if (isPrimary && (!r.branchId || r.branchId === 'all')) return true;
      return false;
    });

    const salesVolume = branchReceipts.reduce((sum, r) => sum + (r.total || 0), 0);

    return {
      usersCount: branchUsers.length,
      activeUsersCount,
      productsCount: branchProducts.length,
      lowStockCount,
      salesCount: branchReceipts.length,
      salesVolume,
    };
  };

  const formatSales = (amount: number) => {
    const sym = currencySymbol || '₦';
    if (amount >= 1_000_000) {
      return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${sym}${(amount / 1_000).toFixed(1)}K`;
    }
    return `${sym}${amount.toLocaleString()}`;
  };
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmBusinessName, setConfirmBusinessName] = useState('');

  if (!mounted) return null;

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !firestore || !newBranchName.trim()) return;

    try {
      setIsAdding(true);
      
      const newBranch = {
        businessId: business.id,
        name: newBranchName.trim(),
        address: newBranchAddress.trim(),
        isPrimary: branches.length === 0, // First branch is primary
        isActive: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'branches'), newBranch);
      
      // If this is the first branch being created, enable multi-branch on the business instance
      if (!business.settings?.multiBranchEnabled) {
        await updateDoc(doc(firestore, 'businessInstances', business.id), {
          'settings.multiBranchEnabled': true
        });
      }

      toast({
        title: "Branch created",
        description: `${newBranch.name} has been added to your business.`,
      });
      
      setNewBranchName('');
      setNewBranchAddress('');
      setIsDialogOpen(false);
      
      // Switch active branch to the newly created branch
      setActiveBranchId(docRef.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zeneva_active_branch', docRef.id);
      }

      // Take the user straight to the dashboard which will display fresh stats for this new branch!
      router.push('/');
      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error creating branch",
        description: err.message || "Please check your permissions.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTrigger = (branchId: string, branchName: string, isPrimary: boolean) => {
    if (isPrimary) {
       toast({ title: "Cannot delete primary branch", variant: "destructive" });
       return;
    }
    setBranchToDelete({ id: branchId, name: branchName });
    setConfirmBusinessName('');
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete || !business?.name) return;
    if (confirmBusinessName.trim() !== business.name.trim()) {
      toast({ title: "Business name mismatch", description: "Please type the exact name of your business to confirm.", variant: "destructive" });
      return;
    }

    try {
       setIsDeleting(branchToDelete.id);
       setDeleteConfirmOpen(false);
       await deleteDoc(doc(firestore, 'branches', branchToDelete.id));
       toast({ title: "Branch deleted successfully" });
       window.location.reload();
    } catch (err: any) {
       toast({ title: "Error deleting branch", description: err.message, variant: "destructive" });
    } finally {
       setIsDeleting(null);
       setBranchToDelete(null);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage multiple store locations for your business.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Add New Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Branch</DialogTitle>
              <DialogDescription>
                Add a new physical location or warehouse to your business.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBranch} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branchName">Branch Name *</Label>
                <Input 
                  id="branchName" 
                  placeholder="e.g. Downtown Store" 
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchAddress">Address (Optional)</Label>
                <Input 
                  id="branchAddress" 
                  placeholder="e.g. 123 Main St, Lagos" 
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isAdding || !newBranchName.trim()}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Branch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {isLoadingBranches ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading branches...</p>
          </div>
        ) : branches.length === 0 ? (
           <Card className="border-dashed w-full">
             <CardContent className="flex flex-col items-center justify-center h-64 text-center">
               <Store className="h-12 w-12 text-muted-foreground/30 mb-4" />
               <h3 className="text-xl font-bold mb-2">No branches yet</h3>
               <p className="text-muted-foreground max-w-sm mb-6">
                 You are currently operating as a single-location business. Add a branch to enable multi-location features.
               </p>
               <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                 Get Started
               </Button>
             </CardContent>
           </Card>
        ) : (
          branches.map((branch) => {
            const stats = getBranchStats(branch.id, branch.isPrimary);
            const isCurrentlySelected = activeBranchId === branch.id;
            return (
              <Card 
                key={branch.id} 
                onClick={() => handleSelectBranch(branch.id)}
                className={`relative overflow-hidden group border-2 border-dashed shadow-sm cursor-pointer transition-all duration-300 w-full ${
                  isCurrentlySelected 
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/5 bg-gradient-to-br from-card to-card/95"
                }`}
              >
                {branch.isPrimary && (
                  <div className="absolute top-0 right-0 bg-primary/95 text-primary-foreground text-[9px] font-extrabold px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm z-10">
                    Primary
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className={`p-1.5 rounded-lg ${isCurrentlySelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          <Store className="h-4.5 w-4.5" />
                        </div>
                        <span className="truncate max-w-[200px] xs:max-w-[280px] sm:max-w-[400px]" title={branch.name}>{branch.name}</span>
                      </CardTitle>
                      {isCurrentlySelected && (
                        <span className="flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/15 border border-primary/30 px-2.5 py-0.5 rounded-full select-none whitespace-nowrap shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" /> Active Branch
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.activeUsersCount > 0 ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full select-none animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {stats.activeUsersCount} Active Now
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold bg-muted/60 px-2.5 py-0.5 rounded-full select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          Idle
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex items-start gap-2 pt-1.5 text-xs leading-relaxed">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 mt-0.5" />
                    <span>{branch.address || 'No address registered'}</span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-muted/50 text-center">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 select-none">
                        <Users className="h-3.5 w-3.5 text-primary/70" /> Staff
                      </p>
                      <p className="text-sm font-extrabold text-black dark:text-white mt-1">
                        {stats.activeUsersCount} <span className="text-xs font-normal text-black/60 dark:text-white/60">/ {stats.usersCount} online</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-muted/50 text-center">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 select-none">
                        <Package className="h-3.5 w-3.5 text-primary/70" /> Catalog
                      </p>
                      <p className="text-sm font-extrabold text-black dark:text-white mt-1">
                        {stats.productsCount} <span className="text-xs font-normal text-black/60 dark:text-white/60">items</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-muted/50 text-center">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 select-none">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Low Stock
                      </p>
                      <p className={`text-sm font-extrabold mt-1 ${stats.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-black dark:text-white'}`}>
                        {stats.lowStockCount} <span className="text-xs font-normal text-black/60 dark:text-white/60">alerts</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-muted/50 text-center">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 select-none">
                        <Store className="h-3.5 w-3.5 text-primary/70" /> Txns
                      </p>
                      <p className="text-sm font-extrabold text-black dark:text-white mt-1">
                        {stats.salesCount} <span className="text-xs font-normal text-black/60 dark:text-white/60">sales</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-muted/50 text-center col-span-2 md:col-span-1">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 select-none">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Revenue
                      </p>
                      <p className="text-sm font-extrabold text-black dark:text-white mt-1">
                        {formatSales(stats.salesVolume)}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/30 py-3 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-muted/20" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                    <p className="text-[10px] text-black/70 dark:text-white/70 font-semibold">ID: {branch.id.slice(0, 8)}</p>
                    {isCurrentlySelected ? (
                      <span className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-full sm:w-auto">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Currently Operating Branch
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs font-bold border-primary/40 text-primary hover:bg-primary hover:text-white h-8 w-full sm:w-auto" onClick={() => handleSelectBranch(branch.id)}>
                        Switch to this Branch
                      </Button>
                    )}
                  </div>
                  {!branch.isPrimary && (
                    <Button 
                       variant="ghost" 
                       size="icon" 
                       className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full self-end sm:self-auto shrink-0"
                       disabled={isDeleting === branch.id}
                       onClick={(e) => { e.stopPropagation(); handleDeleteTrigger(branch.id, branch.name, branch.isPrimary); }}
                       title="Delete branch"
                    >
                      {isDeleting === branch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md border-2 border-destructive/20 bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 font-bold text-xl">
              <AlertTriangle className="h-5 w-5" />
              Delete Branch
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-muted-foreground">
              This action is permanent and cannot be undone. It will permanently delete the branch <strong className="text-foreground">{branchToDelete?.name}</strong> and could orphan sales or inventory records connected to it.
              <br /><br />
              To confirm, please type the exact name of your business: <strong className="text-foreground">{business?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmBusiness" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Business Name</Label>
              <Input
                id="confirmBusiness"
                placeholder="Type your business name here"
                value={confirmBusinessName}
                onChange={(e) => setConfirmBusinessName(e.target.value)}
                className="border-destructive/35 focus-visible:ring-destructive"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={confirmBusinessName.trim() !== business?.name?.trim() || isDeleting !== null}
            >
              {isDeleting === branchToDelete?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
