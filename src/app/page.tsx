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
    Users,
    UserCog,
    WifiOff,
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
import { AppConfig } from '@/lib/config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarqueeSection } from '@/components/marquee-section';
import { FeaturesFloatingSection } from '@/components/features-floating-section';
import { ThemeProvider } from '@/components/theme-provider';


const faqItems = [
    {
        question: "What kind of businesses can use Zeneva?",
        answer: "Zeneva is designed for a wide range of retail businesses, including fashion boutiques, electronics shops, cafes, skincare brands, and more. Its flexible inventory and sales tools can adapt to any environment where physical products are sold."
    },
    {
        question: "Does Zeneva work offline?",
        answer: "Yes! The Point of Sale (POS) is designed to be fully functional even without an internet connection. All sales made offline are saved securely on your device and will automatically sync with the cloud once you're back online."
    },
    {
        question: "How secure is my business data?",
        answer: "We take security very seriously. All your data is stored on secure cloud servers with enterprise-grade protection. We use industry-standard encryption for data in transit and at rest. Your business data is your property, and we will never share it with third parties."
    },
    {
        question: "Can I import my existing product data?",
        answer: "Absolutely. We provide an easy-to-use CSV import tool that can intelligently map your existing spreadsheet columns (e.g., from Shopify or WooCommerce) to Zeneva's fields, getting you set up in minutes."
    },
    {
        question: "What payment options are supported for online stores?",
        answer: "Your public storefront can accept payments via Paystack for credit/debit cards and mobile money. You can also enable a 'Bank Transfer' option, and your banking details will be displayed to the customer at checkout."
    }
];

