

'use client';

import *as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageTitle from '@/components/shared/page-title';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Percent, Loader2, Trash2, Globe, Landmark, Upload, Building, CreditCard, Banknote, ShieldQuestion } from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { BusinessInstance, UserProfile } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { usePOS } from '@/context/pos-context';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const NIGERIAN_BANKS = [
    { label: "Access Bank", value: "044" },
    { label: "Citibank", value: "023" },
    { label: "Ecobank Nigeria", value: "050" },
    { label: "Fidelity Bank", value: "070" },
    { label: "First Bank of Nigeria", value: "011" },
    { label: "First City Monument Bank", value: "214" },
    { label: "Globus Bank", value: "00103" },
    { label: "Guaranty Trust Bank", value: "058" },
    { label: "Heritage Bank", value: "030" },
    { label: "Jaiz Bank", value: "301" },
    { label: "Keystone Bank", value: "082" },
    { label: "Kuda Bank", value: "50211" },
    { label: "Opay", value: "999992" },
    { label: "Palmpay", value: "999991" },
    { label: "Parallex Bank", value: "526" },
    { label: "Paystack", value: "12345" },
    { label: "Polaris Bank", value: "076" },
    { label: "Providus Bank", value: "101" },
    { label: "Stanbic IBTC Bank", value: "221" },
    { label: "Standard Chartered Bank", value: "068" },
    { label: "Sterling Bank", value: "232" },
    { label: "Suntrust Bank", value: "100" },
    { label: "TAJBank", value: "302" },
    { label: "Titan Trust Bank", value: "102" },
    { label: "Union Bank of Nigeria", value: "032" },
    { label: "United Bank for Africa", value: "033" },
    { label: "Unity Bank", value: "215" },
    { label: "Wema Bank", value: "035" },
    { label: "Zenith Bank", value: "057" },
];


const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

const industries = [
    'Retail & E-commerce', 'Fashion & Apparel', 'Electronics', 'Food & Beverage', 'Health & Beauty', 'Home & Furniture', 'Other'
];

function SettingsPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-80" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full" /></div>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="aspect-square w-full" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

