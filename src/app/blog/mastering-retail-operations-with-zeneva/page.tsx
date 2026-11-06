
import { Metadata } from 'next';
import { BLOG_ARCHIVE_DATE, truncateMeta } from '@/lib/blog-data';
import MasteringZenevaClient from './mastering-retail-client';

const siteUrl = 'https://zeneva.space';
const postUrl = `${siteUrl}/blog/mastering-retail-operations-with-zeneva`;
const title = 'Mastering Retail Operations: The Zeneva Framework';
const description = truncateMeta(
  'Scaling a retail business in modern Nigeria requires command over data, inventory shields, and multi-location management. Learn the five pillars of operational excellence.'
);
const image = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop';

export const metadata: Metadata = {
  title: { absolute: `${title} | Zeneva` },
  description,
  alternates: {
    canonical: '/blog/mastering-retail-operations-with-zeneva'
  },
  openGraph: {
    title,
    description,
    url: '/blog/mastering-retail-operations-with-zeneva',
    siteName: 'Zeneva',
    locale: 'en_US',
    images: [{ url: image, alt: title }],
    type: 'article',
    publishedTime: `${BLOG_ARCHIVE_DATE}T00:00:00.000Z`,
    modifiedTime: `${BLOG_ARCHIVE_DATE}T00:00:00.000Z`,
    section: 'Operations',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image],
  },
};

// This post lives on its own route, so it never passed through the
// blog/[id] JSON-LD graph and had no structured data beyond the sitewide
// WebSite/Organization block.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  '@id': `${postUrl}#article`,
  headline: 'Mastering Retail Operations: The Zeneva Framework for Success',
  description,
  image,
  datePublished: `${BLOG_ARCHIVE_DATE}T00:00:00.000Z`,
  dateModified: `${BLOG_ARCHIVE_DATE}T00:00:00.000Z`,
  articleSection: 'Operations',
  inLanguage: 'en',
  mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  author: { '@type': 'Organization', name: 'Zeneva Editorial', url: siteUrl },
  publisher: { '@id': `${siteUrl}/#organization` },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MasteringZenevaClient />
    </>
  );
}
