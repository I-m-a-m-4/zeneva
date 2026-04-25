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
import { ChunkErrorListener } from '@/components/shared/chunk-error-listener';

import { ThemeProvider } from '@/components/theme-provider';

const siteUrl = 'https://zeneva.space';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Zeneva - Advanced Inventory Management & Global POS Operating System',
    template: '%s | Zeneva'
  },
  description: 'Zeneva is a borderless retail operating system that unifies inventory management, multi-store POS, analytics, and USD/NGN payments into one powerful platform. Built for modern retailers scaling globally.',
  keywords: [
    'inventory management software', 
    'retail pos system', 
    'cloud pos nigeria', 
    'multi-currency billing', 
    'usd payment gateway for retail', 
    'pharmacy inventory software', 
    'boutique management system', 
    'business analytics dashboard', 
    'global retail OS'
  ],
  applicationName: 'Zeneva',
  authors: [{ name: 'Zeneva Team' }],
  generator: 'Next.js',
  publisher: 'Zeneva',
  referrer: 'origin-when-cross-origin',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zeneva',
  },
  openGraph: {
    title: 'Zeneva - Advanced Inventory Management & Global POS',
    description: 'Track every product, capture every sale, and scale globally. Zeneva unifies inventory, analytics, and multi-currency payments for the modern retailer.',
    url: siteUrl,
    siteName: 'Zeneva',
    images: [
      {
        url: `${siteUrl}/zeneva-platform.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Zeneva Retail Operating System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva - Global Retail OS & POS Platform',
    description: 'Transform your retail operations with Zeneva. Inventory, analytics, and global payments in one unified platform.',
    images: [`${siteUrl}/zeneva-platform.png`],
    creator: '@zeneva_retail',
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
      logo: `${siteUrl}/zeneva-platform.png`,
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
      operatingSystem: 'Web, Android, iOS, Windows, macOS, Linux',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'NGN',
        description: 'Starter plan is free forever. Paid plans start at ₦10,000/month.'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '156'
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
          'name': 'Pricing',
          'item': `${siteUrl}/pricing`
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': 'Download',
          'item': `${siteUrl}/download`
        },
        {
          '@type': 'ListItem',
          'position': 4,
          'name': 'Blog',
          'item': `${siteUrl}/blog`
        },
        {
          '@type': 'ListItem',
          'position': 5,
          'name': 'Contact',
          'item': `${siteUrl}/contact`
        },
        {
          '@type': 'ListItem',
          'position': 6,
          'name': 'Help Center',
          'item': `${siteUrl}/help-center`
        },
        {
          '@type': 'ListItem',
          'position': 7,
          'name': 'Our Mission',
          'item': `${siteUrl}/about/our-mission`
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
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

  return (
    <html lang="en" prefix="og: http://ogp.me/ns#" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="QGYrHkSlC71065ymk6dZc6DFesm14JeSPw-myjzZVso" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
      </head>
      <body className={cn('font-body antialiased bg-background text-foreground')} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SplashScreen />
          <ChunkErrorListener />
          <FirebaseClientProvider>
            <PWAProvider>
              <UserActivityTracker />
              <GlobalAnnouncement />
              <Loader />
              <InstallPrompt />
              <TauriUpdater />
              <POSProvider>
                <TauriLayoutWrapper>
                   <DesktopTitleBar />
                   <DesktopLauncher />
                   <Suspense>
                     <NavigationEvents />
                   </Suspense>
                   {children}
                </TauriLayoutWrapper>
              </POSProvider>
            </PWAProvider>
          </FirebaseClientProvider>
          {!isTauri && <Analytics />}
        </ThemeProvider>
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
