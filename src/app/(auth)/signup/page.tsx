
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
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { createUserProfileDocument } from '@/firebase/users';
import Link from 'next/link';
import { Eye, EyeOff, Loader, ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.'}),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  referralCode: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '', referralCode: '' },
  });

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
        form.setValue('referralCode', refCode);
    }
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
        form.setValue('email', emailFromQuery);
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (isCreatingProfile) return;

    if (!isUserLoading && user && !isProfileLoading) {
      if (userProfile) {
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, isCreatingProfile, router]);


  const onSubmit = async (data: SignupFormValues) => {
    if (!auth || !firestore) return;
    setIsCreatingProfile(true);
    try {
      const userCredential = await initiateEmailSignUp(auth, data.email, data.password, data.name);
      await createUserProfileDocument(firestore, userCredential.user, data.name, data.referralCode);
    } catch (error: any) {
       let description = "Please try again.";
      if (error.code === 'auth/email-already-in-use') {
          description = "This email is already in use. Please log in instead.";
      }
      toast({ variant: "destructive", title: "Signup Failed", description });
      setIsCreatingProfile(false);
    }
  };

  if (isUserLoading || (user && isProfileLoading)) {
     return <SignupSkeleton />;
  }

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
                <Image src="https://i.ibb.co/JjLC3Ff1/Trolley.png" alt="Zeneva Logo" width={32} height={32} />
                <span className="text-3xl font-bold tracking-tighter text-foreground font-display">
                    Zeneva
                </span>
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
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <Label>Referral Code (Optional)</Label>
                    <FormControl>
                      <Input placeholder="Enter referral code" {...field} disabled={!!searchParams.get('ref')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isCreatingProfile}>
                 {isCreatingProfile ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : 'Create an account'}
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
          src="https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxidXNpbmVzcyUyMG1hbmFnZW1lbnR8ZW58MHx8fHwxNzY4NTkyNzUyfDA&ixlib=rb-4.1.0&q=80&w=1080"
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
    
