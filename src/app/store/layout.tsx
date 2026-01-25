
'use client';
import { POSProvider } from '@/context/pos-context';
import React from 'react';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <POSProvider>{children}</POSProvider>;
}
