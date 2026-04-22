import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Retail Insights & Business Growth | Zeneva',
  description: 'Stay updated with the latest retail trends, inventory management tips, and success stories from the Zeneva community. Expert advice for Nigerian businesses.',
  openGraph: {
    title: 'Zeneva Blog - Master Your Retail Business',
    description: 'Expert insights on growth, operations, and inventory intelligence.',
  }
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
