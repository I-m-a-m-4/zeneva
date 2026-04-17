'use client';

import *as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Bell, LogOut, Package, Search as SearchIcon, Home, ShoppingCart, Users, FileText, Settings, LifeBuoy, ShieldAlert, CreditCard, Bot, Calculator as CalculatorIcon, Globe, Loader, BarChart2, UserCog, FileDigit, ShieldQuestion, Truck, Building, History as HistoryIcon, Paintbrush, Award, UserRound, X, Trash, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, query, collection, orderBy, writeBatch, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import type { UserNotification, BusinessInstance, AdminNotification, UserProfile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Calculator from '@/components/shared/calculator';
import { usePOS } from '@/context/pos-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NetworkStatusIndicator from '@/components/shared/network-status-indicator';
import { useToast } from '@/hooks/use-toast';
import Confetti from '@/components/shared/confetti';
import { AppConfig } from '@/lib/config';
import BusinessHealthIndicator from '@/components/dashboard/business-health-indicator';
import QueueStatus from '@/components/layout/queue-status';
import { Skeleton } from '@/components/ui/skeleton';


const AiInsightsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="10" r="6" />
    <path d="M5 16a10 10 0 0 0 14 0" />
  </svg>
);

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', roles: ['admin', 'manager', 'vendor_operator'] },
  { href: '/inventory', icon: Package, label: 'Inventory', roles: ['admin', 'manager', 'vendor_operator'] },
  { href: '/sales/pos/select-products', icon: ShoppingCart, label: 'POS', roles: ['admin', 'manager', 'vendor_operator'] },
  { href: '/storefront', icon: Paintbrush, label: 'Storefront', roles: ['admin'] },
  { href: '/online-orders', icon: Globe, label: 'Online Orders', roles: ['admin', 'manager'] },
  { href: '/receipts', icon: FileText, label: 'Receipts', roles: ['admin', 'manager', 'vendor_operator'] },
  { href: '/invoices', icon: FileDigit, label: 'Invoices', roles: ['admin', 'manager'] },
  { href: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin', 'manager'] },
  { href: '/ai-insights', icon: AiInsightsIcon, label: 'Zen AI', roles: ['admin', 'manager'] },
  { href: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'manager', 'vendor_operator'] },
  { href: '/users', icon: UserRound, label: 'Users', roles: ['admin'] },
  { href: '/audit-log', icon: HistoryIcon, label: 'Audit Log', roles: ['admin'] },
];

