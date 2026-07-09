import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Retail Insights & Business Growth | Zeneva',
  description: 'Stay updated with the latest retail trends, inventory management tips, and success stories from the Zeneva community. Expert advice for Nigerian businesses.',
  alternates: {
    canonical: '/blog'
  },
  openGraph: {
    title: 'Zeneva Blog - Master Your Retail Business',
    description: 'Expert insights on growth, operations, and inventory intelligence.',
  }
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
