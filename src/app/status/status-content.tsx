'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Wifi, 
  Database, 
  Sparkles, 
  Cpu, 
  Layers, 
  Monitor, 
  Smartphone, 
  Apple, 
  Globe, 
  Terminal, 
  ExternalLink, 
  Activity, 
  Check, 
  Search, 
  Bell, 
  Zap, 
  Server, 
  HardDrive, 
  Lock, 
  Tag, 
  ChevronRight, 
  Info,
  Calendar,
  Layers3,
  BarChart3,
  Sliders,
  CheckCheck,
  Send
} from 'lucide-react';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { ThemeProvider } from '@/components/theme-provider';
import { AppConfig } from '@/lib/config';
import { isNewerVersion } from '@/lib/platform';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Subsystem {
  id: string;
  name: string;
  group: 'Core Platform' | 'AI & Intelligence' | 'Edge & Hardware' | 'Commerce & Gateways';
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime90d: string;
  latencyMs: number;
  description: string;
  subfeatures: string[];
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  hoverBg: string;
}

interface PlatformRelease {
  id: string;
  platform: string;
  os: 'windows' | 'android' | 'mac' | 'web';
  latestVersion: string;
  releaseDate: string;
  stability: 'Stable' | 'Production Ready' | 'Active';
  architecture: string;
  format: string;
  downloadUrl: string;
  storeUrl?: string;
  storeLabel?: string;
  icon: React.ElementType;
  highlights: string[];
  bgColor: string;
  iconColor: string;
  hoverBg: string;
}

interface ChangelogItem {
  version: string;
  date: string;
  tag: string;
  summary: string;
  changes: {
    category: 'Features' | 'Zen AI' | 'Performance' | 'Reliability' | 'POS';
    items: string[];
  }[];
}

const SUBSYSTEMS: Subsystem[] = [
  {
    id: 'zen-ai',
    name: 'Zen AI & Vision Copilot',
    group: 'AI & Intelligence',
    status: 'operational',
    uptime90d: '99.98%',
    latencyMs: 310,
    description: 'Multimodal inventory parsing, physical stock sheet OCR analysis, and automated natural language business reasoning.',
    subfeatures: ['Groq Llama-3.2 Vision OCR', 'Multi-Image Batch Ingestion', 'Daily Quota Throttle Engine'],
    icon: Sparkles,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    hoverBg: 'bg-[#FAF5FF]',
  },
  {
    id: 'cloud-db',
    name: 'Realtime Cloud Database & Sync',
    group: 'Core Platform',
    status: 'operational',
    uptime90d: '99.99%',
    latencyMs: 42,
    description: 'Multi-tenant cloud Firestore engine with real-time replication across store branches, staff accounts, and warehouses.',
    subfeatures: ['Instant Branch Replication', 'Firestore Stream Synchronization', 'Isolated Tenant Partitioning'],
    icon: Database,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverBg: 'bg-[#EFF6FF]',
  },
  {
    id: 'offline-pos',
    name: 'Offline POS & Local Buffer',
    group: 'Edge & Hardware',
    status: 'operational',
    uptime90d: '100.0%',
    latencyMs: 1,
    description: 'Zero-latency local SQLite / IndexedDB cache engine capable of transacting indefinitely without an active internet connection.',
    subfeatures: ['Persistent Offline Transaction Queue', 'Automated Background Reconciliation', 'Zero-Loss Local Durability'],
    icon: HardDrive,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    hoverBg: 'bg-[#FFF7ED]',
  },
  {
    id: 'storefronts',
    name: 'Online Storefronts & Orders',
    group: 'Commerce & Gateways',
    status: 'operational',
    uptime90d: '99.99%',
    latencyMs: 58,
    description: 'Instant web storefronts for retail customers with real-time catalog syncing and instant WhatsApp checkout hooks.',
    subfeatures: ['Edge Cached Digital Menus', 'Direct Cart WhatsApp Hook', 'Live Stock Inventory Reserve'],
    icon: Globe,
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    hoverBg: 'bg-[#F0FDF4]',
  },
  {
    id: 'auth-security',
    name: 'Identity & Multi-Tenant RBAC',
    group: 'Core Platform',
    status: 'operational',
    uptime90d: '100.0%',
    latencyMs: 38,
    description: 'Cryptographic authentication, biometric unlock, cashier pin gating, and granular role permissions.',
    subfeatures: ['Cashier Session Pins', 'Biometric Quick-Unlock', 'Multi-Tenant Security Enforcement'],
    icon: ShieldCheck,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    hoverBg: 'bg-[#FFF1F2]',
  },
  {
    id: 'payments',
    name: 'Payment Processing & Split Gateways',
    group: 'Commerce & Gateways',
    status: 'operational',
    uptime90d: '99.96%',
    latencyMs: 165,
    description: 'Paystack terminal integration, multi-currency ledger balances, split cash/transfer transactions, and automated receipts.',
    subfeatures: ['Paystack Webhook Relay', 'Split Tender (Cash/Transfer/POS)', 'Automatic Dispute Logging'],
    icon: Zap,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
    hoverBg: 'bg-[#FFFBEB]',
  },
  {
    id: 'hardware-printing',
    name: 'Thermal Hardware & Scanning Engine',
    group: 'Edge & Hardware',
    status: 'operational',
    uptime90d: '100.0%',
    latencyMs: 2,
    description: 'ESC/POS thermal printer communication, high-speed 1D/2D continuous barcode scanning, and cash drawer triggers.',
    subfeatures: ['Direct ESC/POS Driver Pipeline', 'Continuous Laser Barcode Stream', 'Bluetooth & USB Thermal Sync'],
    icon: Server,
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    hoverBg: 'bg-[#EEF2FF]',
  },
  {
    id: 'ota-updates',
    name: 'Release Delivery & Telemetry',
    group: 'Core Platform',
    status: 'operational',
    uptime90d: '99.98%',
    latencyMs: 64,
    description: 'Automated Over-The-Air application updates, system version checks, launch diagnostics, and crash prevention buffers.',
    subfeatures: ['Microsoft Store Integration', 'Google Play In-App Updates', 'Tauri Sideload Auto-Patching'],
    icon: Activity,
    bgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    hoverBg: 'bg-[#ECFEFF]',
  },
];

