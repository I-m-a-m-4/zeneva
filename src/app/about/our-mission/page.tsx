'use client';

import {
  TrendingUp,
  Target,
  Zap,
  ShieldCheck,
  BrainCircuit,
  Users,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  Bot,
  Check,
  Search,
  ShoppingCart,
  Store
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
export default function OurMissionPage() {
  return (
    <div className="h-full bg-[#F9F8F6] text-slate-900 font-sans selection:bg-primary/20 overflow-x-hidden">

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="aura-background"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              Our Mission
            </span>
            <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter font-display text-slate-900 mb-6 leading-[0.95]">
              Turning Retail Data Into <span className="text-slate-400 relative inline-block">Clear Decisions.
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4"></path></svg>
              </span>
            </h1>
            <p className="text-xl text-slate-600 font-normal leading-relaxed mb-8 max-w-lg">
              Retail businesses don’t fail because owners don’t work hard. <br className="hidden md:block" />
              They fail because they’re forced to operate without clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="rounded-full px-8 h-12 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all">
                  Join the Mission
                </Button>
              </Link>
            </div>
          </div>

          {/* abstract visual */}
          <div className="relative h-[400px] lg:h-[500px] bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 flex flex-col justify-center items-center overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/50 pattern-bg opacity-50"></div>
            <div className="relative z-10 text-center space-y-6 max-w-xs">
              <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-xl ring-4 ring-white">
                <Bot className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-sm font-medium text-slate-600 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Stockout Warning: Rice (50kg)
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-sm font-medium text-slate-600 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Recommended Order: 25 Units
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-16 h-16 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse delay-700"></div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-6 bg-white border-y border-slate-100 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-slate-900 mb-6 font-display">The Clarity Gap</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Every day, store owners make dozens of decisions. Most are made reactively — based on instinct, incomplete data, or problems that have already happened.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            {[
              { icon: ShoppingCart, text: "What to restock", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: Zap, text: "What to discount", color: "text-amber-500", bg: "bg-amber-50" },
              { icon: TrendingUp, text: "What to promote", color: "text-emerald-500", bg: "bg-emerald-50" },
              { icon: ShieldCheck, text: "What to stop buying", color: "text-red-500", bg: "bg-red-50" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-colors">
                <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-900">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-2xl font-medium text-slate-900 inline-block relative">
              <span className="relative z-10">Zeneva exists to change that.</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-primary/20 -z-0"></span>
            </p>
          </div>
        </div>
      </section>

      {/* Why Zen AI Exists */}
      <section className="py-24 px-6 bg-[#F9F8F6]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-medium tracking-tight font-display text-slate-900 mb-8">Why Zen AI Exists</h2>
              <div className="prose prose-lg text-slate-600 leading-relaxed">
                <p className="mb-6">
                  Zen AI was built to solve a specific problem: <strong className="text-slate-900">Retail businesses generate massive amounts of data, but almost none of it turns into usable judgment.</strong>
                </p>
                <ul className="space-y-4 list-none pl-0 mb-8">
                  <li className="flex items-center gap-3 text-slate-800 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Sales happen.
                  </li>
                  <li className="flex items-center gap-3 text-slate-800 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Inventory moves.
                  </li>
                  <li className="flex items-center gap-3 text-slate-800 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Customers buy and leave.
                  </li>
                </ul>
                <p className="mb-4">Yet the system never tells the owner:</p>
                <div className="space-y-3 font-semibold text-slate-900 pl-4 border-l-2 border-primary">
                  <p>What does this mean?</p>
                  <p>What should I do next?</p>
                  <p>Where am I silently losing money?</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-[40px] transform rotate-3"></div>
              <div className="relative bg-white p-8 lg:p-12 rounded-[40px] shadow-xl border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-8">Our Core Belief</h3>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Foresight, not hindsight</h4>
                      <p className="text-slate-500 text-sm mt-1">Predicting problems before they happen.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Decisions, not dashboards</h4>
                      <p className="text-slate-500 text-sm mt-1">Actionable steps, not just charts.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Prevention, not post-mortems</h4>
                      <p className="text-slate-500 text-sm mt-1">Stopping losses at the source.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Zen AI Actually Does */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-primary font-bold tracking-wider uppercase text-sm mb-4 block">Capabilities</span>
            <h2 className="text-3xl lg:text-5xl font-medium tracking-tight font-display mb-8">What Zen AI Actually Does</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {["Not a chatbot", "Not generic analytics", "Not surface-level reporting"].map((tag, i) => (
                <span key={i} className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-4">From Data to Decisions</h3>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> What is selling — and why</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> What will sell next — and when</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Where revenue is being lost</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-4">Preventing Lost Sales</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                A customer walking out because a product is unavailable is a system failure. Zen AI prevents that.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-4">Freeing Trapped Capital</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Turns dead stock into working capital by recommending:
              </p>
              <div className="flex flex-wrap gap-2">
                {['Discount', 'Bundle', 'Exit'].map(action => (
                  <span key={action} className="text-xs px-2 py-1 bg-white/10 rounded text-white">{action}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built For Real Conditions */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-medium tracking-tight font-display text-slate-900">Built for Real Retail Conditions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[32px] bg-[#F9F8F6] border border-slate-100 flex flex-col items-start min-h-[300px] hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-700 mb-6">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Offline-First Foundation</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Sales continue without internet. Transactions queue automatically. Zen AI never loses context.
              </p>
            </div>
            <div className="p-10 rounded-[32px] bg-[#F9F8F6] border border-slate-100 flex flex-col items-start min-h-[300px] hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-700 mb-6">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Unified Intelligence</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                POS, inventory, CRM, and storefront all feed into one shared data layer. No silos. No conflicting numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Vision CTA */}
      <section className="py-32 px-6 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pattern-bg opacity-30"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-sm font-bold text-primary tracking-widest uppercase mb-6 block">The Long-Term Vision</span>
          <h2 className="text-4xl lg:text-6xl font-medium tracking-tighter font-display text-slate-900 mb-8 leading-tight">
            Retail decisions effectively proactive. <br />
            <span className="text-slate-400">Sales losses visible before they happen.</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-light">
            We are building a future where business owners spend time on strategy, not firefighting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105">
                Join the Mission
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
