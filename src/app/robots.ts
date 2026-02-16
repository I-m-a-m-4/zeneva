import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://zeneva.space';

  return {
    rules: [
      {
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
      {
        userAgent: ['PerplexityBot', 'GPTBot', 'Google-Extended'],
        allow: ['/'],
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
