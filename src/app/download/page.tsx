
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
    glow: "rgba(99,102,241,0.15)"
  },
  {
    icon: MonitorSmartphone,
    title: "Cross-Platform Sync",
    description: "Instant cloud backup and multi-device sync. Manage your business from your phone while your staff uses the desktop app.",
    glow: "rgba(165,180,252,0.15)"
  },
  {
    icon: LayoutDashboard,
    title: "Premium Experience",
    description: "A desktop-native interface designed for speed, stability, and zero-latency business operations.",
    glow: "rgba(139,92,246,0.15)"
  },
  {
    icon: ShieldCheck,
    title: "Military-Grade Security",
    description: "Hardware-tethered sessions and encrypted local storage ensure your data remains your own.",
    glow: "rgba(248,113,113,0.15)"
  }
];

export default function DownloadPage() {
  const version = AppConfig.version || "1.5.7";
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
    <ThemeProvider forcedTheme="dark">
      <div className="min-h-screen bg-[#09090F] text-slate-50 selection:bg-primary/30 selection:text-white antialiased font-sans relative overflow-x-hidden">
        
        {/* Custom Styles for the "Premium Technology" feel */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            background: #09090F;
          }

          .font-display {
            font-family: 'Bricolage Grotesque', sans-serif;
          }

          .text-gradient {
            background: linear-gradient(135deg, #E8E3FF 0%, #A5B4FC 45%, #6366F1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .glass-panel {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(24px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .hero-glow {
            background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
          }

          .grain-overlay::after {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.03;
            pointer-events: none;
            z-index: 50;
          }
        `}</style>

        <div className="grain-overlay" />
        
        <MarketingHeader />

        <main className="relative z-10 pt-20">
          
          {/* Hero Section */}
          <section className="relative px-6 pt-24 pb-32 overflow-hidden min-h-[90vh] flex flex-col items-center justify-center">
             <div className="absolute inset-0 hero-glow z-0" />
             <div className="absolute inset-0 opacity-[0.15] z-0">
                <InteractiveGrid />
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
                    ZENEVA UNIVERSE v{version} IS HERE
                  </span>
                </Badge>
                
                <h1 className="text-5xl md:text-8xl font-display font-extralight tracking-tight mb-8 leading-[1] text-gradient">
                  Find the signal through<br />
                  the <span className="font-light italic text-white">noise.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-14 leading-relaxed font-light">
                  Download the high-performance desktop engine for your retail business. 
                  Offline-first, lightning fast, and ready for global scale.
                </p>

                {/* Main OS Switcher / Download Stack */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
                  
                  {/* Windows Card */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-panel p-8 rounded-3xl text-left flex flex-col group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Monitor className="w-24 h-24 rotate-12" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                      <Monitor className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-display font-medium mb-2 uppercase tracking-wider text-blue-400">Windows</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Optimized for Windows 10 & 11. MSI installer with auto-updates.
                    </p>
                    <Button 
                      className="mt-auto h-12 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20 rounded-xl font-medium flex items-center gap-2"
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
                    className="glass-panel p-8 rounded-3xl text-left flex flex-col group relative overflow-hidden border-primary/20"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Apple className="w-24 h-24 -rotate-12" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                      <Apple className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-medium mb-2 uppercase tracking-wider text-primary">macOS</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Silicon or Intel. Native DMG package for macOS 12 and later.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button 
                        variant="secondary"
                        className="h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium text-xs px-2"
                        asChild
                      >
                        <a href={macDownloadUrlSilicon}>
                          Apple Silicon
                        </a>
                      </Button>
                      <Button 
                        variant="secondary"
                        className="h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium text-xs px-2"
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
                    className="glass-panel p-8 rounded-3xl text-left flex flex-col group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Smartphone className="w-24 h-24 rotate-6" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 border border-orange-500/20">
                      <Smartphone className="w-6 h-6 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-display font-medium mb-2 uppercase tracking-wider text-orange-400">Android</h3>
                    <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                      Mobile POS powerhouse. Available as a direct APK or Play Store.
                    </p>
                    <Button 
                      variant="outline"
                      className="mt-auto h-12 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border-orange-500/30 rounded-xl font-medium flex items-center gap-2"
                      asChild
                    >
                      <Link href={latestReleaseUrl}>
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Beta APK Release
                      </Link>
                    </Button>
                  </motion.div>

                </div>

                {/* Secondary Info */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 font-light">
                  <div className="flex items-center gap-2 group cursor-default">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Signed by Zeneva Intelligence
                  </div>
                  <Link href={latestReleaseUrl} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Github className="w-4 h-4" />
                    Browse Assets & Checksums
                  </Link>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Auto-Updates Enabled
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Background Scroll-reveal fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#09090F] to-transparent z-10 pointer-events-none" />
          </section>

          {/* Features Grid - Technology Theme */}
          <section className="py-32 relative">
             <div className="container max-w-6xl mx-auto px-6">
                <div className="text-center mb-20 space-y-4">
                  <Badge variant="outline" className="border-primary/20 text-primary uppercase tracking-[0.2em] font-display text-[10px] px-3">Engine Capabilities</Badge>
                  <h2 className="text-4xl md:text-5xl font-display font-extralight">Built for the <span className="text-white italic">Elite Merchant.</span></h2>
                  <p className="text-slate-400 font-light max-w-xl mx-auto">Zeneva Universe brings military-grade stability to local retail environments.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {features.map((feature, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        viewport={{ once: true }}
                        key={idx}
                        className="glass-panel group p-8 rounded-[2rem] hover:border-primary/40 transition-all cursor-default"
                        style={{ boxShadow: `0 0 40px -20px ${feature.glow}` }}
                     >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                           <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-display font-light mb-3 text-white">{feature.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-light group-hover:text-slate-400 transition-colors">
                           {feature.description}
                        </p>
                     </motion.div>
                   ))}
                </div>
             </div>
          </section>

          {/* System Environment Section */}
          <section className="py-32 bg-white/[0.01] border-y border-white/[0.03]">
             <div className="container max-w-5xl mx-auto px-6">
                <div className="glass-panel p-10 md:p-16 rounded-[3rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 opacity-5">
                      <Bot className="w-64 h-64" />
                   </div>
                   
                   <div className="flex flex-col md:flex-row gap-16 relative z-10">
                      <div className="flex-1 space-y-8">
                        <div>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-4 rounded-full">OPTIMIZED ENVIRONMENT</Badge>
                          <h3 className="text-3xl font-display font-light">Runtime Specifications</h3>
                        </div>
                        
                        <div className="space-y-6">
                           {[
                             { label: "Memory Requirement", val: "4GB RAM Minimum" },
                             { label: "Storage Footprint", val: "200MB Executable Space" },
                             { label: "Network Architecture", val: "Offline-First with Hybrid Sync" },
                             { label: "Security Layer", val: "SQLite 256-bit Encryption" }
                           ].map((item, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 group">
                               <span className="text-slate-500 font-light group-hover:text-slate-300 transition-colors">{item.label}</span>
                               <span className="font-display text-white text-sm">{item.val}</span>
                             </div>
                           ))}
                        </div>
                      </div>

                      <div className="flex-1 bg-white/5 rounded-[2rem] p-8 border border-white/10 flex flex-col justify-between">
                         <div>
                            <Bot className="w-10 h-10 text-primary mb-6" />
                            <h4 className="text-xl font-display mb-4">Support & Integration</h4>
                            <p className="text-sm text-slate-400 font-light leading-relaxed mb-8">
                               Looking for custom hardware drivers, dedicated thermal printer integrations, or legacy system migration?
                            </p>
                         </div>
                         <Button className="w-full h-14 bg-white text-[#09090F] hover:bg-slate-200 rounded-2xl font-semibold gap-2">
                           Speak with Engineers
                           <ArrowRight className="w-4 h-4" />
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* Multi-Platform Banner */}
          <section className="py-32 relative overflow-hidden">
             <div className="container px-6 mx-auto text-center">
                <motion.div 
                   initial={{ opacity: 0 }}
                   whileInView={{ opacity: 1 }}
                   className="space-y-6 max-w-2xl mx-auto"
                >
                   <h2 className="text-4xl font-display font-extralight">One Workspace.<br /><span className="text-primary italic">Every Platform.</span></h2>
                   <p className="text-slate-400 font-light mb-12">
                      Start an order on your iPad, manage inventory on your Windows workstation, and check reports from your iPhone. Total cohesion.
                   </p>
                   <div className="flex justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                      <Apple className="w-8 h-8" />
                      <Monitor className="w-8 h-8" />
                      <Smartphone className="w-8 h-8" />
                      <Laptop className="w-8 h-8" />
                   </div>
                </motion.div>
             </div>
          </section>

          <MarketingFooter />
        </main>
      </div>
    </ThemeProvider>
  );
}

