'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Store,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import {
  getReferralProgramDetails,
  claimReferralDirect,
  type ReferralProgramDetails
} from '@/actions/referral';
import type { ReferralRecord } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';

function ReferralPhaseTracker({ referral }: { referral: ReferralRecord }) {
  const isCompleted = referral.status === 'completed' || referral.currentPhase === 'first_sale_completed';
  const hasProducts = isCompleted || referral.currentPhase === 'products_added' || (referral.completedPhases && referral.completedPhases.includes('products_added'));

  return (
    <div className="flex flex-col gap-1 py-0.5">
      <div className="flex items-center gap-1.5 text-[11px]">
        {/* Step 1: Signed Up */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
          1. Signed Up
        </span>
        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30" />

        {/* Step 2: Stock Added */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px] transition-colors",
          hasProducts
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}>
          {hasProducts ? (
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
          ) : (
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          )}
          2. Stock Added
        </span>
        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30" />

        {/* Step 3: First Sale */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px] transition-colors",
          isCompleted
            ? "bg-emerald-500 text-white font-semibold"
            : "bg-muted text-muted-foreground"
        )}>
          {isCompleted ? (
            <Sparkles className="h-2.5 w-2.5 text-amber-300" />
          ) : (
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          )}
          3. First Sale
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {isCompleted ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Fully Qualified (+30 Days Free Pro Credited)</span>
        ) : hasProducts ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">Phase 2 Done. Awaiting first sale at checkout.</span>
        ) : (
          <span>Waiting for store owner to add products.</span>
        )}
      </p>
    </div>
  );
}

