
export type StaticBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  isProgrammatic?: boolean;
  programmaticData?: {
    industry: string;
    location: string;
    topic: string;
  };
};

export const blogPosts: StaticBlogPost[] = [
  {
    slug: 'getting-started-with-zeneva',
    title: 'Getting Started with Zeneva: A Quick Guide',
    excerpt: 'Your journey to streamlined inventory management starts here. Follow these simple steps to get your business set up for success on Zeneva.',
    imageUrl: '/herolytics.svg',
    category: 'Guides',
  },
  {
    slug: 'zen-ai-copilot-business-insights',
    title: 'Meet Your New Business Advisor: The Zen AI Copilot',
    excerpt: 'Go beyond simple reports. Discover how Zen AI acts as a sentinel for your business, constantly monitoring your data to uncover hidden risks and opportunities for growth.',
    imageUrl: '/zen-ai.jpg',
    category: 'AI Features',
  },
  {
    slug: 'guide-to-public-storefront',
    title: 'Your Guide to Launching a Beautiful Online Store',
    excerpt: 'Turn your inventory into a revenue stream in minutes. This step-by-step guide shows you how to design, customize, and launch your public storefront with Zeneva.',
    imageUrl: '/storefront.jpg',
    category: 'Features',
  },
  {
    slug: 'maximizing-sales-with-pos',
    title: 'Maximizing Your Sales with Zeneva\'s POS',
    excerpt: 'Our Point of Sale system is more than just a checkout tool. Learn how to use its features to increase efficiency and improve customer experience.',
    imageUrl: '/maximize.png',
    category: 'Features',
  },
  {
    slug: 'why-cloud-inventory-is-a-game-changer',
    title: 'Why Cloud-Based Inventory is a Game Changer',
    excerpt: 'Move beyond spreadsheets. Discover the benefits of having a real-time, accessible, and secure view of your inventory from anywhere.',
    imageUrl: '/crm.webp',
    category: 'Insights',
  },
  {
    slug: 'advanced-inventory-tips',
    title: 'Advanced Inventory: Tips & Tricks',
    excerpt: 'Learn how to manage variants, set low-stock alerts, and use categories effectively to become a power-user of Zeneva\'s inventory tools.',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
    category: 'Productivity',
  },
  {
    slug: 'understanding-your-customers-with-crm',
    title: 'Understanding Your Customers with Zeneva CRM',
    excerpt: 'A sale is just the beginning. Explore how to use Zeneva\'s customer management features to build loyalty and drive repeat business.',
    imageUrl: '/crm.png',
    category: 'Features',
  },
  {
    slug: '5-things-you-will-not-miss-about-manual-stock-taking',
    title: '5 Things You Won\'t Miss About Manual Stock-taking',
    excerpt: 'Skip the stress of manual inventory counts. Manage your stock online in Nigeria with Zeneva; on-time delivery, great prices,...',
    imageUrl: '/stock-taking.jpg',
    category: 'Productivity',
  },
];

// --- Programmatic SEO Data ---

export const TARGET_INDUSTRIES = [
  'Supermarket',
  'Pharmacy',
  'Fashion Boutique',
  'Electronics Store',
  'Restaurant',
  'Hardware Store',
  'Cosmetics Shop',
  'Bookstore'
];

export const TARGET_LOCATIONS = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Enugu',
  'Lekki',
  'Ikeja'
];

export const TARGET_TOPICS = [
  {
    template: 'Best POS System for [Industry] in [Location]',
    slugTemplate: 'best-pos-system-for-[industry]-in-[location]',
    category: 'Software Reviews'
  },
  {
    template: 'How to Manage [Industry] Inventory in [Location]',
    slugTemplate: 'how-to-manage-[industry]-inventory-in-[location]',
    category: 'Guides'
  }
];

export const IMAGE_MAP: Record<string, string> = {
  'Supermarket': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1974&auto=format&fit=crop', // Modern grocery aisle
  'Pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=2069&auto=format&fit=crop', // Clean pharmacy shelves
  'Fashion Boutique': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop', // Chic clothing store
  'Electronics Store': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=2101&auto=format&fit=crop', // Electronics retail
  'Restaurant': 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop', // Modern restaurant interior
  'Hardware Store': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=1780&auto=format&fit=crop', // Tools and hardware
  'Cosmetics Shop': 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?q=80&w=2070&auto=format&fit=crop', // Beauty products display
  'Bookstore': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2190&auto=format&fit=crop', // Library/Bookstore vibe
};

export function generateProgrammaticPosts(): StaticBlogPost[] {
  const posts: StaticBlogPost[] = [];

  // Helper to slugify
  const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

  TARGET_INDUSTRIES.forEach(industry => {
    TARGET_LOCATIONS.forEach(location => {
      TARGET_TOPICS.forEach(topic => {
        const title = topic.template
          .replace('[Industry]', industry)
          .replace('[Location]', location);

        const slug = topic.slugTemplate
          .replace('[industry]', toSlug(industry))
          .replace('[location]', toSlug(location));

        posts.push({
          slug,
          title,
          excerpt: `Discover why Zeneva is the top-rated choice for ${industry} owners in ${location}. Streamline operations, track stock, and boost sales with our all-in-one platform.`,
          imageUrl: IMAGE_MAP[industry] || '/herolytics.svg',
          category: topic.category,
          isProgrammatic: true,
          programmaticData: {
            industry,
            location,
            topic: topic.template
          }
        });
      });
    });
  });

  return posts;
}

export const allBlogPosts = [...blogPosts, ...generateProgrammaticPosts()];

// Helper to get related posts
export function getRelatedPosts(currentSlug: string, count: number = 3): StaticBlogPost[] {
  const currentPost = allBlogPosts.find(p => p.slug === currentSlug);
  if (!currentPost) return [];

  // Simple logic: prefer same category, then random
  const sameCategory = allBlogPosts.filter(p => p.category === currentPost.category && p.slug !== currentSlug);

  // Shuffle array (Fisher-Yates)
  for (let i = sameCategory.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sameCategory[i], sameCategory[j]] = [sameCategory[j], sameCategory[i]];
  }

  return sameCategory.slice(0, count);
}
