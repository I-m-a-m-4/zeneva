
'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    DodoPaymentsCheckout?: {
      DodoPayments: {
        Initialize: (config: {
          mode: 'test' | 'live';
          displayType: 'overlay' | 'inline';
          onEvent?: (event: any) => void;
        }) => void;
        Checkout: {
          open: (config: { checkoutUrl: string }) => void;
        };
      };
    };
  }
}

export default function useDodoPayments() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.DodoPaymentsCheckout) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js';
    script.async = true;
    script.id = 'dodo-payments-sdk';
    
    script.onload = () => {
      setIsScriptLoaded(true);
      // Initialize with default settings
      if (window.DodoPaymentsCheckout) {
        window.DodoPaymentsCheckout.DodoPayments.Initialize({
          mode: process.env.NEXT_PUBLIC_DODO_MODE === 'live' ? 'live' : 'test',
          displayType: 'overlay'
        });
      }
    };

    script.onerror = () => {
      console.error('Dodo Payments SDK failed to load.');
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove script to avoid re-loading issues
    };
  }, []);

  const initializeCheckout = useCallback((checkoutUrl: string) => {
    if (!isScriptLoaded || !window.DodoPaymentsCheckout) {
      console.error('Dodo Payments SDK not loaded yet.');
      return;
    }

    window.DodoPaymentsCheckout.DodoPayments.Checkout.open({
      checkoutUrl
    });
  }, [isScriptLoaded]);

  return { isScriptLoaded, initializeCheckout };
}
