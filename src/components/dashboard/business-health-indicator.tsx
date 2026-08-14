'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePOS } from '@/context/pos-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';

export default function BusinessHealthIndicator() {
  const { business, isLoading } = usePOS();

  if (isLoading) {
    return <Skeleton className="h-10 w-48 rounded-lg" />;
  }

  const healthData = business?.settings?.businessAnalysis?.businessHealth;
  const score = healthData?.score ?? 0;
  const summary = healthData?.summary || (score === 0 ? "You need to add products and log transactions to generate your first AI rating." : "Generate your first AI report to see your Business Health and rating.");

  // Determine grade rating based on score
  const getRatingGrade = (val?: number) => {
    if (val === undefined || val === null) return '--';
    if (val === 0) return 'N/A';
    if (val >= 90) return 'A+';
    if (val >= 80) return 'A';
    if (val >= 70) return 'B';
    if (val >= 60) return 'C';
    if (val >= 50) return 'D';
    return 'F';
  };

  const getStatusColor = (val?: number) => {
    if (val === undefined || val === 0) return 'text-muted-foreground';
    if (val >= 80) return 'text-green-500';
    if (val >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getProgressColor = (val?: number) => {
    if (val === undefined || val === 0) return 'bg-muted';
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const ratingGrade = getRatingGrade(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/ai-insights" className="flex items-center gap-1.5 sm:gap-2.5 border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent rounded-lg h-9 px-2 hover:bg-muted cursor-pointer transition-all duration-300 w-auto sm:w-44 shrink-0 shadow-sm hover:shadow">
            <div className={cn("text-xs sm:text-sm font-black rounded bg-muted/50 border border-border/50 flex items-center justify-center w-7 h-6 shrink-0", getStatusColor(score))}>
              {score !== undefined ? score : '--'}
            </div>
            <div className="w-full hidden sm:block text-left leading-none">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-foreground truncate">Business Rating</span>
                {score !== undefined ? (
                  <span className={cn("text-[9px] font-extrabold uppercase px-1 rounded bg-muted border border-border/40", getStatusColor(score))}>
                    {ratingGrade}
                  </span>
                ) : (
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 animate-pulse shrink-0" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                {score !== undefined ? (
                  <Progress value={score} className="h-0.5 flex-1" indicatorClassName={getProgressColor(score)} />
                ) : (
                  <span className="text-[9px] text-amber-500 font-medium animate-pulse">Run AI Scan</span>
                )}
              </div>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
          <p className="font-semibold text-sm mb-1 flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            {score !== undefined ? `Rating: ${ratingGrade} (${score}/100)` : 'Zen AI Rating'}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
