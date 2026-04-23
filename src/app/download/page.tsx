
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { InteractiveGrid } from '@/components/interactive-grid';
import { ThemeProvider } from '@/components/theme-provider';
import { AppConfig } from '@/lib/config';

const features = [
  {
    icon: Zap,
    title: "Offline Intelligence",
    description: "Full POS and inventory capabilities even when the internet goes out. Data syncs automatically once back online.",
    glow: "rgba(249, 115, 22, 0.05)",
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50"
  },
  {
    icon: MonitorSmartphone,
    title: "Cross-Platform Sync",
    description: "Instant cloud backup and multi-device sync. Manage your business from your phone while your staff uses the desktop app.",
    glow: "rgba(59, 130, 246, 0.05)",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    icon: LayoutDashboard,
    title: "Premium Experience",
    description: "A desktop-native interface designed for speed, stability, and zero-latency business operations.",
    glow: "rgba(139, 92, 246, 0.05)",
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    icon: ShieldCheck,
    title: "Military-Grade Security",
    description: "Hardware-tethered sessions and encrypted local storage ensure your data remains your own.",
    glow: "rgba(16, 185, 129, 0.05)",
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50"
  }
];

export default function DownloadPage() {
  const version = AppConfig.version || "1.5.8";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const latestReleaseUrl = "https://github.com/I-m-a-m-4/zeneva/releases";
  const windowsDownloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64_en-US.msi`;
  const macDownloadUrlIntel = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64.dmg`;
  const macDownloadUrlSilicon = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_aarch64.dmg`;

  if (!mounted) return null;

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-[#FDFDFD] text-slate-900 selection:bg-primary/20 selection:text-primary antialiased font-sans relative overflow-x-hidden">
        
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            background: #FDFDFD;
          }

          .font-display {
            font-family: 'Bricolage Grotesque', sans-serif;
          }

          .text-gradient {
            background: linear-gradient(135deg, #0F172A 0%, #334155 45%, #64748B 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .highlight-gradient {
            background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(24px) saturate(160%);
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
          }

          .hero-glow {
            background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
          }

          .grid-pattern {
            background-image: radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
          }
        `}</style>
        
        <MarketingHeader />

        <main className="relative z-10 pt-20">
          
          {/* Hero Section */}
          <section className="relative px-6 pt-24 pb-32 overflow-hidden min-h-[85vh] flex flex-col items-center justify-center bg-transparent">
             <div className="absolute inset-0 pointer-events-none z-0">
               <InteractiveGrid />
               <div className="aura-background"></div>
             </div>

            <div className="container max-w-6xl mx-auto text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <Badge className="mb-6 py-1.5 px-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 rounded-full font-medium tracking-wide">
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    ZENEVA UNIVERSE v{version}
                  </span>
                </Badge>
                
                <h1 className="text-5xl md:text-8xl font-display font-medium tracking-tight mb-8 leading-[1] text-gradient">
                  One platform.<br />
                  <span className="font-light italic highlight-gradient">Infinite reach.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-14 leading-relaxed font-light">
                  Download the high-performance desktop engine for your retail business. 
                  Offline-first, lightning fast, and ready for global scale.
                </p>

                {/* Main OS Switcher / Download Stack */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                  
                  {/* Windows Card */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-panel p-8 rounded-[2.5rem] text-left flex flex-col group relative overflow-hidden bg-white/50"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Monitor className="w-24 h-24 rotate-12" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
                      <Monitor className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2 uppercase tracking-wider text-slate-900">Windows</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Optimized for Windows 10 & 11. Full MSI installer with silent auto-updates.
                    </p>
                    <Button 
                      className="mt-auto h-12 bg-[#1e293b] hover:bg-[#0f172a] text-white border-0 shadow-lg shadow-slate-200 rounded-2xl font-medium flex items-center gap-2"
                      asChild
                    >
                      <a href={windowsDownloadUrl}>
                        <Download className="w-4 h-4" />
                        Download MSI (x64)
                      </a>
                    </Button>
                  </motion.div>

                  {/* macOS Card */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-panel p-8 rounded-[2.5rem] text-left flex flex-col group relative overflow-hidden bg-white/50 border-primary/10"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Apple className="w-24 h-24 -rotate-12" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                      <Apple className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2 uppercase tracking-wider text-slate-900">macOS</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Native builds for Silicon or Intel. Verified DMG package for macOS Monterey+.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button 
                        variant="secondary"
                        className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-2xl font-medium text-xs px-2"
                        asChild
                      >
                        <a href={macDownloadUrlSilicon}>
                          Apple Silicon
                        </a>
                      </Button>
                      <Button 
                        variant="secondary"
                        className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-2xl font-medium text-xs px-2"
                        asChild
                      >
                        <a href={macDownloadUrlIntel}>
                          Intel Chip
                        </a>
                      </Button>
                    </div>
                  </motion.div>

                  {/* Android Card */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-panel p-8 rounded-[2.5rem] text-left flex flex-col group relative overflow-hidden bg-white/50"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Smartphone className="w-24 h-24 rotate-6" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-6 border border-orange-100">
                      <Smartphone className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2 uppercase tracking-wider text-slate-900">Android</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Mobile POS powerhouse. Available as a direct APK or through early access.
                    </p>
                    <Button 
                      variant="outline"
                      className="mt-auto h-12 bg-orange-600/5 hover:bg-orange-600/10 text-orange-600 border-orange-200 rounded-2xl font-medium flex items-center gap-2"
                      asChild
                    >
                      <Link href={latestReleaseUrl}>
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Download Beta APK
                      </Link>
                    </Button>
                  </motion.div>

                </div>

                {/* Secondary Info */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 font-normal">
                  <div className="flex items-center gap-2 hover:text-slate-600 transition-colors cursor-default">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Authenticated Binary
                  </div>
                  <Link href={latestReleaseUrl} className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                    <Github className="w-4 h-4" />
                    Open Source Repository
                  </Link>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Verified Architecture
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Background Scroll-reveal fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#FDFDFD] to-transparent z-10 pointer-events-none" />
          </section>

          {/* Features Grid */}
          <section className="py-24 relative bg-slate-50/50">
             <div className="container max-w-6xl mx-auto px-6">
                <div className="text-center mb-20 space-y-4">
                  <Badge variant="outline" className="border-slate-200 text-slate-500 uppercase tracking-[0.2em] font-display text-[10px] px-3 bg-white">Engine Capabilities</Badge>
                  <h2 className="text-4xl md:text-5xl font-display font-medium text-slate-900">Built for the <span className="highlight-gradient italic">Professional.</span></h2>
                  <p className="text-slate-500 font-light max-w-xl mx-auto">The Zeneva desktop suite combines the response-time of a local database with the power of cloud management.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {features.map((feature, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        viewport={{ once: true }}
                        key={idx}
                        className="bg-white group p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 cursor-default"
                     >
                        <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                           <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                        </div>
                        <h3 className="text-xl font-display font-semibold mb-4 text-slate-900">{feature.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-light group-hover:text-slate-700 transition-colors">
                           {feature.description}
                        </p>
                     </motion.div>
                   ))}
                </div>
             </div>
          </section>

          {/* System Specs Section */}
          <section className="py-32">
             <div className="container max-w-5xl mx-auto px-6">
                <div className="bg-white border border-slate-100 p-10 md:p-16 rounded-[3rem] shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                      <Bot className="w-64 h-64" />
                   </div>
                   
                   <div className="flex flex-col md:flex-row gap-16 relative z-10">
                      <div className="flex-1 space-y-8">
                        <div>
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 mb-4 rounded-full">SYSTEM READY</Badge>
                          <h3 className="text-3xl font-display font-semibold text-slate-900">Environment Specifications</h3>
                        </div>
                        
                        <div className="space-y-6">
                           {[
                             { label: "Memory Requirement", val: "4GB RAM Minimum" },
                             { label: "Storage Footprint", val: "200MB Executable Space" },
                             { label: "Network Architecture", val: "Hybrid Offline-Sync" },
                             { label: "Security Layer", val: "AES-256 Database Encryption" }
                           ].map((item, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-4 group">
                               <span className="text-slate-400 font-light group-hover:text-slate-600 transition-colors">{item.label}</span>
                               <span className="font-display font-medium text-slate-900 text-sm">{item.val}</span>
                             </div>
                           ))}
                        </div>
                      </div>

                      <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-10 flex flex-col justify-between text-white shadow-2xl">
                         <div>
                            <Bot className="w-10 h-10 text-primary mb-6" />
                            <h4 className="text-xl font-display font-medium mb-4">Enterprise Integration</h4>
                            <p className="text-sm text-slate-400 font-light leading-relaxed mb-8">
                               Need dedicated hardware support or a custom enterprise build? Our engineers are ready to help.
                            </p>
                         </div>
                         <Button className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold gap-2">
                           Speak with Support
                           <ArrowRight className="w-4 h-4" />
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <MarketingFooter />
        </main>
      </div>
    </ThemeProvider>
  );
}

