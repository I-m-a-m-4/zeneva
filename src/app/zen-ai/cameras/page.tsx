'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Download, 
  Video, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Zap, 
  Sparkles, 
  Server, 
  HardDrive, 
  Lock, 
  Clock, 
  Play, 
  Pause, 
  Eye, 
  CreditCard, 
  AlertTriangle, 
  ShoppingBag, 
  Users, 
  Activity, 
  Check, 
  ScanBarcode, 
  Volume2, 
  VolumeX,
  Globe, 
  Cloud, 
  Package, 
  Printer, 
  Command, 
  RefreshCw,
  Workflow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import CinemaHeader from '@/components/layout/cinema-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from "@/lib/utils";
import { Rethink_Sans } from 'next/font/google';

const rethinkSans = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export default function ZenAiCamerasPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [filterRate, setFilterRate] = useState(95.2);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(error => {
              console.error("Video play interrupted:", error);
            });
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <ThemeProvider forcedTheme="light">
      <div className={cn("min-h-screen selection:bg-slate-900 selection:text-white bg-[#fff] relative antialiased", rethinkSans.className)}>
        {/* Background Grid System matching Download Page */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        
        <div className="relative z-10 w-full overflow-x-hidden">
          <CinemaHeader threshold={100} />

          <main className="min-h-screen">
            {/* Cinema Hero Section with Background Video */}
            <section className="relative h-screen min-h-[720px] w-full overflow-hidden flex flex-col justify-end pb-20 px-6 sm:px-12 border-b-4 border-slate-950">
              {/* Video Background Layer */}
              <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                <div className="absolute inset-0 z-10 bg-black/55 backdrop-blur-[1px]" />
                
                {/* Background Video using generated Cinematic high-angle CCTV camera perspective.mp4 */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/images/zen-cam/retail-theft-ai.jpg"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover opacity-60"
                >
                  <source src="/Cinematic%20high-angle%20CCTV%20camera%20perspective.mp4" type="video/mp4" />
                </video>
              </div>

              {/* Hero Bottom Institutional Banner & Tactical Card */}
              <div className="max-w-[1400px] mx-auto w-full relative z-20 flex flex-col items-center lg:flex-row lg:items-end justify-between gap-12 sm:gap-16">
                {/* Primary Institutional Brand Mark (Bottom Left) */}
                <div className="max-w-3xl transform lg:-translate-y-4 text-center lg:text-left w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-orange-400 text-xs font-mono uppercase tracking-widest mb-4"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                    <span>Zen Vision Stream Server // Edge Retail AI</span>
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-4xl md:text-6xl lg:text-5xl font-medium tracking-tighter text-white leading-[1.08]"
                  >
                    Zero Blind Spots,<br />
                    Zero Stolen Stock
                  </motion.h1>
                </div>

                {/* Tactical Intelligence Card (Bottom Right) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  onClick={() => scrollToSection('showcase')}
                  className="flex items-stretch bg-white rounded-[24px] overflow-hidden w-full max-w-md lg:max-w-xl group cursor-pointer border border-slate-100 shadow-2xl lg:shadow-none"
                >
                  <div className="w-36 sm:w-52 md:w-56 min-h-[140px] sm:min-h-[155px] self-stretch relative overflow-hidden rounded-l-[24px] bg-slate-900 flex-shrink-0">
                    <Image 
                      src="/images/zen-cam/retail-theft-ai.jpg" 
                      alt="Zen Vision Edge Stream Preview" 
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider shadow-sm z-10">
                      LIVE HUD
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 sm:px-6 flex flex-col justify-between flex-grow">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-3xl font-bold mb-1 ">v1.4</div>
                        <span className="text-[8px] font-bold tracking-[0.2em] text-orange-600 uppercase font-mono">Stream Daemon</span>
                      </div>
                      <h4 className="text-slate-950 font-medium text-lg sm:text-xl tracking-tighter  leading-none">RTSP &amp; ONVIF Engine</h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight max-w-[190px]">
                        95% idle frame drop with instant POS till receipt synchronization.
                      </p>
                    </div>
                    <div className="flex items-center justify-end mt-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-all duration-300">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Corner Decorative Geometric Element */}
              <div className="absolute top-0 right-0 p-12 hidden md:block pointer-events-none">
                <div className="w-px h-24 bg-white/20 absolute top-0 right-12" />
                <div className="w-24 h-px bg-white/20 absolute top-12 right-0" />
              </div>
            </section>

            {/* INSTITUTIONAL SHOWCASE (Emulating the Download Page Structure) */}
            <section id="showcase" className="py-24 px-0 md:px-6 bg-[#fcfaf9] relative overflow-hidden">
              {/* Vertical design grid line (dashed) on the far left */}
              <div className="absolute left-[8%] top-0 bottom-0 w-[2px] border-l-2 border-dashed border-slate-300 z-0 opacity-100" />
              
              <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="px-6 md:px-0 lg:pl-[12%]">
                  <div className="max-w-4xl">
                    <span className="block text-[10px] font-bold text-slate-400 tracking-[0.4em] mb-6  uppercase">
                      On-Edge Stream Architecture
                    </span>
                    <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-950 leading-[1.1] mb-16 ">
                      Zen Vision for Retail. A definitive video intelligence engine built for existing security cameras.
                    </h2>
                  </div>
                </div>

                {/* Video Showcase Container */}
                <div className="relative group max-w-7xl lg:pl-[12%] mx-auto lg:mx-0">
                  {/* Decorative Corner Accents */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 border-t border-l border-slate-300 hidden md:block" />
                  <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b border-r border-slate-300 hidden md:block" />
                  
                  <div className="relative rounded-none md:rounded-sm overflow-hidden shadow-2xl border-y md:border border-slate-200 bg-slate-900 group-hover:shadow-[0_0_50px_rgba(0,0,0,0.1)] transition-all duration-700">
                    {/* Video Surface */}
                    <div className={cn(
                      "w-full aspect-video md:aspect-auto md:h-[600px] bg-slate-900 relative overflow-hidden",
                      !isPlaying && "grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000"
                    )}>
                      <video
                        ref={videoRef}
                        muted={isMuted}
                        loop
                        playsInline
                        poster="/images/zen-cam/retail-theft-ai.jpg"
                        className="absolute inset-0 w-full h-full object-cover"
                      >
                        <source src="/Macro%20cinematic%20tracking%20shot%20moving.mp4" type="video/mp4" />
                      </video>
                    </div>
                    
                    {/* Aesthetic Warm Overlay */}
                    <div className={cn(
                      "absolute inset-0 transition-opacity duration-700 pointer-events-none",
                      isPlaying ? "opacity-0" : "bg-[#f5e6d3]/35"
                    )} />

                    {/* Interactive Play Overlay (Minimalist) */}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          onClick={togglePlay}
                          className="bg-black text-white px-6 py-2.5 rounded-full flex items-center gap-3 hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl backdrop-blur-sm border border-white/10 text-[9px] tracking-[0.2em] font-medium  cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                            <Play className="w-3 h-3 text-black fill-current translate-x-0.5" />
                          </div>
                          Watch The Live Stream Engine
                        </button>
                      </div>
                    )}

                    {/* Floating Controls (Visible when playing) */}
                    {isPlaying && (
                      <div className="absolute bottom-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                        <button 
                          onClick={togglePlay}
                          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer"
                          title="Pause Video"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer"
                          title={isMuted ? "Unmute Audio" : "Mute Audio"}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        </button>
                      </div>
                    )}

                    {/* HUD Element Overlay (Matching download page status badge) */}
                    <div className="absolute bottom-6 left-6 flex items-center gap-6 opacity-90 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-white/50 tracking-[0.2em] font-mono">OPERATIONAL STATUS</span>
                        <span className="text-[11px] font-bold text-emerald-400 tracking-widest font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active // 95.2% Pruned
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col border-l border-white/20 pl-6">
                        <span className="text-[8px] font-bold text-white/50 tracking-[0.2em] font-mono">BANDWIDTH COST</span>
                        <span className="text-[11px] font-bold text-white tracking-widest font-mono">
                          ₦0.00 // Zero Cloud Egress
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TECHNICAL SPECIFICATION SECTION 1 (Checkout & Cashier Sweethearting Prevention) */}
            <section className="bg-white border-y border-slate-200 overflow-hidden w-full">
              <div className="w-full border-x-[2.5px] border-dashed border-slate-200">
                {/* Upper Header Bar */}
                <div className="flex items-center px-6 sm:px-12 h-16 border-b-[2.5px] border-dashed border-slate-200 justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em]  uppercase">
                    Checkout Surveillance // Sweethearting Prevention // POS Sync
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 border-emerald-500/30">
                    REAL-TIME SYNC
                  </Badge>
                </div>

                <div className="grid lg:grid-cols-2">
                  {/* Left Column: Data & Narrative */}
                  <div className="order-last lg:order-none p-8 sm:p-12 lg:p-24 border-r-[0px] lg:border-r-[2.5px] border-dashed border-slate-200 space-y-10">
                    <div className="space-y-6">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center rounded-lg shadow-xs">
                        <CreditCard className="w-6 h-6 text-slate-950" />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-2xl md:text-5xl font-medium tracking-tight text-slate-950 ">
                          Register Till Intelligence
                        </h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed max-w-xl">
                          Correlates overhead CCTV frames directly with Zeneva POS checkout registers. If an item is transferred from counter to customer bag without a barcode scan event registered within 3.5 seconds, an audit flag is recorded.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link 
                          href="/vision" 
                          className="bg-[#1e293b] text-white hover:bg-[#0f172a] transition-all rounded-md py-3 px-6 text-xs font-semibold shadow-xs font-dm-sans flex items-center gap-2 group"
                        >
                          Launch Vision Console
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button
                          onClick={() => scrollToSection('pilot')}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs transition-all rounded-md py-3 px-5 shadow-2xs font-dm-sans cursor-pointer"
                        >
                          Request Pilot Deployment
                        </button>
                      </div>
                    </div>

                    {/* Spec Table - Aligned with Download Page Pattern */}
                    <div className="space-y-0 border-t-[2.5px] border-dashed border-slate-200 pt-6 mt-8">
                      {[
                        { k: "Ingestion Protocol", v: "RTSP / ONVIF / H.264 / H.265" },
                        { k: "Frame Pruning Engine", v: "Motion-Vector Masking (95% Idle Dropped)" },
                        { k: "POS Correlation Window", v: "3.5s Scan-to-Bag Latency" },
                        { k: "Local Daemon Footprint", v: "< 1.4% CPU • 285MB RAM" },
                        { k: "Cloud Bandwidth Cost", v: "₦0.00 / Zero Video Uploads" },
                        { k: "Camera Compatibility", v: "Hikvision, Dahua, Reolink, Axis, Uniview" },
                        { k: "Incident Response", v: "Instant POS Till Lock & Mobile Dispatch" }
                      ].map((spec, i) => (
                        <div key={i} className="flex justify-between items-center py-3.5 border-b border-dashed border-slate-200">
                          <span className="text-[12px] font-bold text-slate-950 tracking-tight ">{spec.k}:</span>
                          <span className="text-[12px] font-medium text-slate-500 tracking-tight font-dm-sans text-right pl-4">{spec.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Visual Mockup (Desktop Cream Station housing Live Stream) */}
                  <div className="order-first lg:order-none bg-[#fdfbf6] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden border-b-[2.5px] lg:border-b-0 border-dashed border-slate-200">
                    <div 
                      className="absolute inset-0 opacity-10" 
                      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #d4a373 1px, transparent 0)', backgroundSize: '32px 32px' }}
                    />
                    
                    <div className="relative w-full max-w-2xl group">
                      <div className="relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
                        {/* Screen Layer - Cream Frame */}
                        <div className="relative bg-slate-900 rounded-xl p-3 border-[8px] border-[#e9dcc9] shadow-2xl">
                          <div className="aspect-video bg-slate-900 rounded-sm overflow-hidden relative">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              poster="/images/zen-cam/retail-theft-ai.jpg"
                              className="absolute inset-0 w-full h-full object-cover"
                            >
                              <source src="/High-angle%2045-degree%20surveillance%20camera%20shot.mp4" type="video/mp4" />
                            </video>

                            {/* Live Reticle Overlay */}
                            <div className="absolute top-2.5 left-2.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 font-semibold">
                              CAM-07 • POS TILL 1
                            </div>
                            <div className="absolute bottom-2.5 right-2.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-[#F47125] font-semibold">
                              SCAN VERIFIED • RECEIPT #7419
                            </div>
                          </div>
                        </div>

                        {/* Desktop Stand Layer */}
                        <div className="w-full flex flex-col items-center">
                          <div className="w-32 h-16 bg-[#dec9af] transform perspective-1000 rotateX-30 rounded-t-lg origin-top" />
                          <div className="w-48 h-3 bg-[#c9b398] rounded-full -mt-2" />
                        </div>
                      </div>

                      {/* Shadow/Glow */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-[#d4a373]/10 blur-3xl rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TECHNICAL SPECIFICATION SECTION 2 (Aisle Surveillance & Dwell Tracking) */}
            <section className="bg-white border-b border-slate-200 overflow-hidden w-full">
              <div className="w-full border-x-[2.5px] border-dashed border-slate-200">
                {/* Upper Header Bar */}
                <div className="flex items-center px-6 sm:px-12 h-16 border-b-[2.5px] border-dashed border-slate-200 justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em]  uppercase">
                    Aisle Surveillance // Concealment &amp; Dwell Tracking
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] text-amber-600 border-amber-500/30">
                    ACTIVE MONITORING
                  </Badge>
                </div>

                <div className="grid lg:grid-cols-2">
                  {/* Left Column: Data & Narrative */}
                  <div className="order-last lg:order-none p-8 sm:p-12 lg:p-24 border-r-[0px] lg:border-r-[2.5px] border-dashed border-slate-200 space-y-10">
                    <div className="space-y-6">
                      <div className="w-12 h-12 bg-orange-50 border border-orange-100 flex items-center justify-center rounded-lg shadow-xs">
                        <ShoppingBag className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-2xl md:text-5xl font-medium tracking-tight text-slate-950 ">
                          High-Value Shelf Safeguard
                        </h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed max-w-xl">
                          Monitors high-value product rows (skincare, perfumes, electronics). If a customer sweeps multiple bottles into clothing or lingers excessively (&gt;60s) without assistance, an instant alert is dispatched to sales associate mobiles.
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-orange-50/50 border border-orange-200/60 text-xs text-orange-950 font-dm-sans space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-orange-800">
                          <Eye className="w-3.5 h-3.5" />
                          Multi-Camera Handover Re-Identification
                        </span>
                        <p className="text-orange-900/80 leading-relaxed">
                          Tracks shopper bounding vectors seamlessly across overlapping camera zones without facial recognition or personal biometric storage.
                        </p>
                      </div>
                    </div>

                    {/* Spec Table */}
                    <div className="space-y-0 border-t-[2.5px] border-dashed border-slate-200 pt-6 mt-8">
                      {[
                        { k: "Neural Model", v: "YOLOv11-Nano INT8 Quantized" },
                        { k: "Dwell Alert Threshold", v: "Dynamic (60s Default)" },
                        { k: "Shelf Sweep Trigger", v: "Rapid Multi-Item Displacement" },
                        { k: "Edge Stream Capacity", v: "Up to 16 Concurrent RTSP Feeds" },
                        { k: "Local Storage Buffer", v: "30-Day Rolling NVMe Loop" },
                        { k: "Biometric Policy", v: "100% Anonymous Vector Tracking" },
                        { k: "Staff Notification", v: "In-App Push & Mobile Webhook" }
                      ].map((spec, i) => (
                        <div key={i} className="flex justify-between items-center py-3.5 border-b border-dashed border-slate-200">
                          <span className="text-[12px] font-bold text-slate-950 tracking-tight ">{spec.k}:</span>
                          <span className="text-[12px] font-medium text-slate-500 tracking-tight font-dm-sans text-right pl-4">{spec.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Visual Mockup (Advanced Aisle Feed Showcase) */}
                  <div className="order-first lg:order-none bg-orange-50/20 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden border-b-[2.5px] lg:border-b-0 border-dashed border-slate-200">
                    <div 
                      className="absolute inset-0 opacity-5" 
                      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ea580c 1px, transparent 0)', backgroundSize: '32px 32px' }}
                    />
                    
                    <div className="relative w-full max-w-2xl group">
                      <div className="relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
                        {/* Screen Layer - Cream Frame */}
                        <div className="relative bg-slate-900 rounded-xl p-3 border-[8px] border-[#e9dcc9] shadow-2xl">
                          <div className="aspect-video bg-slate-900 rounded-sm overflow-hidden relative">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              poster="/images/zen-cam/aisle-theft-ai.jpg"
                              className="absolute inset-0 w-full h-full object-cover"
                            >
                              <source src="/CCTV%20surveillance%20perspective%20of%20a%20luxury%20cosmetics.mp4" type="video/mp4" />
                            </video>
                            
                            <div className="absolute top-2.5 left-2.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 font-semibold z-10">
                              CAM-14 • AISLE 6 COSMETICS
                            </div>
                            <div className="absolute bottom-2.5 right-2.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-white z-10">
                              DWELL THRESHOLD: 35s DETECTED
                            </div>
                          </div>
                        </div>

                        {/* Desktop Stand Layer */}
                        <div className="w-full flex flex-col items-center">
                          <div className="w-32 h-16 bg-[#dec9af] transform perspective-1000 rotateX-30 rounded-t-lg origin-top" />
                          <div className="w-48 h-3 bg-[#c9b398] rounded-full -mt-2" />
                        </div>
                      </div>

                      {/* Shadow/Glow */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-orange-600/10 blur-3xl rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* HARDWARE PROTOCOL & INTEGRATION SECTION (Emulating Download Page Peripheral Section) */}
            <section className="py-24 px-6 bg-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
                  <div className="space-y-10">
                    <div className="inline-flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-950" />
                      <span className="font-semibold tracking-widest text-xs font-dm-sans uppercase">
                        Zero Hardware Replacement
                      </span>
                    </div>
                    
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[0.95] ">
                      Plugged into <br />
                      <span className="text-slate-400">Retail Reality.</span>
                    </h2>
                    
                    <p className="text-slate-600 font-medium text-base sm:text-lg leading-relaxed max-w-xl">
                      Retailers have already spent thousands of dollars mounting lenses and cables. Zen Vision turns those dumb video recorders into autonomous loss prevention monitors in under 3 minutes.
                    </p>
                    
                    <div className="space-y-4 pt-2">
                      {[
                        { 
                          icon: Video, 
                          t: "Universal RTSP & ONVIF Handshake", 
                          d: "Auto-discovers IP cameras across your local subnet. Compatible with Hikvision, Dahua, Reolink, Axis, and Uniview." 
                        },
                        { 
                          icon: HardDrive, 
                          t: "Local NVMe Video Retention", 
                          d: "Keep 30 to 90 days of high-definition video securely encrypted on-premises. Zero cloud streaming egress charges." 
                        },
                        { 
                          icon: Lock, 
                          t: "Cryptographic Receipt Binding", 
                          d: "Every transaction receipt ID is cryptographically pinned to the exact video keyframe timestamp." 
                        }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-5 sm:p-6 border-2 border-dashed border-slate-200 group hover:bg-slate-50 transition-colors">
                          <item.icon className="w-6 h-6 text-slate-900 mt-1 shrink-0" />
                          <div>
                            <h5 className="font-medium text-sm tracking-widest mb-1  transition-colors group-hover:text-orange-600">
                              {item.t}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              {item.d}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-dashed border-slate-200 overflow-hidden relative group">
                      <div className="absolute top-6 right-6 h-4 w-4 border-t-2 border-r-2 border-slate-300 z-10 opacity-50" />
                      <div className="absolute bottom-6 left-6 h-4 w-4 border-b-2 border-l-2 border-slate-300 z-10 opacity-50" />
                      <div className="aspect-[4/3] rounded-xl overflow-hidden relative bg-slate-950">
                        <video
                          autoPlay
                          muted
                          loop
                          playsInline
                          poster="/images/zen-cam/retail-theft-ai.jpg"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        >
                          <source src="/Cinematic%20close-up%20macro%20sequence%20of%20a%20white%20security.mp4" type="video/mp4" />
                        </video>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CREAMY ORANGE CALL TO ACTION SECTION (Matching Topbar Promo Theme) */}
            <section id="pilot" className="py-24 px-6 bg-[#f1dfd1] border-t border-[#e2cbba] relative overflow-hidden">
              {/* Background texture matching creamy promo aesthetic */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.08]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #9a5323 1px, transparent 0)', backgroundSize: '32px 32px' }} 
              />
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#F47125]/15 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

              <div className="max-w-5xl mx-auto relative z-10 text-center">
                <span className="inline-block text-[11px] font-bold text-[#b44800] tracking-[0.3em] mb-4 uppercase font-mono bg-white/40 border border-[#dfc2ae] px-3.5 py-1 rounded-full">
                  Autonomous Retail Loss Prevention
                </span>
                <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-950 leading-tight mb-6">
                  Deploy Zen Vision To Your Store
                </h2>
                <p className="text-slate-700 text-base sm:text-lg font-medium max-w-2xl mx-auto mb-14 leading-relaxed">
                  Stop bleeding inventory to unmonitored merchandise aisles and cashier sweethearting. Test the live console right in your browser or request a guided pilot on your local network.
                </p>

                {/* Badges / CTAs matching Creamy Promo Palette */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 max-w-3xl mx-auto">
                  {/* Primary CTA: Launch Vision Console */}
                  <Link
                    href="/vision"
                    className="w-full sm:w-auto group flex items-center gap-4 bg-white hover:bg-white/95 border border-[#dfc2ae] hover:border-[#F47125]/60 px-8 py-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[260px]"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-[#F47125]/15 text-[#F47125] rounded-xl flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-0.5 font-mono">Live Interactive</div>
                      <div className="text-slate-950 font-bold text-base leading-tight tracking-tight">Launch Vision Console</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#F47125] group-hover:translate-x-1 transition-all ml-auto" />
                  </Link>

                  {/* Secondary CTA: Request On-Premises Pilot */}
                  <Link
                    href="/contact"
                    className="w-full sm:w-auto group flex items-center gap-4 bg-white hover:bg-white/95 border border-[#dfc2ae] hover:border-emerald-600/60 px-8 py-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[260px]"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-0.5 font-mono">On-Premises Pilot</div>
                      <div className="text-slate-950 font-bold text-base leading-tight tracking-tight">Request Store Setup</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all ml-auto" />
                  </Link>

                  {/* Tertiary CTA: POS Terminal Engine */}
                  <Link
                    href="/download"
                    className="w-full sm:w-auto group flex items-center gap-4 bg-white hover:bg-white/95 border border-[#dfc2ae] hover:border-slate-800 px-8 py-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[260px]"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-0.5 font-mono">Zeneva Core</div>
                      <div className="text-slate-950 font-bold text-base leading-tight tracking-tight">Download App Suite</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all ml-auto" />
                  </Link>
                </div>

                {/* Trust Indicators matching Creamy Promo Palette */}
                <div className="mt-16 pt-12 border-t border-[#dfc2ae] flex flex-wrap items-center justify-center gap-8 text-slate-700">
                  {[
                    { icon: ShieldCheck, label: "Zero Camera Hardware Cost" },
                    { icon: Zap, label: "95% Idle Frame Dropping" },
                    { icon: Globe, label: "100% On-Premises Privacy" },
                    { icon: Cloud, label: "Real-Time POS Sync" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-[#F47125]" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-slate-700">{item.label}</span>
                    </div>
                  ))}
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
