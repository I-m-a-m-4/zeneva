
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ImageManager } from '@/lib/image-manager';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

/**
 * A wrapper around standard <img> that automatically caches
 * the source image locally for offline access.
 *
 * URLs whose host is unreachable are skipped for a while (see
 * ImageManager) instead of being handed to the webview, which would stall
 * the layout and spam the console with connection timeouts for every
 * broken product photo.
 */
export function CachedImage({ src, className, alt, fallback, ...props }: CachedImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setSkipped(true);
      return;
    }

    // Known-dead host: skip straight to the placeholder, no fetch attempt.
    if (ImageManager.isKnownUnreachable(src)) {
      setLoading(false);
      setSkipped(true);
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(false);
      setSkipped(false);

      try {
        const localUri = await ImageManager.getLocalUri(src as string);
        if (isMounted) {
          setDisplaySrc(localUri);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
    if (src) ImageManager.markUnreachable(src);
  }, [src]);

  if (loading) {
    return <Skeleton className={cn("w-full h-full bg-muted/50 rounded-lg", className)} />;
  }

  if (error || skipped || !displaySrc) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)}>
        {fallback ?? <ImageOff className="h-5 w-5 text-muted-foreground/50" />}
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      className={cn("transition-opacity duration-300", loading ? "opacity-0" : "opacity-100", className)}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
}
