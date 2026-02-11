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
import { Briefcase, Percent, Loader2, Trash2, Globe, Landmark, Upload, Building, CreditCard, Banknote, ShieldQuestion, Palette, Truck, Package, Plus, MapPin, Award, Download } from 'lucide-react';
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
import { ThemeSwitcher } from '@/components/settings/theme-switcher';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

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

// ... imports
import { usePWA } from '@/context/pwa-context';

function SettingsPageContent() {
    const { business, currentUserProfile, triggerRefresh } = usePOS();
    const { promptInstall, isInstallable, isAppInstalled } = usePWA();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // General state
    const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
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
    const [paymentAccountName, setPaymentAccountName] = React.useState('');

    // Loyalty state
    const [loyaltyEnabled, setLoyaltyEnabled] = React.useState(false);
    const [pointsPerUnit, setPointsPerUnit] = React.useState('1');

    const [industry, setIndustry] = React.useState('');
    const [country, setCountry] = React.useState('Nigeria');
    const [state, setState] = React.useState('');
    const [fiscalYearStart, setFiscalYearStart] = React.useState('January');

    const [shippingOptions, setShippingOptions] = React.useState<{ name: string, price: number, type: 'delivery' | 'pickup', location?: string | null }[]>([]);
    const [newShippingOption, setNewShippingOption] = React.useState({ name: '', price: '', type: 'delivery' as 'delivery' | 'pickup', location: '' });

    const [productCategories, setProductCategories] = React.useState<string[]>([]);
    const [newCategory, setNewCategory] = React.useState('');

    // Effect to populate form fields when business data loads
    React.useEffect(() => {
        if (business?.settings) {
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
            setPaymentAccountName(business.settings?.paymentAccountName || '');

            setLoyaltyEnabled(business.settings.loyaltyProgramEnabled || false);
            setPointsPerUnit(String(business.settings.pointsPerUnit || 1));

            setIndustry(business.settings?.industry || '');
            setCountry(business.settings?.country || 'Nigeria');
            setState(business.settings?.state || '');
            setFiscalYearStart(business.settings?.fiscalYearStart || 'January');
            setShippingOptions(business.settings?.publicStore?.shippingOptions || []);
            setProductCategories(business.settings?.productCategories || []);
        }
    }, [business]);

    React.useEffect(() => {
        setPaymentAccountName('');
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
        setPaymentAccountName('');
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

            setPaymentAccountName(result.data.account_name);
            toast({
                variant: 'success',
                title: 'Account Verified',
                description: `Account Name: ${result.data.account_name}`
            });

        } catch (error: any) {
            toast({ variant: "destructive", title: 'Verification Failed', description: error.message });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSettingsSubmit = async (formName: string, dataToSave: Record<string, any>) => {
        if (!business?.id || !businessName) return;
        setIsSaving(prev => ({ ...prev, [formName]: true }));

        let finalData = { ...dataToSave };

        // Auto-add pending shipping option if present
        if (formName === 'shipping' && newShippingOption.name) {
            const name = newShippingOption.name.trim();
            const price = parseFloat(newShippingOption.price);
            const type = newShippingOption.type;
            const location = newShippingOption.location.trim();

            if (name && !isNaN(price) && price >= 0) {
                if (type === 'delivery' || (type === 'pickup' && location)) {
                    const newOption = { name, price, type, location: type === 'pickup' ? location : null };
                    const updatedOptions = [...shippingOptions, newOption];
                    finalData['settings.publicStore.shippingOptions'] = updatedOptions;
                    setShippingOptions(updatedOptions); // Update local state immediately
                    setNewShippingOption({ name: '', price: '', type: 'delivery', location: '' }); // Clear input
                }
            }
        }

        // ... existing image upload logic ...

        // ... existing Paystack subaccount logic ...

        try {
            const businessDocRef = doc(firestore, 'businessInstances', business.id);
            await updateDoc(businessDocRef, finalData);
            triggerRefresh();
            toast({ variant: "success", title: `${formName.charAt(0).toUpperCase() + formName.slice(1)} Settings Saved`, description: `Your settings have been updated.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed", description: `Could not save your settings.` });
        } finally {
            setIsSaving(prev => ({ ...prev, [formName]: false }));
        }
    };

    const handleAddShippingOption = () => {
        const name = newShippingOption.name.trim();
        const price = parseFloat(newShippingOption.price);
        const type = newShippingOption.type;
        const location = newShippingOption.location.trim();

        if (name && !isNaN(price) && price >= 0) {
            if (type === 'pickup' && !location) {
                toast({ variant: 'destructive', title: 'Location Required', description: 'Please provide a location for the pickup option.' });
                return;
            }
            setShippingOptions([...shippingOptions, { name, price, type, location: type === 'pickup' ? location : null }]);
            setNewShippingOption({ name: '', price: '', type: 'delivery', location: '' });
        } else {
            toast({ variant: 'destructive', title: 'Invalid Option', description: 'Please provide a valid name and price.' });
        }
    };

    const handleDeleteShippingOption = (index: number) => {
        setShippingOptions(shippingOptions.filter((_, i) => i !== index));
    };

    const handleAddCategory = () => {
        const cat = newCategory.trim();
        if (cat && !productCategories.includes(cat)) {
            setProductCategories([...productCategories, cat]);
            setNewCategory('');
        }
    }

    const handleDeleteCategory = (catToDelete: string) => {
        setProductCategories(productCategories.filter(c => c !== catToDelete));
    }

    return (
        <div className="space-y-6">
            <PageTitle title="Settings" subtitle="Manage your store's core configurations." />

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Business Profile</CardTitle>
                        <CardDescription>Manage your store's fundamental information and branding.</CardDescription>
                    </CardHeader>
                    {/* ... rest of Business Profile card content ... */}

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
                            {isSaving["profile"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Profile
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Loyalty Program</CardTitle>
                        <CardDescription>Reward your returning customers and encourage repeat business.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="loyalty-switch" className="text-base">Enable Loyalty Program</Label>
                                    <p className="text-sm text-muted-foreground">Allow customers to earn points for their purchases.</p>
                                </div>
                                <Switch id="loyalty-switch" checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
                            </div>
                            {loyaltyEnabled && (
                                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <Label htmlFor="points-per-unit">Points per ₦1</Label>
                                        <Input
                                            id="points-per-unit"
                                            type="number"
                                            value={pointsPerUnit}
                                            onChange={e => setPointsPerUnit(e.target.value)}
                                            placeholder="e.g., 0.1 for 1 point per ₦10"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">For 1 point per ₦100, enter 0.01.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('loyalty', { 'settings.loyaltyProgramEnabled': loyaltyEnabled, 'settings.pointsPerUnit': parseFloat(pointsPerUnit) || 0 })} disabled={isSaving["loyalty"]}>
                            {isSaving["loyalty"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Loyalty Settings
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Product Categories</CardTitle>
                        <CardDescription>Manage the categories for your products. This helps in organizing and filtering your inventory.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {productCategories.map((cat, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 p-3 border rounded-md bg-muted/50">
                                    <p className="font-medium">{cat}</p>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-end gap-2 pt-4 border-t">
                                <div className="flex-1"><Label>New Category</Label><Input placeholder="e.g., Electronics" value={newCategory} onChange={e => setNewCategory(e.target.value)} /></div>
                                <Button type="button" onClick={handleAddCategory}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('categories', { 'settings.productCategories': productCategories })} disabled={isSaving["categories"]}>
                            {isSaving["categories"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Categories
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
                            <div><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NGN">NGN (₦)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select></div>
                            <div><Label>Timezone</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem></SelectContent></Select></div>
                            <div><Label>Default Tax Rate (%)</Label><Input type="number" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} /></div>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2 mb-2"><Banknote className="h-5 w-5 text-muted-foreground" />Bank Transfer Details</h4>
                            <p className="text-sm text-muted-foreground mb-4">Provide bank details for "Bank Transfer" payments at checkout. This will also create a Paystack Subaccount for card payments.</p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2 items-end">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Bank Name</Label>
                                            <Select value={paymentBankCode} onValueChange={setPaymentBankCode}>
                                                <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                                                <SelectContent>{NIGERIAN_BANKS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div><Label>Account Number</Label><Input value={paymentBankAccountId} onChange={e => setPaymentBankAccountId(e.target.value)} /></div>
                                    </div>
                                    <Button type="button" onClick={handleVerifyAccount} disabled={isVerifying}>{isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify Account</Button>
                                </div>
                                {paymentAccountName && <div><Label>Account Name</Label><Input value={paymentAccountName} readOnly className="bg-muted" /></div>}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('financials', { "settings.currency": currency, "settings.timezone": timezone, "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0, "settings.paymentBankCode": paymentBankCode, 'settings.paymentBankName': NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label, "settings.paymentBankAccountId": paymentBankAccountId, "settings.paymentAccountName": paymentAccountName })} disabled={isSaving["financials"]}>
                            {isSaving["financials"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Financials
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Shipping & Delivery</CardTitle>
                        <CardDescription>Set up the shipping options available for your online store customers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {shippingOptions.map((option, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 p-3 border rounded-md bg-muted/50">
                                    <div>
                                        <p className="font-medium">{option.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {option.type === 'pickup' ? `Pickup at: ${option.location}` : `Delivery`} - ₦{option.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteShippingOption(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <div className="pt-4 border-t space-y-4">
                                <Label>Add New Option</Label>
                                <RadioGroup value={newShippingOption.type} onValueChange={(value: 'delivery' | 'pickup') => setNewShippingOption({ ...newShippingOption, type: value })} className="flex space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="delivery" id="delivery" />
                                        <Label htmlFor="delivery">Delivery</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="pickup" id="pickup" />
                                        <Label htmlFor="pickup">In-Store Pickup</Label>
                                    </div>
                                </RadioGroup>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1"><Label>Option Name</Label><Input placeholder="e.g., Standard Delivery" value={newShippingOption.name} onChange={e => setNewShippingOption({ ...newShippingOption, name: e.target.value })} /></div>
                                    <div className="w-32"><Label>Price</Label><Input type="number" placeholder="e.g., 2000" value={newShippingOption.price} onChange={e => setNewShippingOption({ ...newShippingOption, price: e.target.value })} /></div>
                                </div>
                                {newShippingOption.type === 'pickup' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="pickup-location">Pickup Location</Label>
                                        <Input id="pickup-location" placeholder="e.g., 123 Main St, Lagos" value={newShippingOption.location} onChange={e => setNewShippingOption({ ...newShippingOption, location: e.target.value })} />
                                    </div>
                                )}
                                <Button type="button" onClick={handleAddShippingOption} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Add Option</Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('shipping', { 'settings.publicStore.shippingOptions': shippingOptions })} disabled={isSaving["shipping"]}>
                            {isSaving["shipping"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Shipping Options
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
                            <div><Label>Industry</Label><Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger><SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Country</Label><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Nigeria">Nigeria</SelectItem></SelectContent></Select></div>
                            <div><Label>State/Province</Label><Input value={state} onChange={e => setState(e.target.value)} /></div>
                            <div><Label>Fiscal Year Start</Label><Select value={fiscalYearStart} onValueChange={setFiscalYearStart}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('organization', { 'settings.industry': industry, 'settings.state': state, 'settings.country': country, 'settings.fiscalYearStart': fiscalYearStart })} disabled={isSaving["organization"]}>
                            {isSaving["organization"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Organization
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ThemeSwitcher />
                    </CardContent>
                    {isInstallable && (
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={promptInstall}>
                                <Download className="mr-2 h-4 w-4" />
                                Install App
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}


export default function SettingsPage() {
    const { isLoading: isPosLoading, business } = usePOS();
    if (isPosLoading && !business) {
        return <SettingsPageSkeleton />;
    }
    return <SettingsPageContent />;
}
