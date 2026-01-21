
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BlogPost } from "@/types";
import { blogPosts as staticPosts, pressArticles } from '@/lib/blog-data';

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

  const featuredPosts = allPosts.slice(0, 3);

  return (
    <div className="bg-white text-foreground">
      {/* Hero Section */}
      <div className="bg-[#F9F8F6] relative pb-5">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-10 items-center min-h-[50vh] pt-32 lg:pt-40">
            <div className="lg:col-span-3">
              <div className="max-w-2xl">
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-tight font-instrument-serif">
                  Blog & Stories
                </h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl">
                  The good stuff. Follow our social media for the latest updates,
                  features and even sneak peeks 👀
                </p>
              </div>
            </div>
            <div className="lg:col-span-2 hidden lg:block h-[70vh] overflow-y-auto space-y-8 pr-4 [scrollbar-width:none] [-ms-overflow-style:none]">
              {isLoading && featuredPosts.length === 0 ? (
                 <>
                    <Card className="group overflow-hidden border-4 border-black rounded-2xl shadow-lg w-full max-w-sm mx-auto animate-pulse">
                        <div className="aspect-[4/3] bg-muted border-b-4 border-black"></div>
                        <CardContent className="p-4 bg-white space-y-3">
                           <div className="h-3 w-1/4 bg-muted rounded"></div>
                           <div className="h-5 w-3/4 bg-muted rounded"></div>
                           <div className="h-4 w-full bg-muted rounded"></div>
                           <div className="h-4 w-1/2 bg-muted rounded"></div>
                           <div className="h-10 w-full bg-muted rounded mt-2"></div>
                        </CardContent>
                    </Card>
                 </>
              ) : featuredPosts.map((post) => (
                <Card
                  key={post.id || post.slug}
                  className="group overflow-hidden border-4 border-black rounded-2xl shadow-lg w-full max-w-sm mx-auto"
                >
                  <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                    <div className="aspect-[4/3] overflow-hidden border-b-4 border-black">
                      <Image
                        src={post.imageUrl || `https://picsum.photos/seed/${post.slug}/800/600`}
                        alt={post.title}
                        width={400}
                        height={300}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4 bg-white flex flex-col flex-grow">
                      <p className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                        {post.category}
                      </p>
                      <h3 className="text-lg font-bold uppercase mb-3 font-instrument-serif line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{post.excerpt}</p>
                      <Button variant="secondary" className="w-full mt-auto font-semibold">
                        Read More
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <div
          className="w-full h-5 absolute bottom-0 left-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20'%3E%3Cpath d='M0 10 V20 H40 V10 H30 V0 H10 V10 Z' fill='black'/%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'bottom',
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-6 py-16 md:py-24">
        
        <div className="w-full md:w-[480px] mx-auto mb-20">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="w-full bg-black text-white rounded-lg h-14 px-4 flex items-center justify-between border border-gray-800">
                      <div className="flex items-center">
                          <span className="h-2 w-2 bg-yellow-400 rounded-full mr-3"></span>
                          <span>Categories: {selectedCategory}</span>
                      </div>
                      <div className="flex items-center">
                          <span className="text-sm tracking-[3px] font-bold uppercase">SELECT</span>
                          <ChevronDown className="ml-2 h-4 w-4" />
                      </div>
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-black text-white border-gray-700">
                  {categories.map(category => (
                      <DropdownMenuItem key={category} onSelect={() => setSelectedCategory(category)} className="focus:bg-gray-800 focus:text-white cursor-pointer">
                          <div className="flex items-center">
                               <span className="h-2 w-2 bg-yellow-400 rounded-full mr-3"></span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id || post.slug}
                  className="group overflow-hidden border-4 border-black rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 flex flex-col"
                >
                  <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                    <div className="aspect-[4/3] overflow-hidden border-b-4 border-black">
                      <Image
                        src={post.imageUrl || `https://picsum.photos/seed/${post.slug}/800/600`}
                        alt={post.title}
                        width={800}
                        height={600}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4 bg-white flex-grow flex flex-col">
                      <p className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                        {post.category}
                      </p>
                      <h2 className="text-lg font-bold uppercase mb-3 font-instrument-serif line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-3">{post.excerpt}</p>
                      <Button variant="secondary" className="mt-auto w-full font-semibold">
                        Read More
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
        )}

        {/* Press Section */}
        <div className="mt-32">
          <h2 className="text-4xl font-bold border-b border-black pb-5 mb-8 font-instrument-serif">
            Press
          </h2>
          <div className="grid divide-y divide-black">
            {pressArticles.map((article) => (
              <Link
                key={article.title}
                href={article.url}
                className="py-8 grid grid-cols-1 md:grid-cols-5 gap-y-4 md:gap-x-10 items-center group"
              >
                <p className="md:col-span-3 font-medium text-xl lg:text-2xl group-hover:text-primary transition-colors">
                  {article.title}
                </p>
                <div className="flex md:justify-center">
                  <p className="font-bold text-gray-400">{article.publication}</p>
                </div>
                <div className="flex items-center justify-start md:justify-end text-sm font-bold uppercase group-hover:text-primary text-foreground transition-colors">
                  <span>View Article</span>
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
