
import type { NextConfig } from 'next';

const isTauri = process.env.TAURI_PLATFORM || process.env.IS_TAURI === 'true';

const nextConfig: NextConfig = {
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
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      const WebpackObfuscator = require('webpack-obfuscator');
      config.plugins.push(
        new WebpackObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          compact: true,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          renameGlobals: false,
          selfDefending: true, // Basic self-protection
          splitStrings: true,
          splitStringsChunkLength: 5,
          unicodeEscapeSequence: false,
          // Disabled settings that break Next.js chunking
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false, // Can cause infinite loops in some webviews
        }, [
          'static/_next/static/chunks/main.js',
          'static/_next/static/chunks/amp.js'
        ])
      );
    }
    return config;
  },
};


const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
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
