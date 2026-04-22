import { MetadataRoute } from 'next';
import { adminFirestore } from '@/firebase/admin';

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
    '/use-cases',
    '/about/our-mission',
    '/legal/privacy-policy',
    '/legal/terms-of-service',
    '/signup',
    '/login',
  ];

  const routes = coreRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : (['/pricing', '/blog', '/contact'].includes(route) ? 0.9 : 0.8),
  }));

  try {
    // Fetch dynamic blog posts
    if (adminFirestore) {
      const blogSnapshot = await adminFirestore
        .collection('blogPosts')
        .where('published', '==', true)
        .get();

      const blogRoutes = blogSnapshot.docs.map(doc => {
        const data = doc.data();
        const slug = data.slug || doc.id;
        return {
          url: `${baseUrl}/blog/${slug}`,
          lastModified: data.updatedAt?.toDate() || new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        };
      });

      return [...routes, ...blogRoutes];
    }
  } catch (error) {
    console.warn('Sitemap dynamic fetch failed, using static routes only:', error);
  }

  return routes;
}
