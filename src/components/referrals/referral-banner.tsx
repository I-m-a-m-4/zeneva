'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, ArrowRight } from 'lucide-react';

interface ReferralBannerProps {
  onSwitchTab?: () => void;
}

export default function ReferralBanner({ onSwitchTab }: ReferralBannerProps) {
  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400 shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Want Free Pro Access?
              <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                +30 Days Free
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invite another retail or supermarket store owner. Once they complete qualification, you both get 30 days of free Pro!
            </p>
          </div>
        </div>
        {onSwitchTab ? (
          <Button onClick={onSwitchTab} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm">
            <span>Refer a Store</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm">
            <Link href="/billing?tab=referrals">
              <span>Refer a Store</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
