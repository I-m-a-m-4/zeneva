
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
    imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop',
    category: 'Guides',
  },
  {
    slug: 'zen-ai-copilot-business-insights',
    title: 'Meet Your New Business Advisor: The Zen AI Copilot',
    excerpt: 'Go beyond simple reports. Discover how Zen AI acts as a sentinel for your business, constantly monitoring your data to uncover hidden risks and opportunities for growth.',
    imageUrl: 'https://images.unsplash.com/photo-1677756119517-756a188d2d94?q=80&w=2070&auto=format&fit=crop',
    category: 'AI Features',
  },
  {
    slug: 'guide-to-public-storefront',
    title: 'Your Guide to Launching a Beautiful Online Store',
    excerpt: 'Turn your inventory into a revenue stream in minutes. This step-by-step guide shows you how to design, customize, and launch your public storefront with Zeneva.',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
    category: 'Features',
  },
  {
    slug: 'maximizing-sales-with-pos',
    title: 'Maximizing Your Sales with Zeneva\'s POS',
    excerpt: 'Our Point of Sale system is more than just a checkout tool. Learn how to use its features to increase efficiency and improve customer experience.',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
    category: 'Features',
  },
  {
    slug: 'why-cloud-inventory-is-a-game-changer',
    title: 'Why Cloud-Based Inventory is a Game Changer',
    excerpt: 'Move beyond spreadsheets. Discover the benefits of having a real-time, accessible, and secure view of your inventory from anywhere.',
    imageUrl: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=2070&auto=format&fit=crop',
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
    imageUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?q=80&w=1974&auto=format&fit=crop',
    category: 'Features',
  },
  {
    slug: '5-things-you-will-not-miss-about-manual-stock-taking',
    title: '5 Things You Won\'t Miss About Manual Stock-taking',
    excerpt: 'Skip the stress of manual inventory counts. Manage your stock online in Nigeria with Zeneva; on-time delivery, great prices,...',
    imageUrl: 'https://images.unsplash.com/photo-1576189547535-c5332f584587?q=80&w=1974&auto=format&fit=crop',
    category: 'Productivity',
  },
];
