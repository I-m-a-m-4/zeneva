'use native';
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share, Download } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if device is iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowInstallModal(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallModal(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallModal(false);
    };

    if (!showInstallModal) return null;

    return (
        <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Install App</DialogTitle>
                    <DialogDescription>
                        Install this app on your device for a better experience.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    {isIOS ? (
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p>To install this app on your iPhone/iPad:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Tap the <Share className="inline h-4 w-4" /> Share button in your browser menu.</li>
                                <li>Scroll down and tap "Add to Home Screen".</li>
                            </ol>
                        </div>
                    ) : (
                        <div className="grid gap-4 py-4">
                            <p className="text-sm text-muted-foreground">
                                Get quick access to Zeneva directly from your home screen.
                            </p>
                            <Button onClick={handleInstallClick} className="w-full">
                                <Download className="mr-2 h-4 w-4" /> Install App
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
