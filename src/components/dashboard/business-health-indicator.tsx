
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePOS } from '@/context/pos-context';
import type { BusinessAnalysis } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress";

export default function BusinessHealthIndicator() {
  const { business } = usePOS();
  const analysis: BusinessAnalysis | undefined = business?.settings?.businessAnalysis;

  const score = analysis?.health?.score ?? 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/ai-insights">
            <div className="flex items-center gap-2 border rounded-md p-2 hover:bg-muted cursor-pointer transition-colors w-48">
              <div className="w-full">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span>Business Health</span>
                  <span>{analysis ? `${score}%` : '--%'}</span>
                </div>
                <Progress value={score} className="h-1 mt-1" />
              </div>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
            {analysis ? (
                 <div>
                    <p className="font-semibold mb-1">Business Health: {score}%</p>
                    <p className="text-sm text-muted-foreground">Click to view detailed insights.</p>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Generate an analysis to see your score.</p>
            )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

    