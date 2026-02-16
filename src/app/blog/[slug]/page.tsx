import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Store } from 'lucide-react';
import { allBlogPosts, type StaticBlogPost, getRelatedPosts, IMAGE_MAP } from '@/lib/blog-data';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { DirectAnswerBox, ComparisonTable, FAQSection } from '@/components/blog/rich-content';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

export function generateStaticParams() {
    return allBlogPosts.map((post) => ({
        slug: post.slug,
    }));
}

const RelatedPosts = ({ currentSlug }: { currentSlug: string }) => {
    const related = getRelatedPosts(currentSlug, 3);

    if (related.length === 0) return null;

    return (
        <div className="mt-16 pt-16 border-t">
            <h3 className="text-2xl font-bold font-bricolage mb-8">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map(post => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                        <Card className="h-full overflow-hidden hover:shadow-lg transition-all border-border">
                            <div className="aspect-video relative overflow-hidden">
                                <Image
                                    src={post.imageUrl || '/herolytics.svg'}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{post.category}</p>
                                <h4 className="font-bold font-bricolage text-lg leading-tight group-hover:text-primary transition-colors">
                                    {post.title}
                                </h4>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const ProgrammaticContent = ({ post }: { post: StaticBlogPost }) => {
    if (!post.programmaticData) return null;
    const { industry, location, topic } = post.programmaticData;

    // Template 1: Best POS System
    if (topic.includes('Best POS System')) {
        return (
            <>
                <DirectAnswerBox answer={post.directAnswer || ''} />

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 my-8">
                    <h3 className="text-lg font-bold mb-2 flex items-center"><CheckCircle2 className="h-5 w-5 text-green-600 mr-2" /> Key Takeaways</h3>
                    <ul className="space-y-2 text-sm">
                        <li>• Why <strong>{industry}</strong> businesses in <strong>{location}</strong> need specialized software.</li>
                        <li>• Top 5 features to look for in a Point of Sale system.</li>
                        <li>• How Zeneva helps you track inventory, manage staff, and boost sales.</li>
                    </ul>
                </div>

                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Why {industry} Owners in {location} are Switching to Modern POS Systems</h2>
                <p>Running a successful <strong>{industry}</strong> in a bustling city like <strong>{location}</strong> comes with its unique set of challenges. From managing fluctuating foot traffic to tracking complex inventory, the old pen-and-paper methods simply don't cut it anymore. Business owners who want to scale and stay competitive are increasingly turning to digital solutions.</p>
                <p>But with so many options out there, how do you choose the right Point of Sale (POS) system for your specific needs? In this guide, we'll break down why a cloud-based system like Zeneva is the perfect fit for your {industry}.</p>

                {post.tableData && <ComparisonTable data={post.tableData} />}

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">1. Speed and Reliability for {location}'s Pace</h3>
                <p>In {location}, customers expect speed. Long queues can kill sales faster than anything else. A modern POS system ensures checkout times are cut in half. Zeneva, specifically designed for the Nigerian market, works offline, ensuring that even if the internet in {location} fluctuates, your business keeps moving.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">2. Inventory Management Tailored for {industry}</h3>
                <p>Managing stock for a {industry} is tricky. Product variants, expiration dates (if applicable), and restocks need precise tracking. Zeneva's inventory management suite automates this, decrementing stock instantly with every sale and alerting you before you run out of bestsellers.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">3. Data-Driven Decisions</h3>
                <p>Do you know what your best-selling item in {location} is this week? With Zeneva's analytics, you don't have to guess. Our dashboard gives you real-time insights into your sales performance, helping you make smarter purchasing decisions for your {industry}.</p>

                <div className="my-10 p-8 bg-primary/5 rounded-2xl border border-primary/10">
                    <h3 className="text-xl font-bold font-bricolage mb-4 flex items-center">
                        <Store className="mr-2 h-6 w-6 text-primary" />
                        Case Study: A {industry} in {location}
                    </h3>
                    <p className="italic text-muted-foreground mb-4">
                        "Before Zeneva, we were losing about ₦50,000 monthly to 'mystery' inventory disappearances. Within two months of switching, our shrinkage dropped to almost zero, and checkout times improved by 40%."
                    </p>
                    <p className="font-semibold text-primary">- Chinedu, {industry} Owner, {location}</p>
                </div>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Top Features Every {industry} Needs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
                    <Card>
                        <CardContent className="p-4 flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold">Offline Capability</h4>
                                <p className="text-sm text-muted-foreground">Keep selling even when the {location} power or network goes down.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold">Low Stock Alerts</h4>
                                <p className="text-sm text-muted-foreground">Never run out of best-sellers. Get notified instantly.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold">Multiple Locations</h4>
                                <p className="text-sm text-muted-foreground">Manage multiple branches across {location} from one dashboard.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold">Profit Analytics</h4>
                                <p className="text-sm text-muted-foreground">See exactly how much profit you made today, locally.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <h3 className="text-2xl font-bold font-bricolage mt-12 mb-4">Conclusion</h3>
                <p>Don't let outdated tools hold your business back. Embrace the future of retail management. Sign up for Zeneva today and see why it's the preferred choice for {industry} businesses in {location}.</p>

                <div className="mt-8 flex justify-center">
                    <Button size="lg" className="font-semibold text-lg px-8 h-14" asChild>
                        <Link href="/signup">Start Free Trial for Your {industry} <ArrowRight className="ml-2" /></Link>
                    </Button>
                </div>

                {post.faq && <FAQSection faq={post.faq} />}
            </>
        );
    }

    // Template 2: How to Manage Inventory
    if (topic.includes('How to Manage')) {
        return (
            <>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 my-8">
                    <h3 className="text-lg font-bold mb-2 flex items-center"><CheckCircle2 className="h-5 w-5 text-green-600 mr-2" /> In This Guide</h3>
                    <ul className="space-y-2 text-sm">
                        <li>• The hidden costs of manual inventory management.</li>
                        <li>• How to prevent theft and shrinkage in your <strong>{industry}</strong>.</li>
                        <li>• Step-by-step: Automating reorders in <strong>{location}</strong>.</li>
                    </ul>
                </div>

                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Mastering Inventory for Your {industry} in {location}</h2>
                <p>Inventory is the lifeblood of any {industry}. Too much stock ties up your cash flow; too little means lost sales and disappointed customers. For business owners in {location}, finding that perfect balance is key to profitability.</p>
                <p>This comprehensive guide explores the best practices for managing inventory specifically for a {industry}, and how utilizing software like Zeneva can transform your operations.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">The Challenge of Manual Counts</h3>
                <p>Many {industry} businesses in {location} still rely on manual stock-taking. This is time-consuming and prone to human error. Digital inventory management eliminates these issues by providing a single source of truth that updates in real-time.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Preventing Shrinkage and Theft</h3>
                <p>Loss prevention is a major concern for any {industry}. By tracking every item from purchase order to final sale, you can pinpoint exactly where discrepancies occur. Zeneva's detailed audit logs provide the accountability needed to secure your assets.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Automated Reordering</h3>
                <p>Never run out of your best-selling products again. Set low-stock alerts customized for your {industry}'s sales velocity. Zeneva will notify you exactly when it's time to reorder from your suppliers in {location} or beyond.</p>

                <div className="my-10 p-8 bg-slate-100 rounded-2xl border border-slate-200">
                    <h3 className="text-xl font-bold font-bricolage mb-4 flex items-center">
                        <MapPin className="mr-2 h-6 w-6 text-slate-700" />
                        Local Insight: Doing Business in {location}
                    </h3>
                    <p className="text-slate-600 mb-0">
                        Supply chain logistics in {location} can sometimes be unpredictable. We recommend keeping a slightly higher "safety stock" level—about 15% more than average—to buffer against delivery delays common in the city. Zeneva allows you to adjust these thresholds instantly.
                    </p>
                </div>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-lg">Can I track products with expiration dates?</h4>
                        <p className="text-muted-foreground">Yes! Zeneva is perfect for {industry} businesses that sell perishable goods. You can track batches and expiry dates to ensure you sell older stock first.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Do I need special hardware?</h4>
                        <p className="text-muted-foreground">Not at all. Zeneva runs on any device—laptop, tablet, or smartphone. You can use your existing devices in {location} without buying expensive proprietary equipment.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Does it work offline?</h4>
                        <p className="text-muted-foreground">Absolutely. We know internet in {location} isn't always 100%. Zeneva's POS works offline and syncs when you reconnect.</p>
                    </div>
                </div>

                <p className="mt-8">Start managing your inventory like a pro. With Zeneva, you can focus less on counting stock and more on growing your {industry} empire in {location}.</p>

                <div className="mt-8 flex justify-center">
                    <Button size="lg" className="font-semibold text-lg px-8 h-14" asChild>
                        <Link href="/signup">Get Started Free <ArrowRight className="ml-2" /></Link>
                    </Button>
                </div>
            </>
        );
    }

    return <p>Content coming soon.</p>;
};

const PostContent = ({ post }: { post: StaticBlogPost }) => {
    // If it's a programmatic post, use the generator component
    if (post.isProgrammatic) {
        return <ProgrammaticContent post={post} />;
    }

    // Otherwise, use the static content map
    const contentMap: { [key: string]: React.ReactNode } = {
        'getting-started-with-zeneva': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Welcome to Zeneva! Your Journey to Smarter Commerce Starts Now.</h2>
                <p>Congratulations on choosing Zeneva to power your business. You've taken the first step toward leaving manual tracking behind and embracing a streamlined, efficient, and profitable future. This guide will walk you through the essential first steps to get your Zeneva workspace up and running in minutes.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 1: Complete Your Onboarding Survey (2 Minutes)</h3>
                <p>The first thing you'll do after signing up is complete a brief onboarding survey. This isn't just paperwork; it's how we create and configure your unique business instance. You'll provide essential details like your business name, industry, and currency. This information helps us tailor the Zeneva experience to your needs and ensures your business is set up correctly from day one.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 2: Adding Your First Products (5-10 Minutes)</h3>
                <p>Your inventory is the heart of your business, and getting it into Zeneva is easy. You have two primary options:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Add Manually:</strong> Navigate to the "Inventory" page and click the "Add Product" button. This is perfect for when you're adding a few new items. You can fill in all the important details: name, price, stock quantity, SKU, category, cost price, and even a detailed description and image.</li>
                    <li><strong>Bulk Import via CSV:</strong> For businesses with a large catalog, the "Import" button is your best friend. Prepare a simple CSV file with columns for 'Name', 'Price', 'Stock', etc., and upload it. Zeneva's smart mapping will automatically detect common headers (like 'Regular Price' from WooCommerce) and populate your inventory, saving you hours of manual data entry.</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We had over 500 products. The CSV import took less than five minutes. It was a huge relief and let us get started selling immediately." - A Zeneva User
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 3: Process Your First Sale with the POS (1 Minute)</h3>
                <p>The Point of Sale (POS) is where the magic happens. It’s designed to be fast, intuitive, and works perfectly even if your internet connection is unstable.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li>Go to the "POS" page from the main navigation.</li>
                    <li>Simply tap on the products your customer wants to purchase. The cart will update in real-time.</li>
                    <li>(Optional) Add an existing customer to the sale to track their purchase history and award loyalty points.</li>
                    <li>Proceed to the payment step, select the payment method (Cash, Card, etc.), and complete the sale.</li>
                </ul>
                <p>That's it! Once the sale is complete, Zeneva automatically deducts the items from your inventory, generates a receipt, and records the transaction in your sales analytics. No manual updates required.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 4: Explore Your Dashboard</h3>
                <p>Your dashboard is your command center. It gives you a high-level overview of your business's health. Take some time to familiarize yourself with the key metrics:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Total Sales & Orders:</strong> A clear view of your revenue and transaction volume.</li>
                    <li><strong>Inventory Summary:</strong> See your total stock count and identify items that are running low.</li>
                    <li><strong>Top Selling Items:</strong> Understand what's popular with your customers so you can make smarter purchasing decisions.</li>
                    <li><strong>Recent Activity:</strong> A live feed of sales and new customers.</li>
                </ul>
                <p className="mt-8">Welcome aboard! We are thrilled to have you in the Zeneva community. If you have any questions, don't hesitate to visit the "Support" page. We're here to help you succeed.</p>
            </>
        ),
        'maximizing-sales-with-pos': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">The Zeneva POS: More Than Just a Checkout</h2>
                <p>In a competitive retail environment, the checkout process is a critical customer touchpoint. A slow, clunky system can lead to frustration and lost sales, while a fast, seamless experience builds loyalty. The Zeneva Point of Sale (POS) system is designed from the ground up to be a powerful tool for efficiency, accuracy, and business intelligence, even when your internet is down.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Speed and Reliability at its Core</h3>
                <p>The primary goal of any POS is to process transactions quickly and reliably. Our interface is built for this:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Visual Product Grid:</strong> Your products are displayed in a clear, tappable grid. Staff can find items instantly without needing to memorize codes.</li>
                    <li><strong>Live Search:</strong> Can't see the item? The powerful search bar lets you find any product by name or SKU in milliseconds.</li>
                    <li><strong>Offline First:</strong> The POS is fully functional offline. You can process sales, add customers, and generate receipts without an internet connection. All data is saved locally and syncs automatically when you're back online.</li>
                    <li><strong>Instant Cart Updates:</strong> As you add items, the cart updates immediately, showing a clear breakdown of products, quantities, and the subtotal. This transparency reduces errors and builds customer trust.</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "Our checkout times have been cut in half since we switched to Zeneva. Training new staff on the POS takes about 10 minutes, not hours." - A Zeneva Business Owner
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Integrated Inventory: Your Single Source of Truth</h3>
                <p>This is the most powerful aspect of the Zeneva POS. It's not a separate system; it's a window directly into your live inventory. When you complete a sale, the following happens automatically:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Stock Levels are Decremented:</strong> The quantity of each item sold is instantly subtracted from your total stock. This eliminates the possibility of selling an item you don't have.</li>
                    <li><strong>Low-Stock Alerts are Triggered:</strong> If a sale pushes an item below its defined low-stock threshold, it will immediately appear in your "Low Stock Alerts" on the dashboard, prompting you to reorder.</li>
                    <li><strong>Sales Data is Recorded:</strong> The transaction is logged and immediately reflected in your sales analytics, including your "Top Selling Items" list.</li>
                </ul>
                <p>This real-time, two-way sync means you can trust your data. The numbers you see on your inventory page are always accurate because they are directly tied to the sales you are making.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Building Customer Relationships at Checkout</h3>
                <p>The POS is also a powerful Customer Relationship Management (CRM) tool. During the checkout flow, you have the option to attach the sale to a customer profile.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Add New Customers on the Fly:</strong> Don't see the customer in your list? You can create a new profile directly from the POS interface without interrupting the sale. Frame it as a benefit to them: "Would you like to join our loyalty program and get points on today's purchase?"</li>
                    <li><strong>Track Purchase History:</strong> By linking a sale to a customer, you build a valuable history of their buying habits. This allows you to offer personalized recommendations and targeted promotions in the future.</li>
                    <li><strong>Power Your Loyalty Program:</strong> If you have the loyalty program enabled (Pro Plan and above), points are automatically calculated and added to the customer's profile upon completion of the sale, encouraging repeat visits.</li>
                </ul>
                <p className="mt-8">By using the Zeneva POS to its full potential, you're not just processing transactions—you're gathering data, improving efficiency, and building a stronger, more profitable business.</p>
            </>
        ),
        'why-cloud-inventory-is-a-game-changer': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Escape the Spreadsheet Trap: The Power of Cloud Inventory</h2>
                <p>For many small and growing businesses, the journey of inventory management begins with a spreadsheet. It's simple, familiar, and seems effective at first. But as your business grows, that spreadsheet becomes a liability—a static, error-prone, and isolated file that can't keep up with the dynamic nature of modern retail.</p>
                <p>Switching to a cloud-based inventory system like Zeneva isn't just an upgrade; it's a fundamental transformation of how you operate. It moves your most critical business data from a fragile file on a single computer to a secure, accessible, and intelligent platform.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">1. Real-Time, Anywhere Access</h3>
                <p>This is the most immediate and impactful benefit. With a cloud system, your inventory data lives on a secure server, not on your laptop's hard drive.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Check Stock from Your Phone:</strong> At a supplier meeting and need to know if you should reorder? Open the Zeneva app and get a live view of your stock levels.</li>
                    <li><strong>Manage Multiple Locations:</strong> If you have more than one store or warehouse, a cloud system unifies your inventory. You can see what's in stock everywhere, in real-time.</li>
                    <li><strong>Empower Your Team:</strong> Grant access to your staff so they can check stock levels on the shop floor without having to run to the back office. All changes are synced across all devices.</li>
                </ul>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">2. The Single Source of Truth</h3>
                <p>Spreadsheets are easily duplicated. Before you know it, you have "Inventory_May.xlsx", "Inventory_May_Final.xlsx", and "Inventory_May_FINAL_v2.xlsx" floating around. Which one is correct? A cloud-based platform eliminates this chaos. Everyone in your organization—from the owner to the cashier—is looking at the exact same data. When a sale is made via the POS, the inventory is updated instantly for everyone.</p>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We used to have one person in charge of 'the inventory spreadsheet'. If they were on leave, we were flying blind. Now, the whole team has the information they need, when they need it." - A Zeneva User
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">3. Intelligent Automation</h3>
                <p>A cloud platform is more than just a digital spreadsheet; it's an active system that works for you.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Automatic Stock Updates:</strong> As mentioned, every sale through the Zeneva POS automatically updates your inventory. This is the core automation that saves hours of manual reconciliation.</li>
                    <li><strong>Low-Stock Alerts:</strong> The system can proactively notify you when items are running low based on thresholds you set, preventing costly stockouts.</li>
                    <li><strong>Data That Feeds Itself:</strong> Your sales data automatically feeds your analytics dashboards, showing you top-selling products and revenue trends without you having to lift a finger.</li>
                </ul>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">4. Enhanced Security and Reliability</h3>
                <p>What happens if the computer with your inventory spreadsheet crashes? Or if the file gets corrupted? With a cloud system, your data is protected by enterprise-grade security measures.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Automatic Backups:</strong> Your data is continuously backed up on secure servers. You never have to worry about losing your business history.</li>
                    <li><strong>No Single Point of Failure:</strong> You can access your data from any device with an internet connection. If one device breaks, your business doesn't skip a beat.</li>
                    <li><strong>Controlled Access:</strong> With user roles and permissions, you can control who can see and modify your data, which is far more secure than emailing a spreadsheet around.</li>
                </ul>
                <p className="mt-8">Making the leap from spreadsheets to the cloud is a critical step in professionalizing your retail operations. It's about working smarter, not harder, and building a resilient foundation for future growth.</p>
            </>
        ),
        'advanced-inventory-tips': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">From Novice to Pro: Mastering Your Inventory in Zeneva</h2>
                <p>You've added your products and you're making sales. That's a great start! But to truly unlock the power of Zeneva, you need to go beyond the basics. This guide will cover some of the more advanced features and best practices that can help you manage your inventory with greater precision and efficiency.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">1. The Power of Categories</h3>
                <p>Properly categorizing your products is one of the most impactful things you can do. It might seem like a small detail, but it powers several key features:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Smarter Analytics:</strong> The "Inventory by Category" chart on your dashboard gives you an at-a-glance view of your stock distribution. Are you over-invested in 'Electronics' and under-stocked on 'Apparel'? Categories make this obvious.</li>
                    <li><strong>Efficient Filtering:</strong> In your Inventory and POS pages, you can filter your view by category, making it much easier to manage large catalogs and find items quickly.</li>
                    <li><strong>AI-Powered Insights:</strong> Our Zen AI features use categories to make more relevant suggestions. For example, it might notice that your 'Home Goods' products have less descriptive text than your 'Electronics' and suggest improvements.</li>
                </ul>
                <p><strong>Pro-Tip:</strong> Be consistent with your category names. 'Home Goods' and 'home-goods' will be treated as two different categories. Choose a format and stick with it. You can manage your categories in the Settings page.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">2. Set Meaningful Low-Stock Thresholds</h3>
                <p>By default, Zeneva might have a simple low-stock alert. However, on the Pro plan and above, you can set a custom <strong>lowStockThreshold</strong> for each product. This is crucial because not all products are created equal.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Fast-Moving Items:</strong> For a product that sells 10 units a day, a low-stock alert at 5 units is too late. You should set its threshold much higher, perhaps at 50 or 100, to give you enough lead time to reorder.</li>
                    <li><strong>Slow-Moving Items:</strong> For a high-value item that sells once a month, a threshold of 2 or 3 might be perfectly adequate.</li>
                </ul>
                <p>Tuning these thresholds turns your "Low Stock Alerts" from a simple warning into a proactive, intelligent reordering system.</p>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "Once we customized our low-stock alerts, we practically eliminated stockouts on our bestsellers. It's been a game-changer for revenue." - Zeneva Business User
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">3. Use SKUs for Unambiguous Tracking</h3>
                <p>SKU stands for "Stock Keeping Unit." It's a unique code that you assign to each specific product in your inventory. While product names can be similar (e.g., "Zeneva Hoodie - Large" and "Zeneva Hoodie - Medium"), SKUs should always be unique.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Eliminate Errors:</strong> Using SKUs prevents mix-ups between similar products during sales or stock counts.</li>
                    <li><strong>Integration-Ready:</strong> If you ever expand to other platforms or use barcode scanners, SKUs are the universal language that connects everything.</li>
                    <li><strong>Easy Searching:</strong> It's often faster and more accurate to search for a specific SKU than a long product name in both the Inventory and POS pages.</li>
                </ul>
                <p><strong>Pro-Tip:</strong> Develop a consistent SKU format. For example: `BRAND-CATEGORY-ITEM-SIZE`. A large, blue Zeneva hoodie could be `ZNV-HDE-001-L-BLU`.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">4. Add Cost Prices for True Profitability Tracking</h3>
                <p>Your 'Price' is what the customer pays. Your 'Cost Price' is what you paid for the item. Recording both is essential for understanding your business's true financial health. When you add a cost price to your products, Zeneva can automatically calculate:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Profit per Sale:</strong> See your exact profit on every single receipt.</li>
                    <li><strong>Profit & Loss Reports:</strong> In the 'Reports' section (Pro Plan and above), you can view detailed charts on your revenue, cost of goods sold (COGS), and total profit over time.</li>
                    <li><strong>Inventory Valuation:</strong> Zen AI uses cost price to accurately calculate the value of your "Money Locked in Stock," giving you a real number for capital tied up in unsold goods.</li>
                </ul>
                <p>The Zen AI Copilot is more than a feature; it's a new way of running your business. It's about having an expert advisor who works 24/7 to find risks and opportunities, so you can spend less time analyzing data and more time growing your brand. This feature is available on the Business plan.</p>
            </>
        ),
        'understanding-your-customers-with-crm': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Beyond the Transaction: Building Relationships with Zeneva CRM</h2>
                <p>In today's market, the most successful businesses don't just sell products; they build relationships. A one-time buyer is good, but a loyal, repeat customer is invaluable. Zeneva's integrated Customer Relationship Management (CRM) features are designed to help you turn transactions into long-term loyalty.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Your Customer Database: A Single Source of Truth</h3>
                <p>The "Customers" page is your business's digital address book. Every time you add a new customer, either directly on the page or through the Point of Sale, you are building a valuable asset. This centralized database allows you to:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Maintain Clean Records:</strong> Keep track of customer names, emails, and phone numbers in one organized place. No more scattered notebooks or contact lists.</li>
                    <li><strong>View Purchase History:</strong> By attaching a customer to a sale in the POS, their receipt is linked to their profile. This gives you a clear view of their buying habits over time, accessible from their individual customer page.</li>
                    <li><strong>Segment Your Audience:</strong> As your list grows, you can identify different types of customers. Who are your biggest spenders? Who hasn't purchased in a while? This information is gold for targeted marketing efforts.</li>
                </ul>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">The POS as a CRM Tool</h3>
                <p>Your checkout counter is one of the best opportunities to build your customer list. The Zeneva POS makes this seamless:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Quick Search:</strong> When a returning customer is at the counter, a quick search for their name or email brings up their profile instantly.</li>
                    <li><strong>On-the-Spot Enrollment:</strong> If they're a new customer, you can add them to your system in seconds directly within the POS workflow. Frame it as a benefit to them: "Would you like to join our loyalty program and get points on today's purchase?"</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We make it a policy to ask every customer if they'd like to be added. Our customer list has grown by 300% in two months, and we're seeing more familiar faces than ever."
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Driving Repeat Business with the Loyalty Program</h3>
                <p>The built-in loyalty program (available on Pro and Business plans) is one of the most powerful CRM features in Zeneva. Found in your settings, it allows you to automatically reward customers for their repeat business.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Effortless Point Accrual:</strong> When a sale is attached to a customer, Zeneva automatically calculates the loyalty points earned based on the total amount spent and adds it to their profile.</li>
                    <li><strong>Incentivize Return Visits:</strong> Customers are more likely to return when they know they are working towards a reward, such as a discount on a future purchase.</li>
                    <li><strong>Identify Your VIPs:</strong> The "Top Loyalty Customers" card on your dashboard and the detailed reports instantly show you who your most valuable and frequent shoppers are. These are the customers you should engage with the most.</li>
                </ul>
                <p>A simple "Thank you" to a top customer or a special offer for your most loyal patrons can go a long way in strengthening that relationship.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">The Foundation for Future Marketing</h3>
                <p>By consistently building your customer database through Zeneva, you are creating a powerful foundation for future marketing initiatives. While Zeneva currently focuses on in-store interactions, this database of engaged customers will be invaluable when you're ready to launch email newsletters, SMS promotions, or targeted advertising campaigns.</p>
                <p className="mt-8">Start today. Make it a habit to add every customer to your Zeneva CRM. The long-term value of the relationships you build will far exceed the value of any single transaction.</p>
            </>
        ),
        '5-things-you-will-not-miss-about-manual-stock-taking': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Say Goodbye to the Clipboard of Despair</h2>
                <p>For any retail business owner, the phrase "manual stock-taking" can send a shiver down the spine. It's a tedious, time-consuming, and error-prone process that involves clipboards, pens, and long hours spent in a quiet, closed store. But what if we told you there's a better way? Switching to a digital inventory management system like Zeneva doesn't just save time—it transforms your business. Here are five things you definitely won't miss about the old way of doing things.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">1. The Human Error Headaches</h3>
                <p>Counting hundreds or thousands of items by hand is a recipe for mistakes. A tired employee might write a '1' instead of a '7', skip a shelf, or double-count a box. These small errors compound over time, leading to inaccurate stock levels, which can cause you to either order too much of a slow-moving item or run out of a bestseller. With Zeneva, every sale automatically decrements your stock, and you can update counts with a few taps on your phone, ensuring 99.9% accuracy.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">2. The "Closed for Stock-Taking" Sign</h3>
                <p>Closing your store for a full day (or more) just to count inventory means lost sales. It's a necessary evil in the manual world, but it directly impacts your bottom line. A digital system works 24/7 in the background. You get a real-time view of your inventory without ever having to turn away a customer. You can perform quick cycle counts on specific sections during slow periods instead of shutting down entirely.</p>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We used to close for two full days every quarter. That's eight days of zero revenue a year. With Zeneva, we haven't closed for stock-taking in over a year." - Retail Store Owner
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">3. The Data Entry Drudgery</h3>
                <p>After the counting is done, the "fun" isn't over. Someone then has to manually enter all those tally sheets into an Excel spreadsheet or an outdated accounting program. This is another opportunity for typos and errors, not to mention a mind-numbingly boring task. Zeneva eliminates this step entirely. The data is the data—live, accurate, and accessible from anywhere.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">4. The Lack of Real-Time Insight</h3>
                <p>A manual stock-take gives you a snapshot of your inventory on one specific day. The moment you re-open your doors, that data starts becoming obsolete. You have no way of knowing your exact stock level on a random Tuesday afternoon without doing another count. Zeneva gives you a live, dynamic view. You can see which products are flying off the shelves during a flash sale or identify slow-moving items that need to be discounted, all in real-time.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">5. The Mystery of "Shrinkage"</h3>
                <p>Shrinkage—the portion of inventory that is lost, stolen, or damaged—is a major cost for retailers. With manual counts done infrequently, it's almost impossible to pinpoint when or why items went missing. With Zeneva, you can track inventory movements more closely. Discrepancies between your digital count and a physical spot-check can be identified and investigated immediately, helping you tighten security and reduce losses.</p>

                <p className="mt-8">Ready to ditch the clipboard and embrace a more efficient way of working? Zeneva makes it easy to get started. Sign up today and spend less time counting and more time growing your business.</p>
            </>
        ),
        'zen-ai-copilot-business-insights': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Meet Your New Business Advisor: The Zen AI Copilot</h2>
                <p>In the fast-paced world of retail, data is everywhere, but insights are rare. How do you know which products are tying up your cash? Which bestsellers are about to run out of stock, costing you sales? Answering these questions usually requires hours of spreadsheet analysis. Not anymore.</p>
                <p>Zeneva introduces the Zen AI Copilot, an intelligent business advisor built directly into your dashboard. It acts as a sentinel, constantly monitoring your sales, inventory, and product data to provide you with a clear, concise, and actionable executive briefing.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">The <strong>Business Health Score:</strong> Your Real-Time Vitals</h3>
                <p>The centerpiece of the Zen AI experience is your <strong>Business Health Score</strong>. This single, easy-to-understand metric (from 0 to 100) gives you an instant read on the overall performance of your business. It's calculated based on a holistic view of several key factors:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Sales Velocity:</strong> Is your revenue growing? Are sales accelerating or slowing down?</li>
                    <li><strong>Inventory Health:</strong> How efficiently is your capital being used? Is money locked in dead stock, or is your inventory turning over quickly?</li>
                    <li><strong>Data Quality:</strong> How complete is your product data? Missing prices, descriptions, or cost prices can hinder sales and obscure your true profitability.</li>
                </ul>
                <p>This score, along with a one-word status ('Healthy', 'Needs Attention', or 'At Risk'), lets you know exactly where you stand at a glance.</p>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "The Health Score is the first thing I check every morning. It tells me instantly if I need to dig deeper into a potential problem or if things are running smoothly." - Zeneva Business Owner
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">From Data to Dollars: Actionable Insights</h3>
                <p>Zen AI doesn't just give you a score; it tells you exactly what to do to improve it. The analysis is broken down into three key areas:</p>
                <ol className="list-decimal list-inside space-y-4 my-4">
                    <li><strong>Money Locked in Stock:</strong> The AI identifies "dead stock" (items not sold in 90+ days) and calculates the total value of this trapped capital. It then provides a clear recommendation, like running a clearance sale to liquidate these items and free up cash for better-performing products.</li>
                    <li><strong>Sales You Are About to Miss:</strong> Zen AI analyzes your sales velocity and current stock levels to identify fast-selling products at risk of stocking out. It estimates the potential monthly revenue you'll lose if these items aren't reordered, giving you a powerful incentive to act quickly.</li>
                    <li><strong>Actionable Recommendations:</strong> Based on the analysis, you get 2-3 direct, high-impact recommendations. Each one includes a clear title, a concise description of what to do, and a direct link to the relevant page in your Zeneva app (e.g., "View Slow-Moving Stock" linking to your inventory).</li>
                </ol>
                <p>The Zen AI Copilot is more than a feature; it's a new way of running your business. It's about having an expert advisor who works 24/7 to find risks and opportunities, so you can spend less time analyzing data and more time growing your brand. This feature is available on the Business plan.</p>
            </>
        ),
        'guide-to-public-storefront': (
            <>
                <h2 className="text-3xl font-bold font-bricolage mt-12 mb-4">Your Guide to Launching a Beautiful Online Store with Zeneva</h2>
                <p>Ready to expand your reach beyond your physical store? With Zeneva's Public Storefront feature (available on Pro and Business plans), you can create a beautiful, mobile-friendly online store in minutes—no coding required. This guide will walk you through the setup and customization process step-by-step.</p>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 1: The Basics - Enable Your Store</h3>
                <p>Navigate to the <strong>Storefront</strong> page in your Zeneva dashboard. Here's what to do first:</p>
                <ol className="list-decimal list-inside space-y-2 my-4">
                    <li><strong>Enable Public Store:</strong> Toggle the switch at the top of the page. Before you can do this, ensure you have configured a payment method (either Bank Transfer details or a Paystack subaccount) in your main <strong>Settings &rarr; Financials</strong> page. This is crucial for accepting orders.</li>
                    <li><strong>Set Your Store Slug:</strong> This is your unique URL (e.g., `zeneva.app/store/my-cool-shop`). Choose something short, memorable, and related to your brand.</li>
                    <li><strong>Write Your Headline & Description:</strong> Your headline is the first thing visitors see. Make it catchy! The description is used in the footer and for search engine link previews, so briefly explain what your business is about.</li>
                </ol>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 2: Customize Your Brand's Look and Feel</h3>
                <p>This is where you make the store your own. All customization options provide a live preview, so you can see your changes instantly.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Upload a Banner Image:</strong> This is the large hero image at the top of your store. Choose a high-quality photo that represents your brand.</li>
                    <li><strong>Choose a Primary Color:</strong> Use the color sliders or select from presets to match your brand's primary color. This color will be used for buttons, links, and other accents throughout the store.</li>
                    <li><strong>Set Product Columns:</strong> Decide how many products you want to show per row on desktop screens (3, 4, or 5).</li>
                    <li><strong>Hide Out-of-Stock Products:</strong> You can choose to automatically hide products that are out of stock, creating a cleaner shopping experience for your customers.</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "I had my store live in under 15 minutes. The live preview is amazing because you see exactly what your customers will see." - Zeneva Pro User
                </blockquote>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 3: Add Contact Information & Social Links</h3>
                <p>Help your customers connect with you. In the "Location & Contact" and "Social Links" sections, you can add:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li>Your physical store address(es) and a link to Google Maps.</li>
                    <li>Your business hours, contact phone number, and support email.</li>
                    <li>Links to your Twitter, Instagram, Facebook, and WhatsApp accounts.</li>
                </ul>

                <h3 className="text-2xl font-bold font-bricolage mt-8 mb-4">Step 4: Save and Share!</h3>
                <p>Once you're happy with your setup, hit the "Save Changes" button. Your store is now live! Use the "Share" button to easily copy your store link or share it directly to your social media channels. All orders placed through your new storefront will appear in the "Online Orders" page in your Zeneva dashboard, ready for you to manage.</p>
                <p className="mt-8">Congratulations! You've just opened a new sales channel for your business. Keep your product images and descriptions updated to provide the best possible experience for your online customers.</p>
            </>
        ),
    };

    const content = contentMap[post.slug];

    if (!content) return <p>Content for this post is not available.</p>;

    return (
        <>
            {post.directAnswer && <DirectAnswerBox answer={post.directAnswer} />}
            {content}
            {post.tableData && <ComparisonTable data={post.tableData} />}
            {post.faq && <FAQSection faq={post.faq} />}
        </>
    );
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const post = allBlogPosts.find(p => p.slug === slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
            <div className="mb-8 relative z-10">
                <Button asChild variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary transition-colors">
                    <Link href="/blog"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Link>
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                    <p className="text-sm font-semibold uppercase text-primary tracking-wider mb-2">{post.category}</p>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight font-bricolage mb-4">
                        {post.title}
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground">{post.excerpt}</p>
                </div>
            </div>

            <div className="w-full relative rounded-xl overflow-hidden mb-8 border shadow-lg bg-slate-50">
                <Carousel className="w-full">
                    <CarouselContent>
                        {/* Primary Image */}
                        <CarouselItem>
                            <div className="aspect-[16/9] w-full relative">
                                <Image
                                    src={post.imageUrl || '/herolytics.svg'}
                                    alt={post.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </CarouselItem>
                        {/* Metaphor Images Carousel */}
                        {[
                            'Protect your profit.png',
                            'data wins.png',
                            'rule your retail.png',
                            'play smart win big.png',
                            'fix the profit leakage.png'
                        ].map((img, index) => (
                            <CarouselItem key={index}>
                                <div className="aspect-[16/9] w-full relative bg-slate-100 flex items-center justify-center">
                                    <Image
                                        src={`/metaphors/${img}`}
                                        alt={`Slide ${index + 1}`}
                                        fill
                                        className="object-contain p-4"
                                    />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                </Carousel>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none mx-auto prose-p:text-base prose-headings:font-bricolage">
                <PostContent post={post} />
            </div>

            <RelatedPosts currentSlug={post.slug} />

        </div>
    );
}
