import { Metadata } from 'next';
import StatusContent from './status-content';

export const metadata: Metadata = {
  title: 'System Status & Platform Versions | Zeneva Operational Observatory',
  description: 'Real-time operational status, service health metrics, uptime records, and latest client release versions across Windows, Android, macOS, and Web platforms for Zeneva.',
  openGraph: {
    title: 'Zeneva Status & Platform Versions | Live Systems Health',
    description: 'Monitor real-time system performance, 90-day uptime metrics, and verify your Zeneva desktop and mobile app versions.',
    url: 'https://zeneva.space/status',
    siteName: 'Zeneva',
    images: [
      {
        url: 'https://zeneva.space/herolytics.svg',
        width: 1200,
        height: 630,
        alt: 'Zeneva System Status and Platform Versions',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zeneva Status & Platform Versions',
    description: 'Check real-time subsystem operational health, uptime records, and latest app release versions.',
    images: ['https://zeneva.space/herolytics.svg'],
  },
};

export default function StatusPage() {
  return <StatusContent />;
}
