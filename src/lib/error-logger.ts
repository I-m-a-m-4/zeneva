import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';

// Prevent spam: Max 5 errors per session
let errorCount = 0;
const MAX_ERRORS_PER_SESSION = 5;

interface ErrorLogPayload {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  businessId?: string;
  type: 'react' | 'window' | 'unhandledrejection' | 'api';
  createdAt?: any;
}

export const logErrorToFirestore = async (
  error: Error,
  type: ErrorLogPayload['type'],
  context?: { userId?: string; businessId?: string }
) => {
  if (typeof window === 'undefined') return; // Do not log server-side errors to this client collection
  if (errorCount >= MAX_ERRORS_PER_SESSION) return;

  // Filter out benign or expected errors — network noise, Firestore internals, browser quirks
  const errorMsg = error.message || String(error);
  const errorStack = error.stack || '';

  const NOISE_PATTERNS = [
    // Permissions (handled separately)
    'Missing or insufficient permissions',
    'permission-denied',
    // Network connectivity noise
    'network error',
    'Failed to fetch',
    'ERR_CONNECTION_CLOSED',
    'ERR_CONNECTION_REFUSED',
    'ERR_NETWORK_CHANGED',
    'ERR_INTERNET_DISCONNECTED',
    'net::ERR_',
    // Firestore internal transport errors
    'webchannel',
    'firestore.googleapis.com',
    'Listen/channel',
    'Bad Request',
    '400',
    // Font / favicon / CDN noise
    'fonts.googleapis.com',
    'favicon.ico',
    '404 (Not Found)',
    // React dev mode noise
    'Fast Refresh',
    // Generic offline noise
    'Failed to load resource',
    // Admin cyber-shield — intentionally caught & handled errors
    'Entity not found in current grid',
    'Termination failed',
    'Termination aborted',
  ];

  if (NOISE_PATTERNS.some(p => errorMsg.includes(p) || errorStack.includes(p))) {
    return;
  }

  errorCount++;

  try {
    const payload: ErrorLogPayload = {
      message: errorMsg,
      stack: error.stack || 'No stack trace available',
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context?.userId || 'unknown',
      businessId: context?.businessId || 'unknown',
      type,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(firestore, 'error_logs'), payload);
  } catch (err) {
    // Silently fail if logging fails (to prevent infinite error loops)
    console.error('Failed to log error to Firestore:', err);
  }
};
