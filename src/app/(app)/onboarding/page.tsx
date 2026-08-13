
'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, ArrowRight, ArrowLeft, Building, MapPin, Globe, CalendarDays, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ALL_CURRENCIES } from '@/lib/constants';
import { Combobox } from '@/components/ui/combobox';

const onboardingSchema = z.object({
  organizationName: z.string().min(3, 'Organization name is required.'),
  industry: z.string().min(1, 'Please select an industry.'),
  address: z.string().optional(),
  state: z.string().min(2, 'State is required.'),
  country: z.string().min(2, 'Country is required.'),
  currency: z.string().min(1, 'Currency is required.'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const industries = [
  'Retail & E-commerce', 'Fashion & Apparel', 'Electronics', 'Food & Beverage', 'Health & Beauty', 'Home & Furniture', 'Other'
];
const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

// Map of country name -> ISO 3166-1 alpha-2 code for emoji flag generation
const COUNTRY_CODES: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO",
  "Antigua & Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT",
  "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB",
  "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT",
  "Bolivia": "BO", "Bosnia & Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN",
  "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cambodia": "KH",
  "Cameroon": "CM", "Canada": "CA", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG", "Costa Rica": "CR",
  "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czechia": "CZ", "DR Congo": "CD",
  "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC",
  "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
  "Eswatini": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR",
  "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH",
  "Greece": "GR", "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW",
  "Guyana": "GY", "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS",
  "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
  "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG",
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR",
  "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG",
  "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT",
  "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Moldova": "MD", "Monaco": "MC",
  "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
  "Namibia": "NA", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI",
  "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO",
  "Oman": "OM", "Pakistan": "PK", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG",
  "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT",
  "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA",
  "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG",
  "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA",
  "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD",
  "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Tajikistan": "TJ", "Tanzania": "TZ",
  "Thailand": "TH", "Togo": "TG", "Trinidad & Tobago": "TT", "Tunisia": "TN", "Turkey": "TR",
  "Turkmenistan": "TM", "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE",
  "United Kingdom": "GB", "United States": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  "Afghanistan": "AFN", "Albania": "ALL", "Algeria": "DZD", "Andorra": "EUR", "Angola": "AOA",
  "Antigua & Barbuda": "XCD", "Argentina": "ARS", "Armenia": "AMD", "Australia": "AUD", "Austria": "EUR",
  "Azerbaijan": "AZN", "Bahamas": "BSD", "Bahrain": "BHD", "Bangladesh": "BDT", "Barbados": "BBD",
  "Belarus": "BYN", "Belgium": "EUR", "Belize": "BZD", "Benin": "XOF", "Bhutan": "BTN",
  "Bolivia": "BOB", "Bosnia & Herzegovina": "BAM", "Botswana": "BWP", "Brazil": "BRL", "Brunei": "BND",
  "Bulgaria": "BGN", "Burkina Faso": "XOF", "Burundi": "BIF", "Cabo Verde": "CVE", "Cambodia": "KHR",
  "Cameroon": "XAF", "Canada": "CAD", "Central African Republic": "XAF", "Chad": "XAF", "Chile": "CLP",
  "China": "CNY", "Colombia": "COP", "Comoros": "KMF", "Congo": "XAF", "Costa Rica": "CRC",
  "Croatia": "EUR", "Cuba": "CUP", "Cyprus": "EUR", "Czechia": "CZK", "DR Congo": "CDF",
  "Denmark": "DKK", "Djibouti": "DJF", "Dominica": "XCD", "Dominican Republic": "DOP", "Ecuador": "USD",
  "Egypt": "EGP", "El Salvador": "USD", "Equatorial Guinea": "XAF", "Eritrea": "ERN", "Estonia": "EUR",
  "Eswatini": "SZL", "Ethiopia": "ETB", "Fiji": "FJD", "Finland": "EUR", "France": "EUR",
  "Gabon": "XAF", "Gambia": "GMD", "Georgia": "GEL", "Germany": "EUR", "Ghana": "GHS",
  "Greece": "EUR", "Grenada": "XCD", "Guatemala": "GTQ", "Guinea": "GNF", "Guinea-Bissau": "XOF",
  "Guyana": "GYD", "Haiti": "HTG", "Honduras": "HNL", "Hungary": "HUF", "Iceland": "ISK",
  "India": "INR", "Indonesia": "IDR", "Iran": "IRR", "Iraq": "IQD", "Ireland": "EUR",
  "Israel": "ILS", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY", "Jordan": "JOD",
  "Kazakhstan": "KZT", "Kenya": "KES", "Kiribati": "AUD", "Kuwait": "KWD", "Kyrgyzstan": "KGS",
  "Laos": "LAK", "Latvia": "EUR", "Lebanon": "LBP", "Lesotho": "LSL", "Liberia": "LRD",
  "Libya": "LYD", "Liechtenstein": "CHF", "Lithuania": "EUR", "Luxembourg": "EUR", "Madagascar": "MGA",
  "Malawi": "MWK", "Malaysia": "MYR", "Maldives": "MVR", "Mali": "XOF", "Malta": "EUR",
  "Mauritania": "MRU", "Mauritius": "MUR", "Mexico": "MXN", "Moldova": "MDL", "Monaco": "EUR",
  "Mongolia": "MNT", "Montenegro": "EUR", "Morocco": "MAD", "Mozambique": "MZN", "Myanmar": "MMK",
  "Namibia": "NAD", "Nepal": "NPR", "Netherlands": "EUR", "New Zealand": "NZD", "Nicaragua": "NIO",
  "Niger": "XOF", "Nigeria": "NGN", "North Korea": "KPW", "North Macedonia": "MKD", "Norway": "NOK",
  "Oman": "OMR", "Pakistan": "PKR", "Palestine": "ILS", "Panama": "PAB", "Papua New Guinea": "PGK",
  "Paraguay": "PYG", "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR",
  "Qatar": "QAR", "Romania": "RON", "Russia": "RUB", "Rwanda": "RWF", "Saudi Arabia": "SAR",
  "Senegal": "XOF", "Serbia": "RSD", "Seychelles": "SCR", "Sierra Leone": "SLL", "Singapore": "SGD",
  "Slovakia": "EUR", "Slovenia": "EUR", "Solomon Islands": "SBD", "Somalia": "SOS", "South Africa": "ZAR",
  "South Korea": "KRW", "South Sudan": "SSP", "Spain": "EUR", "Sri Lanka": "LKR", "Sudan": "SDG",
  "Sweden": "SEK", "Switzerland": "CHF", "Syria": "SYP", "Tajikistan": "TJS", "Tanzania": "TZS",
  "Thailand": "THB", "Togo": "XOF", "Trinidad & Tobago": "TTD", "Tunisia": "TND", "Turkey": "TRY",
  "Turkmenistan": "TMT", "Uganda": "UGX", "Ukraine": "UAH", "United Arab Emirates": "AED",
  "United Kingdom": "GBP", "United States": "USD", "Uruguay": "UYU", "Uzbekistan": "UZS",
  "Venezuela": "VES", "Vietnam": "VND", "Yemen": "YER", "Zambia": "ZMW", "Zimbabwe": "ZWL",
};

// Convert ISO code to flag emoji (uses regional indicator symbols)
// Generate flagcdn.com URL from ISO code (same approach used in the admin dashboard)
const getFlagUrl = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CODES).map((name) => ({
  label: name,
  value: name,
  flag: getFlagUrl(COUNTRY_CODES[name]),
}));

const steps = [
  { name: 'Profile', icon: Building, fields: ['organizationName', 'industry'] },
  { name: 'Location', icon: MapPin, fields: ['address', 'state', 'country'] },
  { name: 'Currency', icon: Landmark, fields: ['currency'] },
];

const OnboardingStepper = ({ currentStep }: { currentStep: number }) => (
  <nav aria-label="Progress" className="w-full max-w-xl mx-auto px-4 relative mb-12">
    <ol role="list" className="flex items-center justify-between w-full relative">
      {/* Background connecting line */}
      <div className="absolute top-5 left-4 right-4 h-0.5 bg-muted z-0" />
      
      {/* Active progress line */}
      <div 
        className="absolute top-5 left-4 h-0.5 bg-primary transition-all duration-500 ease-in-out z-0" 
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 96}%` }}
      />

      {steps.map((step, stepIdx) => {
        const isCompleted = stepIdx < currentStep - 1;
        const isActive = stepIdx === currentStep - 1;
        
        return (
          <li key={step.name} className="relative flex flex-col items-center flex-1 z-10">
            {isCompleted ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 shadow-md">
                <step.icon className="h-5 w-5" />
              </div>
            ) : isActive ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background ring-4 ring-primary/20 transition-all duration-300 shadow-md">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background transition-all duration-300">
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            
            <span className={cn(
              "mt-3 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
              isActive ? "text-primary font-bold" : "text-muted-foreground"
            )}>
              {step.name}
            </span>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { business, currentUserProfile, triggerRefresh } = usePOS();

  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const authUser = getAuth().currentUser;
    if (authUser && firestore && mounted) {
      import('firebase/firestore').then(({ setDoc, doc, serverTimestamp }) => {
        setDoc(doc(firestore, 'users', authUser.uid), {
          onboardingStep: step,
          onboardingLastActive: serverTimestamp()
        }, { merge: true }).catch(() => {});
      });
    }
  }, [step, firestore, mounted]);



  const [currencies, setCurrencies] = React.useState(ALL_CURRENCIES);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: business?.name || '',
      industry: '',
      address: '',
      state: '',
      country: '',
      currency: 'NGN',
    },
  });

  const selectedCountry = form.watch('country');

  React.useEffect(() => {
    if (selectedCountry && COUNTRY_TO_CURRENCY[selectedCountry]) {
      form.setValue('currency', COUNTRY_TO_CURRENCY[selectedCountry], { shouldValidate: true });
    }
  }, [selectedCountry, form]);


  const onSubmit = async (data: OnboardingFormValues) => {
    const authUser = getAuth().currentUser;
    const bId = currentUserProfile?.businessId || business?.id;

    if (!authUser || !bId) {
      toast({ variant: 'destructive', title: 'Session Error', description: 'Your session has expired. Please log in again.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);
      
      // 1. Update Business Instance
      const businessDocRef = doc(firestore, 'businessInstances', bId);
      batch.update(businessDocRef, {
        name: data.organizationName,
        address: data.address,
        'settings.industry': data.industry,
        'settings.state': data.state,
        'settings.country': data.country,
        'settings.currency': data.currency,
        'settings.language': 'English',
        'settings.timezone': 'Africa/Lagos',
        'settings.inventoryStartDate': new Date(),
        'settings.fiscalYearStart': 'January',
      });

      // 2. Update User Profile
      const userDocRef = doc(firestore, 'users', authUser.uid);
      batch.update(userDocRef, {
        surveyCompleted: true,
      });

      // 3. Create Welcome Notification
      const notifRef = doc(collection(firestore, `users/${authUser.uid}/notifications`));
      batch.set(notifRef, {
          title: "Welcome to Zeneva",
          body: `Hi ${currentUserProfile?.name || 'there'}, your organization setup for ${data.organizationName} is complete. Explore your dashboard to get started!`,
          createdAt: serverTimestamp(),
          read: false,
          type: 'system',
          clickable: false
      });

      await batch.commit();

      // Set a bypass flag so the layout guard doesn't block the redirect
      // while the Firestore real-time listener catches up with the surveyCompleted change
      sessionStorage.setItem('zeneva_onboarding_complete', 'true');

      // Tell the ProductTour to launch when the user lands on the dashboard
      localStorage.setItem('zeneva_needs_tour', 'true');

      // Trigger a local context refresh
      triggerRefresh();

      // Wait for the Firestore listener to propagate the surveyCompleted: true update
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({ variant: 'success', title: 'Setup Complete!', description: 'Welcome to your Zeneva dashboard.' });
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding submission error:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your preferences. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    const fieldsToValidate = steps[step - 1].fields as (keyof OnboardingFormValues)[];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  if (!mounted || !business || !currentUserProfile) {
    return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="fixed inset-0 z-50 w-full flex flex-col items-center justify-center min-h-screen py-8 px-4 lg:px-8 bg-background/40 overflow-y-auto backdrop-blur-sm">
      
      <div className="w-full max-w-2xl space-y-5 sm:space-y-6 bg-white/95 backdrop-blur-xl border border-white/60 p-6 sm:p-8 rounded-xl my-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Set Up Your Zeneva Store, {currentUserProfile?.name ? currentUserProfile.name.split(' ')[0] : 'Merchant'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-xl mx-auto">
            Quick setup — you can always edit these details later in Settings.
          </p>
        </div>

        <OnboardingStepper currentStep={step} />

        <Card className="mt-4 sm:mt-6 bg-transparent border-0 shadow-none">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {step === 1 && (
                    <CardContent className="pt-2 pb-2 space-y-5">
                      <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold"><Building className="text-primary h-5 w-5 sm:h-6 sm:w-6" /> Business Profile</CardTitle>
                      <FormField control={form.control} name="organizationName" render={({ field }) => (
                        <FormItem className="space-y-2"><FormLabel className="text-xs sm:text-sm font-semibold">Store / Business Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Zenith Supermarket" className="h-10 sm:h-12 text-sm shadow-none" {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                      )} />
                      <FormField control={form.control} name="industry" render={({ field }) => (
                        <FormItem className="space-y-2"><FormLabel className="text-xs sm:text-sm font-semibold">Business Industry <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Combobox
                              options={industries.map(i => ({ label: i, value: i }))}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select an industry"
                              searchPlaceholder="Search industries..."
                              triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full"
                              avoidCollisions={false}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" /></FormItem>
                      )} />
                    </CardContent>
                  )}
                  {step === 2 && (
                    <CardContent className="pt-2 pb-2 space-y-5">
                      <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold"><MapPin className="text-primary h-5 w-5 sm:h-6 sm:w-6" /> Store Location</CardTitle>
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="space-y-2"><FormLabel className="text-xs sm:text-sm font-semibold">Business Address</FormLabel><FormControl><Input className="h-10 sm:h-12 text-sm shadow-none" placeholder="Street Address" {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                      )} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem className="space-y-2"><FormLabel className="text-xs sm:text-sm font-semibold">State/Province <span className="text-destructive">*</span></FormLabel><FormControl><Input className="h-10 sm:h-12 text-sm shadow-none" placeholder="State" {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                        )} />
                        <FormField control={form.control} name="country" render={({ field }) => (
                          <FormItem className="space-y-2 flex flex-col justify-end"><FormLabel className="text-xs sm:text-sm font-semibold">Country <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Combobox
                                options={COUNTRY_OPTIONS}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select Country"
                                searchPlaceholder="Search countries..."
                                triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full"
                                avoidCollisions={false}
                                renderSelected={(opt) => (
                                  <span className="flex items-center gap-2">
                                    <img src={opt.flag} alt={opt.label} className="w-5 h-3.5 rounded-sm object-cover shrink-0" />
                                    <span>{opt.label}</span>
                                  </span>
                                )}
                                renderItem={(opt) => (
                                  <span className="flex items-center gap-2">
                                    <img src={opt.flag} alt={opt.label} className="w-5 h-3.5 rounded-sm object-cover shrink-0" />
                                    <span>{opt.label}</span>
                                  </span>
                                )}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" /></FormItem>
                        )} />
                      </div>
                    </CardContent>
                  )}
                  {step === 3 && (
                    <CardContent className="pt-2 pb-2 space-y-5">
                      <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold"><Landmark className="text-primary h-5 w-5 sm:h-6 sm:w-6" /> Store Currency</CardTitle>
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem className="space-y-2"><FormLabel className="text-xs sm:text-sm font-semibold">Store Currency <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Combobox
                              options={currencies}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select Currency"
                              searchPlaceholder="Search currencies..."
                              triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" /></FormItem>
                      )} />
                      <div className="text-[10px] sm:text-xs text-muted-foreground p-3 sm:p-4 bg-muted/50 rounded-xl border border-muted">
                        <strong>Note:</strong> The currency you select will be used for all register sales, receipt printing, and invoices.
                      </div>
                    </CardContent>
                  )}
                </motion.div>
              </AnimatePresence>
              <CardContent className="flex justify-between pt-4 sm:pt-6">
                {step > 1 ? (<Button type="button" variant="outline" size="sm" className="sm:size-default" onClick={handlePrevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>) : (<div />)}
                {step < steps.length ? (<Button type="button" size="sm" className="sm:size-default" onClick={handleNextStep}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>) : (
                  <Button type="submit" size="sm" className="sm:size-default" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Finish Setup
                  </Button>)}
              </CardContent>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
