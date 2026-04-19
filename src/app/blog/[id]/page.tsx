
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
  Instagram
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
            router.push('/blog');
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
                    h1: ({node, ...props}) => null // Strip H1 from markdown to prevent duplicates
                  }}
                >
                  {post.content}
                </ReactMarkdown>
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
                    <div className="space-y-4">
                       <p className="text-sm font-medium text-slate-500 leading-relaxed border-l-2 border-slate-100 pl-4">
                         {post.excerpt || "Strategic breakdown of mission-critical retail operations."}
                       </p>
                    </div>
                 </div>

                  <div className="pt-10 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">Follow Mission</p>
                    <Link 
                      href="https://instagram.com/zeneva_hq" 
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
                            <p className="text-xs font-black text-slate-950 uppercase tracking-tighter">@zeneva_hq</p>
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
