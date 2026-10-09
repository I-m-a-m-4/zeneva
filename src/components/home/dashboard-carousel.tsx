'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/context/i18n-context';

// `alt` stays English on purpose: it is keyword-stuffed SEO copy for crawlers,
// which read the canonical English page. Only `labelKey` is user-facing.
const slides = [
    { src: "/herolytics.svg", alt: "Zeneva invoice dashboard showing billed revenue, payment statuses, and AI cashflow forecasting", labelKey: "landing.carouselDashboard" },
    { src: "/poslytics.svg", alt: "Zeneva invoice builder and billing interface for client checkout and multi-currency billing", labelKey: "landing.carouselPos" },
    { src: "/inventory.svg", alt: "Zeneva smart invoice and client billing ledger with payment tracking and overdue alerts", labelKey: "landing.carouselInventory" },
    { src: "/loglytics.svg", alt: "Zeneva business audit log tracking client billing actions and secure transactions", labelKey: "landing.carouselAuditLog" },
    { src: "/storelytics.svg", alt: "Zeneva customizable client payment portal for international billing", labelKey: "landing.carouselStorefront" },
    { src: "/reportlytics.svg", alt: "Zeneva advanced billing reports and revenue analytics for modern businesses", labelKey: "landing.carouselReports" }
];

export function DashboardCarousel() {
    const { t } = useI18n();
    const [activeSlide, setActiveSlide] = useState(0);

    return (
        <section className="relative w-full max-w-7xl mx-auto px-6 pb-24 mt-12 z-20">
            <div className="flex flex-col items-center">
                <div className="relative w-full rounded-xl overflow-hidden">
                    <div className="relative aspect-[16/10] w-full bg-slate-50">
                        {slides.map((slide, index) => {
                            const isActive = index === activeSlide;
                            if (!isActive && index !== 0) return null;
                            return (
                                <div
                                    key={index}
                                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                >
                                    <Image
                                        src={slide.src}
                                        alt={slide.alt}
                                        width={1400}
                                        height={900}
                                        className="w-full h-full object-contain"
                                        priority={index === 0}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8">
                    {slides.map((slide, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveSlide(index)}
                            className={`pb-2 text-sm font-medium transition-all duration-300 relative group ${index === activeSlide
                                ? 'text-primary'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {t(slide.labelKey)}
                            <span className={`absolute bottom-0 start-0 w-full h-0.5 bg-primary transition-transform duration-300 origin-left rtl:origin-right ${index === activeSlide ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                                }`} />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
