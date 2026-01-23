

"use client";

import *as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Paintbrush, Briefcase, Percent, Building, UserCircle, Bell, DollarSign, ShieldCheck, FileText, DownloadCloud, Eye, EyeOff, KeyRound, Gift, Trophy, Loader2, Clock, History, Tag, X, Copy, Share2, Trash2, Zap, BarChart2, ShoppingCart, Users } from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch, deleteDoc, setDoc } from "firebase/firestore";
import { BusinessInstance, UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
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

// Inner component to hold form logic and state, preventing re-render loops.
function SettingsForms({ business, userProfile, businessDocRef }: { business: BusinessInstance, userProfile: UserProfile, businessDocRef: any }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  
  // Initialize state directly from props. This happens once per mount/key-change.
  const [businessName, setBusinessName] = React.useState(business.name || "My Store");
  const [businessAddress, setBusinessAddress] = React.useState(business.address || "");
  const [businessPhone, setBusinessPhone] = React.useState(business.settings?.phone || "");
  const [businessEmail, setBusinessEmail] = React.useState(business.settings?.email || "");

  const [currency, setCurrency] = React.useState(business.settings?.currency || "NGN");
  const [timezone, setTimezone] = React.useState(business.settings?.timezone || "Africa/Lagos");
  const [defaultTaxRate, setDefaultTaxRate] = React.useState(String(business.settings?.defaultTaxRate ?? 0));

  const [paymentBankAccountId, setPaymentBankAccountId] = React.useState(business.settings?.paymentBankAccountId || "");
  const [paymentBankName, setPaymentBankName] = React.useState(business.settings?.paymentBankName || "");
  const [paymentInstructions, setPaymentInstructions] = React.useState(business.settings?.paymentInstructions || "");

  const [enableLoyaltyProgram, setEnableLoyaltyProgram] = React.useState(business.settings?.loyaltyProgramEnabled ?? true);
  const [pointsPerUnit, setPointsPerUnit] = React.useState(String(business.settings?.pointsPerUnit || 1));
  const [loyaltyPointsForReward, setLoyaltyPointsForReward] = React.useState(String(business.settings?.loyaltyPointsForReward || 1000));
  const [rewardDiscountPercentage, setRewardDiscountPercentage] = React.useState(String(business.settings?.loyaltyRewardDiscountPercentage || 10));

  const [categories, setCategories] = React.useState<string[]>(business.settings?.productCategories || []);
  const [categoryInput, setCategoryInput] = React.useState('');
  
  const referralLink = userProfile?.referralCode ? `https://zeneva.vercel.app/signup?ref=${userProfile.referralCode}` : '';

  const handleSettingsSubmit = async (formName: string, dataToSave: any) => {
    if (!businessDocRef) {
      toast({ variant: "destructive", title: "Error", description: "No active business selected." });
      return;
    }
    setIsSaving(prev => ({ ...prev, [formName]: true }));

    try {
      await updateDoc(businessDocRef, dataToSave);
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

  const handleLoyaltySettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSettingsSubmit("Loyalty Program", {
      "settings.loyaltyProgramEnabled": enableLoyaltyProgram,
      "settings.pointsPerUnit": parseFloat(pointsPerUnit) || 1,
      "settings.loyaltyPointsForReward": parseInt(loyaltyPointsForReward) || 1000,
      "settings.loyaltyRewardDiscountPercentage": parseFloat(rewardDiscountPercentage) || 10,
    });
  };
  
    const handleAddCategory = () => {
        const newCategory = categoryInput.trim();
        if (newCategory && !categories.includes(newCategory)) {
            setCategories([...categories, newCategory]);
        }
        setCategoryInput(''); // Clear input
    };

    const handleCategoryInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCategory();
        }
    };

    const handleRemoveCategory = (categoryToRemove: string) => {
        setCategories(categories.filter(cat => cat !== categoryToRemove));
    };

    const handleCategorySettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const finalCategories = [...categories];
        const newCategory = categoryInput.trim();
        if (newCategory && !finalCategories.includes(newCategory)) {
            finalCategories.push(newCategory);
        }
        handleSettingsSubmit("Product Categories", {
            "settings.productCategories": [...new Set(finalCategories)],
        });
        setCategoryInput('');
    };

    const handleCopyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink)
                .then(() => {
                    toast({ variant: 'success', title: 'Copied!', description: 'Referral link copied to clipboard.' });
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Failed to Copy' });
                });
        }
    };

    const handleCopyCode = (code?: string) => {
        if (code) {
            navigator.clipboard.writeText(code)
                .then(() => {
                    toast({ variant: 'success', title: 'Copied!', description: 'Referral code copied to clipboard.' });
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Failed to Copy' });
                });
        }
    };

    const handleShareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on Zeneva!',
                    text: `Sign up for Zeneva using my referral link and get started with the best inventory management platform.`,
                    url: referralLink,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            handleCopyLink();
            toast({ title: 'Share not supported', description: 'Referral link copied to clipboard instead.' });
        }
    };

    const handleDeleteAccount = async () => {
        if (!firestore || !userProfile || !businessDocRef) return;
        const userDocRef = doc(firestore, 'users', userProfile.id);
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            
            // Mark the business as deleted
            batch.update(businessDocRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
            });

            // Set user status to 'inactive', allowing admin to reactivate
            batch.update(userDocRef, {
                status: 'inactive',
            });
            
            await batch.commit();

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
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Referral Program</CardTitle>
          <CardDescription>Share your code to earn rewards. For every new user that signs up with your code, you get 10 extra days of trial.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="referralLink">Your Shareable Link</Label>
                    <div className="flex items-center gap-2">
                        <Input id="referralLink" value={userProfile.referralCode ? referralLink : 'Generating...'} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={handleCopyLink} disabled={!userProfile.referralCode}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        {typeof navigator !== 'undefined' && !!navigator.share && (
                            <Button variant="outline" size="icon" onClick={handleShareLink} disabled={!userProfile.referralCode}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="referralCode">Your Referral Code</Label>
                    <div className="flex items-center gap-2">
                        <Input id="referralCode" value={userProfile.referralCode || 'Generating...'} readOnly className="font-mono text-sm text-center tracking-widest" />
                         <Button variant="outline" size="icon" onClick={() => handleCopyCode(userProfile?.referralCode)} disabled={!userProfile.referralCode}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Business Details</CardTitle>
          <CardDescription>Manage your store's fundamental information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Business Details", { name: businessName, address: businessAddress, "settings.phone": businessPhone, "settings.email": businessEmail }); }} className="space-y-4">
            <div><Label htmlFor="businessName">Business Name</Label><Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1"/></div>
            <div><Label htmlFor="businessAddress">Business Address</Label><Textarea id="businessAddress" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="123 Main St, Anytown, Country" className="mt-1"/></div>
            <div><Label htmlFor="businessPhone">Business Phone</Label><Input id="businessPhone" type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="+2348012345678" className="mt-1"/></div>
            <div><Label htmlFor="businessEmail">Business Email</Label><Input id="businessEmail" type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="contact@mystore.com" className="mt-1"/></div>
            <Button type="submit" disabled={isSaving["Business Details"]}>{isSaving["Business Details"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Business Details</Button>
          </form>
        </CardContent>
      </Card>

      <Card id="product-categories">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Product Categories</CardTitle>
            <CardDescription>Manage the categories used for your products. Add one and press Enter.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleCategorySettingsSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="category-input">Add a category</Label>
                    <div className="flex gap-2 mt-1">
                        <Input
                            id="category-input"
                            value={categoryInput}
                            onChange={(e) => setCategoryInput(e.target.value)}
                            onKeyDown={handleCategoryInputKeyDown}
                            placeholder="e.g., Electronics"
                        />
                        <Button type="button" variant="secondary" onClick={handleAddCategory}>Add</Button>
                    </div>
                </div>
                {categories.length > 0 && (
                    <div className="space-y-2">
                        <Label>Your Categories</Label>
                        <div className="flex flex-wrap gap-2 rounded-md border p-4 min-h-24">
                            {categories.map(cat => (
                                <Badge key={cat} variant="secondary" className="py-1 px-3 text-sm">
                                    {cat}
                                    <button type="button" onClick={() => handleRemoveCategory(cat)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5 focus:outline-none focus:ring-1 focus:ring-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                <Button type="submit" disabled={isSaving["Product Categories"]}>
                    {isSaving["Product Categories"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Categories
                </Button>
            </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Loyalty & Rewards Program</CardTitle>
          <CardDescription>Configure your customer loyalty program.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoyaltySettingsSubmit} className="space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b"><Switch id="enableLoyaltyProgram" checked={enableLoyaltyProgram} onCheckedChange={setEnableLoyaltyProgram}/><Label htmlFor="enableLoyaltyProgram" className="text-base">Enable Loyalty Program</Label></div>
            {enableLoyaltyProgram && (
              <>
                <div className="space-y-2"><h4 className="font-medium text-md flex items-center gap-2"><Gift className="h-4 w-4 text-primary"/>How Points Are Earned:</h4><Label htmlFor="pointsPerUnit">Points per currency unit spent</Label><Input id="pointsPerUnit" type="number" value={pointsPerUnit} onChange={(e) => setPointsPerUnit(e.target.value)} className="w-24" /></div>
                <div className="space-y-4"><h4 className="font-medium text-md">Defining Rewards:</h4><Label>Default Reward Tier</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-1"><Label htmlFor="loyaltyPointsForReward">Points Needed</Label><Input id="loyaltyPointsForReward" type="number" value={loyaltyPointsForReward} onChange={(e) => setLoyaltyPointsForReward(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="rewardDiscountPercentage">Reward: Discount (%)</Label><Input id="rewardDiscountPercentage" type="number" value={rewardDiscountPercentage} onChange={(e) => setRewardDiscountPercentage(e.target.value)} /></div></div></div>
              </>
            )}
            <Button type="submit" disabled={isSaving["Loyalty Program"]}>{isSaving["Loyalty Program"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Loyalty Settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Regional & Financial Settings</CardTitle>
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
                    <div><Label htmlFor="paymentBankName">Bank Name</Label><Input id="paymentBankName" value={paymentBankName} onChange={e => setPaymentBankName(e.target.value)} /></div>
                    <div><Label htmlFor="paymentBankAccountId">Bank Account Number</Label><Input id="paymentBankAccountId" value={paymentBankAccountId} onChange={e => setPaymentBankAccountId(e.target.value)} /></div>
                </div>
                <div><Label htmlFor="paymentInstructions">Payment Instructions</Label><Textarea id="paymentInstructions" value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)} /></div>
                <Button type="submit" disabled={isSaving["Financials"]}>{isSaving["Financials"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Financials</Button>
            </form>
        </CardContent>
      </Card>

      <Card id="danger-zone" className="border-destructive">
          <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><Trash2/> Danger Zone</CardTitle>
              <CardDescription>This action is permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Deleting your business will make its data inaccessible and disable your user account. An administrator can reactivate your account later.</p>
          </CardContent>
          <CardFooter>
                <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={userProfile?.role !== 'admin'}>
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
  
  React.useEffect(() => {
    if (user && userProfile && !isProfileLoading && !userProfile.referralCode && firestore) {
        const generateAndSaveCode = async () => {
            const newCode = user.uid.substring(0, 8).toUpperCase();
            const userRef = doc(firestore, 'users', user.uid);
            try {
                await updateDoc(userRef, { referralCode: newCode });
                // Do not toast here, it's a background process
            } catch (e) {
                console.error("Could not save referral code:", e);
            }
        };
        generateAndSaveCode();
    }
  }, [user, userProfile, isProfileLoading, firestore]);

  const isLoading = isUserLoading || isProfileLoading || isBusinessLoading;

  if (isLoading || !currentBusiness || !userProfile) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading settings...</span></div>;
  }

  // Use a key to force re-mount when business data changes, solving the loop.
  return <SettingsForms key={currentBusiness.id} business={currentBusiness} userProfile={userProfile} businessDocRef={businessDocRef} />;
}