export default function ReferralDashboard() {
  const { user } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Extract<ReferralProgramDetails, { ok: true }> | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Friend code input state
  const [friendCode, setFriendCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await getReferralProgramDetails({ idToken: token });
      if (res.ok) {
        setData(res);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to load referral details' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopiedCode(true);
    toast({ variant: 'success', title: 'Code Copied!', description: `Referral code ${data.referralCode} copied to clipboard.` });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopiedLink(true);
    toast({ variant: 'success', title: 'Link Copied!', description: 'Your unique invite link has been copied.' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!data?.referralLink || !data?.referralCode) return;
    const message = encodeURIComponent(
      `Hey! I'm using Zeneva to manage my retail store. Use my referral link or code "${data.referralCode}" to get 30 days of free Pro access: ${data.referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (!data?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Zeneva Retail OS',
          text: `Manage your retail store with Zeneva. Sign up with my code ${data.referralCode} and get 30 days of Pro free!`,
          url: data.referralLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClaimCode = async () => {
    if (!friendCode.trim() || !user) return;
    setClaiming(true);
    try {
      const token = await user.getIdToken();
      const res = await claimReferralDirect({ idToken: token, code: friendCode.trim() });
      if (res.ok) {
        toast({
          variant: 'success',
          title: '🎉 30 Days Free Pro Unlocked!',
          description: `Referral from ${res.referrerName || 'your friend'} accepted! 30 days of free Pro has been credited to your store.`,
        });
        setFriendCode('');
        loadDetails();
      } else {
        toast({ variant: 'destructive', title: 'Could not apply code', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to claim referral' });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading referral program...</p>
      </div>
    );
  }

  const rawCode = data?.referralCode;
  const referralCode = (rawCode && rawCode !== 'ZEN-APP') ? rawCode : 'ZEN-XXXXXX';
  const referralLink = referralCode !== 'ZEN-XXXXXX'
    ? `https://zeneva.space/signup?ref=${referralCode}`
    : (data?.referralLink && !data.referralLink.endsWith('/signup') ? data.referralLink : 'https://zeneva.space/signup');
  const stats = data?.stats || { totalReferred: 0, completedReferrals: 0, rewardDaysEarned: 0 };
  const referrals = data?.referrals || [];
  const referredBy = data?.referredBy;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ======================================================== */}
      {/* MAIN CONTENT (8 COLS): Share Hub & Qualification Tracker */}
      {/* ======================================================== */}
      <div className="lg:col-span-8 space-y-6">
        {/* Unified Compact Share Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 shadow-xs overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-1.5">
                  <Gift className="h-3 w-3" />
                  <span>Give 30 Days, Get 30 Days</span>
                </div>
                <CardTitle className="text-lg font-bold tracking-tight">
                  Invite Stores, Earn 30 Days Free Pro
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  When an invited merchant finishes setting up and records their first sale, both of you unlock 30 days of Zeneva Pro free.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={handleShareWhatsApp} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs">
                  <Send className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
                <Button onClick={handleNativeShare} size="sm" variant="outline" className="gap-1.5 h-9 text-xs border-primary/30">
                  <Share2 className="h-3.5 w-3.5 text-primary" />
                  Share Link
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-background/80">
              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="h-3 w-3 text-primary" />
                  Your Referral Code
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-center select-all h-9 flex items-center justify-center">
                    {referralCode}
                  </div>
                  <Button onClick={handleCopyCode} variant="secondary" size="sm" className="h-9 px-3 text-xs gap-1 shrink-0">
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>

              {/* Direct Link */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="h-3 w-3 text-primary" />
                  Direct Signup Link
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={referralLink}
                    className="font-mono text-xs bg-muted/40 h-9 select-all"
                  />
                  <Button onClick={handleCopyLink} variant="secondary" size="sm" className="h-9 px-3 text-xs gap-1 shrink-0">
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referred Merchants & Qualification Tracker Table */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Referred Stores & Journey
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time milestone progress for each merchant you invited
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-medium text-xs">
                {referrals.length} {referrals.length === 1 ? 'store' : 'stores'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] text-xs">Store Name</TableHead>
                    <TableHead className="min-w-[90px] text-xs">Invited On</TableHead>
                    <TableHead className="min-w-[280px] text-xs">Qualification Journey</TableHead>
                    <TableHead className="text-right min-w-[110px] text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length > 0 ? (
                    referrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell className="font-medium py-3">
                          <div className="flex items-center gap-2">
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-semibold">{ref.refereeBusinessName || 'New Store'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap py-3">
                          {ref.createdAt ? format(safeToDate(ref.createdAt) || new Date(), 'MMM dd, yyyy') : 'Recently'}
                        </TableCell>
                        <TableCell className="py-3">
                          <ReferralPhaseTracker referral={ref} />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          {ref.status === 'completed' ? (
                            <Badge className="bg-emerald-500 text-white text-[10px] border-none font-semibold whitespace-nowrap">
                              🎉 +30 Days Pro
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] whitespace-nowrap">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 rounded-full bg-muted/60">
                            <Gift className="h-6 w-6 text-muted-foreground/60" />
                          </div>
                          <p className="font-medium text-foreground">No referred stores yet</p>
                          <p className="text-[11px] text-muted-foreground max-w-sm">
                            Share your code or link above with friends. Once they add products and complete their first sale, your free Pro days will appear here!
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SIDEBAR COLUMN (4 COLS): Compact Metrics, Claim & Guide */}
      {/* ======================================================== */}
      <div className="lg:col-span-4 space-y-4">
        {/* Compact Metrics Stack */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
          {/* Card 1: Invited */}
          <Card className="p-3.5 shadow-xs bg-card/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stores Invited</p>
                <p className="text-xl font-bold mt-0.5">{stats.totalReferred}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </Card>

          {/* Card 2: Active */}
          <Card className="p-3.5 shadow-xs bg-card/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Qualified Stores</p>
                <p className="text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{stats.completedReferrals}</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <Store className="h-4 w-4" />
              </div>
            </div>
          </Card>

          {/* Card 3: Free Pro Days */}
          <Card className="p-3.5 shadow-xs bg-card/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Free Pro Earned</p>
                <p className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">{stats.rewardDaysEarned} Days</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Claim Referral Card */}
        {!referredBy ? (
          <Card className="border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Were you referred by a friend?
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Enter their referral code to immediately claim 30 days of free Pro access.
              </p>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="e.g. ZEN-A8K2F9"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                className="font-mono text-xs uppercase tracking-wider bg-background h-8"
                disabled={claiming}
              />
              <Button
                onClick={handleClaimCode}
                disabled={!friendCode.trim() || claiming}
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
              >
                {claiming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Claim 30 Days Free
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Referred by {referredBy.referrerBusinessName || 'Partner'}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                  {referredBy.rewardClaimed ? 'Your 30-day Pro bonus is active!' : 'Complete your 1st checkout sale to claim 30 days.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* How It Works Mini Stepper */}
        <Card className="p-4 space-y-3 shadow-xs">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <PackageCheck className="h-3.5 w-3.5 text-primary" />
            3-Step Qualification
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
              <div>
                <p className="font-medium text-[11px]">Invite & Signup</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Friend registers using your link or code.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
              <div>
                <p className="font-medium text-[11px]">Stock Products</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Friend adds inventory products to their store.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">3</span>
              <div>
                <p className="font-medium text-[11px] text-emerald-700 dark:text-emerald-400">First POS Sale</p>
                <p className="text-[10px] text-muted-foreground leading-tight">First checkout sale = +30 Days Pro for both!</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
