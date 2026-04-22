import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Start Your Free Trial with Zeneva',
  description: 'Join thousands of businesses using Zeneva. Create your account and start managing your inventory and sales with our forever-free Starter plan.',
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
