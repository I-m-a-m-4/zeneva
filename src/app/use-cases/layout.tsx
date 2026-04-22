import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Use Cases | Solutions for Retail & Wholesale | Zeneva',
  description: 'Discover how Zeneva transforms businesses across Supermarkets, Pharmacies, Boutiques, and more with intelligent inventory and POS solutions.',
  openGraph: {
    title: 'Zeneva Use Cases - Industry-Specific Solutions',
    description: 'Explore how different industries use Zeneva to eliminate stockouts and maximize profit.',
  }
};

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
