
'use client';
import {
  Server,
  TrendingUp,
  Database,
  ArrowRight,
  Workflow,
  Check,
  Binary,
  Monitor,
  Users,
  Cpu,
  Globe,
  Zap,
  CloudLightning,
  Layers,
  ShoppingBag,
  BarChart2,
  AlertTriangle,
  ChevronRight,
  Bot,
  ShoppingCart,
  Shirt,
  Coffee,
  Sparkles,
  BookOpen,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OurMissionPage() {
  return (
    <div className="min-h-screen overflow-x-hidden selection:bg-primary/20 selection:text-foreground text-foreground font-body bg-neutral-100 relative">
      <div className="fixed grid-lines w-full h-[100vh] top-0 right-0 left-0 pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col min-h-screen pt-16 lg:pt-20">
        <main className="flex-1 w-full">

          <section className="lg:px-12 lg:pt-16 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 min-h-[60vh] lg:min-h-[75vh] max-w-[1600px] mr-auto ml-auto pt-8 pr-6 pb-12 pl-6 items-center">
            <div className="animate-clip-in lg:col-span-7 space-y-6" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-white border-border text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                The OS for Modern Commerce
              </div>
              <h1 className="leading-[0.95] lg:text-7xl xl:text-8xl text-5xl font-medium text-foreground tracking-tighter font-display">
                Your Commerce,
                <span className="text-muted-foreground/80 relative inline-block"> Optimized
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4"></path></svg>
                </span> for Growth.
              </h1>
              <p className="leading-relaxed lg:text-xl text-lg font-normal text-muted-foreground font-body max-w-2xl">
                We design, build, and manage the digital systems—inventory, sales, and marketing—that power your business. No silos, just results.
              </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <Button asChild size="lg" className="font-medium px-8 py-4 rounded-full transition-transform hover:scale-105 shadow-xl w-full sm:w-auto">
                        <Link href="/signup">
                            Start Your Free Trial
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-4 bg-white/50 w-full sm:w-auto">
                        <Link href="#features">
                            Explore Features
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="lg:col-span-5 flex flex-col animate-fade-up lg:mt-0 h-full mt-8 relative justify-center" style={{ animationDelay: '0.3s' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
              <div className="relative space-y-4">
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4 animate-float shadow-lg lg:ml-0 max-w-sm mx-auto w-full" style={{ animationDelay: '0s' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 bg-primary/10 text-primary border-primary/20">
                    <Server width="20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Inventory Sync</p>
                    <p className="text-xs text-muted-foreground truncate">POS & Online Store Synced</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border font-medium bg-background text-foreground border-border">99.9% Accuracy</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4 animate-float shadow-lg lg:ml-8 max-w-sm mx-auto w-full" style={{ animationDelay: '1.5s' }}>
                  <div className="flex shrink-0 bg-primary w-10 h-10 border rounded-full items-center justify-center text-primary-foreground border-primary/50">
                    <TrendingUp width="20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">AI Sales Analytics</p>
                    <p className="text-xs text-muted-foreground truncate">Q3 Sales Performance</p>
                  </div>
                  <span className="bg-primary text-[10px] px-2 py-0.5 rounded border border-primary/50 font-medium text-primary-foreground">+15.4%</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4 animate-float shadow-lg lg:-ml-4 max-w-sm mx-auto w-full" style={{ animationDelay: '2.5s' }}>
                  <div className="w-10 h-10 rounded-full text-primary flex items-center justify-center border shrink-0 bg-foreground border-border">
                    <Database width="20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">CRM Update</p>
                    <p className="text-xs text-muted-foreground truncate">New Customer Added</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border font-medium bg-foreground text-background border-border">Active</span>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-white w-full z-20 rounded-t-[40px] pt-12 pb-12 relative shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
            <section className="max-w-[1600px] mx-auto w-full mb-16 lg:mb-24 px-6 lg:px-12">
              <p className="text-left text-sm font-medium text-muted-foreground uppercase tracking-widest mb-6">Powering various high-growth businesses</p>
              <div className="overflow-hidden w-full relative">
                <div className="z-10 bg-gradient-to-r to-transparent w-12 lg:w-40 h-full absolute top-0 left-0 from-white"></div>
                <div className="bg-gradient-to-l to-transparent w-12 lg:w-40 h-full z-10 absolute top-0 right-0 from-white"></div>
                <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
                  <div className="flex items-center gap-12 lg:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><ShoppingCart /> Online Retailers</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Shirt /> Fashion Boutiques</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Coffee /> Coffee Shops</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Sparkles /> Skincare Brands</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><BookOpen /> Book Stores</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Smartphone /> Electronics Shops</div>
                  </div>
                  <div className="flex items-center gap-12 lg:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 ml-12 lg:ml-24">
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><ShoppingCart /> Online Retailers</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Shirt /> Fashion Boutiques</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Coffee /> Coffee Shops</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Sparkles /> Skincare Brands</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><BookOpen /> Book Stores</div>
                    <div className="flex items-center gap-3 text-xl lg:text-2xl font-semibold font-sans"><Smartphone /> Electronics Shops</div>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="max-w-[1600px] mx-auto px-6 lg:px-12 animate-fade-up w-full mb-12 lg:mb-20" style={{ animationDelay: '0.4s' }}>
                <div className="text-center mb-12">
                    <h2 className="lg:text-5xl text-3xl font-medium text-foreground tracking-tight font-display">
                        Stop Guessing. <span className="text-muted-foreground">Start Growing.</span>
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    <div className="p-8 bg-neutral-50 border border-border rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6">
                            <AlertTriangle width="24" height="24" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Tired of stockouts?</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">Our real-time inventory sync means you never oversell. Get proactive low-stock alerts before it’s too late.</p>
                    </div>
                    <div className="p-8 bg-neutral-50 border border-border rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <Bot width="24" height="24" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-foreground">Flying blind on insights?</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">Our Zen AI analyzes your sales and customer data to provide actionable insights, from product recommendations to engagement tactics.</p>
                    </div>
                    <div className="p-8 bg-neutral-50 border border-border rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                           <Users width="24" height="24" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-foreground">Losing customer context?</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">Our intelligent CRM links every sale to a customer profile, building a rich history so you can deliver personalized service and rewards.</p>
                    </div>
                </div>
            </section>

            <section id="features" className="lg:px-12 lg:mb-20 max-w-[1600px] mr-auto mb-12 ml-auto pr-6 pl-6">
                <h2 className="text-3xl lg:text-5xl font-medium text-foreground tracking-tight font-display mb-10 lg:mb-12">The Future of Inventory Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-fr">
                    <div className="row-span-1 lg:row-span-2 group overflow-hidden lg:p-10 flex flex-col min-h-[500px] lg:min-h-full transition-transform hover:scale-[1.01] duration-300 bg-primary/10 border-primary/20 border rounded-[32px] pt-6 pr-6 pb-6 pl-6 relative justify-between">
                        <div className="z-20 mt-auto relative">
                            <div className="flex text-primary bg-white/50 w-12 h-12 border-primary/20 border rounded-2xl mb-6 backdrop-blur-md items-center justify-center">
                                <Database width="24" />
                            </div>
                            <h3 className="lg:text-3xl text-2xl font-bold text-foreground font-display mb-3">Unified Inventory Core</h3>
                            <p className="text-muted-foreground mb-6 text-sm lg:text-base leading-relaxed max-w-sm">
                                Your single source of truth. Manage stock across your physical store and online storefront from one powerful dashboard.
                            </p>
                        </div>
                    </div>
                     <div className="col-span-1 md:col-span-2 group overflow-hidden lg:p-10 min-h-[400px] flex flex-col md:flex-row transition-transform hover:scale-[1.01] duration-300 bg-foreground border-border border rounded-[32px] pt-6 pr-6 pb-6 pl-6 relative items-center justify-between text-background">
                         <div className="relative z-20 flex flex-col h-full justify-between w-full md:w-1/2 mb-8 md:mb-0">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 text-primary">
                                    <Layers width="24" />
                                </div>
                                <h3 className="lg:text-3xl text-2xl font-bold text-white font-display mb-3">Integrated POS &amp; CRM</h3>
                                <p className="text-muted mb-6 text-sm lg:text-base leading-relaxed max-w-xs">
                                    Process sales at lightning speed while building valuable customer relationships. Every transaction enriches your data with our intelligent CRM.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="group relative overflow-hidden bg-primary/5 rounded-[32px] p-6 lg:p-10 flex flex-col justify-between min-h-[350px] transition-transform hover:scale-[1.01] duration-300 border border-primary/10 cursor-pointer">
                        <div className="z-20 mt-auto relative">
                             <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 text-foreground">
                                <ShoppingBag width="20" />
                            </div>
                            <h3 className="lg:text-2xl text-xl font-bold text-foreground font-display mb-2 flex items-center gap-2">E-Commerce Storefront <Bot className="text-primary"/></h3>
                            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">Launch a beautiful online store in minutes. No code required. Integrated with your inventory from day one.</p>
                            <Link href="/signup" className="inline-flex items-center text-foreground font-bold text-xs uppercase tracking-wide hover:opacity-70">
                                Launch Your Store <ChevronRight className="ml-1" />
                            </Link>
                        </div>
                    </div>
                    <div className="group relative overflow-hidden bg-purple-50 rounded-[32px] p-6 lg:p-10 flex flex-col justify-between min-h-[350px] transition-transform hover:scale-[1.01] duration-300 border border-purple-100 cursor-pointer">
                        <div className="z-20 mt-auto relative">
                            <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 text-foreground">
                                <Bot width="20" />
                            </div>
                            <h3 className="lg:text-2xl text-xl font-bold text-foreground font-display mb-2">Zen AI Copilot</h3>
                            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">Your AI-powered assistant. Get data-driven suggestions for inventory, customer engagement, and sales strategy.</p>
                            <Link href="#features" className="inline-flex items-center text-foreground font-bold text-xs uppercase tracking-wide hover:opacity-70">
                                Discover AI Features <ChevronRight className="ml-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            
            <section className="py-12 lg:py-16 max-w-[1600px] mx-auto px-6 lg:px-12">
              <div className="text-center max-w-4xl mx-auto space-y-8">
                <h2 className="text-3xl lg:text-6xl font-medium text-foreground tracking-tight font-display leading-tight">
                  Why Zeneva?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
                  <div className="space-y-3 p-6 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center text-foreground mb-2">
                      <Binary width="24" height="24" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Democratize Commerce Tech</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">We provide enterprise-grade inventory and sales tools in a simple, beautiful package that anyone can use.</p>
                  </div>
                  <div className="space-y-3 p-6 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center text-foreground mb-2">
                      <Monitor width="24" height="24" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Intelligence, Not Just Data</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Zen AI analyzes your sales, troubleshoots your products, and provides actionable insights. We turn your data into your competitive advantage.</p>
                  </div>
                  <div className="space-y-3 p-6 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center text-foreground mb-2">
                      <Users width="24" height="24" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Obsessed with Your Growth</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">We're not just a software provider; we're your partner. We build the features real businesses need to thrive in a competitive landscape.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="max-w-[1600px] mx-auto px-6 lg:px-12 my-12 lg:my-20">
              <div className="lg:p-20 overflow-hidden text-center bg-primary/10 rounded-[32px] pt-8 pr-8 pb-8 pl-8 relative">
                <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                  <h2 className="text-3xl lg:text-6xl leading-tight font-medium text-foreground tracking-tight font-display">Ready to optimize your business?</h2>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/signup" passHref>
                      <Button size="lg" className="font-medium px-8 py-4 rounded-full transition-transform hover:scale-105 shadow-xl w-full sm:w-auto">
                        Start Your Free Trial
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
