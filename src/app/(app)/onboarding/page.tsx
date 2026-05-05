
'use client';

import * as React from 'react';
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

const onboardingSchema = z.object({
  organizationName: z.string().min(3, 'Organization name is required.'),
  industry: z.string().min(1, 'Please select an industry.'),
  address: z.string().min(5, 'Address is required.'),
  state: z.string().min(2, 'State is required.'),
  country: z.string().min(2, 'Country is required.'),
  currency: z.string().min(1, 'Currency is required.'),
  language: z.string().min(1, 'Language is required.'),
  timezone: z.string().min(1, 'Time zone is required.'),
  inventoryStartDate: z.date({ required_error: 'Please select a date.' }),
  fiscalYearStart: z.string().min(1, 'Please select a fiscal year start.'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const industries = [
  'Retail & E-commerce', 'Fashion & Apparel', 'Electronics', 'Food & Beverage', 'Health & Beauty', 'Home & Furniture', 'Other'
];
const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

const steps = [
  { name: 'Organization', icon: Building, fields: ['organizationName', 'industry'] },
  { name: 'Location', icon: MapPin, fields: ['address', 'state', 'country'] },
  { name: 'Regional', icon: Globe, fields: ['currency', 'language', 'timezone'] },
  { name: 'Financials', icon: CalendarDays, fields: ['inventoryStartDate', 'fiscalYearStart'] },
];

const OnboardingStepper = ({ currentStep }: { currentStep: number }) => (
  <nav aria-label="Progress" className="w-full max-w-lg mx-auto">
    <ol role="list" className="flex items-center">
      {steps.map((step, stepIdx) => (
        <li key={step.name} className={cn("relative", stepIdx !== steps.length - 1 ? "flex-1" : "")}>
          {stepIdx < currentStep - 1 ? (
            <>
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="h-0.5 w-full bg-primary" />
              </div>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300">
                <step.icon className="h-5 w-5" />
              </div>
            </>
          ) : stepIdx === currentStep - 1 ? (
            <>
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="h-px w-full border-t-2 border-dashed border-border" />
              </div>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background ring-4 ring-primary/20 transition-all duration-300">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="absolute -bottom-7 text-xs text-primary font-semibold left-1/2 -translate-x-1/2 whitespace-nowrap">{step.name}</p>
            </>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="h-px w-full border-t-2 border-dashed border-border" />
              </div>
              <div className="group relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background transition-all duration-300">
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="absolute -bottom-7 text-xs text-muted-foreground left-1/2 -translate-x-1/2 whitespace-nowrap">{step.name}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { business, currentUserProfile, triggerRefresh } = usePOS();

  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: business?.name || '',
      industry: '',
      address: '',
      state: '',
      country: 'Nigeria',
      currency: 'NGN',
      language: 'English',
      timezone: 'Africa/Lagos',
      inventoryStartDate: new Date(),
      fiscalYearStart: 'January',
    },
  });

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
        'settings.language': data.language,
        'settings.timezone': data.timezone,
        'settings.inventoryStartDate': data.inventoryStartDate,
        'settings.fiscalYearStart': data.fiscalYearStart,
      });

      // 2. Update User Profile
      const userDocRef = doc(firestore, 'users', authUser.uid);
      batch.update(userDocRef, {
        surveyCompleted: true,
      });

      // 3. Create Welcome Notification
      const notifRef = doc(collection(firestore, `users/${authUser.uid}/notifications`));
      batch.set(notifRef, {
          title: "Welcome to Zeneva! 🎉",
          body: `Hi ${currentUserProfile?.name || 'there'}, your organization setup for ${data.organizationName} is complete. Explore your dashboard to get started!`,
          createdAt: serverTimestamp(),
          read: false,
          type: 'system',
          clickable: false
      });

      await batch.commit();

      // Trigger a local context refresh
      triggerRefresh();

      // Small delay to allow the auth/profile listener to pick up the changes
      await new Promise(resolve => setTimeout(resolve, 1500));

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

  if (!business || !currentUserProfile) {
    return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="onboarding-bg flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Initialize Your Business Galaxy, {currentUserProfile.name.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            You're entering an ecosystem built for exponential growth. Let's configure your Zeneva intelligence profile.
          </p>
        </div>

        <OnboardingStepper currentStep={step} />

        <Card className="shadow-xl shadow-slate-200/50">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {step === 1 && (
                <CardContent className="pt-6 space-y-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold"><Building className="text-primary h-6 w-6" /> Strategic Identity</CardTitle>
                  <p className="text-sm text-muted-foreground">Define your organization's core identity to calibrate our intelligence models.</p>
                  <FormField control={form.control} name="organizationName" render={({ field }) => (
                    <FormItem><FormLabel>Organization Name</FormLabel><FormControl><Input placeholder="e.g. Zenith Global" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem><FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger></FormControl>
                        <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </CardContent>
              )}
              {step === 2 && (
                <CardContent className="pt-6 space-y-6">
                  <CardTitle className="flex items-center gap-3"><MapPin className="text-primary" /> Organization Location</CardTitle>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Organization Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State/Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Nigeria">Nigeria</SelectItem><SelectItem value="Ghana">Ghana</SelectItem><SelectItem value="Kenya">Kenya</SelectItem><SelectItem value="United States">United States</SelectItem><SelectItem value="United Kingdom">United Kingdom</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                </CardContent>
              )}
              {step === 3 && (
                <CardContent className="pt-6 space-y-6">
                  <CardTitle className="flex items-center gap-3"><Globe className="text-primary" /> Regional Settings</CardTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem><FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="NGN">NGN (₦)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="language" render={({ field }) => (
                      <FormItem><FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="English">English</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="timezone" render={({ field }) => (
                      <FormItem><FormLabel>Time Zone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Africa/Lagos">(GMT+1) West Africa Time</SelectItem><SelectItem value="America/New_York">(GMT-4) Eastern Time</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    <strong>Note:</strong> The language you select will be the default for email templates and other customizations.
                  </div>
                </CardContent>
              )}
              {step === 4 && (
                <CardContent className="pt-6 space-y-6">
                  <CardTitle className="flex items-center gap-3"><Landmark className="text-primary" /> Financial Year</CardTitle>
                  <FormField control={form.control} name="inventoryStartDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Inventory Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                      </Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fiscalYearStart" render={({ field }) => (
                    <FormItem><FormLabel>Fiscal Year Starts In</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </CardContent>
              )}
              <CardContent className="flex justify-between mt-6">
                {step > 1 ? (<Button type="button" variant="outline" onClick={handlePrevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>) : (<div />)}
                {step < steps.length ? (<Button type="button" onClick={handleNextStep}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>) : (
                  <Button type="submit" disabled={isSubmitting}>
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
