'use client';

import * as React from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePOS } from '@/context/pos-context';

let posthogInitialized = false;

function initPostHog() {
  if (posthogInitialized || typeof window === 'undefined') return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || 'phc_sCh7vv7ptLAQm9SNXYmPZ73Pjp3eaMtSUTspRtffbnjn';
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[PostHog] Project token not configured, telemetry is inactive.');
    }
    return;
  }

  try {
    posthog.init(token, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // captured manually via PostHogPageView to support SPA Next.js routing
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '.sensitive-data',
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Initialized successfully with session replay.');
        }
      },
    });
    posthogInitialized = true;
  } catch (err) {
    console.warn('[PostHog] Failed to initialize:', err);
  }
}

/**
 * Tracks route changes in Next.js App Router for PostHog analytics.
 */
function PostHogPageViewContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (pathname && posthogInitialized) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView() {
  return (
    <React.Suspense fallback={null}>
      <PostHogPageViewContent />
    </React.Suspense>
  );
}

/**
 * Automatically associates the PostHog session and recording with the logged-in
 * merchant profile, business name, and role.
 */
export function PostHogUserIdentify() {
  const { user, business, currentUserProfile } = usePOS();
  const identifiedUserIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!posthogInitialized) return;

    if (user?.uid) {
      if (identifiedUserIdRef.current !== user.uid) {
        identifiedUserIdRef.current = user.uid;
        posthog.identify(user.uid, {
          email: user.email || undefined,
          name: currentUserProfile?.name || user.displayName || undefined,
          businessId: business?.id || undefined,
          businessName: business?.name || undefined,
          role: currentUserProfile?.role || undefined,
          subscriptionTier: business?.subscription?.tier || 'free',
        });
      }
    } else {
      if (identifiedUserIdRef.current) {
        identifiedUserIdRef.current = null;
        posthog.reset();
      }
    }
  }, [user?.uid, user?.email, user?.displayName, business?.id, business?.name, currentUserProfile?.name, currentUserProfile?.role, business?.subscription?.tier]);

  return null;
}

/**
 * Root PostHog Provider wrapping the application.
 */
export function PostHogClientProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    initPostHog();
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}
