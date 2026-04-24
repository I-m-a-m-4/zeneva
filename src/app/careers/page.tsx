'use client';

import React from 'react';
import MarketingHeader from "@/components/layout/marketing-header";
import MarketingFooter from "@/components/layout/marketing-footer";
import { Button } from "@/components/ui/button";
import { InteractiveGrid } from '@/components/interactive-grid';
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Rocket, 
  Globe, 
  Heart, 
  Zap, 
  Coffee, 
  Briefcase, 
  ChevronRight,
  Monitor,
  Code,
  LineChart,
  Megaphone
} from "lucide-react";
import Link from 'next/link';

const values = [
  {
    title: "Think Big, Start Small",
    description: "We are visionaries who aren't afraid to get our hands dirty. We build for the future while delivering value today.",
    icon: Rocket
  },
  {
    title: "User-First Approach",
    description: "Every feature we build and every decision we make starts with how it will empower our merchants.",
    icon: Users
  },
  {
    title: "Extreme Ownership",
    description: "We take full responsibility for our work and its impact. We don't just find problems; we build solutions.",
    icon: Zap
  },
  {
    title: "Continuous Learning",
    description: "The tech world moves fast, and so do we. We invest in growth and encourage curiosity at every level.",
    icon: Coffee
  }
];

const perks = [
  { title: "Competitive Salary", icon: Heart },
  { title: "Remote-First Culture", icon: Globe },
  { title: "Learning Allowance", icon: Briefcase },
  { title: "Health Insurance", icon: Users },
  { title: "Stock Options", icon: LineChart },
  { title: "Company Retreats", icon: Zap }
];

const jobs = [
  {
    category: "Engineering",
    positions: [
      { id: 1, title: "Senior Frontend Engineer", location: "Remote, Nigeria", type: "Full-time" },
      { id: 2, title: "Backend Engineer (Node.js/Firebase)", location: "Remote, Nigeria", type: "Full-time" },
      { id: 3, title: "Fullstack Developer", location: "Lagos, Nigeria / Remote", type: "Full-time" }
    ]
  },
  {
    category: "Product & Design",
    positions: [
      { id: 4, title: "Senior Product Designer", location: "Remote, Nigeria", type: "Full-time" },
      { id: 5, title: "Product Manager", location: "Remote, Nigeria", type: "Full-time" }
    ]
  },
  {
    category: "Marketing & Growth",
    positions: [
      { id: 6, title: "Growth Marketing Manager", location: "Lagos, Nigeria", type: "Full-time" },
      { id: 7, title: "Content Strategist", location: "Remote, Nigeria", type: "Part-time" }
    ]
  }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary/10">
      <MarketingHeader />

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <InteractiveGrid />
            <div className="aura-background"></div>
          </div>
          
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <Badge variant="outline" className="mb-6 px-4 py-1 border-primary/20 text-primary bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
              Careers at Zeneva
            </Badge>
            <h1 className="text-5xl md:text-7xl font-light text-slate-900 tracking-tight font-bricolage max-w-4xl mx-auto mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100 fill-mode-both">
              Shape the Future of <span className="text-primary font-medium italic">Retail Commerce</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-dm-sans tracking-tight mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-both">
              We are building the future of commerce for African retailers. Join our team of superstars and help millions of businesses grow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 fill-mode-both">
              <Button asChild size="lg" className="rounded-full px-8 py-6 h-auto text-lg font-medium shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <Link href="#openings">View Open Positions</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 h-auto text-lg font-medium transition-all hover:bg-slate-50 border-slate-200">
                <Link href="/about/our-mission">Learn about our mission</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Culture / Values Section */}
        <section className="py-24 px-6 bg-slate-50/50 relative border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-light text-slate-900 font-bricolage mb-4">The way we work</h2>
                <p className="text-lg text-slate-500 font-dm-sans tracking-tight">
                  Our culture is built on transparency, speed, and deep empathy for the merchants we serve.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="group p-8 bg-white border border-slate-200 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <value.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mb-4">{value.title}</h3>
                  <p className="text-slate-500 text-base leading-relaxed font-dm-sans">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Image / Stats Section */}
        <section className="py-24 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="relative">
                <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200" 
                    alt="Team working together" 
                    className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl -z-10"></div>
              </div>

              <div>
                <h2 className="text-3xl md:text-4xl font-light text-slate-900 font-bricolage mb-8 leading-tight">
                  Join a diverse team of <span className="text-primary italic">dreamers</span> and builders.
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-slate-900 mb-1">Collaborative Environment</h4>
                      <p className="text-slate-500 font-dm-sans">Work with the brightest minds across multiple continents, from Lagos to London.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                      <Rocket className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-slate-900 mb-1">Massive Impact</h4>
                      <p className="text-slate-500 font-dm-sans">Every line of code you write directly affects the livelihoods of thousands of entrepreneurs.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-slate-900 mb-1">Global Mindset</h4>
                      <p className="text-slate-500 font-dm-sans">We're building for a global market, starting with the most exciting economies in the world.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Perks Section */}
        <section className="py-24 px-6 bg-slate-900 text-white rounded-[4rem] mx-4 my-8">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-light font-bricolage mb-16">Perks & Benefits</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {perks.map((perk, index) => (
                <div key={index} className="flex flex-col items-center group">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <perk.icon className="w-8 h-8 text-primary group-hover:text-white" />
                  </div>
                  <span className="text-slate-300 font-medium text-sm group-hover:text-white transition-colors">{perk.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Openings Section */}
        <section id="openings" className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-light text-slate-900 font-bricolage mb-6">Open Openings</h2>
              <p className="text-lg text-slate-500 font-dm-sans max-w-xl mx-auto">
                Don't see a role that fits? Send us your CV at <span className="text-primary font-medium">careers@zeneva.com</span>
              </p>
            </div>

            <div className="space-y-16">
              {jobs.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <h3 className="text-xl font-semibold text-slate-900 mb-8 border-b border-slate-100 pb-4 flex items-center gap-3">
                    {group.category}
                    <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{group.positions.length} roles</span>
                  </h3>
                  <div className="grid gap-4">
                    {group.positions.map((job) => (
                      <Link 
                        key={job.id} 
                        href={`/careers/${job.id}`}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                      >
                        <div>
                          <h4 className="text-lg font-medium text-slate-900 group-hover:text-primary transition-colors">{job.title}</h4>
                          <div className="flex gap-4 mt-2">
                             <span className="text-sm text-slate-500 flex items-center gap-1.5 font-dm-sans">
                               <Globe className="w-3.5 h-3.5" /> {job.location}
                             </span>
                             <span className="text-sm text-slate-500 flex items-center gap-1.5 font-dm-sans">
                               <Briefcase className="w-3.5 h-3.5" /> {job.type}
                             </span>
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                          Apply Now <ChevronRight className="w-5 h-5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-32 px-6">
          <div className="max-w-4xl mx-auto bg-primary rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
            <InteractiveGrid className="opacity-20" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-light font-bricolage mb-8">Ready to make an impact?</h2>
              <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto font-dm-sans">
                Join us on our quest to build the operating system for retail in Africa. We can't wait to see what you bring to the team.
              </p>
              <Button asChild size="lg" className="bg-white text-primary hover:bg-slate-100 rounded-full px-10 py-7 h-auto text-xl font-semibold shadow-2xl">
                <Link href="#openings">See Job Openings</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
