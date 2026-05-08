'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export function HeroInputForm() {
    const [email, setEmail] = useState('');
    const [placeholder, setPlaceholder] = useState('');
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [charIndex, setCharIndex] = useState(0);

    const phrases = ["Enter your work email", "Start your free trial", "Unlock Zen AI insights", "Join 30+ smart retailers"];

    useEffect(() => {
        const timeout = setTimeout(() => {
            const currentPhrase = phrases[phraseIndex];
            
            if (!isDeleting && charIndex < currentPhrase.length) {
                setPlaceholder(currentPhrase.substring(0, charIndex + 1));
                setCharIndex(prev => prev + 1);
            } else if (isDeleting && charIndex > 0) {
                setPlaceholder(currentPhrase.substring(0, charIndex - 1));
                setCharIndex(prev => prev - 1);
            } else if (!isDeleting && charIndex === currentPhrase.length) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else {
                setIsDeleting(false);
                setPhraseIndex((prev) => (prev + 1) % phrases.length);
                setCharIndex(0);
            }
        }, isDeleting ? 40 : 80);

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, phraseIndex]);

    return (
        <div className="flex flex-row w-full gap-2 items-stretch max-w-md mx-auto lg:mx-0">
            <Input
                type="email"
                placeholder={placeholder || "Enter your work email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Work email address"
                className="
                    !h-auto
                    !min-h-[4rem]
                    !py-3
                    !leading-tight
                    placeholder-slate-400
                    focus:outline-none
                    focus:ring-2 focus:ring-primary/20
                    focus:border-primary
                    transition-all
                    text-base
                    text-slate-900
                    tracking-tight
                    font-dm-sans
                    bg-white
                    border border-slate-200
                    rounded-md
                    px-4
                    shadow-sm
                    flex-1
                    w-auto
                "
            />

            <div className="cta-buttons-container flex gap-4 rounded-md items-center justify-center shrink-0">
                <div className="inline-block rounded-md h-full">
                    <div className="codepen-button rounded-md h-full">
                        <Link href={email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'} className="h-full block">
                            <span className="flex items-center justify-center w-full text-center bg-[#1e293b] text-white hover:bg-[#0f172a] transition-colors text-sm font-semibold tracking-wide font-dm-sans rounded-md py-2 px-5 shadow-sm whitespace-nowrap h-full min-h-[4rem] leading-tight">
                                Get Started
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
