
export type StaticBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
};

export type PressArticle = {
    title: string;
    publication: string;
    logoUrl?: string;
    url: string;
}

export const blogPosts: StaticBlogPost[] = [
  {
    slug: 'getting-started-with-zeneva',
    title: 'Getting Started with Zeneva: A Quick Guide',
    excerpt: 'Your journey to streamlined inventory management starts here. Follow these simple steps to get your business set up for success on Zeneva.',
    imageUrl: 'https://picsum.photos/seed/blog1/800/600',
    category: 'Guides',
  },
  {
    slug: 'maximizing-sales-with-pos',
    title: 'Maximizing Your Sales with Zeneva\'s POS',
    excerpt: 'Our Point of Sale system is more than just a checkout tool. Learn how to use its features to increase efficiency and improve customer experience.',
    imageUrl: 'https://picsum.photos/seed/blog2/800/600',
    category: 'Features',
  },
  {
    slug: 'why-cloud-inventory-is-a-game-changer',
    title: 'Why Cloud-Based Inventory is a Game Changer',
    excerpt: 'Move beyond spreadsheets. Discover the benefits of having a real-time, accessible, and secure view of your inventory from anywhere.',
    imageUrl: 'https://picsum.photos/seed/blog3/800/600',
    category: 'Insights',
  },
    {
    slug: 'advanced-inventory-tips',
    title: 'Advanced Inventory: Tips & Tricks',
    excerpt: 'Learn how to manage variants, set low-stock alerts, and use categories effectively to become a power-user of Zeneva\'s inventory tools.',
    imageUrl: 'https://picsum.photos/seed/blog4/800/600',
    category: 'Productivity',
  },
  {
    slug: 'understanding-your-customers-with-crm',
    title: 'Understanding Your Customers with Zeneva CRM',
    excerpt: 'A sale is just the beginning. Explore how to use Zeneva\'s customer management features to build loyalty and drive repeat business.',
    imageUrl: 'https://picsum.photos/seed/blog5/800/600',
    category: 'Features',
  },
  {
    slug: '5-things-you-will-not-miss-about-manual-stock-taking',
    title: '5 Things You Won\'t Miss About Manual Stock-taking',
    excerpt: 'Skip the stress of manual inventory counts. Manage your stock online in Nigeria with Zeneva; on-time delivery, great prices,...',
    imageUrl: 'https://picsum.photos/seed/blog6/800/600',
    category: 'Productivity',
  },
];

export const pressArticles: PressArticle[] = [
    {
        title: "Our 11 favorite companies from YC ‘s S22 Demo Day: Part 1",
        publication: "TechCrunch",
        url: "/blog",
    },
    {
        title: "Hungry for efficiency? Here Are the Top 5 Inventory Apps to Download Today",
        publication: "Eat Drink Lagos",
        url: "/blog"
    },
    {
        title: "Introducing Zeneva, the Fastest Way to Manage Inventory Anywhere in Africa",
        publication: "FaqonTech",
        url: "/blog"
    },
    {
        title: "App review: Zeneva, Odoo, Zoho Inventory, and more",
        publication: "TechNext",
        url: "/blog"
    }
]
