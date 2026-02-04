
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
    Printer,
    ScanBarcode,
    Monitor,
    BarChart3,
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
        icon: BarChart3,
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
        description: "Enhance security with a detailed, chronological record of all critical events, complete with automated issue scanning.",
        bgColor: "bg-red-100",
        iconColor: "text-red-600"
    }
];


export default function Home() {
    const [email, setEmail] = useState('');
    const { toast } = useToast();
    const form = useRef<HTMLFormElement>(null);
    const [isSending, setIsSending] = useState(false);

    // Carousel State
    const [activeSlide, setActiveSlide] = useState(0);
    const slides = [
        { src: "/herolytics.svg", alt: "Zeneva Dashboard View", label: "Dashboard" },
        { src: "/poslytics.svg", alt: "Zeneva POS View", label: "POS Page" },
        { src: "/inventory.svg", alt: "Zeneva Inventory View", label: "Inventory Page" },
        { src: "/loglytics.svg", alt: "Audit Log", label: "Audit Log " },
        { src: "/storelytics.svg", alt: "Storefront Page", label: "Storefront" },
        { src: "/reportlytics.svg", alt: "Reports Page", label: "Advanced Report " }
    ];

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

                    {/* Dashboard Preview Section - Carousel */}
                    <section className="relative w-full max-w-7xl mx-auto px-6 pb-24 mt-12 z-20">
                        <div className="flex flex-col items-center">
                            <div className="relative w-full rounded-xl overflow-hidden  ">
                                <div className="relative aspect-[16/10] w-full bg-slate-50">
                                    {slides.map((slide, index) => (
                                        <div
                                            key={index}
                                            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                        >
                                            <Image
                                                src={slide.src}
                                                alt={slide.alt}
                                                width={1400}
                                                height={900}
                                                className="w-full h-full object-contain"
                                                priority={index === 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-8 mt-8">
                                {slides.map((slide, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveSlide(index)}
                                        className={`pb-2 text-sm font-medium transition-all duration-300 relative group ${index === activeSlide
                                                ? 'text-primary'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {slide.label}
                                        <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform duration-300 origin-left ${index === activeSlide ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                                            }`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

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
                                    },
                                    {
                                        icon: Package,
                                        title: "Inventory Management",
                                        description: "Effortlessly track stock levels, manage variants, and receive low-stock alerts to ensure you never run out of your best-selling products.",
                                        bgColor: "bg-orange-100",
                                        iconColor: "text-orange-600",
                                        hoverBg: "bg-[#FFF7ED]" // Light Orange
                                    },
                                    {
                                        icon: ScanBarcode,
                                        title: "Barcode Scanning",
                                        description: "Speed up your checkout process significantly. Zeneva supports all standard barcode scanners for instant product lookup.",
                                        bgColor: "bg-indigo-100",
                                        iconColor: "text-indigo-600",
                                        hoverBg: "bg-[#EEF2FF]" // Light Indigo
                                    },
                                    {
                                        icon: Printer,
                                        title: "Receipt Printing",
                                        description: "Provide professional, branded receipts for every transaction. Compatible with most thermal receipt printers.",
                                        bgColor: "bg-amber-100",
                                        iconColor: "text-amber-600",
                                        hoverBg: "bg-[#FFFBEB]" // Light Amber
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
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                            <Monitor className="text-neutral-600 group-hover:text-primary transition-colors h-6 w-6" />
                                        </span>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase transition-opacity">POS</span>
                                    </div>
                                    <div className="group relative cursor-pointer">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                            <Package className="text-neutral-600 group-hover:text-primary transition-colors h-6 w-6" />
                                        </span>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase transition-opacity">Inventory</span>
                                    </div>
                                    <div className="group relative cursor-pointer">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                            <Globe className="text-neutral-600 group-hover:text-primary transition-colors h-6 w-6" />
                                        </span>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase transition-opacity">Storefront</span>
                                    </div>
                                    <div className="group relative cursor-pointer">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                            <Users className="text-neutral-600 group-hover:text-primary transition-colors h-6 w-6" />
                                        </span>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase transition-opacity">CRM</span>
                                    </div>
                                    <div className="group relative cursor-pointer">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 shadow-lg group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                                            <BarChart3 className="text-neutral-600 group-hover:text-primary transition-colors h-6 w-6" />
                                        </span>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase transition-opacity">Analytics</span>
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
                                        <path d="M450 300 L 450 30" stroke="url(#line-gradient-light)" strokeWidth="1" strokeLinecap="round" fill="none">
                                            <animate attributeName="stroke-dasharray" values="270" dur="0.1s" fill="freeze" />
                                            <animate attributeName="stroke-dashoffset" values="270;0;270" dur="4s" begin="0.8s" repeatCount="indefinite" />
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
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold tracking-wide text-slate-900 whitespace-nowrap">Zen AI</span>
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

                    {/* Pricing Section */}
                    <section id="pricing" className="py-24 px-6 bg-[#F9F8F6] border-t border-slate-100">
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center max-w-2xl mx-auto mb-16">
                                <h2 className="text-4xl font-light text-slate-900 tracking-tight font-bricolage mb-4">
                                    Choose the Perfect Plan for Your Business
                                </h2>
                                <p className="text-lg text-slate-500 tracking-tight font-dm-sans">
                                    Start for free, and scale as you grow. All plans come with a 30-day free trial of our premium features. No credit card required.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Starter Plan */}
                                <div className="relative flex flex-col p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                    <h3 className="text-lg font-semibold leading-5">Starter</h3>
                                    <p className="mt-4 text-slate-500 text-sm">For new businesses getting started with inventory management.</p>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold tracking-tight">Free</span>
                                    </div>
                                    <ul className="mt-6 space-y-4 text-sm">
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Up to 500 products</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> 2 Staff Accounts</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Standard POS</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Basic Analytics</li>
                                    </ul>
                                    <div className="mt-auto pt-6">
                                        <Button asChild size="lg" className="w-full">
                                            <Link href="/signup">Get Started for Free</Link>
                                        </Button>
                                    </div>
                                </div>
                                {/* Pro Plan */}
                                <div className="relative flex flex-col p-8 bg-white border-2 border-primary rounded-2xl shadow-2xl shadow-primary/10">
                                    <p className="absolute top-0 -translate-y-1/2 bg-primary text-white px-3 py-1 text-sm font-semibold tracking-wide rounded-full">Most Popular</p>
                                    <h3 className="text-lg font-semibold leading-5">Pro</h3>
                                    <p className="mt-4 text-slate-500 text-sm">For growing businesses that need advanced tools and an online presence.</p>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold tracking-tight">₦10,000</span>
                                        <span className="text-base font-medium text-slate-500">/mo</span>
                                    </div>
                                    <ul className="mt-6 space-y-4 text-sm">
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Up to 1,500 products</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> 10 Staff Accounts</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Customizable E-Commerce Storefront</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Advanced Reports & Analytics</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> AI Product Troubleshooter</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Audit Log</li>
                                    </ul>
                                    <div className="mt-auto pt-6">
                                        <Button asChild size="lg" className="w-full">
                                            <Link href="/signup">Start Your Pro Trial</Link>
                                        </Button>
                                    </div>
                                </div>
                                {/* Business Plan */}
                                <div className="relative flex flex-col p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                    <h3 className="text-lg font-semibold leading-5">Business</h3>
                                    <p className="mt-4 text-slate-500 text-sm">For established businesses that require our most powerful AI tools and support.</p>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold tracking-tight">₦30,000</span>
                                        <span className="text-base font-medium text-slate-500">/mo</span>
                                    </div>
                                    <ul className="mt-6 space-y-4 text-sm">
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Unlimited products & users</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> All features in Pro</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> AI Business Performance Dashboard</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Advanced Customer Intelligence</li>
                                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Priority Phone & Email Support</li>
                                    </ul>
                                    <div className="mt-auto pt-6">
                                        <Button asChild size="lg" className="w-full">
                                            <Link href="/signup">Start Your Business Trial</Link>
                                        </Button>
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
                </div >
            </div >
        </ThemeProvider >
    );
}
