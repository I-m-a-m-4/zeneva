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
import { idb } from "@/lib/idb";
import { secureStorage } from "@/lib/secure-storage";

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

  const handleLaunchDemo = async () => {
    setIsLoading(true);
    try {
      // Seed IndexedDB with beautiful products, customers, and receipts
      const mockProducts = [
        { id: "prod-1", name: "Dermatology Cleanse Cream", sku: "SKU-CLEANSE", price: 4500, costPrice: 2500, stock: 42, category: "Skincare", type: "product" },
        { id: "prod-2", name: "Laser Skincare Consultation", sku: "SKU-LASER", price: 25000, costPrice: 12000, stock: 9999, category: "Services", type: "service" },
        { id: "prod-3", name: "Premium Sunscreen SPF 50+", sku: "SKU-SUNBLOCK", price: 9500, costPrice: 5000, stock: 28, category: "Sun Protection", type: "product" },
        { id: "prod-4", name: "Hydrating Face Serum", sku: "SKU-SERUM", price: 12000, costPrice: 6200, stock: 19, category: "Skincare", type: "product" }
      ];
      const mockCustomers = [
        { id: "cust-1", name: "Hamidah Bello", email: "hamidah@example.com", phone: "08038416847", totalSpent: 34500, loyaltyPoints: 345 },
        { id: "cust-2", name: "John Doe", email: "john.doe@example.com", phone: "09012345678", totalSpent: 12000, loyaltyPoints: 120 }
      ];
      const mockReceipts = [
        { 
          id: "rec-1", 
          receiptNumber: "REC-0001", 
          total: 29500, 
          paymentMethod: "Bank Transfer", 
          status: "paid", 
          createdAt: new Date().toISOString(),
          items: [
            { productId: "prod-1", name: "Dermatology Cleanse Cream", quantity: 1, price: 4500 },
            { productId: "prod-2", name: "Laser Skincare Consultation", quantity: 1, price: 25000 }
          ]
        }
      ];

      await idb.set('pos_synced_products', mockProducts);
      await idb.set('pos_synced_customers', mockCustomers);
      await idb.set('pos_synced_receipts', mockReceipts);

      // Set Session & Profile in Local storage
      secureStorage.setItem('zeneva_auth_session', {
        uid: "demo-tester-id",
        email: "tester@zeneva.com",
        displayName: "App Store Reviewer",
        isAnonymous: false,
        emailVerified: true,
        isCached: true
      });

      secureStorage.setItem('zeneva_user_profile', {
        id: "demo-tester-id",
        name: "App Store Reviewer",
        email: "tester@zeneva.com",
        role: "owner",
        businessId: "demo-business-id",
        permissions: {
          view_reports: true,
          manage_inventory: true,
          record_sales: true,
          manage_settings: true
        }
      });

      secureStorage.setItem('zeneva_business_instance', {
        id: "demo-business-id",
        name: "Safeway Dermatology & Laser Center",
        currency: "NGN",
        accessLevel: "lifetime",
        plan: "business",
        settings: {
          paymentBankName: "Wema Bank",
          paymentBankAccountId: "9018416847",
          terminalBankName: "Wema Bank",
          terminalAccountNumber: "9018416847",
          terminalAccountName: "Zeneva - Safeway Dermatology and Laser Center",
          defaultTaxRate: 0,
          loyaltyProgramEnabled: false
        }
      });

      toast({
        title: "Demo Workspace Active",
        description: "Launching Zeneva offline demo sandbox."
      });

      setTimeout(() => {
        window.location.href = '/sales/pos/select-products';
      }, 500);

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Demo Activation Failed",
        description: err.message
      });
      setIsLoading(false);
    }
  };

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
      <div className="flex items-center justify-center relative w-full px-4 sm:px-6 py-12">
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
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-2 text-muted-foreground font-semibold">Store Reviewers Only</span>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-primary/30 hover:border-primary/60 text-primary hover:bg-primary/5 transition-all text-xs h-9 flex items-center justify-center gap-1.5" 
              onClick={handleLaunchDemo}
              disabled={isLoading}
            >
              Launch Offline Demo Sandbox
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
