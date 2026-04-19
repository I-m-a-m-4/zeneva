
'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  ArrowRight, 
  Calendar, 
  User, 
  Search,
  BookOpen,
  Newspaper,
  TrendingUp,
  Loader2,
  ChevronRight,
  LayoutGrid,
  List,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import type { BlogPost } from '@/types';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeProvider } from '@/components/theme-provider';
import { InteractiveGrid } from '@/components/interactive-grid';

function BlogCardSkeleton() {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white overflow-hidden h-full shadow-sm">
      <Skeleton className="aspect-video w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

export default function BlogLandingPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  
  const blogQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'blogPosts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc')
    ),
    [firestore]
  );

  const { data: posts, isLoading } = useCollection<BlogPost>(blogQuery);

  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.title.toLowerCase().includes(q) || 
      post.excerpt?.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen selection:bg-slate-900 selection:text-white bg-[#F9F8F6] relative">
        <div className="fixed inset-0 grid-lines w-full h-full top-[var(--tauri-title-height,0)] pointer-events-none z-0"></div>
        <div className="relative z-10">
          <MarketingHeader />
          
          <main className="min-h-screen">
            {/* Hero Section with Interactive Grid Pattern */}
            <section className="relative flex items-center justify-center px-6 pt-48 pb-20 md:py-56 overflow-hidden bg-transparent">
              <div className="absolute inset-0 z-0">
                <InteractiveGrid />
                <div className="aura-background"></div>
              </div>
              
              <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Sparkles className="h-4 w-4 text-slate-900 fill-slate-900" />
                <span className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Strategic Intelligence</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tight leading-[0.95] text-slate-950">
                The Zeneva <span className="text-slate-500">Blog</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                Expert insights, tactical guides, and industry reports for the modern retail era.
              </p>
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-6 pb-24 pt-12">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-12">
              <div className="relative flex-1 w-full max-w-2xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-950 transition-colors" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tactics, articles, or updates..." 
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-950 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
                />
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl" role="group">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
               <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                 Showing {filteredPosts.length} articles
               </p>
            </div>

            {/* Posts Grid/List */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'flex flex-col gap-6'}`}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <BlogCardSkeleton key={i} />)
              ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <Link 
                    key={post.id} 
                    href={`/blog/${post.slug || post.id}`}
                    className={`group relative flex ${viewMode === 'grid' ? 'flex-col' : 'flex-col md:flex-row'} rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-500 overflow-hidden`}
                  >
                    <div className={`${viewMode === 'grid' ? 'aspect-[16/10]' : 'aspect-video md:w-80'} overflow-hidden bg-gradient-to-br from-blue-50 to-white border-b border-slate-100`}>
                      {/* Gradient replaces the image for a cleaner, more focused look */}
                    </div>
                    
                    <div className="flex flex-col flex-1 p-8">
                       <div className="flex items-center gap-3 mb-4">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-900 border-none px-3 py-0.5 rounded-lg text-xs font-bold uppercase tracking-tighter">
                            Category
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                             <Clock className="h-3 w-3" />
                             <span>{Math.ceil(post.content.length / 1000) + 2} MIN READ</span>
                          </div>
                       </div>
                       
                       <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-slate-950 group-hover:text-slate-600 transition-colors mb-4 line-clamp-2">
                         {post.title}
                       </h2>
                       
                       <p className="text-slate-500 text-sm md:text-base leading-relaxed line-clamp-3 mb-8 font-medium">
                         {post.excerpt || "Unlock the potential of your retail business with our strategic breakdown and tactical execution guides."}
                       </p>
                       
                       <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-950 uppercase tracking-tighter">{post.authorName}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {post.createdAt ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                            </span>
                         </div>
                         <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-950 group-hover:translate-x-1 transition-all" />
                       </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-32 text-center">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 mb-6">
                    <Search className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 mb-2">No intelligence found.</h3>
                  <p className="text-slate-500 max-w-sm mx-auto font-medium">We couldn't find any articles matching your search criteria. Try a different tactical keyword.</p>
                  <Button onClick={() => setSearchQuery('')} className="mt-8 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                    Clear Search
                  </Button>
                </div>
              )}
            </div>
            
            {/* Pagination Placeholder */}
            {!isLoading && filteredPosts.length > 0 && (
              <div className="mt-20 flex items-center justify-center gap-2">
                <Button variant="outline" disabled className="rounded-xl border-slate-200 text-slate-400">Previous</Button>
                <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 h-10 w-10 p-0">1</Button>
                <Button variant="outline" disabled className="rounded-xl border-slate-200 text-slate-400">Next</Button>
              </div>
            )}
          </div>

          {/* Newsletter Section */}
          <section className="bg-slate-50 py-24 mb-0">
             <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto rounded-[3rem] bg-white border border-slate-200 p-8 md:p-16 shadow-sm text-center">
                   <h3 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mb-6">
                      Stay Tactical. <br /> Stay Informed.
                   </h3>
                   <p className="text-slate-500 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto">
                      Join 5,000+ retail leaders who receive our weekly breakdown of market tactical shifts and Zeneva platform Mastery.
                   </p>
                   <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                      <input 
                        placeholder="you@company.com" 
                        className="h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 px-6 font-medium text-slate-950 outline-none focus:ring-4 focus:ring-slate-100 transition-all"
                      />
                      <Button className="h-14 px-8 rounded-2xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition-all">
                        Subscribe
                      </Button>
                   </form>
                   <p className="mt-6 text-xs text-slate-400 font-bold uppercase tracking-widest">
                     Mission-critical intelligence only. No spam.
                   </p>
                </div>
             </div>
          </section>
        </main>
        
        <MarketingFooter />
      </div>
    </div>
  </ThemeProvider>
);
}
