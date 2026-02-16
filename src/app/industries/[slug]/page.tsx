import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InteractiveGrid } from '@/components/interactive-grid';
import { MarqueeSection } from '@/components/marquee-section';
import { FeaturesFloatingSection } from '@/components/features-floating-section';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Ban, HelpCircle } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// Define the verticals and their specific content
const verticals = {
    'fashion-boutique': {
        title: "The OS for Modern Fashion Retail",
        description: "Manage sizes, colors, and collections effortlessly. Zen AI predicts the next trend before you even stock it.",
        heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
        features: [
            "Variant Management (Size/Color)",
            "Collection Tracking",
            "Customer Style Profiles",
            "Seasonal Demand Forecasting"
        ],
        auditExample: "Stock adjustment: 'Summer Collection' received (50 units).",
        painPoints: [
            { title: "Dead Stock Nightmares", description: "Stuck with unsold sizes and colors from last season? Zeneva identifies slow movers early so you can discount them before they become a loss." },
            { title: "Inventory Chaos", description: "Losing track of which boutique has which dress? Our multi-location sync keeps your inventory accurate across all stores in real-time." },
            { title: "Customer Disconnect", description: "Don't know what your VIPs bought last? Zeneva's CRM builds style profiles for every customer so you can recommend the perfect match." }
        ],
        faqs: [
            { question: "Can I handle products with multiple sizes and colors?", answer: "Yes! Zeneva allows you to create product variants easily. You can track stock levels for each specific size and color combination." },
            { question: "Does it integrate with Instagram/TikTok?", answer: "Yes, you can easily share your Zeneva storefront links on social media, and orders will sync directly to your inventory." },
            { question: "Can I move stock between my branches?", answer: "Absolutely. Zeneva supports multi-location inventory management, allowing you to transfer stock and track it every step of the way." }
        ]
    },
    'grocery-supermarket': {
        title: "High-Volume Grocery POS & Inventory",
        description: "Speed through checkout with barcode scanning and track expiration dates automatically. Never let fresh produce go to waste.",
        heroImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop",
        features: [
            "Expiry Date Tracking",
            "Low Stock Alerts",
            "Fast Barcode Scanning",
            "Scale Integration Support"
        ],
        auditExample: "Waste logged: 'Tomatoes' (2kg) - Expired.",
        painPoints: [
            { title: "The Expired Goods Trap", description: "Throwing away money on expired food? Zeneva alerts you before items expire so you can discount them and recover costs." },
            { title: "Checkout Queues", description: "Customers leaving because the line is too long? Our lightning-fast POS handles high-volume transactions without freezing." },
            { title: "Unknown Shrinkage", description: "Inventory not matching sales? Our detailed audit logs and role-based access control help you pinpoint theft and errors immediately." }
        ],
        faqs: [
            { question: "Does it work with barcode scanners?", answer: "Yes, Zeneva works with most standard USB and Bluetooth barcode scanners for rapid checkout." },
            { question: "Can I sell items by weight?", answer: "Yes, you can set products to be sold by weight (kg, lb) or by unit, making it perfect for fresh produce." },
            { question: "What happens if the internet goes down?", answer: "Zeneva works offline! You can continue selling, and all data will automatically sync once you're back online." }
        ]
    },
    'pharmacy': {
        title: "Precision Management for Pharmacies",
        description: "Track drug batches, expirations, and prescriptions. Ensure compliance and never run out of essential medications.",
        heroImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=2079&auto=format&fit=crop",
        features: [
            "Batch & Expiry Tracking",
            "Prescription Management",
            "Supplier Management",
            "Drug Interaction Alerts (Coming Soon)"
        ],
        auditExample: "Dispensed: 'Paracetamol 500mg' - Batch #A123.",
        painPoints: [
            { title: "Expiration Compliance", description: "Selling expired meds is a massive risk. Zeneva enforces FEFO (First-Expired-First-Out) to ensure safety and compliance." },
            { title: "Stockouts of Essentials", description: "Running out of critical meds loses trust. Set low-stock alerts to reorder automatically before you run dry." },
            { title: "Performance Blindspots", description: "Unsure which drugs are your best sellers? Our analytics break down profitability by category, helping you optimize your stock." }
        ],
        faqs: [
            { question: "Can I track batches?", answer: "Yes, batch tracking is a core feature. You can trace every item sold back to its supplier batch for safety and recalls." },
            { question: "Does it support multiple users?", answer: "Yes, you can create accounts for pharmacists, assistants, and managers with different permission levels." },
            { question: "Is my data secure?", answer: "Extremely. We use bank-grade encryption and automatic cloud backups to ensure your patient and business data is safe." }
        ]
    },
    'electronics': {
        title: "Serialize and Track High-Value Electronics",
        description: "Manage serial numbers, warranties, and repairs. prevent theft and ensuring every gadget is accounted for.",
        heroImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=2101&auto=format&fit=crop",
        features: [
            "Serial Number Tracking",
            "Warranty Management",
            "Repair Job Tracking",
            "High-Value Item Security"
        ],
        auditExample: "Sold: 'MacBook Pro' - Serial #C02...",
        painPoints: [
            { title: "Warranty Disputes", description: "Lost the paper receipt? Zeneva stores digital warranties linked to serial numbers, making claims painless for you and customers." },
            { title: "Employee Theft", description: "High-value items disappearing? Serial number tracking ensures every single unit is accounted for from receiving to sale." },
            { title: "Repair Status Calls", description: "Tired of 'is my phone ready?' calls? Track repair jobs in Zeneva and notify customers automatically when ready." }
        ],
        faqs: [
            { question: "Do you support serial numbers?", answer: "Yes, you can scan or enter unique serial numbers for every item during receiving and at the point of sale." },
            { question: "Can I manage repairs?", answer: "Yes, our repair module lets you track devices, assign technicians, and update statuses." },
            { question: "Can I print receipts?", answer: "Yes, Zeneva connects to thermal receipt printers to print professional receipts with your logo and return policy." }
        ]
    },
    'restaurant-cafe': {
        title: "Recipe Costing & Order Management",
        description: "Track ingredients, manage tables, and speed up kitchen operations. Know exactly how much profit is in every dish.",
        heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop",
        features: [
            "Ingredient Inventory",
            "Recipe Costing",
            "Table Management",
            "Kitchen Display System (KDS)"
        ],
        auditExample: "Order #452: 'Jollof Rice' - Kitchen prep started.",
        painPoints: [
            { title: "Food Cost Spikes", description: "Menu prices not keeping up with market costs? Zeneva's recipe costing updates your margins in real-time as ingredient prices change." },
            { title: "Kitchen Chaos", description: "Orders getting lost or delayed? Our KDS (Kitchen Display System) sends orders instantly to the kitchen, organized by time and table." },
            { title: "Ingredient Waste", description: "Throwing away food? Track ingredient usage per dish to identify waste and optimize your purchasing." }
        ],
        faqs: [
            { question: "Can I manage tables?", answer: "Yes, you can design your floor plan and manage open tabs for each table." },
            { question: "Does it track ingredients?", answer: "Yes! When you sell a dish (e.g., Burger), Zeneva automatically deducts the ingredients (Bun, Meat, Cheese) from your inventory." },
            { question: "Can I split bills?", answer: "Yes, Zeneva makes it easy to split bills by item or by number of people." }
        ]
    }
};

