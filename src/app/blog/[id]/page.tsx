
import { Metadata } from 'next';
import { allBlogPosts } from '@/lib/blog-data';
import BlogPostClient from './blog-post-client';

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  
  // Try to find in static blog posts first for immediate SEO
  const staticPost = allBlogPosts.find(p => p.slug === id);
  
  if (staticPost) {
    return {
      title: `${staticPost.title} | Zeneva Blog`,
      description: staticPost.excerpt,
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
  };
}

export async function generateStaticParams() {
  return allBlogPosts.map((post) => ({
    id: post.slug,
  }));
}

export default function Page() {
  return <BlogPostClient />;
}
