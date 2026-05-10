
'use client';

import React, { useState } from 'react';
import { Check, Zap, Barcode, Package, Box, Tag, Receipt } from "lucide-react";
import { motion } from 'framer-motion';
import MarketingHeader from "@/components/layout/marketing-header";
import MarketingFooter from "@/components/layout/marketing-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from 'next/link';
import { InteractiveGrid } from '@/components/interactive-grid';

const faqItems = [
    {
      question: "Can I use Zeneva for free?",
      answer: "Yes! Our Starter plan is 100% free forever for small shops with up to 500 products. It includes our robust POS and basic analytics to help you get off the ground."
    },
    {
      question: "What happens after my 30-day trial?",
      answer: "You can choose to subscribe to the plan that fits your business or downgrade to our free Starter plan. Your data remains safe and accessible regardless of your choice."
    },
    {
      question: "Do I need a credit card to sign up?",
      answer: "No credit card is required to start your 30-day free trial. You only provide payment details when you're ready to subscribe to a paid plan."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel at any time from your dashboard. If you've paid for a year upfront, you'll continue to have access until the end of your billing cycle."
    },
    {
      question: "Do you offer discounts for non-profits?",
      answer: "We support businesses that give back. Please reach out to our team at zenevapos@gmail.com to discuss special pricing for registered charitable organizations."
    },
    {
      question: "Can I accept international payments?",
      answer: "Yes! Zeneva now supports international payments via our Paystack integration. You can accept USD and other global currencies from cards anywhere in the world on our Pro and Enterprise plans."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. Zeneva uses AES-256 bank-grade encryption to protect your local data at rest and industry-standard SSL/TLS for data in transit. We also provide full audit logs to track every movement in your business."
    }
  ];

