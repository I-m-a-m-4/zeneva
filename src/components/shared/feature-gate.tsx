'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

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
}: FeatureGateProps) {
  const planHierarchy = {
    starter: 0,
    pro: 1,
    business: 2,
  };

  const userPlanLevel = planHierarchy[currentPlan || 'starter'];
  const requiredPlanLevel = planHierarchy[requiredPlan];

  const hasAccess = hasLifetimeAccess || userPlanLevel >= requiredPlanLevel;

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
    <div className="text-center p-8 bg-card border rounded-lg shadow-lg max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        {requiredPlan === 'business' ? (
            <ShieldCheck className="h-6 w-6 text-primary" />
        ) : (
            <Zap className="h-6 w-6 text-primary" />
        )}
        </div>
        <h3 className="text-2xl font-bold mb-2">Upgrade to Unlock {featureName}</h3>
        <p className="text-muted-foreground mb-6">{featureDescription}</p>
        <Button asChild size="lg">
        <Link href="/billing">View Plans & Upgrade</Link>
        </Button>
    </div>
  );

  if (placeholderContent) {
    return (
        <div className={`relative ${className}`}>
            <div className="grid gap-6">
                {placeholderContent}
            </div>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg p-4">
                <UpgradeNotice />
            </div>
        </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg p-4">
        <UpgradeNotice />
      </div>
      <div className="opacity-40 blur-sm pointer-events-none">{children}</div>
    </div>
  );
}
