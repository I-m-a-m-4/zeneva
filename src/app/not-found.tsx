
'use client';

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { FileSearch } from 'lucide-react'
import MarketingFooter from '@/components/layout/marketing-footer'
import { AppConfig } from '@/lib/config'

// A simplified, self-contained header for the 404 page that does not use client-side hooks.
function NotFoundHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-orange-200/80 bg-orange-50/80 backdrop-blur-lg">
      <nav className="flex max-w-7xl mr-auto ml-auto py-3 sm:py-5 px-6 items-center justify-between">
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center justify-center gap-2">
            <Image src={AppConfig.logoUrl} alt="Zeneva Logo" width={32} height={32} />
            <span className="text-4xl font-bold text-black font-instrument-serif">Zeneva</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="transition-colors text-sm font-medium bg-[#ffffff] border rounded-md px-3 py-2 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200">Login</Link>
          <Link href="/signup" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm">Get Started</Link>
        </div>
      </nav>
    </header>
  );
}


export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <NotFoundHeader />
      <main className="flex-grow flex items-center justify-center bg-background text-center px-4 pt-20">
        <div>
          <FileSearch className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
          <h1 className="text-6xl font-bold tracking-tighter font-display text-primary">404</h1>
          <h2 className="text-3xl font-semibold tracking-tight mt-2">Page Not Found</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sorry, we couldn’t find the page you’re looking for.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