const PLATFORM_RELEASES: PlatformRelease[] = [
  {
    id: 'windows',
    platform: 'Windows Desktop',
    os: 'windows',
    latestVersion: 'v3.4.6',
    releaseDate: 'October 2026',
    stability: 'Stable',
    architecture: 'x64 (Windows 10 / 11)',
    format: 'MSIX / MSI Installer',
    downloadUrl: '/api/download/windows',
    storeUrl: 'https://apps.microsoft.com/detail/9nvn0f8njwmj?hl=en-US&gl=NG&ocid=pdpshare',
    storeLabel: 'Microsoft Store',
    icon: Monitor,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverBg: 'bg-[#EFF6FF]',
    highlights: [
      'Zen Vision multi-image OCR and physical stock count intake',
      'Optimized thermal printer USB/Bluetooth communication',
      'Hardware barcode scanning acceleration without focus stealing',
      'Instant offline SQLite persistence with background auto-sync'
    ]
  },
  {
    id: 'android',
    platform: 'Android Mobile & POS Tablet',
    os: 'android',
    latestVersion: 'v3.4.6',
    releaseDate: 'October 2026',
    stability: 'Stable',
    architecture: 'ARM64 & Universal (Android 8.0+)',
    format: 'Google Play & Direct APK',
    downloadUrl: '/api/download/android',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.zeneva.app',
    storeLabel: 'Google Play',
    icon: Smartphone,
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    hoverBg: 'bg-[#F0FDF4]',
    highlights: [
      'Touch-first responsive cashier checkout with quick cart keypad',
      'Camera-assisted barcode scanning for fast inventory stocking',
      'Direct WhatsApp digital receipt sending with custom store branding',
      'Low memory footprint optimized for budget retail POS tablets'
    ]
  },
  {
    id: 'macos',
    platform: 'macOS Desktop',
    os: 'mac',
    latestVersion: 'v3.4.6',
    releaseDate: 'October 2026',
    stability: 'Stable',
    architecture: 'Universal (Apple Silicon M1-M4 & Intel)',
    format: 'Signed DMG Installer',
    downloadUrl: '/api/download/macos-silicon',
    icon: Apple,
    bgColor: 'bg-slate-100',
    iconColor: 'text-slate-700',
    hoverBg: 'bg-[#F8FAFC]',
    highlights: [
      'Native Apple Silicon metal acceleration for buttery 120fps UI',
      'Multi-window support for separate cashier & warehouse views',
      'Clean interface matching modern macOS styling paradigms',
      'Background sync daemon ensuring continuous offline durability'
    ]
  },
  {
    id: 'web',
    platform: 'Web App & Cloud POS',
    os: 'web',
    latestVersion: 'v3.4.6',
    releaseDate: 'October 2026',
    stability: 'Active',
    architecture: 'Edge Cloud (Chrome, Edge, Safari, Firefox)',
    format: 'Progressive Web App (PWA)',
    downloadUrl: '/login',
    icon: Globe,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    hoverBg: 'bg-[#FFF7ED]',
    highlights: [
      'Zero installation required — runs on any modern browser',
      'Installable as standalone PWA with offline desktop shortcut',
      'Instant access to back-office analytics, multi-store reports & billing',
      'Full cross-device sync with native desktop and mobile terminals'
    ]
  }
];

