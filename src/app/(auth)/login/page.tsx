"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader, ChevronLeft } from "lucide-react";
import React, { useState } from "react";
import { AppConfig } from "@/lib/config";
import Image from "next/image";

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      .then(() => {
        // On success, do nothing. The auth layout will detect the state
        // change and handle the redirection automatically. This prevents
        // any flashes of content or layout shifts.
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
