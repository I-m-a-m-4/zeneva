
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  limit, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import type { BlogPost } from '@/types';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Share2, 
  Twitter, 
  Linkedin, 
  Link as LinkIcon,
  BookOpen,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronLeft,
  Instagram,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { ThemeProvider } from '@/components/theme-provider';
import { allBlogPosts, StaticBlogPost } from '@/lib/blog-data';

export default function BlogPostClient() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [post, setPost] = React.useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState<string>('');

  const headings = React.useMemo(() => {
    if (!post?.content) return [];
    const h2s = post.content.match(/^## (.*$)/gm);
    if (!h2s) return [];
    return h2s.map(h => h.replace('## ', '').trim());
  }, [post?.content]);

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

    headings.forEach((heading) => {
      const id = heading.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [post, headings]);

  // Fetch related posts
  const relatedQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'blogPosts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(6)
    ),
    [firestore]
  );
  const { data: relatedPosts } = useCollection<BlogPost>(relatedQuery);

  React.useEffect(() => {
    if (!firestore || !id) return;

    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(firestore, 'blogPosts', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().published) {
          setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
        } else {
          // Slug lookup
          const slugQuery = query(
            collection(firestore, 'blogPosts'), 
            where('slug', '==', id),
            where('published', '==', true),
            limit(1)
          );
          const slugSnap = await getDocs(slugQuery);
          if (!slugSnap.empty) {
            const d = slugSnap.docs[0];
            setPost({ id: d.id, ...d.data() } as BlogPost);
          } else {
            // Static Fallback
            const staticPost = allBlogPosts.find(p => p.slug === id);
            if (staticPost) {
              setPost({
                id: staticPost.slug,
                title: staticPost.title,
                slug: staticPost.slug,
                content: staticPost.content || `## ${staticPost.title}\n\n${staticPost.excerpt}\n\n${staticPost.directAnswer || ''}`,
                excerpt: staticPost.excerpt,
                imageUrl: staticPost.imageUrl,
                authorId: 'admin',
                authorName: 'Zeneva Editorial',
                published: true,
                category: staticPost.category,
                // @ts-ignore
                faq: staticPost.faq,
                // @ts-ignore
                tableData: staticPost.tableData,
                createdAt: { toDate: () => new Date('2026-04-19') },
                updatedAt: { toDate: () => new Date('2026-04-19') }
              } as any);
            } else {
              router.push('/blog');
            }
          }
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [firestore, id, router]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied', description: 'Article link added to clipboard.' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <MarketingHeader />
        <main className="pt-40 container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="aspect-video w-full rounded-[2.5rem]" />
          </div>
        </main>
      </div>
    );
  }

  if (!post) return null;

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-white selection:bg-slate-900 selection:text-white">
        <MarketingHeader />
        
        <main className="min-h-screen">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-48 sm:px-6 sm:pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12 lg:pb-24 xl:gap-16">
            <article className="min-w-0">
               {/* Breadcrumbs */}
              <nav className="mb-10 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
                <span className="text-slate-300">/</span>
                <span className="truncate">{post.title}</span>
              </nav>

              <header className="mb-12">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.2]">
                   {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{post.category || 'Operational Mastery'}</span>
                   </div>
                   <span className="text-slate-200">•</span>
                   <time dateTime={post.createdAt ? post.createdAt.toDate().toISOString() : ''}>
                     {post.createdAt ? format(post.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently'}
                   </time>
                   <span className="text-slate-200">•</span>
                   <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{Math.ceil(post.content.length / 1000) + 3} MIN READ</span>
                   </div>
                </div>
              </header>

              {/* Main Content Area */}
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
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => null, // Strip H1 from markdown to prevent duplicates
                    h2: ({node, children, ...props}) => {
                      const id = String(children).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
                      return <h2 id={id} {...props}>{children}</h2>
                    }
                  }}
                >
                  {post.content}
                </ReactMarkdown>

                {/* Optional Table Data Rendering */}
                {(post as any).tableData && (
                  <div className="mt-16 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/50 p-1">
                    <div className="bg-white rounded-[1.4rem] overflow-hidden border border-slate-100">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-black text-slate-900 tracking-tight">{(post as any).tableData.title}</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                              {(post as any).tableData.headers.map((h: string, i: number) => (
                                <th key={i} className="px-6 py-4">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(post as any).tableData.rows.map((row: string[], i: number) => (
                              <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                {row.map((cell: string, j: number) => (
                                  <td key={j} className="px-6 py-4 font-medium text-slate-600">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                <div className="mt-24 pt-16 border-t border-slate-100">
                  <h3 className="text-2xl font-black text-slate-950 mb-8 tracking-tight font-bricolage">Operational FAQ</h3>
                  <Accordion type="multiple" className="w-full">
                    {((post as any).faq || [
                      {
                        question: "How does Zeneva track profit automatically?",
                        answer: "Zeneva links every transaction to your product cost and sales price in real-time. Our system calculates your gross and net margins instantly across all outlets, so you always know exactly how much profit you've made today."
                      },
                      {
                        question: "What makes Zeneva different from other inventory tools?",
                        answer: "Most tools report the past. Zeneva predicts the future. Zen AI analyzes demand patterns and recommends exact stock decisions to maximize profit and reduce wastage."
                      },
                      {
                        question: "Does Zeneva work without internet?",
                        answer: "Yes. The Zeneva POS works fully offline. All transactions are queued and synced automatically once connectivity returns—ensuring no sales are ever lost even in low-signal areas."
                      },
                      {
                        question: "Can I manage multiple shops from one account?",
                        answer: "Absolutely. Zeneva was built for enterprise scale. You can monitor stock levels, sales, and staff across 50+ locations from a single high-fidelity dashboard."
                      },
                      {
                        question: "How accurate are the Zen AI predictions?",
                        answer: "Zen AI improves continuously using your historical sales, time-based demand, and customer behavior. Accuracy typically reaches over 94% after just 30 days of consistent data."
                      }
                    ]).map((item: any, index: number) => (
                      <AccordionItem key={index} value={`item-${index}`} className="border-slate-100">
                        <AccordionTrigger className="text-left font-bold text-slate-900 hover:text-orange-600 transition-all py-4 text-base">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-500 text-base leading-relaxed pb-4">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="mt-24 rounded-[2.5rem] bg-slate-100 text-slate-900 p-8 md:p-16 relative overflow-hidden group border border-dashed border-slate-200">
                <div className="absolute inset-0 grid-lines opacity-10 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                  <div className="max-w-md">
                    <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-4 leading-tight text-slate-950">Ready to transform your retail operations?</h3>
                    <p className="text-slate-600 font-medium text-lg">Join the thousands of retailers using Zeneva to automate profit and scale without limits.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Link href="/pricing" className="hover:bg-[#0f172a] transition-colors text-sm font-medium text-white tracking-tight font-dm-sans bg-[#1e293b] rounded-md pt-2.5 pr-8 pb-2.5 pl-8 shadow-sm text-center">View Pricing</Link>
                    <Link href="/about/our-mission" className="transition-colors text-sm font-medium bg-[#ffffff] border rounded-md px-8 py-2.5 font-dm-sans tracking-tight hover:text-slate-600 text-slate-900 border-stone-200 shadow-sm text-center">Our Mission</Link>
                  </div>
                </div>
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
            </article>

            {/* Sidebar / On this page */}
            <aside className="hidden lg:block">
              <div className="sticky top-40 space-y-12">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">On this page</p>
                    <div className="space-y-6">
                       <p className="text-sm font-medium text-slate-500 leading-relaxed border-l-2 border-slate-100 pl-4 mb-4">
                         {post.excerpt || "Strategic breakdown of mission-critical retail operations."}
                       </p>
                       <nav className="flex flex-col gap-4">
                         {headings.map((heading) => {
                           const id = heading.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
                           return (
                             <button 
                               key={id}
                               onClick={() => {
                                 const el = document.getElementById(id);
                                 if (el) el.scrollIntoView({ behavior: 'smooth' });
                               }}
                               className={cn(
                                 "text-left text-xs font-bold transition-all duration-300",
                                 activeSection === id ? "text-orange-600 pl-2" : "text-slate-500 hover:text-slate-900"
                               )}
                             >
                               {heading}
                             </button>
                           );
                         })}
                       </nav>
                    </div>
                 </div>

                  <div className="pt-10 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">Follow Mission</p>
                    <Link 
                      href="https://instagram.com/zeneva_pos" 
                      target="_blank"
                      className="group flex flex-col gap-4 p-5 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-orange-500 p-[2px]">
                            <div className="h-full w-full rounded-[10px] bg-white flex items-center justify-center">
                               <Instagram className="h-5 w-5 text-slate-900" />
                            </div>
                         </div>
                         <div>
                            <p className="text-xs font-black text-slate-950 uppercase tracking-tighter">@zeneva_pos</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow Tactical Feed</p>
                         </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium">Join 2.5k+ retailers getting daily growth tactics and operational insights on the gram.</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-950 uppercase tracking-widest group-hover:gap-2 transition-all">
                        Follow Now <ArrowRight className="h-3 w-3" />
                      </div>
                    </Link>
                  </div>

                  <div className="pt-10 border-t border-slate-100">
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">Related</p>
                    <div className="flex flex-col gap-8">
                       {relatedPosts?.filter(p => p.id !== post.id).slice(0, 3).map(p => (
                         <Link key={p.id} href={`/blog/${p.id}`} className="group block">
                            <h4 className="text-sm font-bold leading-snug text-slate-600 group-hover:text-slate-900 transition-colors mb-2">
                               {p.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                               <span>{p.createdAt ? format(p.createdAt.toDate(), 'MMM d') : 'Recent'}</span>
                               <span>·</span>
                               <span>{Math.ceil(p.content.length / 1000) + 1} MIN</span>
                            </div>
                         </Link>
                       ))}
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
