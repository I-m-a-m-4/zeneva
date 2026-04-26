
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Apple, 
  Zap, 
  ShieldCheck, 
  LayoutDashboard,
  CheckCircle2,
  Github,
  MonitorSmartphone,
  ChevronRight,
  ArrowRight,
  Bot,
  Command,
  ExternalLink,
  Laptop,
  Box,
  Cpu,
  HardDrive,
  Infinity,
  Sparkles,
  WifiOff,
  Globe,
  Settings,
  ShieldAlert,
  Activity,
  Layers,
  Touchpad,
  Printer,
  QrCode,
  Wifi,
  Cloud,
  Terminal,
  Server,
  Lock,
  Search,
  LineChart,
  ShoppingBag,
  Clock,
  Trash2,
  Package,
  ScanBarcode,
  Tag,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import CinemaHeader from '@/components/layout/cinema-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { InteractiveGrid } from '@/components/interactive-grid';
import { ThemeProvider } from '@/components/theme-provider';
import { AppConfig } from '@/lib/config';
import { cn } from "@/lib/utils";

const zenAiCapabilities = [
  {
    title: "Revenue Opportunities",
    description: "Predicts what will sell, when, and how much. Identifies best-selling SKUs by time and day.",
    icon: LineChart
  },
  {
    title: "Smart Merchandising",
    description: "The best merchandiser that would increase impulse buying by showing optimal product placement.",
    icon: ShoppingBag
  },
  {
    title: "Market Opportunities",
    description: "Shows the business owner new untapped market opportunities and flags cash trapped in inventory.",
    icon: Search
  },
  {
    title: "Food & Perishables",
    description: "“Vegetable waste is up 10%. Reduce order quantity for next shipment.”",
    icon: Trash2
  },
  {
    title: "Fashion & Retail",
    description: "“Blue denim sales spike 40% on pay-day weekends. Stock 15 extra units to capture demand.”",
    icon: Package
  }
];

