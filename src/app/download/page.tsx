
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Apple, 
  Cpu, 
  Globe, 
  ChevronRight, 
  CheckCircle2, 
  Cloud, 
  Zap, 
  Shield, 
  History, 
  Clock, 
  BarChart3, 
  ScanBarcode,
  Printer,
  Bot,
  TrendingUp,
  HelpCircle,
  ChevronLeft,
  MonitorSmartphone,
  ShieldCheck,
  ArrowRight,
  Database,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  FileText,
  Search as SearchIcon,
  MessageSquare,
  Layout,
  CreditCard,
  History as AuditIcon,
  LayoutDashboard,
  Lock,
  Store,
  Heart,
  LayoutGrid,
  Wallet,
  Bell,
  PieChart,
  Banknote,
  ShieldAlert,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppConfig } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { InteractiveGrid } from '@/components/interactive-grid';
import { ThemeProvider } from '@/components/theme-provider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const features = [
  {
    icon: Zap,
    title: "Offline Intelligence",
    description: "Full POS and inventory capabilities even when the internet goes out. Data syncs automatically once back online.",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
    hoverBg: "bg-[#EFF6FF]"
  },
  {
    icon: Cloud,
    title: "Real-time Synchronization",
    description: "Instant cloud backup and multi-device sync. Manage your business from your phone while your staff uses the desktop app.",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
    hoverBg: "bg-[#FFF1F2]"
  },
  {
    icon: LayoutDashboard,
    title: "Premium Experience",
    description: "A desktop-native interface designed for speed, stability, and zero-latency business operations.",
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
    hoverBg: "bg-[#FAFAF9]"
  },
  {
    icon: ShieldCheck,
    title: "Military-Grade Security",
    description: "Hardware-tethered sessions and encrypted local storage ensure your data remains your own.",
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
    hoverBg: "bg-[#FFFBEB]"
  }
];