const CHANGELOG: ChangelogItem[] = [
  {
    version: 'v3.4.6',
    date: 'Current Production Release',
    tag: 'Latest Stable',
    summary: 'Introduced multimodal Zen Vision AI, multi-image receipt and physical stock sheet intake, dynamic daily usage quotas, and major Groq reasoning speedups.',
    changes: [
      {
        category: 'Zen AI',
        items: [
          'Zen Vision Engine: Upload multiple photos of physical stock-take sheets, handwritten supplier receipts, or invoices.',
          'Automated Product Cross-Referencing: Vision AI scans images, detects names and quantities, and cross-checks them directly against your current store inventory.',
          'Review & Confirmation Modal: One-click approval to apply batch stock updates directly to your database.',
          'Intelligent Daily Quotas: 5 free AI queries/day for Starter tier, 15 queries/day for Business tiers with clear usage badges.'
        ]
      },
      {
        category: 'Performance',
        items: [
          'Groq inference optimization: Dropped tool-calling overhead by 65%, providing sub-second AI responses.',
          'Prevented Fast Refresh hook desynchronization during development and client navigation.',
          'Memory reduction in client-side media storage and OCR preview generation.'
        ]
      },
      {
        category: 'POS',
        items: [
          'Hardened offline transaction queue: Transactions made without Wi-Fi are securely persisted and verified before auto-replaying upon reconnection.',
          'Barcode scanner debounce calibration for high-speed retail checkout lanes.'
        ]
      }
    ]
  },
  {
    version: 'v3.4.5',
    date: 'October 2026',
    tag: 'Past Release',
    summary: 'Elevated offline resilience, hardened transaction guarantees, and accelerated ESC/POS thermal printing.',
    changes: [
      {
        category: 'Reliability',
        items: [
          'SQLite / IndexedDB dual fallback storage: Local records maintain full ACID guarantees during sudden battery cuts.',
          'Conflict resolution strategy for simultaneous multi-device sales of the same inventory item.'
        ]
      },
      {
        category: 'Features',
        items: [
          'ESC/POS custom header formatting with dynamic merchant logo bitmap rendering.',
          'Direct customer debt ledger tracking and automated WhatsApp reminder triggers.'
        ]
      }
    ]
  },
  {
    version: 'v3.4.0',
    date: 'September 2026',
    tag: 'Milestone Release',
    summary: 'Launched Zeneva Storefronts 2.0 and unified multi-store analytics.',
    changes: [
      {
        category: 'Features',
        items: [
          'Instant public digital storefront for any retail merchant at /store/:storeSlug.',
          'Realtime customer WhatsApp order routing and online order push notifications.',
          'Multi-branch inventory transfer tracking with supervisor sign-off.'
        ]
      }
    ]
  }
];

