'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  Menu, 
  X, 
  Star, 
  Globe, 
  ArrowRight,
  Phone,
  Mail,
  Instagram,
  Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { AppConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

export default function TerminalPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-8">
              <Link href="/">
                <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-12 w-auto cursor-pointer" />
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                <a href="#how-it-works" className="hover:text-white transition-colors">How to Get Started</a>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                <Link href="/blog" className="hover:text-white transition-colors">Learn</Link>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/15">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="text-slate-400 hover:text-white focus:outline-none p-2"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden bg-slate-950 border-b border-slate-900 px-4 pt-2 pb-6 space-y-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-900"
              >
                How to Get Started
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-900"
              >
                FAQ
              </a>
              <Link 
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-900"
              >
                Learn
              </Link>
              <div className="pt-4 border-t border-slate-900 flex flex-col gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="outline" className="w-full border-slate-800 text-slate-300 hover:bg-slate-900">
                    Login
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Get Zeneva Terminal
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Enable multiple staff receive bank <br /> alerts & confirm payments faster.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Reduce wait time in your physical store when staff can confirm payments without <br className="hidden lg:block" /> calling you or seeing your account balance.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-14 text-base font-semibold shadow-lg shadow-blue-600/20 rounded-xl">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-2xl">
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
      <section className="py-20 bg-slate-950 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 sm:p-10 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800/80 transition-all space-y-4">
            <h3 className="text-2xl font-bold text-white">Keep payments going even when you’re not available.</h3>
            <p className="text-slate-400 leading-relaxed">
              Connect your staff to Terminal so they can get immediate confirmation of payments on WhatsApp & process orders without delay.
            </p>
          </div>
          <div className="p-8 sm:p-10 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800/80 transition-all space-y-4">
            <h3 className="text-2xl font-bold text-white">Open your business to local & international payments.</h3>
            <p className="text-slate-400 leading-relaxed">
              Your Zeneva Terminal account accepts payment through Bank Transfer, USSD, QR Code, Apple Pay, & Card payments (Verve, Visa, Mastercard & American Express)
            </p>
          </div>
        </div>
      </section>

      {/* THIRD SECTION */}
      <section className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Powered by Zeneva, <br /> Supported by Paystack.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Match Terminal payments to specific orders for <br className="hidden sm:block"/> efficient inventory tracking with the Zeneva app.
          </p>
          
          <div className="relative max-w-3xl mx-auto py-12 flex justify-center">
            {/* Double image layout mimicking Bumpa */}
            <div className="relative w-full max-w-xl aspect-video rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-2xl">
              <img src="/images/kimberly.png" alt="Merchant" className="w-full h-full object-cover rounded-xl" />
              <div className="absolute -bottom-6 -right-6 w-36 sm:w-48 aspect-square rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl">
                <img src="/images/sally-sm.png" alt="Attendant Overlay" className="w-full h-full object-cover rounded-lg" />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-14 rounded-xl font-semibold">
                Get Zeneva Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOURTH SECTION (GRID TRANSFERS) */}
      <section className="py-24 bg-slate-950 border-t border-slate-900 space-y-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h3 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Protect your business <br className="hidden sm:block"/> from theft
            </h3>
            <p className="text-slate-400 text-lg leading-relaxed">
              With fast transfers & zero downtimes, you can <br className="hidden lg:block" /> protect your business from fake bank alert or a <br className="hidden lg:block"/> staff using their personal account.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-xl">
              <img src="/images/lefttrf.png" alt="Security Illustration" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-6">
            <h3 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Track how money <br className="hidden sm:block" /> comes in & out of your <br className="hidden sm:block" /> business.
            </h3>
            <p className="text-slate-400 text-lg leading-relaxed">
              View your revenue flow, spendings and <br className="hidden lg:block"/> withdrawals on your Zeneva Terminal <br className="hidden lg:block" /> dashboard
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  Get Zeneva Terminal
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 lg:order-1 flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-xl">
              <img src="/images/bottom.png" alt="Revenue Flow Illustration" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS & TERMINAL ABOUT */}
      <section className="py-24 bg-slate-950 border-t border-slate-900" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* Terminal About */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <h5 className="text-2xl font-bold text-white leading-relaxed">
                The Zeneva app will help you manage inventory and sales from your physical store & online sales platforms seamlessly.
              </h5>
              <div className="pt-2">
                <Link href="/">
                  <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl h-12 px-6">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-md aspect-video rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-xl">
                <img src="/images/abt-terminal.png" alt="Zeneva Features Dashboard" className="w-full h-full object-cover rounded-xl" />
              </div>
            </div>
          </div>

          {/* How To Get Started */}
          <div className="space-y-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">How To Get Started</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0">1</div>
                  <p className="text-slate-300 text-lg pt-1">Sign up to get a Zeneva Terminal account.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0">2</div>
                  <p className="text-slate-300 text-lg pt-1">Wait for your confirmation email with your Zeneva Terminal account details.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0">3</div>
                  <p className="text-slate-300 text-lg pt-1">Log into your Terminal dashboard.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0">4</div>
                  <p className="text-slate-300 text-lg pt-1">Add the staff you want to receive payment alerts on your Zeneva Terminal dashboard.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0">5</div>
                  <p className="text-slate-300 text-lg pt-1">Put up your Terminal account number in your physical store and start receiving payments notifications for you and your staff seamlessly!</p>
                </div>
              </div>
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-sm aspect-square rounded-2xl border border-slate-900 bg-slate-900/10 p-2 overflow-hidden shadow-xl">
                  <img src="/images/howitworks.png" alt="Happy Retailer" className="w-full h-full object-cover rounded-xl" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">
            These Businesses Use and <br /> Love Zeneva Terminal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-lg">SK</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-white">Serahkassim</h4>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed text-sm">
                  "I’ve created many bank accounts because of payment confirmation issues which I’ve been able to stop now because of Zeneva Terminal. What I love the most is that all my staff and even me, get bank alerts at the same time. This saves me so much stress."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://www.serahkassim.com.ng/" target="_blank" rel="noopener noreferrer">www.serahkassim.com.ng</a>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-lg">FS</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-white">247 Fragrance Store</h4>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed text-sm">
                  "The fact that I don’t need to be present to close transactions is what I love the most about Zeneva Terminal. Thank you so much Zeneva for this solution. It is really helpful for my business."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://247fragrancestore.ng/" target="_blank" rel="noopener noreferrer">www.247fragrancestore.ng</a>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-lg">TC</div>
                  <div>
                    <div className="flex items-center text-amber-500 gap-0.5 mb-1">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                    </div>
                    <h4 className="font-semibold text-white">Tots and Cuddles</h4>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed text-sm">
                  "I have always envisaged my business running without reliance on me & now I’m able to achieve that with Zeneva Terminal. I love that my staff can carry on without reaching out to me, I love that the alert is received instantly, I love that we get it in our account within 24 hours."
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
                <Globe className="h-3.5 w-3.5" />
                <a href="https://www.totsandcuddles.com.ng/" target="_blank" rel="noopener noreferrer">www.totsandcuddles.com.ng</a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQS */}
      <section className="py-24 bg-slate-950 border-t border-slate-900" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-900/10 hover:border-slate-800/80 transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex justify-between items-center gap-4 text-white font-semibold text-lg"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-slate-400 transition-transform duration-300 flex-shrink-0",
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
                      <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-slate-900/80 pt-4 text-sm">
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

      {/* FOOTER & DOWNLOAD */}
      <footer className="bg-slate-950 border-t border-slate-900 py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Get started with Zeneva</h2>
            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
              Turn your phone into a mobile store instantly. Start selling online and managing your business with ease.
            </p>
          </div>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition-opacity">
              <img src="/images/playstore.png" alt="Google Play Store" className="h-12 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </a>
            <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition-opacity">
              <img src="/images/appstore.png" alt="Apple App Store" className="h-12 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </a>
          </div>

          <div className="pt-10 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <img src={AppConfig.logoUrl} alt="Zeneva" className="h-8 w-auto opacity-40" />
              <span>© 2026 Zeneva POS. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <Link href="/legal/privacy-policy" className="hover:text-slate-300">Privacy Policy</Link>
              <span>•</span>
              <Link href="/legal/terms-of-service" className="hover:text-slate-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