function SettingsPageContent() {
    const { business, currentUserProfile, triggerRefresh } = usePOS();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // General state
    const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
    const [isVerifying, setIsVerifying] = React.useState(false);

    // Form fields state
    const [businessName, setBusinessName] = React.useState('');
    const [businessAddress, setBusinessAddress] = React.useState('');
    const [businessPhone, setBusinessPhone] = React.useState('');
    const [businessEmail, setBusinessEmail] = React.useState('');
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

    const [currency, setCurrency] = React.useState('NGN');
    const [timezone, setTimezone] = React.useState('Africa/Lagos');
    const [defaultTaxRate, setDefaultTaxRate] = React.useState('0');
    const [paymentBankCode, setPaymentBankCode] = React.useState('');
    const [paymentBankAccountId, setPaymentBankAccountId] = React.useState('');
    const [verifiedAccountName, setVerifiedAccountName] = React.useState('');

    const [industry, setIndustry] = React.useState('');
    const [country, setCountry] = React.useState('Nigeria');
    const [state, setState] = React.useState('');
    const [fiscalYearStart, setFiscalYearStart] = React.useState('January');

    // Effect to populate form fields when business data loads
    React.useEffect(() => {
        if (business) {
            setBusinessName(business.name || '');
            setBusinessAddress(business.address || '');
            setBusinessPhone(business.settings?.phone || '');
            setBusinessEmail(business.settings?.email || '');
            setLogoPreview(business.settings?.logoUrl || null);

            setCurrency(business.settings?.currency || 'NGN');
            setTimezone(business.settings?.timezone || 'Africa/Lagos');
            setDefaultTaxRate(String(business.settings?.defaultTaxRate || 0));
            setPaymentBankCode(business.settings?.paymentBankCode || '');
            setPaymentBankAccountId(business.settings?.paymentBankAccountId || '');
            setVerifiedAccountName(''); // Reset on load

            setIndustry(business.settings?.industry || '');
            setCountry(business.settings?.country || 'Nigeria');
            setState(business.settings?.state || '');
            setFiscalYearStart(business.settings?.fiscalYearStart || 'January');
        }
    }, [business]);

    React.useEffect(() => {
        setVerifiedAccountName('');
    }, [paymentBankAccountId, paymentBankCode]);


    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB
                toast({ variant: 'destructive', title: 'Image Too Large', description: 'Please select an image smaller than 2MB.' });
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleVerifyAccount = async () => {
        if (!paymentBankAccountId || !paymentBankCode) {
            toast({ variant: 'destructive', title: 'Missing Details', description: 'Please enter an account number and select a bank.' });
            return;
        }
        setIsVerifying(true);
        setVerifiedAccountName('');
        try {
            const response = await fetch('/api/paystack/resolve-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_number: paymentBankAccountId, bank_code: paymentBankCode })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Could not verify account.');
            }

            setVerifiedAccountName(result.data.account_name);
            toast({
                variant: 'success',
                title: 'Account Verified (Demo)',
                description: `Account Name: ${result.data.account_name}`
            });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Verification Failed', description: error.message });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSettingsSubmit = async (formName: string, dataToSave: Record<string, any>) => {
        if (!business?.id) return;
        setIsSaving(prev => ({ ...prev, [formName]: true }));

        let finalData = { ...dataToSave };

        if (formName === "profile" && logoFile) {
            try {
                const formData = new FormData();
                formData.append('image', logoFile);
                const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';
                if (!apiKey || apiKey === "your_api_key_here") throw new Error("ImgBB API key is not configured.");
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error(result.error?.message || 'Image upload failed.');
                finalData['settings.logoUrl'] = result.data.url;
                setLogoFile(null);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Logo Upload Failed", description: error.message });
                setIsSaving(prev => ({ ...prev, [formName]: false }));
                return;
            }
        }
        
        if (formName === "financials") {
            const hasBankDetails = dataToSave['settings.paymentBankCode'] && dataToSave['settings.paymentBankAccountId'];
            if (hasBankDetails) {
                 try {
                    const subaccountResponse = await fetch('/api/paystack/create-subaccount', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            business_name: businessName,
                            bank_code: dataToSave['settings.paymentBankCode'],
                            account_number: dataToSave['settings.paymentBankAccountId'],
                        }),
                    });

                    const subaccountData = await subaccountResponse.json();

                    if (!subaccountResponse.ok) {
                        throw new Error(subaccountData.message || 'Failed to link account with Paystack.');
                    }
                    
                    finalData['settings.paystackSubaccount'] = subaccountData.subaccount_code;
                    toast({
                        variant: "success",
                        title: "Paystack Account Linked",
                        description: "Your bank account can now receive card payments via Paystack.",
                    });

                } catch (error: any) {
                    toast({ variant: "destructive", title: "Paystack Link Failed", description: error.message });
                    setIsSaving(prev => ({ ...prev, [formName]: false }));
                    return; // Stop the save process if linking fails
                }
            } else {
                finalData['settings.paystackSubaccount'] = '';
            }
        }

        try {
            const businessDocRef = doc(firestore, 'businessInstances', business.id);
            await updateDoc(businessDocRef, finalData);
            triggerRefresh();
            toast({ variant: "success", title: `${formName} Settings Saved`, description: `Your settings have been updated.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed", description: `Could not save your settings.` });
        } finally {
            setIsSaving(prev => ({ ...prev, [formName]: false }));
        }
    };
    
    const handleDeleteAccount = async () => {
        if (!firestore || !currentUserProfile || !business) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const businessDocRef = doc(firestore, 'businessInstances', business.id);
            batch.update(businessDocRef, { status: 'deleted', deletedAt: serverTimestamp() });
            const userDocRef = doc(firestore, 'users', currentUserProfile.id);
            batch.update(userDocRef, { status: 'inactive' });
            await batch.commit();
            
            toast({ title: "Business Deletion Initiated", description: "You will be logged out shortly." });
            setTimeout(() => signOut(getAuth()), 2000);
        } catch (e) {
            toast({ variant: "destructive", title: "Deletion Failed" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitle title="Settings" subtitle="Manage your store's core configurations." />
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Business Profile</CardTitle>
                        <CardDescription>Manage your store's fundamental information and branding.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className='md:col-span-2 space-y-4'>
                                <div><Label htmlFor="businessName">Business Name</Label><Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} /></div>
                                <div><Label htmlFor="businessAddress">Business Address</Label><Textarea id="businessAddress" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} /></div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div><Label htmlFor="businessPhone">Business Phone</Label><Input id="businessPhone" type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} /></div>
                                    <div><Label htmlFor="businessEmail">Business Email</Label><Input id="businessEmail" type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} /></div>
                                </div>
                            </div>
                            <div>
                                <Label>Business Logo</Label>
                                <div className="mt-1 w-full aspect-square rounded-md border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                                    {logoPreview ? <Image src={logoPreview} alt="Logo preview" fill className="object-cover" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                                    <Input id="logo-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoChange} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('profile', { name: businessName, address: businessAddress, "settings.phone": businessPhone, "settings.email": businessEmail })} disabled={isSaving["profile"]}>
                            {isSaving["profile"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Profile
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment & Financials</CardTitle>
                        <CardDescription>Manage currency, taxes, and payment details for online and offline sales.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NGN">NGN (₦)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select></div>
                            <div><Label>Timezone</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem></SelectContent></Select></div>
                            <div><Label>Default Tax Rate (%)</Label><Input type="number" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} /></div>
                        </div>
                        <Separator />
                         <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2 mb-2"><Banknote className="h-5 w-5 text-muted-foreground"/>Bank Transfer Details</h4>
                            <p className="text-sm text-muted-foreground mb-4">Provide your bank details for manual payments from your storefront.</p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2 items-end">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Bank Name</Label>
                                            <Select value={paymentBankCode} onValueChange={setPaymentBankCode}>
                                                <SelectTrigger><SelectValue placeholder="Select a bank"/></SelectTrigger>
                                                <SelectContent>{NIGERIAN_BANKS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div><Label>Account Number</Label><Input value={paymentBankAccountId} onChange={e => setPaymentBankAccountId(e.target.value)} /></div>
                                    </div>
                                    <Button type="button" onClick={handleVerifyAccount} disabled={isVerifying}>{isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Verify Account</Button>
                                </div>
                                {verifiedAccountName && <div><Label>Account Name</Label><Input value={verifiedAccountName} readOnly className="bg-muted"/></div>}
                            </div>
                         </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="button" onClick={() => handleSettingsSubmit('financials', { "settings.currency": currency, "settings.timezone": timezone, "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0, "settings.paymentBankCode": paymentBankCode, 'settings.paymentBankName': NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label, "settings.paymentBankAccountId": paymentBankAccountId })} disabled={isSaving["financials"]}>
                            {isSaving["financials"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Financials
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Organization</CardTitle>
                        <CardDescription>Manage your business's industry, location, and financial year settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div><Label>Industry</Label><Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue placeholder="Select an industry"/></SelectTrigger><SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Country</Label><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Nigeria">Nigeria</SelectItem></SelectContent></Select></div>
                            <div><Label>State/Province</Label><Input value={state} onChange={e => setState(e.target.value)} /></div>
                            <div><Label>Fiscal Year Start</Label><Select value={fiscalYearStart} onValueChange={setFiscalYearStart}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="button" onClick={() => handleSettingsSubmit('organization', { 'settings.industry': industry, 'settings.state': state, 'settings.country': country, 'settings.fiscalYearStart': fiscalYearStart })} disabled={isSaving["organization"]}>
                            {isSaving["organization"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Organization
                        </Button>
                    </CardFooter>
                </Card>

                <Card id="danger-zone" className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><ShieldQuestion/> Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold mb-2">Delete This Business</p>
                        <p className="text-sm text-muted-foreground mb-4">This action is permanent and cannot be undone. Deleting your business will make its data inaccessible and disable your user account.</p>
                        <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={currentUserProfile?.role !== 'admin'}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete My Business
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is irreversible. To confirm, please type{" "}
                            <strong className="text-destructive">delete my business</strong>{" "}
                            in the box below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="delete my business" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmation !== 'delete my business' || isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} I understand, delete my business
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


export default function SettingsPage() {
    const { isLoading: isPosLoading } = usePOS();
    if (isPosLoading) {
      return <SettingsPageSkeleton />;
    }
    return <SettingsPageContent />;
}
    

    