
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Customer } from '@/types';
import { usePOS } from '@/context/pos-context';

interface AddCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessId: string;
  customers: Customer[] | null;
}

export default function AddCustomerDialog({ isOpen, onOpenChange, businessId, customers }: AddCustomerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { triggerRefresh } = usePOS();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setIsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({ title: 'Missing fields', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }
    if (!businessId) {
      toast({ title: 'Error', description: 'Business ID is missing.', variant: 'destructive' });
      return;
    }

    if (email) {
      const emailExists = customers?.some(customer => customer.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        toast({ title: 'Customer Exists', description: 'A customer with this email already exists.', variant: 'destructive' });
        return;
      }
    }

    if (phone) {
      const phoneExists = customers?.some(customer => customer.phone === phone);
      if (phoneExists) {
        toast({ title: 'Duplicate Phone Number', description: 'A customer with this phone number already exists.', variant: 'destructive' });
        return;
      }
    }

    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'customers'), {
        name,
        email,
        phone,
        businessId,
        loyaltyPoints: 0,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Customer Added', description: `${name} has been added.`, variant: 'success' });
      triggerRefresh();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not add customer.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the details for the new customer. This will add them to your CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email (Optional)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone (Optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
