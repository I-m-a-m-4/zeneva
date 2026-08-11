
'use client';

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { format } from 'date-fns';
import type { AdminNotification } from '@/types';
import { Badge } from '@/components/ui/badge';
import { updateDoc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const notificationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  body: z.string().min(5, "Message body is too short."),
  link: z.string().optional(),
  targetEmail: z.string().email("Invalid email format").or(z.literal("")).optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

const PlayStoreIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.4 43.1C7.2 42.9 7 42.6 7 42.1V5.9C7 5.4 7.2 5.1 7.4 4.9L24.8 22.3L7.4 43.1Z" fill="#3BCEFF"/>
    <path d="M29.5 27L24.8 22.3L7.4 43.1L27.6 31.8C28.5 31.3 29.2 30.2 29.5 29V27Z" fill="#EA323C"/>
    <path d="M29.5 21L24.8 22.3L7.4 4.9L27.6 16.2C28.7 16.8 29.3 17.9 29.5 19V21Z" fill="#00D779"/>
    <path d="M29.5 21L29.5 27C30.1 26.6 30.7 26.1 31.1 25.5L40.7 20.1C42.2 19.3 42.2 17.1 40.7 16.3L31.1 10.9C30.6 10.6 30 10.4 29.5 10.4V21Z" fill="#FFC90F"/>
  </svg>
);

const MicrosoftIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.4 11.4H0V0H11.4V11.4Z" fill="#F25022"/>
    <path d="M24 11.4H12.6V0H24V11.4Z" fill="#7FBA00"/>
    <path d="M11.4 24H0V12.6H11.4V24Z" fill="#00A4EF"/>
    <path d="M24 24H12.6V12.6H24V24Z" fill="#FFB900"/>
  </svg>
);


// Titles here carry no emoji on purpose. These render in the in-app
// notification centre, in the OS notification tray and in the push payload —
// a picture character in the title line is what makes a business tool read
// like a mailing list. The type icon already carries that signal.
const PREDEFINED_TEMPLATES = [
  {
    id: 'ceo_chat',
    title: 'Message the founder directly',
    body: 'Questions, feedback, or a feature your shop needs? The CEO Direct Line goes straight to Bello Imam — not a ticket queue.',
    link: '/support',
    iconName: 'MessageSquare',
    badge: 'Onboarding / Day 3'
  },
  {
    id: 'playstore_app',
    title: 'Zeneva on Android',
    body: 'Check stock and take sales away from the counter. Available on Google Play.',
    link: 'https://play.google.com/store/apps/details?id=com.zeneva.app&hl=en-US&ah=8ZdJB3DBf5hWEO6U2hBOws2DuyY',
    iconName: 'Smartphone',
    badge: 'Google Play App'
  },
  {
    id: 'msstore_app',
    title: 'Zeneva on Windows',
    body: 'Faster receipts and offline printing on the shop PC. Available on the Microsoft Store.',
    link: 'https://apps.microsoft.com/detail/9nvn0f8njwmj?hl=en-US&gl=NG&ocid=pdpshare',
    iconName: 'Monitor',
    badge: 'Microsoft Store App'
  },
  {
    id: 'feature_update',
    title: 'New platform upgrade available',
    body: "Zeneva has been upgraded with faster offline sync, enhanced sales reports, and instant audio terminal alerts. Tap to explore.",
    link: '/dashboard',
    iconName: 'Sparkles',
    badge: 'Product Release'
  },
  {
    id: 'terminal_alerts',
    title: 'Instant bank payment alerts',
    body: 'Never miss a customer bank transfer. Receive instant audio alerts right in your physical store.',
    link: '/terminal-alerts',
    iconName: 'Bell',
    badge: 'Terminal / POS'
  },
  {
    id: 'inventory_audit',
    title: 'Low stock and inventory audit',
    body: 'Keep your business healthy. Review your low stock products and reorder points now.',
    link: '/inventory',
    iconName: 'Package',
    badge: 'Inventory'
  }
];

