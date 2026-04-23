
'use client';

import { useUser } from '@/firebase';
import Link from "next/link";
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { AppConfig } from '@/lib/config';

export default function MarketingHeader() {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);


  React.useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    signOut(getAuth())
      .then(() => {
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/');
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Logout Failed' });
      });
  };

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/download", label: "Download" },
    { href: "/about/our-mission", label: "Our Mission" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header className={cn(
        "fixed top-[var(--tauri-title-height,0)] z-50 w-full h-20 transition-all duration-300",
        scrolled || isMobileMenuOpen
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50" 
          : "bg-transparent border-none backdrop-blur-none"
      )}>
        <nav className="flex max-w-7xl mr-auto ml-auto h-full px-6 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center justify-center" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-16 w-auto" />
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => {
              const isActive = (pathname === link.href) || (link.href === '/blog' && pathname.startsWith('/blog')) || (link.href === '/about/our-mission' && pathname.startsWith('/about'));
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors text-base font-medium tracking-tight font-dm-sans hover:text-black",
                    isActive ? "text-black font-semibold" : "text-slate-700"
                  )}
                >
                  {link.label}
                </a>
              )
            })}
          </div>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-4">
              {mounted && user ? (
                <>
                  <Link href="/sales/pos/select-products" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm">Dashboard</Link>
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="transition-colors text-sm font-medium bg-[#ffffff] border rounded-md px-3 py-2 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200">Login</Link>
                  <Link href="/signup" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm">Get Started</Link>
                </>
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-900 hover:text-black transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 transition-transform duration-300 ease-in-out hover:rotate-90" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Panel */}
      <div className={cn(
        "md:hidden fixed top-[calc(80px+var(--tauri-title-height,0px))] left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm overflow-y-auto transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
      )}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col items-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-4 text-lg font-medium text-slate-700 tracking-tight font-dm-sans hover:text-black border-b-2 border-dashed border-slate-200"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4">
            {mounted && user ? (
              <>
                <Link href="/sales/pos/select-products" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center hover:bg-[#0f172a] transition-colors text-base font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md py-3 px-5 shadow-sm">Dashboard</Link>
                <Button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} variant="outline" size="lg">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center transition-colors text-base font-medium bg-[#ffffff] border rounded-md py-3 px-5 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200">Login</Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center hover:bg-[#0f172a] transition-colors text-base font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md py-3 px-5 shadow-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
