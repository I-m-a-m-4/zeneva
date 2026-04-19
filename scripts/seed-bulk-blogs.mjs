import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!getFirestore) {
    initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    try {
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e) {}
}

const db = getFirestore();

const blogTopics = [
    {
        title: "Top 10 POS Systems in Nigeria for 2026: A Definitive Comparison",
        slug: "top-pos-systems-nigeria-2026",
        excerpt: "We compared the leading POS systems in Nigeria based on reliability, offline sync, and multi-outlet management. See why Zeneva stands alone.",
        category: "Market Analysis"
    },
    {
        title: "How to Manage Multiple Retail Outlets Across Lagos: A Tactical Guide",
        slug: "manage-multiple-retail-outlets-lagos",
        excerpt: "Scaling across locations is the ultimate retail challenge. Learn how to maintain total command over inventory and staff from a single dashboard.",
        category: "Growth Strategy"
    },
    {
        title: "Solving Inventory Shrinkage: How Zeneva's Audit Logs Stop Retail Theft",
        slug: "solving-inventory-shrinkage-retail-theft",
        excerpt: "Internal theft costs Nigerian retailers billions. Discover how real-time audit logs and price tracking eliminate operational leakages.",
        category: "Security"
    },
    {
        title: "Why Cloud-Native POS is Better than Offline Software for Nigerian SMEs",
        slug: "cloud-native-pos-vs-offline-software",
        excerpt: "Don't let legacy software hold you back. Explore the benefits of a cloud-native system that works offline and syncs when power returns.",
        category: "Technology"
    },
    {
        title: "Pharmacy Management Secrets: Tracking Batch Expiry and Compliance",
        slug: "pharmacy-management-secrets-batch-expiry",
        excerpt: "Managing a pharmacy requires precision. Learn how to automate expiry alerts and maintain regulatory compliance effortlessly.",
        category: "Industry Insights"
    },
    {
        title: "The Future of Retail in Nigeria: Scaling from One Shop to Twenty",
        slug: "future-of-retail-nigeria-scaling",
        excerpt: "What does it take to build a retail empire? We look at the infrastructure needed to support rapid multi-outlet expansion.",
        category: "Growth Strategy"
    },
    {
        title: "How Zeneva's Offline Sync Saves Your Sales During Power Outages",
        slug: "zeneva-offline-sync-power-outages",
        excerpt: "Internet and power in Nigeria can be unstable. See how Zeneva ensures you never lose a sale, even when the grid goes down.",
        category: "Reliability"
    },
    {
        title: "Employee Accountability in Retail: Securing Your Cashier Operations",
        slug: "employee-accountability-securing-cashier-operations",
        excerpt: "Your staff are your biggest asset and your biggest risk. Learn how to use Zeneva's role-based permissions to protect your revenue.",
        category: "Operations"
    },
    {
        title: "Customer Loyalty Mastery: Turning Shoppers into Brand Advocates",
        slug: "customer-loyalty-mastery-brand-advocates",
        excerpt: "Retention is cheaper than acquisition. Discover how to use customer purchase history to drive repeat business in Nigeria.",
        category: "Marketing"
    },
    {
        title: "The Ultimate Guide to Inventory Audits: Stop Guessing, Start Measuring",
        slug: "ultimate-guide-inventory-audits",
        excerpt: "Periodic audits are the only way to ensure inventory integrity. Follow our step-by-step guide for a stress-free audit process.",
        category: "Operations"
    },
    {
        title: "Why Spreadsheet Inventory Management is Killing Your Growth",
        slug: "spreadsheet-inventory-management-killing-growth",
        excerpt: "Excel is great, but not for live retail. Find out why moving to a professional POS is the first step to scaling your business.",
        category: "Operations"
    },
    {
        title: "Retail Analytics for Beginners: Using Data to Predict Trends",
        slug: "retail-analytics-for-beginners-predict-trends",
        excerpt: "You don't need to be a data scientist to understand your sales. Learn the 3 key metrics every retailer should track daily.",
        category: "Data Insights"
    },
    {
        title: "Managing a Fashion Boutique: Inventory Velocity and Seasonal Trends",
        slug: "managing-fashion-boutique-inventory-velocity",
        excerpt: "Fashion moves fast. Learn how to track which styles are flying off the shelves and which are taking up valuable floor space.",
        category: "Industry Insights"
    },
    {
        title: "Hardware Guide: The Best Receipt Printers and Scanners for Zeneva",
        slug: "hardware-guide-receipt-printers-scanners",
        excerpt: "Get your hardware right the first time. Our vetted list of compatible peripherals for the ultimate Zeneva setup.",
        category: "Hardware"
    },
    {
        title: "How to Onboard Staff to a New POS System in Under 30 Minutes",
        slug: "onboard-staff-new-pos-fast",
        excerpt: "Implementation shouldn't be a headache. Discover the Zeneva training framework that gets your team selling in minutes.",
        category: "Operations"
    },
    {
        title: "Securing Your Margins: How Price Logs Protect Your Profits",
        slug: "securing-margins-price-logs-protect-profits",
        excerpt: "Inadvertent or malicious price changes can ruin your margins. Learn how Zeneva's immutable price logs keep your profits safe.",
        category: "Security"
    },
    {
        title: "The Role of AI in Modern Retail: How Zeneva is Evolving",
        slug: "role-of-ai-modern-retail-zeneva",
        excerpt: "Artificial Intelligence isn't just for big tech. See how Zeneva uses machine learning to suggest smarter inventory levels.",
        category: "Innovations"
    },
    {
        title: "Mobile POS vs Desktop POS: Choosing the Right Setup for Your Shop",
        slug: "mobile-pos-vs-desktop-pos-choosing",
        excerpt: "Should your cashiers be behind a counter or on the floor? We weigh the pros and cons of different hardware configurations.",
        category: "Hardware"
    },
    {
        title: "Handling Complex Tax and VAT Compliance in Nigeria with Zeneva",
        slug: "tax-vat-compliance-nigeria-zeneva",
        excerpt: "FIRS compliance doesn't have to be a nightmare. Automate your tax reporting and stay on the right side of the law.",
        category: "Regulatory"
    },
    {
        title: "Case Study: How a Local Supermarket Reduced Inventory Loss by 40%",
        slug: "case-study-supermarket-inventory-loss-reduction",
        excerpt: "Real results from a real retailer. Read how Zeneva transformed a struggling supermarket into a high-efficiency operation.",
        category: "Success Stories"
    }
];

