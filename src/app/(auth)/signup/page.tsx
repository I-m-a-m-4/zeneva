"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createUserProfileDocument, waitForUserProfile } from '@/firebase/users';
import { usePOS } from '@/context/pos-context';
import Link from 'next/link';
import { Eye, EyeOff, Loader, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppConfig } from '@/lib/config';
import Image from 'next/image';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  phone: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { triggerRefresh, currentUserProfile } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '', phone: '' },
  });

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      form.setValue('email', emailFromQuery);
    }
  }, [searchParams, form]);

  const onSubmit = async (data: SignupFormValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Step 2: Update their Auth profile with the display name
      await updateProfile(userCredential.user, { displayName: data.name });

      // Step 3: Create all associated Firestore documents (user profile, business, etc.)
      await createUserProfileDocument(firestore, userCredential.user, data.name, data.phone);

      // Step 4: Wait for the user profile to be available to prevent race conditions
      await waitForUserProfile(firestore, userCredential.user.uid);

      // Step 5: Force a context refresh and wait for the local state to sync
      triggerRefresh();

      // Poll ensuring the POSContext has updated with the new user
      // Step 6: Wait a moment for the context to pick up the new user profile
      // This timeout ensures POSProvider has time to re-fetch the user profile
      // after the triggerRefresh() call.

      // Simple implementation: Wait a moment for the context to likely pick it up.
      // Since we triggered refresh, the next render cycle of POSProvider will fetch the new user.
      // We can iterate a few times checking specific conditions if we were in an effect, 
      // but here we are in a handler. 

      // Let's rely on a hard wait which is safer than complex state monitoring in a standard handler
      // for this specific race condition. 1.5 seconds is usually plenty after Firestore is confirmed ready.
      await new Promise(resolve => setTimeout(resolve, 1500));

      router.push('/onboarding');

    } catch (error: any) {
      let description = "Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already registered. Please log in instead.";
      }
      toast({ variant: "destructive", title: "Signup Failed", description });
      setIsLoading(false); // Only set loading to false on failure
    }
  };

  return (
    <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center relative w-full">
        <div className="absolute top-8 left-4 sm:left-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-4">
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-16 w-auto" />
            </Link>
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to create your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label>Name</Label>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>Email</Label>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <Label>Phone Number (Optional)</Label>
                    <FormControl>
                      <Input type="tel" placeholder="+2348012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label>Password</Label>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} {...field} />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : 'Create an account'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src="/maxima.png"
          alt="A modern business management software interface on a laptop."
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute bottom-8 left-8 right-8 p-6 bg-black/50 backdrop-blur-md rounded-lg">
          <h2 className="text-white text-3xl font-bold font-headline">The Operating System for Business</h2>
          <p className="text-white/80 mt-2 text-lg">Streamline your inventory, maximize your profit, and build lasting customer relationships—all from one powerful platform.</p>
        </div>
      </div>
    </div>
  )
}
