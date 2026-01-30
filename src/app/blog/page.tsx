
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { blogPosts as staticPosts } from '@/lib/blog-data';

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // NOTE: Firestore query has been removed from this public page to prevent permission errors.
  // The page now exclusively uses the static posts defined in `src/lib/blog-data.ts`.
  const isLoading = false;

  const allPosts = useMemo(() => {
    const formattedStaticPosts = staticPosts.map(p => ({ ...p, id: p.slug, createdAt: null, updatedAt: null, content: '', authorId: '', authorName: '', published: true }));
    return formattedStaticPosts;
  }, []);

  const categories = useMemo(() => {
    const allCategories = ['All', ...new Set(allPosts.map(post => post.category).filter(Boolean) as string[])];
    return allCategories;
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') {
      return allPosts;
    }
    return allPosts.filter(post => post.category === selectedCategory);
  }, [selectedCategory, allPosts]);

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

      {/* Main Content Grid */}
      <div className="container mx-auto px-6 py-16 md:py-24">
        
        <div className="w-full md:w-[480px] mx-auto mb-16">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="w-full bg-slate-100 text-slate-800 rounded-lg h-14 px-4 flex items-center justify-between border border-slate-200 hover:bg-slate-200 transition-colors">
                      <div className="flex items-center">
                          <span className="h-2 w-2 bg-primary rounded-full mr-3"></span>
                          <span className="font-medium">Filter by: {selectedCategory}</span>
                      </div>
                      <div className="flex items-center">
                          <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground" />
                      </div>
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
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
