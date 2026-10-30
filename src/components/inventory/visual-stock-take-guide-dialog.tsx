'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Camera,
  Sparkles,
  Layers,
  ArrowRight,
  Focus,
} from 'lucide-react';

interface VisualStockTakeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
}

export function VisualStockTakeGuideDialog({
  open,
  onOpenChange,
  productName,
}: VisualStockTakeGuideProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zeneva_seen_stocktake_guide', 'true');
      if (dontShowAgain) {
        localStorage.setItem('zeneva_never_show_stocktake_guide', 'true');
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md w-[92vw] p-0 overflow-hidden bg-background border shadow-2xl z-50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 pb-2 bg-gradient-to-b from-orange-500/10 to-transparent border-b">
          <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Quick Camera Guide
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
            Visual Stock Take
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Point camera at physical units to count instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3.5">
          {/* Animated Interactive Phone Demo */}
          <div className="relative mx-auto w-full max-w-[300px] h-36 rounded-xl bg-slate-950 p-2 shadow-inner border border-slate-800 overflow-hidden flex flex-col justify-between">
            {/* Viewfinder Header */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 z-10 px-1">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live Vision Active
              </span>
              <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[8px] text-slate-300">1.0x</span>
            </div>

            {/* Simulated Shelf with 6 product units */}
            <div className="relative flex-1 grid grid-cols-3 grid-rows-2 gap-1.5 p-1 items-center justify-center my-0.5">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <motion.div
                  key={num}
                  initial={{ opacity: 0.7, scale: 0.95 }}
                  animate={{
                    opacity: [0.7, 1, 0.7],
                    scale: [0.95, 1, 0.95],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: num * 0.12,
                    ease: 'easeInOut',
                  }}
                  className="relative h-9 rounded-md bg-gradient-to-br from-orange-400/20 to-orange-600/30 border border-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.2)] flex items-center justify-center"
                >
                  <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-emerald-400" />
                  <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-emerald-400" />
                  <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-emerald-400" />
                  <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-emerald-400" />

                  <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[8px] font-bold flex items-center justify-center shadow">
                    {num}
                  </span>
                  <span className="text-[9px] font-medium text-orange-200 truncate">Unit</span>
                </motion.div>
              ))}

              {/* Animated laser scanning line */}
              <motion.div
                initial={{ top: '5%' }}
                animate={{ top: ['5%', '90%', '5%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-1.5 right-1.5 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_6px_#34d399] pointer-events-none z-20"
              />
            </div>

            <div className="text-center text-[9px] text-slate-400 font-mono py-0.5 bg-slate-900/60 rounded backdrop-blur-sm z-10">
              6 matching units detected (98% confidence)
            </div>
          </div>

          {/* 3 Punchy Tips */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border">
              <Focus className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-foreground">
                <strong>Frame directly:</strong> Point camera straight at the shelf or open carton.
              </span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border">
              <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-foreground">
                <strong>Single product:</strong> Keep only units of this item in view.
              </span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-foreground">
                <strong>Tap to edit:</strong> Tap photo to add/remove boxes or use AI Double-Check.
              </span>
            </div>
          </div>

          {/* Do not show again checkbox */}
          <div className="flex items-center gap-2 pt-0.5 px-0.5">
            <Checkbox
              id="dontShowGuideAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
            />
            <label
              htmlFor="dontShowGuideAgain"
              className="text-[11px] text-muted-foreground cursor-pointer select-none"
            >
              Don’t show this tip automatically next time
            </label>
          </div>
        </div>

        <DialogFooter className="p-3 bg-muted/20 border-t flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleDismiss}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 h-8 text-xs gap-1.5"
          >
            <span>Start Counting</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
