'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Pill, Shirt, Smartphone, MapPin, Search, ArrowRight, Zap, Target, BarChart3, Star, CheckCircle2 } from 'lucide-react';
import { InteractiveGrid } from '@/components/interactive-grid';

import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';

export default function UseCasesPage() {
  const useCases = [
    {
      title: "Supermarkets & Grocery",
      description: "Manage massive SKU counts, expiration dates, and process high-volume checkouts offline.",
      icon: <ShoppingBag className="w-6 h-6 text-primary" />,
      href: "/signup"
    },
    {
      title: "Pharmacies",
      description: "Track medication batches, monitor expiry dates closely, and maintain strict inventory compliance.",
      icon: <Pill className="w-6 h-6 text-primary" />,
      href: "/signup"
    },
    {
      title: "Fashion & Boutiques",
      description: "Handle complex product variants like sizes and colors, and track fast-moving vs dead stock.",
      icon: <Shirt className="w-6 h-6 text-primary" />,
      href: "/signup"
    },
    {
      title: "Gadgets & Electronics",
      description: "Track high-value inventory by serial numbers, manage warranties, and create product bundles.",
      icon: <Smartphone className="w-6 h-6 text-primary" />,
      href: "/signup"
    },
    {
      title: "Multi-Store Chains",
      description: "Unify inventory and analytics across all your locations in a single, real-time dashboard.",
      icon: <MapPin className="w-6 h-6 text-primary" />,
      href: "/signup"
    },
    {
      title: "Wholesale & Distribution",
      description: "Manage bulk orders, track backorders, and analyze wholesale customer purchasing trends.",
      icon: <Target className="w-6 h-6 text-primary" />,
      href: "/signup"
    }
  ];

  const coreCapabilities = [
    "100% Offline Resilience for Unstable Networks",
    "AI-Powered Dead Stock & Expiry Alerts",
    "Real-time Multi-Location Inventory Syncing",
    "Granular Role-Based Staff Permissions",
    "Instant Barcode Checkout Integration"
  ];

  return (
    <main className="min-h-screen bg-background">
      <MarketingHeader />
      
      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-6 pt-28 pb-16 md:py-32 overflow-hidden bg-transparent">
        <div className="absolute inset-0 z-0">
          <InteractiveGrid />
          <div className="aura-background"></div>
        </div>
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            <span>Who is Zeneva for?</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Built for Modern Commerce
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            From neighborhood boutiques to nationwide pharmacy chains, discover how Zeneva adapts to your industry.
          </p>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="py-12 px-6 bg-primary/5">
        <div className="max-w-2xl mx-auto -mt-20">
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-border/50 p-2 flex items-center focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="w-5 h-5 mx-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search for your industry..." 
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base py-3"
            />
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors hidden sm:block">
              Search
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span>Popular Industries:</span>
            <button className="hover:text-primary transition-colors">Grocery</button>
            <span>•</span>
            <button className="hover:text-primary transition-colors">Pharmacy</button>
            <span>•</span>
            <button className="hover:text-primary transition-colors">Retail Chains</button>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Explore Use Cases</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See exactly how Zeneva's tools solve the biggest operational bottlenecks for businesses just like yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <Link 
                key={index} 
                href={useCase.href}
                className="group block bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/30"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {useCase.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {useCase.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {useCase.description}
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Learn More <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-24 bg-secondary rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Core Capabilities</h2>
                <p className="text-muted-foreground mb-6">
                  No matter your industry, Zeneva provides the essential infrastructure to scale your operations safely and efficiently. 
                  Learn how to set up these features in our <Link href="/help-center" className="text-primary hover:underline">Help Center</Link>.
                </p>
                <Link href="/about/our-mission" className="inline-flex flex-col items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-fit">
                  View Our Mission
                </Link>
              </div>
              
              <div className="space-y-4">
                {coreCapabilities.map((capability, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center bg-background p-4 rounded-xl border border-border/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{capability}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-24 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Ready to accelerate your growth?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of retailers utilizing Zeneva to turn their complicated operations into a streamlined engine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shadow-md">
                Get Started for Free
              </Link>
              <Link href="mailto:zenevapos@gmail.com" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8">
                Request a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
