
'use client';

import *as React from 'react';
import Image from 'next/image';
import PageTitle from '@/components/shared/page-title';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Percent, Loader2, Trash2, Globe, Landmark, Upload } from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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

const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

const industries = [
    'Retail & E-commerce', 'Fashion & Apparel', 'Electronics', 'Food & Beverage', 'Health & Beauty', 'Home & Furniture', 'Other'
];


// Inner component to hold form logic and state, preventing re-render loops.
function SettingsForms({ business, userProfile, businessDocRef }: { business: BusinessInstance, userProfile: UserProfile, businessDocRef: any }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(business.settings?.logoUrl || null);

  // Initialize state directly from props. This happens once per mount/key-change.
  const [businessName, setBusinessName] = React.useState(business.name || "My Store");
  const [businessAddress, setBusinessAddress] = React.useState(business.address || "");
  const [businessPhone, setBusinessPhone] = React.useState(business.settings?.phone || "");
  const [businessEmail, setBusinessEmail] = React.useState(business.settings?.email || "");

  const [industry, setIndustry] = React.useState(business.settings?.industry || "");
  const [country, setCountry] = React.useState(business.settings?.country || "Nigeria");
  const [state, setState] = React.useState(business.settings?.state || "");
  const [fiscalYearStart, setFiscalYearStart] = React.useState(business.settings?.fiscalYearStart || "January");


  const [currency, setCurrency] = React.useState(business.settings?.currency || "NGN");
  const [timezone, setTimezone] = React.useState(business.settings?.timezone || "Africa/Lagos");
  const [defaultTaxRate, setDefaultTaxRate] = React.useState(String(business.settings?.defaultTaxRate ?? 0));

  const [paymentBankAccountId, setPaymentBankAccountId] = React.useState(business.settings?.paymentBankAccountId || "");
  const [paymentBankName, setPaymentBankName] = React.useState(business.settings?.paymentBankName || "");
  const [paymentInstructions, setPaymentInstructions] = React.useState(business.settings?.paymentInstructions || "");
  const [paystackSubaccount, setPaystackSubaccount] = React.useState(business.settings?.paystackSubaccount || "");

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: 'Image Too Large', description: 'Please select an image smaller than 2MB.'});
        event.target.value = '';
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSettingsSubmit = async (formName: string, dataToSave: any) => {
    if (!businessDocRef) {
      toast({ variant: "destructive", title: "Error", description: "No active business selected." });
      return;
    }
    setIsSaving(prev => ({ ...prev, [formName]: true }));
    
    let finalData = { ...dataToSave };

    if (formName === "Business Details" && logoFile) {
        try {
            const formData = new FormData();
            formData.append('image', logoFile);
            const apiKey = '2ec1d17c7ad748bbb605eda60a54a896';
            if (!apiKey || apiKey === "your_api_key_here") throw new Error("ImgBB API key is not configured.");

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error?.message || 'Image upload failed.');
            finalData['settings.logoUrl'] = result.data.url;
            setLogoFile(null); // Clear file after successful upload
        } catch (error: any) {
             console.error(`Error uploading logo:`, error);
             toast({ variant: "destructive", title: "Logo Upload Failed", description: error.message || 'Could not upload the business logo.' });
             setIsSaving(prev => ({ ...prev, [formName]: false }));
             return;
        }
    }

    try {
      await updateDoc(businessDocRef, finalData);
      toast({
        variant: "success",
        title: `${formName} Settings Saved`,
        description: `Your ${formName.toLowerCase()} settings have been updated.`,
      });
    } catch (error) {
      console.error(`Error saving ${formName} settings:`, error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save ${formName.toLowerCase()} settings.`,
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [formName]: false }));
    }
  };
  
    const handleDeleteAccount = async () => {
        if (!firestore || !userProfile || !businessDocRef) return;
        setIsDeleting(true);

        try {
            await updateDoc(businessDocRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
            });

            await updateDoc(doc(firestore, 'users', userProfile.id), {
                status: 'inactive',
            });
            
            toast({
                variant: "success",
                title: "Account Deletion Successful",
                description: "Your business has been deleted and your account is now inactive. You will be logged out.",
            });
            
            setTimeout(() => {
                signOut(getAuth()).then(() => {
                    router.push('/login'); 
                });
            }, 2000);

        } catch (e) {
            console.error("Account deletion failed:", e);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "An error occurred while deleting your account. Please contact support.",
            });
            setIsDeleting(false);
        }
    }
  
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Settings" subtitle="Manage your store's core configurations." />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Business Details</CardTitle>
          <CardDescription>Manage your store's fundamental information and branding.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Business Details", { name: businessName, address: businessAddress, "settings.phone": businessPhone, "settings.email": businessEmail }); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className='md:col-span-2 space-y-4'>
                <div><Label htmlFor="businessName">Business Name</Label><Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1"/></div>
                <div><Label htmlFor="businessAddress">Business Address</Label><Textarea id="businessAddress" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="123 Main St, Anytown, Country" className="mt-1"/></div>
                <div><Label htmlFor="businessPhone">Business Phone</Label><Input id="businessPhone" type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="+2348012345678" className="mt-1"/></div>
                <div><Label htmlFor="businessEmail">Business Email</Label><Input id="businessEmail" type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="contact@mystore.com" className="mt-1"/></div>
              </div>
              <div>
                <Label>Business Logo</Label>
                 <div className="mt-1 w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                    {logoPreview ? (
                        <Image src={logoPreview} alt="Business logo preview" fill style={{objectFit: "cover"}} />
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <Upload className="mx-auto h-8 w-8" />
                            <p className="mt-2 text-sm">Click to upload</p>
                        </div>
                    )}
                    <Input id="logo-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/png, image/jpeg, image/gif" onChange={handleLogoChange} />
                 </div>
                 <p className="text-xs text-muted-foreground mt-2">Recommended: Square image, max 2MB.</p>
              </div>
            </div>
            <Button type="submit" disabled={isSaving["Business Details"]}>{isSaving["Business Details"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Business Details</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Organization & Financials</CardTitle>
          <CardDescription>Manage your business's industry, location, and financial year settings.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Organization", { 'settings.industry': industry, 'settings.state': state, 'settings.country': country, 'settings.fiscalYearStart': fiscalYearStart }); }} className="space-y-6">
                 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><Label htmlFor="industry">Industry</Label><Select name="industry" value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="country">Country</Label><Select name="country" value={country} onValueChange={setCountry}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Nigeria">Nigeria</SelectItem><SelectItem value="Ghana">Ghana</SelectItem></SelectContent></Select></div>
                    <div><Label htmlFor="state">State/Province</Label><Input id="state" value={state} onChange={e => setState(e.target.value)} /></div>
                    <div><Label htmlFor="fiscalYearStart">Fiscal Year Start</Label><Select name="fiscalYearStart" value={fiscalYearStart} onValueChange={setFiscalYearStart}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                 </div>
                  <Button type="submit" disabled={isSaving["Organization"]}>{isSaving["Organization"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Organization Settings</Button>
            </form>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Regional & Payment Settings</CardTitle>
              <CardDescription>Manage currency, taxes, and payment details.</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Financials", { "settings.currency": currency, "settings.timezone": timezone, "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0, "settings.paymentBankAccountId": paymentBankAccountId, "settings.paymentBankName": paymentBankName, "settings.paymentInstructions": paymentInstructions }); }} className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                      <div><Label htmlFor="currency">Currency</Label><Select name="currency" value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NGN">NGN (₦)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select></div>
                      <div><Label htmlFor="timezone">Timezone</Label><Select name="timezone" value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem><SelectItem value="America/New_York">America/New_York</SelectItem></SelectContent></Select></div>
                      <div><Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label><Input id="defaultTaxRate" type="number" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                      <div><Label htmlFor="paymentBankName">Bank Name (for Bank Transfer)</Label><Input id="paymentBankName" value={paymentBankName} onChange={e => setPaymentBankName(e.target.value)} /></div>
                      <div><Label htmlFor="paymentBankAccountId">Bank Account Number</Label><Input id="paymentBankAccountId" value={paymentBankAccountId} onChange={e => setPaymentBankAccountId(e.target.value)} /></div>
                  </div>
                  <div><Label htmlFor="paymentInstructions">Payment Instructions</Label><Textarea id="paymentInstructions" value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)} placeholder="For online orders, instruct customers on how to pay." /></div>
                  <Button type="submit" disabled={isSaving["Financials"]}>{isSaving["Financials"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Payment Settings</Button>
              </form>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Payment Gateway</CardTitle>
            <CardDescription>Connect your Paystack account to receive payments directly from your storefront.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Payment Gateway", { "settings.paystackSubaccount": paystackSubaccount }); }} className="space-y-4">
                <div>
                    <Label htmlFor="paystackSubaccount">Paystack Subaccount Code</Label>
                    <Input id="paystackSubaccount" value={paystackSubaccount} onChange={e => setPaystackSubaccount(e.target.value)} placeholder="ACCT_xxxxxxxxxxxxxxx" />
                    <p className="text-xs text-muted-foreground mt-2">Create a Subaccount on your Paystack dashboard and paste the code here. This allows Zeneva to securely process payments directly into your account.</p>
                </div>
                <Button type="submit" disabled={isSaving["Payment Gateway"]}>
                    {isSaving["Payment Gateway"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Paystack Settings
                </Button>
            </form>
        </CardContent>
      </Card>


      <Card id="danger-zone" className="border-destructive/50 bg-destructive/5">
          <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><Trash2/> Danger Zone</CardTitle>
              <CardDescription>This action is permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Deleting your business will make its data inaccessible and disable your user account. An administrator can reactivate your account later.</p>
          </CardContent>
          <CardFooter>
                <Button 
                    variant="outline" 
                    className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setIsDeleteAlertOpen(true)} 
                    disabled={userProfile?.role !== 'admin'}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Business
                </Button>
          </CardFooter>
      </Card>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={(open) => {
          setIsDeleteAlertOpen(open);
          if (!open) {
              setDeleteConfirmation('');
          }
      }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action is irreversible. To confirm, please type{" "}
                    <strong className="text-destructive">i want to delete my account</strong>{" "}
                    in the box below.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
                <Label htmlFor="delete-confirm" className="sr-only">
                    Confirmation Text
                </Label>
                <Input
                    id="delete-confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="i want to delete my account"
                    className="border-destructive focus-visible:ring-destructive"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount} 
                  disabled={deleteConfirmation !== 'i want to delete my account' || isDeleting}
                >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    I understand, delete my business
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}


export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const businessDocRef = useMemoFirebase(() => userProfile ? doc(firestore, 'businessInstances', userProfile.businessId) : null, [userProfile, firestore]);
  const { data: currentBusiness, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);
  
  const isLoading = isUserLoading || isProfileLoading || isBusinessLoading;

  if (isLoading || !currentBusiness || !userProfile) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading settings...</span></div>;
  }

  // Use a key to force re-mount when business data changes, solving the loop.
  return <SettingsForms key={currentBusiness.id} business={currentBusiness} userProfile={userProfile} businessDocRef={businessDocRef} />;
}
