
export type StaticBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
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
