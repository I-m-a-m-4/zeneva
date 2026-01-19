

"use client";

import *as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Paintbrush, Briefcase, Percent, Building, UserCircle, Bell, DollarSign, ShieldCheck, FileText, DownloadCloud, Eye, EyeOff, KeyRound, Gift, Trophy, Loader2, Clock, History, Tag, X, Copy, Share2 } from 'lucide-react'; 
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
import { doc, updateDoc } from "firebase/firestore";
import { BusinessInstance, UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';

const dummyVendorPolicyTemplate = `
**Zeneva Inventory Vendor/Operator Agreement**

This agreement outlines the terms and conditions for vendors/operators using the Zeneva Inventory system provided by [Business Name].

**1. Access and Use:**
   - Access is granted solely for performing assigned duties related to sales, inventory, or other specified tasks.
   - User credentials (username/password) must be kept confidential and not shared.
   - Unauthorized access or use of system features is strictly prohibited.

**2. Data Integrity & Accuracy:**
   - All data entered (sales, stock adjustments, customer information) must be accurate and truthful.
   - Any discrepancies or errors identified must be reported to management immediately.
`;

const OWNER_ACCESS_KEY_STORAGE = "zeneva-inventory-owner-access-key";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const businessDocRef = useMemoFirebase(() => userProfile ? doc(firestore, 'businessInstances', userProfile.businessId) : null, [userProfile, firestore]);
  const { data: currentBusiness, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);

  const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
  
  const [businessName, setBusinessName] = React.useState("");
  const [businessAddress, setBusinessAddress] = React.useState("");
  const [businessPhone, setBusinessPhone] = React.useState("");
  const [businessEmail, setBusinessEmail] = React.useState("");

  const [currency, setCurrency] = React.useState("NGN");
  const [timezone, setTimezone] = React.useState("Africa/Lagos");
  const [defaultTaxRate, setDefaultTaxRate] = React.useState("0");

  const [paymentBankAccountId, setPaymentBankAccountId] = React.useState("");
  const [paymentBankName, setPaymentBankName] = React.useState("");
  const [paymentInstructions, setPaymentInstructions] = React.useState("");

  const [vendorPolicy, setVendorPolicy] = React.useState(dummyVendorPolicyTemplate);
  const [enableVendorPolicy, setEnableVendorPolicy] = React.useState(false);

  const [newOwnerPassword, setNewOwnerPassword] = React.useState("");
  const [confirmNewOwnerPassword, setConfirmNewOwnerPassword] = React.useState("");
  const [showNewOwnerPassword, setShowNewOwnerPassword] = React.useState(false);
  const [showConfirmNewOwnerPassword, setShowConfirmNewOwnerPassword] = React.useState(false);

  const [enableLoyaltyProgram, setEnableLoyaltyProgram] = React.useState(true);
  const [pointsPerUnit, setPointsPerUnit] = React.useState("1"); 
  const [loyaltyPointsForReward, setLoyaltyPointsForReward] = React.useState("1000");
  const [rewardDiscountPercentage, setRewardDiscountPercentage] = React.useState("10");

  const [categories, setCategories] = React.useState<string[]>([]);
  const [categoryInput, setCategoryInput] = React.useState('');
  
  const referralLink = userProfile?.referralCode ? `https://zeneva.vercel.app/signup?ref=${userProfile.referralCode}` : '';

  React.useEffect(() => {
    if (currentBusiness) {
      setBusinessName(currentBusiness.name || "My Store");
      setBusinessAddress(currentBusiness.address || "");
      
      const settings = currentBusiness.settings || {};
      setBusinessPhone(settings.phone || "");
      setBusinessEmail(settings.email || "");
      setCurrency(settings.currency || "NGN");
      setTimezone(settings.timezone || "Africa/Lagos");
      setDefaultTaxRate(String(settings.defaultTaxRate ?? 0));
      setPaymentBankAccountId(settings.paymentBankAccountId || "");
      setPaymentBankName(settings.paymentBankName || "");
      setPaymentInstructions(settings.paymentInstructions || "");
      setEnableVendorPolicy(settings.vendorPolicyEnabled || false);
      setVendorPolicy(settings.vendorPolicyText || dummyVendorPolicyTemplate);
      setEnableLoyaltyProgram(settings.loyaltyProgramEnabled ?? true);
      setPointsPerUnit(String(settings.pointsPerUnit || 1));
      setLoyaltyPointsForReward(String(settings.loyaltyPointsForReward || 1000));
      setRewardDiscountPercentage(String(settings.loyaltyRewardDiscountPercentage || 10));
      setCategories(settings.productCategories || []);
    }
  }, [currentBusiness]);

  React.useEffect(() => {
    if (user && userProfile && !isProfileLoading && !userProfile.referralCode && firestore) {
        const generateAndSaveCode = async () => {
            const newCode = user.uid.substring(0, 8).toUpperCase();
            const userRef = doc(firestore, 'users', user.uid);
            try {
                await updateDoc(userRef, { referralCode: newCode });
                toast({
                    variant: 'success',
                    title: "Referral Code Generated!",
                    description: "Your unique referral code is now ready to be shared.",
                });
            } catch (e) {
                console.error("Could not save referral code:", e);
                toast({
                    variant: 'destructive',
                    title: "Code Generation Failed",
                    description: "We couldn't generate your referral code. Please try refreshing.",
                });
            }
        };
        generateAndSaveCode();
    }
  }, [user, userProfile, isProfileLoading, firestore, toast]);

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
  
  const handleOwnerPasswordChangeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newOwnerPassword !== confirmNewOwnerPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "New passwords do not match." });
      return;
    }
    if (newOwnerPassword.length < 6) {
        toast({ variant: "destructive", title: "Password Too Short", description: "Password must be at least 6 characters." });
        return;
    }
    try {
      localStorage.setItem(OWNER_ACCESS_KEY_STORAGE, newOwnerPassword);
      toast({ variant: "success", title: "Owner Access Password Updated", description: "Locally stored password has been changed." });
      setNewOwnerPassword("");
      setConfirmNewOwnerPassword("");
    } catch (error) {
      toast({ variant: "destructive", title: "Storage Error", description: "Could not save password." });
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

  const handleDownloadPolicy = () => {
    const blob = new Blob([vendorPolicy], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'zeneva_vendor_policy.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ variant: "success", title: "Policy Downloaded" });
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

  const isLoading = isUserLoading || isProfileLoading || isBusinessLoading;

  if (isLoading || !userProfile) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading settings...</span></div>;
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

      <Card>
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
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />Owner Access Control</CardTitle>
            <CardDescription>Set password for User & Staff Management access. <strong className="text-destructive">Saved in browser.</strong></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOwnerPasswordChangeSubmit} className="space-y-4">
            <div><Label htmlFor="newOwnerPassword">New Access Password</Label><div className="relative"><Input id="newOwnerPassword" type={showNewOwnerPassword ? "text" : "password"} value={newOwnerPassword} onChange={(e) => setNewOwnerPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewOwnerPassword(!showNewOwnerPassword)}>{showNewOwnerPassword ? <EyeOff/> : <Eye/>}</Button></div></div>
            <div><Label htmlFor="confirmNewOwnerPassword">Confirm New Password</Label><div className="relative"><Input id="confirmNewOwnerPassword" type={showConfirmNewOwnerPassword ? "text" : "password"} value={confirmNewOwnerPassword} onChange={(e) => setConfirmNewOwnerPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmNewOwnerPassword(!showConfirmNewOwnerPassword)}>{showConfirmNewOwnerPassword ? <EyeOff/> : <Eye/>}</Button></div></div>
            <Button type="submit">Set Access Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Vendor Policy Management</CardTitle>
          <CardDescription>Define terms for vendors or staff operating the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSettingsSubmit("Vendor Policy", { "settings.vendorPolicyEnabled": enableVendorPolicy, "settings.vendorPolicyText": vendorPolicy }); }} className="space-y-4">
            <div><Label htmlFor="vendorPolicyText">Policy Document Text</Label><Textarea id="vendorPolicyText" value={vendorPolicy} onChange={(e) => setVendorPolicy(e.target.value)} className="min-h-[200px] font-mono text-xs"/></div>
            <div className="flex items-center space-x-2"><Switch id="enableVendorPolicySwitch" checked={enableVendorPolicy} onCheckedChange={setEnableVendorPolicy}/><Label htmlFor="enableVendorPolicySwitch">Enable Vendor Policy Requirement</Label></div>
            <div className="flex gap-2"><Button type="submit" disabled={isSaving["Vendor Policy"]}>{isSaving["Vendor Policy"] && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Policy</Button><Button type="button" variant="outline" onClick={handleDownloadPolicy}><DownloadCloud className="mr-2 h-4 w-4"/>Download</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    