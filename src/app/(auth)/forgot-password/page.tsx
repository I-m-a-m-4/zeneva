"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";
import React, { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ title: "Authentication service not available.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    sendPasswordResetEmail(auth, email)
      .then(() => {
        toast({
          title: 'Password Reset Email Sent',
          description: `An email has been sent to ${email} with instructions.`,
          variant: 'success'
        });
        setIsSent(true);
        setIsLoading(false);
      })
      .catch((error) => {
         toast({
          variant: 'destructive',
          title: 'Request Failed',
          description: error.code === 'auth/invalid-email' ? 'Please enter a valid email address.' : 'Could not send reset email. Please try again.',
        });
        setIsLoading(false);
      });
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-4">
                <Image src="https://i.ibb.co/chgNZKyX/zeneva-logo.png" alt="Zeneva Logo" width={32} height={32} />
                <span className="text-3xl font-bold tracking-tighter text-foreground font-display">
                    Zeneva
                </span>
            </Link>
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-balance text-muted-foreground">
              {isSent ? "Check your inbox for the reset link." : "Enter your email to receive a password reset link."}
            </p>
          </div>
          {!isSent ? (
            <form onSubmit={handleReset} className="grid gap-4">
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
              <Button type="submit" className="w-full button-glow" disabled={isLoading}>
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          ) : (
             <Button className="w-full" asChild>
              <Link href="/login">Back to Login</Link>
            </Button>
          )}
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
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
