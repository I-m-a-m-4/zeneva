
'use client';

import {
    ArrowRight,
    Blocks,
    Bot,
    BrainCircuit,
    Check,
    Code,
    Cpu,
    Database,
    Download,
    Droplet,
    Globe,
    Hexagon,
    InfinityIcon,
    Instagram,
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
    Twitter,
    Wind,
    Github,
    Linkedin,
    ArrowUp,
    Box,
    Anchor,
    BarChart2,
    Loader,
    ShoppingCart,
    Figma,
    Gitlab,
    GitCommit,
    Workflow,
    ShieldCheck,
    Zap,
    Shirt,
    Coffee,
    BookOpen,
    Smartphone,
    Loader2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import BackToTopButton from '@/components/back-to-top-button';
import MarketingHeader from '@/components/layout/marketing-header';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import MarketingFooter from '@/components/layout/marketing-footer';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { sendContactFormEmail } from '@/lib/email';

export default function Home() {
    const [email, setEmail] = useState('');
    const { toast } = useToast();
    const form = useRef<HTMLFormElement>(null);
    const [isSending, setIsSending] = useState(false);

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.current) return;
        setIsSending(true);

        sendContactFormEmail(form.current)
            .then((result) => {
                toast({ variant: 'success', title: 'Message Sent!', description: 'We will get back to you shortly.' });
                form.current?.reset();
            }, (error) => {
                toast({ variant: 'destructive', title: 'Send Failed', description: error.message || 'Could not send message. Please try again later.' });
            })
            .finally(() => {
                setIsSending(false);
            });
    };

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
            "@type": "WebPage",
            "@id": "https://www.zeneva.com"
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
            toast({ title: 'Share not supported', description: 'Referral link copied to clipboard instead.' });
        }
    };

    const businessTypes = [
        { name: 'Fashion & Clothing', imageId: 'boutique-store', description: 'Manage your unique collection with style and ease.' },
        { name: 'Jewellery Store', imageId: 'jewelry-store', description: 'Track every precious item from display to sale.' },
        { name: 'Furniture Store', imageId: 'furniture-store', description: 'From sofas to side tables, keep your large inventory in order.' },
        { name: 'Electronic Shop', imageId: 'electronics-store', description: 'Handle serial numbers and complex inventory with ease.' },
        { name: 'Cafe Shop', imageId: 'cafe-shop', description: 'Serve up loyalty and track your beans with precision.' },
        { name: 'Book Store', imageId: 'book-store', description: 'Organize your titles, authors, and editions seamlessly.' },
        { name: 'Skin Care', imageId: 'skin-care', description: 'Manage batches, expiry dates, and product variations.' },
        { name: 'Restaurant', imageId: 'restaurant', description: 'Track ingredients, manage menus, and speed up orders.' },
    ];

    return (
        <div className="antialiased overflow-x-hidden text-slate-900 bg-[#F9F8F6] relative">
            <div className="fixed grid-lines w-full h-screen top-0 left-0 pointer-events-none z-0"></div>
            <div className="relative z-10">
                <Head>
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                    />
                </Head>
                <MarketingHeader />

                {/* Main Hero Section */}
                <main className="bg-transparent lg:pt-48 lg:pb-48 w-full max-w-none mr-auto ml-auto pt-40 pr-6 pb-32 pl-6 relative overflow-hidden">
                    <div className="aura-background"></div>
                    <div className="grid lg:grid-cols-2 max-w-7xl mr-auto ml-auto items-center">

                        {/* Left Column: Copy & Form */}
                        <div className="max-w-xl z-10">
                            <p className="uppercase text-xs font-semibold tracking-tight font-dm-sans mb-6 text-slate-900">The Operating System For Your Business</p>
                            <h1 className="leading-[0.95] lg:text-7xl xl:text-8xl text-5xl font-medium text-foreground tracking-tighter font-display mb-8">
                                The AI-Powered Commerce<br/>
                                Platform for <span className="text-muted-foreground/80 relative inline-block">Growth.
                                <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4"></path></svg>
                                </span>
                            </h1>
                            
                            <p className="leading-relaxed text-lg tracking-tight font-dm-sans max-w-lg mb-10 text-slate-900">
                                Zeneva is the AI-powered operating system for modern commerce. Go beyond simple tracking with predictive insights, automated workflows, and a customizable storefront to maximize profit and eliminate stockouts.
                            </p>

                            <div className="flex sm:flex-row w-full gap-x-2 gap-y-4">
                           <Input
      type="email"
      placeholder="Enter your work email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="
        !h-20
        !min-h-[6rem]
        !py-6
        !leading-tight
        placeholder-slate-400
        focus:outline-none
        focus:ring-2 focus:ring-primary/20
        focus:border-primary
        transition-all
        text-xl
        text-slate-900
        tracking-tight
        font-dm-sans
        bg-white
        border border-slate-200
        rounded-md
        px-5
        shadow-sm
        w-full
      "
    />



                                <div className="cta-buttons-container flex flex-col sm:flex-row gap-4 rounded-md gap-x-4 gap-y-4 items-center justify-center">
                                    <div className="inline-block rounded-md">
                                        <div className="codepen-button rounded-md">

                                            <Link href={email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'}>
                                                <span className="block w-full text-center bg-[#1e293b] text-primary-foreground hover:bg-[#0f172a] transition-colors text-sm font-medium tracking-tight font-dm-sans rounded-md py-3 px-5 shadow-sm">
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
                            <Image src="/computer-P.png" alt="Product UI" width={1600} height={1200} className="w-full h-auto block" />
                        </div>
                    </div>
                </main>

                {/* Social Proof Section */}
                <section className="bg-black">
                    <div className="max-w-7xl mr-auto ml-auto pt-12 pr-6 pb-12 pl-6">
                        <p className="uppercase text-xs font-medium tracking-tight font-dm-sans text-center mb-10 text-stone-300">
                            Powering various high-growth businesses
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-l border-stone-700">
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <ShoppingCart className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Online Retailers</span>
                            </div>
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <Shirt className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Fashion Boutiques</span>
                            </div>
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <Coffee className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Coffee Shops</span>
                            </div>
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <Sparkles className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Skincare Brands</span>
                            </div>
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <BookOpen className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Book Stores</span>
                            </div>
                            <div className="flex flex-col gap-2 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer opacity-60 h-28 border-r border-b pt-6 pr-6 pb-6 pl-6 grayscale items-center justify-center border-stone-700">
                                <Smartphone className="w-8 h-8 text-stone-400" />
                                <span className="tracking-tight font-dm-sans text-sm text-stone-300 text-center">Electronics Shops</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="bg-[#F9F8F6] border-t pt-24 pr-6 pb-24 pl-6 border-slate-100">
                    <div className="max-w-7xl mr-auto ml-auto">
                        <div className="max-w-2xl mb-16">
                            <h2 className="text-4xl md:text-5xl tracking-tight mb-6 font-bricolage font-light text-slate-900">One Platform, Infinite Growth.</h2>
                        </div>
                        <div className="overflow-hidden grid grid-cols-1 lg:grid-cols-2 border rounded-lg shadow-sm bg-white border-slate-200">
                            <div className="md:p-12 lg:border-h-[500px] flex flex-col border-b pt-8 pr-8 pb-8 pl-8 justify-between">
                                <div className="z-10 relative">
                                    <h3 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage mb-4">Smart Inventory &amp; POS</h3>
                                    <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans max-w-sm mb-6">A blazingly fast POS that automatically syncs with your inventory. Never oversell again. Know exactly what you have, in real-time, from anywhere.</p>
                                    <a href="#" className="inline-flex items-center text-sm font-medium hover:text-primary transition-colors group font-dm-sans tracking-tight text-slate-900">
                                        Explore POS Features <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </a>
                                </div>
                                <div className="z-10 animate-[fadeInUp_1s_ease-out_1.2s_forwards] relative" style={{ transform: "translateY(0px)" }}>
                                    <div className="relative h-56 sm:h-64 rounded-2xl bg-gradient-to-b ring-1 ring-inset mb-8 from-neutral-200 to-neutral-100 ring-black/5">
                                        <div className="absolute right-3 sm:right-6 top-4 sm:top-6 w-[78%] h-[68%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">SALES</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-green-600">+12.5%</span>
                                                    <span className="h-2 w-12 rounded bg-green-500/20"></span>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <svg viewBox="0 0 300 90" className="w-full h-20 sm:h-24 text-neutral-300">
                                                    <defs><pattern id="dots1" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.3"></circle></pattern></defs>
                                                    <rect width="100%" height="100%" fill="url(#dots1)"></rect>
                                                    <rect x="20" y="45" width="3" height="20" fill="#F87171"></rect>
                                                    <rect x="40" y="35" width="3" height="25" fill="#4ADE80"></rect>
                                                    <rect x="60" y="50" width="3" height="15" fill="#F87171"></rect>
                                                    <rect x="80" y="30" width="3" height="30" fill="#4ADE80"></rect>
                                                    <rect x="100" y="40" width="3" height="20" fill="#4ADE80"></rect>
                                                    <rect x="120" y="25" width="3" height="35" fill="#4ADE80"></rect>
                                                    <rect x="140" y="45" width="3" height="18" fill="#F87171"></rect>
                                                    <rect x="160" y="20" width="3" height="40" fill="#4ADE80"></rect>
                                                    <rect x="180" y="35" width="3" height="25" fill="#4ADE80"></rect>
                                                    <rect x="200" y="15" width="3" height="45" fill="#4ADE80"></rect>
                                                    <polyline points="22,55 42,47 62,57 82,45 102,50 122,42 142,54 162,40 182,47 202,37" fill="none" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"></polyline>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="absolute left-6 sm:left-12 bottom-10 sm:bottom-12 w-[62%] h-[52%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">TOP PRODUCTS</span>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Quantum HD Monitor</span><span className="text-green-600">+8.2%</span></div>
                                                <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Ergo Mouse</span><span className="text-red-600">-1.5%</span></div>
                                                <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Zeneva Hoodie</span><span className="text-green-600">+5.8%</span></div>
                                            </div>
                                        </div>
                                        <div className="absolute left-3 sm:left-6 bottom-3 sm:bottom-4 w-[38%] h-[44%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">POS</span>
                                            </div>
                                            <div className="p-2">
                                                <svg viewBox="0 0 180 70" className="w-full h-14 sm:h-16 text-neutral-300">
                                                    <rect x="10" y="35" width="2" height="12" fill="#4ADE80"></rect>
                                                    <rect x="25" y="30" width="2" height="17" fill="#4ADE80"></rect>
                                                    <rect x="40" y="40" width="2" height="10" fill="#F87171"></rect>
                                                    <rect x="55" y="25" width="2" height="22" fill="#4ADE80"></rect>
                                                    <rect x="70" y="20" width="2" height="27" fill="#4ADE80"></rect>
                                                    <rect x="85" y="35" width="2" height="12" fill="#F87171"></rect>
                                                    <rect x="100" y="15" width="2" height="32" fill="#4ADE80"></rect>
                                                    <rect x="115" y="28" width="2" height="19" fill="#4ADE80"></rect>
                                                    <rect x="130" y="12" width="2" height="35" fill="#4ADE80"></rect>
                                                    <polyline points="11,41 26,38 41,45 56,36 71,33 86,41 101,31 116,36 131,29" fill="none" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round"></polyline>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Why Zeneva?</h4>
                                            <p className="text-sm text-stone-700 mt-2">Founders are drowning in useless charts. You have data in Stripe, Google Analytics, and Mixpanel. But you still don't know why users aren't converting. Zeneva fixes that.</p>
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Action Suggestions</h4>
                                            <p className="mt-2 text-sm text-neutral-400">Don't just see the problem. Zeneva suggests fixes like "Shorten signup form" to improve conversion.</p>
                                        </div>
                                    </div>
                                    <div>
                                        <a href="#" className="inline-flex items-center gap-2 text-xs font-medium text-neutral-100 hover:text-neutral-300">
                                            Start Selling
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <div className="p-8 md:p-12 border-b flex-1 flex flex-col justify-center transition-colors cursor-default border-slate-100 bg-white hover:bg-slate-50">
                                    <div className="flex bg-primary/10 w-10 h-10 border-primary/20 border rounded-lg mb-6 items-center justify-center">
                                        <Sparkles className="w-[20px] h-[20px] text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage mb-3">AI Business Co-pilot</h3>
                                    <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans mb-6">Go beyond basic reports. Zen AI analyzes your entire business to give you a real-time Health Score, identifies aging inventory, provides dynamic pricing guidance, and forecasts demand.</p>
                                    <a href="#" className="inline-flex items-center text-sm font-medium transition-colors group font-dm-sans tracking-tight text-slate-900 hover:text-indigo-600">
                                        See Zen AI in Action <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </a>
                                </div>
                                <div className="p-8 md:p-12 flex-1 flex flex-col justify-center transition-colors cursor-default bg-white hover:bg-slate-50">
                                    <div className="flex bg-primary/10 w-10 h-10 border-primary/20 border rounded-lg mb-6 items-center justify-center">
                                        <Globe className="w-[20px] h-[20px] text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage mb-3">Public Storefront</h3>
                                    <p className="leading-relaxed text-base text-slate-500 tracking-tight font-dm-sans mb-6">Launch a beautiful, mobile-friendly online store in minutes. Customize the theme, set your URL, and start accepting orders online with Paystack integration.</p>
                                    <a href="#" className="inline-flex items-center text-sm font-medium transition-colors group font-dm-sans tracking-tight text-slate-900 hover:text-amber-600">
                                        Design Your Store <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="py-24 overflow-hidden relative border-b border-slate-100">
                    <div className="sm:px-6 lg:px-8 max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary ring-1 ring-primary/20 uppercase tracking-tight mb-4 font-semibold">
                                <Workflow className="mr-1 h-3 w-3" />
                                The Future is AI-Native
                            </span>
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-slate-900 mb-4 font-bricolage">
                                The Operating System for Modern Retail
                            </h2>
                            <p className="text-lg text-slate-500 font-light">
                                Zeneva is more than a tool; it's an intelligent partner. We use AI to automate decisions, predict trends, and help you focus on what matters most: growing your business.
                            </p>
                        </div>

                        <div className="relative mx-auto max-w-4xl">
                            <div className="flex items-center justify-center gap-6 sm:gap-10 relative z-10">
                                <div className="group relative cursor-pointer">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                        <BrainCircuit className="text-slate-600 group-hover:text-primary transition-colors h-6 w-6" />
                                    </span>
                                </div>
                                <div className="group relative cursor-pointer">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                        <Bot className="text-slate-600 group-hover:text-primary transition-colors h-6 w-6" />
                                    </span>
                                </div>
                                <div className="group relative cursor-pointer">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                        <Blocks className="text-slate-600 group-hover:text-primary transition-colors h-6 w-6" />
                                    </span>
                                </div>
                                <div className="group relative cursor-pointer">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                        <Database className="text-slate-600 group-hover:text-primary transition-colors h-6 w-6" />
                                    </span>
                                </div>
                                <div className="group relative cursor-pointer">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                        <ShoppingCart className="text-slate-600 group-hover:text-primary transition-colors h-6 w-6" />
                                    </span>
                                </div>
                            </div>

                            <div className="relative mt-8 h-64 pointer-events-none">
                                <svg viewBox="0 0 900 360" className="absolute inset-0 w-full h-full" fill="none">
                                    <defs>
                                        <linearGradient id="line-gradient-light" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0"></stop>
                                            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8"></stop>
                                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path d="M450 300 C 450 200, 300 120, 150 30" stroke="url(#line-gradient-light)" strokeWidth="1" strokeLinecap="round" fill="none">
                                        <animate attributeName="stroke-dasharray" values="600" dur="0.1s" fill="freeze" />
                                        <animate attributeName="stroke-dashoffset" values="600;0;600" dur="4s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M450 300 C 450 210, 360 130, 270 30" stroke="url(#line-gradient-light)" strokeWidth="1" strokeLinecap="round" fill="none">
                                        <animate attributeName="stroke-dasharray" values="520" dur="0.1s" fill="freeze" />
                                        <animate attributeName="stroke-dashoffset" values="520;0;520" dur="4s" begin="0.2s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M450 300 C 450 210, 540 130, 630 30" stroke="url(#line-gradient-light)" strokeWidth="1" strokeLinecap="round" fill="none">
                                        <animate attributeName="stroke-dasharray" values="520" dur="0.1s" fill="freeze" />
                                        <animate attributeName="stroke-dashoffset" values="520;0;520" dur="4s" begin="0.8s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M450 300 C 450 200, 600 120, 750 30" stroke="url(#line-gradient-light)" strokeWidth="1" strokeLinecap="round" fill="none">
                                        <animate attributeName="stroke-dasharray" values="600" dur="0.1s" fill="freeze" />
                                        <animate attributeName="stroke-dashoffset" values="600;0;600" dur="4s" begin="1s" repeatCount="indefinite" />
                                    </path>
                                </svg>

                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                                    <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-background/80 ring-1 ring-slate-200 backdrop-blur-lg shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] relative z-20">
                                        <Image src="https://i.ibb.co/JjLC3Ff1/Trolley.png" alt="Zeneva Logo" width={40} height={40} />
                                        <span className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse"></span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mx-auto mt-12 max-w-4xl">
                            <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-slate-600">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100/80 cursor-pointer">
                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-xs">Predictive Analytics</span>
                                </div>
                                <div className="hidden sm:block w-16 h-px border-t border-dashed border-slate-200"></div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100/80 cursor-pointer">
                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-xs">AI-Powered Intelligence</span>
                                </div>
                                <div className="hidden sm:block w-16 h-px border-t border-dashed border-slate-200"></div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100/80 cursor-pointer">
                                    <Database className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-xs">Unified Data</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


                <section className="py-24 relative border-b border-slate-100 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="mb-16 max-w-2xl">
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-slate-900 font-bricolage">
                                Stop <span className="text-slate-400">guessing</span>, start <span className="text-slate-400">selling.</span>
                            </h2>
                            <p className="text-lg text-slate-500 font-light">
                                Your data is scattered across spreadsheets, receipts, and notebooks. Zeneva unifies it all, turning chaos into clarity.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 shadow-sm relative overflow-hidden rounded-lg">
                            <div className="bg-slate-50 p-8 group cursor-pointer">
                                <div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center mb-6 text-slate-900 group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-inner">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-light text-slate-900 tracking-tight font-bricolage mb-3 group-hover:text-slate-900 transition-colors">Unified Dashboard</h3>
                                <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                                    Stop the tab-switching madness. See your inventory levels, sales data, and customer profiles in one clean, synchronized view.
                                </p>
                            </div>
                            <div className="bg-slate-50 p-8 group cursor-pointer">
                                <div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center mb-6 text-slate-900 group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-inner">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-light text-slate-900 tracking-tight font-bricolage mb-3 group-hover:text-slate-900 transition-colors">AI-Powered Insights</h3>
                                <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                                    Don't just see numbers, get answers. Zen AI troubleshoots your product data and provides actionable tactics to better engage your customers.
                                </p>
                            </div>
                            <div className="bg-slate-50 p-8 group cursor-pointer">
                                <div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center mb-6 text-slate-900 group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-inner">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-light text-slate-900 tracking-tight font-bricolage mb-3 group-hover:text-slate-900 transition-colors">Smart Alerts</h3>
                                <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                                    Don't wait for a stockout. Zeneva proactively tells you when your bestsellers are running low so you never miss a sale.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

               <section id="business-types" className="py-24 px-6 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-light text-slate-900 tracking-tight font-bricolage mb-4">
                Perfect for Your Business
              </h2>
              <p className="text-lg text-slate-500 tracking-tight font-dm-sans">
                Zeneva adapts to any retail environment. From fashion boutiques to electronics stores, our platform is built to handle your unique inventory needs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {businessTypes.map((type) => {
                  const image = PlaceHolderImages.find(p => p.id === type.imageId);
                  if (!image) return null;
                  return (
                    <div key={type.name} className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/5] cursor-pointer">
                      <Image
                        src={image.imageUrl}
                        alt={type.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        data-ai-hint={image.imageHint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white">
                        <h3 className="text-2xl font-light tracking-tight font-bricolage">{type.name}</h3>
                        <p className="mt-1 text-sm text-white/90">{type.description}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </section>

                <section className="z-10 animate-[fadeInUp_1s_ease-out_1.2s_forwards] relative" style={{ transform: "translateY(0px)" }}>
                    <div className="max-w-7xl mx-auto pt-16 pb-16 px-6">
                        <div className="grid gap-12 lg:grid-cols-2 gap-x-12 gap-y-12">
                            <div className="bg-center bg-stone-200 bg-[url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/f7302105-bf99-4736-914e-d8fbdb904af5_1600w.png')] bg-cover border-stone-200 border rounded-md pt-5 pr-5 pb-5 pl-5 relative">
                                <article className="group overflow-hidden transition-shadow hover:shadow-md bg-primary/20 border-stone-300 border rounded relative shadow-xl backdrop-blur-xl">
                                    <div className="sm:p-10 bg-stone-50 rounded pt-6 pr-6 pb-6 pl-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                            <h3 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Real-Time Sales Data</h3>
                                            <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs text-neutral-300 bg-stone-950 border-white/10 border rounded-full px-2.5 py-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                                                    <path d="M16 7h6v6" className=""></path>
                                                    <path d="m22 7-8.5 8.5-5-5L2 17" className=""></path>
                                                </svg>
                                                Live streaming
                                            </span>
                                        </div>
                                        <div className="relative h-56 sm:h-64 rounded-2xl bg-gradient-to-b ring-1 ring-inset mb-8 from-neutral-200 to-neutral-100 ring-black/5">
                                            <div className="absolute right-3 sm:right-6 top-4 sm:top-6 w-[78%] h-[68%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                    <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">SALES</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-green-600">+12.5%</span>
                                                        <span className="h-2 w-12 rounded bg-green-500/20"></span>
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <svg viewBox="0 0 300 90" className="w-full h-20 sm:h-24 text-neutral-300">
                                                        <defs><pattern id="dots1" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.3"></circle></pattern></defs>
                                                        <rect width="100%" height="100%" fill="url(#dots1)"></rect>
                                                        <rect x="20" y="45" width="3" height="20" fill="#F87171"></rect>
                                                        <rect x="40" y="35" width="3" height="25" fill="#4ADE80"></rect>
                                                        <rect x="60" y="50" width="3" height="15" fill="#F87171"></rect>
                                                        <rect x="80" y="30" width="3" height="30" fill="#4ADE80"></rect>
                                                        <rect x="100" y="40" width="3" height="20" fill="#4ADE80"></rect>
                                                        <rect x="120" y="25" width="3" height="35" fill="#4ADE80"></rect>
                                                        <rect x="140" y="45" width="3" height="18" fill="#F87171"></rect>
                                                        <rect x="160" y="20" width="3" height="40" fill="#4ADE80"></rect>
                                                        <rect x="180" y="35" width="3" height="25" fill="#4ADE80"></rect>
                                                        <rect x="200" y="15" width="3" height="45" fill="#4ADE80"></rect>
                                                        <polyline points="22,55 42,47 62,57 82,45 102,50 122,42 142,54 162,40 182,47 202,37" fill="none" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="absolute left-6 sm:left-12 bottom-10 sm:bottom-12 w-[62%] h-[52%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                    <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">TOP PRODUCTS</span>
                                                </div>
                                                <div className="p-2 space-y-1">
                                                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Quantum HD Monitor</span><span className="text-green-600">+8.2%</span></div>
                                                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Ergo Mouse</span><span className="text-red-600">-1.5%</span></div>
                                                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-700">Zeneva Hoodie</span><span className="text-green-600">+5.8%</span></div>
                                                </div>
                                            </div>
                                            <div className="absolute left-3 sm:left-6 bottom-3 sm:bottom-4 w-[38%] h-[44%] rounded-2xl backdrop-blur border shadow-sm bg-white/70 border-neutral-200">
                                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/70">
                                                    <span className="text-[10px] sm:text-xs tracking-widest text-neutral-500">POS</span>
                                                </div>
                                                <div className="p-2">
                                                    <svg viewBox="0 0 180 70" className="w-full h-14 sm:h-16 text-neutral-300">
                                                        <rect x="10" y="35" width="2" height="12" fill="#4ADE80"></rect>
                                                        <rect x="25" y="30" width="2" height="17" fill="#4ADE80"></rect>
                                                        <rect x="40" y="40" width="2" height="10" fill="#F87171"></rect>
                                                        <rect x="55" y="25" width="2" height="22" fill="#4ADE80"></rect>
                                                        <rect x="70" y="20" width="2" height="27" fill="#4ADE80"></rect>
                                                        <rect x="85" y="35" width="2" height="12" fill="#F87171"></rect>
                                                        <rect x="100" y="15" width="2" height="32" fill="#4ADE80"></rect>
                                                        <rect x="115" y="28" width="2" height="19" fill="#4ADE80"></rect>
                                                        <rect x="130" y="12" width="2" height="35" fill="#4ADE80"></rect>
                                                        <polyline points="11,41 26,38 41,45 56,36 71,33 86,41 101,31 116,36 131,29" fill="none" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            <div>
                                                <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Why Zeneva?</h4>
                                                <p className="text-sm text-stone-700 mt-2">Founders are drowning in useless charts. You have data in Stripe, Google Analytics, and Mixpanel. But you still don't know why users aren't converting. Zeneva fixes that.</p>
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Action Suggestions</h4>
                                                <p className="mt-2 text-sm text-neutral-400">Don't just see the problem. Zeneva suggests fixes like "Shorten signup form" to improve conversion.</p>
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
                                    <h3 className="sm:text-5xl transition-colors duration-500 text-4xl font-light text-slate-900 tracking-tight font-bricolage">
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
                                                    <span className="rating-number text-2xl tracking-tight font-bricolage font-light text-slate-900" data-target="4.8">4.8</span>
                                                    <span className="text-sm font-bricolage text-slate-600">/5</span>
                                                </div>
                                                <p className="text-base tracking-tight text-slate-600">22k+ professional reviews</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer">
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="rating-number text-2xl tracking-tight font-bricolage font-light text-slate-900" data-target="94">94%</span>
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

                {/* Pricing Section */}
                <section id="pricing" className="bg-[#F9F8F6] pt-24 pr-6 pb-24 pl-6">
                    <div className="max-w-7xl mr-auto ml-auto">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="text-4xl font-light text-slate-900 tracking-tight font-bricolage mb-4">Simple, transparent pricing</h2>
                            <p className="text-lg text-slate-500 tracking-tight font-dm-sans">Choose the plan that's right for your business.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Starter Plan */}
                            <div className="border border-slate-200 rounded-lg p-8 shadow-sm flex flex-col">
                                <h3 className="text-2xl font-bold font-dm-sans text-slate-900">Starter</h3>
                                <p className="text-slate-500 mt-2">For new businesses getting started.</p>
                                <div className="mt-6">
                                    <span className="text-5xl font-bold tracking-tight font-bricolage text-slate-900">₦0</span>
                                    <span className="text-slate-500"> / for 30 days</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>30-Day Free Trial</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Up to 5 users</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Up to 500 products</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Core Inventory & POS</span>
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
                                <p className="text-slate-500 mt-2">For growing businesses that need more power.</p>
                                <div className="mt-6">
                                    <span className="text-5xl font-bold tracking-tight font-bricolage text-slate-900">₦10,000</span>
                                    <span className="text-slate-500"> / month</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Up to 1,500 products & 10 users</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Advanced Point of Sale (POS)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Customizable Public Storefront</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Advanced Reports & Analytics</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>AI Product Troubleshooter</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Secure Audit Log</span>
                                    </li>
                                </ul>
                                <div className="mt-8">
                                    <Button asChild size="lg" className="w-full">
                                        <Link href="/signup">Get Started with Pro</Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Business Plan */}
                            <div className="border border-slate-200 rounded-lg p-8 shadow-sm flex flex-col">
                                <h3 className="text-2xl font-bold font-dm-sans text-slate-900">Business</h3>
                                <p className="text-slate-500 mt-2">For scaling businesses that need advanced tools.</p>
                                <div className="mt-6">
                                    <span className="text-5xl font-bold tracking-tight font-bricolage text-slate-900">₦30,000</span>
                                    <span className="text-slate-500"> / month</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Everything in Pro, plus:</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Unlimited products & users</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>AI Business Performance Dashboard</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Advanced Customer Intelligence (CRM+)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Automated Email Receipts</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-primary" />
                                        <span>Priority Phone & Email Support</span>
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
                        <h2 className="text-3xl tracking-tight mb-12 text-center font-bricolage font-light text-slate-900">Frequently asked questions</h2>
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

                <a href="https://wa.me/2349064233805" target="_blank" rel="noopener noreferrer" className="whatsapp-button" aria-label="Contact us on WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.955 8.955 0 0 1-1.72-5.272c0-4.955 4.04-8.995 8.997-8.995S25.2 10.845 25.2 15.8c0 4.958-4.04 8.998-8.998 8.998zm0-19.798c-5.96 0-10.8 4.842-10.8 10.8 0 1.964.53 3.898 1.546 5.574L5 27.176l5.974-1.92a10.807 10.807 0 0 0 16.03-9.455c0-5.958-4.842-10.8-10.802-10.8z" fillRule="evenodd" fill="#ffffff"></path>
                    </svg>
                </a>

                <MarketingFooter />
            </div>
        </div>
    );
}

    