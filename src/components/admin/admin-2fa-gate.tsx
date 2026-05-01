'use client';

import React, { useState, useEffect } from 'react';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Lock, Key, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_EMAIL = 'belloimam431@gmail.com';

interface Admin2FAGateProps {
    children: React.ReactNode;
}

export default function Admin2FAGate({ children }: Admin2FAGateProps) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [setupMode, setSetupMode] = useState(false);
    const [secret, setSecret] = useState('');
    const [otp, setOtp] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (isUserLoading) return;

        // If not the admin, we don't need this gate (the layout will redirect them anyway)
        if (user?.email !== ADMIN_EMAIL) {
            setIsLoading(false);
            return;
        }

        // Check session storage for existing verification
        const sessionVerified = sessionStorage.getItem('zeneva_admin_verified');
        if (sessionVerified === 'true') {
            setIsVerified(true);
            setIsLoading(false);
            return;
        }

        checkSecurityStatus();
    }, [user, isUserLoading]);

    const checkSecurityStatus = async () => {
        try {
            const securityDoc = await getDoc(doc(firestore, 'admin_config', 'totp'));
            if (securityDoc.exists()) {
                setSecret(securityDoc.data().secret);
                setSetupMode(false);
            } else {
                setSetupMode(true);
                generateNewSecret();
            }
        } catch (error) {
            console.error('Error checking security status:', error);
            toast({
                variant: 'destructive',
                title: 'Security Error',
                description: 'Failed to connect to security server.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const generateNewSecret = () => {
        const newSecret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(ADMIN_EMAIL, 'Zeneva Admin', newSecret);
        setSecret(newSecret);
        setQrCodeUrl(otpauth);
    };

    const handleVerify = async () => {
        setIsProcessing(true);
        try {
            const isValid = authenticator.check(otp, secret);
            if (isValid) {
                if (setupMode) {
                    // Save secret to Firestore if this was the initial setup
                    await setDoc(doc(firestore, 'admin_config', 'totp'), {
                        secret: secret,
                        updatedAt: new Date(),
                        updatedBy: user?.uid
                    });
                }
                
                sessionStorage.setItem('zeneva_admin_verified', 'true');
                setIsVerified(true);
                toast({
                    title: 'Access Granted',
                    description: 'Identity verified successfully.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Code',
                    description: 'The verification code is incorrect.'
                });
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast({
                variant: 'destructive',
                title: 'System Error',
                description: 'An error occurred during verification.'
            });
        } finally {
            setIsProcessing(false);
            setOtp('');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium">Initializing Security Protocol...</p>
                </div>
            </div>
        );
    }

    if (user?.email !== ADMIN_EMAIL || isVerified) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-4"
            >
                <Card className="border-2 shadow-2xl bg-card/50 backdrop-blur-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {setupMode ? 'Initialize Security' : 'Admin Verification'}
                        </CardTitle>
                        <CardDescription>
                            {setupMode 
                                ? 'Set up your authenticator app to secure the Zeneva Command Center.' 
                                : 'Please enter the 6-digit code from your authenticator app.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {setupMode && qrCodeUrl && (
                            <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-6 shadow-inner">
                                <QRCodeSVG value={qrCodeUrl} size={180} level="H" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Backup Secret</p>
                                    <code className="bg-slate-100 px-3 py-1 rounded text-xs font-mono text-slate-600 select-all">
                                        {secret.match(/.{1,4}/g)?.join(' ')}
                                    </code>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="pl-10 h-12 text-center text-xl font-mono tracking-[0.5em]"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerify()}
                                />
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground">
                                Verification codes refresh every 30 seconds
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full h-12 text-base font-bold" 
                            disabled={otp.length !== 6 || isProcessing}
                            onClick={handleVerify}
                        >
                            {isProcessing ? (
                                <Loader className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                setupMode ? 'Finalize Setup' : 'Unlock Dashboard'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
                
                <p className="mt-6 text-center text-[11px] text-muted-foreground font-medium">
                    ZENEVA SHIELD PROTOCOL v2.0 • ENCRYPTED SESSION
                </p>
            </motion.div>
        </div>
    );
}
