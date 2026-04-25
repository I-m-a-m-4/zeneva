
import { Metadata } from 'next';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: 'Zeneva - Advanced Inventory Management & Global POS Operating System',
  description: 'Zeneva is a borderless retail operating system that unifies inventory management, multi-store POS, analytics, and USD/NGN payments into one powerful platform. Built for modern retailers scaling globally.',
  openGraph: {
    title: 'Zeneva - Advanced Inventory Management & Global POS',
    description: 'Track every product, capture every sale, and scale globally. Zeneva unifies inventory, analytics, and multi-currency payments for the modern retailer.',
    url: 'https://zeneva.space',
    siteName: 'Zeneva',
    images: [
      {
        url: 'https://zeneva.space/zeneva-platform.png',
        width: 1200,
        height: 630,
        alt: 'Zeneva Retail Operating System',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva - Global Retail OS & POS Platform',
    description: 'Transform your retail operations with Zeneva. Inventory, analytics, and global payments in one unified platform.',
    images: ['https://zeneva.space/zeneva-platform.png'],
  },
};

export default function Page() {
  return <HomeClient />;
}
