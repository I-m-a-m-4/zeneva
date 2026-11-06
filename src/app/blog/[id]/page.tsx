
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allBlogPosts, getPostDate, truncateMeta } from '@/lib/blog-data';
import { adminFirestore } from '@/firebase/admin';
import BlogPostClient from './blog-post-client';

// Next 15 hands params in as a Promise. The code already awaited it; the type
// said otherwise, which is why the generated PageProps check failed.
type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const siteUrl = 'https://zeneva.space';

// A slug that is neither authored nor published in Firestore is a real 404.
// The page used to return 200 with a client-side redirect to /blog, which
// Search Console records as a soft 404 and which kept every typo'd URL in the
// index. The check has to happen on the server, before the client's fallback
// fetch, or the response is already committed.
async function isPublishedFirestorePost(slug: string): Promise<boolean> {
  if (!adminFirestore) return false;
  try {
    const slugSnap = await adminFirestore
      .collection('blogPosts')
      .where('published', '==', true)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (!slugSnap.empty) return true;

    const docSnap = await adminFirestore.collection('blogPosts').doc(slug).get();
    return docSnap.exists && docSnap.data()?.published === true;
  } catch (error) {
    // A Firestore outage must not turn a valid article into a 500. Falling back
    // to 404 is the safer failure: an unknown slug can wait, a broken page
    // cannot.
    console.warn('[blog] Firestore slug check failed:', error);
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Try to find in static blog posts first for immediate SEO
  const staticPost = allBlogPosts.find(p => p.slug === id);

  if (staticPost) {
    const description = truncateMeta(staticPost.excerpt);
    const published = getPostDate(staticPost).toISOString();
    // Keep the brand suffix only while it still fits the ~60-character SERP
    // title. Long headlines keep their own words instead of being cut mid-brand.
    const title = staticPost.title.length <= 50
      ? `${staticPost.title} | Zeneva`
      : staticPost.title;

    return {
      title: { absolute: title },
      description,
      alternates: {
        canonical: `/blog/${id}`
      },
      openGraph: {
        title: staticPost.title,
        description,
        url: `/blog/${id}`,
        siteName: 'Zeneva',
        locale: 'en_US',
        type: 'article',
        publishedTime: published,
        modifiedTime: published,
        section: staticPost.category,
        authors: [staticPost.authorName || 'Zeneva Editorial'],
        images: [
          {
            url: staticPost.imageUrl,
            alt: staticPost.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: staticPost.title,
        description,
        images: [staticPost.imageUrl],
      },
    };
  }

  // Fallback for posts that live only in Firestore. Left noindex on purpose:
  // this branch renders a generic title and description, and an indexed page
  // whose <title> is literally "Blog Post" is the thin content that got the
  // blog penalised. A Firestore post that deserves indexing should be promoted
  // into blog-data.ts, or this branch taught to read Firestore at build time.
  return {
    title: 'Blog Post | Zeneva',
    description: 'Read the latest from Zeneva on retail operations, AI, and business growth.',
    alternates: {
      canonical: `/blog/${id}`
    },
    robots: {
      index: false,
      follow: true,
    },
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

  if (!staticPost && !(await isPublishedFirestorePost(id))) {
    notFound();
  }

  const publishedAt = staticPost ? getPostDate(staticPost).toISOString() : null;

  // Structured data is emitted from the server component so it is in the HTML
  // Google receives, rather than injected after hydration. FAQPage is only
  // claimed when the post actually renders those questions — marking up
  // content a visitor cannot see is a structured-data violation.
  const jsonLd = staticPost
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            '@id': `${siteUrl}/blog/${staticPost.slug}#article`,
            headline: staticPost.title,
            description: staticPost.excerpt,
            image: staticPost.imageUrl,
            articleSection: staticPost.category,
            inLanguage: 'en',
            // Every post rendered "April 19, 2026" and the schema carried no
            // dates at all, so date-based freshness signals were simply absent.
            datePublished: publishedAt,
            dateModified: publishedAt,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${siteUrl}/blog/${staticPost.slug}`,
            },
            author: staticPost.authorName
              ? { '@type': 'Person', name: staticPost.authorName }
              : { '@type': 'Organization', name: 'Zeneva Editorial', url: siteUrl },
            publisher: { '@id': `${siteUrl}/#organization` },
          },
          ...(staticPost.faq?.length
            ? [
                {
                  '@type': 'FAQPage',
                  '@id': `${siteUrl}/blog/${staticPost.slug}#faq`,
                  mainEntity: staticPost.faq.map(item => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: { '@type': 'Answer', text: item.answer },
                  })),
                },
              ]
            : []),
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
              {
                '@type': 'ListItem',
                position: 3,
                name: staticPost.title,
                item: `${siteUrl}/blog/${staticPost.slug}`,
              },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BlogPostClient initialPostData={staticPost} />
    </>
  );
}
