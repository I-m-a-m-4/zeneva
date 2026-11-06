'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The single error surface for the whole app. Every boundary (the class
 * boundary in the app shell, `app/error.tsx`, the uncaught-error catcher and
 * the pre-hydration fallback) renders this same card, so a crash looks the
 * same regardless of where it happened.
 */

export const DEFAULT_ERROR_TITLE = 'Something went wrong';
export const DEFAULT_ERROR_DESCRIPTION =
  "We've automatically logged this issue and our team will investigate it. Please try refreshing the page or navigating back.";

interface ErrorScreenProps {
  title?: string;
  description?: string;
  errorId?: string;
  /** Render as a full viewport page instead of an in-shell card. */
  fullPage?: boolean;
  /** Shown as a secondary action when the caller can recover without a reload. */
  onRetry?: () => void;
  className?: string;
}

export function ErrorScreen({
  title = DEFAULT_ERROR_TITLE,
  description = DEFAULT_ERROR_DESCRIPTION,
  errorId,
  fullPage = false,
  onRetry,
  className,
}: ErrorScreenProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        fullPage
          ? 'min-h-screen w-full bg-background p-6'
          : 'm-4 h-full min-h-[400px] w-full rounded-lg border border-dashed bg-background p-8',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2
        className={cn(
          'mb-2 font-bold text-foreground',
          fullPage ? 'text-3xl tracking-tight' : 'text-xl'
        )}
      >
        {title}
      </h2>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 bg-[#ea580c] text-white shadow-md hover:bg-[#ea580c]/90"
          size={fullPage ? 'lg' : 'default'}
        >
          <RefreshCcw className="h-4 w-4" />
          Reload Page
        </Button>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2"
            size={fullPage ? 'lg' : 'default'}
          >
            Try again
          </Button>
        )}
      </div>
      {errorId && (
        <p className="mt-6 text-xs text-muted-foreground opacity-60">
          Error ID: {errorId}
        </p>
      )}
    </div>
  );
}
