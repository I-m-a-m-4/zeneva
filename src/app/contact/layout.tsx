import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Get Expert Support | Zeneva',
  description: 'Have questions about Zeneva POS? Reach out to our team for support, sales inquiries, or technical help. We are here to help your business flourish.',
  openGraph: {
    title: 'Contact Zeneva - We are Ready to Help',
    description: 'Get in touch with the Zeneva team via WhatsApp, Email, or our Help Center.',
  }
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
