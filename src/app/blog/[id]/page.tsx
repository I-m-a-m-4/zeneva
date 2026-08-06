
import { Metadata } from 'next';
import { allBlogPosts } from '@/lib/blog-data';
import BlogPostClient from './blog-post-client';

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  // Try to find in static blog posts first for immediate SEO
  const staticPost = allBlogPosts.find(p => p.slug === id);
  
  if (staticPost) {
    return {
      title: `${staticPost.title} | Zeneva Blog`,
      description: staticPost.excerpt,
      alternates: {
        canonical: `/blog/${id}`
      },
      openGraph: {
        title: staticPost.title,
        description: staticPost.excerpt,
        images: [staticPost.imageUrl],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: staticPost.title,
        description: staticPost.excerpt,
        images: [staticPost.imageUrl],
      },
    };
  }

  // Fallback for dynamic posts or if not found
  return {
    title: 'Blog Post | Zeneva',
    description: 'Read the latest from Zeneva on retail operations, AI, and business growth.',
    alternates: {
      canonical: `/blog/${id}`
    }
  };
}

export async function generateStaticParams() {
  return allBlogPosts.map((post) => ({
    id: post.slug,
  }));
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const staticPost = allBlogPosts.find(p => p.slug === id);

  return <BlogPostClient initialPostData={staticPost} />;
}
