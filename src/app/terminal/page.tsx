'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  Star, 
  Globe, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Workflow,
  MessageSquare,
  Users,
  Terminal,
  Zap,
  Lock,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

export default function TerminalPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs: FAQItem[] = [
    {
      question: "What is the transaction charge on my terminal Account?",
      answer: "₦50 - For transactions below ₦1000, ₦75 - For transactions below ₦5000, ₦100 - For transactions from ₦5000 & above."
    },
    {
      question: "What would my Zeneva Terminal account name be?",
      answer: "It will have your business name and Zeneva."
    },
    {
      question: "How many staff can I add to my terminal?",
      answer: "You can add up to 5 staff."
    },
    {
      question: "Will my staff be able to see my account balance?",
      answer: "No. They will only be able to see the amount sent per time."
    },
    {
      question: "Can I remove a staff I have added before?",
      answer: "Yes and they will stop receiving payment alerts for your business."
    },
    {
      question: "How long does it take for payments to reflect in my account?",
      answer: "Payments reflect in your Terminal account Immediately. You receive the settlement in personal bank account in less than 24 hours."
    },
    {
      question: "Do I have to be using Zeneva to use Zeneva terminal?",
      answer: "No. However, if you use Zeneva, you can connect your terminal account to your Zeneva store."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body antialiased selection:bg-primary/30 selection:text-slate-900">
      {/* MARKETING HEADER */}
      <MarketingHeader />

      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-50 border-b border-slate-100">
        <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, hsl(var(--border)) 1px, transparent 0%)', backgroundSize: '50px 50px' }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1 text-sm font-semibold rounded-full gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              Zeneva Anti-Theft Terminal
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-900 leading-tight font-bricolage">
              Enable multiple staff receive bank <br /> alerts & <span className="text-primary font-normal">confirm payments faster.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
              Reduce wait time in your physical store when staff can confirm payments without calling you or seeing your account balance.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl transition-all">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border-2 border-slate-200/60 bg-white p-2 overflow-hidden shadow-xl">
              <img 
                src="/images/herobg.png" 
                alt="Zeneva Terminal Hero Visual" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </header>

      {/* SECOND SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 sm:p-10 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:border-slate-200/80 hover:shadow-sm transition-all space-y-4">
            <h3 className="text-2xl font-bold text-slate-900 font-bricolage">Keep payments going even when you’re not available.</h3>
            <p className="text-slate-600 leading-relaxed font-light">
              Connect your staff to Terminal so they can get immediate confirmation of payments on WhatsApp & process orders without delay.
            </p>
          </div>
          <div className="p-8 sm:p-10 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:border-slate-200/80 hover:shadow-sm transition-all space-y-4">
            <h3 className="text-2xl font-bold text-slate-900 font-bricolage">Open your business to local & international payments.</h3>
            <p className="text-slate-600 leading-relaxed font-light">
              Your Zeneva Terminal account accepts payment through Bank Transfer, USSD, QR Code, Apple Pay, & Card payments (Verve, Visa, Mastercard & American Express)
            </p>
          </div>
        </div>
      </section>

      {/* THIRD SECTION */}
      <section className="py-24 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-light tracking-tight text-slate-900 font-bricolage">
            Powered by Zeneva, <br /> Supported by <span className="text-primary font-normal">Paystack.</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-light">
            Match Terminal payments to specific orders for <br className="hidden sm:block"/> efficient inventory tracking with the Zeneva app.
          </p>
          
          <div className="relative max-w-3xl mx-auto py-12 flex justify-center">
            <div className="relative w-full max-w-xl aspect-video rounded-2xl border-2 border-slate-200/80 bg-white p-2 overflow-hidden shadow-xl">
              <img src="/images/kimberly.png" alt="Merchant" className="w-full h-full object-cover rounded-xl" />
              <div className="absolute -bottom-6 -right-6 w-36 sm:w-48 aspect-square rounded-xl border-2 border-slate-200 bg-white p-1.5 shadow-2xl">
                <img src="/images/sally-sm.png" alt="Attendant Overlay" className="w-full h-full object-cover rounded-lg" />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/95 text-white px-8 h-14 rounded-xl font-semibold transition-all">
                Get Zeneva Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOURTH SECTION (ANTI-THEFT FOCUS) */}
      <section className="py-24 bg-white space-y-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 px-3 py-1 text-xs font-semibold rounded-full">
              Anti-Theft Protection
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 leading-tight font-bricolage">
              Protect your business <br /> from <span className="text-primary font-normal">internal fraud & fake alerts</span>
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed font-light">
              With fast transfers & zero downtimes, you can protect your business from fake bank alert scams or a staff diverting funds by using their personal account.
            </p>
            <p className="text-slate-600 leading-relaxed font-light">
              Because alerts are triggered directly from the banking system and sent to the owner and staff instantly, cashiers can immediately confirm payments without any manual phone validation or screenshot checks.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white rounded-xl transition-all">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-2 overflow-hidden shadow-lg">
              <img src="/images/lefttrf.png" alt="Security Illustration" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-6">
            <Badge className="bg-emerald-50/80 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs font-semibold rounded-full">
              Audit Transparency
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 leading-tight font-bricolage">
              Track how money <br /> comes in & out of your <br className="hidden sm:block" /> business.
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed font-light">
              View your revenue flow, spendings and withdrawals on your Zeneva Terminal dashboard. Full financial audit logs ensure no money goes missing.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white rounded-xl transition-all">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 lg:order-1 flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-2 overflow-hidden shadow-lg">
              <img src="/images/bottom.png" alt="Revenue Flow Illustration" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS & TERMINAL ABOUT */}
      <section className="py-24 bg-slate-50/50 border-t border-slate-100" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* Terminal About */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <h5 className="text-2xl font-light text-slate-800 leading-relaxed font-bricolage">
                The Zeneva app will help you manage inventory and sales from your physical store & online sales platforms seamlessly.
              </h5>
              <div className="pt-2">
                <Link href="/">
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl h-12 px-6">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-md aspect-video rounded-2xl border-2 border-slate-100 bg-white p-2 overflow-hidden shadow-lg">
                <img src="/images/abt-terminal.png" alt="Zeneva Features Dashboard" className="w-full h-full object-cover rounded-xl" />
              </div>
            </div>
          </div>

          {/* How To Get Started */}
          <div className="space-y-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center font-bricolage">How To Get Started</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">1</div>
                  <p className="text-slate-700 text-lg pt-1 font-light">Sign up to get a Zeneva Terminal account.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">2</div>
                  <p className="text-slate-700 text-lg pt-1 font-light">Wait for your confirmation email with your Zeneva Terminal account details.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">3</div>
                  <p className="text-slate-700 text-lg pt-1 font-light">Log into your Terminal dashboard.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">4</div>
                  <p className="text-slate-700 text-lg pt-1 font-light">Add the staff you want to receive payment alerts on your Zeneva Terminal dashboard.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">5</div>
                  <p className="text-slate-700 text-lg pt-1 font-light">Put up your Terminal account number in your physical store and start receiving payments notifications for you and your staff seamlessly!</p>
                </div>
              </div>
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-sm aspect-square rounded-2xl border-2 border-slate-100 bg-white p-2 overflow-hidden shadow-lg">
                  <img src="/images/howitworks.png" alt="Happy Retailer" className="w-full h-full object-cover rounded-xl" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center font-bricolage">
            These Businesses Use and <br /> Love Zeneva Terminal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/20 hover:border-slate-200 transition-all flex flex-col justify-between h-full shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg">SK</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-slate-900 font-bricolage">Serahkassim</h4>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-light">
                  "I’ve created many bank accounts because of payment confirmation issues which I’ve been able to stop now because of Zeneva Terminal. What I love the most is that all my staff and even me, get bank alerts at the same time. This saves me so much stress."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-600 hover:text-blue-500 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://www.serahkassim.com.ng/" target="_blank" rel="noopener noreferrer">www.serahkassim.com.ng</a>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/20 hover:border-slate-200 transition-all flex flex-col justify-between h-full shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg">FS</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-slate-900 font-bricolage">247 Fragrance Store</h4>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-light">
                  "The fact that I don’t need to be present to close transactions is what I love the most about Zeneva Terminal. Thank you so much Zeneva for this solution. It is really helpful for my business."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-600 hover:text-blue-500 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://247fragrancestore.ng/" target="_blank" rel="noopener noreferrer">www.247fragrancestore.ng</a>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/20 hover:border-slate-200 transition-all flex flex-col justify-between h-full shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg">TC</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-slate-900 font-bricolage">Tots and Cuddles</h4>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-light">
                  "I have always envisaged my business running without reliance on me & now I’m able to achieve that with Zeneva Terminal. I love that my staff can carry on without reaching out to me, I love that the alert is received instantly, I love that we get it in our account within 24 hours."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-600 hover:text-blue-500 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://www.totsandcuddles.com.ng/" target="_blank" rel="noopener noreferrer">www.totsandcuddles.com.ng</a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQS */}
      <section className="py-24 bg-slate-50/50 border-t border-slate-100" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center font-bricolage">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-white hover:border-slate-200 transition-all shadow-sm">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex justify-between items-center gap-4 text-slate-900 font-semibold text-lg"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-slate-500 transition-transform duration-300 flex-shrink-0",
                    openFaq === idx ? "transform rotate-180" : ""
                  )} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm font-light">
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

      {/* MARKETING FOOTER */}
      <MarketingFooter />
    </div>
  );
}