const generateContent = (title, category) => `
# ${title}

In the fast-paced world of retail, efficiency isn't just a goal—it's a survival mechanism. As we navigate the complexities of the Nigerian market in 2026, the tools we use to manage our operations define our success.

## Why This Matters for ${category}

When we look at ${category.toLowerCase()}, we see a recurring pattern: data visibility. Without a clear view of what is happening across your shops, you are essentially flying blind. Zeneva was built to provide that missing visibility.

### Key Strategic Pillars

1. **Automation:** Reduce the margin for human error by letting the system handle repetitive tasks like tax calculation and reorder alerts.
2. **Accountability:** Every action is logged. Every price change is tracked. Every sale is attributed.
3. **Synchronization:** Your business should exist as a single entity, not a collection of disconnected silos.

## The Zeneva Solution

By implementing a high-fidelity dashboard that syncs across all your devices, Zeneva allows you to focus on what you do best: leading your business and growing your vision.

> "The difference between a shop and an enterprise is the system that supports it."

## Conclusion

Success in retail is a game of precision. With the right tactics and the right insights, scaling your business becomes a predictable roadmap rather than a dangerous gamble.

---

*Join 5,000+ Nigerian retailers using Zeneva to drive clarity and growth. [Get Started Today](/signup).*
`;

async function seedBulk() {
    console.log("Starting bulk blog seed...");
    try {
        const batch = db.batch();
        
        blogTopics.forEach((topic, index) => {
            const docRef = db.collection('blogPosts').doc();
            const post = {
                title: topic.title,
                slug: topic.slug,
                excerpt: topic.excerpt,
                content: generateContent(topic.title, topic.category),
                imageUrl: `https://ik.imagekit.io/zeneva/blog/banner-${index + 1}.jpg`,
                authorName: "Zeneva Strategy Team",
                published: true,
                category: topic.category,
                createdAt: Timestamp.fromDate(new Date(Date.now() - index * 86400000)), // Spread over 20 days
                updatedAt: Timestamp.now(),
            };
            batch.set(docRef, post);
        });

        await batch.commit();
        console.log("Successfully seeded 20 critical blog posts.");
        process.exit(0);
    } catch (err) {
        console.error("Error during bulk seed:", err);
        process.exit(1);
    }
}

seedBulk();
