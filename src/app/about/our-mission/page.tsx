
'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Barcode, Package, Box, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { InteractiveGrid } from '@/components/interactive-grid';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': any;
    }
  }
}

export default function OurMissionPage() {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [mounted, setMounted] = useState(false);

  const checkScroll = () => {
    if (railRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: number) => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: direction * 540, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#fcfcfc] text-neutral-900 selection:bg-primary/20 min-h-screen overflow-x-hidden relative">
      <div className="fixed grid-lines w-full h-full top-0 right-0 left-0 pointer-events-none z-0 opacity-[0.15]"></div>
      
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
        <InteractiveGrid />
        <div className="aura-background"></div>
      </div>

      <main className="z-10 pt-24 relative font-geist">
        {/* Hero */}
        <section className="md:pl-6 md:pr-6 md:pt-20 text-center max-w-5xl mt-20 mr-auto mb-20 ml-auto pt-20 pr-6 pl-6 bg-transparent">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.15]">
            <motion.div 
              animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[15%] left-[15%]"
            >
              <Barcode className="w-16 h-16 text-slate-900" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-[25%] right-[15%]"
            >
              <Package className="w-20 h-20 text-slate-900" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-[20%] left-[10%]"
            >
              <Box className="w-12 h-12 text-slate-900" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 25, 0], rotate: [0, 15, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-[15%] right-[10%]"
            >
              <Tag className="w-24 h-24 text-slate-900" />
            </motion.div>
          </div>
          <div className="inline-flex gap-2 text-xs text-neutral-600 bg-neutral-100 border-neutral-200 border rounded-full mr-auto ml-auto pt-1.5 pr-3 pb-1.5 pl-3 items-center backdrop-blur-sm">
            {mounted && <iconify-icon icon="solar:stars-linear" class="h-3.5 w-3.5 text-primary" />}
            <span className="font-geist text-neutral-900 font-semibold">AI-Powered Retail Intelligence</span>
            <span className="mx-1 h-1 w-1 rounded-full bg-neutral-300"></span>
            <span className="text-neutral-500 font-geist">Decisions, Not Dashboards</span>
          </div>

          <h1 
            className="md:text-7xl lg:text-8xl text-5xl font-medium tracking-tighter font-jakarta mt-6 pt-2 pb-2 drop-shadow-lg leading-tight" 
            style={{ 
              maskImage: 'linear-gradient(150deg, transparent, black 30%, black 50%, transparent)', 
              WebkitMaskImage: 'linear-gradient(150deg, transparent, black 30%, black 50%, transparent)' 
            }}
          >
            Turning Retail Data Into Clear Decisions
          </h1>
          <p className="mt-5 text-base md:text-lg text-neutral-600 max-w-2xl mx-auto font-geist">
            Zeneva unifies your entire inventory, sales, and customer data into a single, proactive AI intelligence layer. Never operate in the dark again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 items-center justify-center">
            <Link href="/signup" className="codepen-button-aura">
              <span>
                {mounted && <iconify-icon icon="solar:user-plus-linear" class="w-5 h-5 mx-1" />}
                Join the Mission
              </span>
            </Link>
            <Link href="/download" className="border border-neutral-200 inline-flex items-center gap-2 hover:bg-neutral-100 transition-colors text-sm font-medium text-neutral-900 font-geist bg-neutral-50 rounded-full pt-3 pr-5 pb-3 pl-5 backdrop-blur-sm">
              {mounted && <iconify-icon icon="solar:play-circle-linear" class="h-4 w-4 text-primary" />}
              Watch Video
            </Link>
          </div>
        </section>

        {/* Logo Cloud - Retailers */}
        <section className="md:mt-32 max-w-7xl mt-24 mr-auto ml-auto pt-16 pr-6 pb-6 pl-6 relative">
          <div className="text-center">
            <p className="uppercase text-sm font-medium text-neutral-400 tracking-wide font-geist">
              Empowering fast-growing retail businesses
            </p>
          </div>
          <div className="overflow-hidden mt-10 relative">
            <div 
              style={{ 
                maskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)', 
                WebkitMaskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)' 
              }}
            >
              <div className="flex gap-6 will-change-transform animate-marquee-left opacity-30">
                <div className="flex gap-12 shrink-0 items-center">
                   <span className="text-2xl font-bold text-neutral-400 font-jakarta">BOUTIQUES</span>
                   <span className="text-2xl font-bold text-neutral-400 font-jakarta">SUPERMARKETS</span>
                   <span className="text-2xl font-bold text-neutral-400 font-jakarta">PHARMACIES</span>
                   <span className="text-2xl font-bold text-neutral-400 font-jakarta">GADGET STORES</span>
                   <span className="text-2xl font-bold text-neutral-400 font-jakarta">LUXURY RETAIL</span>
                </div>
                <div className="flex gap-12 shrink-0 items-center">
                   <span className="text-2xl font-bold text-white/20 font-jakarta">BOUTIQUES</span>
                   <span className="text-2xl font-bold text-white/20 font-jakarta">SUPERMARKETS</span>
                   <span className="text-2xl font-bold text-white/20 font-jakarta">PHARMACIES</span>
                   <span className="text-2xl font-bold text-white/20 font-jakarta">GADGET STORES</span>
                   <span className="text-2xl font-bold text-white/20 font-jakarta">LUXURY RETAIL</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligent Inventory */}
        <section className="sm:px-6 sm:mt-24 md:mt-32 max-w-7xl mt-16 mr-auto ml-auto pr-4 pl-4 relative">
          <div className="max-w-7xl mr-auto ml-auto">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Diagram */}
              <div 
                className="bg-[url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/5aa83035-c72b-4cb5-9937-66ce103b64ef_1600w.webp')] bg-cover rounded-[36px] pt-5 pr-5 pb-5 pl-5 relative aspect-square lg:aspect-auto" 
                style={{ 
                  maskImage: 'linear-gradient(130deg, transparent, black 10%, black 70%, transparent)', 
                  WebkitMaskImage: 'linear-gradient(130deg, transparent, black 10%, black 70%, transparent)' 
                }}
              >
                <article className="group relative overflow-hidden transition-shadow hover:shadow-md bg-white/80 border-neutral-200 border rounded-3xl shadow-xl backdrop-blur-xl h-full">
                  <div className="sm:p-10 p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 font-jakarta">Intelligent Inventory</h3>
                      <span className="inline-flex items-center gap-2 text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-full px-2.5 py-1 backdrop-blur-sm">
                        {mounted && <iconify-icon icon="solar:stars-linear" class="text-primary h-4 w-4" />}
                        Zen AI Engine
                      </span>
                    </div>

                    {/* Illustration */}
                    <div className="relative flex-1 rounded-2xl bg-neutral-50 ring-1 ring-inset ring-neutral-200 mb-8 overflow-hidden min-h-[200px]">
                      <div className="absolute inset-0 p-6 flex flex-col gap-3">
                         <div className="bg-white border border-neutral-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <span className="text-sm font-medium text-neutral-700">Automatic Restock Alert</span>
                            <span className="text-xs text-primary font-bold">Recommended</span>
                         </div>
                         <div className="bg-white border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                               {mounted && <iconify-icon icon="solar:ticker-star-linear" class="text-emerald-500 h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                               <p className="text-sm font-medium text-neutral-800">Top Performer: Luxury Silk Scarf</p>
                               <p className="text-xs text-neutral-500">Sell rate: +45% this week</p>
                            </div>
                         </div>
                         <div className="bg-white border border-amber-500/20 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                               {mounted && <iconify-icon icon="solar:plain-linear" class="text-amber-500 h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                               <p className="text-sm font-medium text-neutral-800">Dead Capital: Vintage Belt</p>
                               <p className="text-xs text-neutral-500">Suggestion: Bundle or Discount</p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-900 tracking-tight font-jakarta">Foresight, Not Hindsight</h4>
                        <p className="mt-2 text-sm text-neutral-600 font-geist">Predict potential stockouts before they happen, ensuring you never lose a sale due to empty shelves.</p>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold tracking-tight text-neutral-900 font-jakarta">Capital Optimization</h4>
                        <p className="mt-2 text-sm text-neutral-600 font-geist">Automatically identify dead stock and convert trapped capital back into cash flow with smart exit strategies.</p>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              {/* Copy & stats */}
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="sm:text-5xl text-4xl font-medium text-neutral-900 tracking-tight font-jakarta">Proactive Retail Intelligence</h3>
                  <p className="mt-6 text-lg text-neutral-600 font-geist">Retail businesses generate massive amounts of data, but almost none of it turns into usable judgment. Zeneva changes that balance.</p>
                </div>

                <div className="border-t border-white/10 pt-8 mt-4">
                  <div className="grid gap-8">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-1">
                        {mounted && <iconify-icon icon="solar:bolt-linear" class="text-primary w-5 h-5" />}
                      </div>
                      <div>
                         <h4 className="text-lg font-semibold font-jakarta text-neutral-900">Instant Visibility</h4>
                         <p className="text-sm text-neutral-500 mt-1">See your entire business health across all locations in one beautiful, real-time dashboard.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-1">
                        {mounted && <iconify-icon icon="solar:shield-check-linear" class="text-primary w-5 h-5" />}
                      </div>
                      <div>
                         <h4 className="text-lg font-semibold font-jakarta text-neutral-900">Offline Resilience</h4>
                         <p className="text-sm text-neutral-500 mt-1">Market conditions aren't perfect. Your POS should be. Zeneva works 100% offline and syncs when back online.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-8 mt-4 grid grid-cols-2 md:grid-cols-3 gap-6">
                   <div>
                      <p className="text-3xl font-bold font-jakarta text-neutral-900">1,100+</p>
                      <p className="text-xs text-neutral-400 font-geist uppercase tracking-widest">Transactions Sync</p>
                   </div>
                   <div>
                      <p className="text-3xl font-bold font-jakarta text-neutral-900">₦45.6M</p>
                      <p className="text-xs text-neutral-400 font-geist uppercase tracking-widest">GMV Processed</p>
                   </div>
                   <div className="hidden md:block">
                      <p className="text-3xl font-bold font-jakarta text-neutral-900">1,070+</p>
                      <p className="text-xs text-neutral-400 font-geist uppercase tracking-widest">Catalog Variants</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-32 relative max-w-7xl mx-auto px-6 mt-32">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">Social Proof</span>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 font-display">Voices of Victory</h2>
              <p className="text-xl text-neutral-600 mt-4 font-body leading-relaxed">
                Real stories from the frontlines of retail revolution.
              </p>
            </div>
            <Link href="/blog" className="group flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-neutral-900 border-b-2 border-primary/20 hover:border-primary transition-all pb-1">
              Read all stories
              <iconify-icon icon="solar:arrow-right-up-linear" className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </div>
          <div className="relative h-[400px]">
              <div 
                className="overflow-hidden h-full rounded-2xl relative" 
                style={{ 
                  maskImage: 'linear-gradient(90deg, transparent, white 10%, white 90%, transparent)', 
                  WebkitMaskImage: 'linear-gradient(90deg, transparent, white 10%, white 90%, transparent)' 
                }}
              >
                <div 
                  className="flex gap-6 overflow-x-auto scroll-smooth px-10 absolute inset-0 items-center hide-scrollbar" 
                  ref={railRef}
                  onScroll={checkScroll}
                >
                   <article className="min-w-[400px] md:min-w-[500px] bg-white border border-neutral-100 rounded-3xl p-8 backdrop-blur-md -rotate-1 shadow-xl flex-shrink-0">
                    <p className="text-xl md:text-2xl text-neutral-900 tracking-tight font-jakarta font-medium">
                      "Zeneva stopped being just a POS and started being a partner. It told me exactly which luxury silks to stop ordering and where I was losing money on belts."
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-500">AB</div>
                      <div>
                        <div className="text-base font-semibold text-neutral-900">Dr. Amina Bolanle</div>
                        <div className="text-xs text-neutral-500">Director, Safeway Dermatology & Laser Center</div>
                      </div>
                    </div>
                  </article>

                  <article className="min-w-[400px] md:min-w-[500px] bg-white border border-neutral-100 rounded-3xl p-8 backdrop-blur-md rotate-1 shadow-xl flex-shrink-0">
                    <p className="text-xl md:text-2xl text-neutral-900 tracking-tight font-jakarta font-medium">
                      "The offline first approach saved us during network blackouts. We didn't lose a single sale, and everything synced perfectly the moment we got back online."
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">OA</div>
                      <div>
                        <div className="text-base font-semibold text-neutral-900">Olumide Adebayo</div>
                        <div className="text-xs text-neutral-500">Operations Lead, Lag Retail Ops</div>
                      </div>
                    </div>
                  </article>

                  <article className="min-w-[400px] md:min-w-[500px] bg-white border border-neutral-100 rounded-3xl p-8 backdrop-blur-md -rotate-2 shadow-xl flex-shrink-0">
                    <p className="text-xl md:text-2xl text-neutral-900 tracking-tight font-jakarta font-medium">
                      "I used to spend 4 hours a night reconcilling numbers. Now, Zeneva does it in real-time. My business is finally operating with clarity."
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">CO</div>
                      <div>
                        <div className="text-base font-semibold text-neutral-900">Chisom Okafor</div>
                        <div className="text-xs text-neutral-500">Founder, The Retail Hub</div>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="absolute bottom-6 right-10 flex items-center gap-4">
                  <button 
                    className="hover:bg-neutral-200 transition-all inline-flex text-neutral-900 bg-neutral-100 w-12 h-12 border-neutral-200 border rounded-full items-center justify-center backdrop-blur-md"
                    onClick={() => scroll(-1)}
                    disabled={!canScrollLeft}
                    style={{ opacity: canScrollLeft ? 1 : 0.3 }}
                  >
                    {mounted && <iconify-icon icon="solar:arrow-left-linear" class="w-6 h-6" />}
                  </button>
                  <button 
                    className="w-12 h-12 rounded-full text-white bg-black hover:bg-neutral-800 transition-all inline-flex items-center justify-center shadow-lg"
                    onClick={() => scroll(1)}
                    disabled={!canScrollRight}
                    style={{ opacity: canScrollRight ? 1 : 0.3 }}
                  >
                    {mounted && <iconify-icon icon="solar:arrow-right-linear" class="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-6 mt-32 relative mb-40 text-center">
             <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600 mb-8 backdrop-blur-sm">
               {mounted && <iconify-icon icon="solar:rocket-linear" class="h-4 w-4 text-primary" />}
               <span className="font-geist">Join 30+ Forward-Thinking Retailers</span>
             </div>
             <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tighter text-neutral-900 mb-8 font-jakarta">Ready to see your business clearly?</h2>
             <p className="text-neutral-600 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-geist">
               Stop firefighting and start leading. Experience the future of retail management today with Zeneva.
             </p>

             <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
               <Link href="/signup" className="codepen-button-aura scale-125 mx-4">
                  <span>Join the Mission</span>
               </Link>
               <Link href="/careers" className="mt-8 sm:mt-0 text-sm font-semibold text-neutral-600 hover:text-primary transition-colors flex items-center gap-2">
                 Join the Team <iconify-icon icon="solar:arrow-right-linear" />
               </Link>
             </div>
          </section>
      </main>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
