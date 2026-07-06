'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  ShieldCheck, 
  Users, 
  QrCode, 
  ArrowRight, 
  HelpCircle, 
  CheckCircle2, 
  Smartphone, 
  Zap, 
  Lock,
  Percent,
  TrendingUp,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import CinemaHeader from '@/components/layout/cinema-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { cn } from "@/lib/utils";

// FAQ type definition
interface FAQItem {
  question: string;
  answer: string;
}

export default function TerminalPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const features = [
    {
      icon: <Terminal className="h-6 w-6 text-blue-500" />,
      title: "Dedicated Business Account",
      description: "Receive a dedicated virtual bank account under your registered business name for professional checkout transfers."
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      title: "Instant WhatsApp Alerts",
      description: "Payment alerts are automatically broadcast to your phone and up to 5 cashier WhatsApp numbers the second money leaves the customer's account."
    },
    {
      icon: <Users className="h-6 w-6 text-purple-500" />,
      title: "Multi-Staff Collaboration",
      description: "Add up to 5 staff members to receive alerts. Cashiers can confirm transfers instantly without seeing your main account balance or login details."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
      title: "100% Anti-Fraud Protection",
      description: "Stop fake bank alert scams completely. Payments are verified programmatically at the API level via direct bank channels, not easily edited SMS alerts."
    },
    {
      icon: <Zap className="h-6 w-6 text-amber-500" />,
      title: "Automatic Order Matching",
      description: "Connect Terminal payments to specific retail orders in your Zeneva POS app to auto-update inventory and balance sales records."
    },
    {
      icon: <QrCode className="h-6 w-6 text-indigo-500" />,
      title: "Multiple Payment Modes",
      description: "Accepts Bank Transfer, USSD, dynamic QR codes, Apple Pay, and standard card networks (Verve, Visa, Mastercard, and Amex)."
    }
  ];

  const steps = [
    {
      step: 1,
      title: "Create Zeneva Account",
      description: "Register your store on the Zeneva POS and request a virtual business account number."
    },
    {
      step: 2,
      title: "Display Account in Shop",
      description: "Display your generated Terminal account details prominently at your physical checkout stand."
    },
    {
      step: 3,
      title: "Receive Client Transfer",
      description: "Customer scans the QR code or makes a transfer to your business terminal account."
    },
    {
      step: 4,
      title: "Instant Verification",
      description: "Zeneva automatically verifies the transfer and sends an instant WhatsApp broadcast to you and your cashiers."
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: "What is the transaction charge on my Terminal Account?",
      answer: "We offer highly competitive local transaction rates: ₦50 for transfers under ₦1,000; ₦75 for transactions between ₦1,000 and ₦4,999; and ₦100 flat fee for transactions of ₦5,000 and above."
    },
    {
      question: "What will my Zeneva Terminal account name look like?",
      answer: "It will be generated in your business's name with Zeneva prefix (e.g., 'Zeneva / [Your Store Name]'), ensuring professional transparency for your customers during transfers."
    },
    {
      question: "Can my staff see my main bank account balance?",
      answer: "No. Staff only receive the transaction amount alert (e.g., '₦12,500 payment received'). They do not have access to view your terminal balance, withdrawal pages, or main business bank account."
    },
    {
      question: "How long does it take for payments to reflect and settle?",
      answer: "Payments reflect in your Zeneva Terminal dashboard instantly. Settlements are dispatched automatically to your linked personal or corporate bank account in less than 24 hours."
    },
    {
      question: "Do I have to use the Zeneva POS to use Zeneva Terminal?",
      answer: "No, you can use the Terminal as a standalone payment confirmation service. However, integrating it with the Zeneva POS allows you to auto-deduct inventory and match payments directly to sales receipts."
    },
    {
      question: "Can I remove or change staff members?",
      answer: "Yes, you can add or remove cashiers from your dashboard at any time. When a staff member is removed, they instantly stop receiving payment notifications."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <CinemaHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[128px]" />
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[128px]" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1 text-sm font-semibold rounded-full gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Zeneva Terminal is Live
              </Badge>
            </motion.div>

            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Enable Multiple Staff to Receive <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Bank Alerts & Confirm Payments Faster</span>
            </motion.h1>

            <motion.p 
              className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Reduce checkout wait times in your physical store. cashiers can confirm bank transfers instantly on WhatsApp and process sales without calling you or seeing your account balance.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 h-12 shadow-lg shadow-blue-600/20 rounded-lg">
                <Link href="/login" className="flex items-center gap-2">
                  Get Zeneva Terminal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white px-8 h-12 rounded-lg">
                <a href="#how-it-works">How to Get Started</a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Partnership Tag */}
      <section className="border-y border-slate-900 bg-slate-950/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left text-slate-500 text-sm font-semibold tracking-wider">
            <span>POWERED BY ZENEVA FINANCIAL SYSTEMS</span>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-800 hidden md:block" />
            <span>SUPPORTED BY PAYSTACK & PAYMENTS PLATFORMS</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-slate-950/40 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Keep Payments Moving Without Delay
            </h2>
            <p className="text-slate-400">
              Integrate modern bank transfer channels directly into your checkout flow to eliminate fraud and improve store management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 hover:border-slate-800/80 hover:bg-slate-900/40 transition-all duration-300 flex flex-col space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="p-3 bg-slate-900/80 rounded-lg w-fit border border-slate-800">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-100">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed flex-grow">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Protect business section */}
      <section className="py-20 bg-slate-950 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-0.5 rounded-full text-xs font-semibold">
                Store Protection
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Protect your business against staff theft and fake alerts
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Fake alerts are the easiest way for retail stores to lose money. Zeneva Terminal bypasses customer device screenshots entirely by calling bank APIs to verify cash inflow.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Furthermore, cashiers receive instant WhatsApp alerts on their phones directly from the payment channel. This removes the temptation to divert store payments into personal bank accounts.
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  Programmatic verification on WhatsApp
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  Staff see alerts only — balance is kept hidden
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  Zero dependencies on personal SMS messages
                </li>
              </ul>
            </div>
            <div className="lg:pl-10">
              <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-blue-600/5 blur-[80px]" />
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Track Store Revenue Flow
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Monitor your daily sales volume, transaction counts, and settlement payouts directly from your Zeneva Terminal dashboard. Keep control over your finances even when you are off-site.
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Terminal Balance</span>
                    <span className="text-sm text-white font-bold">₦284,500.00</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Cashiers Active</span>
                    <span className="text-sm text-emerald-400 font-bold">4 Attendants</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Last Alert Dispatch</span>
                    <span className="text-xs text-slate-300">Today at 2:44 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Get Started */}
      <section className="py-24 bg-slate-950/40 relative border-t border-slate-900" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How to Get Started
            </h2>
            <p className="text-slate-400">
              Ready to safeguard your physical store? Follow these simple steps to activate Zeneva Terminal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-xl border border-slate-900 bg-slate-900/10 flex flex-col space-y-4">
                <div className="absolute -top-4 left-6 h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-600/30">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-white pt-2">{step.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 bg-slate-950 border-t border-slate-900" id="faq">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Got questions about transaction fees, dashboard security, or payouts? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-900 rounded-xl overflow-hidden bg-slate-900/10 hover:border-slate-800 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex justify-between items-center gap-4 text-white font-medium"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform duration-300 flex-shrink-0",
                      openFaq === idx ? "transform rotate-180" : ""
                    )}
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-900/80">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action banner */}
      <section className="py-20 bg-slate-950 border-t border-slate-900 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/5 blur-[120px]" />
        
        <div className="container mx-auto px-4 max-w-4xl text-center relative space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Turn your store transfers into secure sales
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
            Eliminate cash verification delays, protect your retail inventory automatically, and scale with full accountability today.
          </p>
          <div className="flex justify-center pt-2">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 px-8 rounded-lg shadow-lg shadow-blue-600/20">
              <Link href="/login" className="flex items-center gap-2">
                Setup Zeneva Terminal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
