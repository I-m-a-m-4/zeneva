'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Book, CreditCard, Activity, Cpu, Users, Shield, ArrowRight, LifeBuoy, FileText } from 'lucide-react';
import { InteractiveGrid } from '@/components/interactive-grid';

import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';

// If they use a different layout, we can import marketing footer directly.
// For now, I will include Navbar and Footer just in case, but usually Next.js handles this in layout.tsx.
// I will just return the main content if there is a layout handling it. However, since the route is /help-center at the root, 
// let's wrap it nicely.
// Looking at Zeneva marketing pages, it often has its own layout or brings in Navbar/Footer.
// I will omit Navbar and Footer from the page itself unless necessary, relying on layout, but to be sure, I will render them if needed.
// Actually, I'll just provide the main content.

export default function HelpCenterPage() {
  const categories = [
    {
      title: "Getting Started",
      description: "Learn how to set up your store and add your first products.",
      icon: <Book className="w-6 h-6 text-primary" />,
      href: "#"
    },
    {
      title: "Inventory & Stock",
      description: "Manage items, variants, stock syncing, and backorders.",
      icon: <Activity className="w-6 h-6 text-primary" />,
      href: "#"
    },
    {
      title: "Point of Sale (POS)",
      description: "Process sales seamlessly, even when you're completely offline.",
      icon: <CreditCard className="w-6 h-6 text-primary" />,
      href: "#"
    },
    {
      title: "AI Analytics",
      description: "Understand your sales data, waste tracking, and insights.",
      icon: <Cpu className="w-6 h-6 text-primary" />,
      href: "#"
    },
    {
      title: "Multi-Store & Team",
      description: "Manage locations, staff permissions, and administrator roles.",
      icon: <Users className="w-6 h-6 text-primary" />,
      href: "#"
    },
    {
      title: "Billing & Subscriptions",
      description: "Manage your Zeneva pricing plan, invoices, and payments.",
      icon: <Shield className="w-6 h-6 text-primary" />,
      href: "#"
    }
  ];

  const popularArticles = [
    "How to sync your inventory offline",
    "Setting up staff permissions and roles",
    "Understanding the AI waste tracking algorithm",
    "Connecting barcode scanners to the POS",
    "Setting up automatic low stock alerts"
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
            <LifeBuoy className="w-4 h-4" />
            <span>Support &amp; Resources</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            How can we help?
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            Search our knowledge base or browse categories below to find answers to your questions.
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
              placeholder="Search for articles, guides, and tutorials..." 
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base py-3"
            />
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors hidden sm:block">
              Search
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span>Popular:</span>
            <button className="hover:text-primary transition-colors">Offline POS</button>
            <span>•</span>
            <button className="hover:text-primary transition-colors">Adding Staff</button>
            <span>•</span>
            <button className="hover:text-primary transition-colors">Barcode Setup</button>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our comprehensive guides to help you get the most out of Zeneva.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link 
                key={index} 
                href={category.href}
                className="group block bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/30"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {category.description}
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  View Articles <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-24 bg-secondary rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Popular Articles</h2>
                <p className="text-muted-foreground mb-6">
                  Get quick solutions to the most common questions from our community.
                </p>
                <Link href="#" className="inline-flex flex-col items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-fit">
                  View All Articles
                </Link>
              </div>
              
              <div className="space-y-4">
                {popularArticles.map((article, index) => (
                  <Link 
                    key={index} 
                    href="#"
                    className="flex justify-between items-center bg-background p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium">{article}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-24 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <LifeBuoy className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
            <p className="text-muted-foreground mb-8">
              Can't find what you're looking for? Our support team is always ready to help you with any questions or issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="mailto:zenevapos@gmail.com" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
                Contact Support
              </Link>
              <Link href="https://wa.me/2349064233805" target="_blank" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8">
                Chat on WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
