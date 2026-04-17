
import type { NextConfig } from 'next';

const isTauri = process.env.TAURI_PLATFORM || process.env.IS_TAURI === 'true';

const nextConfig: NextConfig = {
  transpilePackages: ['lucide-react'],
  serverExternalPackages: [
    'genkit', 
    '@genkit-ai/core', 
    '@genkit-ai/google-genai', 
    '@opentelemetry/sdk-node', 
    '@opentelemetry/api'
  ],
  output: isTauri ? 'export' : undefined,
  trailingSlash: isTauri ? true : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    unoptimized: isTauri ? true : undefined,
    minimumCacheTTL: 31536000, // 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hoirqrkdgbmvpwutwuwj.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.unicorn.studio',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.chowdeck.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      { // For Google user content
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      { // For Shopify CDN
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'skincare365ng.com',
        port: '',
        pathname: '/**',
      },
      { // For Paystack assets
        protocol: 'https',
        hostname: 'assets.paystack.com',
        port: '',
        pathname: '/**',
      },
      { // For Firebase Storage
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  assetPrefix: isTauri ? '' : undefined,
  webpack: (config, { dev, isServer }) => {
    if (isTauri) {
      // Force mock server-only/Node.js-heavy libraries that crash the static export
      config.resolve.alias = {
        ...config.resolve.alias,
        'genkit': false,
        '@genkit-ai/core': false,
        '@opentelemetry/sdk-node': false,
        '@opentelemetry/api': false,
        'google-auth-library': false,
        '@google-cloud/logging': false,
        '@google-cloud/storage': false,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        http: false,
        https: false,
        stream: false,
        zlib: false,
      };
    }
    
    if (!dev && !isServer) {
      // Obfuscator is currently disabled for stability in v1.0.0
    }

    // Force a clean build by disabling the webpack cache
    config.cache = false;

    return config;
  },
};



const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: isTauri || process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/_vercel\/insights\/.*$/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
          },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);

 