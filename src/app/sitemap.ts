import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://zeneva.space';

  // Core pages
  const routes = [
    '',
    '/about',
    '/blog',
    '/download',
    '/legal/privacy',
    '/legal/terms',
    '/signup',
    '/login',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Note: For dynamic blog posts, you would fetch slugs from Firestore here.
  // Example (commented out as it requires server-side firebase admin setup):
  /*
  const posts = await getBlogPosts();
  const blogRoutes = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    priority: 0.6,
  }));
  return [...routes, ...blogRoutes];
  */

  return routes;
}
