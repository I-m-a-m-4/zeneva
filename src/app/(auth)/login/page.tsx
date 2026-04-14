"use client";

import React, { useEffect, useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader, ChevronLeft } from "lucide-react";
import { AppConfig } from "@/lib/config";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

const loginSlides = [
  {
    src: "/zeneva-login.png?v=2",
    alt: "Modern retail store interior with minimalist design and warm lighting.",
    title: "Operating System for Business",
    description: "Streamline your inventory, maximize your profit, and build lasting customer relationships."
  },
  {
    src: "/zeneva-login-2.png",
    alt: "Elite dashboard on a black marble counter.",
    title: "Precision Analytics",
    description: "Real-time insights tailored for high-growth retail environments."
  },
  {
    src: "/zeneva-login-3.png",
    alt: "Organized luxury retail storage room.",
    title: "Inventory Mastery",
    description: "Never lose track of a single item with our intelligent stock management system."
  },
  {
    src: "/zeneva-login-4.png",
    alt: "Minimalist cafe interior.",
    title: "Work From Anywhere",
    description: "Secure, cloud-based access that puts your business in the palm of your hand."
  }
];

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % loginSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        title: "Authentication service not available.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const isSuperAdmin = user.email === 'belloimam431@gmail.com';
        
        // Check for MFA enrollment if Super Admin
        if (isSuperAdmin && user.providerData[0].providerId === 'password') {
          const enrolledFactors = (user as any).multiFactor?.enrolledFactors || [];
          if (enrolledFactors.length === 0) {
              console.warn("MFA Requirement: Super Admin must enroll in MFA.");
              // We'll handle redirection in the AuthLayout or here if preferred.
          }
        }
      })
      .catch((error) => {
        let description = "Invalid email or password. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = "Invalid email or password. Please check your credentials and try again.";
        }
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: description,
        });
        setIsLoading(false); // Only set loading to false on failure.
      });
  };

  return (
    <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center relative w-full">
        <div className="absolute top-8 left-4 sm:left-8">
          <Button variant="ghost" asChild>
            <Link href="/signup">
              Create Account
            </Link>
          </Button>
        </div>
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2 focus-within-glow rounded-md">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 focus-within-glow rounded-md">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full button-glow" disabled={isLoading}>
              {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <Image
              src={loginSlides[currentSlide].src}
              alt={loginSlides[currentSlide].alt}
              width={1920}
              height={1080}
              quality={100}
              priority
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </motion.div>
        </AnimatePresence>

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
                {loginSlides[currentSlide].title.split(" ").map((word, i) => (
                  <React.Fragment key={i}>
                    {word === "for" || word === "Galaxy" || word === "System" ? <span className="text-primary italic"> {word} </span> : word + " "}
                  </React.Fragment>
                ))}
              </h2>
              <p className="text-white/90 mt-4 text-xl font-light leading-relaxed drop-shadow-md max-w-[600px]">
                {loginSlides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center gap-3">
            {loginSlides.map((_, i) => (
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
