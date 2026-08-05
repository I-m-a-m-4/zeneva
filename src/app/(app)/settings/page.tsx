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
import { Briefcase, Percent, Loader2, RefreshCw, Trash2, Globe, Landmark, Upload, Building, CreditCard, Banknote, ShieldQuestion, Palette, Truck, Package, Plus, MapPin, Award, Download, Bell, Monitor, Smartphone, Tablet, Shield, ShieldCheck, LogOut, Star } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import FeatureGate from '@/components/shared/feature-gate';
import { BusinessInstance, UserProfile } from '@/types';
import { ALL_CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/constants';
import { Combobox } from '@/components/ui/combobox';

const CURRENCY_COUNTRY_CODES: Record<string, string> = {
  USD: 'us', EUR: 'eu', GBP: 'gb', NGN: 'ng', PKR: 'pk', MUR: 'mu', GHS: 'gh', KES: 'ke', ZAR: 'za',
  CAD: 'ca', AUD: 'au', INR: 'in', AED: 'ae', SAR: 'sa', JPY: 'jp', CNY: 'cn', BRL: 'br', CHF: 'ch',
  AFN: 'af', ALL: 'al', AMD: 'am', ANG: 'an', AOA: 'ao', ARS: 'ar', AWG: 'aw', AZN: 'az', BAM: 'ba',
  BBD: 'bb', BDT: 'bd', BGN: 'bg', BHD: 'bh', BIF: 'bi', BMD: 'bm', BND: 'bn', BOB: 'bo', BSD: 'bs',
  BTN: 'bt', BWP: 'bw', BYN: 'by', BZD: 'bz', CDF: 'cd', CLP: 'cl', COP: 'co', CRC: 'cr', CUP: 'cu',
  CVE: 'cv', CZK: 'cz', DJF: 'dj', DKK: 'dk', DOP: 'do', DZD: 'dz', EGP: 'eg', ERN: 'er', ETB: 'et',
  FJD: 'fj', FKP: 'fk', GEL: 'ge', GIP: 'gi', GMD: 'gm', GNF: 'gn', GTQ: 'gt', GYD: 'gy', HKD: 'hk',
  HNL: 'hn', HRK: 'hr', HTG: 'ht', HUF: 'hu', IDR: 'id', ILS: 'il', IQD: 'iq', IRR: 'ir', ISK: 'is',
  JMD: 'jm', JOD: 'jo', KGS: 'kg', KHR: 'kh', KMF: 'km', KPW: 'kp', KRW: 'kr', KWD: 'kw', KYD: 'ky',
  KZT: 'kz', LAK: 'la', LBP: 'lb', LKR: 'lk', LRD: 'lr', LSL: 'ls', LYD: 'ly', MAD: 'ma', MDL: 'md',
  MGA: 'mg', MKD: 'mk', MMK: 'mm', MNT: 'mn', MOP: 'mo', MRU: 'mr', MUR: 'mu', MVR: 'mv', MWK: 'mw',
  MXN: 'mx', MYR: 'my', MZN: 'mz', NAD: 'na', NOK: 'no', NPR: 'np', NZD: 'nz', OMR: 'om', PAB: 'pa',
  PEN: 'pe', PGK: 'pg', PHP: 'ph', PLN: 'pl', PYG: 'py', QAR: 'qa', RON: 'ro', RSD: 'rs', RUB: 'ru',
  RWF: 'rw', SGD: 'sg', SHP: 'sh', SLL: 'sl', SOS: 'so', SRD: 'sr', SSP: 'ss', STN: 'st', SYP: 'sy',
  SZL: 'sz', THB: 'th', TJS: 'tj', TMT: 'tm', TND: 'tn', TOP: 'to', TRY: 'tr', TTD: 'tt', TWD: 'tw',
  TZS: 'tz', UAH: 'ua', UGX: 'ug', UYU: 'uy', UZS: 'uz', VES: 've', VND: 'vn', VUV: 'vu', WST: 'ws',
  XAF: 'cm', XCD: 'ag', XOF: 'sn', XPF: 'pf', YER: 'ye', ZMW: 'zm', ZWL: 'zw'
};
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
import { PhoneInput } from '@/components/ui/phone-input';

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

const GLOBAL_COUNTRIES = [
    "Nigeria",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "South Africa",
    "Kenya",
    "Ghana",
    "United Arab Emirates",
    "Saudi Arabia",
    "India",
    "Switzerland"
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
    const hasLifetimeAccess = business?.accessLevel === 'lifetime';
    const isOwnerOrAdmin = currentUserProfile && (
        currentUserProfile.role === 'admin' ||
        currentUserProfile.role === 'owner' ||
        business?.ownerId === currentUserProfile.id
    );
    const { promptInstall, isInstallable, isAppInstalled } = usePWA();

    const { permission, requestPermission, unsubscribe, fcmToken, isLoading: isFcmLoading } = useFCM();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // General state
    const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [bvn, setBvn] = React.useState('');
    const [isVerifyingBvn, setIsVerifyingBvn] = React.useState(false);

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
    const [isActivatingTerminal, setIsActivatingTerminal] = React.useState(false);
    const [isDeactivatingTerminal, setIsDeactivatingTerminal] = React.useState(false);

    const [ipCountry, setIpCountry] = React.useState<string | null>(null);

    React.useEffect(() => {
        const checkIp = () => {
            const cached = sessionStorage.getItem('zeneva_ip_country');
            if (cached) setIpCountry(cached);
            else setTimeout(checkIp, 1000);
        };
        checkIp();
    }, []);

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
            const response = await fetch('https://zeneva.space/api/paystack/resolve-account', {
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

    const handleActivateTerminal = async () => {
        if (!paymentBankAccountId || !paymentBankCode) {
            toast({ variant: "destructive", title: "Activation Error", description: "Please verify and save your payout details first." });
            return;
        }
        const effectivePhone = businessPhone || business?.settings?.phone || '';
        if (!effectivePhone) {
            toast({ variant: "destructive", title: "Phone Number Required", description: "Please add a business phone number in the Business Profile section above, then save it before activating the terminal." });
            return;
        }
        setIsActivatingTerminal(true);
        try {
            const response = await fetch('/api/paystack/activate-terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: business.id,
                    businessName: businessName,
                    email: currentUserProfile?.email || '',
                    phone: effectivePhone,
                    bankCode: paymentBankCode,
                    accountNumber: paymentBankAccountId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Paystack terminal activation failed.');
            }

            const terminalUpdates = {
                "settings.terminalBankName": result.bankName,
                "settings.terminalAccountNumber": result.accountNumber,
                "settings.terminalAccountName": result.accountName,
                "settings.paystackSubaccountCode": result.subaccountCode
            };

            await handleSettingsSubmit('financials', {
                "settings.currency": currency,
                "settings.timezone": timezone,
                "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0,
                "settings.paymentBankCode": paymentBankCode,
                "settings.paymentBankName": NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label || paymentBankCode || '',
                "settings.paymentBankAccountId": paymentBankAccountId,
                "settings.paymentAccountName": paymentAccountName,
                "settings.paymentInstructions": paymentInstructions,
                ...terminalUpdates
            });

            toast({
                variant: 'success',
                title: 'Zeneva Terminal Activated',
                description: `Dedicated Virtual Account generated successfully: ${result.bankName} - ${result.accountNumber}`
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Activation Failed", description: error.message });
        } finally {
            setIsActivatingTerminal(false);
        }
    };

    const handleVerifyBvn = async () => {
        if (!bvn || bvn.length !== 11) {
            toast({ variant: "destructive", title: "Invalid BVN", description: "Please enter a valid 11-digit BVN." });
            return;
        }

        setIsVerifyingBvn(true);
        try {
            const storeEmail = currentUserProfile?.email || `terminal-${business?.id?.substring(0, 8)}@zeneva.space`;
            const response = await fetch('/api/paystack/verify-customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: business?.id,
                    bvn: bvn,
                    email: storeEmail
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Verification failed.');
            }

            await handleSettingsSubmit('compliance', {
                "settings.kycStatus": "verified",
                "settings.bvnProvided": true
            });

            toast({
                variant: 'success',
                title: 'Verification Successful',
                description: 'Your identity has been verified with Paystack.'
            });
            setBvn('');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Verification Failed", description: error.message });
        } finally {
            setIsVerifyingBvn(false);
        }
    };

    const handleDeactivateTerminal = async () => {
        setIsDeactivatingTerminal(true);
        try {
            await handleSettingsSubmit('financials', {
                "settings.currency": currency,
                "settings.timezone": timezone,
                "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0,
                "settings.paymentBankCode": paymentBankCode,
                "settings.paymentBankName": NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label || paymentBankCode || '',
                "settings.paymentBankAccountId": paymentBankAccountId,
                "settings.paymentAccountName": paymentAccountName,
                "settings.paymentInstructions": paymentInstructions,
                "settings.terminalBankName": null,
                "settings.terminalAccountNumber": null,
                "settings.terminalAccountName": null,
                "settings.paystackSubaccountCode": null
            });

            toast({
                variant: 'success',
                title: 'Terminal Deactivated',
                description: 'Zeneva Terminal has been successfully deactivated.'
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Deactivation Failed", description: error.message });
        } finally {
            setIsDeactivatingTerminal(false);
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
            const performOptimisticUpdate = () => {
                if (mutateBusiness) {
                    mutateBusiness((prev: any) => {
                        if (!prev) return null;
                        const updated = { ...prev };
                        Object.keys(finalData).forEach(key => {
                            if (key.includes('.')) {
                                const parts = key.split('.');
                                let curr: any = updated;
                                for (let i = 0; i < parts.length - 1; i++) {
                                    curr[parts[i]] = { ...curr[parts[i]] };
                                    curr = curr[parts[i]];
                                }
                                curr[parts[parts.length - 1]] = finalData[key];
                            } else {
                                (updated as any)[key] = finalData[key];
                            }
                        });
                        return updated;
                    });
                }
            };

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

                performOptimisticUpdate();
            } else {
                // Web behavior
                const businessDocRef = doc(firestore, 'businessInstances', business.id);
                await updateDoc(businessDocRef, finalData);
                toast({ variant: "success", title: `${formName.charAt(0).toUpperCase() + formName.slice(1)} Settings Saved`, description: `Your settings have been updated.` });

                performOptimisticUpdate();

                // Force a re-fetch of business data to update all industry-specific UI components
                triggerRefresh();
            }
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

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="w-full flex-wrap justify-start h-auto bg-transparent p-0 gap-2 mb-4 border-b pb-4">
                    <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/50 rounded-md px-4 py-2">General</TabsTrigger>
                    <TabsTrigger value="storefront" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/50 rounded-md px-4 py-2">Storefront</TabsTrigger>
                    <TabsTrigger value="financials" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/50 rounded-md px-4 py-2">Financials & Billing</TabsTrigger>
                    <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/50 rounded-md px-4 py-2">System & Security</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-6 mt-0">
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
                                    <div>
                                        <Label htmlFor="businessPhone">Business Phone</Label>
                                        <PhoneInput
                                            id="businessPhone"
                                            value={businessPhone}
                                            onChange={setBusinessPhone}
                                            className="mt-1"
                                        />
                                    </div>
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



                {isOwnerOrAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Multi-Branch Management</CardTitle>
                            <CardDescription>Manage multiple store locations, warehouses, and split inventory across locations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/20">
                                <div className="space-y-1 mb-4 sm:mb-0">
                                    <h4 className="font-semibold text-sm">Branches & Locations</h4>
                                    <p className="text-sm text-muted-foreground">Manage your physical stores and track inventory per location.</p>
                                </div>
                                <Button asChild>
                                    <Link href="/settings/branches">Manage Branches</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-border/15 dark:border-border/25 shadow-none hover:shadow-sm transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary fill-primary" />Rate & Review</CardTitle>
                        <CardDescription>Love using Zeneva? Help us grow by leaving a review on your app store!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="outline" 
                            className="w-full border-primary text-primary hover:bg-primary hover:text-white"
                            onClick={() => {
                                const ua = navigator.userAgent.toLowerCase();
                                const isAndroid = ua.includes('android');
                                const isMobile = isAndroid || ua.includes('iphone') || ua.includes('ipad');
                                const isDesktopApp = (window as any).__TAURI__ || ua.includes('tauri');

                                if (isAndroid) {
                                    // Android — open Play Store review page directly
                                    window.open('market://details?id=com.zeneva.app', '_blank');
                                    setTimeout(() => {
                                        window.open('https://play.google.com/store/apps/details?id=com.zeneva.app', '_blank');
                                    }, 800);
                                } else if (isDesktopApp || !isMobile) {
                                    // Windows desktop app or desktop browser — open Microsoft Store
                                    window.open('ms-windows-store://review/?ProductId=9nvn0f8njwmj', '_blank');
                                    setTimeout(() => {
                                        window.open('https://apps.microsoft.com/detail/9nvn0f8njwmj?hl=en-US&gl=NG&ocid=pdpshare', '_blank');
                                    }, 800);
                                } else {
                                    // Fallback (iOS etc.)
                                    window.open('https://play.google.com/store/apps/details?id=com.zeneva.app', '_blank');
                                }
                            }}
                        >
                            <Star className="mr-2 h-4 w-4" />
                            Write a Review
                        </Button>
                    </CardContent>
                </Card>

                </TabsContent>
                
                <TabsContent value="storefront" className="space-y-6 mt-0">
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

                
                </TabsContent>
                
                <TabsContent value="financials" className="space-y-6 mt-0">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment & Financials</CardTitle>
                        <CardDescription>Manage currency, taxes, and payment details for online and offline sales.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Currency</Label>
                                <Combobox
                                    options={ALL_CURRENCIES.map(curr => ({
                                        value: curr.value,
                                        label: curr.label
                                    }))}
                                    value={currency}
                                    onChange={(val) => setCurrency(val)}
                                    placeholder="Select currency"
                                    searchPlaceholder="Search currency..."
                                    renderSelected={(opt) => (
                                        <div className="flex items-center gap-2">
                                            <img 
                                                src={`https://flagcdn.com/16x12/${CURRENCY_COUNTRY_CODES[opt.value] || 'un'}.png`} 
                                                alt="" 
                                                className="w-4 h-3 object-cover rounded-sm shrink-0" 
                                            />
                                            <span>{opt.value}</span>
                                        </div>
                                    )}
                                    renderItem={(opt) => (
                                        <div className="flex items-center gap-2 w-full">
                                            <img 
                                                src={`https://flagcdn.com/16x12/${CURRENCY_COUNTRY_CODES[opt.value] || 'un'}.png`} 
                                                alt="" 
                                                className="w-4 h-3 object-cover rounded-sm shrink-0" 
                                            />
                                            <span className="truncate">{opt.label}</span>
                                        </div>
                                    )}
                                    triggerClassName="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Timezone</Label>
                                <Combobox
                                    options={typeof Intl !== 'undefined' && Intl.supportedValuesOf 
                                      ? Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz }))
                                      : [{ value: 'Africa/Lagos', label: 'Africa/Lagos' }]}
                                    value={timezone}
                                    onChange={(val) => setTimezone(val)}
                                    placeholder="Select timezone"
                                    searchPlaceholder="Search timezone..."
                                    triggerClassName="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md"
                                />
                            </div>
                            <div><Label>Default Tax Rate (%)</Label><Input type="number" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} /></div>
                        </div>
                        {(ipCountry === 'Nigeria' || currency === 'NGN') && (
                            <>
                                <Separator />
                                <FeatureGate
                                    requiredPlan="business"
                                    currentPlan={business?.plan}
                                    hasLifetimeAccess={hasLifetimeAccess}
                                    featureName="Zeneva Terminal Integration"
                                    featureDescription="Enable direct Paystack subaccount creation and automated payout routing with the Zeneva Terminal."
                                    variant="rich"
                                >
                            <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2 mb-2"><Banknote className="h-5 w-5 text-muted-foreground" />Bank Transfer Details</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Provide bank details for "Bank Transfer" payments at checkout.
                                    {currency === 'NGN' && ' This will also create a Paystack Subaccount for card payments.'}
                                </p>
                                <div className="space-y-4">
                                    <div className={cn("grid gap-4 items-end", currency === 'NGN' ? "grid-cols-1 sm:grid-cols-[2fr_1fr]" : "grid-cols-1")}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                            <div>
                                                <Label>Bank Name</Label>
                                                {currency === 'NGN' ? (
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md">
                                                                <span>{NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label || "Select a bank"}</span>
                                                                <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto bg-popover text-popover-foreground shadow-md rounded-md border p-1 z-50">
                                                            {NIGERIAN_BANKS.map(b => (
                                                                <DropdownMenuItem key={b.value} onClick={() => setPaymentBankCode(b.value)} className="cursor-pointer">
                                                                    {b.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <Input 
                                                        value={paymentBankCode} 
                                                        onChange={e => setPaymentBankCode(e.target.value)} 
                                                        placeholder="Enter Bank Name (e.g. Chase)" 
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <Label>{currency === 'NGN' ? "Account Number" : "Account Number / IBAN"}</Label>
                                                <Input 
                                                    value={paymentBankAccountId} 
                                                    onChange={e => setPaymentBankAccountId(e.target.value)} 
                                                    placeholder={currency === 'NGN' ? "10-digit number" : "e.g. US1234567890"} 
                                                />
                                            </div>
                                        </div>
                                        {currency === 'NGN' ? (
                                            <Button type="button" onClick={handleVerifyAccount} disabled={isVerifying} className="w-full">
                                                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify Account
                                            </Button>
                                        ) : (
                                            <div className="w-full">
                                                <Label>Account Name</Label>
                                                <Input 
                                                    value={paymentAccountName} 
                                                    onChange={e => setPaymentAccountName(e.target.value)} 
                                                    placeholder="Enter Account Name" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {currency === 'NGN' && paymentAccountName && (
                                        <div>
                                            <Label>Resolved Account Name</Label>
                                            <Input value={paymentAccountName} readOnly className="bg-muted font-bold text-emerald-600" />
                                        </div>
                                    )}
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
                                    {currency === 'NGN' && ipCountry === 'Nigeria' && (
                                        business?.settings?.terminalAccountNumber ? (
                                            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-500/5 space-y-2 mt-4 animate-fadeIn">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-semibold text-emerald-800 text-sm flex items-center gap-1.5">
                                                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                                        Active Zeneva Terminal Account
                                                    </h5>
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-white text-[10px]">Active (Live)</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Customers can make transfers to this permanent account to trigger automated POS alerts.</p>
                                                <div className="grid grid-cols-2 gap-4 text-xs pt-2 font-mono border-b border-emerald-100/30 pb-2">
                                                    <div>
                                                        <span className="text-slate-400 block">Bank Name</span>
                                                        <span className="font-bold text-slate-800">{business.settings.terminalBankName || 'Wema Bank'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block">Account Number</span>
                                                        <span className="font-bold text-slate-800">{business.settings.terminalAccountNumber}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-slate-400 block">Account Name</span>
                                                        <span className="font-bold text-slate-800">{business.settings.terminalAccountName || `Zeneva - ${business.name}`}</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex items-center justify-between border-t border-emerald-100/10">
                                                    <div className="text-[11px] text-emerald-600 leading-relaxed">
                                                        <strong>✓ Live Mode:</strong> Automated payouts and chimes are active.
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={handleDeactivateTerminal}
                                                        disabled={isDeactivatingTerminal}
                                                        className="text-xs h-7 px-3 flex items-center gap-1.5"
                                                    >
                                                        {isDeactivatingTerminal ? (
                                                            <>
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                Deactivating...
                                                            </>
                                                        ) : (
                                                            "Deactivate Terminal"
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            business?.settings?.paymentBankAccountId && (
                                                <div className="p-4 rounded-xl border border-orange-100 bg-orange-500/5 space-y-3 mt-4">
                                                    <div>
                                                        <h5 className="font-semibold text-orange-800 text-sm flex items-center gap-1.5">
                                                            <Banknote className="h-4 w-4 text-orange-600" />
                                                            Activate Zeneva Terminal
                                                        </h5>
                                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                            Generate your permanent, static store transfer account with Paystack. This allows your operators to receive instant confirmation alerts without viewing your master account.
                                                        </p>
                                                    </div>
                                                    {!(businessPhone || business?.settings?.phone) && (
                                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                                                            <span className="text-base mt-0.5">⚠️</span>
                                                            <div className="text-xs leading-relaxed">
                                                                <strong>Phone number required</strong> — Please scroll up to the <strong>Business Profile</strong> section, add your business phone number (🇳🇬 +234...) and save before activating the terminal.
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded-lg border border-dashed text-xs text-muted-foreground my-3">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                            Transparent Processing Fees
                                                        </div>
                                                        <p>Zeneva takes <strong>0% commission</strong> on your payouts.</p>
                                                        <p>Paystack charges a standard automated processing fee of <strong>1% (capped at ₦300)</strong> per bank transfer.</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={handleActivateTerminal}
                                                        disabled={isActivatingTerminal}
                                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs py-1.5 h-8 flex items-center justify-center gap-2"
                                                    >
                                                        {isActivatingTerminal ? (
                                                            <>
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                Activating Terminal & Provisioning DVA...
                                                            </>
                                                        ) : (
                                                            "Activate Zeneva Terminal"
                                                        )}
                                                    </Button>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                            </div>
                        </FeatureGate>
                            </>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={() => handleSettingsSubmit('financials', { "settings.currency": currency, "settings.timezone": timezone, "settings.defaultTaxRate": parseFloat(defaultTaxRate) || 0, "settings.paymentBankCode": paymentBankCode, 'settings.paymentBankName': NIGERIAN_BANKS.find(b => b.value === paymentBankCode)?.label || paymentBankCode || '', "settings.paymentBankAccountId": paymentBankAccountId, "settings.paymentAccountName": paymentAccountName, "settings.paymentInstructions": paymentInstructions })} disabled={isSaving["financials"]}>
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

                </TabsContent>
                
                <TabsContent value="system" className="space-y-6 mt-0">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Organization</CardTitle>
                        <CardDescription>Manage your business's industry, location, and financial year settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label>Industry</Label>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md">
                                            <span>{industry || "Select an industry"}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto bg-popover text-popover-foreground shadow-md rounded-md border p-1 z-50">
                                        {industries.map(i => (
                                            <DropdownMenuItem key={i} onClick={() => setIndustry(i)} className="cursor-pointer">
                                                {i}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div>
                                <Label>Country</Label>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md">
                                            <span>{country || "Select country"}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto bg-popover text-popover-foreground shadow-md rounded-md border p-1 z-50">
                                        {GLOBAL_COUNTRIES.map(c => (
                                            <DropdownMenuItem key={c} onClick={() => setCountry(c)} className="cursor-pointer">
                                                {c}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div><Label>State/Province</Label><Input value={state} onChange={e => setState(e.target.value)} /></div>
                            <div>
                                <Label>Fiscal Year Start</Label>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal bg-background hover:bg-accent border border-input h-10 px-3 py-2 text-sm rounded-md">
                                            <span>{fiscalYearStart || "Select month"}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto bg-popover text-popover-foreground shadow-md rounded-md border p-1 z-50">
                                        {months.map(m => (
                                            <DropdownMenuItem key={m} onClick={() => setFiscalYearStart(m)} className="cursor-pointer">
                                                {m}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Compliance & KYC</CardTitle>
                        <CardDescription>Verify your identity with Paystack to lift processing limits and scale your business.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <div className={`p-2 rounded-full ${business?.settings?.kycStatus === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Status: {business?.settings?.kycStatus === 'verified' ? 'Verified' : 'Unverified (Starter limits apply)'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {business?.settings?.kycStatus === 'verified' 
                                            ? 'Your business has been verified. You can process unlimited volumes.' 
                                            : 'Verify your BVN to lift the ₦3 million cumulative payout limit.'}
                                    </p>
                                </div>
                            </div>

                            {business?.settings?.kycStatus !== 'verified' && (
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="bvn">Bank Verification Number (BVN)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="bvn" 
                                            type="text" 
                                            maxLength={11}
                                            placeholder="Enter your 11-digit BVN" 
                                            value={bvn}
                                            onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                                        />
                                        <Button 
                                            type="button" 
                                            onClick={handleVerifyBvn}
                                            disabled={isVerifyingBvn || bvn.length !== 11}
                                        >
                                            {isVerifyingBvn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Verify BVN
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Your BVN is securely submitted directly to Paystack and is not permanently stored by Zeneva.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
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
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function SettingsPage() {
    const { isLoading: isPosLoading, business } = usePOS();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || (isPosLoading && !business)) {
        return <SettingsPageSkeleton />;
    }
    return <SettingsPageContent />;
}
