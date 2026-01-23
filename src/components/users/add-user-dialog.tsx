'use client';

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { sendInvitationEmail } from '@/lib/email';

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessId: string;
  businessName: string;
  inviterName: string;
}

const inviteUserSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email("Please enter a valid email."),
    role: z.enum(['manager', 'vendor_operator'], {
        required_error: "Please select a role."
    }),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export default function AddUserDialog({ isOpen, onOpenChange, businessId, businessName, inviterName }: AddUserDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
        name: "",
        email: "",
        role: undefined,
    },
  });

  const handleInvite = async (values: InviteUserFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
        const invitationsRef = collection(firestore, 'invitations');
        await addDoc(invitationsRef, {
            ...values,
            businessId,
            createdAt: serverTimestamp(),
        });
        
        try {
            await sendInvitationEmail({
                to_email: values.email,
                to_name: values.name,
                business_name: businessName,
                inviter_name: inviterName,
            });
            toast({
                variant: 'success',
                title: 'Invitation Sent!',
                description: `${values.name} has been invited. They will be added to your business upon signing up with their email.`,
            });
        } catch (emailError: any) {
            toast({
                variant: 'warning',
                title: 'Invitation Saved, Email Failed',
                description: emailError?.message || 'The email could not be sent. Please check your EmailJS configuration.',
                duration: 10000
            });
        }

        form.reset();
        onOpenChange(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Invitation Failed',
            description: 'Could not save invitation record. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Enter the user's details. They will receive an email and be able to join your business once they sign up.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="user@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="vendor_operator">Vendor Operator</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter className='mt-6'>
                    <Button variant="outline" size="lg" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Send Invitation
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
