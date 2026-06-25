'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import MarketingHeader from "@/components/layout/marketing-header";
import MarketingFooter from "@/components/layout/marketing-footer";
import { Button } from "@/components/ui/button";
import { InteractiveGrid } from '@/components/interactive-grid';
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  ChevronRight,
  TrendingUp,
  Zap,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Loader2,
  Sparkles,
  Building2,
  DollarSign,
  AlertTriangle,
  FileText
} from "lucide-react";
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const grantOpportunities = [
  {
    id: "tef-grant",
    title: "Tony Elumelu Foundation Grant",
    funder: "Tony Elumelu Foundation (TEF)",
    amount: "₦2,500,000 ($5,000)",
    description: "Annual entrepreneurship programme providing mentoring, business training, and non-refundable seed capital to African startups.",
    eligibility: "African startups < 5 years old"
  },
  {
    id: "lsetf-grant",
    title: "Lagos State MSME Recovery Fund",
    funder: "LSETF",
    amount: "Up to ₦5,000,000",
    description: "Financial grants and low-interest matching funds targeting micro, small, and medium enterprises based in Lagos State.",
    eligibility: "Lagos-based registered businesses"
  },
  {
    id: "boi-growth-fund",
    title: "BOI Youth Enterprise Support",
    funder: "Bank of Industry (BOI)",
    amount: "Up to ₦10,000,000",
    description: "Funding programs and business development grants for young creative entrepreneurs across Nigeria.",
    eligibility: "Nigerian youths aged 18-35"
  }
];

export default function GrantsPage() {
  const [selectedGrant, setSelectedGrant] = useState<typeof grantOpportunities[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGrant) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const application = {
      grantId: selectedGrant.id,
      grantTitle: selectedGrant.title,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      businessName: formData.get('businessName'),
      businessSector: formData.get('businessSector'),
      amountRequested: formData.get('amountRequested'),
      pitch: formData.get('pitch'),
      businessPlanLink: formData.get('businessPlanLink') || '',
      createdAt: serverTimestamp(),
      status: 'pending'
    };

    try {
      await addDoc(collection(firestore, 'grant_applications'), application);
      toast({
        variant: 'success',
        title: 'Application Submitted!',
        description: "Your grant application support request has been received. Our review team will assess your profile.",
      });
      setSelectedGrant(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <main className="relative">
        <div className="fixed inset-0 grid-lines w-full h-full pointer-events-none z-0 opacity-[0.15]"></div>
        
        {/* Hero Section */}
        <section className="relative flex items-center justify-center px-6 pt-48 pb-20 md:py-48 overflow-hidden bg-transparent">
          <div className="absolute inset-0 z-0">
            <InteractiveGrid />
            <div className="aura-background"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm hover:shadow-md">
              <Trophy className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Empowerment Portal</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95] text-slate-950 font-dm-sans">
              Fuel your growth <br />
              <span className="text-slate-500">with verified grants.</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed font-dm-sans">
              Zeneva aggregates and reviews legitimate business grant opportunities for Nigerian entrepreneurs. Zero scam links, zero fees.
            </p>

            {/* Anti-Scam Advisory */}
            <div className="max-w-xl mx-auto p-4 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3 text-left">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-950 font-dm-sans">Scam Warning Advisory</h4>
                <p className="text-xs text-red-700 font-medium font-dm-sans mt-0.5 leading-relaxed">
                  Zeneva and official government grant agencies will **never** ask you for a processing fee, account upgrade fee, or activation money to apply for a grant. If you receive an email asking for money to secure a grant, it is a scam.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-md px-8 py-4 h-auto text-base font-medium tracking-tight shadow-sm">
                <Link href="#opportunities" className="font-dm-sans">View Opportunities</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Opportunities List */}
        <section id="opportunities" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto rounded-[2rem] p-8 md:p-16">
            <div className="mb-10 text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-dm-sans tracking-tight">Verified Grant Openings</h2>
              <p className="text-slate-500 text-sm mt-1">Direct applications for verified enterprise schemes.</p>
            </div>
            
            <div className="space-y-6">
              {grantOpportunities.map((grant) => (
                <div 
                  key={grant.id} 
                  className="bg-white rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-sm border-2 border-dashed border-slate-200 hover:border-primary/30 transition-all"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                        {grant.funder}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-dm-sans">
                      {grant.title}
                    </h3>
                    <p className="text-slate-600 text-[15px] leading-snug font-dm-sans max-w-2xl">
                      {grant.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-400 font-dm-sans pt-1">
                      <span className="text-slate-900 font-bold">Funding: {grant.amount}</span>
                      <span>•</span>
                      <span>Target: {grant.eligibility}</span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 w-full md:w-auto">
                    <Button 
                      onClick={() => setSelectedGrant(grant)}
                      className="bg-primary hover:bg-primary/90 text-white rounded-lg px-8 h-12 text-sm font-bold w-full md:w-auto"
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Grant Application Dialog */}
      <Dialog open={!!selectedGrant} onOpenChange={(open) => !open && setSelectedGrant(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-stone-950 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
            <DialogHeader className="relative z-10 text-left">
              <DialogTitle className="text-xl font-bold font-dm-sans text-white tracking-tight">Apply for Zeneva Grant Support</DialogTitle>
              <DialogDescription className="text-white/60 text-xs font-medium font-dm-sans mt-1">
                Applying for: **{selectedGrant?.title}**
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleApply} className="p-6 space-y-4 bg-white font-dm-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Full Name</Label>
                <Input id="name" name="name" required placeholder="John Doe" className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Email Address</Label>
                <Input id="email" name="email" type="email" required placeholder="john@example.com" className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Phone Number</Label>
                <Input id="phone" name="phone" required placeholder="+234 ..." className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="businessName" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Business Name</Label>
                <Input id="businessName" name="businessName" required placeholder="My Store Ltd" className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="businessSector" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Business Sector</Label>
                <Input id="businessSector" name="businessSector" required placeholder="e.g. Retail, Agriculture" className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="amountRequested" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Amount Requested (₦)</Label>
                <Input id="amountRequested" name="amountRequested" required placeholder="e.g. 2,000,000" className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
              </div>
            </div>
 
            <div className="space-y-1">
              <Label htmlFor="businessPlanLink" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Pitch Deck / Business Plan Link (Optional)</Label>
              <Input id="businessPlanLink" name="businessPlanLink" placeholder="https://drive.google.com/..." className="h-10 rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 text-sm" />
            </div>
 
            <div className="space-y-1">
              <Label htmlFor="pitch" className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">How will this grant help your business grow?</Label>
              <Textarea id="pitch" name="pitch" required placeholder="Outline your immediate plans, expected impact, and how Zeneva software fits in..." className="min-h-[100px] rounded-lg border-2 border-dashed border-slate-200 focus:border-primary focus:ring-0 bg-slate-50/50 p-3 text-sm resize-none" />
            </div>
 
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  Submit Application
                  <CheckCircle2 className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-medium">By submitting, you agree to our verified grant vetting process.</p>
          </form>
        </DialogContent>
      </Dialog>

      <MarketingFooter />
    </div>
  );
}
