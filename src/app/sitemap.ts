import { MetadataRoute } from 'next';
import { adminFirestore } from '@/firebase/admin';
import { allBlogPosts } from '@/lib/blog-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://zeneva.space';

  // Core pages
  const coreRoutes = [
    '',
    '/pricing',
    '/contact',
    '/download',
    '/blog',
    '/help-center',
    '/help-center/guides',
    '/use-cases',
    '/careers',
    '/about/our-mission',
    '/legal/privacy-policy',
    '/legal/terms-of-service',
    '/signup',
    '/login',
  ];

  const routes: MetadataRoute.Sitemap = coreRoutes.map((route) => {
    let priority = 0.5;
    if (route === '') priority = 1.0;
    else if (['/pricing', '/download'].includes(route)) priority = 0.9;
    else if (['/blog', '/help-center', '/use-cases'].includes(route)) priority = 0.85;
    else if (['/signup', '/login', '/contact', '/help-center/guides'].includes(route)) priority = 0.8;

    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: (route === '' || route === '/blog') ? 'daily' as const : 'weekly' as const,
      priority,
    };
  });

  // Track seen slugs to avoid duplicates if some are in both static and Firestore
  const seenSlugs = new Set();

  // Add static blog posts from blog-data.ts
  const staticBlogRoutes: MetadataRoute.Sitemap = allBlogPosts.map(post => {
    seenSlugs.add(post.slug);
    return {
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date('2026-04-19'), // Static posts date
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  let dynamicBlogRoutes: MetadataRoute.Sitemap = [];
  try {
    // Fetch dynamic blog posts from Firestore
    if (adminFirestore) {
      const blogSnapshot = await adminFirestore
        .collection('blogPosts')
        .where('published', '==', true)
        .get();

      dynamicBlogRoutes = blogSnapshot.docs.reduce((acc: MetadataRoute.Sitemap, doc) => {
        const data = doc.data();
        const slug = data.slug || doc.id;
        
        // Skip if we already added this slug from static data
        if (!seenSlugs.has(slug)) {
          acc.push({
            url: `${baseUrl}/blog/${slug}`,
            lastModified: data.updatedAt?.toDate() || new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          });
        }
        return acc;
      }, []);
    }
  } catch (error) {
    console.warn('Sitemap dynamic fetch failed, using static routes only:', error);
  }

  return [...routes, ...staticBlogRoutes, ...dynamicBlogRoutes];
}
