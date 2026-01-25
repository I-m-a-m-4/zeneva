import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://zeneva.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/store/', '/blog/'],
      disallow: [
        '/admin-imamshaffy/',
        '/sales/',
        '/dashboard/',
        '/inventory/',
        '/users/',
        '/customers/',
        '/settings/',
        '/billing/',
        '/onboarding/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
