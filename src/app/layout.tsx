import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import Loader from '@/components/ui/loader';
import { NavigationEvents } from '@/components/ui/navigation-events';
import { POSProvider } from '@/context/pos-context';
import { UserActivityTracker } from '@/components/UserActivityTracker';
import { GlobalAnnouncement } from '@/components/GlobalAnnouncement';
import InstallPrompt from '@/components/pwa/install-prompt';
import { TauriUpdater } from '@/components/TauriUpdater';
import { DesktopTitleBar } from '@/components/desktop/TitleBar';
import { DesktopLauncher } from '@/components/desktop/DesktopLauncher';
import { TauriLayoutWrapper } from '@/components/desktop/TauriWrapper';
import { Analytics } from '@vercel/analytics/react';
import { PWAProvider } from '@/context/pwa-context';
import { SplashScreen } from '@/components/shared/splash-screen';

const siteUrl = 'https://zeneva.space';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Zeneva - Inventory Management and Point of Sale',
  description: 'Never lose a sale. Zeneva unifies inventory, POS, analytics, and customer management into one powerful platform — so you can track every product, capture every opportunity, and maximize every naira.',
  keywords: ['inventory management', 'pos', 'point of sale', 'sales analytics', 'crm', 'business management', 'nigeria', 'retail'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Zeneva - Inventory Management and Point of Sale',
    description: 'Never lose a sale. Zeneva unifies inventory, POS, analytics, and customer management into one powerful platform ',
    url: siteUrl,
    siteName: 'Zeneva',
    images: [
      {
        url: 'https://i.ibb.co/Z69q8yJD/20260215-0958-Image-Generation-remix-01khg89f7jf59sbf395x7pw9k0.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Zeneva - Inventory Management and POS',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva - Inventory Management and Point of Sale',
    description: 'Never lose a sale. Zeneva unifies inventory, POS, analytics, and customer management into one powerful platform',
    images: [`https://i.ibb.co/Z69q8yJD/20260215-0958-Image-Generation-remix-01khg89f7jf59sbf395x7pw9k0.png`],
  },
  alternates: {
    canonical: siteUrl,
  }
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Zeneva',
      url: siteUrl,
      logo: 'https://i.ibb.co/Z69q8yJD/20260215-0958-Image-Generation-remix-01khg89f7jf59sbf395x7pw9k0.png',
      sameAs: [
        'https://x.com/zeneva_retail',
        'https://www.instagram.com/zeneva_pos/',
        'https://www.tiktok.com/@zeneva_retail',
        'https://www.youtube.com/@ZenevaPos'
      ]
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Zeneva',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'NGN'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '124'
      }
    },
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': siteUrl
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'About',
          'item': `${siteUrl}/about`
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': 'Blog',
          'item': `${siteUrl}/blog`
        },
        {
          '@type': 'ListItem',
          'position': 4,
          'name': 'Download',
          'item': `${siteUrl}/download`
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" prefix="og: http://ogp.me/ns#" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="QGYrHkSlC71065ymk6dZc6DFesm14JeSPw-myjzZVso" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
      </head>
      <body className={cn('font-body antialiased bg-background text-foreground')}>
        <SplashScreen />
        <FirebaseClientProvider>
          <PWAProvider>
            <UserActivityTracker />
            <GlobalAnnouncement />
            <Loader />
            <InstallPrompt />
            <TauriUpdater />
            <DesktopLauncher />
            <POSProvider>
              <TauriLayoutWrapper>
                 <DesktopTitleBar />
                 <Suspense>
                   <NavigationEvents />
                 </Suspense>
                 {children}
              </TauriLayoutWrapper>
            </POSProvider>
          </PWAProvider>
        </FirebaseClientProvider>
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
