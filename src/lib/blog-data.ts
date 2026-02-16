
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
  // SEO & Rich Content Fields
  directAnswer?: string;
  faq?: { question: string; answer: string }[];
  tableData?: {
    title: string;
    headers: string[];
    rows: string[][];
  };
};

export const blogPosts: StaticBlogPost[] = [
  {
    slug: 'getting-started-with-zeneva',
    title: 'Getting Started with Zeneva: A Quick Guide',
    excerpt: 'Your journey to streamlined inventory management starts here. Follow these simple steps to get your business set up for success on Zeneva.',
    imageUrl: '/herolytics.svg',
    category: 'Guides',
    directAnswer: "Getting started with Zeneva involves four key steps: signing up, completing the onboarding survey, adding your first products (manually or via CSV import), and processing your first sale on the POS. The entire process can be completed in under 15 minutes.",
    faq: [
      { question: "Is Zeneva free to start?", answer: "Yes, Zeneva offers a free trial so you can explore all features before committing." },
      { question: "Do I need special hardware?", answer: "No, Zeneva works on any device with a web browser, including smartphones, tablets, and laptops." }
    ]
  },
  {
    slug: 'zen-ai-copilot-business-insights',
    title: 'Meet Your New Business Advisor: The Zen AI Copilot',
    excerpt: 'Go beyond simple reports. Discover how Zen AI acts as a sentinel for your business, constantly monitoring your data to uncover hidden risks and opportunities for growth.',
    imageUrl: '/zen-ai.jpg',
    category: 'AI Features',
    directAnswer: "The Zen AI Copilot is an intelligent analytics engine embedded in Zeneva that calculates your Business Health Score, identifies 'dead stock' tying up capital, and predicts potential stockouts before they happen.",
    faq: [
      { question: "What is the Business Health Score?", answer: "It's a collection of metrics (0-100) that rates your business performance based on sales velocity, inventory turnover, and data quality." },
      { question: "Can Zen AI predict sales?", answer: "Yes, it analyzes historical trends to forecast demand and alert you about upcoming opportunities or risks." }
    ]
  },
  {
    slug: 'guide-to-public-storefront',
    title: 'Your Guide to Launching a Beautiful Online Store',
    excerpt: 'Turn your inventory into a revenue stream in minutes. This step-by-step guide shows you how to design, customize, and launch your public storefront with Zeneva.',
    imageUrl: '/storefront.jpg',
    category: 'Features',
    directAnswer: "Zeneva's Public Storefront allows users to create a branded online store in minutes. It syncs directly with your main inventory, meaning stock levels update automatically whenever an online or in-store sale is made.",
    faq: [
      { question: "Do I need to pay extra for the online store?", answer: "The Public Storefront is included in the Pro and Business plans at no additional cost." },
      { question: "How do I accept payments?", answer: "You can integrate Paystack for card payments or accept Bank Transfers directly through the platform." }
    ]
  },
  {
    slug: 'maximizing-sales-with-pos',
    title: 'Maximizing Your Sales with Zeneva\'s POS',
    excerpt: 'Our Point of Sale system is more than just a checkout tool. Learn how to use its features to increase efficiency and improve customer experience.',
    imageUrl: '/maximize.png',
    category: 'Features',
    directAnswer: "Zeneva's POS system maximizes sales by speeding up checkout times, offering offline functionality for reliable service, and providing instant customer profiles for personalized upsells and loyalty rewards.",
    faq: [
      { question: "Does the POS work without internet?", answer: "Yes, Zeneva POS is 'Offline First'. It stores data locally and syncs automatically when the connection is restored." },
      { question: "Can I use a barcode scanner?", answer: "Absolutely. Zeneva supports USB and Bluetooth barcode scanners for faster checkout." }
    ]
  },
  {
    slug: 'why-cloud-inventory-is-a-game-changer',
    title: 'Why Cloud-Based Inventory is a Game Changer',
    excerpt: 'Move beyond spreadsheets. Discover the benefits of having a real-time, accessible, and secure view of your inventory from anywhere.',
    imageUrl: '/crm.webp',
    category: 'Insights',
    directAnswer: "Cloud-based inventory management replaces static spreadsheets with real-time, accessible data. It enables multi-location tracking, automatic backups, and allows you to manage your business from any device, anywhere in the world.",
    faq: [
      { question: "Is my data secure in the cloud?", answer: "Yes, Zeneva uses enterprise-grade encryption and secure servers to protect your business data." },
      { question: "Can I access my inventory from my phone?", answer: "Yes, Zeneva is fully responsive and works perfectly on mobile browsers." }
    ]
  },
  {
    slug: 'advanced-inventory-tips',
    title: 'Advanced Inventory: Tips & Tricks',
    excerpt: 'Learn how to manage variants, set low-stock alerts, and use categories effectively to become a power-user of Zeneva\'s inventory tools.',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
    category: 'Productivity',
    directAnswer: "Advanced inventory management in Zeneva involves setting custom low-stock thresholds for high-velocity items, using unique SKUs to prevent errors, and tracking cost prices to calculate accurate profit margins.",
    faq: [
      { question: "What is a SKU?", answer: "SKU stands for Stock Keeping Unit. It's a unique alpha-numeric code used to identify specific products and variants." },
      { question: "Why should I track cost price?", answer: "Tracking cost price allows Zeneva to calculate your gross profit margin and the total value of inventory you have on hand." }
    ]
  },
  {
    slug: 'understanding-your-customers-with-crm',
    title: 'Understanding Your Customers with Zeneva CRM',
    excerpt: 'A sale is just the beginning. Explore how to use Zeneva\'s customer management features to build loyalty and drive repeat business.',
    imageUrl: '/crm.png',
    category: 'Features',
    directAnswer: "Zeneva's CRM helps you build long-term relationships by creating a database of customer profiles. You can track purchase history, award loyalty points, and identify your VIP customers for targeted marketing.",
    faq: [
      { question: "How does the loyalty program work?", answer: "Customers earn points for every purchase. You can configure the exchange rate (e.g., 1 point per ₦100 spent) in your settings." },
      { question: "Can I import my existing customer list?", answer: "Yes, you can import customers in bulk using a CSV file." }
    ]
  },
  {
    slug: '5-things-you-will-not-miss-about-manual-stock-taking',
    title: '5 Things You Won\'t Miss About Manual Stock-taking',
    excerpt: 'Skip the stress of manual inventory counts. Manage your stock online in Nigeria with Zeneva; on-time delivery, great prices,...',
    imageUrl: '/stock-taking.jpg',
    category: 'Productivity',
    directAnswer: "Manual stock-taking is prone to human error, requires shutting down operations, and provides only a static snapshot of inventory. Zeneva eliminates these issues with real-time tracking, live updates, and efficient digital cycle counts.",
    faq: [
      { question: "How often should I do a stock take?", answer: "With Zeneva, you don't need to do full store shutdowns. We recommend regular 'cycle counts' of specific categories." },
      { question: "Does Zeneva support barcode scanning for stock takes?", answer: "Yes, using a scanner speeds up the reconciliation process significantly." }
    ]
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

        // Generate Specific SEO Content
        const directAnswer = `The best POS system for a ${industry} in ${location} must handle high transaction volumes, work offline during power outages, and support ${industry}-specific inventory features like expiration dates or sizing variants. Zeneva offers all these tailored features for the Nigerian market.`;

        const faq = [
          { question: `Does Zeneva work for a ${industry}?`, answer: `Yes, Zeneva includes specific modules for ${industry} management, including ${industry === 'Pharmacy' || industry === 'Supermarket' ? 'expiry date tracking' : 'variant management'} and bulk uploads.` },
          { question: `Is it available in ${location}?`, answer: `Absolutely. Zeneva is cloud-based and accessible anywhere in ${location}. We also have local support teams available.` },
          { question: "Does it support VAT and Nigerian Tax?", answer: "Yes, Zeneva comes pre-configured with Nigerian tax settings, including 7.5% VAT, which you can adjust as needed." },
          { question: "Can I use it offline?", answer: "Yes, Zeneva's Offline Mode is critical for businesses in Nigeria, ensuring you never miss a sale even if the network is down." }
        ];

        const tableData = {
          title: `Zeneva vs. Standard POS for ${industry}`,
          headers: ["Feature", "Zeneva", "Standard POS", "Excel/Paper"],
          rows: [
            ["Offline Mode", "✅ Yes (Auto-Sync)", "❌ Rarely", "❌ N/A"],
            [`${industry} Inventory`, "✅ Specialized", "⚠️ Generic", "❌ Manual"],
            ["Analytics", "✅ AI-Powered Insights", "⚠️ Basic Reports", "❌ None"],
            ["Cost", "✅ Affordable Subscription", "💰 High Upfront", "⏳ Time Consuming"],
            ["Support", "✅ Local Nigerian Support", "🌍 International Only", "❌ None"]
          ]
        };


        posts.push({
          slug,
          title,
          excerpt: `Discover why Zeneva is the top-rated choice for ${industry} owners in ${location}. Streamline operations, track stock, and boost sales with our all-in-one platform used by 500+ businesses.`,
          imageUrl: IMAGE_MAP[industry] || '/herolytics.svg',
          category: topic.category,
          isProgrammatic: true,
          programmaticData: {
            industry,
            location,
            topic: topic.template
          },
          directAnswer,
          faq,
          tableData
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
