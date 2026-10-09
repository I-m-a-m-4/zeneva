
'use client';

import { useUser } from '@/firebase';
import Link from "next/link";
import * as React from 'react';
import { useState, useEffect } from 'react';
import { LayoutGrid, Menu, X, LogOut, Loader2, ChevronDown, Bot, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { AppConfig } from '@/lib/config';
import { useI18n } from '@/context/i18n-context';
import { LanguageSwitcherCompact } from '@/components/settings/language-switcher';

export default function MarketingHeader() {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [zenAiDropdownOpen, setZenAiDropdownOpen] = useState(false);
  const dropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const handleMouseEnterZenAi = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setZenAiDropdownOpen(true);
  };

  const handleMouseLeaveZenAi = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setZenAiDropdownOpen(false);
    }, 180);
  };

  React.useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, []);

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
        toast({ title: t('toast.loggedOut'), description: t('toast.loggedOutDescription') });
        router.push('/');
      })
      .catch(() => {
        toast({ variant: 'destructive', title: t('toast.logoutFailed') });
      });
  };

  const navLinks = [
    { href: "/zen-ai", labelKey: "home.navZenAi" },
    { href: "/#features", labelKey: "home.navFeatures" },
    { href: "/download", labelKey: "home.navDownload" },
    { href: "/about/our-mission", labelKey: "home.navMission" },
    { href: "/pricing", labelKey: "home.navPricing" },
    { href: "/blog", labelKey: "home.navBlog" },
    { href: "/contact", labelKey: "home.navContact" },
  ];

  return (
    <>
      <header className={cn(
        "fixed top-[var(--tauri-title-height,0)] z-50 w-full transition-all duration-300 shadow-sm border-b border-slate-100 flex flex-col"
      )}>
        {/* Promotional Banner */}
        {showBanner && (
          <div className="w-full bg-[#f1dfd1] text-black h-12 flex items-center justify-between px-4 z-50">
             {/* Left placeholder for symmetry */}
             <div className="w-6 hidden sm:block" />

             {/* Centered content */}
             <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 text-sm min-w-0 px-1">
                <span className="hidden md:inline-flex bg-transparent text-primary px-2 py-0.5 font-bold rounded text-[10px] uppercase tracking-wider border border-primary/30 shrink-0">
                  {t('landing.flashSale')}
                </span>
                <span className="font-medium tracking-tight text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  <span className="truncate">{t('landing.premiumFor')} <span className="font-bold text-black">₦300,000/yr</span></span>
                  <span className="text-black/50 line-through text-[10px] sm:text-xs shrink-0 hidden sm:inline">₦360,000</span>
                  <span className="text-emerald-600 font-bold text-[10px] sm:text-xs tracking-tight shrink-0 hidden lg:inline">{t('landing.save', { amount: '₦60,000' })}</span>
                </span>
                <Link href="/pricing" onClick={() => setShowBanner(false)} className="bg-[#1e293b] text-white px-2 sm:px-4 py-1.5 rounded-md font-semibold hover:bg-[#0f172a] transition-all hover:scale-105 active:scale-95 text-[10px] sm:text-xs whitespace-nowrap ml-auto sm:ml-1 shadow-sm shrink-0">
                  {t('landing.claimOffer')}
                </Link>
             </div>

             {/* Close button */}
             <button onClick={() => setShowBanner(false)} className="text-black/50 hover:text-black transition-colors p-1 flex-shrink-0" aria-label="Close banner">
               <X className="h-4 w-4" />
             </button>
          </div>
        )}

        <div className="w-full h-20 bg-white">
          <nav className="flex max-w-7xl mr-auto ml-auto h-full px-6 items-center justify-between">
            {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center justify-center" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo URL is configured at runtime and may be an external or data: URL */}
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-16 w-auto" />
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => {
              const isZenAi = link.href === "/zen-ai";
              const isZenAiActive = pathname.startsWith('/zen-ai');
              const isActive = isZenAi 
                ? isZenAiActive 
                : (pathname === link.href) || (link.href === '/blog' && pathname.startsWith('/blog')) || (link.href === '/about/our-mission' && pathname.startsWith('/about'));

              if (isZenAi) {
                return (
                  <div
                    key={link.href}
                    className="relative group py-2"
                    onMouseEnter={handleMouseEnterZenAi}
                    onMouseLeave={handleMouseLeaveZenAi}
                  >
                    <Link
                      href="/zen-ai"
                      className={cn(
                        "transition-colors text-base font-medium tracking-tight font-dm-sans inline-flex items-center gap-1.5 hover:text-black",
                        isActive ? "text-black font-semibold" : "text-slate-700"
                      )}
                    >
                      <span>{t(link.labelKey)}</span>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200 text-slate-400 group-hover:text-black",
                        zenAiDropdownOpen && "rotate-180 text-black"
                      )} />
                    </Link>

                    {/* Floating Dropdown Card */}
                    {zenAiDropdownOpen && (
                      <div className="absolute top-full -left-6 w-[390px] pt-2 z-50">
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-2.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                            <span>Zen AI Ecosystem</span>
                            <span className="text-[10px] font-mono text-[#EA580C] font-normal">Next-Gen Retail</span>
                          </div>

                          <Link
                            href="/zen-ai"
                            onClick={() => setZenAiDropdownOpen(false)}
                            className={cn(
                              "flex items-start gap-3.5 p-3 rounded-xl transition-all group/item",
                              pathname === '/zen-ai' ? "bg-orange-50/80 border border-orange-200/60" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="w-10 h-10 rounded-xl bg-orange-100/90 border border-orange-200 text-[#EA580C] flex items-center justify-center shrink-0 group-hover/item:scale-105 group-hover/item:bg-[#EA580C] group-hover/item:text-white transition-all shadow-xs">
                              <Bot className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 group-hover/item:text-[#EA580C] transition-colors">
                                  Zen AI Copilot
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
                                  AVAILABLE
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-dm-sans">
                                Conversational retail copilot. Predictive restocks, trapped capital recovery &amp; sales velocity.
                              </p>
                            </div>
                          </Link>

                          <div className="border-t border-slate-100 my-1" />

                          <Link
                            href="/zen-ai/cameras"
                            onClick={() => setZenAiDropdownOpen(false)}
                            className={cn(
                              "flex items-start gap-3.5 p-3 rounded-xl transition-all group/item",
                              pathname.startsWith('/zen-ai/cameras') ? "bg-orange-50/80 border border-orange-200/60" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="w-10 h-10 rounded-xl bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 group-hover/item:scale-105 group-hover/item:bg-amber-600 group-hover/item:text-white transition-all shadow-xs">
                              <Video className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 group-hover/item:text-[#EA580C] transition-colors">
                                  Zen Vision Stream Server
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-[#EA580C] border border-orange-200 font-bold">
                                  NEW
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-dm-sans">
                                Turn dumb CCTV into an intelligent stream server. Foot traffic, dwell heatmaps &amp; loss prevention.
                              </p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors text-base font-medium tracking-tight font-dm-sans hover:text-black",
                    isActive ? "text-black font-semibold" : "text-slate-700"
                  )}
                >
                  {t(link.labelKey)}
                </a>
              );
            })}
          </div>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-2">
            {/* Visitors switch language before they ever sign up, so this sits in the public header. */}
            <LanguageSwitcherCompact className="h-9 w-auto min-w-[6.5rem] justify-between font-normal bg-white hover:bg-slate-50 hover:text-slate-900 border-stone-200 px-2.5 text-sm rounded-md text-slate-900" />
            <div className="hidden sm:flex items-center gap-4">
              {mounted && user ? (
                <>
                  <Link href="/sales/pos/select-products" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm">{t('nav.dashboard')}</Link>
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="me-2 h-4 w-4" />
                    {t('common.signOut')}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="transition-colors text-sm font-medium bg-[#ffffff] border rounded-md px-3 py-2 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200">{t('common.signIn')}</Link>
                  <Link href="/signup" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm">{t('common.getStarted')}</Link>
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
                <LayoutGrid className="h-5 w-5 stroke-[2.2]" />
              )}
            </button>
          </div>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <div className={cn(
        "md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm overflow-y-auto transition-all duration-300 ease-in-out",
        showBanner ? "top-[calc(128px+var(--tauri-title-height,0px))]" : "top-[calc(80px+var(--tauri-title-height,0px))]",
        isMobileMenuOpen ? "translate-y-0 opacity-100 visible" : "-translate-y-full opacity-0 invisible"
      )}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col items-center">
            {navLinks.map((link) => {
              if (link.href === "/zen-ai") {
                return (
                  <div key={link.href} className="w-full py-3 border-b-2 border-dashed border-slate-200">
                    <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-400 py-1 font-mono">
                      {t(link.labelKey)} Ecosystem
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-2 pb-1">
                      <Link
                        href="/zen-ai"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-slate-900 font-medium text-base hover:bg-orange-50 hover:text-[#EA580C] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bot className="w-5 h-5 text-[#EA580C]" />
                          <span>Zen AI Copilot</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Available</span>
                      </Link>
                      <Link
                        href="/zen-ai/cameras"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-slate-900 font-medium text-base hover:bg-orange-50 hover:text-[#EA580C] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Video className="w-5 h-5 text-amber-600" />
                          <span>Zen Vision Stream Server</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-[#EA580C] font-bold">NEW</span>
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-4 text-lg font-medium text-slate-700 tracking-tight font-dm-sans hover:text-black border-b-2 border-dashed border-slate-200"
                >
                  {t(link.labelKey)}
                </a>
              );
            })}
          </div>
          <div className="mt-8 flex flex-col gap-4">
            {mounted && user ? (
              <>
                <Link href="/sales/pos/select-products" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center hover:bg-[#0f172a] transition-colors text-base font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md py-3 px-5 shadow-sm">{t('nav.dashboard')}</Link>
                <Button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} variant="outline" size="lg">
                  <LogOut className="me-2 h-4 w-4" />
                  {t('common.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center transition-colors text-base font-medium bg-[#ffffff] border rounded-md py-3 px-5 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200">{t('common.signIn')}</Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center hover:bg-[#0f172a] transition-colors text-base font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md py-3 px-5 shadow-sm">{t('common.getStarted')}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
