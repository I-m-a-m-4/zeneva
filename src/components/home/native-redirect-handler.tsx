'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isTauriEnv } from '@/lib/native-notifications';

export function NativeRedirectHandler() {
    const router = useRouter();

    useEffect(() => {
        // If this app is running in a Tauri or native mobile environment,
        // bypass the marketing homepage and go straight to the signup/login flow.
        const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isNative = isTauriEnv() || (isMobile && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone));
        
        if (isNative) {
            router.replace('/signup');
        }
    }, [router]);

    return null;
}
