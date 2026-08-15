
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
  // If the user pasted multiple URLs separated by commas, only use the first one.
  // IMPORTANT: data: URIs contain a comma as part of their format (e.g. "data:image/svg+xml;base64,PHN2...")
  // so we must NOT split them. Only split plain http/https URLs.
  const sanitizedSrc = typeof src === 'string' && !src.startsWith('data:') && !src.startsWith('blob:') && src.includes(',')
    ? src.split(',')[0].trim()
    : src;

  const [displaySrc, setDisplaySrc] = useState<string | undefined>(sanitizedSrc || undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);

  useEffect(() => {
    if (!sanitizedSrc) {
      setError(true);
      return;
    }

    setError(false);
    setUseFallbackUrl(false);
    setDisplaySrc(sanitizedSrc);

    // data: and blob: URIs are self-contained — no network fetch needed
    if (sanitizedSrc.startsWith('data:') || sanitizedSrc.startsWith('blob:')) {
      return;
    }

    let isMounted = true;

    async function load() {
      if (ImageManager.isKnownUnreachable(sanitizedSrc as string)) {
        return;
      }

      try {
        const localUri = await ImageManager.getLocalUri(sanitizedSrc as string);
        if (isMounted && localUri) {
          setDisplaySrc(localUri);
        }
      } catch (err) {
        // Local cache resolution failed; keep using the original raw src URL.
        if (isMounted) {
          setDisplaySrc(sanitizedSrc);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [sanitizedSrc]);

  const handleError = useCallback(() => {
    if (!useFallbackUrl && displaySrc !== sanitizedSrc && sanitizedSrc) {
      // If the local cached URI failed to load, fallback to the original HTTP src URL
      setUseFallbackUrl(true);
      setDisplaySrc(sanitizedSrc);
    } else {
      // Both local cache and raw src failed
      setError(true);
      if (sanitizedSrc) ImageManager.markUnreachable(sanitizedSrc);
    }
  }, [sanitizedSrc, displaySrc, useFallbackUrl]);

  if (!sanitizedSrc || error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg w-full h-full", className)}>
        {fallback ?? <ImageOff className="h-5 w-5 text-muted-foreground/50" />}
      </div>
    );
  }

  return (
    <img
      src={displaySrc || sanitizedSrc}
      className={cn("transition-opacity duration-300", className)}
      alt={alt || ''}
      onError={handleError}
      {...props}
    />
  );
}