const bottomLinks = [
  { href: '/billing', icon: CreditCard, label: 'Billing', roles: ['admin'] },
  { href: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { href: '/support', icon: LifeBuoy, label: 'Support', roles: ['admin', 'manager', 'vendor_operator'] },
];

const moreNavLinks: { href: string; icon: React.ElementType; label: string; roles: string[]; }[] = [
  // This is intentionally left empty as items are now in the main nav.
];

// Helper component for full-screen loading
function AppLoader({ text }: { text: string }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 top-[var(--tauri-title-height,0)] z-50 flex h-full w-full items-center justify-center overflow-hidden bg-background"
    >
      {/* Background decoration to emphasize glassmorphism */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-100 via-background to-background dark:from-orange-950/30 dark:via-background dark:to-background"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl"></div>

      {/* Minimal Container without Glassmorphism Box */}
      <div className="relative flex flex-col items-center justify-center p-8 z-10">
        <Loader className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-foreground animate-pulse font-body">{text}</p>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const firestore = useFirestore();

  const {
    isLoading,
    isUserLoading,
    currentUserProfile,
    user,
    business: businessInstance,
    isConfettiActive,
    triggerConfetti,
    setIsConfettiActive,
    products,
    queuedActions,
    isSubscriptionActive
  } = usePOS();

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper: resolve a navigation link for each notification
  const getNotificationLink = React.useCallback((notif: any): string => {
    if (notif.link) return notif.link;
    if (notif.type === 'inventory' || notif.body?.toLowerCase().includes('stock') || notif.body?.toLowerCase().includes('backorder')) return '/inventory';
    if (notif.type === 'sale' || notif.body?.toLowerCase().includes('order')) return '/online-orders';
    if (notif.type === 'sync') return '/audit-log';
    if (notif.isGlobal) return '/support';
    return '/';
  }, []);

  const userNotificationsQuery = useMemoFirebase(
    () => (currentUserProfile ? query(collection(firestore, `users/${currentUserProfile.id}/notifications`), orderBy('createdAt', 'desc')) : null),
    [firestore, currentUserProfile?.id]
  );
  const { data: userNotifications, isLoading: isLoadingUserNotifications } = useCollection<UserNotification>(userNotificationsQuery);

  const adminNotificationsQuery = useMemoFirebase(
    () => (currentUserProfile ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null),
    [currentUserProfile, firestore]
  );
  const { data: adminNotifications, isLoading: isLoadingAdminNotifications } = useCollection<AdminNotification>(adminNotificationsQuery);

  const allNotifications = React.useMemo(() => {
    if (isLoadingUserNotifications || isLoadingAdminNotifications) return [];
    const combined = [
      ...(userNotifications || []).map(n => ({ ...n, isGlobal: false })),
      ...(adminNotifications || []).map(n => ({ ...n, read: true, isGlobal: true }))
    ];
    combined.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    return combined.slice(0, 20);
  }, [userNotifications, adminNotifications, isLoadingUserNotifications, isLoadingAdminNotifications]);

  const unreadCount = React.useMemo(() => {
    if (!userNotifications) return 0;
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);

  const handleMarkAsRead = React.useCallback(async () => {
    if (!currentUserProfile || unreadCount === 0 || !userNotifications || !firestore) return;
    const batch = writeBatch(firestore);
    userNotifications.forEach(notif => {
      if (!notif.read) {
        const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notif.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit().catch(console.error);
  }, [currentUserProfile, unreadCount, userNotifications, firestore]);

  const handleDeleteNotification = React.useCallback(async (notifId: string, isGlobal: boolean) => {
    if (!currentUserProfile || isGlobal || !firestore) return;
    try {
      const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notifId);
      const batch = writeBatch(firestore);
      batch.delete(notifRef);
      await batch.commit();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, [currentUserProfile, firestore]);

  const handleClearAll = React.useCallback(async () => {
    if (!currentUserProfile || !userNotifications || !firestore) return;
    try {
      const batch = writeBatch(firestore);
      userNotifications.forEach(notif => {
        const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notif.id);
        batch.delete(notifRef);
      });
      await batch.commit();
      toast({ title: "Notifications cleared" });
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }, [currentUserProfile, userNotifications, firestore, toast]);


  const handleLogout = () => {
    setIsLoggingOut(true);
    signOut(getAuth())
      .then(() => {
        // No need to redirect here. The auth listener will handle it.
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Logout Failed",
          description: "An unexpected error occurred. Please try again.",
        });
        setIsLoggingOut(false);
      });
  };

  React.useEffect(() => {
    // If loading is complete and there's no authenticated user, redirect to login.
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  React.useEffect(() => {
    if (!isLoading && currentUserProfile && !currentUserProfile.surveyCompleted && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [isLoading, currentUserProfile, pathname, router]);

  // --- RBAC Route Guard ---
  React.useEffect(() => {
    if (isLoading || isUserLoading || !currentUserProfile) return;

    const userRole = currentUserProfile.role;

    // Define explicit permissions for routes
    const ROUTE_PERMISSIONS: Record<string, string[]> = {
      '/dashboard': ['admin', 'manager', 'vendor_operator'],
      '/inventory': ['admin', 'manager', 'vendor_operator'],
      '/sales': ['admin', 'manager', 'vendor_operator'], // Covers POS
      '/storefront': ['admin'],
      '/online-orders': ['admin', 'manager'],
      '/receipts': ['admin', 'manager', 'vendor_operator'],
      '/invoices': ['admin', 'manager'],
      '/reports': ['admin', 'manager'],
      '/ai-insights': ['admin', 'manager', 'vendor_operator'],
      '/customers': ['admin', 'manager', 'vendor_operator'],
      '/users': ['admin'],
      '/audit-log': ['admin'],
      '/billing': ['admin'],
      '/settings': ['admin'],
      '/support': ['admin', 'manager', 'vendor_operator'],
      '/achievements': ['admin', 'manager', 'vendor_operator'],
    };

    // Find the matching permission rule for the current path
    // We sort keys by length descending to match specific paths first (e.g. /settings/profile vs /settings)
    // currently we only have top-level keys but this is good practice.
    const protectedRoute = Object.keys(ROUTE_PERMISSIONS)
      .sort((a, b) => b.length - a.length)
      .find(route => pathname.startsWith(route));

    if (protectedRoute) {
      const allowedRoles = ROUTE_PERMISSIONS[protectedRoute];
      if (!allowedRoles.includes(userRole)) {
        console.warn(`Access denied to ${pathname} for role ${userRole}. Redirecting to app.`);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to view this page.",
        });
        router.replace('/sales/pos/select-products');
      }
    }
  }, [pathname, currentUserProfile, isLoading, router, toast]);

  const getInitials = (name?: string) => {
    if (!name?.trim()) return "";
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
    return "";
  };
  const fallbackInitials = getInitials(currentUserProfile?.name) || (currentUserProfile?.email || 'U').charAt(0).toUpperCase();

  if (isLoggingOut) {
    return <AppLoader text="Logging out..." />;
  }

  // If loading is complete and no user, we redirect (handled by useEffect).
  // While loading, we now show the shell instead of a full-screen loader to improve perceived speed.
  // We only show the loader if we are explicitly not logged in AND not loading (which shouldn't happen due to redirect)
  // or if we want to provide a tiny bit of buffer.
  const isInitialAuthCheck = isUserLoading && !user;

  // --- Start of Checks for Active/Valid Accounts ---

  if (currentUserProfile && currentUserProfile.surveyCompleted === false && pathname !== '/onboarding') {
    return <AppLoader text="Finalizing your setup..." />;
  }

  if (currentUserProfile && currentUserProfile.status === 'inactive') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <UserCog className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Inactive</CardTitle>
            <CardDescription>
              Your account is currently inactive. Please contact an administrator to have it reinstated.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (businessInstance?.status === 'deleted') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Business Deleted</CardTitle>
            <CardDescription>
              The business associated with this account has been deleted by the owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">For security, you have been logged out. If you believe this is an error, please contact your business administrator.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  // --- End of Checks ---

  if (pathname === '/onboarding') {
    return <main className="p-4 sm:p-6">{children}</main>;
  }

  // --- Subscription Guard Configuration ---
  const restrictedRoutes = ['/sales', '/storefront', '/ai-insights', '/customers', '/inventory', '/reports', '/receipts', '/online-orders', '/audit-log'];
  const isRestrictedRoute = restrictedRoutes.some(route => pathname.startsWith(route));
  const showSubscriptionBlock = !isSubscriptionActive && isRestrictedRoute && !isLoading;
  // --- End of Subscription Guard Config ---

  const userRole = currentUserProfile?.role;
  const plan = businessInstance?.plan || 'starter';
  const hasLifetimeAccess = businessInstance?.accessLevel === 'lifetime';

  const filterNavByRole = (items: any[]) => {
    if (!userRole) return [];
    return items.filter(item => {
      const roleMatch = !item.roles || (item.roles as string[]).includes(userRole);
      return roleMatch;
    });
  };

  const visibleNavItems = filterNavByRole(navItems);
  const visibleBottomLinks = filterNavByRole(bottomLinks);
  const visibleMoreNavLinks = filterNavByRole(moreNavLinks);

  const mainMobileNavItems = visibleNavItems.filter(item => ['/dashboard', '/inventory', '/sales/pos/select-products'].includes(item.href));
  const extraMobileNavItems = visibleNavItems.filter(item => !mainMobileNavItems.some(main => main.href === item.href));
  const allMoreNavItems = [...extraMobileNavItems, ...visibleBottomLinks, ...visibleMoreNavLinks];

  const isLinkActive = (linkHref: string, currentPathname: string) => {
    if (linkHref === '/dashboard') return currentPathname === linkHref;
    if (linkHref === '/inventory') return currentPathname.startsWith('/inventory');
    if (linkHref === '/storefront') return currentPathname.startsWith('/storefront');
    if (linkHref === '/ai-insights') return currentPathname.startsWith('/ai-insights');
    return currentPathname.startsWith(linkHref);
  };

  return (
    <>
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <div
            className="relative flex h-full w-full overflow-hidden"
          >
            <Confetti trigger={isConfettiActive} onComplete={() => setIsConfettiActive(false)} />
            <Sidebar collapsible="icon" className="flex-col bg-sidebar border-r no-print">
              <SidebarHeader className="p-4 flex items-center gap-2 justify-center">
                <Link href="/dashboard" className="flex items-center justify-center h-12 w-full">
                  {/* Expanded state logo */}
                  <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="w-32 h-auto group-data-[state=expanded]:block hidden" />
                  {/* Collapsed state logo */}
                  <div className="w-12 h-12 group-data-[state=collapsed]:block hidden">
                    <img src={AppConfig.logoIconUrl} alt="Zeneva Icon" className="w-10 h-10 mx-auto" />
                  </div>
                </Link>
              </SidebarHeader>
              <SidebarContent className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                <SidebarMenu>
                  {isUserLoading ? (
                    // Show skeletons for the top 5 nav items while loading
                    Array.from({ length: 6 }).map((_, i) => (
                      <SidebarMenuItem key={`skeleton-nav-${i}`}>
                        <SidebarMenuButton disabled>
                          <Skeleton className="h-5 w-5 rounded-md" />
                          <Skeleton className="h-4 w-24 group-data-[state=collapsed]:hidden" />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  ) : (
                    visibleNavItems.map((link) => (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={{ children: link.label, side: 'right', sideOffset: 10 }}
                          isActive={isLinkActive(link.href, pathname)}
                        >
                          <Link href={link.href}>
                            <link.icon className="h-5 w-5" />
                            <span className="group-data-[state=collapsed]:hidden">{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter className="p-2">
                <SidebarMenu>
                  {visibleBottomLinks.map((link) => (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={{ children: link.label, side: 'right', sideOffset: 10 }}
                        isActive={pathname.startsWith(link.href)}
                      >
                        <Link href={link.href}>
                          <link.icon className="h-5 w-5" />
                          <span className="group-data-[state=collapsed]:hidden">{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
                <Separator className="my-2 bg-sidebar-border" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                      <div className="flex items-center gap-2 w-full">
                        {isUserLoading ? (
                          <Skeleton className="h-8 w-8 rounded-full" />
                        ) : (
                          <Avatar className="h-8 w-8">
                            {user?.photoURL && <AvatarImage src={user.photoURL} alt={currentUserProfile?.name || ''} />}
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {fallbackInitials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col items-start group-data-[state=collapsed]:hidden truncate">
                          {isUserLoading ? (
                            <>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-12" />
                            </>
                          ) : (
                            <>
                              <span className="truncate text-sm font-medium" title={currentUserProfile?.name || currentUserProfile?.email || ''}>{currentUserProfile?.name || currentUserProfile?.email}</span>
                              {hasLifetimeAccess && <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-sm animate-pulse-slow">Lifetime</Badge>}
                              {!hasLifetimeAccess && plan && <Badge variant={plan === 'pro' ? 'secondary' : 'default'} className={cn('capitalize text-xs px-1.5 py-0.5 mt-1', (plan === 'starter' || plan === 'business') && 'bg-orange-500 hover:bg-orange-300 border-orange-600 text-white')}>{plan}</Badge>}
                            </>
                          )}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href="/achievements"><Award className="mr-2 h-4 w-4" />Achievements</Link></DropdownMenuItem>
                    {userRole === 'admin' && (
                      <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild><Link href="/support"><LifeBuoy className="mr-2 h-4 w-4" />Support</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarFooter>
            </Sidebar>
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="no-print flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6 z-10">
                <SidebarTrigger className="hidden md:flex" />
                <BusinessHealthIndicator />
                {isMounted && <Badge variant="outline" className="text-[10px] h-5 bg-muted/50 font-mono opacity-60 hover:opacity-100 transition-opacity">v{AppConfig.version}</Badge>}
                <div className="flex-1" />
                <div className="flex items-center gap-1 md:gap-2 ml-auto">
                  <QueueStatus />
                  <NetworkStatusIndicator />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Calculator" onClick={() => setIsCalculatorOpen(true)}>
                        <CalculatorIcon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calculator</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Popover onOpenChange={(open) => { if (open) handleMarkAsRead() }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">{unreadCount}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-96 p-0">
                          <div className="flex items-center justify-between p-4 border-b">
                            <p className="font-medium">Notifications</p>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAsRead}>Mark read</Button>}
                              {allNotifications.length > 0 && <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive hover:text-destructive/80" onClick={handleClearAll}>Clear all</Button>}
                            </div>
                          </div>
                          <ScrollArea className="h-[300px]">
                            {isLoadingUserNotifications || isLoadingAdminNotifications ? <div className="flex justify-center items-center h-full"><Loader className="h-6 w-6 animate-spin text-primary" /></div> : allNotifications && allNotifications.length > 0 ? (
                              <div className="flex flex-col">
                                {allNotifications.slice(0, 5).map(notif => (
                                  <div key={notif.id} className={`border-b last:border-b-0 group relative ${!notif.isGlobal && !notif.read ? 'bg-primary/5' : ''}`}>
                                    <Link
                                      href={getNotificationLink(notif)}
                                      className="flex items-start gap-2 p-4 pr-10 hover:bg-muted/30 transition-colors"
                                    >
                                      <div className="space-y-1 flex-1">
                                        <p className={`font-semibold text-sm ${!notif.isGlobal && !notif.read ? 'text-primary' : ''}`}>
                                          {notif.isGlobal && (
                                            <Badge variant="outline" className="mr-2 h-4 px-1 text-[8px] uppercase tracking-tighter">System</Badge>
                                          )}
                                          {notif.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.body}</p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                                          {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                                        </p>
                                      </div>
                                    </Link>
                                    {!notif.isGlobal && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-3 right-3 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteNotification(notif.id, false);
                                        }}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  className="w-full text-xs font-medium py-3 rounded-none border-t hover:bg-muted/50"
                                  onClick={() => setIsNotificationsExpanded(true)}
                                >
                                  View all ({allNotifications.length})
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">All caught up!</p>
                              </div>
                            )}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Notifications</p>
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full md:flex">
                        {isUserLoading ? (
                          <Skeleton className="h-8 w-8 rounded-full" />
                        ) : (
                          <Avatar className="h-8 w-8">
                            {user?.photoURL && <AvatarImage src={user.photoURL} alt={currentUserProfile?.name || ""} />}
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {fallbackInitials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium leading-none truncate">{currentUserProfile?.name || "Zeneva User"}</p>
                            {plan && <Badge variant={plan === 'pro' ? 'secondary' : 'default'} className={cn('capitalize text-xs', (plan === 'starter' || plan === 'business') && 'bg-orange-500 hover:bg-orange-300 border-orange-600 text-white')}>{plan}</Badge>}
                          </div>
                          <p className="text-xs leading-none text-muted-foreground">
                            {currentUserProfile?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/achievements"><Award className="mr-2 h-4 w-4" />Achievements</Link></DropdownMenuItem>
                      {userRole === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6 font-body smooth-scroll bg-background">
                {showSubscriptionBlock ? (
                  <div className="flex h-full min-h-[400px] w-full items-center justify-center p-4">
                    <Card className="w-full max-w-lg border-none shadow-xl bg-gradient-to-br from-background to-muted/50 overflow-hidden animate-in fade-in zoom-in duration-500">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600"></div>
                      <CardHeader className="pt-10 pb-6 text-center">
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-orange-500/10 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                          <ShieldAlert className="h-12 w-12 text-orange-600" />
                        </div>
                        <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground">
                          Trial Expired
                        </CardTitle>
                        <CardDescription className="text-lg mt-3 px-4">
                          Your trial period or subscription has ended. To continue using <span className="font-bold text-foreground">{(businessInstance?.name || 'your business').toLowerCase()}</span>, please subscribe to a plan.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-8 pb-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-background/50 border border-border/50 shadow-sm backdrop-blur-sm">
                            <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Restricted Features</h4>
                            <ul className="text-sm space-y-2.5 text-muted-foreground font-medium">
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-orange-500" /> POS & Sales</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-orange-500" /> Storefront</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-orange-500" /> Zen AI</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-orange-500" /> Customers</li>
                            </ul>
                          </div>
                          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex flex-col justify-center">
                            <p className="text-xs text-muted-foreground mb-4">Choose a plan that fits your business needs and keep growing with Zeneva.</p>
                            <Button asChild className="w-full shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform">
                              <Link href="/billing">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Review Plans
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/30 border-t p-4 flex justify-center">
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ) : children}
              </main>
              {currentUserProfile && currentUserProfile.id !== user?.uid && (
                <div className="bg-destructive/10 border-t border-destructive/20 p-2 text-center text-sm text-destructive font-medium flex items-center justify-center gap-4">
                  <span>You are viewing {currentUserProfile.name}'s account.</span>
                  <Button size="sm" variant="destructive" onClick={() => window.location.href = '/admin-imamshaffy'}>Exit View</Button>
                </div>
              )}
            </div>
          </div>
          <MobileBottomNav 
            navItems={isUserLoading ? [] : mainMobileNavItems} 
            moreNavItems={isUserLoading ? [] : allMoreNavItems} 
            isLoading={isUserLoading}
          />
          <Calculator isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
        </SidebarProvider>
      </TooltipProvider>

      <Dialog open={isNotificationsExpanded} onOpenChange={setIsNotificationsExpanded}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Notifications Center</DialogTitle>
              <DialogDescription>
                Stay updated with your business performance, inventory alerts, and system updates.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleMarkAsRead} disabled={unreadCount === 0}>
                Mark all read
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5" onClick={handleClearAll} disabled={allNotifications.length === 0}>
                Clear All
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              {allNotifications.length > 0 ? (
                <div className="space-y-4">
                  {allNotifications.map((notif) => (
                    <Card key={notif.id} className={cn("overflow-hidden border-none shadow-sm transition-all hover:shadow-md", !notif.isGlobal && !notif.read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-muted/10')}>
                      <CardContent className="p-4 flex gap-4">
                        <div className={cn("h-10 w-10 shrink-0 rounded-full flex items-center justify-center", notif.isGlobal ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary')}>
                          {notif.isGlobal ? <Globe className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-base">{notif.title}</h4>
                            <span className="text-xs text-muted-foreground">
                              {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {notif.body}
                          </p>
                          <div className="pt-2 flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {notif.isGlobal ? 'SYSTEM' : 'BUSINESS'}
                            </Badge>
                            {!notif.isGlobal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteNotification(notif.id, false)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Bell className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <h3 className="text-lg font-semibold">No notifications found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    When you have new inventory alerts or sales activity, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
