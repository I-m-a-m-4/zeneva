
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Book, 
  Cpu, 
  Activity, 
  CreditCard, 
  Users, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Barcode,
  TrendingDown,
  Bell,
  Workflow
} from 'lucide-react';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { InteractiveGrid } from '@/components/interactive-grid';

export default function HelpGuidesPage() {
  const [activeTab, setActiveTab] = useState('offline-sync');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for hash in URL to jump to section
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      setActiveTab(hash);
    }
  }, []);

  const guides = [
    {
      id: 'offline-sync',
      title: "How to sync your inventory offline",
      icon: <Activity className="w-5 h-5" />,
      content: (
        <div className="space-y-8">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
            <h3 className="text-xl font-bold mb-4">The Local-First Architecture</h3>
            <p className="text-slate-600 mb-4">
              Zeneva's POS environment is built on a "Local-First" architecture. This means your data doesn't just "live in the cloud"—it lives directly on your device's hardware, specialized for high-turnover retail environments in Nigeria where internet stability can be unpredictable.
            </p>
          </div>

          <section className="space-y-4">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              How Offline Sync Works
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="font-bold mb-2">Step 1: IndexedDB Storage</div>
                <p className="text-sm text-slate-600">Every sale, stock update, or customer addition is instantly committed to a local, encrypted database (IndexedDB) within your browser or app terminal.</p>
              </div>
              <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="font-bold mb-2">Step 2: Delta Tracking</div>
                <p className="text-sm text-slate-600">Zeneva tracks "Deltas"—only the changes made—rather than re-uploading the entire inventory state, saving data and time.</p>
              </div>
              <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="font-bold mb-2">Step 3: Background Listener</div>
                <p className="text-sm text-slate-600">A service worker continuously monitors your connection throughput. Once a stable >15kbps link is detected, the "Sync Handshake" begins.</p>
              </div>
              <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="font-bold mb-2">Step 4: Vector Clock Resolution</div>
                <p className="text-sm text-slate-600">If two cashiers update the same stock item while offline, our Vector Clock algorithm resolves the conflict based on causality and timestamps.</p>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-4 p-5 bg-orange-50 border border-orange-100 rounded-xl">
            <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
            <div>
              <div className="font-bold text-orange-900">Pro-Tip for Stability</div>
              <p className="text-sm text-orange-800">Do not clear your browser cache or perform a "Factory Reset" on your POS terminal until the sync icon in the top right corner turns green.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'staff-permissions',
      title: "Setting up staff permissions and roles",
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-8">
          <p className="text-slate-600 text-lg">
            Protect your business by granting the right access to the right people. Zeneva's RBAC (Role-Based Access Control) is designed for multi-staff retail operations.
          </p>

          <section className="space-y-6">
            <h3 className="text-xl font-bold">Standard Role Definitions</h3>
            <div className="space-y-4">
              {[
                { name: 'Administrator', access: 'Unrestricted access to financials, settings, and team management.' },
                { name: 'Store Manager', access: 'Full access to inventory, sales records, and returns, but restricted from sensitive business settings.' },
                { name: 'Cashier', access: 'Access restricted to the POS terminal, processing sales, and adding customers only.' },
                { name: 'Stock Clerk', access: 'Restricted to inventory updates, barcode scanning, and low-stock reports.' }
              ].map((role) => (
                <div key={role.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">{role.name}</div>
                    <div className="text-sm text-slate-600">{role.access}</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold">Configuring Granular Overrides</h3>
            <p className="text-slate-600">You can toggle individual technical permissions for any user, regardless of their role:</p>
            <ul className="grid md:grid-cols-2 gap-3">
              {[
                'Allow Price Overrides at Checkout',
                'Allow Processing Refunds/Returns',
                'View Profit Margins on Inventory',
                'Access Historical Multi-Store Reports',
                'Modify Tax & VAT Configurations',
                'Delete Customer Records'
              ].map((perm) => (
                <li key={perm} className="flex items-center gap-2 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {perm}
                </li>
              ))}
            </ul>
          </section>

          <div className="p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden">
            <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
            <h4 className="text-lg font-bold mb-2">Fast-Switch Security</h4>
            <p className="text-slate-300 text-sm">Use 4-digit Quick PINs to switch between staff on a single terminal. Zeneva logs every single transaction to a specific staff ID, ensuring 100% accountability for the cash drawer.</p>
          </div>
        </div>
      )
    },
    {
      id: 'ai-waste',
      title: "Understanding the AI waste tracking algorithm",
      icon: <Cpu className="w-5 h-5" />,
      content: (
        <div className="space-y-8">
          <div className="p-8 bg-black rounded-3xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full"></div>
            <h3 className="text-2xl font-bold mb-4">Forecasting Bias Tracking</h3>
            <p className="text-slate-400">
              Unlike traditional POS systems that just subtract sales from stock, Zeneva's AI analyzes "Shrinkage causality." It identifies exactly where your money is leaking—whether it's spoilage, theft, or administrative error.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
              <h4 className="font-bold">Historical Baseline</h4>
              <p className="text-[13px] text-slate-600 leading-relaxed">The algorithm establishes a 30-day "Normal Turnover Threshold" for every SKU in your store.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">2</div>
              <h4 className="font-bold">FIFO-Aware Decay</h4>
              <p className="text-[13px] text-slate-600 leading-relaxed">For perishables, it uses a First-In-First-Out model to alert you when items are nearing their expected "Turnover Failure" date.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">3</div>
              <h4 className="font-bold">Bias Detection</h4>
              <p className="text-[13px] text-slate-600 leading-relaxed">If stock levels drop without a matched sale or manual waste log, the AI flags it as "Anomalous Shrinkage" for manager review.</p>
            </div>
          </div>

          <section className="p-6 border border-slate-200 rounded-2xl">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Reducing Waste by 22%
            </h4>
            <p className="text-slate-600 mb-4">
              Retailers using Zeneva's waste algorithm typically see a 22% reduction in spoilage within the first 60 days. The AI provides an "Optimal Stock Calculation"—telling you exactly how much to buy to avoid both stockouts and overstock waste.
            </p>
          </section>
        </div>
      )
    },
    {
      id: 'barcode-setup',
      title: "Connecting barcode scanners to the POS",
      icon: <Barcode className="w-5 h-5" />,
      content: (
        <div className="space-y-8">
          <p className="text-slate-600 text-lg">
            Accelerate your checkout speed by 300% with hardware-accelerated barcode scanning. Zeneva supports almost any standard scanner via USB or Bluetooth.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="font-mono text-primary font-bold">USB</div>
              <div>
                <div className="font-bold">Plug & Play (HID Mode)</div>
                <p className="text-sm text-slate-500">Most scanners work out of the box. Zeneva listens for "Rapid Fire" keyboard events and instantly maps them to your SKU database.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="font-mono text-primary font-bold">BT</div>
              <div>
                <div className="font-bold">Bluetooth HID Profile</div>
                <p className="text-sm text-slate-500">Pair your wireless scanner with your tablet or phone. Make sure it's set to "HID Mode" rather than "SPP" for maximum compatibility with the web POS.</p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h4 className="text-lg font-bold">Advanced Scanner Configuration</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>**Suffix/Prefix Stripping**: Zeneva automatically removes common scanner suffixes like 'Enter' or 'Tab'.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>**Scan-to-Quantity**: Double-scanning an item automatically increments its quantity in the cart.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>**Global Catalog Sync**: Scan any manufacturer barcode to automatically pull product details from our global database.</span>
              </li>
            </ul>
          </section>
        </div>
      )
    },
    {
      id: 'low-stock-alerts',
      title: "Setting up automatic low stock alerts",
      icon: <Bell className="w-5 h-5" />,
      content: (
        <div className="space-y-8">
          <p className="text-slate-600 text-lg">
            Never lose a sale to an empty shelf again. Zeneva's proactive alert system monitors your inventory 24/7.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">How to Enable</h4>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-900 shrink-0">1</span>
                  <span className="text-sm text-slate-600">Navigate to **Inventory > Manage Items**.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-900 shrink-0">2</span>
                  <span className="text-sm text-slate-600">Set the **"Reorder Point"** (the minimum stock level).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-900 shrink-0">3</span>
                  <span className="text-sm text-slate-600">Enable **"Push Notifications"** for Mobile or Email.</span>
                </li>
              </ol>
            </div>

            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
              <h4 className="font-bold mb-4">Smart Reordering</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Zeneva doesn't just tell you it's low—it can generate a **Draft Purchase Order** automatically. 
              </p>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 mb-1 uppercase font-bold">Suggested Action</div>
                <div className="font-semibold text-slate-900">Restock 50 units</div>
                <div className="text-xs text-slate-500">Based on 7-day average sales velocity</div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
            <h4 className="font-bold mb-2">Category-Wide Thresholds</h4>
            <p className="text-slate-600 text-sm">
              Instead of setting alerts for every single item, you can set a category-wide threshold (e.g., "Alert me when any item in 'Cold Drinks' drops below 12 units"). 
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentGuide = guides.find(g => g.id === activeTab) || guides[0];

  return (
    <main className="min-h-screen bg-slate-50/50">
      <MarketingHeader />
      
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <InteractiveGrid />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <Link href="/help-center" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-12 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Help Center
          </Link>

          <div className="grid lg:grid-cols-[300px_1fr] gap-12 items-start">
            {/* Sidebar Navigation */}
            <aside className="sticky top-32 space-y-2">
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Mastering Zeneva</div>
              {guides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => setActiveTab(guide.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    activeTab === guide.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                    : 'text-slate-600 hover:text-primary hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className={activeTab === guide.id ? 'text-white' : 'text-slate-400'}>{guide.icon}</span>
                  {guide.title}
                </button>
              ))}

              <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="text-xs font-bold text-primary mb-2 uppercase tracking-tighter">New Update</div>
                  <h4 className="font-bold text-sm mb-4">Multi-Store Sync v2.4 out now.</h4>
                  <Link href="/blog" className="text-[12px] font-bold underline flex items-center gap-2">
                    Read Release Notes <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-16 border border-slate-200 shadow-xl shadow-slate-200/20">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                 {currentGuide.id.replace('-', ' ')}
               </div>
               <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 border-none p-0 leading-tight">
                 {currentGuide.title}
               </h1>
               
               <div className="prose prose-slate max-w-none">
                 {currentGuide.content}
               </div>

               <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div>
                   <h4 className="font-bold text-slate-900 mb-1">Was this article helpful?</h4>
                   <p className="text-sm text-slate-500">Last updated April 2026</p>
                 </div>
                 <div className="flex gap-3">
                   <button className="px-6 py-2 rounded-full border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-colors">Yes, thanks!</button>
                   <button className="px-6 py-2 rounded-full border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-colors">Not quite</button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
