
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
import type { Customer } from '@/types';
import { usePOS } from '@/context/pos-context';
import { Separator } from '@/components/ui/separator';
import { getIndustryConfig } from '@/lib/industry';
import { Loader2 } from 'lucide-react';

interface AddCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessId: string;
  customers: Customer[] | null;
}

export default function AddCustomerDialog({ isOpen, onOpenChange, businessId, customers }: AddCustomerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { triggerRefresh, addToQueue } = usePOS();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const { business } = usePOS();
  const industryConfig = getIndustryConfig(business?.settings?.industry);


  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCode('');
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

    if (code) {
      const codeExists = customers?.some(customer => customer.code?.toLowerCase() === code.toLowerCase());
      if (codeExists) {
        toast({ title: 'Duplicate Code', description: 'A customer with this unique code already exists.', variant: 'destructive' });
        return;
      }
    }

    if (isSaving) return;
    setIsSaving(true);
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      const newCustomerData = {
        name,
        email,
        phone,
        code: code.trim().toUpperCase(),
        businessId,
        loyaltyPoints: 0,
        totalSpent: 0,
      };

      if (isTauri) {
        // Use offline queue for desktop
        addToQueue({
          type: 'add-customer',
          payload: newCustomerData,
        }, `Adding customer: ${name}`);
        
        toast({ title: 'Success', description: `${name} has been added and will be synced.`, variant: 'success' });
        triggerRefresh();
        onOpenChange(false);
        resetForm();
      } else {
        // Use direct firestore for web
        await addDoc(collection(firestore, 'customers'), {
          ...newCustomerData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Customer Added', description: `${name} has been added.`, variant: 'success' });
        triggerRefresh();
        onOpenChange(false);
        resetForm();
      }
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the details for the new customer. This will add them to your CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Unique Code <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CUST-001" />
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