export default function AdminNotificationsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = React.useState(false);
    const [notificationToDelete, setNotificationToDelete] = React.useState<AdminNotification | null>(null);

    const form = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: { title: "", body: "", link: "/support", targetEmail: "" },
    });

    const notificationsQuery = useMemoFirebase(
        () => query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')),
        [firestore]
    );
    const { data: notifications, isLoading } = useCollection<AdminNotification>(notificationsQuery);

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: usersData } = useCollection<any>(usersQuery);
    const userOptions = React.useMemo(() => {
        if (!usersData) return [];
        return usersData.map(u => ({ label: `${u.name || 'Unknown'} (${u.email})`, value: u.email || '' })).filter(u => u.value);
    }, [usersData]);

    const onSubmit = async (values: NotificationFormValues) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send notifications.' });
            return;
        }
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...values,
                targetEmail: values.targetEmail || null,
                sentBy: user.uid,
                createdAt: serverTimestamp(),
                deleted: false,
            });
            toast({ variant: 'success', title: 'Notification Sent', description: values.targetEmail ? `Notification targeted to ${values.targetEmail}` : 'Your notification has been sent to all users.' });
            form.reset({ title: "", body: "", link: "/support", targetEmail: "" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplyTemplate = (tpl: typeof PREDEFINED_TEMPLATES[0]) => {
        form.setValue('title', tpl.title);
        form.setValue('body', tpl.body);
        form.setValue('link', tpl.link);
        toast({ title: 'Template Applied', description: `Loaded "${tpl.title}" template.` });
    };
    
    const handleDeleteNotification = async () => {
        if (!notificationToDelete || !firestore) return;
        try {
            await updateDoc(doc(firestore, 'notifications', notificationToDelete.id), {
                deleted: true,
                deletedAt: serverTimestamp(),
            });
            toast({ variant: 'success', title: 'Notification Deleted', description: 'The notification has been marked as deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete notification.' });
        } finally {
            setNotificationToDelete(null);
        }
    };

    return (
        <>
            <div className="space-y-6">
                {/* Predefined Templates Section */}
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            Predefined Notification Templates
                        </CardTitle>
                        <CardDescription>Click any template below to auto-fill title, message, and target action link.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {PREDEFINED_TEMPLATES.map((tpl) => (
                                <div 
                                    key={tpl.id} 
                                    className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md hover:border-primary/40 group"
                                    onClick={() => handleApplyTemplate(tpl)}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{tpl.badge}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{tpl.link}</span>
                                        </div>
                                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                                            {tpl.id === 'playstore_app' && <PlayStoreIcon className="w-4 h-4 shrink-0" />}
                                            {tpl.id === 'msstore_app' && <MicrosoftIcon className="w-4 h-4 shrink-0" />}
                                            {tpl.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tpl.body}</p>
                                    </div>
                                    <Button size="sm" variant="secondary" className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        Use Template
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send Notification</CardTitle>
                                <CardDescription>Send a platform-wide notification or direct it to a specific user.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title</FormLabel>
                                                <FormControl><Input placeholder="e.g., Message the founder directly" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="body" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message</FormLabel>
                                                <FormControl><Textarea placeholder="Enter your notification message here." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="link" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Target Link (Redirect on Click)</FormLabel>
                                                <FormControl><Input placeholder="e.g., /support or /terminal-alerts" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="targetEmail" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Target Email (Optional)</FormLabel>
                                                <Combobox 
                                                    options={userOptions} 
                                                    value={field.value || ""} 
                                                    onChange={field.onChange} 
                                                    placeholder="Select a user (leave blank for all)" 
                                                    emptyPlaceholder="No users found"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Send className="mr-2 h-4 w-4" /> Send Notification
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Sent Notifications</CardTitle>
                            <CardDescription>History of previously sent notifications.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={3} className="text-center">Loading history...</TableCell></TableRow>
                                    ) : notifications && notifications.length > 0 ? (
                                        notifications.map(notif => (
                                            <TableRow key={notif.id} className={(notif as any).deleted ? 'opacity-80 bg-muted/20' : ''}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className={`font-semibold text-sm ${(notif as any).deleted ? 'line-through text-muted-foreground' : ''}`}>{notif.title}</p>
                                                        {(notif as any).deleted && (
                                                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase gap-1 flex items-center shadow-none">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                Deleted
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className={`text-xs ${(notif as any).deleted ? 'line-through text-muted-foreground/70' : 'text-muted-foreground'} whitespace-normal break-words max-w-[200px] sm:max-w-md`}>{notif.body}</p>
                                                    {(notif as any).deleted && (
                                                        <p className="text-[10px] text-destructive italic mt-1 w-full break-words whitespace-normal max-w-[200px] sm:max-w-md">
                                                            🚫 This message was deleted. But admins can still see the original content.
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">
                                                    <div>{(notif as any).link || '/support'}</div>
                                                    {(notif as any).targetEmail ? (
                                                        <Badge variant="outline" className="mt-1 text-[10px] font-sans border-primary/20 text-primary bg-primary/5 px-1">
                                                            To: {(notif as any).targetEmail}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="mt-1 text-[10px] font-sans px-1 text-slate-500">
                                                            All Users
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="destructive" size="icon" onClick={() => setNotificationToDelete(notif)} disabled={(notif as any).deleted}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={3} className="text-center">No notifications sent yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AlertDialog open={!!notificationToDelete} onOpenChange={(open) => !open && setNotificationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the notification titled "<strong>{notificationToDelete?.title}</strong>".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteNotification} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
