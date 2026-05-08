'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles } from 'lucide-react';

const foodInsights = [
    "This snack sells most on Wednesdays between 4–7 PM. Prepare 28 units. Producing more wastes cash.",
    "Fresh bread moves fast on rainy mornings. Bake 15 extra loaves to meet demand.",
    "Milk expires in 2 days. Mark down by 20% now to clear stock before loss.",
    "Lunch rush incoming. Pre-pack 50 sandwiches to reduce wait times.",
    "Vegetable waste is up 10%. Reduce order quantity for next shipment."
];

const fashionInsights = [
    "Blue denim sales spike 40% on pay-day weekends. Stock 15 extra units to capture demand.",
    "Summer dresses are trending. Move to front window display to increase foot traffic.",
    "Red sneakers are low in stock. Reorder now to avoid missing weekend sales.",
    "Customer X buys formal wear every 3 months. Send personalized offer now.",
    "Winter coats are moving slow. Bundle with scarves to clear inventory."
];

export function ZenAIInsights() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasTriggered, setHasTriggered] = useState(false);
    const [foodIndex, setFoodIndex] = useState(0);
    const [fashionIndex, setFashionIndex] = useState(0);
    const [isFoodPulsing, setIsFoodPulsing] = useState(false);
    const [isFashionPulsing, setIsFashionPulsing] = useState(false);

    useEffect(() => {
        const foodInterval = setInterval(() => {
            setFoodIndex((prev) => (prev + 1) % foodInsights.length);
        }, 6000);
        return () => clearInterval(foodInterval);
    }, []);

    useEffect(() => {
        const fashionInterval = setInterval(() => {
            setFashionIndex((prev) => (prev + 1) % fashionInsights.length);
        }, 8000);
        return () => clearInterval(fashionInterval);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasTriggered) {
                    handleFoodClick();
                    handleFashionClick();
                    setHasTriggered(true);
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [hasTriggered]);

    const handleFoodClick = () => {
        setIsFoodPulsing(true);
        setTimeout(() => setIsFoodPulsing(false), 3000);
    };

    const handleFashionClick = () => {
        setIsFashionPulsing(true);
        setTimeout(() => setIsFashionPulsing(false), 3000);
    };

    return (
        <div ref={containerRef} className="relative flex flex-col justify-center items-center py-4">
            {/* AI Connection Visual */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[300px] pointer-events-none">
                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-0.5 h-[60%] bg-gradient-to-b from-slate-200 via-primary/20 to-slate-200"></div>
            </div>

            {/* Central AI Node */}
            <div className="relative z-10 mb-8">
                <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                    <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                </div>
            </div>

            {/* Chat Bubbles */}
            <div className="space-y-6 w-full max-w-sm relative z-10">
                {/* Bubble 1 */}
                <div
                    onClick={handleFoodClick}
                    className="relative group cursor-pointer transform hover:scale-[1.02] transition-transform duration-300"
                >
                    {/* Icon - Outside Clipping */}
                    <div className="absolute -top-3 -left-3 bg-white border border-slate-100 p-1.5 rounded-full shadow-sm z-20">
                        <Bot className="w-4 h-4 text-emerald-600" />
                    </div>

                    {/* Clipped Card Container */}
                    <div className={`relative rounded-2xl rounded-tl-sm overflow-hidden bg-white shadow-xl transition-all duration-300 ${isFoodPulsing ? 'p-[2px]' : 'border border-slate-100'}`}>
                        {/* Spinning Beam Background */}
                        <div className={`absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_280deg,#10b981_360deg)] animate-[spin_8s_linear_infinite] opacity-0 blur-md transition-opacity duration-300 ${isFoodPulsing ? 'opacity-100' : ''}`}></div>

                        {/* Content */}
                        <div className="relative bg-white p-5 h-full rounded-[inherit]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Food & Perishables</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed font-medium min-h-[60px] flex items-center transition-opacity duration-300">
                                “{foodInsights[foodIndex]}”
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bubble 2 */}
                <div
                    onClick={handleFashionClick}
                    className="relative group cursor-pointer transform hover:scale-[1.02] transition-transform duration-300 ml-6"
                >
                    <div className="absolute -top-3 -right-3 bg-white border border-slate-100 p-1.5 rounded-full shadow-sm z-20">
                        <Bot className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className={`relative rounded-2xl rounded-tr-sm overflow-hidden bg-white shadow-xl transition-all duration-300 ${isFashionPulsing ? 'p-[2px]' : 'border border-slate-100'}`}>
                        <div className={`absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_280deg,#3b82f6_360deg)] animate-[spin_8s_linear_infinite] opacity-0 blur-md transition-opacity duration-300 ${isFashionPulsing ? 'opacity-100' : ''}`}></div>

                        <div className="relative bg-white p-5 h-full rounded-[inherit]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Fashion & Retail</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed font-medium min-h-[60px] flex items-center transition-opacity duration-300">
                                “{fashionInsights[fashionIndex]}”
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
