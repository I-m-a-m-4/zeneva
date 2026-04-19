'use client';

import * as React from 'react';
import { format } from 'date-fns';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight,
  Clock,
  Briefcase,
  Share2,
  Twitter,
  ChevronLeft,
  Zap,
  Shield,
  BarChart3,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { ThemeProvider } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';

export default function MasteringZenevaPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = React.useState<string>('');

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied', description: 'Article link added to clipboard.' });
  };

  // Intersection Observer for Scroll Highlighting
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -35% 0%' }
    );

    const sections = ['inventory', 'synchronization', 'audit', 'performance', 'growth'];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-white selection:bg-slate-900 selection:text-white">
        <MarketingHeader />
        
        <main className="min-h-screen">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-40 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12 lg:pb-24 lg:pt-20 xl:gap-16">
            <article className="min-w-0">
               {/* Breadcrumbs */}
              <nav className="mb-8 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
                <span className="text-slate-300">/</span>
                <span className="truncate">Mastering Retail Operations with Zeneva</span>
              </nav>

              <header className="mb-10">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.15]">
                   Mastering Retail Operations: The Zeneva Framework for Success
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>Retail Mastery</span>
                   </div>
                   <span className="text-slate-200">•</span>
                   <time dateTime="2026-04-19">April 19, 2026</time>
                   <span className="text-slate-200">•</span>
                   <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>12 MIN READ</span>
                   </div>
                </div>
              </header>

              {/* Content Area */}
              <div className="prose prose-slate max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                prose-p:text-slate-600 prose-p:text-lg prose-p:leading-relaxed prose-p:mb-8
                prose-strong:text-slate-900 prose-strong:font-bold
                prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-a:transition-all
                prose-blockquote:border-l-2 prose-blockquote:border-slate-200 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-500
                prose-img:rounded-3xl prose-img:shadow-sm
                prose-hr:border-slate-100 prose-hr:my-16
                prose-table:border-collapse prose-th:text-left prose-th:font-bold prose-th:text-slate-900 prose-th:pb-4 prose-td:py-4 prose-td:border-t prose-td:border-slate-100
              ">
                <p>Scaling a retail business in modern Nigeria requires more than just high-quality products. It requires a command over data, a shield against inventory loss, and the ability to manage multiple locations as if they were one. This is the core mission of Zeneva: providing you with the ultimate dashboard for clear, mission-critical decisions.</p>
                <p>In this guide, we break down the five pillars of operational excellence using the Zeneva framework. Whether you are managing a single boutique or a nationwide chain of pharmacies, these tactics will transform how you lead.</p>

                <hr />

                <h2 id="inventory" className="scroll-mt-32">Tactical Inventory Management</h2>
                <p>Inventory is your business&apos;s lifeblood, but it is also where most capital is trapped. Zeneva&apos;s inventory system doesn&apos;t just track numbers; it tracks velocity.</p>
                <ul>
                  <li><strong>Automated Reorder Points:</strong> Set thresholds so you are notified before stockouts happen, ensuring zero sales downtime.</li>
                  <li><strong>Expiry Tracking:</strong> Crucial for pharmacy and FMCG businesses, Zeneva alerts you months in advance of batch expiration.</li>
                  <li><strong>Variations & Categorization:</strong> Manage thousands of SKUs categorized by size, color, or batch with high-fidelity accuracy.</li>
                </ul>

                <h2 id="synchronization" className="scroll-mt-32">Multi-Outlet Synchronization</h2>
                <p>The biggest challenge of growth is fragmentation. Zeneva&apos;s cloud-native architecture ensures that every sale made in Lagos is immediately visible to the owner in Abuja.</p>
                <blockquote>
                  &quot;Growth without synchronization is just organized chaos. Zeneva brings every shop into a single, cohesive view.&quot;
                </blockquote>
                <p>With real-time sync, you can move stock between branches with a simple click, preventing overstocking in one location while another starves for product.</p>

                <h2 id="audit" className="scroll-mt-32">Real-Time Audit Integrity</h2>
                <p>Internal shrinkage is the silent killer of retail. Zeneva&apos;s audit logs record every single action taken on the system — from price adjustments to stock removals.</p>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Impact</th>
                        <th>Strategic Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Void Records</strong></td>
                        <td>Prevent Fraud</td>
                        <td>High Integrity</td>
                      </tr>
                      <tr>
                        <td><strong>Price Logs</strong></td>
                        <td>Trace Changes</td>
                        <td>Margin Security</td>
                      </tr>
                      <tr>
                        <td><strong>User Permissions</strong></td>
                        <td>Role Security</td>
                        <td>Accountability</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h2 id="performance" className="scroll-mt-32">Employee Performance Analytics</h2>
                <p>Your staff are your frontline. Knowing who is driving sales and who is lagging allows for precise training and reward systems. Zeneva tracks sales performance down to the individual cashier, providing you with data-driven leaderboard metrics.</p>

                <h2 id="growth" className="scroll-mt-32">Customer Growth Framework</h2>
                <p>Acquiring a new customer is 5x more expensive than retaining an existing one. Use Zeneva&apos;s customer loyalty profiles to build high-fidelity relationships. Track purchase history, offer targeted discounts, and ensure every customer feels recognized.</p>
              </div>

              {/* Share */}
              <div className="mt-24 pt-10 border-t border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Share</span>
                    <div className="flex gap-4">
                      <button onClick={copyLink} className="text-slate-400 hover:text-slate-900 transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-slate-900 transition-colors">
                        <Twitter className="h-4 w-4" />
                      </button>
                    </div>
                 </div>
                 
                 <Button asChild variant="link" className="text-slate-400 hover:text-slate-900 p-0 h-auto text-[11px] font-bold uppercase tracking-widest no-underline">
                    <Link href="/blog" className="flex items-center gap-2">
                      <ChevronLeft className="h-3 w-3" />
                      All articles
                    </Link>
                 </Button>
              </div>

              {/* CTA Section */}
              <section className="mt-24 rounded-[3rem] bg-slate-950 p-10 md:p-16 text-center text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full" />
                 <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                   Ready to see your business clearly?
                 </h2>
                 <p className="text-slate-400 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto">
                   Join Nigeria&apos;s most ambitious retailers who use Zeneva to drive growth and operational precision.
                 </p>
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="h-14 px-8 rounded-2xl bg-white text-slate-950 font-black hover:bg-slate-200 transition-all">
                       <Link href="/signup">Join the Mission</Link>
                    </Button>
                    <Button asChild variant="ghost" size="lg" className="h-14 px-8 rounded-2xl text-white hover:bg-white/10 font-black">
                       <Link href="/pricing">View Plans</Link>
                    </Button>
                 </div>
              </section>
            </article>

            {/* Sidebar / On this page */}
            <aside className="hidden lg:block">
              <div className="sticky top-40 space-y-12">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">On this page</p>
                    <ol className="mt-4 space-y-3 border-l border-slate-100 pl-4">
                       <li>
                         <a 
                           href="#inventory" 
                           className={`block text-xs font-bold transition-all ${activeSection === 'inventory' ? 'text-orange-600 pl-2' : 'text-slate-900'}`}
                         >
                           Tactical Inventory
                         </a>
                       </li>
                       <li>
                         <a 
                           href="#synchronization" 
                           className={`block text-xs font-bold transition-all ${activeSection === 'synchronization' ? 'text-orange-600 pl-2' : 'text-slate-400 hover:text-slate-900'}`}
                         >
                           Multi-Outlet Sync
                         </a>
                       </li>
                       <li>
                         <a 
                           href="#audit" 
                           className={`block text-xs font-bold transition-all ${activeSection === 'audit' ? 'text-orange-600 pl-2' : 'text-slate-400 hover:text-slate-900'}`}
                         >
                           Audit Integrity
                         </a>
                       </li>
                       <li>
                         <a 
                           href="#performance" 
                           className={`block text-xs font-bold transition-all ${activeSection === 'performance' ? 'text-orange-600 pl-2' : 'text-slate-400 hover:text-slate-900'}`}
                         >
                           Staff Analytics
                         </a>
                       </li>
                       <li>
                         <a 
                           href="#growth" 
                           className={`block text-xs font-bold transition-all ${activeSection === 'growth' ? 'text-orange-600 pl-2' : 'text-slate-400 hover:text-slate-900'}`}
                         >
                           Customer Growth
                         </a>
                       </li>
                    </ol>
                 </div>

                 <div className="pt-10 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">Related</p>
                    <div className="flex flex-col gap-8">
                       <Link href="/blog" className="group block">
                          <h4 className="text-sm font-bold leading-snug text-slate-600 group-hover:text-slate-900 transition-colors mb-2">
                             17 Free Retail Tools You Need Right Now
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                             <span>Recently</span>
                             <span>·</span>
                             <span className="flex items-center gap-1">Read <ChevronRight className="h-2 w-2" /></span>
                          </div>
                       </Link>
                    </div>
                 </div>
              </div>
            </aside>
          </div>
        </main>
        
        <MarketingFooter />
      </div>
    </ThemeProvider>
  );
}
