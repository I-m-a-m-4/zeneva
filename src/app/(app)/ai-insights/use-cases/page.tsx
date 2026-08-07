'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Package, BarChart2, Users, ShieldCheck, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ZenAIUseCasesPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 flex flex-col relative overflow-hidden">
      
      {/* ── Background Decoration ── */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none -z-10" />

      {/* ── Header ── */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-8 pb-12">
        <div className="mb-8">
          <Link href="/ai-insights" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chat
          </Link>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> Zen AI
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Your Intelligent <br className="hidden md:block"/> Business Co-Pilot
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-xl leading-relaxed">
              Discover how Zen AI can automate your daily operations, provide instant insights, and help you make data-driven decisions seamlessly.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all font-semibold bg-orange-500 hover:bg-orange-600 text-white">
              <Link href="/ai-insights">
                Start Chatting <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content Bento Grid ── */}
      <div className="max-w-5xl mx-auto w-full px-6 pb-24 flex-1">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* ── Inventory Management ── */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
            <Card className="h-full border border-orange-200 shadow-sm bg-orange-50/30 overflow-hidden relative">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Inventory Intelligence</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Never run out of stock again. Zen AI monitors your inventory in real-time, calculating exactly what you have and what you need.
                </p>
                <div className="space-y-3">
                  {[
                    "Check real-time stock levels for any product or category",
                    "Automatically scan and identify low-stock items",
                    "Propose manual stock level adjustments (requires your approval)",
                    "Propose product price changes (requires your approval)"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-white/50 rounded-xl border border-orange-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Try asking:</span>
                  <p className="text-gray-900 font-medium italic">"Show me all products that are currently low on stock."</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Sales & Reporting ── */}
          <motion.div variants={itemVariants} className="md:col-span-1 lg:col-span-1">
            <Card className="h-full border border-orange-200 shadow-sm bg-orange-50/30 overflow-hidden relative">
              <CardContent className="p-8 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Sales & Analytics</h2>
                <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                  Turn complex sales data into simple, actionable summaries instantly.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Summarize daily/weekly revenue and profit",
                    "Identify top-selling products instantly",
                    "Compare custom date ranges"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white/50 rounded-xl border border-orange-100 mt-auto">
                  <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 block">Try asking:</span>
                  <p className="text-orange-900 font-medium text-sm italic">"What were our top 3 selling items yesterday?"</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Customer Loyalty ── */}
          <motion.div variants={itemVariants} className="md:col-span-1 lg:col-span-1">
            <Card className="h-full border border-orange-200 shadow-sm bg-orange-50/30 overflow-hidden relative">
              <CardContent className="p-8 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Customer Loyalty</h2>
                <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                  Manage your relationships and reward your best customers with ease.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Look up customer details and points balance",
                    "Propose manual adjustments to loyalty points"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white/50 rounded-xl border border-orange-100 mt-auto">
                  <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 block">Try asking:</span>
                  <p className="text-orange-900 font-medium text-sm italic">"Add 50 loyalty points to john@example.com"</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Security & Guardrails ── */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
            <Card className="h-full border border-orange-200 shadow-sm bg-orange-50/30 overflow-hidden relative">
              <CardContent className="p-8 h-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Built-in Guardrails & Security</h2>
                <p className="text-gray-700 leading-relaxed">
                  You remain in complete control. Zen AI acts purely as an advisor—it <strong>never</strong> makes destructive changes like deleting products or transactions. For any action that modifies data (like updating stock, prices, or loyalty points), Zen AI will always present a <strong>Proposal Card</strong> that strictly requires your explicit approval before the change is written to the database.
                </p>
              </CardContent>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
