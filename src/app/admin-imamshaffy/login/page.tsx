
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const firestore = useFirestore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsProcessing(true);
    setError(null);

    const lockRef = doc(firestore, 'admin_locks', email.toLowerCase());

    try {
      // 1. Check for existing lockout
      const lockSnap = await getDoc(lockRef);
      if (lockSnap.exists()) {
        const data = lockSnap.data();
        if (data.lockoutUntil) {
          const lockoutDate = data.lockoutUntil.toDate();
          if (lockoutDate > new Date()) {
            const timeRemaining = formatDistanceToNow(lockoutDate);
            const message = `Too many failed attempts. This account is locked for ${timeRemaining}. Please try again tomorrow.`;
            setError(message);
            toast({ title: 'Account Locked', description: message, variant: 'destructive' });
            setIsProcessing(false);
            return;
          }
        }
      }

      // 2. Attempt Login
      await signInWithEmailAndPassword(auth, email, password);
      
      // 3. Success: Reset lockout attempts
      await deleteDoc(lockRef);
      
      toast({ title: 'Login Successful', description: 'Redirecting to admin dashboard...' });
      router.push('/admin-imamshaffy');
    } catch (err: any) {
      let message = 'An unexpected error occurred. Please try again.';
      
      // Handle Firebase Auth errors
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid credentials. Please check your email and password.';
        
        // 4. Failure: Increment attempts
        try {
          const lockSnap = await getDoc(lockRef);
          const currentData = lockSnap.exists() ? lockSnap.data() : { attempts: 0 };
          const newAttempts = (currentData.attempts || 0) + 1;
          
          if (newAttempts >= 5) {
            // Lock for 24 hours
            const lockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await setDoc(lockRef, {
              attempts: newAttempts,
              lockoutUntil: Timestamp.fromDate(lockoutUntil),
              lastAttempt: serverTimestamp()
            });
            message = 'Too many failed attempts. This account has been locked until tomorrow.';
          } else {
            await setDoc(lockRef, {
              attempts: newAttempts,
              lastAttempt: serverTimestamp()
            }, { merge: true });
            message = `Invalid credentials. ${5 - newAttempts} attempts remaining before lockout.`;
          }
        } catch (lockErr) {
          console.error("Error updating lockout status:", lockErr);
        }
      } else if (err.code === 'auth/invalid-email') {
        message = 'The email address is not valid.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please try again later or tomorrow.';
      }

      setError(message);
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Enter your admin credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 focus-within-glow rounded-md">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isProcessing}
                placeholder="admin@zeneva.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 focus-within-glow rounded-md">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isProcessing}
                  placeholder="Enter your password"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full button-glow" disabled={isProcessing}>
              {isProcessing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? 'Logging In...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
