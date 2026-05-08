'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PricingPlans() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-12">
                {/* Billing Toggle */}
                <div className="inline-flex items-center p-1 bg-neutral-100/80 border-2 border-dashed border-neutral-200 rounded-xl">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-8 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-8 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Yearly
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter Plan */}
                <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-slate-200 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold leading-5">Starter</h3>
                    <p className="mt-4 text-slate-600 text-sm">For new businesses getting started with inventory management.</p>

                    <div className="mt-4">
                        <span className="text-4xl font-bold tracking-tight">Free</span>
                    </div>
                    <ul className="mt-6 space-y-4 text-sm text-slate-700">
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Up to 500 products</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> 1 Staff Account</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Standard POS (Unlimited Sales)</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Basic Analytics</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Invoicing & Receipts</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> <b>Free Online Storefront</b></li>
                    </ul>
                    <div className="mt-auto pt-6">
                        <Button asChild size="lg" className="w-full">
                            <Link href="/signup">Get Started for Free</Link>
                        </Button>
                    </div>
                </div>

                {/* Pro Plan */}
                <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-primary rounded-lg shadow-2xl shadow-primary/10">
                    <p className="absolute top-0 -translate-y-1/2 bg-primary text-white px-3 py-1 text-sm font-semibold tracking-wide rounded-full">Most Popular</p>
                    <h3 className="text-lg font-semibold leading-5">Pro</h3>
                    <p className="mt-4 text-slate-600 text-sm">For growing businesses that need advanced tools and an online presence.</p>

                    <div className="mt-4">
                        <span className="text-4xl font-bold tracking-tight text-slate-900">
                            {billingCycle === 'monthly' ? '₦10,000' : '₦100,000'}
                        </span>
                        <span className="text-base font-medium text-slate-500">
                            {billingCycle === 'monthly' ? '/mo' : '/year'}
                        </span>
                        {billingCycle === 'yearly' && (
                            <div className="text-xs text-emerald-600 font-bold mt-1 block animate-pulse">Save ₦20,000!</div>
                        )}
                    </div>
                    <ul className="mt-6 space-y-4 text-sm text-slate-700">
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Up to 1,500 products</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> 5 Staff Accounts</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Customizable E-Commerce Storefront</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Backorders & Backdating Capability</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Invoicing & Debt Management</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Advanced Reports & Analytics</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> AI Product Troubleshooter</li>
                        <li className="flex items-center gap-3 font-semibold"><Check className="h-5 w-5 text-primary" /> Granular Staff Permissions (RBAC)</li>
                    </ul>
                    <div className="mt-auto pt-6">
                        <Button asChild size="lg" className="w-full">
                            <Link href="/signup">Start Your Pro Trial</Link>
                        </Button>
                    </div>
                </div>

                {/* Business Plan */}
                <div className="relative flex flex-col p-8 bg-white border-2 border-dashed border-slate-200 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold leading-5 text-slate-900">Business</h3>
                    <p className="mt-4 text-slate-600 text-sm">For established businesses that require our most powerful AI tools and support.</p>

                    <div className="mt-4">
                        <span className="text-4xl font-bold tracking-tight text-slate-900">
                            {billingCycle === 'monthly' ? '₦30,000' : '₦300,000'}
                        </span>
                        <span className="text-base font-medium text-slate-500">
                            {billingCycle === 'monthly' ? '/mo' : '/year'}
                        </span>
                        {billingCycle === 'yearly' && (
                            <div className="text-xs text-emerald-600 font-bold mt-1 block">Save ₦60,000!</div>
                        )}
                    </div>
                    <ul className="mt-6 space-y-4 text-sm text-slate-700">
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Unlimited products & staff accounts</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> All features in Pro</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> AI Business Performance Dashboard</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Granular Role-Based Access Control</li>
                        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-primary" /> Priority Phone & Email Support</li>
                    </ul>
                    <div className="mt-auto pt-6">
                        <Button asChild size="lg" className="w-full">
                            <Link href="/signup">Start Your Business Trial</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
