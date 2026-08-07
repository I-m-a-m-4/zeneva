import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/admin-imamshaffy/', '/(app)/dashboard/'],
    },
    sitemap: 'https://zeneva.space/sitemap.xml',
  };
}