type VerticalSlug = keyof typeof verticals;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const vertical = verticals[params.slug as VerticalSlug];
    if (!vertical) return { title: 'Industry Not Found' };

    return {
        title: `${vertical.title} | Zeneva`,
        description: vertical.description,
    };
}

import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { ThemeProvider } from '@/components/theme-provider';

// ... existing imports ...

export default function VerticalPage({ params }: { params: { slug: string } }) {
    const vertical = verticals[params.slug as VerticalSlug];

    if (!vertical) {
        notFound();
    }

    return (
        <ThemeProvider forcedTheme="light">
            <div className="min-h-screen bg-[#F9F8F6]">
                <MarketingHeader />

                {/* Hero Section */}
                <div className="relative pt-32 pb-20 px-6 overflow-hidden">
                    <div className="absolute inset-0 -z-10">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    </div>

                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm font-medium mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Tailored for {params.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-[1.1]">
                                {vertical.title}
                            </h1>
                            <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-lg">
                                {vertical.description}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/signup">
                                    <Button size="lg" className="h-12 px-8 text-base bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                        Get Started Free
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="https://wa.me/2349064233805?text=I'm%20interested%20in%20Zeneva%20for%20my%20business" target="_blank">
                                    <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full border-slate-300 hover:bg-white/50">
                                        Talk to Sales
                                    </Button>
                                </Link>
                            </div>

                            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {vertical.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        <span className="font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 aspect-video lg:aspect-square">
                                <Image
                                    src={vertical.heroImage}
                                    alt={vertical.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-8">
                                    <div className="text-white/90 font-mono text-sm bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/10 w-full">
                                        <div className="text-xs uppercase tracking-widest text-white/60 mb-1">Live Audit Log</div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                            {vertical.auditExample}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating UI Elements */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500 rounded-2xl rotate-12 -z-10 opacity-20 blur-xl"></div>
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500 rounded-full -z-10 opacity-20 blur-xl"></div>
                        </div>
                    </div>
                </div>

                {/* Reused Sections */}
                <MarqueeSection />

                <div className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-6 text-center">
                        <h2 className="text-3xl font-bold mb-12">Why {params.slug.split('-')[0].replace(/^\w/, (c) => c.toUpperCase())} Owners Choose Zeneva</h2>
                        <InteractiveGrid />
                    </div>
                </div>

                {/* Pain Points Section */}
                <section className="py-24 px-6 bg-slate-50 border-t border-slate-200">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                                Solving the Real Problems of {params.slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                            </h2>
                            <p className="text-lg text-slate-600">
                                We designed Zeneva to tackle the specific headaches that slow your business down.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {vertical.painPoints.map((point: any, index: number) => (
                                <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center mb-6">
                                        <Ban className="h-6 w-6 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">{point.title}</h3>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        {point.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-24 px-6 bg-white border-t border-slate-100">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mb-4">
                                <HelpCircle className="h-6 w-6 text-blue-600" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-lg text-slate-600">
                                Common questions from other {params.slug.split('-')[0]} owners.
                            </p>
                        </div>
                        <Accordion type="single" collapsible className="w-full">
                            {vertical.faqs.map((faq: any, index: number) => (
                                <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-100">
                                    <AccordionTrigger className="text-lg font-medium text-slate-900 py-4 hover:no-underline hover:text-orange-600 transition-colors text-left">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-600 leading-relaxed pb-6 text-base">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,white_25%,white_50%,transparent_50%,transparent_75%,white_75%,white_100%)] bg-[size:60px_60px]"></div>
                    </div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                            Ready to Transform Your {params.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}?
                        </h2>
                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                            Join thousands of Nigerian businesses using Zen AI to cut waste, stop theft, and multiply profits.
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-10 text-lg bg-orange-600 hover:bg-orange-500 text-white rounded-full transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                                Start Your Free Trial
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <p className="mt-6 text-sm text-slate-500">
                            No credit card required • Cancel anytime • 24/7 Support
                        </p>
                    </div>
                </section>

                <MarketingFooter />
            </div>
        </ThemeProvider>
    );
}
