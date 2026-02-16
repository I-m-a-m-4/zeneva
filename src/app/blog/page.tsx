'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, TrendingUp, BookOpen, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { allBlogPosts } from '@/lib/blog-data';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const featuredPosts = useMemo(() => {
    return allBlogPosts.filter(p => p.imageUrl).slice(0, 5);
  }, []);

  const filteredPosts = useMemo(() => {
    let posts = allBlogPosts;

    if (selectedTopic) {
      posts = posts.filter(post => post.category === selectedTopic);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query)
      );
    }
    return posts;
  }, [searchQuery, selectedTopic]);

  const topics = ['Guides', 'Features', 'AI Features', 'Insights', 'Productivity', 'Software Reviews'];

  return (
    <div className="bg-background min-h-screen font-sans text-foreground selection:bg-primary/20">

      {/* --- HERO SECTION (Similarweb Style) --- */}
      <section className="relative overflow-hidden bg-[#F4F6F8] dark:bg-muted/10 pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left Column: Content & Search */}
            <div className="flex flex-col space-y-8 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 uppercase tracking-wide">
                  The Zeneva Ledger
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.1] font-bricolage text-foreground">
                  Insights to Power Your <span className="text-primary relative inline-block">
                    Retail Growth
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5 L 100 0 Q 50 5 0 0 Z" fill="currentColor" />
                    </svg>
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[90%]">
                  Expert analysis, data-driven strategies, and actionable advice for modern retailers and business leaders.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-lg w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  type="text"
                  placeholder="Search for strategies, guides, or topics..."
                  className="pl-11 h-14 rounded-xl border-2 border-muted bg-white dark:bg-background hover:border-primary/50 focus:border-primary text-base shadow-sm transition-all duration-300 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Popular Topics Pills */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Popular Topics:</span>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${selectedTopic === topic
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-white dark:bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Featured Carousel */}
            <div className="relative w-full max-w-[600px] lg:max-w-none mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-[2rem] blur-2xl opacity-50 -z-10"></div>
              <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                <CarouselContent>
                  {featuredPosts.map((post, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card className="border-none shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                          <Link href={`/blog/${post.slug}`}>
                            <div className="aspect-[16/10] relative">
                              <Image
                                src={post.imageUrl || `/metaphors/${['data wins.png', 'rule your retail.png', 'play smart win big.png'][index % 3]}`}
                                alt={post.title}
                                fill
                                className="object-cover transition-transform duration-700 hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                                <Badge className="w-fit mb-3 bg-primary text-primary-foreground hover:bg-primary/90 border-none">
                                  Featured
                                </Badge>
                                <h3 className="text-xl md:text-3xl font-bold text-white font-bricolage leading-tight mb-2 drop-shadow-md">
                                  {post.title}
                                </h3>
                                <div className="flex items-center text-white/90 text-sm font-medium gap-2">
                                  <span>Read Article</span>
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden md:block">
                  <CarouselPrevious className="left-4 bg-white/90 hover:bg-white text-foreground border-none shadow-lg w-10 h-10" />
                  <CarouselNext className="right-4 bg-white/90 hover:bg-white text-foreground border-none shadow-lg w-10 h-10" />
                </div>
              </Carousel>
            </div>

          </div>
        </div>
      </section>

      {/* --- FILTERED POSTS GRID --- */}
      <section className="relative px-4 md:px-6 py-16 md:py-24 overflow-hidden">
        {/* Noisy Background */}
        <div className="absolute inset-0 bg-[#f8f9fa] -z-20"></div>
        <div className="absolute inset-0 opacity-[0.04] z-[-10] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold font-bricolage">
              {searchQuery ? `Search Results for "${searchQuery}"` : (selectedTopic ? `${selectedTopic} Articles` : 'Latest Insights')}
            </h2>
            {!searchQuery && !selectedTopic && (
              <Link href="/blog" onClick={() => { setSearchQuery(''); setSelectedTopic(null) }} className="text-primary font-semibold hover:underline hidden md:block">
                View All Posts
              </Link>
            )}
          </div>

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filteredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[1.6] relative overflow-hidden bg-muted">
                    <Image
                      src={post.imageUrl || `https://picsum.photos/seed/${post.slug}/800/500`}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90 text-foreground shadow-sm backdrop-blur-md">
                        {post.category || 'Article'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3 text-primary/80">
                      <TrendingUp className="h-3 w-3" />
                      <span>Trending</span>
                    </div>
                    <h3 className="text-xl font-bold font-bricolage mb-3 text-card-foreground leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50 text-sm">
                      <span className="font-semibold text-primary group-hover:underline decoration-2 underline-offset-4">Read Now</span>
                      <span className="text-muted-foreground text-xs">5 min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted/30 p-6 rounded-full mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No articles found</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                We couldn't find any articles matching your search. Try different keywords or browse our popular topics.
              </p>
              <Button onClick={() => { setSearchQuery(''); setSelectedTopic(null) }} variant="outline">
                Clear Search
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* --- NEWSLETTER CTA (Optional, Similarweb Style) --- */}
      <section className="bg-primary py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/metaphors/data%20wins.png')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="container px-4 md:px-6 mx-auto relative z-10 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground font-bricolage mb-6">
            Stay Ahead of the Curve
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Join 10,000+ retail leaders receiving our weekly insights on growth, strategy, and technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-12 rounded-lg focus-visible:ring-offset-0 focus-visible:ring-white/50"
            />
            <Button variant="secondary" className="h-12 px-8 font-semibold bg-white text-primary hover:bg-white/90 rounded-lg">
              Subscribe
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/60 mt-4">
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
