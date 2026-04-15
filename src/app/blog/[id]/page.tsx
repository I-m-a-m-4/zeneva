
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  limit, 
  orderBy 
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
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { ThemeProvider } from '@/components/theme-provider';

export default function BlogPostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [post, setPost] = React.useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch related posts (same author or latest)
  const relatedQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'blogPosts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(4)
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
          // Try fetching by slug if ID fails (common for SEO links)
          const slugQuery = query(
            collection(firestore, 'blogPosts'), 
            where('slug', '==', id),
            where('published', '==', true),
            limit(1)
          );
          // Wait, using getDocs here since it's a one-off
          const { getDocs } = await import('firebase/firestore');
          const slugSnap = await getDocs(slugQuery);
          if (!slugSnap.empty) {
            const d = slugSnap.docs[0];
            setPost({ id: d.id, ...d.data() } as BlogPost);
          } else {
            router.push('/blog');
          }
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load the tactical intelligence report.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [firestore, id, router, toast]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link Copied',
      description: 'Tactical link added to clipboard.'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <MarketingHeader />
        <main className="pt-40 container mx-auto px-6">
          <Skeleton className="h-4 w-24 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-10" />
          <Skeleton className="aspect-video w-full rounded-3xl mb-12" />
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </main>
      </div>
    );
  }

  if (!post) return null;

  return (
    <ThemeProvider forcedTheme="light">
      <div className="min-h-screen bg-white selection:bg-orange-100 selection:text-orange-900">
        <MarketingHeader />
        
        <main className="pt-32 pb-24">
          <div className="container mx-auto px-6">
            {/* Back to Blog */}
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-orange-600 transition-colors mb-12 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Intel Archive
            </Link>

            {/* Header */}
            <div className="max-w-4xl mx-auto mb-16">
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-orange-100 text-orange-700 border-none px-4 py-1 rounded-full uppercase text-[10px] tracking-widest font-bold">
                  Strategic Analysis
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Calendar className="h-4 w-4" />
                  {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : 'Active Intel'}
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-[1.1]">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-between gap-6 py-8 border-y border-border/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-orange-200">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Chief Tactical Analyst</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase mr-2 tracking-widest">Share Intel</p>
                  <Button onClick={copyLink} variant="outline" size="icon" className="rounded-full h-10 w-10 hover:bg-orange-50 hover:text-orange-600">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 hover:bg-orange-50 hover:text-orange-600">
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 hover:bg-orange-50 hover:text-orange-600">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="aspect-[21/9] w-full rounded-[3rem] overflow-hidden mb-20 shadow-2xl relative border border-border/20">
              <img 
                src={post.imageUrl || '/images/blog-placeholder.jpg'} 
                alt={post.title}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[3rem]" />
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 max-w-7xl mx-auto">
              {/* Sidebar */}
              <aside className="lg:col-span-3 hidden lg:block sticky top-32 h-fit">
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/50">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Mission Goals</h4>
                   <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-orange-400 pl-4">
                     {post.excerpt || "Decrypting market patterns to provide a definitive advantage for high-velocity retail operations."}
                   </p>
                   <div className="mt-8 pt-6 border-t border-slate-200">
                      <Button variant="outline" className="w-full justify-start gap-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all group">
                        <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Join Discussion
                      </Button>
                   </div>
                </div>
              </aside>

              {/* Main Text */}
              <div className="lg:col-span-6">
                <article className="prose prose-orange prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900 prose-img:rounded-3xl prose-img:shadow-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                  </ReactMarkdown>
                </article>

                <div className="mt-20 pt-10 border-t border-border/40">
                   <div className="flex items-center gap-4 p-8 rounded-3xl bg-orange-50 border border-orange-200/50">
                      <TrendingUp className="h-8 w-8 text-orange-500 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900">Was this insight helpful?</h4>
                        <p className="text-sm text-slate-600">Our analysts refine their strategy based on your direct feedback.</p>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <Button variant="ghost" className="rounded-full hover:bg-white text-lg">👍</Button>
                        <Button variant="ghost" className="rounded-full hover:bg-white text-lg">👎</Button>
                      </div>
                   </div>
                </div>
              </div>

              {/* Ad/CTA Sidebar */}
              <aside className="lg:col-span-3 space-y-8">
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 blur-3xl" />
                   <h4 className="font-bold text-xl mb-4 relative z-10">Deploy Zeneva.</h4>
                   <p className="text-slate-400 text-sm mb-6 relative z-10">Stop guessing. Use real-time intelligence to drive your business.</p>
                   <Button asChild className="w-full bg-white text-slate-900 hover:bg-orange-500 hover:text-white transition-all rounded-xl relative z-10 font-bold">
                     <Link href="/signup">Get Started Free</Link>
                   </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-2">Next Intelligence</h4>
                  {relatedPosts?.filter(p => p.id !== post.id).slice(0, 3).map(p => (
                    <Link 
                      key={p.id} 
                      href={`/blog/${p.id}`}
                      className="group flex gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border/40">
                         <img src={p.imageUrl || '/images/blog-placeholder.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h5 className="text-xs font-bold line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors uppercase tracking-tight">{p.title}</h5>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{p.createdAt ? format(p.createdAt.toDate(), 'MMM d') : 'Pending'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </main>
        
        <MarketingFooter />
      </div>
    </ThemeProvider>
  );
}
