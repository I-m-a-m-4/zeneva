
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import Loader from '@/components/ui/loader';
import { Suspense } from 'react';
import { NavigationEvents } from '@/components/ui/navigation-events';

const siteUrl = 'https://zeneva.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Zeneva - Inventory Management and Point of Sale',
  description: 'The all-in-one platform for inventory management, sales analytics, and customer relationships. Streamline your inventory and maximize your profit.',
  keywords: ['inventory management', 'pos', 'point of sale', 'sales analytics', 'crm', 'business management', 'nigeria', 'retail'],
  openGraph: {
    title: 'Zeneva - Inventory Management and Point of Sale',
    description: 'The all-in-one platform for inventory management, sales analytics, and customer relationships.',
    url: siteUrl,
    siteName: 'Zeneva',
    images: [
      {
        url: 'https://i.ibb.co/xtzYTDjP/Group-176.png',
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
    images: [`https://i.ibb.co/xtzYTDjP/Group-176.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://i.ibb.co/N29B5tzr/Group-174.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <FirebaseClientProvider>
          <Loader />
          <Suspense fallback={null}>
            <NavigationEvents />
          </Suspense>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
