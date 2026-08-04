'use client';

import * as React from 'react';
import { Check, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { getCountryFromIP } from '@/lib/utils';

const AnalyticsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="chart-grad1" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="chart-grad2" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
      <linearGradient id="chart-grad3" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="trend-line" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#FFFFFF" />
      </linearGradient>
      <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect x="20" y="50" width="16" height="30" rx="4" fill="url(#chart-grad1)" />
    <rect x="42" y="30" width="16" height="50" rx="4" fill="url(#chart-grad2)" />
    <rect x="64" y="10" width="16" height="70" rx="4" fill="url(#chart-grad3)" />
    <path d="M 28 55 L 50 35 L 72 15" stroke="url(#trend-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-blue)" />
    <circle cx="72" cy="15" r="4" fill="#FFFFFF" filter="url(#glow-blue)" />
  </svg>
);

const PremiumCoinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="gold-base" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="gold-inner" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#gold-base)" />
    <circle cx="50" cy="50" r="32" fill="url(#gold-inner)" />
    <path d="M 50 25 V 75 M 35 40 H 65 M 35 60 H 65 M 40 30 Q 60 30 60 50 Q 60 70 40 70" stroke="#FFFBEB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow-gold)"/>
    <circle cx="75" cy="25" r="4" fill="#FFFFFF" filter="url(#glow-gold)" />
    <circle cx="20" cy="65" r="3" fill="#FFFFFF" filter="url(#glow-gold)" opacity="0.6"/>
  </svg>
);

const AIIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="ai-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#D946EF" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="ai-grad2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
      <filter id="glow-ai" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M 50 15 L 80 32 L 80 68 L 50 85 L 20 68 L 20 32 Z" fill="url(#ai-grad1)" opacity="0.8" />
    <path d="M 50 25 L 70 38 L 70 62 L 50 75 L 30 62 L 30 38 Z" fill="url(#ai-grad2)" filter="url(#glow-ai)" />
    <circle cx="50" cy="50" r="10" fill="#FFFFFF" filter="url(#glow-ai)" />
    <path d="M 50 50 L 50 25 M 50 50 L 70 62 M 50 50 L 30 62" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <circle cx="30" cy="20" r="3" fill="#F472B6" filter="url(#glow-ai)" />
    <circle cx="85" cy="50" r="4" fill="#38BDF8" filter="url(#glow-ai)" />
    <circle cx="20" cy="80" r="2" fill="#8B5CF6" filter="url(#glow-ai)" />
  </svg>
);

interface FeatureGateProps {
  children: React.ReactNode;
  requiredPlan: 'pro' | 'business';
  currentPlan: 'starter' | 'pro' | 'business' | undefined;
  hasLifetimeAccess: boolean;
  featureName: string;
  featureDescription: string;
  className?: string;
  placeholderContent?: React.ReactNode;
  isLoading?: boolean;
  bypass?: boolean;
}

export default function FeatureGate({
  children,
  requiredPlan,
  currentPlan,
  hasLifetimeAccess,
  featureName,
  featureDescription,
  className,
  placeholderContent,
  isLoading,
  bypass,
}: FeatureGateProps) {
  const planHierarchy = {
    starter: 0,
    pro: 1,
    business: 2,
  };

  const userPlanLevel = planHierarchy[currentPlan || 'starter'];
  const requiredPlanLevel = planHierarchy[requiredPlan];

  const hasAccess = bypass || hasLifetimeAccess || userPlanLevel >= requiredPlanLevel;

  const [currency, setCurrency] = React.useState<'USD' | 'NGN'>('USD');

  React.useEffect(() => {
    getCountryFromIP().then((country) => {
      if (country === 'Nigeria') {
        setCurrency('NGN');
      } else {
        setCurrency('USD');
      }
    });
  }, []);

  if (isLoading) {
    return (
        <div className={`flex flex-col items-center justify-center p-12 min-h-[300px] ${className}`}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground mt-4 animate-pulse">Verifying credentials...</p>
        </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  const UpgradeNotice = () => (
    <div className="bg-background border rounded-2xl shadow-xl max-w-2xl w-full p-8 text-left">
        <h3 className="text-3xl font-extrabold tracking-tight mb-2">Unlock {featureName}</h3>
        <p className="text-muted-foreground text-lg mb-6">{featureDescription}</p>
        
        <div className="relative bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent dark:from-orange-950/20 dark:via-orange-950/10 dark:to-transparent rounded-xl p-8 mb-8 overflow-hidden border">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="relative z-10 sm:w-2/3">
                <h4 className="text-xl font-bold mb-4">
                    Upgrade to {requiredPlan === 'business' ? 'Business' : 'Pro'} so you can:
                </h4>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium">Access detailed analytical reports and deep-dive metrics</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium">Unlock advanced Zen AI capabilities and smart forecasting</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium">Manage unlimited products, customers, and complex inventory</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium">Track your business growth securely from any device</span>
                    </li>
                </ul>
            </div>
            
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-1/2 flex-col items-center justify-center gap-6 opacity-90 pointer-events-none hidden sm:flex z-10 translate-x-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-white/20 shadow-[0_0_40px_rgba(249,115,22,0.3)] backdrop-blur-xl rotate-[-5deg] hover:rotate-0 transition-transform">
                    <AnalyticsIcon className="w-12 h-12" />
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-white/20 shadow-[0_0_40px_rgba(249,115,22,0.3)] backdrop-blur-xl rotate-[5deg] hover:rotate-0 transition-transform">
                    <PremiumCoinIcon className="w-12 h-12" />
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-white/20 shadow-[0_0_40px_rgba(249,115,22,0.3)] backdrop-blur-xl rotate-[-5deg] hover:rotate-0 transition-transform">
                    <AIIcon className="w-12 h-12" />
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                <Link href="/billing">Get {requiredPlan === 'business' ? 'Business' : 'Pro'} Plan</Link>
            </Button>
            <div className="text-sm text-muted-foreground">
                Starting at <span className="font-semibold text-foreground">{currency === 'NGN' ? (requiredPlan === 'business' ? '₦30,000' : '₦10,000') : (requiredPlan === 'business' ? '$30' : '$10')}/mo</span>.
            </div>
        </div>
    </div>
  );

  if (placeholderContent) {
    return (
        <div className={`relative ${className}`}>
            <div className="grid gap-6">
                {placeholderContent}
            </div>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg p-4 pointer-events-auto">
                <div className="sticky top-[10vh] max-h-[85vh] overflow-y-auto mx-auto w-fit scrollbar-hide">
                    <UpgradeNotice />
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg p-4 pointer-events-auto">
        <div className="sticky top-[10vh] max-h-[85vh] overflow-y-auto mx-auto w-fit scrollbar-hide">
            <UpgradeNotice />
        </div>
      </div>
      <div className="opacity-30 blur-[4px] pointer-events-none select-none transition-all duration-500">{children}</div>
    </div>
  );
}