const features = [
    {
        icon: ShoppingCart,
        title: "Blazing-Fast POS",
        description: "A modern Point of Sale system that's intuitive, fast, and works seamlessly even when you're offline. Every sale automatically updates your inventory in real-time.",
        bgColor: "bg-blue-100",
        iconColor: "text-blue-600"
    },
    {
        icon: Globe,
        title: "E-Commerce Storefront",
        description: "Launch a beautiful, customizable online store in minutes. Your products sync automatically, and you can accept payments online with Paystack integration.",
        bgColor: "bg-green-100",
        iconColor: "text-green-600"
    },
    {
        icon: Bot,
        title: "AI-Powered Insights",
        description: "Go beyond simple reports. Zen AI acts as a sentinel for your business, identifying your most valuable products, customers, and at-risk stock.",
        bgColor: "bg-purple-100",
        iconColor: "text-purple-600"
    },
    {
        icon: Users,
        title: "Integrated CRM",
        description: "Build lasting relationships. Every sale is linked to a customer profile, building a rich purchase history to power your loyalty programs and personalized marketing.",
        bgColor: "bg-pink-100",
        iconColor: "text-pink-600"
    },
    {
        icon: BarChart2,
        title: "Advanced Reporting",
        description: "Deep-dive into your business performance with detailed reports on sales, profit & loss, top products, and customer behavior, all filterable by date.",
        bgColor: "bg-sky-100",
        iconColor: "text-sky-600"
    },
    {
        icon: UserCog,
        title: "User & Role Management",
        description: "Securely manage your team by inviting staff and assigning roles like 'Admin', 'Manager', or 'Vendor Operator', each with specific, pre-set permissions.",
        bgColor: "bg-yellow-100",
        iconColor: "text-yellow-600"
    },
    {
        icon: WifiOff,
        title: "Robust Offline Mode",
        description: "Never miss a sale. The Zeneva POS is built to work perfectly offline, saving all transactions locally and syncing them automatically when you reconnect.",
        bgColor: "bg-gray-200",
        iconColor: "text-gray-700"
    },
    {
        icon: Download,
        title: "Bulk Data Tools",
        description: "Migrate your existing inventory effortlessly with our smart CSV importer. Export your product, sales, or customer data at any time for external analysis.",
        bgColor: "bg-teal-100",
        iconColor: "text-teal-600"
    },
    {
        icon: ShieldCheck,
        title: "Security & Audit Log",
        description: "Enhance security with a detailed, chronological record of all critical events, from voided sales to product updates, complete with automated issue scanning.",
        bgColor: "bg-red-100",
        iconColor: "text-red-600"
    }
];


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
            "@id": "https://www.zeneva.vercel.app"
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
        <ThemeProvider forcedTheme="light">
            <div className="antialiased overflow-x-hidden text-slate-900 bg-[#F9F8F6] relative">
                <div className="fixed grid-lines w-full h-screen top-0 right-0 left-0 pointer-events-none z-0"></div>
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
                                <h1 className="leading-[0.95] lg:text-5xl xl:text-6xl text-4xl font-medium text-foreground tracking-tighter font-display mb-8">
                                    The AI-Powered Commerce<br />
                                    Platform for <span className="text-muted-foreground/80 relative inline-block">Growth.
                                        <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4"></path></svg>
                                    </span>
                                </h1>

                                <p className="leading-relaxed text-lg tracking-tight font-dm-sans max-w-lg mb-10 text-slate-900">
                                    Zeneva is the AI-powered operating system for modern commerce. Go beyond simple tracking with predictive insights, guided workflows, and a customizable storefront to maximize profit and eliminate stockouts.
                                </p>

                                <div className="flex sm:flex-row w-full gap-x-2 gap-y-4">
                                    <Input
                                        type="email"
                                        placeholder="Enter your work email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="
            !h-18
            !min-h-[4.7rem]
            !py-3
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

                    <MarqueeSection />

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

                    <section id="features" className="py-24 px-6 bg-white border-t border-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 z-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, hsl(var(--border)) 1px, transparent 0%)', backgroundSize: '50px 50px' }}></div>
                        <div className="max-w-7xl mx-auto relative z-10">
                            <div className="text-center max-w-2xl mx-auto mb-16">
                                <h2 className="text-4xl font-light text-slate-900 tracking-tight font-bricolage mb-4">
                                    Everything You Need to Grow
                                </h2>
                                <p className="text-lg text-slate-500 tracking-tight font-dm-sans">
                                    Zeneva is an all-in-one platform. From point-of-sale to a public storefront, we provide the tools to run your business efficiently.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {[
                                    {
                                        icon: ShoppingCart,
                                        title: "Blazing-Fast POS",
                                        description: "A modern Point of Sale system that's intuitive, fast, and works seamlessly even when you're offline.",
                                        bgColor: "bg-blue-100",
                                        iconColor: "text-blue-600",
                                        hoverBg: "bg-[#EFF6FF]" // Light Blue
                                    },
                                    {
                                        icon: Globe,
                                        title: "E-Commerce Storefront",
                                        description: "Launch a beautiful, customizable online store in minutes. Your products sync automatically.",
                                        bgColor: "bg-green-100",
                                        iconColor: "text-green-600",
                                        hoverBg: "bg-[#FFF1F2]" // Light Pink
                                    },
                                    {
                                        icon: Bot,
                                        title: "AI-Powered Insights",
                                        description: "Go beyond simple reports. Zen AI acts as a sentinel for your business, identifying your most valuable products.",
                                        bgColor: "bg-purple-100",
                                        iconColor: "text-purple-600",
                                        hoverBg: "bg-[#FAFAF9]" // Light Stone/White
                                    },
                                    {
                                        icon: Users,
                                        title: "Integrated CRM",
                                        description: "Build lasting relationships. Every sale is linked to a customer profile to power your loyalty programs.",
                                        bgColor: "bg-pink-100",
                                        iconColor: "text-pink-600",
                                        hoverBg: "bg-[#FFFBEB]" // Light Cream/Yellow
                                    },
                                    {
                                        icon: BarChart2,
                                        title: "Advanced Reporting",
                                        description: "Deep-dive into your business performance with detailed reports on sales, profit & loss, and top products.",
                                        bgColor: "bg-sky-100",
                                        iconColor: "text-sky-600",
                                        hoverBg: "bg-[#EFF6FF]" // Light Blue
                                    },
                                    {
                                        icon: UserCog,
                                        title: "User & Role Management",
                                        description: "Securely manage your team by inviting staff and assigning roles with specific permissions.",
                                        bgColor: "bg-yellow-100",
                                        iconColor: "text-yellow-600",
                                        hoverBg: "bg-[#FFF1F2]" // Light Pink
                                    },
                                    {
                                        icon: WifiOff,
                                        title: "Robust Offline Mode",
                                        description: "Never miss a sale. The Zeneva POS is built to work perfectly offline, saving all transactions locally.",
                                        bgColor: "bg-gray-200",
                                        iconColor: "text-gray-700",
                                        hoverBg: "bg-[#FFFBEB]" // Light Cream/Yellow
                                    },
                                    {
                                        icon: Download,
                                        title: "Bulk Data Tools",
                                        description: "Migrate your existing inventory effortlessly with our smart CSV importer. Export your data at any time.",
                                        bgColor: "bg-teal-100",
                                        iconColor: "text-teal-600",
                                        hoverBg: "bg-[#EFF6FF]" // Light Blue
                                    },
                                    {
                                        icon: ShieldCheck,
                                        title: "Security & Audit Log",
                                        description: "Enhance security with a detailed record of all critical events, complete with automated issue scanning.",
                                        bgColor: "bg-red-100",
                                        iconColor: "text-red-600",
                                        hoverBg: "bg-[#FAFAF9]" // Light Stone/White
                                    }
                                ].map((feature, index) => (
                                    <div key={index} className="group relative p-8 bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-2xl overflow-hidden transition-all duration-300 isolate cursor-pointer">
                                        {/* Slide-in Background Animation */}
                                        <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-500 ease-out ${feature.hoverBg} -z-10`}></div>

                                        <div className={`w-12 h-12 ${feature.bgColor} ${feature.iconColor} rounded-xl flex items-center justify-center mb-6 relative z-10 transition-colors duration-300 group-hover:bg-white/80`}>
                                            <feature.icon width="24" height="24" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 mb-2 relative z-10">{feature.title}</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed relative z-10 group-hover:text-slate-700 transition-colors">{feature.description}</p>

                                        {/* Always visible corner accents */}
                                        <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-300 z-10"></div>
                                        <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-300 z-10"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="how-it-works" className="py-24 px-6 bg-white border-t border-slate-100 relative overflow-hidden bg-noise">
                        <div className="absolute inset-0 z-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, hsl(var(--border)) 1px, transparent 0%)', backgroundSize: '50px 50px' }}></div>
                        <div className="aura-background"></div>
                        <div className="sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
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
                                            <svg width="40" height="40" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="thickBlueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" style={{ stopColor: '#1e293b;stop-opacity:1' }} />
                                                        <stop offset="100%" style={{ stopColor: '#0f172a;stop-opacity:1' }} /> </linearGradient>

                                                    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                                                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                                                        <feOffset dx="0" dy="2" result="offsetblur" />
                                                        <feComponentTransfer>
                                                            <feFuncA type="linear" slope="0.3" />
                                                        </feComponentTransfer>
                                                        <feMerge>
                                                            <feMergeNode />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>

                                                <g filter="url(#dropShadow)">
                                                    <path d="M 100 55
                                                            A 35 35 0 1 0 100 125
                                                            A 35 35 0 1 0 100 55
                                                            Z
                                                            M 100 63
                                                            A 27 27 0 1 1 100 117
                                                            A 27 27 0 1 1 100 63
                                                            Z"
                                                        fill="url(#thickBlueGradient)"
                                                        stroke="#1e293b"
                                                        strokeWidth="0.5" />

                                                    <path d="M 60 127
                                                            Q 100 154 140 127
                                                            Q 100 142 60 127
                                                            Z"
                                                        fill="url(#thickBlueGradient)"
                                                        stroke="#1e293b"
                                                        strokeWidth="0.5" />
                                                </g>
                                            </svg>
                                            <span className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto mt-12 max-w-4xl">
                                <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-slate-600">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100/80 cursor-pointer">
                                        <BrainCircuit className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-xs">Smart Forecasting</span>
                                    </div>
                                    <div className="hidden sm:block w-16 h-px border-t border-dashed border-slate-200"></div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100/80 cursor-pointer">
                                        <Bot className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-xs">Actionable Insights</span>
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

                    <FeaturesFloatingSection />

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
                                                    <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Intelligent Analysis</h4>
                                                    <p className="text-sm text-stone-700 mt-2">Zen AI analyzes your sales, troubleshoots your products, and provides actionable insights. We turn your data into your competitive advantage.</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-light text-stone-900 tracking-tight font-bricolage">Actionable Insights</h4>
                                                    <p className="mt-2 text-sm text-neutral-400">Don't just see a problem. Zen AI suggests concrete next steps, like running a clearance sale on slow-moving stock to free up your capital.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                </div>

                                <div className="px-6">
                                    <div className="tech-content" id="technology">
                                        <h3 className="sm:text-5xl transition-colors duration-500 text-4xl font-light text-slate-900 tracking-tight font-bricolage">
                                            Built for Scale, Designed for Humans
                                        </h3>
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
                                                            <h5 className="text-base font-medium tracking-tight font-dm-sans text-slate-900">Intelligent Analysis</h5>
                                                            <p className="text-base tracking-tight font-dm-sans mt-1 text-slate-600">AI-enhanced sales forecasting and inventory analysis provide clear, actionable insights to guide your business decisions.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t mt-8 pt-6 border-neutral-200">
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer">
                                                <div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="rating-number text-2xl tracking-tight font-bricolage font-light text-slate-900">5M+</span>
                                                    </div>
                                                    <p className="text-base tracking-tight text-slate-600">Data Points Analyzed Daily</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer">
                                                <div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="rating-number text-2xl tracking-tight font-bricolage font-light text-slate-900">1,200+</span>
                                                    </div>
                                                    <p className="text-base tracking-tight font-dm-sans text-slate-600">Businesses Powered</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="faq" className="py-24 px-6 border-t bg-white border-slate-100">
                        <div className="max-w-3xl mr-auto ml-auto">
                            <h2 className="text-3xl tracking-tight mb-12 text-center font-bricolage font-light text-slate-900">Frequently asked questions</h2>
                            <Accordion type="multiple" className="w-full">
                                {faqItems.map((item, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger className="text-lg text-left">{item.question}</AccordionTrigger>
                                        <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                            <div className="text-center mt-12">
                                <p className="mb-4 font-dm-sans tracking-tight text-neutral-600">Still have questions?</p>
                                <Button asChild>
                                    <a href="#contact">Contact Us</a>
                                </Button>
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
        </ThemeProvider>
    );
}
