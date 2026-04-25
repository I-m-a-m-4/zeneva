
import { Metadata } from 'next';
import BlogClient from './blog-client';

export const metadata: Metadata = {
  title: 'Zeneva Blog | Retail Intelligence & Operational Mastery',
  description: 'Tactical implementation guides, operational problem-solving, and advanced growth tips for modern Nigerian retailers. Stay informed with Zeneva.',
  openGraph: {
    title: 'Zeneva Blog - Strategic Retail Intelligence',
    description: 'The ultimate knowledge base for scaling your retail business in Nigeria.',
    url: 'https://zeneva.space/blog',
    siteName: 'Zeneva',
    images: [
      {
        url: 'https://zeneva.space/herolytics.svg',
        width: 1200,
        height: 630,
        alt: 'Zeneva Blog',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva Blog - Strategic Retail Intelligence',
    description: 'Mission-critical insights for high-fidelity retail operations.',
    images: ['https://zeneva.space/herolytics.svg'],
  },
};

export default function Page() {
  return <BlogClient />;
}
