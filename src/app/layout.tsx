import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import Loader from '@/components/ui/loader';
import { NavigationEvents } from '@/components/ui/navigation-events';
import { POSProvider } from '@/context/pos-context';
import { Inter, Plus_Jakarta_Sans, Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google';
import { ConsoleBanner } from '@/components/console-banner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const instrumentSerif = Instrument_Serif({ weight: "400", subsets: ['latin'], variable: '--font-instrument' });

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
        url: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&h=630&fit=crop',
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
    images: [`https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&h=630&fit=crop`],
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.variable,
        plusJakarta.variable,
        bricolage.variable,
        dmSans.variable,
        instrumentSerif.variable
      )}>
        <FirebaseClientProvider>
          <POSProvider>
            <ConsoleBanner />
            <Loader />
            <Suspense>
              <NavigationEvents />
            </Suspense>
            {children}
            <Toaster />
          </POSProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
