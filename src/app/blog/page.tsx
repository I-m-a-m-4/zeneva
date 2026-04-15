
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
  ChevronRight
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

function BlogCardSkeleton() {
  return (
    <div className="group rounded-3xl border border-border/40 bg-card overflow-hidden h-full">
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
    const query = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.title.toLowerCase().includes(query) || 
      post.excerpt?.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const featuredPost = posts?.[0];
  const remainingPosts = filteredPosts.filter(p => p.id !== featuredPost?.id);

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-[#fafafa] selection:bg-orange-100 selection:text-orange-900">
        <MarketingHeader />
        
        <main className="pt-32 pb-24">
          {/* Hero Section */}
          <section className="container mx-auto px-6 mb-20 text-center">
            <Badge variant="outline" className="mb-4 py-1 px-4 rounded-full border-orange-200 bg-orange-50 text-orange-700 font-dm-sans">
              Zeneva Insights & Intelligence
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600">
              The Retail Evolution <br className="hidden md:block" /> Start Here.
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10">
              Strategic intelligence, market tactical shifts, and expert guides on mastering the art of modern commerce with the Zeneva ecosystem.
            </p>
            
            <div className="max-w-xl mx-auto relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tactics, guides, or updates..." 
                className="pl-12 h-14 rounded-2xl border-border/40 bg-white shadow-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all text-lg"
              />
            </div>
          </section>

          {/* Featured Post */}
          {!searchQuery && featuredPost && !isLoading && (
            <section className="container mx-auto px-6 mb-24">
              <div className="group relative rounded-[2.5rem] border border-border/40 bg-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative aspect-video lg:aspect-auto overflow-hidden">
                    <img 
                      src={featuredPost.imageUrl || '/images/blog-placeholder.jpg'} 
                      alt={featuredPost.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                  </div>
                  <div className="p-8 lg:p-16 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-6">
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none px-4 py-1 rounded-full">
                        Featured Strategy
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {featuredPost.createdAt ? format(featuredPost.createdAt.toDate(), 'PPP') : 'Secret Intel'}
                      </span>
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight group-hover:text-orange-600 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8 line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt || "Dive deep into the latest strategic shifts in the retail landscape. This high-fidelity guide breaks down tactical advantages for modern businesses."}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-border/40">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-700">{featuredPost.authorName}</span>
                      </div>
                      <Button asChild variant="ghost" className="rounded-full group/btn hover:bg-orange-50 hover:text-orange-600">
                        <Link href={`/blog/${featuredPost.id}`}>
                          Read Article <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Posts Grid */}
          <section className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <Newspaper className="h-6 w-6 text-orange-600" />
                <h3 className="text-2xl font-bold">Latest Tactical Intelligence</h3>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full bg-slate-100/50">All</Button>
                <Button variant="ghost" size="sm" className="rounded-full">Strategy</Button>
                <Button variant="ghost" size="sm" className="rounded-full">Product</Button>
                <Button variant="ghost" size="sm" className="rounded-full">Intelligence</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <BlogCardSkeleton key={i} />)
              ) : filteredPosts.length > 0 ? (
                remainingPosts.length > 0 ? (
                  remainingPosts.map((post) => (
                    <Link 
                      key={post.id} 
                      href={`/blog/${post.id}`}
                      className="group flex flex-col rounded-3xl border border-border/40 bg-white shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img 
                          src={post.imageUrl || '/images/blog-placeholder.jpg'} 
                          alt={post.title}
                          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none shadow-sm capitalize">
                            Strategy
                          </Badge>
                        </div>
                      </div>
                      <div className="p-8 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 font-mono font-medium uppercase tracking-wider">
                          <Calendar className="h-3 w-3" />
                          {post.createdAt ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently Added'}
                        </div>
                        <h4 className="text-xl font-bold mb-4 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">
                          {post.title}
                        </h4>
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-6 leading-relaxed">
                          {post.excerpt || "Unlocking the potential of modern retail through data-driven decisions and tactical execution."}
                        </p>
                        <div className="mt-auto pt-6 border-t border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-border/20">
                                <User className="h-4 w-4 text-slate-400" />
                             </div>
                             <span className="text-xs font-semibold text-slate-600">{post.authorName}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : !searchQuery && featuredPost ? (
                  // If only featured post exists and no search query
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-border/60">
                     <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                     <p className="text-muted-foreground">Stay tuned for more strategic updates.</p>
                  </div>
                ) : (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-border/60">
                     <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                     <h4 className="text-xl font-bold mb-2">No intelligence found.</h4>
                     <p className="text-muted-foreground text-sm max-w-xs mx-auto">We couldn't find any articles matching your search query. Try another keyword.</p>
                     <Button variant="ghost" onClick={() => setSearchQuery('')} className="mt-6 text-orange-600">
                        Clear Search
                     </Button>
                  </div>
                )
              ) : (
                <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border border-dashed border-border/60">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="h-10 w-10 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">The Archive is Empty.</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">Our analysts are currently crafting new high-fidelity tactical guides. Check back shortly.</p>
                </div>
              )}
            </div>
          </section>

          {/* Newsletter / CTA */}
          <section className="container mx-auto px-6 mt-32">
            <div className="bg-[#1e293b] rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-center text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 max-w-2xl mx-auto">
                <h3 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                  Get Battle-Tested Insights <br /> Direct to Your Inbox.
                </h3>
                <p className="text-slate-400 text-lg mb-10">
                  Join 5,000+ retail leaders who receive our weekly breakdown of market tactical shifts and Zeneva platform Mastery.
                </p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input 
                    placeholder="Enter your email" 
                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:ring-orange-500/50"
                  />
                  <Button className="h-14 px-8 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg shadow-orange-500/25">
                    Subscribe
                  </Button>
                </form>
                <p className="mt-6 text-xs text-slate-500 font-medium">
                  Zero Spam. Tactical Intelligence Only. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </section>
        </main>
        
        <MarketingFooter />
      </div>
    </ThemeProvider>
  );
}
