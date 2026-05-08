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
  Bell, LogOut, Package, Search as SearchIcon, Home, ShoppingCart, Users, FileText, Settings, LifeBuoy, ShieldAlert, CreditCard, Bot, Calculator as CalculatorIcon, Globe, Loader, BarChart2, UserCog, FileDigit, ShieldQuestion, Truck, Building, History as HistoryIcon, Paintbrush, Award, UserRound, X, Trash, AlertTriangle, CheckCircle2, ChevronRight, Zap, ArrowRight, ShieldCheck
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
import { cn, safeToDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NetworkStatusIndicator from '@/components/shared/network-status-indicator';
import { useToast } from '@/hooks/use-toast';
import Confetti from '@/components/shared/confetti';
import { AppConfig } from '@/lib/config';
import BusinessHealthIndicator from '@/components/dashboard/business-health-indicator';
import QueueStatus from '@/components/layout/queue-status';
import { Skeleton } from '@/components/ui/skeleton';
import { CachedImage } from '@/components/shared/cached-image';
import { useNativeNotifications } from '@/hooks/use-native-notifications';
import { useFCM } from '@/hooks/use-fcm';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import HeldSalesDrawer from '@/components/pos/held-sales-drawer';
import { History } from 'lucide-react';


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
  { href: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin', 'owner'] },
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
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
    // Simulated progress for secondary loaders
    const interval = setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + (Math.random() * 15) : prev));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 top-[var(--tauri-title-height,0)] z-[100] flex h-full w-full items-center justify-center overflow-hidden bg-background"
    >
      {/* Ambient Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      {/* Content Container */}
      <div className="relative flex flex-col items-center justify-center max-w-xs w-full p-8 z-10 text-center">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
           <Loader className="h-10 w-10 animate-spin text-primary relative" />
        </div>
        
        <div className="w-full space-y-4">
          <div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
             <div 
               className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.3)]"
               style={{ width: `${progress}%` }}
             />
          </div>
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-[0.2em] animate-pulse">
            {text}
          </p>
        </div>
      </div>
      
      {/* Texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
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
    isSubscriptionActive,
    onlineOrders
  } = usePOS();

  const { notify } = useNativeNotifications();
  const { requestPermission: handleRequestFcmPermission } = useFCM();

  React.useEffect(() => {
    // Only request notification permissions on Native Desktop or Native Mobile (Tauri)
    const isNative = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    
    if (isNative && !isUserLoading && user) {
      // Small delay to ensure UI is ready before prompting for notifications
      const timer = setTimeout(() => {
        handleRequestFcmPermission(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, isUserLoading, handleRequestFcmPermission]);

  const [hasPermissionError, setHasPermissionError] = React.useState(false);
  const [permissionErrorDetails, setPermissionErrorDetails] = React.useState<FirestorePermissionError | null>(null);

  React.useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.warn("Global Permission Error Caught:", error);
      
      // If the error is related to the current business, we might need to block access
      if (error.path?.includes('businessInstances') || error.path?.includes('onlineOrders')) {
        setHasPermissionError(true);
        setPermissionErrorDetails(error);
      } else {
        toast({
          variant: "destructive",
          title: "Permission Error",
          description: "You don't have permission to perform this action.",
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, [toast]);

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Helpers & Hooks (Above early returns to avoid Rule of Hooks violations) ---
  
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
      const dateA = safeToDate(a.createdAt);
      const dateB = safeToDate(b.createdAt);
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

  const handleConfettiComplete = React.useCallback(() => setIsConfettiActive(false), [setIsConfettiActive]);

  React.useEffect(() => {
    // If auth checking is complete and there's no authenticated user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  React.useEffect(() => {
    const isSuperAdmin = currentUserProfile?.email === 'belloimam431@gmail.com';
    if (!isLoading && currentUserProfile && !currentUserProfile.surveyCompleted && pathname !== '/onboarding' && !isSuperAdmin) {
      router.replace('/onboarding');
    }
  }, [isLoading, currentUserProfile, pathname, router]);

  // RBAC Route Guard
  React.useEffect(() => {
    if (isLoading || isUserLoading || !currentUserProfile) return;

    const userRole = currentUserProfile.role;
    const isSuperAdmin = currentUserProfile.email === 'belloimam431@gmail.com';

    if (isSuperAdmin) return; // Super admin has access to everything

    const ROUTE_PERMISSIONS: Record<string, string[]> = {
      '/dashboard': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/inventory/debts': ['admin', 'manager', 'owner', 'super-admin'],
      '/inventory/troubleshoot': ['admin', 'manager', 'owner', 'super-admin'],
      '/inventory/add': ['admin', 'manager', 'owner', 'super-admin'],
      '/inventory': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/sales': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/storefront': ['admin', 'owner', 'super-admin'],
      '/online-orders': ['admin', 'manager', 'owner', 'super-admin'],
      '/receipts': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/invoices': ['admin', 'manager', 'owner', 'super-admin'],
      '/reports': ['admin', 'owner', 'super-admin'],
      '/ai-insights': ['admin', 'manager', 'owner', 'super-admin'],
      '/customers': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/users': ['admin', 'owner', 'super-admin'],
      '/audit-log': ['admin', 'owner', 'super-admin'],
      '/billing': ['admin', 'owner', 'super-admin'],
      '/settings': ['admin', 'owner', 'super-admin'],
      '/support': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
      '/achievements': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    };

    const protectedRoute = Object.keys(ROUTE_PERMISSIONS)
      .sort((a, b) => b.length - a.length)
      .find(route => pathname.startsWith(route));

    if (protectedRoute) {
      const allowedRoles = ROUTE_PERMISSIONS[protectedRoute];
      const permissions = currentUserProfile.permissions || {};
      
      // 1. Check for explicit granular DENIAL (Highest Priority)
      const isExplicitlyDenied = 
        (protectedRoute.startsWith('/sales') && permissions.record_sales === false) ||
        (protectedRoute === '/reports' && permissions.view_reports === false) ||
        (protectedRoute.startsWith('/inventory') && permissions.manage_inventory === false) ||
        (protectedRoute === '/customers' && permissions.view_customers === false) ||
        (protectedRoute === '/audit-log' && permissions.view_audit_logs === false) ||
        (protectedRoute === '/online-orders' && permissions.manage_online_orders === false);

      // 2. Check for explicit granular ALLOWANCE
      const isExplicitlyAllowed = 
        (protectedRoute === '/reports' && permissions.view_reports === true) ||
        (protectedRoute.startsWith('/inventory') && permissions.manage_inventory === true) ||
        (protectedRoute === '/customers' && permissions.view_customers === true) ||
        (protectedRoute === '/audit-log' && permissions.view_audit_logs === true) ||
        (protectedRoute === '/online-orders' && permissions.manage_online_orders === true) ||
        (protectedRoute.startsWith('/sales') && permissions.record_sales === true);

      // Final decision logic
      const hasAccess = isSuperAdmin || (allowedRoles.includes(userRole) && !isExplicitlyDenied) || isExplicitlyAllowed;

      if (!hasAccess) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to view this page.",
        });
        
        // If they can't access POS, send them to dashboard. Otherwise send to POS.
        const canAccessPos = permissions.record_sales !== false && (userRole === 'admin' || userRole === 'manager' || userRole === 'vendor_operator');
        router.replace(canAccessPos ? '/sales/pos/select-products' : '/dashboard');
      }
    }
  }, [pathname, currentUserProfile, isLoading, isUserLoading, router, toast]);

  // --- End of Hooks ---
  
  // New Effect: Trigger Push Notifications when new unread notifications arrive
  const [lastNotifiedId, setLastNotifiedId] = React.useState<string | null>(null);
  const [permissionPopup, setPermissionPopup] = React.useState<{ id: string, title: string, body: string } | null>(null);

  const handleClosePermissionPopup = React.useCallback(async () => {
    if (permissionPopup && firestore && currentUserProfile) {
      try {
        const docRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, permissionPopup.id);
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(docRef, { read: true });
      } catch (e) {
        console.error('Error marking permission notification as read:', e);
      }
    }
    setPermissionPopup(null);
  }, [permissionPopup, firestore, currentUserProfile]);

  React.useEffect(() => {
    if (userNotifications && userNotifications.length > 0) {
      // Check for unread permission updates to show as a popup
      const unreadPermissionNotifs = userNotifications.filter(n => !n.read && (n as any).type === 'permission_update');
      if (unreadPermissionNotifs.length > 0 && !permissionPopup) {
        // Show the oldest unread one first
        const notif = unreadPermissionNotifs[unreadPermissionNotifs.length - 1];
        setPermissionPopup({ id: notif.id, title: notif.title, body: notif.body });
      }

      const latestNotif = userNotifications[0]; // Already ordered by desc createdAt
      if (!latestNotif.read && latestNotif.id !== lastNotifiedId) {
        // We only notify if the notification is less than 30 seconds old to avoid 
        // flooding on initial load or re-syncs.
        const createdDate = safeToDate(latestNotif.createdAt);
        const now = new Date();
        const diffSeconds = (now.getTime() - createdDate.getTime()) / 1000;

        if (diffSeconds < 30) {
          notify(latestNotif.title, latestNotif.body);
          setLastNotifiedId(latestNotif.id);
        }
      }
    }
  }, [userNotifications, lastNotifiedId, notify]);

  // --- Automated Notification Triggers ---

  // 1. Subscription Reminders (3 days before expiry)
  React.useEffect(() => {
    if (businessInstance && businessInstance.trialExpiresAt && currentUserProfile) {
      const expiryDate = safeToDate(businessInstance.trialExpiresAt);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays > 0) {
        const lastReminded = localStorage.getItem(`reminded_expiry_${businessInstance.id}`);
        const todayStr = now.toISOString().split('T')[0];
        
        if (lastReminded !== todayStr) {
          addDoc(collection(firestore, `users/${currentUserProfile.id}/notifications`), {
            title: "Subscription Reminder",
            body: `Your Zeneva subscription will expire in ${diffDays} day${diffDays === 1 ? '' : 's'}. Renew now to avoid any service interruption.`,
            createdAt: serverTimestamp(),
            read: false,
            type: 'billing'
          }).then(() => {
            localStorage.setItem(`reminded_expiry_${businessInstance.id}`, todayStr);
          }).catch(console.error);
        }
      }
    }
  }, [businessInstance, currentUserProfile, firestore]);

  // 2. New Online Orders Alerts
  const [lastOnlineOrderId, setLastOnlineOrderId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (onlineOrders && onlineOrders.length > 0 && currentUserProfile) {
      // Find the latest pending order
      const latestPendingOrder = [...onlineOrders]
        .sort((a, b) => {
          const dateA = safeToDate(a.createdAt).getTime();
          const dateB = safeToDate(b.createdAt).getTime();
          return dateB - dateA;
        })
        .find(o => o.status === 'pending');

      if (latestPendingOrder && latestPendingOrder.id !== lastOnlineOrderId) {
        const orderDate = safeToDate(latestPendingOrder.createdAt);
        const now = new Date();
        const diffSeconds = (now.getTime() - orderDate.getTime()) / 1000;

        // Only notify if it's a "fresh" order (less than 10 mins old) to avoid back-notifying
        if (diffSeconds < 600) {
          addDoc(collection(firestore, `users/${currentUserProfile.id}/notifications`), {
            title: "New Online Order!",
            body: `You received a new order for ${businessInstance?.settings?.currency || 'NGN'} ${latestPendingOrder.total}.`,
            createdAt: serverTimestamp(),
            read: false,
            type: 'order',
            orderId: latestPendingOrder.id
          }).catch(console.error);
        }
        setLastOnlineOrderId(latestPendingOrder.id);
      }
    }
  }, [onlineOrders, lastOnlineOrderId, currentUserProfile, businessInstance, firestore]);

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

  if (businessInstance?.status === 'deleted' || (hasPermissionError && !isLoading)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {businessInstance?.status === 'deleted' ? "Business Deleted" : "Access Revoked"}
            </CardTitle>
            <CardDescription>
              {businessInstance?.status === 'deleted' 
                ? "The business associated with this account has been deleted by the owner."
                : "Your access to this business or resource has been revoked or expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasPermissionError && permissionErrorDetails 
                ? `Details: ${permissionErrorDetails.operation} on ${permissionErrorDetails.path}`
                : "For security, please log out and contact your administrator if you believe this is an error."}
            </p>
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
    const permissions = currentUserProfile?.permissions || {};
    
    return items.filter(item => {
      // 1. Explicitly Enabled Override
      if (item.href.startsWith('/sales') && permissions.record_sales === true) return true;
      if (item.href === '/reports' && permissions.view_reports === true) return true;
      if (item.href.startsWith('/inventory') && permissions.manage_inventory === true) return true;
      if (item.href === '/customers' && permissions.view_customers === true) return true;
      if (item.href === '/audit-log' && permissions.view_audit_logs === true) return true;
      if (item.href === '/online-orders' && permissions.manage_online_orders === true) return true;

      // 2. Role Match
      const roleMatch = !item.roles || (item.roles as string[]).includes(userRole);
      if (!roleMatch) return false;

      // 3. Explicitly Disabled Override (for roles that have it by default)
      if (item.href.startsWith('/sales') && permissions.record_sales === false) return false;
      if (item.href === '/reports' && permissions.view_reports === false) return false;
      if (item.href.startsWith('/inventory') && permissions.manage_inventory === false) return false;
      if (item.href === '/customers' && permissions.view_customers === false) return false;
      if (item.href === '/audit-log' && permissions.view_audit_logs === false) return false;
      if (item.href === '/online-orders' && permissions.manage_online_orders === false) return false;

      return true;
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

  const ROUTE_PERMISSIONS: Record<string, string[]> = {
    '/dashboard': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/inventory/debts': ['admin', 'manager', 'owner', 'super-admin'],
    '/inventory/troubleshoot': ['admin', 'manager', 'owner', 'super-admin'],
    '/inventory/add': ['admin', 'manager', 'owner', 'super-admin'],
    '/inventory': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/sales': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/storefront': ['admin', 'owner', 'super-admin'],
    '/online-orders': ['admin', 'manager', 'owner', 'super-admin'],
    '/receipts': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/invoices': ['admin', 'manager', 'owner', 'super-admin'],
    '/reports': ['admin', 'owner', 'super-admin'],
    '/ai-insights': ['admin', 'manager', 'owner', 'super-admin'],
    '/customers': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/users': ['admin', 'owner', 'super-admin'],
    '/audit-log': ['admin', 'owner', 'super-admin'],
    '/billing': ['admin', 'owner', 'super-admin'],
    '/settings': ['admin', 'owner', 'super-admin'],
    '/support': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
    '/achievements': ['admin', 'manager', 'vendor_operator', 'owner', 'super-admin'],
  };

  const protectedRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname.startsWith(route));

  let hasRouteAccess = true;
  if (protectedRoute && currentUserProfile && !isLoading && !isUserLoading) {
    const userRole = currentUserProfile.role;
    const isSuperAdmin = currentUserProfile.email === 'belloimam431@gmail.com';
    const allowedRoles = ROUTE_PERMISSIONS[protectedRoute];
    const permissions = currentUserProfile.permissions || {};

    const isExplicitlyDenied = 
      (protectedRoute.startsWith('/sales') && permissions.record_sales === false) ||
      (protectedRoute === '/reports' && permissions.view_reports === false) ||
      (protectedRoute.startsWith('/inventory') && permissions.manage_inventory === false) ||
      (protectedRoute === '/customers' && permissions.view_customers === false) ||
      (protectedRoute === '/audit-log' && permissions.view_audit_logs === false) ||
      (protectedRoute === '/online-orders' && permissions.manage_online_orders === false);

    const isExplicitlyAllowed = 
      (protectedRoute === '/reports' && permissions.view_reports === true) ||
      (protectedRoute.startsWith('/inventory') && permissions.manage_inventory === true) ||
      (protectedRoute === '/customers' && permissions.view_customers === true) ||
      (protectedRoute === '/audit-log' && permissions.view_audit_logs === true) ||
      (protectedRoute === '/online-orders' && permissions.manage_online_orders === true) ||
      (protectedRoute.startsWith('/sales') && permissions.record_sales === true);

    hasRouteAccess = isSuperAdmin || (allowedRoles.includes(userRole) && !isExplicitlyDenied) || isExplicitlyAllowed;
  }

  const formatBodyText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };
  return (
    <>
      <TooltipProvider>
        <SidebarProvider defaultOpen={true} className="h-full">
          <div
            className="relative flex h-full w-full overflow-hidden high-fidelity-shell"
          >
            <Confetti trigger={isConfettiActive} onComplete={handleConfettiComplete} />
            <Sidebar collapsible="icon" className="flex-col bg-sidebar border-r no-print overflow-hidden">
              <SidebarHeader className="p-2 flex items-center gap-2 justify-center">
                <Link href="/dashboard" className="flex items-center justify-center h-10 w-full">
                  {/* Expanded state logo */}
                  <CachedImage 
                    src={AppConfig.logoUrl} 
                    alt="Zeneva Logo" 
                    className="w-28 h-auto group-data-[state=expanded]:block hidden" 
                  />
                  {/* Collapsed state logo */}
                  <div className="w-12 h-12 group-data-[state=collapsed]:block hidden">
                    <CachedImage 
                      src={AppConfig.logoIconUrl} 
                      alt="Zeneva Icon" 
                      className="w-10 h-10 mx-auto" 
                    />
                  </div>
                </Link>
              </SidebarHeader>
              <SidebarContent className="flex-1 p-2">
                <div className="flex-1 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-muted-foreground/20">
                  <SidebarMenu>
                    {!isMounted || isUserLoading ? (
                      // Show skeletons for the top 5 nav items while loading or before mounting
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
                </div>
              </SidebarContent>
              <SidebarFooter className="p-2 pb-12 md:pb-8">
                <SidebarMenu>
                  {isMounted && visibleBottomLinks.map((link) => (
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
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <header className="no-print flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6 z-10">
                <SidebarTrigger className="hidden md:flex" />
                <BusinessHealthIndicator />
                {isMounted && <Badge variant="outline" className="hidden md:inline-flex text-[10px] h-5 bg-muted/50 font-mono opacity-60 hover:opacity-100 transition-opacity">v{AppConfig.version}</Badge>}
                <div className="flex-1" />
                <div className="flex items-center gap-1 md:gap-2 ml-auto">
                  <QueueStatus />
                  <NetworkStatusIndicator />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HeldSalesDrawer />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Parked Sales</p>
                    </TooltipContent>
                  </Tooltip>
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
                                  {allNotifications.slice(0, 5).map(notif => {
                                    const isClickable = notif.clickable !== false;
                                    const content = (
                                      <div className="flex items-start gap-2 p-4 pr-10">
                                        <div className="space-y-1 flex-1">
                                          <p className={`font-semibold text-sm ${!notif.isGlobal && !notif.read ? 'text-primary' : ''}`}>
                                            {notif.isGlobal && (
                                              <Badge variant="outline" className="mr-2 h-4 px-1 text-[8px] uppercase tracking-tighter">System</Badge>
                                            )}
                                            {notif.title}
                                          </p>
                                          <p className="text-xs text-muted-foreground line-clamp-2">{notif.body}</p>
                                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                                            {notif.createdAt ? formatDistanceToNow(safeToDate(notif.createdAt), { addSuffix: true }) : ''}
                                          </p>
                                        </div>
                                      </div>
                                    );

                                    return (
                                      <div key={notif.id} className={`border-b last:border-b-0 group relative ${!notif.isGlobal && !notif.read ? 'bg-primary/5' : ''}`}>
                                        {isClickable ? (
                                          <Link
                                            href={getNotificationLink(notif)}
                                            className="block hover:bg-muted/30 transition-colors"
                                          >
                                            {content}
                                          </Link>
                                        ) : (
                                          <div className="block">
                                            {content}
                                          </div>
                                        )}
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
                                    );
                                  })}
                                <Button
                                  variant="ghost"
                                  className="w-full text-xs font-bold py-3 rounded-none border-t hover:bg-black hover:text-white transition-all duration-200"
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
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full flex">
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
              <main id="app-main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 md:pb-6 font-body smooth-scroll bg-background relative">
                <div className={cn("w-full transition-all duration-700 min-h-full pb-32 md:pb-0", showSubscriptionBlock && "blur-md pointer-events-none select-none opacity-40 scale-[0.98]")}>
                  {hasRouteAccess ? children : (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card rounded-2xl border shadow-sm animate-in fade-in duration-300">
                      <div className="p-4 bg-destructive/10 rounded-full text-destructive mb-4">
                        <ShieldAlert className="h-10 w-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">Access Denied</h3>
                      <p className="text-muted-foreground max-w-sm mb-6">
                        You do not have the required permissions to view this page. Redirecting you...
                      </p>
                      <Loader className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {showSubscriptionBlock && (
                   <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-background/5 backdrop-blur-[2px] animate-in fade-in duration-500">
                    <Card className="w-full max-w-lg border-2 border-dashed border-orange-500/20 shadow-2xl bg-background/95 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-700">
                      <CardHeader className="pt-10 pb-6 text-center">
                        <div className="mx-auto mb-8 relative">
                           <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                           <img 
                             src="/trial-expired.png" 
                             alt="Trial Expired" 
                             className="h-32 w-auto relative z-10 drop-shadow-2xl animate-float"
                           />
                        </div>
                        <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground">
                          Trial Expired
                        </CardTitle>
                        <CardDescription className="text-lg mt-3 px-4">
                          Your trial period or subscription has ended. To continue using <span className="font-bold text-foreground">{(businessInstance?.name || 'your business').toLowerCase()}</span>, please subscribe to a plan.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-8 pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 shadow-sm">
                            <h4 className="text-xs font-bold text-primary mb-4 uppercase tracking-wider">Restricted Features</h4>
                            <ul className="text-sm space-y-3 text-muted-foreground font-medium">
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> POS & Sales</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Storefront</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Zen AI</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Customers</li>
                            </ul>
                          </div>
                          <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex flex-col justify-center text-center">
                            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Unlock all features instantly with our business-ready plans.</p>
                            <Button asChild className="w-full h-12 shadow-lg shadow-orange-500/20 hover:scale-[1.05] active:scale-95 transition-all duration-300 bg-orange-500 hover:bg-orange-600 font-bold">
                              <Link href="/billing">
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Review Plans
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
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

      {/* Permission Update Popup */}
      <Dialog open={!!permissionPopup} onOpenChange={(open) => {
        if (!open) {
          handleClosePermissionPopup();
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg border-2 border-primary/20 bg-background shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-primary shadow-sm border border-primary/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">{permissionPopup?.title}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {formatBodyText(permissionPopup?.body || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2">
            <Button onClick={handleClosePermissionPopup} className="w-full sm:w-1/2" size="lg">
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