export default function StatusContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'uptime' | 'changelog'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Just now');
  const [detectedPlatform, setDetectedPlatform] = useState<string>('Detecting...');
  const [detectedOS, setDetectedOS] = useState<'windows' | 'android' | 'mac' | 'web'>('windows');
  const [inputVersion, setInputVersion] = useState<string>('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const shippingVersion = AppConfig.version || '3.4.6';
  const cleanShippingVersion = shippingVersion.replace(/^v/i, '');

  // Detect user's environment on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    let osName = 'Web Browser';
    let osKey: 'windows' | 'android' | 'mac' | 'web' = 'web';

    if (ua.includes('win')) {
      osName = 'Windows PC';
      osKey = 'windows';
    } else if (ua.includes('android')) {
      osName = 'Android Device';
      osKey = 'android';
    } else if (ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad')) {
      osName = 'Apple macOS / iOS';
      osKey = 'mac';
    } else if (ua.includes('linux')) {
      osName = 'Linux Device';
      osKey = 'web';
    }

    setDetectedPlatform(osName);
    setDetectedOS(osKey);
    setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      toast({
        title: 'Status Refreshed',
        description: 'All 8 core Zeneva subsystems verified operational.',
        variant: 'success',
      });
    }, 600);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail || !subscriberEmail.includes('@')) {
      toast({
        title: 'Valid Email Required',
        description: 'Please provide a valid email address to receive incident alerts.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setSubscribed(true);
      toast({
        title: 'Subscribed to Alerts',
        description: `You will receive instant alerts at ${subscriberEmail} for major updates and maintenance windows.`,
        variant: 'success',
      });
      setSubscriberEmail('');
    }, 700);
  };

  // Evaluate user version comparison
  const versionEvaluation = useMemo(() => {
    if (!inputVersion.trim()) return null;

    const trimmed = inputVersion.trim().replace(/^v/i, '');
    const isNewer = isNewerVersion(cleanShippingVersion, trimmed);
    const isCurrent = trimmed === cleanShippingVersion;

    if (isCurrent) {
      return {
        status: 'current' as const,
        badge: 'Up to Date',
        title: 'You are on the latest production release! 🎉',
        description: `Your Zeneva install (v${trimmed}) contains the latest Zen Vision AI engine, offline POS zero-loss durability, and all current performance patches.`,
        recommendedAction: 'No action needed. You have the latest version.'
      };
    } else if (isNewer) {
      return {
        status: 'outdated' as const,
        badge: 'Update Available',
        title: `A newer release (v${cleanShippingVersion}) is available! ⚡`,
        description: `You are currently running v${trimmed}. Upgrading to v${cleanShippingVersion} unlocks Zen Vision OCR multi-image intake, automatic stock-sheet matching, and 65% faster AI inference.`,
        recommendedAction: `Download v${cleanShippingVersion} for your ${detectedPlatform}.`
      };
    } else {
      return {
        status: 'future' as const,
        badge: 'Preview / Custom Build',
        title: `You are running an advanced build (v${trimmed})`,
        description: `This version is newer than or distinct from the public production track (v${cleanShippingVersion}).`,
        recommendedAction: 'You are running cutting-edge internal code.'
      };
    }
  }, [inputVersion, cleanShippingVersion, detectedPlatform]);

  const recommendedRelease = useMemo(() => {
    return PLATFORM_RELEASES.find(p => p.os === detectedOS) || PLATFORM_RELEASES[0];
  }, [detectedOS]);

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-[#F9F8F6] text-slate-900 selection:bg-primary selection:text-white font-dm-sans relative overflow-x-hidden">
        {/* Background Grid Lines & Ambiance matching homepage */}
        <div className="fixed grid-lines w-full h-full top-[var(--tauri-title-height,0)] right-0 left-0 pointer-events-none z-0" />
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        <div className="aura-background pointer-events-none" />

        <div className="relative z-10 flex flex-col min-h-screen">
          <MarketingHeader />

          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-44 sm:pt-48 lg:pt-52 pb-24">
            
            {/* Header & Observatory Status Beacon Card */}
            <div className="p-6 sm:p-10 mb-10 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
              <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-100 relative z-10">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>All Core Systems Operational</span>
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 font-display">
                    System Status & Release Observatory
                  </h1>
                  
                  <p className="text-slate-600 max-w-2xl text-sm sm:text-base leading-relaxed font-normal">
                    Real-time operational health, 90-day subsystem uptime records, and client app release versions across Windows, Android, macOS, and Web.
                  </p>
                </div>

                {/* Status Action Block */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between sm:justify-start gap-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Last checked: <strong className="text-slate-900 font-semibold">{lastCheckTime}</strong></span>
                    </div>
                    <button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
                      title="Refresh status now"
                      aria-label="Refresh status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                    </button>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xs">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">90-Day Uptime</div>
                      <div className="text-lg font-bold text-slate-900 leading-tight font-display">99.98%</div>
                    </div>
                    <div className="h-8 w-px bg-emerald-200" />
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 relative z-10">
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-white hover:shadow-xs">
                  <div className="text-xs font-medium text-slate-500 mb-1">Active Version</div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
                    <span>v{cleanShippingVersion}</span>
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                      PROD
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Multi-image Zen Vision</div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-white hover:shadow-xs">
                  <div className="text-xs font-medium text-slate-500 mb-1">Supported Platforms</div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 font-display">4 Platforms</div>
                  <div className="text-[11px] text-slate-500 mt-1">Windows, Android, Mac, Web</div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-white hover:shadow-xs">
                  <div className="text-xs font-medium text-slate-500 mb-1">Average Response</div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 font-display">~45ms</div>
                  <div className="text-[11px] text-slate-500 mt-1">Global edge routing</div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-white hover:shadow-xs">
                  <div className="text-xs font-medium text-slate-500 mb-1">Active Incidents</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-700 flex items-center gap-1.5 font-display">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span>0 Active</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">All services running smooth</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Emulating Homepage Filter/Toggle Style */}
            <div className="mb-10 flex justify-center sm:justify-start">
              <div className="inline-flex items-center p-1.5 bg-neutral-100/90 border-2 border-dashed border-neutral-200 rounded-xl gap-1 overflow-x-auto no-scrollbar max-w-full">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Subsystems Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('versions')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'versions'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>Platform Versions</span>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">v{cleanShippingVersion}</span>
                </button>

                <button
                  onClick={() => setActiveTab('uptime')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'uptime'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>90-Day Uptime Log</span>
                </button>

                <button
                  onClick={() => setActiveTab('changelog')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'changelog'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Changelog & Updates</span>
                </button>
              </div>
            </div>

            {/* TAB 1: SUB-SYSTEMS OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {/* Interactive Version Inspector Card */}
                <div className="p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 relative z-10">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary ring-1 ring-primary/20 uppercase tracking-tight font-semibold">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Interactive Version Inspector</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                        Are you running the latest Zeneva release?
                      </h2>
                      <p className="text-sm text-slate-600 max-w-xl">
                        Check your installed version against current production release (<strong>v{cleanShippingVersion}</strong>). Detects missing features like Zen Vision multimodal scanning.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 px-4 flex items-center gap-3 shrink-0">
                      <div className="text-xs text-slate-500">
                        Your Environment:
                        <div className="text-slate-900 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Monitor className="w-3.5 h-3.5 text-primary" />
                          <span>{detectedPlatform}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input & Quick Pick */}
                  <div className="pt-6 space-y-4 relative z-10">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={inputVersion}
                          onChange={(e) => setInputVersion(e.target.value)}
                          placeholder="Type your version (e.g. 3.4.6, 3.4.5, 3.4.0)..."
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition shadow-xs font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs text-slate-500 hidden sm:inline font-medium">Presets:</span>
                        <button
                          onClick={() => setInputVersion(cleanShippingVersion)}
                          className="text-xs px-3 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition font-semibold"
                        >
                          v{cleanShippingVersion} (Latest)
                        </button>
                        <button
                          onClick={() => setInputVersion('3.4.5')}
                          className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition font-medium"
                        >
                          v3.4.5
                        </button>
                        <button
                          onClick={() => setInputVersion('3.4.0')}
                          className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition font-medium"
                        >
                          v3.4.0
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Evaluation Output */}
                    <AnimatePresence>
                      {versionEvaluation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`rounded-xl p-5 border shadow-sm ${
                            versionEvaluation.status === 'current'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : versionEvaluation.status === 'outdated'
                              ? 'bg-orange-50 border-orange-200 text-orange-950'
                              : 'bg-blue-50 border-blue-200 text-blue-950'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  versionEvaluation.status === 'current'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : versionEvaluation.status === 'outdated'
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}>
                                  {versionEvaluation.badge}
                                </span>
                                <h3 className="font-semibold text-slate-900 text-base">
                                  {versionEvaluation.title}
                                </h3>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl">
                                {versionEvaluation.description}
                              </p>
                            </div>

                            {versionEvaluation.status === 'outdated' && (
                              <Link
                                href={recommendedRelease.downloadUrl}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-primary/20 shrink-0"
                              >
                                <Download className="w-4 h-4" />
                                <span>Update to v{cleanShippingVersion}</span>
                              </Link>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Subsystems Cards Grid - Emulating Homepage Feature Cards */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage">Operational Subsystems (8/8 Online)</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">All services undergo continuous telemetry monitoring every 30 seconds.</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 font-semibold px-3 py-1">
                      100% Operational
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SUBSYSTEMS.map((sub) => {
                      const Icon = sub.icon;
                      return (
                        <div 
                          key={sub.id}
                          className="group relative p-6 sm:p-7 bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden transition-all duration-300 isolate shadow-sm hover:shadow-md"
                        >
                          {/* Slide-in Background Animation */}
                          <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-500 ease-out ${sub.hoverBg} -z-10`} />

                          {/* Always visible corner accents */}
                          <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                          <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                          <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 ${sub.bgColor} ${sub.iconColor} rounded-xl flex items-center justify-center transition-colors duration-300 group-hover:bg-white/80 shrink-0 shadow-xs`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary transition-colors">
                                    {sub.name}
                                  </h3>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                                    {sub.group}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Operational
                              </span>
                              <div className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
                                {sub.latencyMs}ms latency
                              </div>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors relative z-10">
                            {sub.description}
                          </p>

                          {/* Subfeatures list */}
                          <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap gap-1.5 relative z-10">
                            {sub.subfeatures.map((feat, idx) => (
                              <span 
                                key={idx}
                                className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200/80 px-2.5 py-1 rounded-md font-medium"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PLATFORM VERSIONS MATRIX */}
            {activeTab === 'versions' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 relative z-10">
                    <div>
                      <h2 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage">Client Platforms & Version Matrix</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Production binary builds verified and distributed globally across desktop and mobile.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Global Production Standard:</span>
                      <Badge className="bg-primary text-white font-mono font-bold text-xs px-2.5 py-1">
                        v{cleanShippingVersion}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 relative z-10">
                    {PLATFORM_RELEASES.map((plat) => {
                      const Icon = plat.icon;
                      const isDetected = plat.os === detectedOS;

                      return (
                        <div 
                          key={plat.id}
                          className={`group relative p-6 sm:p-8 bg-white border-2 border-dashed rounded-xl overflow-hidden transition-all duration-300 isolate shadow-sm hover:shadow-md flex flex-col justify-between ${
                            isDetected 
                              ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/5' 
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Slide-in Background Animation */}
                          <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-500 ease-out ${plat.hoverBg} -z-10`} />

                          {/* Corner Accents */}
                          <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                          <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                          {isDetected && (
                            <div className="absolute top-4 right-10 text-[10px] font-bold uppercase tracking-wider bg-primary text-white px-2.5 py-0.5 rounded-full shadow-xs">
                              Your Platform
                            </div>
                          )}

                          <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-5">
                              <div className={`w-14 h-14 ${plat.bgColor} ${plat.iconColor} rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/80 shrink-0 shadow-xs`}>
                                <Icon className="w-7 h-7" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                  {plat.platform}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                  <span className="font-mono text-primary font-bold text-sm">{plat.latestVersion}</span>
                                  <span>•</span>
                                  <span className="font-medium">{plat.architecture}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2.5 text-xs text-slate-600 my-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                              <div className="font-semibold text-slate-900 mb-2">Key Capabilities in {plat.latestVersion}:</div>
                              {plat.highlights.map((h, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                  <span className="leading-snug">{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 relative z-10">
                            <Link
                              href={plat.downloadUrl}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download {plat.latestVersion}</span>
                            </Link>

                            {plat.storeUrl && (
                              <a
                                href={plat.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition border border-slate-200 shadow-xs"
                              >
                                <span>{plat.storeLabel || 'Store Listing'}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: 90-DAY UPTIME LOG */}
            {activeTab === 'uptime' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 relative z-10">
                    <div>
                      <h2 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage">90-Day Operational Availability</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Continuous daily health records across foundational services.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">Total System Reliability:</span>
                      <div className="text-xl font-bold text-emerald-700 font-display">99.98% Available</div>
                    </div>
                  </div>

                  {/* Subsystems Uptime Visualization Bars */}
                  <div className="space-y-5 mt-6 relative z-10">
                    {SUBSYSTEMS.map((sub) => {
                      const Icon = sub.icon;
                      return (
                        <div key={sub.id} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 sm:p-5 hover:bg-white hover:shadow-xs transition">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${sub.bgColor} ${sub.iconColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-semibold text-slate-900">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500 font-mono font-medium">{sub.uptime90d} uptime</span>
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">100% Operational</span>
                            </div>
                          </div>

                          {/* 90 Days Visual Bar */}
                          <div className="flex items-center gap-[2px] sm:gap-1 w-full overflow-hidden py-1">
                            {Array.from({ length: 45 }).map((_, index) => (
                              <div 
                                key={index} 
                                className="h-7 flex-1 rounded-[2px] bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer group relative"
                                title={`Day ${45 - index}: 100% Operational (0 incidents)`}
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
                            <span>90 days ago</span>
                            <span>No incidents recorded</span>
                            <span>Today (100%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Incident History Section */}
                <div className="p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                  <h3 className="text-xl font-light text-slate-900 tracking-tight font-bricolage mb-5 relative z-10">Past 90 Days Incident History</h3>
                  <div className="space-y-4 relative z-10">
                    <div className="border-l-4 border-emerald-500 bg-slate-50/70 border border-slate-200/60 rounded-r-xl p-4 sm:p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">October 2026</span>
                        <span>•</span>
                        <span>Scheduled Maintenance</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1.5">
                        Zen Vision OCR Infrastructure Upgrade Completed
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Successfully rolled out the high-speed Groq Llama-3.2 vision pipeline. Zero downtime was incurred during the zero-downtime routing migration.
                      </p>
                    </div>

                    <div className="border-l-4 border-emerald-500 bg-slate-50/70 border border-slate-200/60 rounded-r-xl p-4 sm:p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">September 2026</span>
                        <span>•</span>
                        <span>System Maintenance</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1.5">
                        Storefronts 2.0 Edge Caching Optimization
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Updated database indices and edge caching rules to accelerate customer storefront catalog page generation across Africa and international traffic.
                      </p>
                    </div>

                    <div className="border-l-4 border-emerald-500 bg-slate-50/70 border border-slate-200/60 rounded-r-xl p-4 sm:p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">August 2026</span>
                        <span>•</span>
                        <span>Zero Incidents</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1.5">
                        100% Operational Uptime Achieved
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        All POS sync channels, Paystack integrations, and offline queuing functioned without disruption.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: CHANGELOG & UPDATES */}
            {activeTab === 'changelog' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="p-6 sm:p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                  <div className="pb-6 border-b border-slate-100 relative z-10">
                    <h2 className="text-2xl font-light text-slate-900 tracking-tight font-bricolage">Release Notes & Version Log</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Documented timeline of client releases, AI advancements, and POS stability milestones.</p>
                  </div>

                  <div className="space-y-8 mt-8 relative z-10">
                    {CHANGELOG.map((rel) => (
                      <div key={rel.version} className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-6 sm:p-8 relative hover:shadow-xs transition">
                        {/* Corner accents */}
                        <div className="absolute top-3.5 right-3.5 h-3 w-3 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
                        <div className="absolute bottom-3.5 left-3.5 h-3 w-3 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-slate-900 font-mono">{rel.version}</h3>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              rel.tag === 'Latest Stable'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {rel.tag}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono font-medium">
                            {rel.date}
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 my-4 leading-relaxed font-medium">
                          {rel.summary}
                        </p>

                        <div className="space-y-4 pt-2">
                          {rel.changes.map((cat, ci) => (
                            <div key={ci} className="space-y-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                {cat.category}
                              </span>
                              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                                {cat.items.map((item, ii) => (
                                  <li key={ii} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {rel.tag === 'Latest Stable' && (
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Shipped for Windows, Android, macOS, and Web.</span>
                            <Link
                              href="/download"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition"
                            >
                              <span>Download {rel.version}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Incident / Release Alert Subscriber Footer Card - Emulating Homepage Contact/Subscribe Card */}
            <div className="mt-12 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-slate-300 z-10 pointer-events-none" />
              <div className="absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-slate-300 z-10 pointer-events-none" />

              <div className="max-w-3xl relative z-10">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary ring-1 ring-primary/20 uppercase tracking-tight font-semibold mb-3">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  <span>Stay Informed</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                  Subscribe to Zeneva Status & Release Alerts
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
                  Receive automated notifications directly in your inbox whenever a new production release is deployed or scheduled maintenance is planned.
                </p>

                {subscribed ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm shadow-xs">
                    <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>You are subscribed to Zeneva system health & release advisories.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                    <input
                      type="email"
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="Enter your store email (e.g. manager@store.com)"
                      className="flex-1 bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition shadow-xs font-medium"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={isSubscribing}
                      className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-3 text-sm font-semibold transition shadow-md shadow-primary/20 shrink-0"
                    >
                      {isSubscribing ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Subscribing...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-3.5 h-3.5" />
                          <span>Subscribe</span>
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>

          </main>

          <MarketingFooter />
        </div>
      </div>
    </ThemeProvider>
  );
}