export default function DownloadPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const version = AppConfig.version || "0.5.8";
  
  const slides = [
    { src: "/herolytics.svg", alt: "Zeneva Dashboard View", label: "Dashboard" },
    { src: "/poslytics.svg", alt: "Zeneva POS View", label: "POS Page" },
    { src: "/inventory.svg", alt: "Zeneva Inventory View", label: "Inventory Page" },
    { src: "/loglytics.svg", alt: "Audit Log", label: "Audit Log " },
    { src: "/storelytics.svg", alt: "Storefront Page", label: "Storefront" },
    { src: "/reportlytics.svg", alt: "Reports Page", label: "Advanced Report " }
  ];

  const latestReleaseUrl = "https://github.com/I-m-a-m-4/zeneva/releases";
  const directDownloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64_en-US.msi`;


  return (
    <ThemeProvider forcedTheme="light">
      <div className="h-full overflow-y-auto w-full antialiased text-slate-900 bg-[#F9F8F6] relative overflow-x-hidden">
        <div className="fixed grid-lines w-full h-full top-0 right-0 left-0 pointer-events-none z-0"></div>
        
        <MarketingHeader />

        <div className="relative z-10 pt-20">
          {/* Hero Section */}
          <section className="relative pt-24 pb-20 overflow-hidden">
             <InteractiveGrid />
             <div className="aura-background"></div>
            
            <div className="container mx-auto px-6 text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 mb-8">
                  <MonitorSmartphone className="h-3 w-3" />
                  Production Release v{version}
                </div>
                
                <h1 className="text-5xl md:text-7xl font-medium tracking-tighter mb-8 font-display text-slate-900 leading-[1.1]">
                  The Future of Retail <br /> 
                  <span className="text-muted-foreground/40">Is Now Desktop-First.</span>
                </h1>
                
                <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 font-dm-sans">
                  Experience Zeneva as it was meant to be—fast, offline-capable, and powerful. 
                  A native suite built for high-performance business operations.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" className="h-14 px-8 text-base font-semibold gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-xl shadow-xl shadow-slate-200" asChild>
                    <a href={directDownloadUrl} onClick={() => {
                      // Safety fallback
                      setTimeout(() => {
                         window.open(latestReleaseUrl, '_blank');
                      }, 2000);
                    }}>
                      <Download className="h-5 w-5" />
                      Download for Windows
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-900 rounded-xl" asChild>
                    <Link href="#mobile">
                      <Smartphone className="h-5 w-5" />
                      iOS & Android
                    </Link>
                  </Button>
                </div>
                
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-default">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Verified Architecture
                  </div>
                  <Link href={latestReleaseUrl} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                    <Github className="h-4 w-4" />
                    Browse All Releases
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>


          {/* Features Grid */}
          <section className="py-24">
            <div className="container mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl font-light text-slate-900 tracking-tight font-bricolage mb-4">
                  Built for Professional Merchants.
                </h2>
                <p className="text-slate-500 font-dm-sans">
                  The Zeneva desktop app combines the response-time of a local database with the power of cloud management.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative p-8 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 isolate cursor-default"
                  >
                    <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-500 ease-out ${feature.hoverBg} -z-10 opacity-30`}></div>
                    
                    <div className={`w-12 h-12 ${feature.bgColor} ${feature.iconColor} rounded-xl flex items-center justify-center mb-6 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">{feature.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed relative z-10 group-hover:text-slate-700 transition-colors">
                      {feature.description}
                    </p>
                    
                    <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-200 z-10 group-hover:border-primary/40 transition-colors"></div>
                    <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-200 z-10 group-hover:border-primary/40 transition-colors"></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Mobile Apps Section */}
          <section id="mobile" className="py-32 relative overflow-hidden bg-slate-900 text-white rounded-[3rem] mx-4 mb-24 lg:mx-10">
            <div className="container mx-auto px-6 relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 space-y-8 text-center lg:text-left">
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 px-4 py-1 rounded-full">
                    Mobile Ecosystem
                  </Badge>
                  <h2 className="text-4xl md:text-6xl font-medium tracking-tighter font-display">
                    Your Business, <br/>
                    <span className="text-orange-500">Everywhere.</span>
                  </h2>
                  <p className="text-lg text-slate-400 leading-relaxed font-dm-sans max-w-xl">
                    Our mobile application is currently in early access. Get the power of Zeneva simplified for your smartphone.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                     <Link href="#" className="transition-transform hover:scale-105 active:scale-95">
                        <img src="/download_apple-store-logo.png" alt="Download on App Store" className="h-[52px] w-auto brightness-90 hover:brightness-100" />
                     </Link>
                     <Link href="#" className="transition-transform hover:scale-105 active:scale-95">
                        <img src="/download_google-play-badge.png" alt="Get it on Google Play" className="h-[52px] w-auto brightness-90 hover:brightness-100" />
                     </Link>
                  </div>
                  
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium">
                     <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> 1D/2D Scanning</span>
                     <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Live Sync</span>
                  </div>
                </div>
                
                <div className="flex-1 relative">
                    {/* Glowing background hint */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-500/20 blur-[120px] rounded-full"></div>
                    
                    {/* Enhanced Phone Mockup */}
                    <motion.div 
                      initial={{ rotate: 10, y: 50, opacity: 0 }}
                      whileInView={{ rotate: -5, y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="relative mx-auto border-[10px] border-slate-800 rounded-[3.5rem] w-72 h-[580px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-950"
                    >
                        {/* Internal Screen Content (Abstract) */}
                        <div className="h-full w-full flex flex-col">
                           <div className="h-20 bg-slate-900 flex items-center px-8 justify-between mt-4">
                              <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                 <Zap className="h-4 w-4 text-orange-500" />
                              </div>
                              <div className="h-2 w-20 bg-slate-800 rounded-full"></div>
                           </div>
                           
                           <div className="p-6 space-y-6">
                              <div className="h-[140px] w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 flex flex-col justify-between border border-slate-800">
                                 <div className="h-3 w-1/3 bg-slate-700 rounded-full"></div>
                                 <div className="h-8 w-1/2 bg-white rounded-lg"></div>
                                 <div className="h-1 w-full bg-slate-800 rounded-full mt-4"></div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                 {[1, 2].map(i => (
                                   <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-2xl"></div>
                                 ))}
                              </div>
                              
                              <div className="space-y-3">
                                 {[1, 2].map(i => (
                                   <div key={i} className="h-16 bg-slate-900/50 border border-slate-800/50 rounded-xl flex items-center px-4 gap-4">
                                      <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
                                      <div className="h-2 w-1/2 bg-slate-800 rounded-full"></div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                        
                        {/* Notch Overlay */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-2xl z-20"></div>
                    </motion.div>
                </div>
              </div>
            </div>
            
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[150px] -z-0"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] -z-0"></div>
          </section>

          {/* System Requirements Section */}
          <section className="py-24 bg-slate-50 border-t border-slate-100">
             <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto bg-white rounded-[2rem] p-10 shadow-sm border border-slate-200">
                   <div className="flex flex-col md:flex-row gap-12">
                      <div className="flex-1">
                         <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Monitor className="h-6 w-6 text-primary" />
                            Desktop Requirements
                         </h3>
                         <ul className="space-y-4">
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">OS</span>
                               <span className="font-semibold">Windows 10/11 (64-bit)</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Processor</span>
                               <span className="font-semibold">Intel i3 or equivalent</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Memory</span>
                               <span className="font-semibold">4GB RAM Minimum</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Storage</span>
                               <span className="font-semibold">200MB Free Space</span>
                            </li>
                         </ul>
                      </div>
                      <div className="flex-1">
                         <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Smartphone className="h-6 w-6 text-orange-500" />
                            Mobile Requirements
                         </h3>
                         <ul className="space-y-4">
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">iOS</span>
                               <span className="font-semibold">iOS 14.0 or higher</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Android</span>
                               <span className="font-semibold">v8.0 (Oreo) or higher</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Camera</span>
                               <span className="font-semibold">Autofocus for Scanning</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                               <span className="text-slate-500">Connectivity</span>
                               <span className="font-semibold">Internet for initial sync</span>
                            </li>
                         </ul>
                      </div>
                   </div>
                   
                   <div className="mt-12 p-6 bg-blue-50 rounded-2xl flex items-start gap-4 border border-blue-100">
                      <Bot className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                         <p className="font-bold text-blue-900">Enterprise Note</p>
                         <p className="text-sm text-blue-700">Looking for a custom build or dedicated hardware integration? Contact our enterprise support team for volume licensing.</p>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <MarketingFooter />
        </div>
      </div>
    </ThemeProvider>
  );
}

