'use client';

import * as React from 'react';
import { useState } from 'react';
import { Check, ArrowRight, Zap, Shield, Sparkles, Building2, Store, Users, BarChart3, Cloud } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const plans = [
  {
    name: "Starter",
    id: "plan-starter",
    href: "/signup?plan=starter",
    priceMonthly: "₦0",
    priceYearly: "₦0",
    description: "Perfect for single shops starting their digital journey.",
    features: [
      "Basic Inventory Tracking",
      "Single Store Management",
      "Daily Sales Reports (Email)",
      "Up to 50 Products",
      "Standard POS Interface",
      "Offline Mode Support",
    ],
    buttonText: "Get Started for Free",
    popular: false,
    icon: <Store className="w-6 h-6 text-slate-500" />,
  },
  {
    name: "Business Pro",
    id: "plan-pro",
    href: "/signup?plan=pro",
    priceMonthly: "₦8,079",
    priceYearly: "₦77,550",
    description: "Empower your growing business with smart automation.",
    features: [
      "Everything in Starter",
      "Unlimited Products",
      "Multi-Store Synchronization",
      "Zen AI Stock Predictions",
      "Smart Reorder Alerts",
      "Advanced Analytics Dashboard",
      "Customer Loyalty Program",
      "24/7 Priority Support",
    ],
    buttonText: "Start 14-day Free Trial",
    popular: true,
    icon: <Zap className="w-6 h-6 text-orange-500" />,
  },
  {
    name: "Enterprise Plus",
    id: "plan-enterprise",
    href: "/signup?plan=enterprise",
    priceMonthly: "₦21,580",
    priceYearly: "₦207,170",
    description: "Full-scale solution for high-volume retail chains.",
    features: [
      "Everything in Pro",
      "Unlimited Store Locations",
      "Advanced Audit Integrity Logs",
      "Zen AI Business Analysis",
      "Custom User Permissions",
      "API Access for Integrations",
      "Dedicated Account Manager",
      "Custom Branding on Receipts",
    ],
    buttonText: "Contact Sales",
    popular: false,
    icon: <Building2 className="w-6 h-6 text-slate-700" />,
  },
];

const faqs = [
  {
    question: "How does the 14-day free trial work?",
    answer: "You can start your 14-day free trial of the Business Pro plan without entering any credit card information. At the end of the trial, you can choose to subscribe or move to our Free Starter plan.",
  },
  {
    question: "Can I upgrade or downgrade my plan anytime?",
    answer: "Yes! You can change your plan at any time from your Zeneva dashboard. If you upgrade, the new pricing takes effect immediately. If you downgrade, the change will take effect at the start of your next billing cycle.",
  },
  {
    question: "Does Zeneva work offline?",
    answer: "Absolutely. Our POS module is designed to work even when your internet connection is unstable. Once you're back online, your sales data will automatically sync with your cloud dashboard.",
  },
  {
    question: "What is Zen AIStock Prediction?",
    answer: "Zen AI is our proprietary intelligence engine that analyzes your historical sales patterns to predict future stock needs. It helps you avoid stockouts and reduces over-stocking of slow-moving items.",
  },
  {
    question: "How many store locations can I manage?",
    answer: "The Starter plan supports 1 location, Business Pro supports up to 5, and Enterprise Plus allows for unlimited locations with centralized management.",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-white selection:bg-orange-100 selection:text-orange-900">
      <MarketingHeader />

      <main className="pt-32 pb-20 overflow-hidden">
        {/* Hero Section */}
        <section className="relative px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="absolute inset-0 -top-24 -z-10 overflow-hidden">
            <svg
              className="absolute left-[50%] top-0 h-[64rem] w-[128rem] -translate-x-[50%] [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)]"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="grid-pattern"
                  width={30}
                  height={30}
                  x="50%"
                  y={-1}
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M.5 30V.5H30" fill="none" stroke="rgba(200,200,200,0.2)" strokeDasharray="4 2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" strokeWidth={0} fill="url(#grid-pattern)" />
            </svg>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 mb-6">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Pricing Plans</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Fuel your business growth with <br className="hidden md:block" />
              <span className="text-orange-500">transparent pricing</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
              From local boutiques to nationwide retail chains, Zeneva provides the tools you need to scale efficiently. Choose the plan that fits your ambition.
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-4 mb-16">
              <span className={cn("text-sm font-medium transition-colors", billingCycle === 'monthly' ? "text-slate-900" : "text-slate-400")}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-14 h-7 bg-slate-200 rounded-full p-1 transition-colors hover:bg-slate-300"
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
                  billingCycle === 'yearly' ? "translate-x-7" : "translate-x-0"
                )} />
              </button>
              <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", billingCycle === 'yearly' ? "text-slate-900" : "text-slate-400")}>
                Yearly
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  SAVE 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col p-8 rounded-3xl transition-all duration-500 hover:translate-y-[-4px]",
                  plan.popular 
                    ? "bg-slate-900 text-white shadow-2xl ring-4 ring-orange-500/20" 
                    : "bg-white border border-slate-200 shadow-sm hover:shadow-xl"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold uppercase tracking-tight">
                    <Zap className="w-3 h-3 fill-current" />
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                    plan.popular ? "bg-white/10" : "bg-slate-50"
                  )}>
                    {plan.icon}
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2", plan.popular ? "text-white" : "text-slate-900")}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold tracking-tight">
                      {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                    </span>
                    <span className={cn("text-sm font-medium", plan.popular ? "text-slate-400" : "text-slate-500")}>
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <p className={cn("text-sm leading-relaxed", plan.popular ? "text-slate-400" : "text-slate-600")}>
                    {plan.description}
                  </p>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 rounded-full p-0.5",
                        plan.popular ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-500"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                      <span className={cn("text-sm", plan.popular ? "text-slate-300" : "text-slate-700")}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  className={cn(
                    "w-full h-12 text-base font-bold rounded-xl transition-all duration-300",
                    plan.popular
                      ? "bg-orange-500 hover:bg-orange-600 text-white border-0"
                      : "bg-slate-900 hover:bg-slate-800 text-white border-0"
                  )}
                >
                  <Link href={plan.href}>
                    {plan.buttonText}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Comparison Link */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Need something more custom?</h2>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto">
              We offer bespoke solutions for hardware integrations, multi-country taxes, and large-scale ERP migrations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Shield className="w-5 h-5 text-green-600" />
                Data Integrity Audit
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Users className="w-5 h-5 text-blue-600" />
                Unlimited Multi-user
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Cloud className="w-5 h-5 text-orange-500" />
                Enterprise Hybrid Sync
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600">Everything you need to know about Zeneva plans and billing.</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-slate-200">
                <AccordionTrigger className="text-left text-lg font-semibold text-slate-900 hover:no-underline hover:text-orange-500 transition-colors py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Trust/Social Proof */}
        <section className="py-10 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">Trusted by modern retailers across Nigeria</p>
            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 opacity-40 grayscale pointer-events-none">
              <span className="text-2xl font-black italic tracking-tighter">ZENITH</span>
              <span className="text-2xl font-black italic tracking-tighter">VINTAGE</span>
              <span className="text-2xl font-black italic tracking-tighter">RETAIL CO.</span>
              <span className="text-2xl font-black italic tracking-tighter">SOLO</span>
              <span className="text-2xl font-black italic tracking-tighter">NOIRE</span>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
