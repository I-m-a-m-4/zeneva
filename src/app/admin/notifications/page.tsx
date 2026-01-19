
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
import { format } from 'date-fns';
import type { AdminNotification } from '@/types';
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
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = React.useState(false);
    const [notificationToDelete, setNotificationToDelete] = React.useState<AdminNotification | null>(null);

    const form = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: { title: "", body: "" },
    });

    const notificationsQuery = useMemoFirebase(
        () => query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')),
        [firestore]
    );
    const { data: notifications, isLoading } = useCollection<AdminNotification>(notificationsQuery);

    const onSubmit = async (values: NotificationFormValues) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send notifications.' });
            return;
        }
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...values,
                sentBy: user.uid,
                createdAt: serverTimestamp(),
            });
            toast({ variant: 'success', title: 'Notification Sent', description: 'Your notification has been sent to all users.' });
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteNotification = async () => {
        if (!notificationToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'notifications', notificationToDelete.id));
            toast({ variant: 'success', title: 'Notification Deleted', description: 'The notification has been successfully deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete notification.' });
        } finally {
            setNotificationToDelete(null);
        }
    };

    return (
        <>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Send Notification</CardTitle>
                            <CardDescription>Send a platform-wide notification to all users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl><Input placeholder="e.g., System Maintenance" {...field} /></FormControl>
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
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="text-center">Loading history...</TableCell></TableRow>
                                ) : notifications && notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <TableRow key={notif.id}>
                                            <TableCell className="font-medium">{notif.title}</TableCell>
                                            <TableCell>{notif.createdAt ? format(notif.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="destructive" size="icon" onClick={() => setNotificationToDelete(notif)}>
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
