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
  Bell, LogOut, Package, Search as SearchIcon, Home, ShoppingCart, Users, FileText, Settings, LifeBuoy, ShieldAlert, CreditCard, Bot, Calculator as CalculatorIcon, Globe, Loader, BarChart2, UserCog, FileDigit, ShieldQuestion, Truck, Building, History as HistoryIcon, Paintbrush, Award, UserRound
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, query, collection, orderBy, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import type { UserNotification, BusinessInstance, AdminNotification, UserProfile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Calculator from '@/components/shared/calculator';
import { usePOS } from '@/context/pos-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import NetworkStatusIndicator from '@/components/shared/network-status-indicator';
import { useToast } from '@/hooks/use-toast';
import Confetti from '@/components/shared/confetti';
import { AppConfig } from '@/lib/config';
import BusinessHealthIndicator from '@/components/dashboard/business-health-indicator';
import { ThemeProvider } from '@/components/theme-provider';
import QueueStatus from '@/components/layout/queue-status';

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
  { href: '/receipts', icon: FileText, label: 'Receipts', roles: ['admin', 'manager'] },
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
      className="fixed inset-0 z-50 flex h-screen w-full items-center justify-center overflow-hidden bg-background"
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
  } = usePOS();

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);

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

  // Show full-screen loader ONLY on initial auth load or if profile is missing
  if (isUserLoading || !user || (user && !currentUserProfile)) {
    return <AppLoader text="Loading your workspace..." />;
  }

  // --- Start of Checks for Active/Valid Accounts ---

  if (currentUserProfile && currentUserProfile.surveyCompleted === false && pathname !== '/onboarding') {
    return <AppLoader text="Finalizing your setup..." />;
  }

  if (currentUserProfile && currentUserProfile.status === 'inactive') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted p-4">
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
      <div className="flex h-screen w-full items-center justify-center bg-muted p-4">
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
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <div
            className="relative flex h-[100dvh] w-full overflow-hidden"
          >
            <Confetti trigger={isConfettiActive} onComplete={() => setIsConfettiActive(false)} />
            <Sidebar collapsible="icon" className="flex-col bg-sidebar border-r no-print">
              <SidebarHeader className="p-4 flex items-center gap-2 justify-center">
                <Link href="/dashboard" className="flex items-center justify-center h-12 w-full">
                  {/* Expanded state logo */}
                  <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="w-32 h-auto group-data-[state=expanded]:block hidden" />
                  {/* Collapsed state logo */}
                  <div className="w-12 h-12 group-data-[state=collapsed]:block hidden">
                    <svg width="48" height="48" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="zenevaOrangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#ff9933', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#cc5200', stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                          <feOffset dx="0" dy="2" result="offsetblur" />
                          <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3" />
                          </feComponentTransfer>
                          <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <g filter="url(#dropShadow)">
                        <path d="M 100 55 A 35 35 0 1 0 100 125 A 35 35 0 1 0 100 55 Z M 100 63 A 27 27 0 1 1 100 117 A 27 27 0 1 1 100 63 Z" fill="url(#zenevaOrangeGradient)" stroke="#cc5200" strokeWidth="0.5" />
                        <path d="M 60 127 Q 100 154 140 127 Q 100 142 60 127 Z" fill="url(#zenevaOrangeGradient)" stroke="#cc5200" strokeWidth="0.5" />
                      </g>
                    </svg>
                  </div>
                </Link>
              </SidebarHeader>
              <SidebarContent className="flex-1 p-2">
                <ScrollArea className="h-full">
                  <SidebarMenu>
                    {visibleNavItems.map((link) => (
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
                    ))}
                  </SidebarMenu>
                </ScrollArea>
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
                        <Avatar className="h-8 w-8">
                          {user?.photoURL && <AvatarImage src={user.photoURL} alt={currentUserProfile?.name || ''} />}
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{fallbackInitials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start group-data-[state=collapsed]:hidden truncate">
                          <span className="truncate text-sm font-medium" title={currentUserProfile?.name || currentUserProfile?.email || ''}>{currentUserProfile?.name || currentUserProfile?.email}</span>
                          {plan && <Badge variant={plan === 'pro' ? 'secondary' : 'default'} className={cn('capitalize text-xs px-1.5 py-0.5 mt-1', (plan === 'starter' || plan === 'business') && 'bg-orange-500 hover:bg-orange-300 border-orange-600 text-white')}>{plan}</Badge>}
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
                    <DropdownMenuItem>Support</DropdownMenuItem>
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
                            {unreadCount > 0 && <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleMarkAsRead}>Mark all as read</Button>}
                          </div>
                          <ScrollArea className="h-[300px]">
                            {isLoadingUserNotifications || isLoadingAdminNotifications ? <div className="flex justify-center items-center h-full"><Loader className="h-6 w-6 animate-spin text-primary" /></div> : allNotifications && allNotifications.length > 0 ? (
                              allNotifications.map(notif => (
                                <div key={notif.id} className={`p-4 border-b last:border-b-0 ${!notif.isGlobal && !notif.read ? 'bg-primary/5' : ''}`}>
                                  <p className={`font-semibold text-sm ${!notif.isGlobal && !notif.read ? 'text-primary' : ''}`}>
                                    {notif.isGlobal && <Globe className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{notif.body}</p>
                                  <p className="text-xs text-muted-foreground/80 mt-1">
                                    {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="p-4 text-sm text-muted-foreground text-center">No new notifications.</p>
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
                        <Avatar className="h-8 w-8">
                          {user?.photoURL && <AvatarImage src={user.photoURL} alt={currentUserProfile?.name || ""} />}
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{fallbackInitials}</AvatarFallback>
                        </Avatar>
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
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6 font-body smooth-scroll">
                {children}
              </main>
            </div>
          </div>
          <MobileBottomNav navItems={mainMobileNavItems} moreNavItems={allMoreNavItems} />
          <Calculator isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
