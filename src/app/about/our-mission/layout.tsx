import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Mission | Empowering Retailers Worldwide | Zeneva',
  description: 'Learn why we built Zeneva. Our mission is to provide retailers with the intelligence they need to thrive, minimize waste, and maximize profit with cutting-edge technology.',
  openGraph: {
    title: 'The Zeneva Mission - Beyond Just Software',
    description: 'We are on a journey to transform inventory management into an active profit engine for every business.',
  }
};

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
