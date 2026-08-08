'use client';

import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { terminalListenerErrorHandler } from '@/firebase/retry';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, LogOut, LayoutDashboard, Newspaper, Bell, MessageSquare, Crown, Sun, Moon, Bug, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import Confetti from '@/components/shared/confetti';
import { usePOS } from '@/context/pos-context';
import Admin2FAGate from '@/components/admin/admin-2fa-gate';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useNativeNotifications } from '@/hooks/use-native-notifications';

const ADMIN_EMAIL = 'belloimam431@gmail.com';

const navLinks = [
  { href: '/admin-imamshaffy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-imamshaffy/users', label: 'Users', icon: Users },
  { href: '/admin-imamshaffy/achievements', label: 'Achievements', icon: Crown },
  { href: '/admin-imamshaffy/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin-imamshaffy/notifications', label: 'Alerts', icon: Bell },
  { href: '/admin-imamshaffy/support', label: 'Support', icon: MessageSquare },
  { href: '/admin-imamshaffy/ai-usage', label: 'AI Usage', icon: Zap },
  { href: '/admin-imamshaffy/developer-logs', label: 'Dev Logs', icon: Bug },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { isConfettiActive, setIsConfettiActive } = usePOS();
  const router = useRouter();
  const pathname = usePathname();

  const { setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const [unreadErrorCount, setUnreadErrorCount] = useState(0);
  const { notify } = useNativeNotifications();

  useEffect(() => {
    if (!firestore || !user || user.email !== ADMIN_EMAIL) return;

    const q = query(
      collection(firestore, 'error_logs'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (typeof window === 'undefined') return;
      const lastViewedTimeStr = localStorage.getItem('zeneva_last_viewed_errors');
      const lastViewedTime = lastViewedTimeStr ? parseInt(lastViewedTimeStr) : 0;

      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const date = typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate()
            : new Date(data.createdAt);
          const time = date.getTime();
          if (!isNaN(time) && time > lastViewedTime) {
            count++;
          }
        }
      });
      setUnreadErrorCount(count);

      // Trigger native notification for newly added error logs
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.createdAt) {
            const date = typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate()
              : new Date(data.createdAt);
            const time = date.getTime();
            // Only notify if it's a completely new error (added recently)
            // and wasn't already viewed
            if (!isNaN(time) && time > lastViewedTime && (Date.now() - time) < 60000) {
              notify(
                'New Developer Log', 
                data.errorMessage || 'A new system error was just logged.',
                '/admin-imamshaffy/developer-logs'
              );
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [firestore, user, pathname, notify]);

  // Support Messages Notifications
  useEffect(() => {
    if (!firestore || !user || user.email !== ADMIN_EMAIL) return;

    const q = query(
      collection(firestore, 'supportThreads'),
      orderBy('lastMessageAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (typeof window === 'undefined') return;
      
      const lastViewedTimeStr = localStorage.getItem('zeneva_last_viewed_support');
      const lastViewedTime = lastViewedTimeStr ? parseInt(lastViewedTimeStr) : 0;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          // Avoid notifying for messages sent by the admin themselves
          if (data.lastMessageSender === 'admin') return;
          
          if (data.lastMessageAt) {
            const date = typeof data.lastMessageAt.toDate === 'function'
              ? data.lastMessageAt.toDate()
              : new Date(data.lastMessageAt);
            const time = date.getTime();
            
            // Only notify if it's new and within the last 60 seconds
            if (!isNaN(time) && time > lastViewedTime && (Date.now() - time) < 60000) {
              notify(
                'New Support Message', 
                data.lastMessage || 'A user sent a new support message.',
                '/admin-imamshaffy/support'
              );
              // Update last viewed so we don't double-notify
              localStorage.setItem('zeneva_last_viewed_support', Date.now().toString());
            }
          }
        }
      });
    }, terminalListenerErrorHandler('Admin support notifications', () => unsubscribe()));

    return () => unsubscribe();
  }, [firestore, user, notify]);

  useEffect(() => {
    if (typeof window !== 'undefined' && pathname === '/admin-imamshaffy/developer-logs') {
      localStorage.setItem('zeneva_last_viewed_errors', Date.now().toString());
      setUnreadErrorCount(0);
    }
    if (typeof window !== 'undefined' && pathname === '/admin-imamshaffy/support') {
      localStorage.setItem('zeneva_last_viewed_support', Date.now().toString());
    }
  }, [pathname]);

  useEffect(() => {
    if (isUserLoading) return;

    const isLoginPage = pathname === '/admin-imamshaffy/login';

    if (!user) {
      if (!isLoginPage) router.replace('/admin-imamshaffy/login');
      return;
    }

    const isAuthorizedAdmin = user.email === ADMIN_EMAIL;

    if (!isAuthorizedAdmin && !isLoginPage) {
      router.replace('/dashboard');
    }

    if (isAuthorizedAdmin && isLoginPage) {
      router.replace('/admin-imamshaffy');
    }
  }, [user, isUserLoading, router, pathname]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/admin-imamshaffy/login');
  };

  const isLinkActive = (href: string) => {
    if (href === '/admin-imamshaffy') return pathname === href;
    return pathname.startsWith(href);
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

  if (pathname === '/admin-imamshaffy/login') {
    return <div className="h-full overflow-y-auto w-full">{children}</div>;
  }

  if (user && user.email === ADMIN_EMAIL) {
    return (
      <div className="flex h-full w-full flex-col relative overflow-hidden">
        <Confetti trigger={isConfettiActive} onComplete={() => setIsConfettiActive(false)} />

        {/* Top Header */}
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 z-10">
          {/* Brand */}
          <Link
            href="/admin-imamshaffy"
            className="flex items-center gap-2 text-base font-black tracking-tight whitespace-nowrap shrink-0 mr-2"
          >
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Zeneva Admin
            </span>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <nav className="hidden md:flex flex-row items-center gap-5 text-sm font-medium overflow-x-auto scrollbar-none">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap py-1 transition-colors hover:text-foreground',
                  isLinkActive(link.href)
                    ? 'text-foreground font-bold border-b-2 border-primary'
                    : 'text-muted-foreground'
                )}
              >
                <span>{link.label}</span>
                {link.label === 'Dev Logs' && unreadErrorCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1.5 py-0 flex items-center justify-center text-[10px] font-black rounded-full animate-pulse bg-red-600 text-white border-0"
                  >
                    {unreadErrorCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="rounded-full w-9 h-9 border-muted hover:bg-accent shrink-0"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode
                ? <Sun className="h-4 w-4 text-yellow-500" />
                : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>
            {/* Logout — text on desktop, icon on mobile */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="shrink-0 hidden md:flex"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden w-9 h-9"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the bottom nav */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-y-auto pb-24 md:pb-8">
          <Admin2FAGate>
            {children}
          </Admin2FAGate>
        </main>

        {/* Mobile Bottom Navigation — hidden on desktop */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-md h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center justify-center flex-1 h-full"
                >
                  <div className="relative mb-0.5">
                    <link.icon
                      className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                    {link.label === 'Dev Logs' && unreadErrorCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] text-white font-bold">
                        {unreadErrorCount > 9 ? '9+' : unreadErrorCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] leading-none',
                      active ? 'text-primary font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Fallback for unauthorized users while useEffect redirects them
  return (
    <div className="flex items-center justify-center min-h-0 h-full bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
