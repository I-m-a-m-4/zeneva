
'use client';

import {
  ArrowRight,
  Check,
  Code,
  Cpu,
  Database,
  Download,
  Droplet,
  Globe,
  Hexagon,
  InfinityIcon,
  Layers,
  Mail,
  Map,
  Mountain,
  Package,
  Phone,
  Plus,
  Quote,
  Search,
  Send,
  Server,
  Share2,
  Sparkles,
  Terminal,
  Triangle,
  Twitter,
  Wind,
  Github,
  Linkedin,
  ArrowUp,
  Box,
  Anchor,
  BarChart2,
  Loader,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import BackToTopButton from '@/components/back-to-top-button';
import MarketingHeader from '@/components/layout/marketing-header';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import MarketingFooter from '@/components/layout/marketing-footer';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // If the user status is determined and they are logged in, redirect.
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [isUserLoading, user, router]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Zeneva",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "The all-in-one platform for inventory management, point of sale, sales analytics, and customer relationships for Nigerian businesses.",
    "offers": {
      "@type": "Offer",
      "price": "10000",
      "priceCurrency": "NGN"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "22000"
    },
    "mainEntityOfPage": {
         "@type":"WebPage",
         "@id":"https://www.zeneva.com"
    }
  };
  
    const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup';
    const handleCopyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink)
                .then(() => {
                    toast({ variant: 'success', title: 'Copied!', description: 'Signup link copied to clipboard.' });
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Failed to Copy' });
                });
        }
    };

    const handleShareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on Zeneva!',
                    text: `Sign up for Zeneva using my referral link and get started with the best inventory management platform.`,
                    url: referralLink,
                });
            } catch (error) {
                // Silently fail is user cancels share sheet
            }
        } else {
            handleCopyLink();
            toast({ title: 'Share not supported', description: 'Signup link copied to clipboard instead.' });
        }
    };

  // While we wait for the user status, or if we are about to redirect,
  // show a full-page loader to prevent flashing the marketing content.
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="antialiased overflow-x-hidden text-slate-900 bg-[#F9F8F6]">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <MarketingHeader />

      {/* Main Hero Section */}
      <main className="bg-center lg:pt-48 lg:pb-48 w-full max-w-none mr-auto ml-auto pt-40 pr-6 pb-32 pl-6 relative">
        <div className="absolute top-0 right-0 bottom-0 left-0" data-container-bg="true">
        </div>
        <div className="grid lg:grid-cols-2 max-w-7xl mr-auto ml-auto items-center">

          {/* Left Column: Copy & Form */}
          <div className="max-w-xl z-10">
            <p className="uppercase text-xs font-semibold tracking-tight font-dm-sans mb-6 text-slate-900">The Operating System For Your Business</p>
            <h1 className="sm:text-7xl text-6xl font-light text-slate-900 tracking-tight font-instrument-serif mb-8">
              <span className="block">Streamline Your Inventory.</span>
              <span className="block">Maximize Your Profit.</span>
            </h1>
            <p className="leading-relaxed text-lg tracking-tight font-dm-sans max-w-lg mb-10 text-slate-900">
              The all-in-one platform for inventory management, point of sale, and customer relationships. Stop guessing, start growing.
            </p>

            <div className="flex sm:flex-row w-full gap-x-2 gap-y-4">
              <input 
                type="email" 
                placeholder="Enter your work email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base text-slate-900 tracking-tight font-dm-sans bg-white border-slate-200 border rounded-md pt-2 pr-0 pb-2 pl-4 shadow-sm w-full" 
              />
              <div className="cta-buttons-container flex flex-col sm:flex-row gap-4 rounded-md gap-x-4 gap-y-4 items-center justify-center">
                <div className="inline-block rounded-md">
                   <div className="codepen-button rounded-md">
                        <div style={{ position: 'absolute', inset: 0, width: '400%', height: '100%', background: 'linear-gradient(115deg, #004BB0, #004BB0, #004BB0)', backgroundSize: '25% 100%', animation: 'border-shift .75s linear infinite' }}></div>
                        <Link href={email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'}>
                           <span className="block w-full text-center bg-[#004BB0] text-primary-foreground hover:bg-[#033476] transition-colors text-sm font-medium tracking-tight font-dm-sans rounded-md py-3 px-5 shadow-sm">
                                Get Started
                                <ArrowRight className="inline w-5 h-5" />
                           </span>
                        </Link>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: UI Mockups */}
          <div className="mt-8 sm:mt-0 relative [perspective:1000px]">
            <Image src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4aa0ba0f-cf6d-4050-bf33-824539eb56e0_1600w.png" alt="Product UI" width={1600} height={1200} className="w-full h-auto block" />
          </div>
        </div>
        <div className="spline-container absolute top-0 left-0 w-full h-full -z-10"><iframe src="https://my.spline.design/retrofuturismbganimation-d8a23730248f63543111352c8c65f6c8/" frameBorder="0" width="100%" height="100%"></iframe></div>
      </main>

      {/* Social Proof Section */}
       <section className="bg-black">
        <div className="max-w-7xl mr-auto ml-auto pt-12 pr-6 pb-12 pl-6">
          <p className="uppercase text-xs font-medium tracking-tight font-dm-sans text-center mb-10 text-stone-300">
            Trusted by 1,000+ high-growth businesses</p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 border border-stone-700">
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Hexagon className="w-[20px] h-[20px] fill-black text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Acme</span>
              </div>
            </div>
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex items-center gap-2 font-bold text-lg font-mono">
                <Terminal className="w-[20px] h-[20px] text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Hyper</span>
              </div>
            </div>
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex items-center gap-1 font-semibold text-lg italic">
                <Wind className="w-[20px] h-[20px] text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Gust</span>
              </div>
            </div>
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Box className="w-[20px] h-[20px] text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Pack</span>
              </div>
            </div>
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex gap-2 text-lg font-bold gap-x-2 gap-y-2 items-center">
                <InfinityIcon className="w-[20px] h-[20px] text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Loop</span>
              </div>
            </div>
            <div className="flex hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-24 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
              <div className="flex items-center gap-2 font-bold text-lg serif">
                <Anchor className="w-[20px] h-[20px] text-stone-50" />
                <span className="tracking-tight font-dm-sans text-stone-50">Port</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-[#F9F8F6] border-t pt-24 pr-6 pb-24 pl-6 border-slate-100">
        <div className="max-w-7xl mr-auto ml-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl md:text-5xl tracking-tight mb-6 font-instrument-serif font-light text-slate-900">Everything you need to sell more.</h2>
          </div>
          <div className="overflow-hidden grid grid-cols-1 lg:grid-cols-2 border rounded-lg shadow-sm bg-white border-slate-200">
            <div className="md:p-12 lg:border-h-[500px] flex flex-col border-b pt-8 pr-8 pb-8 pl-8 justify-between">
              <div className="z-10 relative">
                <h3 className="text-2xl font-light text-slate-900 tracking-tight font-instrument-serif mb-4">Unified Commerce</h3>
                <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans max-w-sm mb-6">Eliminate context switching.
                    Manage your inventory, sales, and customers in one cohesive operating system.</p>
                <a href="#" className="inline-flex items-center text-sm font-medium hover:text-primary transition-colors group font-dm-sans tracking-tight text-slate-900">
                    See how it works <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
              <div className="flex flex-col border rounded-md pt-5 pr-6 pb-5 pl-6 shadow bg-white border-stone-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="">
                      <h2 className="text-xl sm:text-[22px] tracking-tight font-instrument-serif font-light text-slate-900">Inventory Status</h2>
                      <p className="text-xs text-slate-500 mt-1 font-dm-sans tracking-tight">Track stock levels across all channels.</p>
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition bg-slate-900 text-white hover:bg-slate-800">
                  <span className="font-dm-sans tracking-tight">New Product</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
                </div>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                      <div className="w-16 text-[11px] text-slate-500 font-dm-sans tracking-tight">Online</div>
                      <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                              <div className="h-full w-full bg-slate-900"></div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-medium font-dm-sans tracking-tight">100%</span>
                          <div className="flex -space-x-2">
                            <Globe className="w-5 h-5 p-1 bg-white rounded-full border border-slate-200" />
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-16 text-[11px] text-slate-500 font-dm-sans tracking-tight">In-Store</div>
                      <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                              <div className="h-full w-[59%] bg-slate-900"></div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-medium font-dm-sans tracking-tight">59%</span>
                          <div className="flex -space-x-2">
                              <Server className="w-5 h-5 p-1 bg-white rounded-full border border-slate-200" />
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-16 text-[11px] text-slate-500 font-dm-sans tracking-tight">Warehouse</div>
                      <div className="flex-1">
                          <div className="w-[75%] h-full bg-fuchsia-700"></div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-medium font-dm-sans tracking-tight">75%</span>
                          <div className="flex -space-x-2">
                              <Database className="w-5 h-5 p-1 bg-white rounded-full border border-slate-200" />
                          </div>
                      </div>
                  </div>
                </div>
                <div className="mt-4 border-t pt-3 border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-4">
                          <span className="font-dm-sans tracking-tight">Mon 12</span>
                          <span className="font-dm-sans tracking-tight">Tue 13</span>
                          <span className="font-medium font-dm-sans tracking-tight text-slate-900">Wed 14</span>
                          <span className="font-dm-sans tracking-tight">Thu 15</span>
                          <span className="font-dm-sans tracking-tight">Fri 16</span>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-slate-900/5">
                          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-700"></span>
                          <span className="text-[10px] font-dm-sans tracking-tight text-slate-800">Live Sync</span>
                      </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
                <div className="p-8 md:p-12 border-b flex-1 flex flex-col justify-center transition-colors cursor-default border-slate-100 bg-white hover:bg-slate-50">
                    <div className="flex bg-primary/10 w-10 h-10 border-primary/20 border rounded-lg mb-6 items-center justify-center">
                        <Map className="w-[20px] h-[20px] text-primary" />
                    </div>
                    <h3 className="text-2xl font-light text-slate-900 tracking-tight font-instrument-serif mb-3">Multi-Channel Sales</h3>
                    <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans mb-6">Visualize your sales across all channels on a single timeline. Keep stakeholders aligned without the endless status meetings.</p>
                    <a href="#" className="inline-flex items-center text-sm font-medium transition-colors group font-dm-sans tracking-tight text-slate-900 hover:text-indigo-600">
                        Start Planning <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </a>
                </div>
                <div className="p-8 md:p-12 flex-1 flex flex-col justify-center transition-colors cursor-default bg-white hover:bg-slate-50">
                    <div className="flex bg-primary/10 w-10 h-10 border-primary/20 border rounded-lg mb-6 items-center justify-center">
                        <BarChart2 className="w-[20px] h-[20px] text-primary" />
                    </div>
                    <h3 className="text-2xl font-light text-slate-900 tracking-tight font-instrument-serif mb-3">Capacity Planning</h3>
                    <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans mb-6">Balance your inventory with real-time insights. Prevent stockouts and ship predictably.</p>
                    <a href="#" className="inline-flex items-center text-sm font-medium transition-colors group font-dm-sans tracking-tight text-slate-900 hover:text-amber-600">
                        View analytics <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </a>
                </div>
            </div>
        </div>
      </div>
    </section>

    <section className="z-10 animate-[fadeInUp_1s_ease-out_1.2s_forwards] relative" style={{transform: "translateY(0px)"}}>
        <div className="max-w-7xl mx-auto pt-16 pb-16 px-6">
        <div className="grid gap-12 lg:grid-cols-2 gap-x-12 gap-y-12">
            <div className="bg-center bg-stone-200 bg-[url(https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/f7302105-bf99-4736-914e-d8fbdb904af5_1600w.png)] bg-cover border-stone-200 border rounded-md pt-5 pr-5 pb-5 pl-5 relative">
            <article className="group overflow-hidden transition-shadow hover:shadow-md bg-primary/20 border-stone-300 border rounded relative shadow-xl backdrop-blur-xl">
                <div className="sm:p-10 bg-stone-50 rounded pt-6 pr-6 pb-6 pl-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-2xl font-light text-stone-900 tracking-tight font-instrument-serif">Real-Time Sales Data</h3>
                    <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs text-neutral-300 bg-stone-950 border-white/10 border rounded-full px-2.5 py-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                        <path d="M16 7h6v6" className=""></path>
                        <path d="m22 7-8.5 8.5-5-5L2 17" className=""></path>
                    </svg>
                    Live streaming
                    </span>
                </div>
                <div className="relative h-56 sm:h-64 rounded-2xl bg-gradient-to-b ring-1 ring-inset mb-8 from-neutral-900 to-neutral-800 ring-white/5">
                    <div className="absolute right-3 sm:right-6 top-4 sm:top-6 w-[78%] h-[68%] rounded-2xl backdrop-blur border shadow-sm bg-neutral-900/90 border-neutral-800">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/70">
                        <span className="text-[10px] sm:text-xs tracking-widest text-neutral-400">SALES</span>
                        <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400">+12.5%</span>
                        <span className="h-2 w-12 rounded bg-green-500/20"></span>
                        </div>
                    </div>
                    <div className="p-2">
                        <svg viewBox="0 0 300 90" className="w-full h-20 sm:h-24 text-neutral-700">
                        <defs><pattern id="dots1" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.3"></circle></pattern></defs>
                        <rect width="100%" height="100%" fill="url(#dots1)"></rect>
                        <rect x="20" y="45" width="3" height="20" fill="#EF4444"></rect>
                        <rect x="40" y="35" width="3" height="25" fill="#10B981"></rect>
                        <rect x="60" y="50" width="3" height="15" fill="#EF4444"></rect>
                        <rect x="80" y="30" width="3" height="30" fill="#10B981"></rect>
                        <rect x="100" y="40" width="3" height="20" fill="#10B981"></rect>
                        <rect x="120" y="25" width="3" height="35" fill="#10B981"></rect>
                        <rect x="140" y="45" width="3" height="18" fill="#EF4444"></rect>
                        <rect x="160" y="20" width="3" height="40" fill="#10B981"></rect>
                        <rect x="180" y="35" width="3" height="25" fill="#10B981"></rect>
                        <rect x="200" y="15" width="3" height="45" fill="#10B981"></rect>
                        <polyline points="22,55 42,47 62,57 82,45 102,50 122,42 142,54 162,40 182,47 202,37" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"></polyline>
                        </svg>
                    </div>
                    </div>
                    <div className="absolute left-6 sm:left-12 bottom-10 sm:bottom-12 w-[62%] h-[52%] rounded-2xl backdrop-blur border shadow-sm bg-neutral-900/90 border-neutral-800">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/70">
                        <span className="text-[10px] sm:text-xs tracking-widest text-neutral-400">TOP PRODUCTS</span>
                    </div>
                    <div className="p-2 space-y-1">
                        <div className="flex items-center justify-between text-xs"><span className="text-neutral-300">Quantum HD Monitor</span><span className="text-green-400">+8.2%</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="text-neutral-300">Ergo Mouse</span><span className="text-red-400">-1.5%</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="text-neutral-300">Zeneva Hoodie</span><span className="text-green-400">+5.8%</span></div>
                    </div>
                    </div>
                    <div className="absolute left-3 sm:left-6 bottom-3 sm:bottom-4 w-[38%] h-[44%] rounded-2xl backdrop-blur border shadow-sm bg-neutral-900/90 border-neutral-800">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/70">
                        <span className="text-[10px] sm:text-xs tracking-widest text-neutral-400">POS</span>
                    </div>
                    <div className="p-2">
                        <svg viewBox="0 0 180 70" className="w-full h-14 sm:h-16 text-neutral-700">
                        <rect x="10" y="35" width="2" height="12" fill="#10B981"></rect>
                        <rect x="25" y="30" width="2" height="17" fill="#10B981"></rect>
                        <rect x="40" y="40" width="2" height="10" fill="#EF4444"></rect>
                        <rect x="55" y="25" width="2" height="22" fill="#10B981"></rect>
                        <rect x="70" y="20" width="2" height="27" fill="#10B981"></rect>
                        <rect x="85" y="35" width="2" height="12" fill="#EF4444"></rect>
                        <rect x="100" y="15" width="2" height="32" fill="#10B981"></rect>
                        <rect x="115" y="28" width="2" height="19" fill="#10B981"></rect>
                        <rect x="130" y="12" width="2" height="35" fill="#10B981"></rect>
                        <polyline points="11,41 26,38 41,45 56,36 71,33 86,41 101,31 116,36 131,29" fill="none" stroke="#10B981" strokeWidth="1" strokeLinecap="round"></polyline>
                        </svg>
                    </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                    <h4 className="text-2xl font-light text-stone-900 tracking-tight font-instrument-serif">Advanced Charting</h4>
                    <p className="text-sm text-stone-700 mt-2">Professional-grade sales analysis tools with real-time product performance.</p>
                    </div>
                    <div>
                    <h4 className="text-2xl font-light text-stone-900 tracking-tight font-instrument-serif">Smart Insights</h4>
                    <p className="mt-2 text-sm text-neutral-400">Curated inventory tracking with instant performance updates and alerts.</p>
                    </div>
                </div>
                <div>
                    <a href="#" className="inline-flex items-center gap-2 text-xs font-medium text-neutral-100 hover:text-neutral-300">
                    Start Selling
                    <ArrowRight className="h-4 w-4" />
                    </a>
                </div>
                </div>
            </article>
            </div>

            <div className="px-6">
            <div className="tech-content" id="technology">
                <h3 className="sm:text-5xl transition-colors duration-500 text-4xl font-light text-slate-900 tracking-tight font-instrument-serif">
                Industry-leading precision, professionally certified</h3>
                <div className="mt-8">
                <div className="pt-6">
                    <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 bg-blue-100">
                        <Check className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                        <h5 className="text-base font-medium tracking-tight font-dm-sans text-slate-900">Real-time Processing</h5>
                        <p className="text-base tracking-tight font-dm-sans mt-1 text-slate-600">Sub-second inventory analysis with continuous calibration for consistent results.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 bg-blue-100">
                            <Check className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                        <h5 className="text-base font-medium tracking-tight font-dm-sans text-slate-900">Advanced Algorithms</h5>
                        <p className="text-base tracking-tight font-dm-sans mt-1 text-slate-600">Machine learning-enhanced sales forecasting with proprietary spectral analysis for superior accuracy.</p>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>

            <div className="border-t mt-8 pt-6 border-neutral-200">
                <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer items-center">
                    <div>
                    <div className="flex items-baseline gap-2">
                        <span className="rating-number text-2xl tracking-tight font-instrument-serif font-light text-slate-900" data-target="4.8">4.8</span>
                        <span className="text-sm font-instrument-serif text-slate-600">/5</span>
                    </div>
                    <p className="text-base tracking-tight text-slate-600">22k+ professional reviews</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer">
                    <div>
                    <div className="flex items-baseline gap-2">
                        <span className="rating-number text-2xl tracking-tight font-instrument-serif font-light text-slate-900" data-target="94">94%</span>
                    </div>
                    <p className="text-base tracking-tight font-dm-sans text-slate-600">Users recommend to colleagues</p>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    </section>

    {/* Testimonials */}
    <section id="testimonials" className="border-y pt-24 pr-6 pb-24 pl-6 bg-stone-900 border-stone-900">
        <div className="text-center max-w-4xl mr-auto ml-auto">
            <div className="flex justify-center mb-10">
                <div className="p-3 rounded-xl border bg-slate-800/50 border-slate-700/50">
                    <Quote className="fill-current w-[24px] h-[24px] text-primary"/>
                </div>
            </div>
            <h3 className="md:text-5xl leading-[1.2] text-3xl tracking-tight mb-12 font-instrument-serif font-light text-white">"Zeneva has fundamentally changed how we manage our inventory. The visibility into our stock levels and the speed of our sales process is unmatched."</h3>
            <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-primary/70 p-[1px]">
                    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-slate-900">
                        <Image src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/0a9490d3-0806-4139-aaa6-628fd3eee5b1_320w.png" alt="User" width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="text-left">
                    <div className="font-medium font-dm-sans tracking-tight text-white">Alex Doe</div>
                    <div className="text-sm tracking-tight font-dm-sans text-slate-400">CEO, Acme Inc.</div>
                </div>
            </div>
        </div>
    </section>

    <section id="pricing" className="bg-[#F9F8F6] pt-24 pr-6 pb-24 pl-6">
        <div className="max-w-7xl mr-auto ml-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl font-light text-slate-900 tracking-tight font-instrument-serif mb-4">Simple, transparent pricing</h2>
                <p className="text-lg text-slate-500 tracking-tight font-dm-sans">Choose the plan that's right for your business.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Starter Plan */}
                <div className="border border-slate-200 rounded-lg p-8 shadow-sm flex flex-col">
                    <h3 className="text-2xl font-bold font-dm-sans text-slate-900">Starter</h3>
                    <p className="text-slate-500 mt-2">Explore core features with a free trial.</p>
                    <div className="mt-6">
                        <span className="text-5xl font-bold tracking-tight font-instrument-serif text-slate-900">₦0</span>
                        <span className="text-slate-500"> / for 7 days</span>
                    </div>
                    <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>7-Day Free Trial of Pro features</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Up to 5 users</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Up to 500 products</span>
                        </li>
                    </ul>
                    <Link href="/signup" className="mt-8 block text-center bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium tracking-tight font-dm-sans rounded-md py-3 px-5 shadow-sm">
                        Start Your Free Trial
                    </Link>
                </div>

                {/* Pro Plan */}
                <div className="border-2 border-primary rounded-lg p-8 shadow-lg flex flex-col relative">
                    <div className="absolute top-0 right-8 -mt-3">
                        <div className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-primary text-primary-foreground rounded-full">Most Popular</div>
                    </div>
                    <h3 className="text-2xl font-bold font-dm-sans text-slate-900">Pro</h3>
                    <p className="text-slate-500 mt-2">For small businesses and startups.</p>
                    <div className="mt-6">
                        <span className="text-5xl font-bold tracking-tight font-instrument-serif text-slate-900">₦10,000</span>
                        <span className="text-slate-500"> / month</span>
                    </div>
                    <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                         <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Up to 1,500 products</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Basic Sales Analytics</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Customer Management (CRM)</span>
                        </li>
                    </ul>
                    <div className="mt-8">
                        <div className="codepen-button rounded-md">
                            <div style={{ position: 'absolute', inset: 0, width: '400%', height: '100%', background: 'linear-gradient(115deg, hsl(var(--primary)), hsl(var(--primary)), hsl(var(--primary)))', backgroundSize: '25% 100%', animation: 'border-shift .75s linear infinite' }}></div>
                            <Link href="/signup">
                                <span className="block w-full text-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium tracking-tight font-dm-sans rounded-md py-3 px-5 shadow-sm">
                                    Get Started with Pro
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Business Plan */}
                <div className="border border-slate-200 rounded-lg p-8 shadow-sm flex flex-col">
                    <h3 className="text-2xl font-bold font-dm-sans text-slate-900">Business</h3>
                    <p className="text-slate-500 mt-2">For growing businesses and teams.</p>
                    <div className="mt-6">
                        <span className="text-5xl font-bold tracking-tight font-instrument-serif text-slate-900">₦30,000</span>
                        <span className="text-slate-500"> / month</span>
                    </div>
                    <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Unlimited products</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Unlimited users</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Advanced Sales Analytics</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>AI-Powered Troubleshooting</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-primary" />
                            <span>Priority Support</span>
                        </li>
                    </ul>
                    <Link href="/signup" className="mt-8 block text-center bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium tracking-tight font-dm-sans rounded-md py-3 px-5 shadow-sm">
                        Get Started with Business
                    </Link>
                </div>
            </div>
        </div>
    </section>

    {/* FAQ Section */}
    <section id="faq" className="py-24 px-6 border-t bg-white border-slate-100">
        <div className="max-w-3xl mr-auto ml-auto">
            <h2 className="text-3xl tracking-tight mb-12 text-center font-instrument-serif font-light text-slate-900">Frequently asked questions</h2>
            <div className="space-y-6">
                <div className="hover:shadow-sm transition-shadow border rounded-md pt-6 pr-6 pb-6 pl-6 border-neutral-200">
                    <h3 className="text-lg font-semibold mb-3 font-dm-sans tracking-tight text-neutral-900">How does the subscription model work?</h3>
                    <p className="leading-relaxed text-base tracking-tight font-dm-sans text-neutral-600">Our subscription model gives you access to our full suite of inventory management tools for a flat monthly rate. You can manage unlimited products, track sales, and engage customers without worrying about hidden fees.</p>
                </div>
                <div className="hover:shadow-sm transition-shadow border rounded-md pt-6 pr-6 pb-6 pl-6 border-neutral-200">
                    <h3 className="text-lg font-semibold mb-3 font-dm-sans tracking-tight text-neutral-900">What's included in each plan?</h3>
                    <p className="leading-relaxed text-base tracking-tight font-dm-sans text-neutral-600">Each plan includes different levels of service. Starter focuses on core inventory and sales tracking, Pro adds advanced analytics and multi-channel support, while Business provides enterprise-grade features and dedicated support.</p>
                </div>
                <div className="hover:shadow-sm transition-shadow border rounded-md pt-6 pr-6 pb-6 pl-6 border-neutral-200">
                    <h3 className="text-lg font-semibold mb-3 font-dm-sans tracking-tight text-neutral-900">Can I import my existing product data?</h3>
                    <p className="leading-relaxed text-base tracking-tight font-dm-sans text-neutral-600">Yes! We provide easy-to-use tools to import your products from a CSV file, Shopify, or other platforms. Our support team is also available to help you get started.</p>
                </div>
                <div className="text-center mt-12">
                    <p className="mb-4 font-dm-sans tracking-tight text-neutral-600">Still have questions?</p>
                    <a href="#contact" className="hover:bg-primary/90 transition-colors text-sm font-medium tracking-tight font-dm-sans bg-primary rounded-md pt-2.5 pr-5 pb-2.5 pl-5 shadow-sm text-white">Contact Us</a>
                </div>
            </div>
        </div>
    </section>
    
    <MarketingFooter />
    </div>
  );
}
