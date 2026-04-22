import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center | Guides & Tutorials | Zeneva',
  description: 'Learn how to master Zeneva with our comprehensive guides, video tutorials, and frequently asked questions. Everything you need to manage your inventory like a pro.',
  openGraph: {
    title: 'Zeneva Help Center - Master Your Business',
    description: 'Browse our knowledge base and tutorials to optimize your retail operations with Zeneva.',
  }
};

export default function HelpCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
