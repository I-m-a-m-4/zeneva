"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { createUserProfileDocument, waitForUserProfile } from '@/firebase/users';
import { usePOS } from '@/context/pos-context';
import Link from 'next/link';
import { Eye, EyeOff, Loader, ChevronLeft, Building, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppConfig } from '@/lib/config';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';

const signupSchema = z.object({
  email: z.string()
    .email({ message: 'Invalid email address.' })
    .refine((email) => {
      const localPart = email.split('@')[0];
      return !localPart.includes('+');
    }, { message: 'Email aliases (plus addressing like name+alias@gmail.com) are not allowed.' })
    .refine((email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      const disposableDomains = [
        'wshu.net', 'tempmail.com', 'mailinator.com', 'yopmail.com', 
        'guerrillamail.com', 'dispostable.com', '10minutemail.com', 
        'burnermail.io', 'trashmail.com', 'getairmail.com'
      ];
      return !disposableDomains.includes(domain);
    }, { message: 'Temporary/disposable email addresses are not allowed.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const signupSlides = [
  {
    src: "/zeneva-signup-v3.png",
    alt: "Luxury boutique storefront at night.",
    title: "Scale Your Business Operations",
    description: "Join a network of thriving businesses and unlock premium tools designed for exponential growth."
  },
  {
    src: "/zeneva-signup-2.png",
    alt: "Modern high-end shopping street at twilight.",
    title: "Thriving Ecosystem",
    description: "Place your business in the spotlight with an infrastructure built for success."
  },
  {
    src: "/zeneva-signup-3.png",
    alt: "Minimalist glass boutique entrance.",
    title: "Seamless Entry",
    description: "Launch your business in minutes with our intuitive onboarding and management suite."
  },
  {
    src: "/zeneva-signup-4.png",
    alt: "Futuristic modern marketplace visualization.",
    title: "Global Reach",
    description: "Scale from a single location to a global franchise with Zeneva's multi-store intelligence."
  }
];

const signupVideoSlides = [
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053655/zeneva/zeneva_welcome_signup_video_6.mp4',
    poster: '/signup-video-6-poster.jpg',
    title: "Scale Your Business Operations",
    description: "Join a network of thriving businesses and unlock premium tools designed for exponential growth."
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053651/zeneva/zeneva_welcome_signup_video_5.mp4',
    poster: '/signup-video-5-poster.jpg',
    title: "Thriving Ecosystem",
    description: "Place your business in the spotlight with an infrastructure built for success."
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053621/zeneva/zeneva_welcome_signup_video_2.mp4',
    poster: '/signup-video-2-poster.jpg',
    title: "Global Reach",
    description: "Scale from a single location to a global franchise with Zeneva's multi-store intelligence."
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053615/zeneva/zeneva_welcome_signup_video_1.mp4',
    poster: '/signup-video-1-poster.jpg',
    title: "One Point of Sale",
    description: "Manage your inventory with absolute ease and grow without boundaries."
  }
];

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { triggerRefresh } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [currentSlide, setCurrentSlide] = useState(0);

  const [invitationDetails, setInvitationDetails] = useState<{ businessName: string, role: string } | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const invitationCode = searchParams.get('invitationCode');

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleVideoEnded = (index: number) => {
    if (index === currentSlide) {
      setCurrentSlide((prev) => (prev + 1) % signupVideoSlides.length);
    }
  };

  useEffect(() => {
    signupVideoSlides.forEach((_, index) => {
      const video = videoRefs.current[index];
      if (!video) return;

      if (index === currentSlide) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentSlide]);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (invitationCode && firestore) {
      const fetchInvitation = async () => {
        setIsLoadingInvitation(true);
        const invRef = doc(firestore, 'invitations', invitationCode);
        try {
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            const invData = invSnap.data();
            const businessRef = doc(firestore, 'businessInstances', invData.businessId);
            const businessSnap = await getDoc(businessRef);
            if (businessSnap.exists()) {
              setInvitationDetails({
                businessName: businessSnap.data().name,
                role: invData.role.replace('_', ' '),
              });
              form.setValue('email', invData.email);
            } else {
              throw new Error("Associated business not found.");
            }
          } else {
            toast({ variant: "destructive", title: "Invalid Invitation", description: "This invitation link is either invalid or has already been used." });
            router.replace('/signup');
          }
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Could not retrieve invitation details." });
          router.replace('/signup');
        } finally {
          setIsLoadingInvitation(false);
        }
      };
      fetchInvitation();
    } else {
      setIsLoadingInvitation(false);
      const emailFromQuery = searchParams.get('email');
      if (emailFromQuery) {
        form.setValue('email', emailFromQuery);
      }
    }
  }, [invitationCode, firestore, router, form, toast]);

  // Handle getRedirectResult only for Tauri/WebView clients that used redirect
  useEffect(() => {
    if (!auth || !firestore) return;

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    const isWebView = typeof navigator !== 'undefined' && /wv|Android.*Version\/[0-9.]+/i.test(navigator.userAgent);
    // Only wait for redirect result on native clients that can't use popups
    if (!isTauri && !isWebView) return;

    let isMounted = true;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result || !isMounted) return;
        const user = result.user;

        setIsGoogleLoading(true);
        try {
          const userDocRef = doc(firestore, `users/${user.uid}`);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            await createUserProfileDocument(firestore, user, user.displayName || '', user.phoneNumber || '', invitationCode);
            await waitForUserProfile(firestore, user.uid);
          }

          triggerRefresh();
          await new Promise(resolve => setTimeout(resolve, 1500));
          router.push(invitationCode ? '/sales/pos/select-products' : '/onboarding');
        } catch (profileErr: any) {
          console.error("Failed to create profile after redirect:", profileErr);
          toast({
            variant: "destructive",
            title: "Profile Setup Failed",
            description: "We logged you in but couldn't create your profile. Please try again.",
          });
        } finally {
          if (isMounted) setIsGoogleLoading(false);
        }
      })
      .catch(() => {
        // Silently ignore — redirect result errors are expected when no redirect was in progress
      });

    return () => {
      isMounted = false;
    };
  }, [auth, firestore, router, invitationCode, triggerRefresh, toast]);

  const handleGoogleSignup = async () => {
    if (!auth || !firestore) return;
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
      const isWebView = typeof navigator !== 'undefined' && /wv|Android.*Version\/[0-9.]+/i.test(navigator.userAgent);

      if (isTauri || isWebView) {
        // Popups don't work inside Tauri webviews or Android WebViews — redirect only for those
        await signInWithRedirect(auth, provider);
        return;
      }

      // Always use popup on web — never fall back to redirect (it breaks the UX)
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError?.code === 'auth/internal-error') {
          // Firebase internal errors are usually transient. Wait briefly and retry once.
          await new Promise(resolve => setTimeout(resolve, 1200));
          result = await signInWithPopup(auth, provider);
        } else {
          throw popupError;
        }
      }

      const user = result.user;

      // Create profile document if this is a brand-new Google sign-in
      const userDocRef = doc(firestore, `users/${user.uid}`);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await createUserProfileDocument(firestore, user, user.displayName || '', user.phoneNumber || '', invitationCode);
        await waitForUserProfile(firestore, user.uid);
      }

      triggerRefresh();
      // Brief pause so the POS context has time to pick up the new auth state
      await new Promise(resolve => setTimeout(resolve, 1200));
      router.push(invitationCode ? '/sales/pos/select-products' : '/onboarding');

    } catch (error: any) {
      console.error("Google auth error:", error);
      const isCancellation =
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/user-cancelled';

      if (!isCancellation) {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description:
            error?.code === 'auth/popup-blocked'
              ? "Your browser blocked the sign-in popup. Please allow popups for this site and try again."
              : error?.code === 'auth/internal-error'
              ? "Google Authentication is temporarily unavailable. Please try again in a moment."
              : (error.message || "Please try again."),
        });
      }
      setIsGoogleLoading(false);
    }
  };


  const onSubmit = async (data: SignupFormValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: '' });

      // Pass invitation code to the creation function with empty strings for name and phone
      await createUserProfileDocument(firestore, userCredential.user, '', '', invitationCode);
      await waitForUserProfile(firestore, userCredential.user.uid);

      triggerRefresh();
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push(invitationCode ? '/sales/pos/select-products' : '/onboarding');

    } catch (error: any) {
      let description = "Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already registered. Please log in instead.";
      } else {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Signup Failed", description });
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2">
      <div className="flex flex-col min-h-screen relative w-full px-4 sm:px-6 py-8">
        <div className="absolute top-8 left-4 sm:left-8 z-20">
          <Button variant="ghost" asChild>
            <Link href="/login">
              Already have an account?
            </Link>
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center w-full py-12">
          <div className="mx-auto grid w-full max-w-[380px] gap-4 sm:gap-6">
            <div className="grid gap-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-12 sm:h-16 w-auto" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Create an account</h1>
              <p className="text-balance text-sm sm:text-base text-muted-foreground">
                Join growing retail brands on Zeneva.
              </p>
            </div>

            {isLoadingInvitation ? (
              <div className="flex justify-center items-center h-24"><Loader className="animate-spin" /></div>
            ) : invitationDetails ? (
              <div className="p-4 rounded-lg border bg-primary/5 text-center">
                <div className="flex items-center justify-center gap-3">
                  <Building className="h-5 w-5 text-primary" />
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  You are joining <strong className="text-primary">{invitationDetails.businessName}</strong> as a <strong className="capitalize text-primary">{invitationDetails.role}</strong>.
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignup}
              disabled={isLoading || isLoadingInvitation || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or signup with email</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Email</Label>
                      <FormControl>
                        <Input type="email" placeholder="m@example.com" {...field} disabled={!!invitationCode} />
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
                <Button type="submit" className="w-full" disabled={isLoading || isLoadingInvitation || isGoogleLoading}>
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
        <div className="w-full text-center mt-auto pb-4">
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed max-w-[340px] mx-auto">
            Zeneva is a registered business application. Corporate Affairs Commission (CAC) Registration — BN: 9673520. All rights reserved. By signing up, you agree to our{' '}
            <Link href="/legal/terms-of-service" className="text-primary underline hover:opacity-80" target="_blank">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy-policy" className="text-primary underline hover:opacity-80" target="_blank">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative overflow-hidden bg-black">
        {/* Background Videos */}
        {signupVideoSlides.map((slide, index) => (
          <video
            key={index}
            ref={(el) => { videoRefs.current[index] = el; }}
            loop={false}
            muted
            playsInline
            autoPlay={index === currentSlide}
            preload="auto"
            poster={slide.poster}
            onEnded={() => handleVideoEnded(index)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-80 z-[0]' : 'opacity-0 z-[-1]'
            }`}
          >
            <source src={slide.video} type="video/mp4" />
          </video>
        ))}

        {/* Orangish filter overlay */}
        <div className="absolute inset-0 bg-orange-600/60 mix-blend-multiply z-[1] pointer-events-none" />

        {/* Dark overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[2]" />

        <div className="absolute bottom-12 left-12 right-12 p-0 bg-transparent z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h2 className="text-white text-4xl font-bold font-headline leading-tight tracking-tight drop-shadow-lg">
                {signupVideoSlides[currentSlide].title.split(" ").map((word, i) => (
                  <React.Fragment key={i}>
                    {word === "Operations" || word === "Ecosystem" || word === "Entry" || word === "Reach" ? <span className="text-primary italic"> {word} </span> : word + " "}
                  </React.Fragment>
                ))}
              </h2>
              <p className="text-white/90 mt-4 text-xl font-light leading-relaxed drop-shadow-md max-w-[600px]">
                {signupVideoSlides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center gap-3">
            {signupVideoSlides.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(255,165,0,0.5)]",
                  currentSlide === i ? "w-12 bg-primary" : "w-2 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
