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
import { Bot, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';

export default function BusinessHealthIndicator() {
  const { business, isLoading } = usePOS();

  if (isLoading) {
    return <Skeleton className="h-10 w-48 rounded-lg" />;
  }

  const healthData = business?.settings?.businessAnalysis?.businessHealth;

  if (!healthData) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/ai-insights" className="flex items-center gap-1.5 sm:gap-2 border rounded-lg p-1.5 sm:p-2 hover:bg-muted cursor-pointer transition-colors w-auto sm:w-48 shrink-0">
              <div className="w-full">
                <div className="text-xs sm:text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                  <Bot className="h-4 w-4 text-primary shrink-0" />
                  <span className="hidden sm:inline">Zen AI Briefing</span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center hidden sm:block">Click to view insights</p>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-xs">
            <p className="font-semibold mb-1">AI Executive Briefing</p>
            <p className="text-sm text-muted-foreground">Generate your first AI report to see your Business Health Score.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const { score, status } = healthData;
  const getStatusColor = () => {
    if (status === 'Healthy') return 'text-green-600';
    if (status === 'Needs Attention') return 'text-amber-600';
    if (status === 'At Risk') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getProgressColor = () => {
    if (status === 'Healthy') return 'bg-green-500';
    if (status === 'Needs Attention') return 'bg-amber-500';
    if (status === 'At Risk') return 'bg-destructive';
    return 'bg-primary';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/ai-insights" className="flex items-center gap-1.5 sm:gap-3 border rounded-lg p-1.5 sm:p-2 hover:bg-muted cursor-pointer transition-colors w-auto sm:w-48 shrink-0">
            <div className="text-lg sm:text-2xl font-bold px-1 sm:px-0">{score}</div>
            <div className="w-full hidden sm:block">
              {/* <p className={`font-semibold text-sm ${getStatusColor()}`}>{status}</p> */}
              <p className="text-xs text-muted-foreground">Business Health</p>
              <Progress value={score} className="h-1 mt-1" indicatorClassName={getProgressColor()} />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs">
          <p className="font-semibold">Business Health Score: {score}/100</p>
          <p className="text-sm text-muted-foreground">{healthData.summary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