export default function DownloadPage() {
  const version = AppConfig.version || "1.7.0";
  const [mounted, setMounted] = useState(false);
  const androidMockups = [
    { src: "/zeneva_android_dashboard_mockup.png", label: "Dashboard" },
    { src: "/zeneva_android_inventory_mockup.png", label: "Inventory" },
    { src: "/zeneva_android_pos_mockup.png", label: "Checkout" },
    { src: "/zeneva_android_report_mockup.png", label: "Analytics" },
    { src: "/zeneva_android_storefront_mockup.png", label: "Storefront" },
    { src: "/zeneva_android_toubleshoot_mockup.png", label: "Support" }
  ];
  const [activeMockup, setActiveMockup] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMockup((prev) => (prev + 1) % androidMockups.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const [placeholder, setPlaceholder] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const phrases = ["Enter your work email", "Start your free trial", "Unlock Zen AI insights", "Join 30+ smart retailers"];

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
        setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timeout = setTimeout(() => {
      const currentPhrase = phrases[phraseIndex];
      if (!isDeleting && charIndex < currentPhrase.length) {
        setPlaceholder(currentPhrase.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      } else if (isDeleting && charIndex > 0) {
        setPlaceholder(currentPhrase.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
      } else if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setCharIndex(0);
      }
    }, isDeleting ? 40 : 80);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, mounted]);

  const latestReleaseUrl = "https://github.com/I-m-a-m-4/zeneva/releases";
  const windowsDownloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64_en-US.msi`;
  const macDownloadUrlIntel = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64.dmg`;
  const macDownloadUrlSilicon = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_aarch64.dmg`;

  const scrollToDownloads = () => {
    document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!mounted) return null;

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen selection:bg-slate-900 selection:text-white bg-[#fff] relative font-dm-sans">
        {/* Background Grid System */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}>
        </div>
        
        <div className="relative z-10 w-full overflow-x-hidden">
          <CinemaHeader />

          <main className="min-h-screen">
            
            {/* Cinema Hero Section with Video Background */}
            <section className="relative h-screen min-h-[700px] w-full overflow-hidden flex flex-col justify-end pb-20 px-6 sm:px-12 border-b-4 border-slate-950">
                {/* Video Background Layer */}
                <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                    <div className="absolute inset-0 z-10 bg-black/20" />
                    <iframe
                        key={isMobile ? "mobile-video" : "desktop-video"}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] min-w-[100vw] min-h-[56.25vw] pointer-events-none"
                        src={`https://www.youtube.com/embed/${isMobile ? 'NP1QKaHch3U' : '0Iq3NYGmKE4'}?autoplay=1&mute=1&loop=1&playlist=${isMobile ? 'NP1QKaHch3U' : '0Iq3NYGmKE4'}&controls=0&rel=0&playsinline=1&enablejsapi=1`}
                        title="Zeneva Product Experience"
                        allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture"
                        frameBorder="0"
                    />
                </div>

                <div className="max-w-[1400px] mx-auto w-full relative z-20 flex flex-col md:flex-row items-end justify-between gap-12">
                    {/* Primary Institutional Brand Mark (Bottom Left) */}
                    <div className="max-w-3xl transform -translate-y-4">
                        <motion.h1 
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-2xl md:text-5xl font-medium tracking-tighter text-white leading-tight font-display"
                        >
                            Never Lose Sale,<br />
                            Never Waste Stock
                        </motion.h1>

                    </div>

                    {/* Tactical Tactical Intelligence Card (Bottom Right) */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            onClick={scrollToDownloads}
                            className="hidden lg:flex items-center bg-white p-2 rounded-[24px] overflow-hidden max-w-xl group cursor-pointer border border-slate-100"
                        >
                            <div className="w-48 h-32 relative overflow-hidden rounded-[18px] bg-slate-100 flex-shrink-0">
                                <Image 
                                    src="/zeneva_android_pos_mockup.png" 
                                    alt="Zeneva Hardware Preview" 
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <div className="px-6 flex flex-col justify-center flex-grow py-1">
                                <div className="space-y-1">
                                    <h4 className="text-slate-950 font-medium text-xl tracking-tighter font-display leading-none">Cross-Platform Sync</h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-tight max-w-[180px]">Windows, Mac, and Android with instant cloud synchronization.</p>
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-all duration-300">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                </div>

                {/* Corner Decorative Element */}
                <div className="absolute top-0 right-0 p-12 hidden md:block">
                    <div className="w-px h-24 bg-white/20 absolute top-0 right-12" />
                    <div className="w-24 h-px bg-white/20 absolute top-12 right-0" />
                </div>
            </section>

            {/* Quick Download Anchor */}
            <div id="downloads" className="scroll-mt-24"></div>

            {/* Platform Download Grid */}
            <section className="px-6 py-24 bg-white">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-dashed border-slate-200">
                  
                  {/* Windows Card */}
                  <div className="p-12 border-b md:border-b-0 md:border-r-2 border-dashed border-slate-200 group hover:bg-slate-50/50 transition-all rounded-l-lg">
                    <div className="w-14 h-14 bg-white border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center mb-8 shadow-sm group-hover:border-primary/50 transition-colors">
                      <Monitor className="w-6 h-6 text-slate-950" />
                    </div>
                    <h3 className="text-3xl font-medium tracking-tighter text-slate-950 mb-4 uppercase font-display px-0">Windows</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10 h-12">
                      Flagship desktop engine. Optimized for multi-monitor setups and industrial thermal printers.
                    </p>
                    <div className="space-y-4">
                        <Button className="w-full h-14 bg-slate-950 text-white hover:bg-slate-800 rounded-lg font-medium gap-2 text-[11px] uppercase tracking-[0.2em] font-display shadow-lg shadow-black/10" asChild>
                            <a href={windowsDownloadUrl}><Download className="w-4 h-4" /> Download MSIX</a>
                        </Button>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center font-dm-sans">Version {version} • 64-bit</p>
                    </div>
                  </div>

                  {/* macOS Card */}
                  <div className="p-12 border-b md:border-b-0 md:border-r-2 border-dashed border-slate-200 group hover:bg-slate-50/50 transition-all">
                    <div className="w-14 h-14 bg-white border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center mb-8 shadow-sm group-hover:border-primary/50 transition-colors">
                      <Apple className="w-6 h-6 text-slate-950" />
                    </div>
                    <h3 className="text-3xl font-medium tracking-tighter text-slate-950 mb-4 uppercase font-display px-0">macOS</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10 h-12">
                      Elite retail performance. Born for Apple Silicon with full Retina display acceleration.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-14 border-2 border-dashed border-slate-200 hover:border-primary rounded-lg font-medium text-[10px] uppercase tracking-widest font-display transition-all" asChild>
                        <a href={macDownloadUrlSilicon}>Silicon</a>
                      </Button>
                      <Button variant="outline" className="h-14 border-2 border-dashed border-slate-200 hover:border-primary rounded-lg font-medium text-[10px] uppercase tracking-widest font-display transition-all" asChild>
                        <a href={macDownloadUrlIntel}>Intel</a>
                      </Button>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-4 text-center font-dm-sans">Notarized & Signed</p>
                  </div>

                  {/* Android Card */}
                  <div className="p-12 group hover:bg-slate-50/50 transition-all rounded-r-lg">
                    <div className="w-14 h-14 bg-white border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center mb-8 shadow-sm group-hover:border-primary/50 transition-colors">
                      <Smartphone className="w-6 h-6 text-slate-950" />
                    </div>
                    <h3 className="text-3xl font-medium tracking-tighter text-slate-950 mb-4 uppercase font-display px-0">Android</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10 h-12">
                      Tactical mobile kit. Direct APK installation for smartphones and portable POS terminals.
                    </p>
                    <div className="space-y-4">
                        <Button className="w-full h-14 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium gap-2 text-[11px] uppercase tracking-[0.2em] font-display shadow-lg shadow-orange-600/10" asChild>
                            <Link href={latestReleaseUrl}><Download className="w-4 h-4" /> Download APK</Link>
                        </Button>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center font-dm-sans">GSM Optimized • v{version}</p>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* ANDROID SHOWCASE: Showcase how Zeneva looks on Android */}
            <section className="py-24 px-6 bg-slate-50 overflow-hidden border-b border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-10">
                            <div className="inline-flex items-center gap-3">
                                <div className="w-12 h-px bg-orange-600"></div>
                                <span className="font-bold uppercase tracking-[0.3em] text-[10px] text-orange-600 font-dm-sans">Mobile Command</span>
                            </div>
                            
                            <div className="p-8 md:p-12 bg-white border-2 border-dashed border-slate-200 rounded-xl shadow-sm relative group overflow-hidden">
                                <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-300"></div>
                                <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-300"></div>
                                
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-950 leading-[0.95] font-display mb-8">
                                    Android for the <br />
                                    <span className="text-orange-600 italic">Active Manager.</span>
                                </h2>
                                
                                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 font-dm-sans">
                                    Zeneva on Android isn't just a companion app—it's the full engine in your pocket. Manage inventory while walking the aisles, ring up customers in line, and track sales metrics from anywhere.
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-slate-950">
                                            <div className="p-2 bg-orange-50 rounded-lg">
                                                <QrCode className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <span className="font-bold uppercase tracking-widest text-[10px] font-dm-sans">Instant Scanning</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Turn your phone's camera into a high-speed laser reader.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-slate-950">
                                            <div className="p-2 bg-slate-50 rounded-lg">
                                                <Wifi className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <span className="font-bold uppercase tracking-widest text-[10px] font-dm-sans">Low-Bandwidth DNA</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Engineered to sync over 3G/4G with zero data waste.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group flex flex-col items-center">
                            <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 group-hover:bg-primary/10 transition-colors duration-700"></div>
                            
                            <div className="relative z-10 w-full max-w-[320px] h-[640px] flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeMockup}
                                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="w-full h-full relative"
                                    >
                                        <Image 
                                            src={androidMockups[activeMockup].src} 
                                            alt={androidMockups[activeMockup].label} 
                                            fill
                                            className="object-contain drop-shadow-2xl"
                                            priority
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Slider Navigation Dots */}
                            <div className="flex gap-2 mt-8 z-20">
                                {androidMockups.map((_, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setActiveMockup(i)}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            activeMockup === i ? "w-8 bg-orange-600" : "bg-slate-200 hover:bg-slate-300"
                                        )}
                                    />
                                ))}
                            </div>

                            {/* Floating Module Badge */}
                            <motion.div 
                                key={`badge-${activeMockup}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-6 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 z-30"
                            >
                                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-950">
                                    {androidMockups[activeMockup].label} Module
                                </span>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT ZEN AI ACTUALLY DOES */}
            <section className="py-32 px-6 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                            <Bot className="w-5 h-5" />
                            <span className="font-semibold uppercase tracking-[0.3em] text-[10px] font-dm-sans">Intelligence Layer</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-950 font-display">What Zen AI actually does:</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {zenAiCapabilities.map((cap, i) => (
                            <div key={i} className="group p-10 bg-white border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform shadow-lg shadow-orange-500/20">
                                    <cap.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-medium tracking-tighter text-slate-950 mb-4 uppercase font-display px-0">{cap.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    {cap.description}
                                </p>
                            </div>
                        ))}
                        
                        <div className="p-10 bg-slate-950 rounded-xl shadow-2xl shadow-slate-950/20 text-white relative overflow-hidden">
                             <div className="absolute inset-0 bg-primary/5 opacity-40"></div>
                             <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                                    <Activity className="w-6 h-6 text-orange-500" />
                                </div>
                                <h3 className="text-2xl font-medium tracking-tighter mb-4 uppercase font-display px-0">Real-time Diagnostics</h3>
                                <p className="text-slate-400 font-medium leading-relaxed italic text-lg">
                                    "Blue denim sales spike 40% on pay-day weekends. Stock 15 extra units to capture demand."
                                </p>
                                <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-500 font-dm-sans">Active Monitoring</span>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                                        <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                                        <div className="w-1 h-2 bg-orange-500 rounded-full"></div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW SHOWCASE 1: Desktop Mastery */}
            <section className="py-24 px-6 bg-slate-950 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-16 space-y-6">
                        <Badge className="bg-orange-600 text-white rounded-none px-6 py-2 font-semibold uppercase tracking-[0.4em] border-none shadow-lg font-dm-sans">Desktop Mastery</Badge>
                        <h2 className="text-5xl md:text-8xl font-medium tracking-tighter leading-[0.9] font-display">
                            The Heavyweight <br />
                            <span className="text-slate-500 italic">Workstation.</span>
                        </h2>
                    </div>
                    
                    <div className="relative group">
                        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-orange-600 to-transparent"></div>
                        <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-black/5 overflow-hidden transition-all duration-500 group-hover:scale-[1.01] border-2 border-dashed border-slate-200 relative">
                            <div className="absolute top-6 right-6 h-4 w-4 border-t-2 border-r-2 border-slate-300 z-10 opacity-50"></div>
                            <div className="absolute bottom-6 left-6 h-4 w-4 border-b-2 border-l-2 border-slate-300 z-10 opacity-50"></div>
                            <Image 
                                src="/zeneva_desktop_mastery_showcase.png" 
                                alt="Zeneva Desktop Interface" 
                                width={1200} 
                                height={800} 
                                className="w-full h-auto rounded-xl"
                            />
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-600/10 blur-3xl rounded-full -z-10"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 mt-20">
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold uppercase tracking-widest text-white font-display">Multi-Window Grid</h4>
                            <p className="text-slate-400 font-medium font-dm-sans">Spawn multiple operational kernels. Track sales on monitor A while managing inventory on monitor B.</p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold uppercase tracking-widest text-orange-500 font-display">Local-First Engine</h4>
                            <p className="text-slate-400 font-medium font-dm-sans">No browser lag. Direct CPU execution for sub-10ms UI response times across all modules.</p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold uppercase tracking-widest text-white font-display">Global Sync Bridge</h4>
                            <p className="text-slate-400 font-medium font-dm-sans">Seamless background synchronization. Work offline for days—sync in seconds when connectivity returns.</p>
                        </div>

                    </div>
                </div>
            </section>

            {/* NEW SHOWCASE 2: Hardware Protocol */}
            <section className="py-24 px-6 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-10">
                            <div className="inline-flex items-center gap-3">
                                <div className="w-3 h-3 bg-slate-950"></div>
                                <span className="font-semibold uppercase tracking-widest text-xs font-dm-sans">Peripheral Force</span>
                            </div>
                            <h2 className="text-4xl md:text-7xl font-medium tracking-tighter leading-[0.9] font-display">
                                Wired for <br />
                                <span className="text-slate-400">Retail Reality.</span>
                            </h2>
                            <p className="text-slate-600 font-medium text-lg leading-relaxed max-w-xl">
                                Retail isn't just software. It's hardware. Zeneva talks directly to your printers and scanners without mid-layer drivers that break during updates.
                            </p>
                            <div className="space-y-6 pt-4">
                                {[
                                    { icon: Printer, t: "Direct Thermal Printing", d: "High-speed printing for 58mm and 80mm rolls via USB or Network." },
                                    { icon: ScanBarcode, t: "Universal Scanning", d: "Wired and Bluetooth laser scanners supported with zero configuration." },
                                    { icon: Command, t: "Cash Drawer Relay", d: "Automatic drawer opening triggered by successful POS finalization." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-6 border-2 border-dashed border-slate-200 group hover:bg-slate-50 transition-colors">
                                        <item.icon className="w-6 h-6 text-slate-900 mt-1" />
                                        <div>
                                            <h5 className="font-medium uppercase text-sm tracking-widest mb-1 font-display transition-colors group-hover:text-orange-600">{item.t}</h5>
                                            <p className="text-xs text-slate-500 font-medium">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-dashed border-slate-200 overflow-hidden relative group">
                                <div className="absolute top-6 right-6 h-4 w-4 border-t-2 border-r-2 border-slate-300 z-10 opacity-50"></div>
                                <div className="absolute bottom-6 left-6 h-4 w-4 border-b-2 border-l-2 border-slate-300 z-10 opacity-50"></div>
                                <Image 
                                    src="/zeneva_hardware_protocol_showcase.png" 
                                    alt="Hardware Integration Showcase" 
                                    width={800} 
                                    height={600} 
                                    className="w-full h-auto rounded-xl transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW SHOWCASE 3: Tactical Mobility */}
            <section className="py-24 px-6 bg-orange-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, #fff 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                         <div className="order-2 lg:order-1 flex justify-center">
                              <div className="relative z-10 p-4 bg-slate-950 rounded-[3.5rem] shadow-2xl border-[6px] border-white/20 mx-auto max-w-[340px] transform -rotate-1 hover:rotate-0 transition-transform duration-700">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-950 rounded-b-[1.5rem] z-20 border-x border-b border-white/5"></div>
                                <div className="overflow-hidden rounded-[2.8rem] bg-white aspect-[9/19] relative">
                                    <Image 
                                        src="/zeneva_android_pos_mockup.png" 
                                        alt="Zeneva Android POS Mockup" 
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                                {/* Phone physical buttons decorative */}
                                <div className="absolute -left-[8px] top-24 w-1.5 h-16 bg-slate-800 rounded-l-md" />
                                <div className="absolute -right-[8px] top-32 w-1.5 h-20 bg-slate-800 rounded-r-md" />
                              </div>
                         </div>
                        <div className="order-1 lg:order-2 space-y-10">
                             <div className="w-20 h-2 bg-white"></div>
                             <h2 className="text-4xl md:text-8xl lg:text-9xl font-medium tracking-tighter text-white leading-[0.85] font-display">
                                Scan Every <br />
                                <span className="text-orange-200">Asset.</span>
                             </h2>
                             <p className="text-orange-50 font-medium text-xl leading-relaxed font-dm-sans">
                                Turn any Android device into a professional-grade scanning terminal. Audit your inventory in real-time by just pointing and shooting.
                             </p>

                             <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/10 border border-white/20 inline-block text-white">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-semibold uppercase tracking-widest text-sm text-white font-display">Offline First</h4>
                                    <p className="text-orange-100 font-medium text-xs font-dm-sans">Scan in the depths of your warehouse without a Wi-Fi signal. Sync later.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/10 border border-white/20 inline-block text-white">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-semibold uppercase tracking-widest text-sm text-white font-display">Instant Lookup</h4>
                                    <p className="text-orange-100 font-medium text-xs font-dm-sans">Real-time stock valuation and pricing info as soon as the barcode hits the sensor.</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW SHOWCASE 4: Multi-Store Logic */}
            <section className="py-24 px-6 bg-slate-50 border-b border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-950 uppercase font-display">Operational <br /> Harmony</h2>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">
                                One core logic, distributed everywhere. Zeneva maintains absolute data integrity whether you're running 1 location or 100.
                            </p>
                        </div>
                        <div className="flex gap-4 font-dm-sans">
                            <div className="px-6 py-3 bg-white border-2 border-slate-950 font-semibold text-xs uppercase tracking-widest">Active Locations: 34</div>
                            <div className="px-6 py-3 bg-orange-600 text-white font-semibold text-xs uppercase tracking-widest">Uptime: 99.98%</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { t: "Stock Parity", d: "Real-time updates across mobile and desktop. No stock discrepancies.", icon: Layers },
                            { t: "Price Uniformity", d: "Updated pricing in the dashboard reflects instantly on all mobile terminals.", icon: Tag },
                            { t: "Staff Telemetry", d: "Track who is selling what, where, and when from the central admin node.", icon: Users },
                            { t: "Secure Tunnel", d: "All cross-platform data is sent through encrypted AES-256 protocols.", icon: Lock }
                        ].map((item, i) => (
                            <div key={i} className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/50 transition-all shadow-sm group">
                                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/5 transition-colors">
                                    <item.icon className="w-6 h-6 text-slate-950" />
                                </div>
                                <h4 className="text-xl font-medium tracking-tight text-slate-950 font-display px-0 mb-2">{item.t}</h4>
                                <p className="text-sm text-slate-500 font-medium font-dm-sans">{item.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NEW SHOWCASE 5: The Interface Bridge */}
            <section className="py-24 px-6 bg-white overflow-hidden">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-medium tracking-tighter text-slate-950 uppercase mb-4 font-display">Tactical Intelligence Interface</h2>
                        <p className="text-slate-500 font-medium">Native apps designed for institutional precision.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="p-3 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 relative group">
                            <div className="absolute top-6 right-6 h-4 w-4 border-t-2 border-r-2 border-slate-300 z-10 opacity-50"></div>
                            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-inner">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent"></div>
                                <div className="z-10 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                                        <Monitor className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="block font-semibold uppercase tracking-widest text-[10px] text-white/70 font-dm-sans">Play Desktop Demo</span>
                                </div>
                            </div>
                        </div>
                         <div className="p-3 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 relative group">
                            <div className="absolute top-6 right-6 h-4 w-4 border-t-2 border-r-2 border-slate-300 z-10 opacity-50"></div>
                            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-inner">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 to-transparent"></div>
                                <div className="z-10 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                                        <Smartphone className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="block font-semibold uppercase tracking-widest text-[10px] text-white/70 font-dm-sans">Play Mobile Demo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DEEP DIVE: Windows & Mac Feature Stacks */}
            <section className="py-24 px-6 bg-slate-50 border-b border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-20">
                        <div className="space-y-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-1 bg-slate-950"></div>
                                <h4 className="text-lg font-medium uppercase tracking-widest text-slate-950 font-display">Windows Titan Engine</h4>
                            </div>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-950 mb-2 uppercase text-sm tracking-widest font-dm-sans text-orange-600">Driver Autonomy</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Direct hardware communication for serial and IP printers. No manual calibration required.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-950 mb-2 uppercase text-sm tracking-widest font-dm-sans text-orange-600">Multi-Instance Kernel</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Run the POS, Inventory, and Analytics dash in separate high-performance windows simultaneously.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-950 mb-2 uppercase text-sm tracking-widest font-dm-sans text-orange-600">Offline Database</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Local SQLite-based persistence ensures 100% checkout uptime during regional fiber cuts.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-1 bg-slate-400"></div>
                                <h4 className="text-lg font-medium uppercase tracking-widest text-slate-400 font-display">macOS Precision</h4>
                            </div>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-900 mb-2 uppercase text-sm tracking-widest font-dm-sans">ARM64 Optimization</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Native M-series binaries deliver instant launch times and extreme power efficiency.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-900 mb-2 uppercase text-sm tracking-widest font-dm-sans">Unified Memory</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Optimized to use Apple's unified memory architecture for lag-free data analysis.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="grow">
                                        <h5 className="font-semibold text-slate-900 mb-2 uppercase text-sm tracking-widest font-dm-sans">Retina Master</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">High-DPI optimized UI that remains tack-sharp on Studio Displays and ProMotion screens.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SOFTWARE INTEGRITY: Security and Trust */}
            <section id="integrity" className="py-24 px-6 bg-white overflow-hidden relative">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="order-2 lg:order-1 relative">
                             <div className="p-8 border-2 border-dashed border-slate-200 bg-slate-50 font-mono text-[11px] leading-relaxed relative">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                                    <Github className="w-4 h-4" />
                                    <span className="font-semibold uppercase tracking-widest font-dm-sans">Deployment_Pipeline.yaml</span>
                                </div>
                                 <div className="absolute top-4 right-4 flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                                 </div>
                                 <div className="space-y-1 font-mono text-[10px] md:text-xs">
                                    <div className="text-slate-500 font-medium">system_init --protocol=ZENEVA</div>
                                    <div className="text-emerald-500 font-medium">starting deployment sequence...</div>
                                    <div className="text-slate-400">checking local environment: OK</div>
                                    <div className="text-slate-400">optimizing build for: x64...</div>
                                    <div className="text-slate-400">compressing assets...</div>
                                    <div className="text-slate-400">running: sign binary with certificate-id: ZEN-2026-X</div>
                                    <div className="text-emerald-600 font-medium">success: Checksum generated (SHA-256)</div>
                                    <div className="text-orange-600 mt-4 font-medium">&gt;&gt; Deploying to Global Infrastructure...</div>
                                 </div>
                             </div>
                             <div className="absolute -bottom-6 -right-6 p-6 bg-slate-950 text-white border-2 border-white">
                                <Terminal className="w-6 h-6" />
                             </div>
                        </div>

                        <div className="order-1 lg:order-2 space-y-8">
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none px-4 py-1 font-semibold tracking-widest uppercase font-dm-sans">Verified Secure</Badge>
                            <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-950 font-display">Binaries you can <span className="text-emerald-600 italic">Trust.</span></h2>
                            <p className="text-slate-600 font-medium text-lg leading-relaxed">
                                Security is our baseline. Every line of code is audited through automated CI/CD pipelines. We notarize all macOS builds and sign Windows binaries to ensure a seamless, high-integrity installation experience.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button variant="outline" className="h-14 px-8 border-2 border-slate-200 rounded-none font-semibold text-xs uppercase tracking-widest gap-3 font-dm-sans" asChild>
                                    <a href="https://github.com/I-m-a-m-4/zeneva/security" target="_blank">
                                        View Security Policy 
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HARDWARE PROTOCOL: System Requirements Matrix */}
            <section className="py-24 px-6 bg-slate-950 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-600/5 -skew-x-12 transform translate-x-1/2"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-12">
                            <div className="space-y-6">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500 font-dm-sans">Hardware Protocol</h4>
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[0.95] font-display">
                                    Engineered for <br />
                                    <span className="text-slate-500 opacity-60">Global Hardening.</span>
                                </h2>
                                <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-xl">
                                    Zeneva is a low-resource beast. We've optimized the native kernel to run efficiently on everything from entry-level Android devices to workstation-grade machines.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <Monitor className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold uppercase tracking-widest text-sm mb-1 font-dm-sans">Stationary Ops</h5>
                                        <p className="text-sm text-slate-500">Recommended: 8GB RAM, SSD Storage, Barcode Laser.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <Smartphone className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold uppercase tracking-widest text-sm mb-1 font-dm-sans">Mobile Tactical</h5>
                                        <p className="text-sm text-slate-500">Recommended: Android 11+, 4GB RAM, Camera Flash Support.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-1 md:p-2 shadow-2xl relative">
                            <div className="absolute -top-4 -right-4 bg-orange-600 text-white font-semibold p-4 uppercase text-[10px] tracking-widest rotate-6 z-10 font-dm-sans">
                                v{version} Hardware Tested
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 relative z-0">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="pb-6 text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-dm-sans">Metric</th>
                                            <th className="pb-6 text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-dm-sans">Minimum</th>
                                            <th className="pb-6 text-[10px] font-semibold uppercase tracking-widest text-orange-500 font-dm-sans">Optimal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {[
                                            { m: "CPU Core", min: "2.0 GHz", opt: "8-Core ARM/x86" },
                                            { m: "System Memory", min: "2GB RAM", opt: "8GB+ RAM" },
                                            { m: "Disk Space", min: "100MB", opt: "500MB (Local DB)" },
                                            { m: "OS Environment", min: "Win 10 / Android 8", opt: "Win 11 / Android 13" },
                                            { m: "Network", min: "None (Offline)", opt: "Broadband (Sync)" }
                                        ].map((row, i) => (
                                            <tr key={i} className="group">
                                                <td className="py-6 text-xs font-semibold uppercase tracking-tight text-slate-400 font-dm-sans">{row.m}</td>
                                                <td className="py-6 text-sm font-medium">{row.min}</td>
                                                <td className="py-6 text-sm font-semibold text-orange-500 font-dm-sans">{row.opt}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DEPLOYMENT PROTOCOL: 3-step guide */}
            <section className="py-32 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-4 gap-12 items-center">
                         <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-4xl font-medium tracking-tighter text-slate-950 uppercase font-display">Deployment <br /> Protocol</h2>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed font-dm-sans">
                                Three steps to operational readiness. No complex configuration, just native power.
                            </p>
                         </div>

                         <div className="lg:col-span-3 grid md:grid-cols-3 gap-8">
                            {[
                                { n: "01", t: "Acquire Binary", d: "Select the specific architecture for your hardware to initiate the download." },
                                { n: "02", t: "Security Handshake", d: "Install and authenticate. Zeneva will sync your initial inventory baseline." },
                                { n: "03", t: "Operational Go", d: "Switch to offline mode if needed. Ring up your first sale in zero-latency." }
                            ].map((step, i) => (
                                <div key={i} className="p-8 border-2 border-dashed border-slate-200 group hover:border-slate-400 transition-all">
                                    <div className="text-5xl font-medium text-slate-100 group-hover:text-orange-500/20 transition-colors mb-6 font-display">{step.n}</div>
                                    <h4 className="text-xl font-medium text-slate-950 mb-3 uppercase tracking-tighter font-display">{step.t}</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed font-dm-sans">{step.d}</p>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-40 px-6 bg-slate-50 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center space-y-12">
                   <div className="w-24 h-24 bg-slate-950 flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 group hover:rotate-0 transition-transform">
                      <Download className="w-10 h-10 text-white" />
                   </div>
                   <h2 className="text-5xl md:text-8xl font-medium tracking-tighter text-slate-950 font-display">Scale Now.</h2>
                   <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto">
                      Join the thousands of retailers running on the Zeneva engine. Fast, reliable, and native.
                   </p>
                   
                   {/* Newsletter / Typewriting Input Section */}
                   <div className="max-w-md mx-auto w-full pt-8">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input 
                                type="email"
                                placeholder={placeholder || "Enter your work email"}
                                className="h-16 px-6 grow border-[4px] border-slate-950 rounded-none font-semibold text-sm uppercase tracking-widest focus:outline-none focus:bg-white bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-dm-sans"
                            />
                            <Button className="h-16 px-10 bg-orange-600 text-white rounded-none font-semibold text-xs uppercase tracking-widest hover:bg-orange-700 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-display">
                                Join Fleet
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em] mt-6 font-dm-sans">Free trial • No credit card required • v{version}</p>
                   </div>

                   <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                       <Button variant="ghost" asChild className="h-16 px-12 rounded-none font-semibold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all font-display">
                          <Link href="/contact">Talk to Enterprise</Link>
                       </Button>
                   </div>
                </div>
            </section>

            <MarketingFooter />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
