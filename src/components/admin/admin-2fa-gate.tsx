'use client';

import React from 'react';

interface Admin2FAGateProps {
    children: React.ReactNode;
}

/**
 * 2FA Gate Component
 * Note: TOTP 2FA verification is currently disabled so that
 * authorized admins (e.g. belloimam431@gmail.com) can access 
 * the dashboard directly upon login.
 */
export default function Admin2FAGate({ children }: Admin2FAGateProps) {
    return <>{children}</>;
}
