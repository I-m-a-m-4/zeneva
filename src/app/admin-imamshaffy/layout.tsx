
'use client';

import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader, LogOut, LayoutDashboard, Newspaper, Bell, MessageSquare, Crown, Sun, Moon, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import Confetti from '@/components/shared/confetti';
import { usePOS } from '@/context/pos-context';
import Admin2FAGate from '@/components/admin/admin-2fa-gate';
import { useTheme } from 'next-themes';

const ADMIN_EMAIL = 'belloimam431@gmail.com';

const navLinks = [
  { href: '/admin-imamshaffy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-imamshaffy/achievements', label: 'Achievements', icon: Crown },
  { href: '/admin-imamshaffy/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin-imamshaffy/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin-imamshaffy/support', label: 'Support', icon: MessageSquare },
  { href: '/admin-imamshaffy/developer-logs', label: 'Developer Logs', icon: Bug },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { isConfettiActive, setIsConfettiActive } = usePOS();
  const router = useRouter();
  const pathname = usePathname();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

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
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 shrink-0 overflow-x-auto scrollbar-none">
          <nav className="flex flex-row items-center gap-4 md:gap-5 md:text-sm lg:gap-6 text-sm font-medium whitespace-nowrap overflow-x-auto scrollbar-none">
            <Link href="/admin-imamshaffy" className="flex items-center gap-2 text-lg font-black tracking-tight whitespace-nowrap mr-2">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Zeneva Admin</span>
            </Link>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground py-1",
                  pathname.startsWith(link.href) && "text-foreground font-bold border-b-2 border-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="rounded-full w-9 h-9 border-muted hover:bg-accent shrink-0"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="shrink-0"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
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
