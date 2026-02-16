'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppConfig } from '@/lib/config';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-white selection:bg-orange-500/30 overflow-hidden relative">

      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-orange-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-1/2 -right-1/2 w-full h-full bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-neutral-950/50 backdrop-blur-md">
        <nav className="flex max-w-7xl mx-auto py-4 px-6 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-8 w-auto brightness-0 invert" />
          </Link>
          <Button variant="ghost" className="text-white hover:text-orange-400 hover:bg-white/5" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center relative z-10 px-4">
        <div className="text-center max-w-2xl mx-auto space-y-8">

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative inline-block"
          >
            <h1 className="text-9xl font-bold font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
              404
            </h1>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-orange-500 blur-2xl opacity-50" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">This page has gone missing.</h2>
            <p className="text-lg text-neutral-400 max-w-md mx-auto">
              We couldn't find the page you were looking for. It might have been moved, deleted, or never existed.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button asChild size="lg" className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-lg shadow-orange-900/20 transition-all hover:scale-105">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>

            <Button variant="outline" size="lg" className="h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white transition-all hover:scale-105" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Zeneva. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
