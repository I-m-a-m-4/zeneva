import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans | Scalable Retail Solutions | Zeneva',
  description: 'Choose the perfect plan for your business. From our forever-free Starter plan to Enterprise Plus, Zeneva offers transparent pricing for inventory and POS management.',
  openGraph: {
    title: 'Zeneva Pricing - Flexible Plans for Every Retailer',
    description: 'Start for free or scale with our Pro and Enterprise plans. No hidden fees, just pure growth.',
  }
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
