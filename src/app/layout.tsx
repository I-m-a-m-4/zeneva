import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import Loader from '@/components/ui/loader';
import { NavigationEvents } from '@/components/ui/navigation-events';
import { POSProvider } from '@/context/pos-context';

const siteUrl = 'https://zeneva.vercel.app';

import InstallPrompt from '@/components/pwa/install-prompt';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Zeneva - Inventory Management and Point of Sale',
  description: 'The all-in-one platform for inventory management, sales analytics, and customer relationships. Streamline your inventory and maximize your profit.',
  keywords: ['inventory management', 'pos', 'point of sale', 'sales analytics', 'crm', 'business management', 'nigeria', 'retail'],
  manifest: '/manifest.json',
  openGraph: {
    title: 'Zeneva - Inventory Management and Point of Sale',
    description: 'The all-in-one platform for inventory management, sales analytics, and customer relationships.',
    url: siteUrl,
    siteName: 'Zeneva',
    images: [
      {
        url: '/maxima.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva - Inventory Management and Point of Sale',
    description: 'The all-in-one platform for inventory management, sales analytics, and customer relationships.',
    images: [`/maxima.png`],
  },
};


import { PWAProvider } from '@/context/pwa-context';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="WGdoPB1C5sq9ITs96lwQAtR1DRpLwcKfDCN9-taB9e8" />
        <link rel="icon" href="data:image/svg+xml,%3csvg width='400' height='400' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3e%3crect x='10' y='10' width='180' height='180' rx='24' ry='24' fill='%23F97316' /%3e%3cg transform='translate(-30, -30) scale(1.3)'%3e%3cpath d='M 100 55 A 35 35 0 1 0 100 125 A 35 35 0 1 0 100 55 Z M 100 63 A 27 27 0 1 1 100 117 A 27 27 0 1 1 100 63 Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='6' /%3e%3cpath d='M 60 127 Q 100 154 140 127 Q 100 142 60 127 Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='6' /%3e%3c/g%3e%3c/svg%3e" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <FirebaseClientProvider>
          <PWAProvider>
            <POSProvider>
              <Loader />
              <InstallPrompt />
              <Suspense>
                <NavigationEvents />
              </Suspense>
              {children}
            </POSProvider>
          </PWAProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
