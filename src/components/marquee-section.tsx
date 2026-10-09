import React from 'react';
import {
    FileText,
    BarChart3,
    Users,
    Tag,
    Globe,
    CreditCard,
    TrendingUp,
    ShieldCheck,
    Clock,
    DollarSign,
    CheckCircle,
    Receipt
} from 'lucide-react';

const MARQUEE_ITEMS = [
    {
        label: "Autonomous Invoicing",
        icon: <FileText className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Global Payments (USD/EUR)",
        icon: <Globe className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Client Payment Portal",
        icon: <Users className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Recurring & Retainer Billing",
        icon: <TrendingUp className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Automatic Payment Reminders",
        icon: <Clock className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Quotes & Estimates",
        icon: <CheckCircle className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Instant Card Checkout",
        icon: <CreditCard className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Revenue Analytics",
        icon: <BarChart3 className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Digital Receipts",
        icon: <Receipt className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Audit Logs & Security",
        icon: <ShieldCheck className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Multi-Currency Settlement",
        icon: <DollarSign className="w-6 h-6 text-slate-700" />
    },
    {
        label: "Tax & VAT Compliance",
        icon: <Tag className="w-6 h-6 text-slate-700" />
    }
];

export function MarqueeSection() {
    return (
        <div className="pd_press_section py-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
            <div className="home-marq marquee-container group">
                <div className="overlay" style={{
                    "--gradient-color": "rgba(255, 255, 255, 1), rgba(255, 255, 255, 0)",
                    "--gradient-width": "100px"
                } as React.CSSProperties}></div>

                {/* First Loop */}
                <div className="marquee flex items-center gap-8 min-w-full justify-around shrink-0 animate-marquee-scroll">
                    {MARQUEE_ITEMS.map((item, index) => (
                        <div key={`m1-${index}`} className="flex items-center gap-3 px-4 py-2 rounded-full border border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
                            <span className="flex-shrink-0 p-1 bg-slate-50 rounded-full">
                                {item.icon}
                            </span>
                            <span className="font-medium text-slate-600 whitespace-nowrap text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Second Loop */}
                <div className="marquee flex items-center gap-8 min-w-full justify-around shrink-0 animate-marquee-scroll" aria-hidden="true">
                    {MARQUEE_ITEMS.map((item, index) => (
                        <div key={`m2-${index}`} className="flex items-center gap-3 px-4 py-2 rounded-full border border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
                            <span className="flex-shrink-0 p-1 bg-slate-50 rounded-full">
                                {item.icon}
                            </span>
                            <span className="font-medium text-slate-600 whitespace-nowrap text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
