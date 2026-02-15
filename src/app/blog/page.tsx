
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown, Loader2, ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { allBlogPosts } from '@/lib/blog-data';

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // NOTE: Firestore query has been removed from this public page to prevent permission errors.
  // The page now exclusively uses the static posts defined in `src/lib/blog-data.ts`.
  const isLoading = false;

  const allPosts = useMemo(() => {
    // Ensuring all posts have necessary fields for UI
    const formattedPosts = allBlogPosts.map(p => ({
      ...p,
      id: p.slug,
      createdAt: null,
      updatedAt: null,
      content: '',
      authorId: '',
      authorName: '',
      published: true
    }));
    return formattedPosts;
  }, []);

  const categories = useMemo(() => {
    const allCategories = ['All', ...new Set(allPosts.map(post => post.category).filter(Boolean) as string[])];
    return allCategories;
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;

    if (selectedCategory !== 'All') {
      posts = posts.filter(post => post.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query)
      );
    }

    return posts;
  }, [selectedCategory, searchQuery, allPosts]);

  return (
    <div className="bg-white text-foreground">
      {/* Hero Section */}
      <div className="bg-[#F9F8F6] relative">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl text-center mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight font-bricolage">
              The Zeneva Ledger
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Actionable insights and proven strategies to help you build a more profitable and efficient retail business.
            </p>
          </div>
        </div>
      </div>

      {/* Marquee Section */}
      <div className="bg-primary text-primary-foreground py-3 overflow-hidden relative flex">
        <div className="animate-marquee whitespace-nowrap flex min-w-full">
          {allPosts.slice(0, 10).map((post, i) => (
            <span key={i} className="mx-8 font-medium font-bricolage text-sm md:text-base flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-3 opacity-50"></span>
              {post.title}
            </span>
          ))}
          {allPosts.slice(0, 10).map((post, i) => (
            <span key={`dup-${i}`} className="mx-8 font-medium font-bricolage text-sm md:text-base flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-3 opacity-50"></span>
              {post.title}
            </span>
          ))}
        </div>
        <style jsx global>{`
           @keyframes marquee {
             0% { transform: translateX(0); }
             100% { transform: translateX(-50%); }
           }
           .animate-marquee {
             animation: marquee 60s linear infinite;
           }
           .animate-marquee:hover {
             animation-play-state: paused;
           }
         `}</style>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-6 py-16 md:py-24">

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-4xl mx-auto mb-16">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full md:w-auto bg-slate-100 text-slate-800 rounded-lg h-12 px-6 flex items-center justify-between border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap">
                <div className="flex items-center">
                  <span className="h-2 w-2 bg-primary rounded-full mr-3"></span>
                  <span className="font-medium">Filter by: {selectedCategory}</span>
                </div>
                <div className="flex items-center">
                  <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              {categories.map(category => (
                <DropdownMenuItem key={category} onSelect={() => setSelectedCategory(category)} className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                  <div className="flex items-center">
                    <span className="h-2 w-2 bg-primary rounded-full mr-3"></span>
                    {category}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading && filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading posts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card
                key={post.id || post.slug}
                className="group overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border-border"
              >
                <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <Image
                      src={post.imageUrl || `https://picsum.photos/seed/${post.slug}/800/600`}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      data-ai-hint={post.slug.split('-').slice(0, 2).join(' ')}
                    />
                  </div>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <p className="text-sm font-semibold uppercase text-primary mb-2 tracking-wider">
                      {post.category}
                    </p>
                    <h2 className="text-2xl font-bold font-bricolage mb-3 line-clamp-2 leading-tight">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 flex-grow line-clamp-3 text-sm">{post.excerpt}</p>
                    <div className="mt-auto flex items-center font-semibold text-primary group-hover:gap-3 transition-all duration-300">
                      Read More <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
