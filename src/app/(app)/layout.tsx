
'use client';

import * as React from 'react';
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
import Image from 'next/image';
import {
  Bell, LogOut, Package, Search as SearchIcon, Home, ShoppingCart, Users as UsersIcon, FileText, Settings, LifeBuoy, ShieldAlert, CreditCard, Bot, Calculator as CalculatorIcon, Globe, Loader, BarChart2, UserX
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, query, collection, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import CommandMenu from '@/components/layout/command-menu';
import type { UserNotification, BusinessInstance, AdminNotification, UserProfile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Calculator from '@/components/shared/calculator';
import { POSProvider } from '@/context/pos-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import NetworkStatusIndicator from '@/components/shared/network-status-indicator';

const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard', roles: ['admin', 'manager', 'vendor_operator'] },
    { href: '/inventory', icon: Package, label: 'Inventory', roles: ['admin', 'manager', 'vendor_operator'] },
    { href: '/sales/pos/select-products', icon: ShoppingCart, label: 'POS', roles: ['admin', 'manager', 'vendor_operator'] },
    { href: '/receipts', icon: FileText, label: 'Receipts', roles: ['admin', 'manager'] },
    { href: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin', 'manager'] },
    { href: '/customers', icon: UsersIcon, label: 'Customers', roles: ['admin', 'manager', 'vendor_operator'] },
    { href: '/users', icon: UsersIcon, label: 'Users', roles: ['admin'] },
];

const bottomLinks = [
    { href: '/inventory/troubleshoot', icon: Bot, label: 'Troubleshoot', roles: ['admin', 'manager'] },
    { href: '/billing', icon: CreditCard, label: 'Billing', roles: ['admin'] },
    { href: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
    { href: '/support', icon: LifeBuoy, label: 'Support', roles: ['admin', 'manager', 'vendor_operator'] },
];

const moreNavLinks: { href: string; icon: React.ElementType; label: string; roles: string[]; }[] = [];

// Helper component for full-screen loading
function FullScreenLoader({ text }: { text: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background flex-col gap-4">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-body">{text}</p>
    </div>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const pathname = usePathname();
  const [openCommandMenu, setOpenCommandMenu] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, 'users', user.uid) : null), 
    [user?.uid, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const businessDocRef = useMemoFirebase(
    () => (userProfile?.businessId ? doc(firestore, 'businessInstances', userProfile.businessId) : null),
    [userProfile?.businessId, firestore]
  );
  const { data: businessInstance, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);

  const userNotificationsQuery = useMemoFirebase(
      () => (user?.uid ? query(collection(firestore, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc')) : null),
      [user?.uid, firestore]
  );
  const { data: userNotifications, isLoading: isLoadingUserNotifications } = useCollection<UserNotification>(userNotificationsQuery);

  const adminNotificationsQuery = useMemoFirebase(
      () => (user?.uid ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null),
      [user?.uid, firestore]
  );
  const { data: adminNotifications, isLoading: isLoadingAdminNotifications } = useCollection<AdminNotification>(adminNotificationsQuery);
  
  const allNotifications = React.useMemo(() => {
    const combined = [
        ...(userNotifications || []).map(n => ({...n, isGlobal: false})),
        ...(adminNotifications || []).map(n => ({...n, read: true, isGlobal: true }))
    ];
    combined.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
    return combined.slice(0, 20);
  }, [userNotifications, adminNotifications]);

  const unreadCount = React.useMemo(() => {
      return (userNotifications || []).filter(n => !n.read).length;
  }, [userNotifications]);
  
  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);
  
  React.useEffect(() => {
    if (businessInstance && user && userProfile) {
      if (businessInstance.ownerId === user.uid && userProfile.role !== 'admin') {
        const userToUpdateDocRef = doc(firestore, 'users', user.uid);
        updateDoc(userToUpdateDocRef, { role: 'admin' }).catch(console.error);
      }
    }
  }, [businessInstance, user, userProfile, firestore]);

  React.useEffect(() => {
      const down = (e: KeyboardEvent) => {
          if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              setOpenCommandMenu((open) => !open);
          }
      };
      document.addEventListener("keydown", down);
      return () => document.removeEventListener("keydown", down);
  }, []);

  const handleMarkAsRead = React.useCallback(async () => {
    if (!user || unreadCount === 0 || !userNotifications || !firestore) return;
    const batch = writeBatch(firestore);
    userNotifications.forEach(notif => {
      if (!notif.read) {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notif.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit().catch(console.error);
  }, [firestore, user, unreadCount, userNotifications]);

  React.useEffect(() => {
    if (!userDocRef) return;

    const updateLastSeen = () => {
      try {
        updateDoc(userDocRef, {
          lastSeen: serverTimestamp()
        }).catch(error => {
          // This can fail if offline, which is expected. We can safely ignore it,
          // unless it's a different kind of error.
          if (error.code !== 'unavailable') {
             console.warn("Could not update user's last seen timestamp.", error.code);
          }
        });
      } catch (e) {
        console.warn("Error trying to update lastSeen.", e);
      }
    };

    // This function is called when the user's presence changes (e.g., switches tabs, closes window).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateLastSeen();
      }
    };
    
    // Update once when the layout mounts to signal the user is active
    updateLastSeen();

    // Listen for visibility changes to detect when the user leaves the page
    document.addEventListener('visibilitychange', handleVisibilityChange, true);
    
    // pagehide is a more reliable event for when a page is being unloaded
    window.addEventListener('pagehide', handleVisibilityChange, true);

    // Cleanup the event listeners when the component unmounts
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      window.removeEventListener('pagehide', handleVisibilityChange, true);
    };
  }, [userDocRef]);

  if (isUserLoading || isProfileLoading) return <FullScreenLoader text="Loading your session..." />;
  if (!user) return <FullScreenLoader text="Redirecting to login..." />;
  
  if (userProfile?.status === 'inactive') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
               <UserX className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Inactive</CardTitle>
            <CardDescription>
              Your account is currently inactive. Please contact an administrator to have it reinstated.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => signOut(getAuth()).then(() => router.push('/'))} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  if (!userProfile || !userProfile.businessId) {
      return <FullScreenLoader text="Finalizing account setup..." />;
  }

  if (isBusinessLoading) return <FullScreenLoader text="Loading workspace..." />;
  
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
            <Button onClick={() => signOut(getAuth()).then(() => router.push('/'))} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const userRole = userProfile?.role;
  const primaryColor = businessInstance?.settings?.primaryColor;
  const plan = businessInstance?.plan || 'starter';

  const filterNavByRole = (items: any[]) => {
    if (!userRole) return [];
    return items.filter(item => !item.roles || (item.roles as string[]).includes(userRole));
  };
  
  const visibleNavItems = filterNavByRole(navItems);
  const visibleBottomLinks = filterNavByRole(bottomLinks);
  const visibleMoreNavLinks = filterNavByRole(moreNavLinks);

  const mainMobileNavItems = visibleNavItems.filter(item => ['/dashboard', '/inventory', '/sales/pos/select-products'].includes(item.href));
  const extraMobileNavItems = visibleNavItems.filter(item => ['/customers', '/users', '/receipts', '/reports'].includes(item.href));
  const allMoreNavItems = [...extraMobileNavItems, ...visibleBottomLinks, ...visibleMoreNavLinks];

  const isLinkActive = (linkHref: string, currentPathname: string) => {
    if (linkHref === '/dashboard') return currentPathname === linkHref;
    if (linkHref === '/inventory') return currentPathname.startsWith('/inventory') && !currentPathname.startsWith('/inventory/troubleshoot');
    return currentPathname.startsWith(linkHref);
  };
  
  return (
    <POSProvider>
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <div 
            className="relative flex h-screen w-full overflow-hidden"
            style={primaryColor ? { '--primary': primaryColor } as React.CSSProperties : {}}
          >
            <Sidebar collapsible="icon" className="flex-col bg-sidebar border-r no-print">
                <SidebarHeader className="p-4 flex items-center gap-2 justify-center">
                    <Link href="/dashboard" className="flex items-center justify-center gap-2 text-sidebar-foreground h-10 w-full">
                        <Image src="https://i.ibb.co/JjLC3Ff1/Trolley.png" alt="Zeneva Logo" width={28} height={28} className="shrink-0" />
                        <span className="text-xl font-semibold group-data-[state=collapsed]:hidden font-display">Zeneva</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="flex-1 p-2">
                    <ScrollArea className="h-full">
                      <SidebarMenu>
                          {visibleNavItems.map((link) => (
                              <SidebarMenuItem key={link.href}>
                                <SidebarMenuButton
                                      asChild
                                      tooltip={{children: link.label, side: 'right', sideOffset: 10}} 
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
                                  tooltip={{children: link.label, side: 'right', sideOffset: 10}}
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
                              <Button variant="ghost" className="w-full justify-start p-2 text-sidebar-foreground hover:bg-sidebar-accent">
                                  <div className="flex items-center gap-2 w-full">
                                      <Avatar className="h-8 w-8">
                                          {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ''} />}
                                          <AvatarFallback>{(user?.displayName || user?.email || 'U').charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col items-start group-data-[state=collapsed]:hidden truncate">
                                          <span className="truncate text-sm font-medium" title={user?.displayName || user?.email || ''}>{user?.displayName || user?.email}</span>
                                           {plan && <Badge variant={plan === 'pro' ? 'secondary' : 'default'} className={cn('capitalize text-xs px-1.5 py-0.5 mt-1', (plan === 'starter' || plan === 'business') && 'bg-orange-500 hover:bg-orange-300 border-orange-600 text-white')}>{plan}</Badge>}
                                      </div>
                                  </div>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-56">
                              <DropdownMenuLabel>My Account</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {userRole === 'admin' && (
                                <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                              )}
                              <DropdownMenuItem>Support</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => signOut(getAuth()).then(() => router.push('/login'))}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Logout</span>
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                </SidebarFooter>
            </Sidebar>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="no-print flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6 z-10">
                  <SidebarTrigger className="hidden md:flex"/>
                    <div className="relative flex-1">
                      <Button variant="outline" className="w-full justify-start text-muted-foreground md:w-[200px] lg:w-[336px]" onClick={() => setOpenCommandMenu(true)}>
                          <SearchIcon className="mr-2 h-4 w-4" />
                          <span>Search...</span>
                      </Button>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 ml-auto">
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
                          <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && <span className="absolute top-1 right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-96 p-0">
                              <div className="flex items-center justify-between p-4 border-b">
                                <p className="font-medium">Notifications</p>
                                {unreadCount > 0 && <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleMarkAsRead}>Mark all as read</Button>}
                              </div>
                              <ScrollArea className="h-[300px]">
                                  {isLoadingUserNotifications || isLoadingAdminNotifications ? <div className="flex justify-center items-center h-full"><Loader className="h-6 w-6 animate-spin text-primary"/></div> : allNotifications && allNotifications.length > 0 ? (
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
                                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ""} />}
                                <AvatarFallback>{(user?.displayName || user?.email || 'U').charAt(0)}</AvatarFallback>
                          </Avatar>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                          <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium leading-none truncate">{user?.displayName || "Zeneva User"}</p>
                                  {plan && <Badge variant={plan === 'pro' ? 'secondary' : 'default'} className={cn('capitalize text-xs', (plan === 'starter' || plan === 'business') && 'bg-orange-500 hover:bg-orange-300 border-orange-600 text-white')}>{plan}</Badge>}
                                </div>
                                <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                                </p>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {userRole === 'admin' && (
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => signOut(getAuth()).then(() => router.push('/login'))}>
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
          <NetworkStatusIndicator />
          <Calculator isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
          <CommandMenu open={openCommandMenu} onOpenChange={setOpenCommandMenu}/>
        </SidebarProvider>
      </TooltipProvider>
    </POSProvider>
  );
}
