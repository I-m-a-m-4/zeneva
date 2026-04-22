import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Access Your Zeneva Workspace',
  description: 'Sign in to your Zeneva account to manage your inventory, process sales, and view real-time business analytics.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
