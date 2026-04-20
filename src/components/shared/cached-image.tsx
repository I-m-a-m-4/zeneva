
'use client';

import React, { useState, useEffect } from 'react';
import { ImageManager } from '@/lib/image-manager';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

/**
 * A wrapper around standard <img> that automatically caches
 * the source image locally for offline access.
 */
export function CachedImage({ src, className, alt, fallback, ...props }: CachedImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(false);
      
      try {
        const localUri = await ImageManager.getLocalUri(src as string);
        if (isMounted) {
          setDisplaySrc(localUri);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setDisplaySrc(src); // Fallback to raw URL
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (loading) {
    return <Skeleton className={cn("w-full h-full bg-muted/50 rounded-lg", className)} />;
  }

  if (error || !displaySrc) {
    return <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)}>{fallback}</div>;
  }

  return (
    <img 
      src={displaySrc} 
      className={cn("transition-opacity duration-300", loading ? "opacity-0" : "opacity-100", className)} 
      alt={alt}
      onError={() => setError(true)}
      {...props} 
    />
  );
}
