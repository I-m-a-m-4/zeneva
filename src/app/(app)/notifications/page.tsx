'use client';

import * as React from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { usePOS } from '@/context/pos-context';
import type { UserNotification, AdminNotification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Globe, X, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ai-insights/markdown';
import { openExternal } from '@/lib/platform';
import { collapseDuplicateNotifications } from '@/lib/lifecycle-notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { currentUserProfile } = usePOS();
  const { toast } = useToast();
  const router = useRouter();

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
    // Accounts that ran the old localStorage-guarded schedule have repeats of
    // the same announcement sitting in Firestore. Fold them to the newest copy
    // rather than deleting anyone's data. Operational alerts pass through.
    return collapseDuplicateNotifications(combined as any[]);
  }, [userNotifications, adminNotifications, isLoadingUserNotifications, isLoadingAdminNotifications]);

  // Counted off the collapsed list so the badge matches what is actually on
  // screen. "Mark all read" and "Clear All" still act on every raw document,
  // including the folded-away duplicates.
  const unreadCount = React.useMemo(
    () => allNotifications.filter((n: any) => !n.isGlobal && !n.read).length,
    [allNotifications]
  );

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
    toast({ title: "All notifications marked as read" });
  }, [currentUserProfile, unreadCount, userNotifications, firestore, toast]);

  const handleDeleteNotification = React.useCallback(async (notifId: string, isGlobal: boolean) => {
    if (!currentUserProfile || isGlobal || !firestore) return;
    try {
      const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notifId);
      const batch = writeBatch(firestore);
      batch.delete(notifRef);
      await batch.commit();
      toast({ title: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({ variant: "destructive", title: "Failed to delete notification" });
    }
  }, [currentUserProfile, firestore, toast]);

  const handleClearAll = React.useCallback(async () => {
    if (!currentUserProfile || !userNotifications || !firestore || userNotifications.length === 0) return;
    try {
      const batch = writeBatch(firestore);
      userNotifications.forEach(notif => {
        const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notif.id);
        batch.delete(notifRef);
      });
      await batch.commit();
      toast({ title: "All notifications cleared" });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast({ variant: "destructive", title: "Failed to clear notifications" });
    }
  }, [currentUserProfile, userNotifications, firestore, toast]);

  const getNotificationLink = React.useCallback((notif: any): string => {
    if (notif.link) return notif.link;
    if (notif.type === 'billing' || notif.body?.toLowerCase().includes('expire') || notif.body?.toLowerCase().includes('subscribe') || notif.title?.toLowerCase().includes('subscription')) return '/billing';
    if (notif.type === 'inventory' || notif.body?.toLowerCase().includes('stock') || notif.body?.toLowerCase().includes('backorder')) return '/inventory';
    if (notif.type === 'sale' || notif.body?.toLowerCase().includes('order')) return '/online-orders';
    if (notif.type === 'sync') return '/audit-log';
    if (notif.isGlobal) return '/support';
    return '/';
  }, []);

  const handleNotificationClick = React.useCallback(async (notif: any) => {
    if (!currentUserProfile || !firestore) return;
    
    // Mark as read if user notification
    if (!notif.isGlobal && !notif.read) {
      try {
        const notifRef = doc(firestore, `users/${currentUserProfile.id}/notifications`, notif.id);
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(notifRef, { read: true });
      } catch (e) {
        console.error("Error marking notification as read:", e);
      }
    }

    const targetLink = getNotificationLink(notif);

    // Store links and other external URLs go through openExternal: window.open
    // is a no-op inside the Tauri webview, so on desktop and Android the
    // "download us on the Microsoft Store" notification did nothing at all.
    // openExternal hands off to the OS and prefers the ms-windows-store deep
    // link so the Store app opens rather than a browser tab.
    if (/^https?:\/\//i.test(targetLink)) {
      await openExternal(targetLink);
    } else {
      router.push(targetLink);
    }
  }, [currentUserProfile, firestore, router, getNotificationLink]);

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
              <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-foreground">
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-primary hover:bg-primary text-primary-foreground font-bold rounded-full px-2">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-muted-foreground">Manage your system alerts, updates, and messages.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none border-primary/20 text-primary hover:bg-primary/5" 
            onClick={handleMarkAsRead} 
            disabled={unreadCount === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none border-destructive/20 text-destructive hover:bg-destructive/10" 
            onClick={handleClearAll} 
            disabled={!userNotifications || userNotifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoadingUserNotifications || isLoadingAdminNotifications ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse bg-muted/50 border-none shadow-sm">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : allNotifications.length > 0 ? (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {allNotifications.map((notif) => (
              <Card 
                key={notif.id} 
                className={cn(
                  "overflow-hidden border transition-all hover:shadow-md cursor-pointer group hover:bg-muted/30", 
                  !notif.isGlobal && !notif.read ? 'bg-primary/5 border-l-4 border-l-primary shadow-sm' : 'bg-card border-border/40 shadow-sm'
                )}
                onClick={() => handleNotificationClick(notif)}
              >
                <CardContent className="p-4 sm:p-5 flex gap-4">
                  <div className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full flex items-center justify-center transition-colors", 
                    notif.isGlobal ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20' : 
                    !notif.read ? 'bg-primary text-primary-foreground shadow-md' : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                  )}>
                    {notif.isGlobal ? <Globe className="h-5 w-5 sm:h-6 sm:w-6" /> : <Bell className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </div>
                  
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <h4 className={cn(
                        "font-bold text-sm sm:text-base leading-snug group-hover:text-primary transition-colors",
                        !notif.read && "text-foreground"
                      )}>
                        {notif.title}
                      </h4>
                      <span className="text-xs font-medium text-muted-foreground/70 shrink-0 mt-1 sm:mt-0 bg-muted/50 px-2 py-0.5 rounded-full">
                        {notif.createdAt ? formatDistanceToNow(safeToDate(notif.createdAt), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    
                    <Markdown className="text-sm text-muted-foreground leading-relaxed break-words pr-8">
                      {notif.body || ''}
                    </Markdown>
                    
                    <div className="pt-2 flex items-center gap-3">
                      <Badge variant="secondary" className={cn(
                        "text-[10px] font-mono py-0 px-2 h-5 flex items-center",
                        notif.isGlobal ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
                      )}>
                        {notif.isGlobal ? 'SYSTEM BROADCAST' : (notif.type || 'ACCOUNT ALERT').toUpperCase()}
                      </Badge>
                      
                      {!notif.isGlobal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notif.id, false);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center bg-muted/20 rounded-2xl border border-dashed p-8">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6 shadow-inner">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">You're all caught up!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You don't have any new notifications. When you receive system alerts, inventory warnings, or sales updates, they will appear here.
            </p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
