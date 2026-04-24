
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

// Define the shape of the config object Paystack's `setup` method expects
interface PaystackSetupConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  reference?: string;
  subaccount?: string;
  callback: (transaction: any) => void;
  onClose: () => void;
  [key: string]: any; // Allow other properties
}

// Define the shape of the config object our hook's `initializePayment` function accepts
interface PaystackHookConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  reference?: string;
  subaccount?: string;
  onSuccess: (transaction: any) => void;
  onClose: () => void;
  [key: string]: any; // Allow other properties
}

// Define the shape of the PaystackPop object on the window
interface PaystackPop {
  setup(config: PaystackSetupConfig): {
    openIframe(): void;
  };
}

// Add the PaystackPop object to the window interface
declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

const SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';
const SCRIPT_ID = 'paystack-sdk';

// Use a module-level promise to ensure the script is only loaded once.
let scriptPromise: Promise<void> | null = null;

const usePaystack = () => {
  const { toast } = useToast();
  const [isSdkReady, setIsSdkReady] = useState(false);

  useEffect(() => {
    // Check if the script is already loaded by checking the window object.
    if (window.PaystackPop) {
      setIsSdkReady(true);
      return;
    }
    
    // If the script is not loaded, but the promise exists, it means it's currently loading.
    if (scriptPromise) {
      scriptPromise.then(() => {
        setIsSdkReady(true);
      }).catch(() => {
        setIsSdkReady(false);
      });
      return;
    }

    // If there's no script and no promise, this is the first time we're loading it.
    scriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(SCRIPT_ID);
        if (existingScript) {
             // If another instance of this hook added the script but it hasn't loaded yet,
            // we can just listen to its load/error events.
            existingScript.addEventListener('load', () => {
                setIsSdkReady(true);
                resolve();
            });
            existingScript.addEventListener('error', (e) => {
                console.error('Paystack SDK failed to load.', e);
                toast({
                    variant: 'destructive',
                    title: 'Payment Gateway Error',
                    description: 'Could not load the payment script. Please check your internet connection and disable any ad-blockers, then try again.',
                    duration: 10000
                });
                scriptPromise = null;
                document.getElementById(SCRIPT_ID)?.remove();
                reject(new Error('Paystack SDK failed to load.'));
            });
            return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_URL;
        script.async = true;

        script.onload = () => {
            setIsSdkReady(true);
            resolve();
        };

        script.onerror = (e) => {
            console.error('Paystack SDK failed to load.', e);
            toast({
                variant: 'destructive',
                title: 'Payment Gateway Error',
                description: 'Could not load the payment script. Please check your internet connection and disable any ad-blockers, then try again.',
                duration: 10000
            });
            scriptPromise = null;
            document.getElementById(SCRIPT_ID)?.remove();
            reject(new Error('Paystack SDK failed to load.'));
        };

        document.body.appendChild(script);
    });

  }, [toast]);

  const initializePayment = useCallback((config: PaystackHookConfig) => {
    if (!isSdkReady || !window.PaystackPop) {
      console.error('Paystack SDK is not ready yet.');
      toast({
          variant: 'destructive',
          title: 'Payment Gateway Not Ready',
          description: 'The payment gateway is still loading. Please wait a moment and try again.'
      });
      return;
    }
    
    // Build the config object for Paystack, including the subaccount
    const paystackConfig: PaystackSetupConfig = {
      key: config.key,
      email: config.email,
      amount: config.amount,
      currency: config.currency || 'NGN',
      ref: config.reference || config.ref,
      subaccount: config.subaccount,
      metadata: config.metadata || {},
      callback: (transaction: any) => {
        if (config.onSuccess && typeof config.onSuccess === 'function') {
          config.onSuccess(transaction);
        }
      },
      onClose: () => {
        if (config.onClose && typeof config.onClose === 'function') {
          config.onClose();
        }
      },
    };

    try {
        console.log('Initializing Paystack payment...', { 
            key: config.key?.substring(0, 8) + '...', 
            email: config.email, 
            amount: config.amount,
            currency: paystackConfig.currency
        });
        const handler = window.PaystackPop.setup(paystackConfig);
        handler.openIframe();
    } catch (error) {
        console.error('Error in Paystack setup:', error);
        toast({
            variant: 'destructive',
            title: 'Payment Error',
            description: 'Failed to initialize payment window. Please check your internet connection and try again.'
        });
    }

  }, [isSdkReady, toast]);

  return { initializePayment, isScriptLoaded: isSdkReady };
};

export default usePaystack;
