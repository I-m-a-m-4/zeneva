'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Package, BarChart2, Users, ShieldCheck,
  ChevronRight, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const USE_CASES = [
  {
    id: 'inventory',
    icon: Package,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: 'Inventory Intelligence',
    description: 'Never run out of stock again. Zen AI monitors your entire inventory in real-time, giving you instant visibility into what you have and what you need to reorder.',
    capabilities: [
      { label: 'Real-time stock queries', detail: 'Ask for current stock levels for any product, brand, or category in natural language.' },
      { label: 'Low-stock detection', detail: 'Instantly surface all products falling below their minimum threshold so you can act before you run out.' },
      { label: 'Stock level adjustments', detail: 'Propose manual corrections to any product\'s inventory count. Every change requires your explicit approval before it is applied.' },
      { label: 'Price change proposals', detail: 'Request a price update for any product. Zen AI presents a proposal card showing old vs. new price for your review.' },
    ],
    example: '"Show me all products with less than 10 units in stock."',
    usageKey: 'queryProducts',
  },
  {
    id: 'sales',
    icon: BarChart2,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    title: 'Sales & Analytics',
    description: 'Turn complex sales data into clear, actionable summaries. Get answers to your most important business questions in seconds without touching a spreadsheet.',
    capabilities: [
      { label: 'Daily & weekly revenue summaries', detail: 'Ask for a breakdown of any period\'s revenue, total transactions, and gross profit.' },
      { label: 'Top-selling products ranking', detail: 'Instantly identify which products drive the most sales and revenue across any timeframe.' },
      { label: 'Sales trend comparison', detail: 'Compare performance across custom date ranges to identify growth or decline patterns.' },
      { label: 'Transaction-level detail', detail: 'Drill into specific time periods to understand peak hours and best-performing days.' },
    ],
    example: '"What were our top 5 selling items last week, and how much revenue did they generate?"',
    usageKey: 'getSalesMetrics',
  },
  {
    id: 'customers',
    icon: Users,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50',
    title: 'Customer & Loyalty Management',
    description: 'Understand your customers and reward your most loyal ones. Zen AI gives you instant access to customer profiles and loyalty balances.',
    capabilities: [
      { label: 'Customer profile lookup', detail: 'Search for any customer by name or email to view their contact info, purchase history, and loyalty points.' },
      { label: 'Loyalty point adjustments', detail: 'Propose adding or deducting loyalty points for a customer. Zen AI shows you the current and new balance before any change is made.' },
      { label: 'Customer activity insights', detail: 'Understand how frequently a customer shops and what they typically purchase.' },
    ],
    example: '"Look up customer john@example.com and add 100 loyalty points as a birthday gift."',
    usageKey: 'queryCustomer',
  },
  {
    id: 'alerts',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: 'Smart Alerts & Recommendations',
    description: 'Proactively surface the issues that need your attention so you can focus on running your business instead of hunting for problems.',
    capabilities: [
      { label: 'Low stock alerts', detail: 'Get a consolidated view of every product running dangerously low, prioritized by urgency.' },
      { label: 'Best-seller identification', detail: 'Find out which products deserve more shelf space or promotional investment.' },
      { label: 'Slow-mover detection', detail: 'Identify products that are not selling and may need promotion or removal from inventory.' },
    ],
    example: '"What products should I restock urgently before the weekend?"',
    usageKey: 'getLowStockAlerts',
  },
  {
    id: 'guardrails',
    icon: ShieldCheck,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
    title: 'Built-in Safety & Guardrails',
    description: 'You remain in complete control at all times. Zen AI is designed to advise — never to act unilaterally on your data.',
    capabilities: [
      { label: 'Approval-required writes', detail: 'Every data change — stock, price, loyalty points — is presented as a Proposal Card. Nothing is written until you click "Approve".' },
      { label: 'No deletions ever', detail: 'Zen AI has absolutely no ability to delete products, transactions, customers, or any other record. Deletions must be done manually.' },
      { label: 'Scope isolation', detail: 'Zen AI can only see and interact with data belonging to your business. It cannot access data from any other business on the platform.' },
      { label: 'Prompt injection protection', detail: 'All incoming messages are scanned for jailbreak attempts. If detected, the request is blocked and logged automatically.' },
    ],
    example: '"Reduce the price of Pepsi from ₦500 to ₦450." — Zen AI will show a Proposal Card first.',
    usageKey: null,
  },
];

export default function ZenAIUseCasesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || !firestore) return;
    getDoc(doc(firestore, `users/${user.uid}`)).then(snap => {
      if (!snap.exists()) return;
      const bizId = snap.data().businessId;
      if (!bizId) return;
      getDoc(doc(firestore, 'businessInstances', bizId)).then(bizSnap => {
        if (bizSnap.exists()) {
          setUsageCounts(bizSnap.data().aiToolUsageCounts || {});
        }
      });
    });
  }, [user, firestore]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="max-w-3xl mx-auto w-full px-5 pt-7 pb-6">
        <Link href="/ai-insights" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Chat
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Zen AI
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">What can Zen AI do?</h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-lg leading-relaxed">
              A full reference of every capability — what Zen AI can read, propose, and protect.
            </p>
          </div>
          <Button asChild size="sm" className="flex-shrink-0 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold">
            <Link href="/ai-insights">Open Chat <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>
      </div>

      {/* Use Cases List */}
      <div className="max-w-3xl mx-auto w-full px-5 pb-20 flex flex-col gap-4">
        {USE_CASES.map((uc, idx) => {
          const Icon = uc.icon;
          const count = uc.usageKey ? (usageCounts[uc.usageKey] ?? 0) : null;

          return (
            <motion.div
              key={uc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, type: 'spring', stiffness: 280, damping: 24 }}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${uc.iconBg}`}>
                  <Icon className={`w-5 h-5 ${uc.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900">{uc.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{uc.description}</p>
                </div>
                {count !== null && (
                  <div className="flex-shrink-0 flex flex-col items-center text-center px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 min-w-[52px]">
                    <span className="text-base font-bold text-gray-800 leading-none">{count.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-none">uses</span>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="px-5 py-4 space-y-3">
                {uc.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">{cap.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cap.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Example prompt */}
              <div className="px-5 pb-4">
                <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-200">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Try asking</span>
                  <p className="text-xs text-gray-700 font-medium italic leading-relaxed">{uc.example}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


