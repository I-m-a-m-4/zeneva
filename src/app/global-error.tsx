'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Error Caught:', error);

    if (error.name === 'ChunkLoadError' || error.message?.includes('ChunkLoadError')) {
      console.warn('ChunkLoadError detected in root boundary, reloading...');
      window.location.reload();
    }
  }, [error]);

  // Replaces the whole document, so no app providers or shared UI are available.
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              An unexpected error occurred while loading the application.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#111',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => reset()}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #ccc',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '2rem' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
