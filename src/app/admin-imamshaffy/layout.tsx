
'use client';

import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader, LogOut, LayoutDashboard, Newspaper, Bell, MessageSquare, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import Confetti from '@/components/shared/confetti';
import { usePOS } from '@/context/pos-context';
import Admin2FAGate from '@/components/admin/admin-2fa-gate';

const ADMIN_EMAIL = 'belloimam431@gmail.com';

const navLinks = [
  { href: '/admin-imamshaffy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-imamshaffy/achievements', label: 'Achievements', icon: Crown },
  { href: '/admin-imamshaffy/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin-imamshaffy/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin-imamshaffy/support', label: 'Support', icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { isConfettiActive, setIsConfettiActive } = usePOS();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user state is resolved
    }

    const isLoginPage = pathname === '/admin-imamshaffy/login';

    if (!user) {
      if (!isLoginPage) {
        router.replace('/admin-imamshaffy/login');
      }
      return;
    }

    const isAuthorizedAdmin = user.email === ADMIN_EMAIL;

    if (!isAuthorizedAdmin && !isLoginPage) {
      // If not an admin and not on the login page, redirect away (e.g., to main dashboard)
      router.replace('/dashboard');
    }

    if (isAuthorizedAdmin && isLoginPage) {
      // If admin is already logged in and on the login page, redirect to admin dashboard
      router.replace('/admin-imamshaffy');
    }
  }, [user, isUserLoading, router, pathname]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/admin-imamshaffy/login');
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-0 h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader className="size-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Authenticating Admin...</p>
        </div>
      </div>
    );
  }

  // Allow login page to render without the admin layout
  if (pathname === '/admin-imamshaffy/login') {
    return <div className="h-full overflow-y-auto w-full">{children}</div>;
  }

  // Render layout for an authorized admin
  if (user && user.email === ADMIN_EMAIL) {
    return (
      <div className="flex h-full w-full flex-col relative overflow-hidden">
        <Confetti trigger={isConfettiActive} onComplete={() => setIsConfettiActive(false)} />
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 shrink-0">
          <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
            <Link href="/admin-imamshaffy" className="flex items-center gap-2 text-lg font-semibold md:text-base whitespace-nowrap">
              <span>Zeneva Admin</span>
            </Link>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground",
                  pathname.startsWith(link.href) && "text-foreground font-semibold"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex-1 sm:flex-initial" />
            <Button onClick={handleLogout} variant="outline" size="sm"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-y-auto">
          <Admin2FAGate>
            {children}
          </Admin2FAGate>
        </main>
      </div>
    );
  }

  // Fallback for unauthorized users, though useEffect should redirect them.
  return null;
}
