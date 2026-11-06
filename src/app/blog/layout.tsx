import { Metadata } from 'next';

const blogTitle = 'Blog - Retail Operations, Inventory & POS Insights | Zeneva';
const blogDescription = 'Guides on retail operations, inventory control, POS systems and profit in Nigeria — from the team building Zeneva, the offline-first retail OS.';

export const metadata: Metadata = {
  // Absolute so the root `%s | Zeneva` template does not append a second brand
  // and push the title past the ~60-character SERP cut-off.
  title: { absolute: blogTitle },
  description: blogDescription,
  keywords: [
    'retail case studies nigeria',
    'how to manage boutique inventory',
    'pos system tutorials',
    'business growth tactics for mini-marts',
    'reducing inventory shrinkage',
    'zeneva retail insights',
    'offline point of sale guide',
    'multi-currency retail billing'
  ],
  alternates: {
    canonical: '/blog'
  },
  openGraph: {
    title: blogTitle,
    description: blogDescription,
    url: '/blog',
    siteName: 'Zeneva',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/zeneva-blog-hero.webp',
        width: 1535,
        height: 1024,
        alt: 'Zeneva Retail Insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: blogTitle,
    description: blogDescription,
    images: ['/zeneva-blog-hero.webp'],
  },
};

import { Bricolage_Grotesque, Inter } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ 
  subsets: ['latin'], 
  variable: '--font-bricolage',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${bricolage.variable} ${inter.variable} blog-layout`}>{children}</div>;
}
