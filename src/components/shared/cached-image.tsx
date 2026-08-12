
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
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(src || undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }

    setError(false);
    setUseFallbackUrl(false);
    setDisplaySrc(src);

    let isMounted = true;

    async function load() {
      if (ImageManager.isKnownUnreachable(src as string)) {
        return;
      }

      try {
        const localUri = await ImageManager.getLocalUri(src as string);
        if (isMounted && localUri) {
          setDisplaySrc(localUri);
        }
      } catch (err) {
        // Local cache resolution failed; keep using the original raw src URL.
        if (isMounted) {
          setDisplaySrc(src);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleError = useCallback(() => {
    if (!useFallbackUrl && displaySrc !== src && src) {
      // If the local cached URI failed to load, fallback to the original HTTP src URL
      setUseFallbackUrl(true);
      setDisplaySrc(src);
    } else {
      // Both local cache and raw src failed
      setError(true);
      if (src) ImageManager.markUnreachable(src);
    }
  }, [src, displaySrc, useFallbackUrl]);

  if (!src || error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg w-full h-full", className)}>
        {fallback ?? <ImageOff className="h-5 w-5 text-muted-foreground/50" />}
      </div>
    );
  }

  return (
    <img
      src={displaySrc || src}
      className={cn("transition-opacity duration-300", className)}
      alt={alt || ''}
      onError={handleError}
      {...props}
    />
  );
}