export default function PricingContent() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');

    return (
        <div className="min-h-screen bg-white">
            <MarketingHeader />

            <main>
                {/* Hero / Pricing Header */}
                <section className="relative pt-32 pb-20 px-6 bg-transparent border-b border-slate-100 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <InteractiveGrid />
                        <div className="aura-background"></div>
                    </div>
                    <div className="max-w-6xl mx-auto text-center relative z-10">
                        {/* Doodle Icons */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.1]">
                            <motion.div 
                                animate={{ y: [0, -25, 0], rotate: [0, 10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-10 left-[10%]"
                            >
                                <Barcode className="w-16 h-16 text-slate-400" />
                            </motion.div>
                            <motion.div 
                                animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute top-20 right-[5%]"
                            >
                                <Package className="w-20 h-20 text-slate-400" />
                            </motion.div>
                            <motion.div 
                                animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                className="absolute bottom-20 left-[5%]"
                            >
                                <Box className="w-14 h-14 text-slate-400" />
                            </motion.div>
                            <motion.div 
                                animate={{ y: [0, 35, 0], rotate: [0, 20, 0] }}
                                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                                className="absolute -bottom-10 right-[10%]"
                            >
                                <Tag className="w-24 h-24 text-slate-400" />
                            </motion.div>
                        </div>

                        <div className="inline-flex items-center gap-4 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-8">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pricing Plans</span>
                            </div>
                            <div className="w-px h-3 bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Accepting Global USD (Paystack)</span>
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-light text-slate-900 tracking-tight font-bricolage max-w-3xl mx-auto mb-6">
                            Choose the Perfect Plan for Your Business
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-dm-sans tracking-tight mb-12">
                            Start for free, and scale as you grow. All plans come with a 30-day free trial of our premium features. No credit card required.
                        </p>

                        <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-4">
                            {/* Billing Toggle */}
                            <div className="inline-flex items-center p-1 bg-neutral-100/80 border-2 border-dashed border-neutral-200 rounded-xl">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-8 py-2.5 text-sm font-semibold rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-8 py-2.5 text-sm font-semibold rounded-lg transition-all ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Yearly
                                </button>
                            </div>

                            {/* Currency Toggle */}
                            <div className="inline-flex items-center p-1 bg-neutral-100/80 border-2 border-dashed border-neutral-200 rounded-xl">
                                <button
                                    onClick={() => setCurrency('NGN')}
                                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${currency === 'NGN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Naira (₦)
                                </button>
                                <button
                                    onClick={() => setCurrency('USD')}
                                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${currency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    USD ($)
                                </button>
                            </div>
                        </div>
                        {billingCycle === 'yearly' && (
                            <div className="text-sm text-emerald-600 font-bold animate-bounce h-6">2 Months Free! 🚀</div>
                        )}
                    </div>
                </section>

                {/* Pricing Section (Exact Replica of Homepage) */}
                <section className="py-24 px-6 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Starter Plan */}
                            <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-slate-200 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold leading-5 text-slate-900">Starter</h3>
                                <p className="mt-4 text-slate-500 text-sm">For new businesses getting started with inventory management.</p>

                                <div className="mt-4">
                                    <span className="text-4xl font-bold tracking-tight text-slate-900">Free</span>
                                </div>
                                <ul className="mt-6 space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Up to 500 products</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> 1 Staff Account</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Standard POS (Unlimited Sales)</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Basic Analytics</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Invoicing & Receipts</li>
                                    <li className="flex items-center gap-3 text-slate-700 font-bold">Free Online Storefront</li>
                                </ul>
                                <div className="mt-auto pt-8">
                                    <Button asChild size="lg" className="w-full">
                                        <Link href="/signup">Get Started for Free</Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Pro Plan */}
                            <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-primary rounded-lg shadow-2xl shadow-primary/10">
                                <p className="absolute top-0 -translate-y-1/2 bg-primary text-white px-3 py-1 text-sm font-semibold tracking-wide rounded-full">Most Popular</p>
                                <h3 className="text-lg font-semibold leading-5 text-slate-900">Pro</h3>
                                <p className="mt-4 text-slate-500 text-sm">For growing businesses that need advanced tools and an online presence.</p>

                                <div className="mt-4">
                                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                                        {currency === 'NGN' 
                                            ? (billingCycle === 'monthly' ? '₦10,000' : '₦100,000')
                                            : (billingCycle === 'monthly' ? '$7' : '$70')
                                        }
                                    </span>
                                    <span className="text-base font-medium text-slate-500">
                                        {billingCycle === 'monthly' ? '/mo' : '/year'}
                                    </span>
                                    {billingCycle === 'yearly' && (
                                        <div className="text-xs text-emerald-600 font-bold mt-1 block animate-pulse">
                                            Save {currency === 'NGN' ? '₦20,000!' : '$14!'}
                                        </div>
                                    )}
                                </div>
                                <ul className="mt-6 space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Up to 1,500 products</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> 5 Staff Accounts</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Customizable E-Commerce Storefront</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Backorders & Backdating Capability</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Invoicing & Debt Management</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Advanced Reports & Analytics</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> AI Product Troubleshooter</li>
                                    <li className="flex items-center gap-3 text-slate-700 font-semibold"><Check className="h-5 w-5 text-primary" /> Granular Staff Permissions (RBAC)</li>
                                </ul>
                                <div className="mt-auto pt-8">
                                    <Button asChild size="lg" className="w-full">
                                        <Link href="/signup">Start Your Pro Trial</Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Business Plan */}
                            <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-slate-200 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold leading-5 text-slate-900">Business</h3>
                                <p className="mt-4 text-slate-500 text-sm">For established businesses that require our most powerful AI tools and support.</p>

                                <div className="mt-4">
                                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                                        {currency === 'NGN'
                                            ? (billingCycle === 'monthly' ? '₦30,000' : '₦300,000')
                                            : (billingCycle === 'monthly' ? '$20' : '$200')
                                        }
                                    </span>
                                    <span className="text-base font-medium text-slate-500">
                                        {billingCycle === 'monthly' ? '/mo' : '/year'}
                                    </span>
                                    {billingCycle === 'yearly' && (
                                        <div className="text-xs text-emerald-600 font-bold mt-1 block">
                                            Save {currency === 'NGN' ? '₦60,000!' : '$40!'}
                                        </div>
                                    )}
                                </div>
                                <ul className="mt-6 space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Unlimited products & staff accounts</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> All features in Pro</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> AI Business Performance Dashboard</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Granular Role-Based Access Control</li>
                                    <li className="flex items-center gap-3 text-slate-700"><Check className="h-5 w-5 text-primary" /> Priority Phone & Email Support</li>
                                </ul>
                                <div className="mt-auto pt-8">
                                    <Button asChild size="lg" className="w-full">
                                        <Link href="/signup">Start Your Business Trial</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="py-24 px-6 border-t bg-white border-slate-100">
                    <div className="max-w-3xl mr-auto ml-auto">
                        <h2 className="text-3xl tracking-tight mb-12 text-center font-bricolage font-light text-slate-900">Frequently asked questions</h2>
                        <Accordion type="multiple" className="w-full">
                            {faqItems.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-lg text-left">{item.question}</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <div className="text-center mt-12 bg-neutral-50 p-10 rounded-2xl border border-dashed border-neutral-200">
                            <p className="mb-4 font-dm-sans tracking-tight text-slate-600 text-lg">Still have questions?</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild size="lg" variant="outline">
                                    <Link href="/help-center">Browse Help Center</Link>
                                </Button>
                                <Button asChild size="lg">
                                    <Link href="/contact">Contact Support</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <MarketingFooter />
        </div>
    );
}
