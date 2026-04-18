"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader, ChevronLeft, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { AppConfig } from "@/lib/config";
import { motion } from "framer-motion";
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
        console.log(`Password reset email sent successfully to ${email}`);
        setIsSent(true);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error sending password reset email:", error);
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
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-16 w-auto" />
            </Link>
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-balance text-muted-foreground">
              {isSent
                ? "Check your inbox (and Spam/Promotions folder) for the reset link."
                : "Enter your email to receive a password reset link."}
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
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Can't find the email?</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Check your Spam or Junk folder</li>
                  <li>Check the Promotions tab (if using Gmail)</li>
                  <li>Wait a few minutes, as delivery can be delayed</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsSent(false);
                  // Optional: pre-fill email again if needed, or just let them type it again to verify.
                  // Keeping email state as is allows them to just hit send again if we want to support that flow,
                  // but resetting isSent to false brings back the form.
                }}
              >
                Resend Email
              </Button>

              <Button className="w-full" asChild>
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-slate-900 lg:block relative overflow-hidden">
        <Image
          src="/zeneva-forgot-password-premium.png"
          alt="Tactical Intelligence Background"
          width="1920"
          height="1080"
          className="h-full w-full object-cover opacity-90 transition-transform [transition-duration:20s] hover:scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 p-10 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-white text-5xl font-medium tracking-tighter font-display">Security First.</h2>
            <p className="text-white/60 mt-6 text-xl font-dm-sans leading-relaxed max-w-lg">
              Protecting your business data is our primary mission. Follow the reset instructions sent to your email to regain secure access to your Command Center.
            </p>
            <div className="mt-8 flex items-center gap-3 text-orange-500 text-sm font-bold uppercase tracking-[0.2em] bg-orange-500/10 w-fit px-4 py-2 rounded-full border border-orange-500/20">
               <ShieldCheck className="h-5 w-5" />
               Tactical Vault Locked
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
