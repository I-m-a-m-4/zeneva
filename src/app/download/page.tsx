
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

  const faqItems = [
    {
      id: "windows-protection",
      icon: HelpCircle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      question: "Windows protected your PC? How to install Zeneva",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">If you see a purple screen stating <strong className="text-slate-900">"Windows protected your PC"</strong> during installation, do not worry. This occurs because Zeneva is a new, high-performance application that hasn't yet built a "reputation" with Microsoft's SmartScreen filters.</p>
          <div className="my-6 border rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
            <img src="/images/support/windows-protected.jpg" alt="Windows protected your PC" className="w-full object-cover" />
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Installation Steps:
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-slate-900 flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Click "More info"</p>
                  <p className="text-sm text-slate-500">Located directly under the warning text on the purple screen.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-slate-900 flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Click "Run anyway"</p>
                  <p className="text-sm text-slate-500">A new button will appear at the bottom right. Click it to begin installation.</p>
                </div>
              </li>
            </ul>
          </div>
          <p className="text-sm text-slate-400 italic bg-amber-50 p-4 rounded-xl border border-amber-100">Rest assured, Zeneva is safe. We use enterprise-grade encryption and do not bundle any third-party software or tracking scripts.</p>
        </div>
      )
    },
    {
      id: "offline-sync",
      icon: Zap,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      question: "How does the offline synchronization work?",
      answer: (
        <div className="space-y-6">
          <p className="leading-relaxed">Zeneva is built with an <strong className="text-slate-900">Offline-First Architecture</strong>. This means your business never stops, even if the internet does. Every transaction is treated as a local event first.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4"><Monitor className="h-5 w-5" /></div>
               <p className="font-bold text-slate-900 mb-2">Edge-Side Processing</p>
               <p className="text-sm text-slate-500 leading-relaxed">Your inventory and sales totals update locally with zero latency. This ensures rapid checkout during peak hours.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4"><Cloud className="h-5 w-5" /></div>
               <p className="font-bold text-slate-900 mb-2">Background Sync</p>
               <p className="text-sm text-slate-500 leading-relaxed">When reconnecting, our intelligent sync engine resolves timestamp conflicts automatically to ensure data integrity.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "ai-strategic",
      icon: Bot,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      question: "What is Zen AI and how does it help?",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">Zen AI is more than a chatbot; it's a <strong className="text-slate-900">Proactive Business Strategist</strong>. It continuously monitors your business pattern to prevent losses and discover hidden profits.</p>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100 shadow-inner">
            <h4 className="font-bold text-slate-900 mb-4">Strategic Intelligence Layers:</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <p className="text-sm font-medium text-slate-700"><strong>Predictive Inventory:</strong> Forecasts stockouts 7 days in advance.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <p className="text-sm font-medium text-slate-700"><strong>Dead Stock Alert:</strong> Identifies capital trapped in non-moving items.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <p className="text-sm font-medium text-slate-700"><strong>Churn Prevention:</strong> Alerts you when loyal customers stop coming.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "enterprise-security",
      icon: Lock,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      question: "Is my business data secure and private?",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">Security is baked into Zeneva's DNA. We use <strong className="text-slate-900">Military-Grade AES-256 Encryption</strong> for all data at rest and during transit.</p>
          <div className="flex flex-wrap gap-2">
            {["Encrypted Database", "Hardware ID Locking", "SSL Pinning", "Zero-Knowledge Storage"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">{tag}</span>
            ))}
          </div>
          <p className="text-sm text-slate-500">Unlike web-only POS systems, Zeneva's desktop application creates a secure local vault that cannot be bypassed by browser extensions or cache-sniffing attacks.</p>
        </div>
      )
    },
    {
      id: "barcoding-system",
      icon: ScanBarcode,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      question: "How do I use barcode scanners with Zeneva?",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">Zeneva is <strong className="text-slate-900">Universal Scanner Compatible</strong>. Simply plug in any USB or Bluetooth barcode scanner and it works instantly—no special configuration required.</p>
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
              <span className="text-sm font-medium">1D/2D Barcode Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
              <span className="text-sm font-medium">Auto-Focus Mobile Scanning</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 italic">Pro Tip: Use the Zeneva mobile app to scan barcodes directly from your phone's camera to update inventory on the go.</p>
        </div>
      )
    },
    {
      id: "thermal-printing",
      icon: Printer,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      question: "What receipt printers are compatible?",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">Zeneva supports <strong className="text-slate-900">Any Standard POS Printer</strong>. Whether you have an 80mm or 58mm thermal printer, Zeneva automatically adjusts the layout for crisp, professional receipts.</p>
          <div className="grid grid-cols-3 gap-2">
             <div className="p-3 rounded-lg border text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">USB Printing</div>
             <div className="p-3 rounded-lg border text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Bluetooth</div>
             <div className="p-3 rounded-lg border text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Wifi/Network</div>
          </div>
        </div>
      )
    },
    {
      id: "multi-outlet",
      icon: Store,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      question: "Can I manage multiple shops or outlets?",
      answer: (
        <p className="leading-relaxed">Yes. Zeneva's <strong className="text-slate-900">Centralized Dashboard</strong> lets you switch between different store locations with one click. You can monitor stock levels across all branches and see which outlet is performing best in real-time.</p>
      )
    },
    {
      id: "staff-perms",
      icon: Users,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      question: "How do I control what my staff can see?",
      answer: (
        <div className="space-y-4">
          <p className="leading-relaxed">Zeneva offers <strong className="text-slate-900">Fine-Grained Permissions</strong>. You can invite staff members and restrict their access to specific modules like "Only POS" or "Inventory Only".</p>
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <ShieldAlert className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-800">Sensitive financial totals and administrative settings are hidden from staff members by default.</p>
          </div>
        </div>
      )
    },
    {
      id: "data-export",
      icon: Download,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      question: "Can I export my data for accounting?",
      answer: (
        <p className="leading-relaxed">Absolutely. Every report in Zeneva—Sales, Inventory, Profit/Loss—can be exported as a professional <strong className="text-slate-900">PDF</strong> or a raw <strong className="text-slate-900">CSV/Excel</strong> file for your accountant or tax records.</p>
      )
    },
    {
      id: "customer-loyalty",
      icon: Heart,
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      question: "Does Zeneva have customer loyalty features?",
      answer: (
        <p className="leading-relaxed">Yes. You can save customer profiles, track their purchase history, and see their favorite items. Zen AI uses this data to help you identify your "VIP" customers so you can offer them special discounts.</p>
      )
    },
    {
      id: "mobile-access",
      icon: Smartphone,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      question: "Can I check my business from my phone?",
      answer: (
        <p className="leading-relaxed">Yes! While the desktop app is best for counter operations, the <strong className="text-slate-900">Zeneva Hub</strong> web and mobile apps allow you to view live sales, current cash-in-hand, and inventory levels from anywhere in the world.</p>
      )
    },
    {
      id: "bulk-import",
      icon: LayoutGrid,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      question: "Can I import my existing product list?",
      answer: (
        <p className="leading-relaxed">Transitioning is easy. You can download our Excel template, fill in your products, and <strong className="text-slate-900">Bulk Import</strong> hundreds of items in seconds. No need to add them one by one.</p>
      )
    },
    {
      id: "payment-methods",
      icon: Wallet,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      question: "What payment methods are supported?",
      answer: (
        <p className="leading-relaxed">Zeneva supports <strong className="text-slate-900">Cash, Bank Transfer, POS Card, and Mobile Money</strong>. You can even split payments (e.g., half cash, half transfer) for a single transaction.</p>
      )
    },
    {
      id: "profit-calc",
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      question: "How is profit calculated in Zeneva?",
      answer: (
        <p className="leading-relaxed">Zeneva uses the <strong className="text-slate-900">Average Cost Method (AVCO)</strong>. It tracks the buying price of every item and subtracts it from the selling price, considering discounts and taxes, to give you a true net profit figure.</p>
      )
    },
    {
      id: "stock-alerts",
      icon: Bell,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      question: "Will I get notified when stock is low?",
      answer: (
        <div className="space-y-3">
          <p className="leading-relaxed">Yes. You can set a <strong className="text-slate-900">Low Stock Threshold</strong> for every product. When stock falls below this level, the item will be flagged in red on your inventory list.</p>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-50 w-fit px-3 py-1 rounded-md border border-orange-100">
            Real-time Alerts enabled
          </div>
        </div>
      )
    },
    {
      id: "audit-logs",
      icon: History,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      question: "Can I see who changed a product's price?",
      answer: (
        <p className="leading-relaxed">Zeneva maintains a <strong className="text-slate-900">Full Audit Trail</strong>. Every price change, stock adjustment, or deleted order is logged with a timestamp and the name of the staff member who performed the action.</p>
      )
    },
    {
      id: "expenses",
      icon: PieChart,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      question: "Does Zeneva track business expenses?",
      answer: (
        <p className="leading-relaxed">Yes. From rent to electricity to staff lunch, you can record all <strong className="text-slate-900">Operational Expenses</strong>. Zeneva subtracts these from your gross profit to show you your actual take-home income.</p>
      )
    },
    {
      id: "currency-custom",
      icon: Banknote,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      question: "Can I change the currency symbol?",
      answer: (
        <p className="leading-relaxed">Yes. In the business settings, you can choose your local currency (e.g., Naira, Dollars, Cedis, Shillings) and set your preferred date and time formats.</p>
      )
    },
    {
      id: "shortcuts",
      icon: Zap,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      question: "What are keyboard shortcuts for POS?",
      answer: (
        <div className="grid grid-cols-2 gap-4">
           <div className="p-3 bg-white border border-slate-100 rounded-lg">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">F1</kbd>
              <span className="ml-2 text-sm text-slate-600">Focus Search</span>
           </div>
           <div className="p-3 bg-white border border-slate-100 rounded-lg">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">F2</kbd>
              <span className="ml-2 text-sm text-slate-600">Toggle Cart</span>
           </div>
           <div className="p-3 bg-white border border-slate-100 rounded-lg">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">Enter</kbd>
              <span className="ml-2 text-sm text-slate-600">Proceed</span>
           </div>
           <div className="p-3 bg-white border border-slate-100 rounded-lg">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">Esc</kbd>
              <span className="ml-2 text-sm text-slate-600">Close/Clear</span>
           </div>
        </div>
      )
    },
    {
      id: "help-support",
      icon: MessageSquare,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      question: "What if I need help setting up?",
      answer: (
        <p className="leading-relaxed">We are here for you. You can access our <strong className="text-slate-900">24/7 Priority Support</strong> directly from the 'Help' menu in the app, or email us at support@zeneva.com for a response within 2 hours.</p>
      )
    }
  ];

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

          {/* Dashboard Preview Section (Carousel Style) */}
          <section className="py-24 relative overflow-hidden bg-white/50 backdrop-blur-md border-y border-slate-100">
             <div className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="space-y-6"
                    >
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-4 py-1">Mission Control</Badge>
                        <h2 className="text-4xl md:text-5xl font-medium tracking-tight font-display text-slate-900 leading-tight">
                           One Dashboard. <br/>
                           <span className="text-orange-500">Infinite Control.</span>
                        </h2>
                        <p className="text-lg text-slate-600 font-dm-sans leading-relaxed">
                           Zeneva's Desktop Command Center brings every aspect of your business into a single, high-fidelity interface. No more switching tabs. No more latency.
                        </p>
                        
                        <div className="flex flex-col gap-2 mt-4">
                            {slides.map((slide, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveSlide(index)}
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 text-left group ${index === activeSlide 
                                        ? 'bg-orange-50 ring-1 ring-orange-200 border-none' 
                                        : 'hover:bg-slate-50 border-none'}`}
                                >
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${index === activeSlide ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <Monitor className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold transition-colors ${index === activeSlide ? 'text-orange-900' : 'text-slate-700'}`}>{slide.label}</p>
                                        <p className="text-xs text-slate-500 group-hover:text-slate-600">View visual interface</p>
                                    </div>
                                    {index === activeSlide && <ArrowRight className="h-4 w-4 text-orange-500" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    <div className="relative">
                        <motion.div
                          initial={{ opacity: 0, x: 100, scale: 0.95 }}
                          whileInView={{ opacity: 1, x: 0, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="relative z-10 bg-white rounded-[2.5rem] p-4 shadow-2xl border border-slate-200 group overflow-hidden"
                        >
                            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
                                {slides.map((slide, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === activeSlide ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'}`}
                                    >
                                        <Image
                                            src={slide.src}
                                            alt={slide.alt}
                                            fill
                                            className="object-cover"
                                            priority={index === 0}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Floating Analytics Card */}
                            <motion.div
                              animate={{ y: [0, -10, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-orange-100 hidden md:block z-20"
                            >
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 bg-orange-50 flex items-center justify-center rounded-xl text-orange-500">
                                      <Zap className="h-6 w-6" />
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-slate-400">Daily Revenue</p>
                                      <p className="text-lg font-bold text-slate-900">+14.2%</p>
                                   </div>
                                </div>
                            </motion.div>
                        </motion.div>
                        
                        {/* Decorative Background Element */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-50 rounded-full blur-[100px] -z-10 opacity-70"></div>
                    </div>
                </div>
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
                         <p className="text-sm text-blue-700">Looking for a custom build or dedicated hardware integration? Contact our enterprise support team for volume licensing and custom tactical deployments.</p>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="py-32 bg-white scroll-mt-20" id="faq">
            <div className="container mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-20">
                <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50 px-4 py-1 rounded-full mb-4">
                  Support & Intelligence
                </Badge>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight font-display text-slate-900 mb-6 leading-tight">
                  Still have <span className="text-orange-500">questions?</span>
                </h2>
                <p className="text-lg text-slate-500 font-dm-sans">
                  Everything you need to know about Zeneva's tactical desktop suite and mobile ecosystem. Detailed answers to the most common queries.
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <Accordion type="single" collapsible className="space-y-6">
                  {faqItems.map((item) => (
                    <AccordionItem 
                      key={item.id} 
                      value={item.id} 
                      className="border border-slate-200 rounded-[2rem] px-8 bg-slate-50/20 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-orange-200 group data-[state=open]:bg-white data-[state=open]:shadow-xl data-[state=open]:border-orange-300"
                    >
                      <AccordionTrigger className="hover:no-underline py-8">
                        <div className="flex items-center gap-6 text-left">
                          <div className={`h-12 w-12 rounded-2xl ${item.iconBg} flex items-center justify-center ${item.iconColor} shrink-0 transition-transform duration-500 group-hover:scale-110 group-data-[state=open]:bg-orange-500 group-data-[state=open]:text-white`}>
                            <item.icon className="h-6 w-6" />
                          </div>
                          <span className="text-xl font-bold text-slate-900 leading-tight group-hover:text-orange-600 transition-colors">
                            {item.question}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-10 pt-2 prose prose-slate max-w-none px-2 lg:px-16">
                        <div className="text-slate-600 leading-relaxed font-dm-sans text-lg">
                          {item.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-20 p-12 bg-slate-900 rounded-[3.5rem] text-center relative overflow-hidden group border border-white/5 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                  <p className="text-white text-2xl font-medium mb-10 relative z-10">Ready to transform your business operations?</p>
                  <div className="flex flex-col items-center justify-center gap-6 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button size="lg" className="rounded-2xl px-10 h-16 bg-white text-slate-900 hover:bg-slate-100 border-none font-bold text-lg" asChild>
                        <a href={directDownloadUrl}>
                           <Download className="mr-2 h-6 w-6" />
                           Download for Windows
                        </a>
                      </Button>
                      <Button variant="outline" size="lg" className="rounded-2xl px-10 h-16 border-slate-700 text-white hover:bg-slate-800 font-bold text-lg" asChild>
                        <Link href="/support">
                           Visit Support Center
                           <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Direct link not working? Browse the <a href={latestReleaseUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-bold">Latest Releases on GitHub</a>
                    </p>
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

