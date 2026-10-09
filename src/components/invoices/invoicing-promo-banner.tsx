'use client';

import * as React from 'react';
import { CheckCircle2, ArrowRight, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openExternal, isNativeApp } from '@/lib/platform';

const INVOICE_STORE_ID = '9PJXTSNZBXCK';
const INVOICE_STORE_WEB_URL = `https://apps.microsoft.com/detail/${INVOICE_STORE_ID}`;
const INVOICE_STORE_DEEP_LINK = `ms-windows-store://pdp/?productid=${INVOICE_STORE_ID}`;
const INVOICE_SUITE_WEB_URL = 'https://zeneva-invoice.vercel.app/';

export function InvoicingPromoBanner() {
  const handleOpenStore = async () => {
    if (isNativeApp()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('plugin:shell|open', { path: INVOICE_STORE_DEEP_LINK });
          return;
        } catch {
          // In case protocol is not directly scoped, fallback to web listing
        }
        await invoke('plugin:shell|open', { path: INVOICE_STORE_WEB_URL });
        return;
      } catch {
        // Fallback to browser
      }
    }
    window.open(INVOICE_STORE_WEB_URL, '_blank', 'noopener,noreferrer');
  };

  const handleExploreSuite = async () => {
    await openExternal(INVOICE_SUITE_WEB_URL);
  };

  return (
    <div className="w-full rounded-lg border border-orange-300/90 dark:border-orange-800/70 bg-orange-100/80 dark:bg-[#221208] p-4 sm:p-5 transition-all">
      {/* Header with Brand Icon */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Zeneva <span className="text-orange-600 dark:text-orange-400">Invoicing</span>
            </span>
            <Badge variant="outline" className="border-orange-300 dark:border-orange-700 bg-orange-100/80 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 text-[10px] font-semibold px-2 py-0">
              Advanced Suite
            </Badge>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-foreground pt-0.5">
            Take control of your billing with Zeneva Invoicing!
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Streamline your invoicing operations with tools to create branded invoices, automate recurring payments, track client receivables, and manage billing effortlessly.{' '}
            <button
              type="button"
              onClick={handleOpenStore}
              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline cursor-pointer"
            >
              Discover more features <ArrowRight className="h-3 w-3 inline" />
            </button>
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleExploreSuite}
          className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-8 sm:h-9 px-3.5 gap-1.5 self-start sm:self-auto border-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Explore Suite</span>
        </Button>
      </div>

      {/* Feature Checkpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3.5 pt-3 border-t border-orange-300/80 dark:border-orange-800/60 text-xs">
        <div className="flex items-center gap-2 text-foreground/90 font-medium">
          <CheckCircle2 className="h-4 w-4 fill-orange-500 text-orange-500 [&>path]:text-white [&>path]:fill-none shrink-0" />
          <span>Create &amp; send professional branded invoices in seconds</span>
        </div>

        <div className="flex items-center gap-2 text-foreground/90 font-medium">
          <CheckCircle2 className="h-4 w-4 fill-orange-500 text-orange-500 [&>path]:text-white [&>path]:fill-none shrink-0" />
          <span>Automate recurring invoices &amp; scheduled billing cycles</span>
        </div>

        <div className="flex items-center gap-2 text-foreground/90 font-medium">
          <CheckCircle2 className="h-4 w-4 fill-orange-500 text-orange-500 [&>path]:text-white [&>path]:fill-none shrink-0" />
          <span>Track client payment statuses, dues, and overdue alerts</span>
        </div>

        <div className="flex items-center gap-2 text-foreground/90 font-medium">
          <CheckCircle2 className="h-4 w-4 fill-orange-500 text-orange-500 [&>path]:text-white [&>path]:fill-none shrink-0" />
          <span>Multi-currency support &amp; frictionless digital payments</span>
        </div>
      </div>
    </div>
  );
}
