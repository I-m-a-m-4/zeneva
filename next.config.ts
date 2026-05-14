
import type { NextConfig } from 'next';

const isTauri = process.env.TAURI_PLATFORM || process.env.IS_TAURI === 'true';

const nextConfig: NextConfig = {
  output: isTauri ? 'export' : undefined,
  trailingSlash: isTauri ? true : undefined,
  serverExternalPackages: ['genkit', '@genkit-ai/core', '@genkit-ai/google-genai', 'google-auth-library', '@google-cloud/logging', '@google-cloud/storage', '@opentelemetry/api', '@opentelemetry/sdk-node'],
  experimental: {
    serverMinification: false,
  },
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
  headers: async () => {
    if (isTauri) return [];
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://paystack.com https://paystack.co https://js.paystack.co https://*.paystack.co https://*.paystack.com https://code.iconify.design https://*.iconify.design https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.vercel-insights.com https://*.vercel-scripts.com https://va.vercel-scripts.com https://*.smartsuppchat.com https://connect.facebook.net https://*.tiktok.com https://*.tiktokw.us https://analytics.tiktok.com https://static.ads-twitter.com https://www.googletagmanager.com https://*.dodopayments.com; script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://paystack.com https://paystack.co https://js.paystack.co https://*.paystack.co https://*.paystack.com https://code.iconify.design https://*.iconify.design https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.vercel-insights.com https://*.vercel-scripts.com https://va.vercel-scripts.com https://*.smartsuppchat.com https://connect.facebook.net https://*.tiktok.com https://*.tiktokw.us https://analytics.tiktok.com https://static.ads-twitter.com https://www.googletagmanager.com https://*.dodopayments.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://paystack.com https://*.paystack.com https://*.paystack.co https://js.paystack.co; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://paystack.com https://*.paystack.com https://*.paystack.co https://js.paystack.co; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.firebaseapp.com; media-src 'self' https://*.cloudinary.com https://*.youtube.com https://*.youtube-nocookie.com; connect-src 'self' https://paystack.com https://paystack.co https://*.paystack.com https://*.paystack.co https://api.paystack.co https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google-analytics.com https://*.vercel-insights.com https://*.chowdeck.com https://*.ibb.co https://api.imgbb.com https://*.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.iconify.design https://api.iconify.design https://*.facebook.com https://*.tiktok.com https://*.tiktokw.us https://*.smartsuppchat.com https://*.dodopayments.com https://api.github.com; frame-src 'self' https://checkout.paystack.com https://js.paystack.co https://*.paystack.com https://*.paystack.co https://*.firebaseapp.com https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com https://checkout.dodopayments.com https://*.dodopayments.com; frame-ancestors 'none';",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
          }
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Broad protection: Mock Genkit and Node.js-heavy libraries for ALL client-side bundles
    // This prevents "ReferenceError: process is not defined" or "Can't resolve 'fs'" in the browser on Vercel
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'genkit': false,
        '@genkit-ai/core': false,
        '@genkit-ai/next': false,
        '@genkit-ai/google-genai': false,
        '@genkit-ai/dotprompt': false,
        '@opentelemetry/sdk-node': false,
        '@opentelemetry/api': false,
        'google-auth-library': false,
        '@google-cloud/logging': false,
        '@google-cloud/storage': false,
        'googleapis': false,
        'nodemailer': false,
        'firebase-admin': false,
        'resend': false,
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

    // Specialized Tauri mocks and output overrides
    if (isTauri) {
      // Any additional Tauri-specific overrides can go here
    }
    
    // Protection & Hardening: Enable Obfuscator for production client chunks
    if (false && !dev && !isServer) {
        try {
            const WebpackObfuscator = require('webpack-obfuscator');
            config.plugins.push(
                new WebpackObfuscator({
                    rotateStringArray: true,
                    stringArray: true,
                    stringArrayThreshold: 0.75,
                    unicodeEscapeSequence: false, // Set to false for better performance/stability
                }, [
                    'static/chunks/app/_not-found*.js',
                    'static/chunks/main-*.js',
                    'static/chunks/webpack-*.js'
                ])
            );
        } catch (e) {
            console.warn("[Build] WebpackObfuscator could not be initialized, skipping obfuscation.");
        }
    }
    return config;
  },
};



import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: isTauri || process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    importScripts: [
      'https://cdn.jsdelivr.net/npm/regenerator-runtime@0.13.7/runtime.min.js',
      '/sw-helpers.js'
    ],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/_vercel/'),
        handler: 'NetworkOnly',
      },
      {
        urlPattern: ({ url }) => url.hostname.includes('vercel-scripts') || url.hostname.includes('vercel-insights'),
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https?:\/\/(?:[a-zA-Z0-9-]+\.)?paystack\.(?:co|com)\/.*/i,
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
    exclude: [
      /middleware-manifest\.json$/,
      /_next\/static\/.*\.map$/,
      /.*\/_vercel\/.*/,
    ],
  },
});

export default withPWA(nextConfig);

 