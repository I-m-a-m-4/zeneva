'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageTitle from '@/components/shared/page-title';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, serverTimestamp, deleteDoc, collection, onSnapshot, query, orderBy, Timestamp, addDoc } from "firebase/firestore";
import { Briefcase, Percent, Loader2, RefreshCw, Trash2, Globe, Landmark, Upload, Building, CreditCard, Banknote, ShieldQuestion, Palette, Truck, Package, Plus, MapPin, Award, Download, Bell, Monitor, Smartphone, Tablet, Shield, LogOut } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
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

import { usePWA } from '@/context/pwa-context';
import { useFCM } from '@/hooks/use-fcm';

function SettingsPageContent() {
    const { business, currentUserProfile, triggerRefresh, addToQueue, mutateBusiness } = usePOS();
    const { promptInstall, isInstallable, isAppInstalled } = usePWA();

    const { permission, requestPermission, unsubscribe, fcmToken, isLoading: isFcmLoading } = useFCM();
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
    const [isTauri, setIsTauri] = React.useState(false);
    const [currentVersion, setCurrentVersion] = React.useState<string>('0.3.5');
    const [isCheckingUpdates, setIsCheckingUpdates] = React.useState(false);
    const isNative = isTauri; // Derived from isTauri state

    React.useEffect(() => {
        const checkTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
        setIsTauri(!!checkTauri);
        
        if (checkTauri) {
            import('@tauri-apps/api/app').then(app => {
                app.getVersion().then(setCurrentVersion);
            });
        }
    }, []);

    const [currency, setCurrency] = React.useState('NGN');
    const [timezone, setTimezone] = React.useState('Africa/Lagos');
    const [defaultTaxRate, setDefaultTaxRate] = React.useState('0');
    const [paymentBankCode, setPaymentBankCode] = React.useState('');
    const [paymentBankAccountId, setPaymentBankAccountId] = React.useState('');
    const [paymentAccountName, setPaymentAccountName] = React.useState('');
    const [paymentInstructions, setPaymentInstructions] = React.useState('');

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

    // Operating Hours state
    const [operatingHoursEnabled, setOperatingHoursEnabled] = React.useState(false);
    const [openTime, setOpenTime] = React.useState('08:00');
    const [closeTime, setCloseTime] = React.useState('18:00');
    const [preventSalesOutsideHours, setPreventSalesOutsideHours] = React.useState(false);

    // Effect to populate form fields when business data loads
    React.useEffect(() => {
        if (business?.settings) {
            setBusinessName((business.name || '').replace(/\s+Business$/i, ''));
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
            setPaymentInstructions(business.settings?.paymentInstructions || '');

            setLoyaltyEnabled(business.settings.loyaltyProgramEnabled || false);
            setPointsPerUnit(String(business.settings.pointsPerUnit || 1));

            setIndustry(business.settings?.industry || '');
            setCountry(business.settings?.country || 'Nigeria');
            setState(business.settings?.state || '');
            setFiscalYearStart(business.settings?.fiscalYearStart || 'January');
            setShippingOptions(business.settings?.publicStore?.shippingOptions || []);
            setProductCategories(business.settings?.productCategories || []);

            // Operating Hours
            setOperatingHoursEnabled(business.settings?.operatingHours?.enabled || false);
            setOpenTime(business.settings?.operatingHours?.openTime || '08:00');
            setCloseTime(business.settings?.operatingHours?.closeTime || '18:00');
            setPreventSalesOutsideHours(business.settings?.operatingHours?.preventSalesOutsideHours || false);
        }
    }, [business]);

    // Sessions state
    const [sessions, setSessions] = React.useState<any[]>([]);
    const [isRevoking, setIsRevoking] = React.useState<Record<string, boolean>>({});
    const [showAllSessions, setShowAllSessions] = React.useState(false);

    React.useEffect(() => {
        if (!currentUserProfile?.id || !firestore) return;

        const sessionsRef = collection(firestore, 'users', currentUserProfile.id, 'sessions');
        const q = query(sessionsRef, orderBy('lastSeen', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSessions(sessionsData);
        }, (error) => {
            console.error("Error listening to sessions:", error);
        });

        return () => unsubscribe();
    }, [currentUserProfile?.id, firestore]);

    const handleRevokeSession = async (sessionId: string) => {
        if (!currentUserProfile?.id) return;
        setIsRevoking(prev => ({ ...prev, [sessionId]: true }));
        try {
            const sessionRef = doc(firestore, 'users', currentUserProfile.id, 'sessions', sessionId);
            await updateDoc(sessionRef, { revoked: true });
            toast({
                variant: 'success',
                title: 'Access Revoked',
                description: 'The device has been successfully logged out.'
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Revoke Failed',
                description: 'Could not revoke session access.'
            });
        } finally {
            setIsRevoking(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobi')) return <Smartphone className="h-4 w-4" />;
        if (ua.includes('tablet') || ua.includes('ipad')) return <Tablet className="h-4 w-4" />;
        return <Monitor className="h-4 w-4" />;
    };

    const formatUA = (userAgent: string) => {
        // Simple UA parser (can be improved)
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Mac OS')) return 'MacBook / MacOS';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('Android')) return 'Android Device';
        if (userAgent.includes('Linux')) return 'Linux PC';
        return 'Unknown Device';
    };

    React.useEffect(() => {
        setPaymentAccountName('');
    }, [paymentBankAccountId, paymentBankCode]);


    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processLogoFile(file);
        }
    };

    const handleNativeLogoUpload = async () => {
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const { readFile } = await import('@tauri-apps/plugin-fs');
            
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Image',
                    extensions: ['png', 'jpg', 'jpeg', 'webp']
                }]
            });

            if (selected && !Array.isArray(selected)) {
                const fileData = await readFile(selected);
                const fileName = selected.split(/[\\/]/).pop() || 'logo.png';
                // Detect mime type from extension
                const ext = fileName.split('.').pop()?.toLowerCase();
                const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                
                const blob = new Blob([fileData], { type: mimeType });
                const file = new File([blob], fileName, { type: mimeType });
                processLogoFile(file);
            }
        } catch (err) {
            console.error('Native upload failed:', err);
        }
    };

    const processLogoFile = (file: File) => {
        if (file.size > 2 * 1024 * 1024) { // 2MB
            toast({ variant: 'destructive', title: 'Image Too Large', description: 'Please select an image smaller than 2MB.' });
            return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
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

    const handleCheckUpdates = async () => {
        if (!isTauri) return;
        setIsCheckingUpdates(true);
        try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const update = await check();
            if (update) {
                toast({
                    title: "Update Available",
                    description: `A new version (v${update.version}) is available. It will begin downloading in the background.`,
                });
                // The TauriUpdater component in the root layout will handle the UI for downloading/restarting
            } else {
                toast({
                    title: "Up to Date",
                    description: "You are running the latest version of Zeneva.",
                });
            }
        } catch (error) {
            console.error('Update check failed:', error);
            toast({
                variant: 'destructive',
                title: "Update Check Failed",
                description: error instanceof Error ? error.message : "The update server is currently unreachable or no metadata file was found. This usually happens if no new version has been published to the update channel yet.",
            });
        } finally {
            setIsCheckingUpdates(false);
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

        try {
            if (isTauri) {
                // Use offline queue for desktop
                addToQueue({
                    type: 'update-settings',
                    payload: finalData,
                }, `Update ${formName} settings`);
                
                toast({ 
                  variant: "success", 
                  title: `${formName.charAt(0).toUpperCase() + formName.slice(1)} Settings Queued`, 
                  description: `Settings will be synced when online.` 
                });
                
                // Optimistically update business state in context (if mutateBusiness supports it)
                if (mutateBusiness) {
                    // This will be handled by the context's effect on queuedActions
                    // but we can also call mutateBusiness with the new data for immediate UI update
                }
            } else {
                // Web behavior
                const businessDocRef = doc(firestore, 'businessInstances', business.id);
                await updateDoc(businessDocRef, finalData);
                toast({ variant: "success", title: `${formName.charAt(0).toUpperCase() + formName.slice(1)} Settings Saved`, description: `Your settings have been updated.` });
            }
            
            // Force a re-fetch of business data to update all industry-specific UI components
            triggerRefresh();
            if (mutateBusiness) mutateBusiness();
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed", description: `Could not save your settings.` });
        } finally {
            setIsSaving(prev => ({ ...prev, [formName]: false }));
        }
    };

    const handleSendTestNotification = async () => {
        if (!currentUserProfile?.id) return;
        try {
            await addDoc(collection(firestore, `users/${currentUserProfile.id}/notifications`), {
                title: "Test Notification",
                body: "This is a test notification from Zeneva Settings. If you see this, notifications are working!",
                createdAt: serverTimestamp(),
                read: false,
                type: 'system'
            });
            toast({ title: "Test Notification Sent", description: "You should see it in your notification panel shortly." });
        } catch (error) {
            console.error("Error sending test notification:", error);
            toast({ variant: "destructive", title: "Test Failed", description: "Could not send test notification." });
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

    const processedSessions = React.useMemo(() => {
        const groups = new Map<string, any>();

        sessions.forEach(session => {
            const deviceType = formatUA(session.userAgent || 'Unknown');
            const platform = session.deviceInfo?.platform || 'Unknown OS';
            // Group by device type and platform more aggressively
            const key = `${deviceType}-${platform}`.toLowerCase();

            const currentSessionIdKey = `zeneva_session_id_${currentUserProfile?.id}`;
            const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem(currentSessionIdKey) : null;
            const isCurrent = session.id === currentSessionId;

            // Priority: 1. Current Session, 2. Latest active session for that device
            if (isCurrent || !groups.has(key)) {
                groups.set(key, session);
            }
        });

        return Array.from(groups.values()).sort((a, b) => {
            const currentSessionIdKey = `zeneva_session_id_${currentUserProfile?.id}`;
            const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem(currentSessionIdKey) : null;
            if (a.id === currentSessionId) return -1;
            if (b.id === currentSessionId) return 1;
            return (b.lastSeen?.seconds || 0) - (a.lastSeen?.seconds || 0);
        });
    }, [sessions, currentUserProfile?.id]);

    return (
        <div className="space-y-6">
            <PageTitle title="Settings" subtitle="Manage your store's core configurations." />

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Profile</CardTitle>
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
                                <div 
                                    className="mt-1 w-full aspect-square rounded-md border-2 border-dashed flex items-center justify-center relative overflow-hidden group hover:border-primary/50 transition-colors"
                                    onClick={() => isTauri && handleNativeLogoUpload()}
                                >
                                    {logoPreview ? <Image src={logoPreview} alt="Logo preview" fill className="object-cover" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                                    {!isTauri && (
                                        <Input id="logo-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoChange} />
                                    )}
                                    {isTauri && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                            <span className="text-white text-xs font-bold">Pick Image</span>
                                        </div>
                                    )}
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
                            <div>
                                <Label>Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                        <SelectItem value="CAD">CAD ($)</SelectItem>
                                        <SelectItem value="AUD">AUD ($)</SelectItem>
                                        <SelectItem value="GHS">GHS (GH¢)</SelectItem>
                                        <SelectItem value="ZAR">ZAR (R)</SelectItem>
                                        <SelectItem value="KES">KES (KSh)</SelectItem>
                                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                                        <SelectItem value="CNY">CNY (¥)</SelectItem>
                                        <SelectItem value="INR">INR (₹)</SelectItem>
                                        <SelectItem value="BRL">BRL (R$)</SelectItem>
                                        <SelectItem value="CHF">CHF (Fr)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                                <div>
                                    <Label htmlFor="paymentInstructions">Payment Instructions / Invoice Notes</Label>
                                    <Textarea
                                        id="paymentInstructions"
                                        placeholder="e.g. Please include your Invoice ID as the payment reference. Thank you!"
                                        value={paymentInstructions}
                                        onChange={e => setPaymentInstructions(e.target.value)}
                                        className="h-20"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">These notes will appear at the bottom of your invoices.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('financials', { "settings.currency": currency, "settings.timezone": timezone, "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0, "settings.paymentBankCode": paymentBankCode, 'settings.paymentBankName': NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label, "settings.paymentBankAccountId": paymentBankAccountId, "settings.paymentAccountName": paymentAccountName, "settings.paymentInstructions": paymentInstructions })} disabled={isSaving["financials"]}>
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
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Notifications</CardTitle>
                        <CardDescription>Manage your push notification preferences.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    {permission === 'granted'
                                        ? "You are receiving notifications. (Test in background)"
                                        : permission === 'denied'
                                            ? "Notifications are blocked. Please enable them in your browser settings."
                                            : "Enable push notifications to stay updated on orders and stock."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {permission === 'granted' && (
                                    <Button
                                        onClick={handleSendTestNotification}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Send Test
                                    </Button>
                                )}
                                <Button
                                    onClick={fcmToken ? unsubscribe : requestPermission}
                                    disabled={isFcmLoading}
                                    variant={fcmToken ? "destructive" : "default"}
                                    size="sm"
                                >
                                    {isFcmLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {fcmToken ? "Disable" : "Enable"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Security & Devices</CardTitle>
                        <CardDescription>Manage your active login sessions and registered devices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            {processedSessions.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    No active sessions found.
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4">
                                        {(showAllSessions ? processedSessions : processedSessions.slice(0, 3)).map((session) => {
                                            const currentSessionIdKey = `zeneva_session_id_${currentUserProfile?.id}`;
                                            const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem(currentSessionIdKey) : null;
                                            const isCurrent = session.id === currentSessionId;

                                            return (
                                                <div key={session.id} className={cn(
                                                    "flex items-center justify-between p-4 rounded-lg border transition-colors",
                                                    session.revoked ? "opacity-50 grayscale" : "bg-card",
                                                    isCurrent && "border-primary ring-1 ring-primary/20 shadow-sm"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "p-2 rounded-full",
                                                            isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {getDeviceIcon(session.userAgent || '')}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{formatUA(session.userAgent || 'Unknown')}</span>
                                                                {isCurrent && <Badge variant="default" className="text-[10px] h-4 px-1">This Device</Badge>}
                                                                {session.revoked && <Badge variant="destructive" className="text-[10px] h-4 px-1">Revoked</Badge>}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                                                <span>{session.deviceInfo?.platform || 'Unknown OS'}</span>
                                                                <span className="hidden sm:inline opacity-30">•</span>
                                                                <span>Last active: {session.lastSeen instanceof Timestamp ? formatDistanceToNow(session.lastSeen.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!session.revoked && !isCurrent && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-muted-foreground hover:text-destructive"
                                                            disabled={isRevoking[session.id]}
                                                            onClick={() => handleRevokeSession(session.id)}
                                                        >
                                                            {isRevoking[session.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {processedSessions.length > 3 && (
                                        <Button 
                                            variant="outline" 
                                            className="w-full mt-2 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                            onClick={() => setShowAllSessions(!showAllSessions)}
                                        >
                                            {showAllSessions ? (
                                                <>Show Less</>
                                            ) : (
                                                <>Show More ({processedSessions.length - 3} more)</>
                                            )}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Operating Hours</CardTitle>
                        <CardDescription>Set your business opening and closing hours to track or prevent sales outside these times.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base text-stone-900">Enable Working Hours Tracking</Label>
                                <p className="text-sm text-muted-foreground">Monitor or restrict sales recorded outside of business hours.</p>
                            </div>
                            <Switch checked={operatingHoursEnabled} onCheckedChange={setOperatingHoursEnabled} />
                        </div>

                        {operatingHoursEnabled && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="openTime">Opening Time</Label>
                                        <Input
                                            id="openTime"
                                            type="time"
                                            value={openTime}
                                            onChange={e => setOpenTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="closeTime">Closing Time</Label>
                                        <Input
                                            id="closeTime"
                                            type="time"
                                            value={closeTime}
                                            onChange={e => setCloseTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4 bg-orange-50/50 border-orange-100">
                                    <div className="space-y-0.5 pr-8">
                                        <Label className="text-base text-orange-900">Enforce Strict Hours</Label>
                                        <p className="text-sm text-orange-700/70">
                                            If enabled, operators will be blocked from completing sales outside these hours. Otherwise, sales will just be flagged in the logs.
                                        </p>
                                    </div>
                                    <Switch checked={preventSalesOutsideHours} onCheckedChange={setPreventSalesOutsideHours} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="button"
                            onClick={() => handleSettingsSubmit('operating-hours', {
                                'settings.operatingHours': {
                                    enabled: operatingHoursEnabled,
                                    openTime,
                                    closeTime,
                                    preventSalesOutsideHours
                                }
                            })}
                            disabled={isSaving["operating-hours"]}
                        >
                            {isSaving["operating-hours"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Working Hours
                        </Button>
                    </CardFooter>
                </Card>

                {isInstallable && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />App Installation</CardTitle>
                            <CardDescription>Install Zeneva on this device for a native experience.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="default" className="w-full" onClick={promptInstall}>
                                <Download className="mr-2 h-4 w-4" />
                                Install App
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {isNative && (
                    <Card className="border-border/15 dark:border-border/25 shadow-none hover:shadow-sm transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-primary" />
                                Software Updates
                            </CardTitle>
                            <CardDescription>
                                Check for the latest features and security updates for the Zeneva desktop app.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Current Version</p>
                                    <p className="text-2xl font-bold text-primary">v{currentVersion}</p>
                                </div>
                                <Button 
                                    onClick={handleCheckUpdates} 
                                    disabled={isCheckingUpdates}
                                    variant="outline"
                                    className="border-primary text-primary hover:bg-primary hover:text-white"
                                >
                                    {isCheckingUpdates ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Check for Updates
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground italic">
                                Note: Zeneva normally checks for updates automatically every hour.
                            </p>
                        </CardFooter>
                    </Card>
                )}

                {/* Appearance - Placed at the very bottom as requested */}
                <div className="pt-6 mt-6 border-t border-border/10">
                    <Card className="border-border/15 dark:border-border/25 shadow-none hover:shadow-sm transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Appearance & Theme</CardTitle>
                            <CardDescription>Customize the visual interface of Zeneva.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ThemeSwitcher />
                        </CardContent>
                    </Card>
                </div>
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
