import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { blogPosts, type StaticBlogPost } from '@/lib/blog-data';
import Image from 'next/image';

const PostContent = ({ post }: { post: StaticBlogPost }) => {
    const contentMap: { [key: string]: React.ReactNode } = {
        'getting-started-with-zeneva': (
            <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">Welcome to Zeneva! Your journey to smarter inventory management starts now.</h2>
                <p>Congratulations on choosing Zeneva to power your business. You've taken the first step toward leaving manual tracking behind and embracing a streamlined, efficient, and profitable future. This guide will walk you through the essential first steps to get your Zeneva workspace up and running.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Step 1: Complete Your Onboarding Survey</h3>
                <p>The first thing you'll do after signing up is complete a brief onboarding survey. This isn't just paperwork; it's how we create and configure your unique business instance. You'll provide your business name and industry. This information helps us tailor the Zeneva experience to your needs and ensures your business is set up correctly from day one.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Step 2: Adding Your First Products</h3>
                <p>Your inventory is the heart of your business, and getting it into Zeneva is easy. You have two primary options:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Add Manually:</strong> Navigate to the "Inventory" page and click the "Add Product" button. This is perfect for when you're adding a few new items. You can fill in all the important details: name, price, SKU, stock quantity, and even a detailed description and image.</li>
                    <li><strong>Bulk Import via CSV:</strong> For businesses with a large catalog, the "Import" button is your best friend. Prepare a simple CSV file with columns for 'Name', 'Price', 'Stock', etc., and upload it. Zeneva will automatically populate your inventory, saving you hours of manual data entry.</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We had over 500 products. The CSV import took less than five minutes. It was a huge relief and let us get started selling immediately." - A Zeneva User
                </blockquote>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Step 3: Process Your First Sale with the POS</h3>
                <p>The Point of Sale (POS) is where the magic happens. It’s designed to be fast and intuitive for you and your staff.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li>Go to the "POS" page from the main navigation.</li>
                    <li>Simply tap on the products your customer wants to purchase. The cart on the right will update in real-time.</li>
                    <li>Adjust quantities or remove items directly in the cart.</li>
                    <li>(Optional) Add an existing customer to the sale to track their purchase history and award loyalty points.</li>
                    <li>Proceed to the payment step, select the payment method (Cash, Card, etc.), and complete the sale.</li>
                </ul>
                <p>That's it! Once the sale is complete, Zeneva automatically deducts the items from your inventory, generates a receipt, and records the transaction in your sales analytics. No manual updates required.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Step 4: Explore Your Dashboard</h3>
                <p>Your dashboard is your command center. It gives you a high-level overview of your business's health. Take some time to familiarize yourself with the key metrics:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Total Sales:</strong> A clear view of your revenue.</li>
                    <li><strong>Inventory Summary:</strong> See your total stock count and identify items that are running low.</li>
                    <li><strong>Top Selling Items:</strong> Understand what's popular with your customers so you can make smarter purchasing decisions.</li>
                    <li><strong>Recent Activity:</strong> A live feed of sales and new customers.</li>
                </ul>
                <p className="mt-8">Welcome aboard! We are thrilled to have you in the Zeneva community. If you have any questions, don't hesitate to visit the "Support" page. We're here to help you succeed.</p>
            </>
        ),
        'maximizing-sales-with-pos': (
            <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">The Zeneva POS: More Than Just a Checkout</h2>
                <p>In a competitive retail environment, the checkout process is a critical customer touchpoint. A slow, clunky system can lead to frustration and lost sales, while a fast, seamless experience can build loyalty. The Zeneva Point of Sale (POS) system is designed from the ground up to be a powerful tool for efficiency, accuracy, and business intelligence.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Speed and Simplicity at its Core</h3>
                <p>The primary goal of any POS is to process transactions quickly. Our interface is built for speed:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Visual Product Grid:</strong> Your products are displayed in a clear, tappable grid. Staff can find items instantly without needing to memorize codes.</li>
                    <li><strong>Live Search:</strong> Can't see the item? The powerful search bar lets you find any product by name or SKU in milliseconds.</li>
                    <li><strong>Instant Cart Updates:</strong> As you add items, the cart on the right updates immediately, showing a clear breakdown of products, quantities, and the subtotal. This transparency reduces errors and builds customer trust.</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "Our checkout times have been cut in half since we switched to Zeneva. Training new staff on the POS takes about 10 minutes, not hours." - A Zeneva Business Owner
                </blockquote>
                
                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Integrated Inventory: The Single Source of Truth</h3>
                <p>This is the most powerful aspect of the Zeneva POS. It's not a separate system; it's a window directly into your live inventory. When you complete a sale, the following happens automatically:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Stock Levels are Decremented:</strong> The quantity of each item sold is instantly subtracted from your total stock. This eliminates the possibility of selling an item you don't have.</li>
                    <li><strong>Low-Stock Alerts are Triggered:</strong> If a sale pushes an item below its defined low-stock threshold, it will immediately appear in your "Low Stock Alerts" on the dashboard, prompting you to reorder.</li>
                    <li><strong>Sales Data is Recorded:</strong> The transaction is logged and immediately reflected in your sales analytics, including your "Top Selling Items" list.</li>
                </ul>
                <p>This real-time, two-way sync means you can trust your data. The numbers you see on your inventory page are always accurate because they are directly tied to the sales you are making.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Building Customer Relationships at Checkout</h3>
                <p>The POS is also a powerful Customer Relationship Management (CRM) tool. During the checkout flow, you have the option to attach the sale to a customer profile.</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Add New Customers on the Fly:</strong> Don't see the customer in your list? You can create a new profile directly from the POS interface without interrupting the sale.</li>
                    <li><strong>Track Purchase History:</strong> By linking a sale to a customer, you build a valuable history of their buying habits. This allows you to offer personalized recommendations in the future.</li>
                    <li><strong>Power Your Loyalty Program:</strong> If you have the loyalty program enabled, points are automatically calculated and added to the customer's profile upon completion of the sale.</li>
                </ul>
                <p className="mt-8">By using the Zeneva POS to its full potential, you're not just processing transactions—you're gathering data, improving efficiency, and building a stronger, more profitable business.</p>
            </>
        ),
        'why-cloud-inventory-is-a-game-changer': (
             <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">Escape the Spreadsheet Trap: The Power of the Cloud</h2>
                <p>For many small and growing businesses, the journey of inventory management begins with a spreadsheet. It's simple, familiar, and seems effective at first. But as your business grows, that spreadsheet becomes a liability—a static, error-prone, and isolated file that can't keep up with the dynamic nature of modern retail.</p>
                <p>Switching to a cloud-based inventory system like Zeneva isn't just an upgrade; it's a fundamental transformation of how you operate. It moves your most critical business data from a fragile file on a single computer to a secure, accessible, and intelligent platform.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">1. Real-Time, Anywhere Access</h3>
                <p>This is the most immediate and impactful benefit. With a cloud system, your inventory data lives on a secure server, not on your laptop's hard drive.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Check Stock from Your Phone:</strong> At a supplier meeting and need to know if you should reorder? Open the Zeneva app and get a live view of your stock levels.</li>
                    <li><strong>Manage Multiple Locations:</strong> If you have more than one store or warehouse, a cloud system unifies your inventory. You can see what's in stock everywhere, in real-time.</li>
                    <li><strong>Empower Your Team:</strong> Grant access to your staff so they can check stock levels on the shop floor without having to run to the back office.</li>
                </ul>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">2. The Single Source of Truth</h3>
                <p>Spreadsheets are easily duplicated. Before you know it, you have "Inventory_May.xlsx", "Inventory_May_Final.xlsx", and "Inventory_May_FINAL_v2.xlsx" floating around. Which one is correct? A cloud-based platform eliminates this chaos. Everyone in your organization—from the owner to the cashier—is looking at the exact same data. When a sale is made via the POS, the inventory is updated instantly for everyone.</p>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We used to have one person in charge of 'the inventory spreadsheet'. If they were on leave, we were flying blind. Now, the whole team has the information they need, when they need it."
                </blockquote>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">3. Automation and Integration</h3>
                <p>A cloud platform is more than just a digital spreadsheet; it's an active system that works for you.</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Automatic Stock Updates:</strong> As mentioned, every sale through the Zeneva POS automatically updates your inventory. This is the core automation that saves hours of manual reconciliation.</li>
                    <li><strong>Low-Stock Alerts:</strong> The system can proactively notify you when items are running low based on thresholds you set, preventing costly stockouts.</li>
                    <li><strong>Data That Feeds Itself:</strong> Your sales data automatically feeds your analytics dashboards, showing you top-selling products and revenue trends without you having to lift a finger.</li>
                </ul>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">4. Enhanced Security and Reliability</h3>
                <p>What happens if the computer with your inventory spreadsheet crashes? Or if the file gets corrupted? With a cloud system, your data is protected by enterprise-grade security measures.</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Automatic Backups:</strong> Your data is continuously backed up on secure servers.</li>
                    <li><strong>No Single Point of Failure:</strong> You can access your data from any device with an internet connection. If one device breaks, your business doesn't skip a beat.</li>
                    <li><strong>Controlled Access:</strong> With user roles and permissions, you can control who can see and modify your data, which is far more secure than emailing a spreadsheet around.</li>
                </ul>
                <p className="mt-8">Making the leap from spreadsheets to the cloud is a critical step in professionalizing your retail operations. It's about working smarter, not harder, and building a resilient foundation for future growth.</p>
            </>
        ),
        'advanced-inventory-tips': (
             <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">From Novice to Pro: Mastering Your Inventory in Zeneva</h2>
                <p>You've added your products and you're making sales. That's a great start! But to truly unlock the power of Zeneva, you need to go beyond the basics. This guide will cover some of the more advanced features and best practices that can help you manage your inventory with greater precision and efficiency.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">1. The Power of Categories</h3>
                <p>Properly categorizing your products is one of the most impactful things you can do. It might seem like a small detail, but it powers several key features:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Smarter Analytics:</strong> The "Inventory by Category" chart on your dashboard gives you an at-a-glance view of your stock distribution. Are you over-invested in 'Electronics' and under-stocked on 'Apparel'? Categories make this obvious.</li>
                    <li><strong>Efficient Filtering:</strong> In the future, you'll be able to filter your main inventory view by category, making it much easier to manage large catalogs.</li>
                    <li><strong>AI-Powered Insights:</strong> Our AI Troubleshooting feature uses categories to make more relevant suggestions. For example, it might notice that your 'Home Goods' products have less descriptive text than your 'Electronics' and suggest improvements.</li>
                </ul>
                <p><strong>Pro-Tip:</strong> Be consistent with your category names. 'Home Goods' and 'home-goods' will be treated as two different categories. Choose a format and stick with it.</p>
                
                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">2. Set Meaningful Low-Stock Thresholds</h3>
                <p>By default, Zeneva might have a simple low-stock alert. However, you can set a custom `lowStockThreshold` for each product. This is crucial because not all products are created equal.</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Fast-Moving Items:</strong> For a product that sells 10 units a day, a low-stock alert at 5 units is too late. You should set its threshold much higher, perhaps at 50 or 100, to give you enough lead time to reorder.</li>
                    <li><strong>Slow-Moving Items:</strong> For a high-value item that sells once a month, a threshold of 2 or 3 might be perfectly adequate.</li>
                </ul>
                <p>Tuning these thresholds turns your "Low Stock Alerts" from a simple warning into a proactive, intelligent reordering system.</p>

                 <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                   "Once we customized our low-stock alerts, we practically eliminated stockouts on our bestsellers. It's been a game-changer for revenue."
                </blockquote>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">3. Use SKUs for Unambiguous Tracking</h3>
                <p>SKU stands for "Stock Keeping Unit." It's a unique code that you assign to each specific product in your inventory. While product names can be similar (e.g., "Zeneva Hoodie - Large" and "Zeneva Hoodie - Medium"), SKUs should always be unique.</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Eliminate Errors:</strong> Using SKUs prevents mix-ups between similar products.</li>
                    <li><strong>Integration-Ready:</strong> If you ever expand to other platforms or use barcode scanners, SKUs are the universal language that connects everything.</li>
                    <li><strong>Easy Searching:</strong> It's often faster and more accurate to search for a specific SKU than a long product name.</li>
                </ul>
                 <p><strong>Pro-Tip:</strong> Develop a consistent SKU format. For example: `BRAND-CATEGORY-ITEM-SIZE`. A large, blue Zeneva hoodie could be `ZNV-HDE-001-L-BLU`.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">4. Write Descriptions That Sell</h3>
                <p>Your product description isn't just for your records; it's a sales tool. A good description helps both your staff and potentially your customers (in future e-commerce integrations).</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Inform Your Staff:</strong> A detailed description helps your sales team answer customer questions accurately without having to guess.</li>
                    <li><strong>Improve SEO:</strong> For online channels, detailed and keyword-rich descriptions are vital for being discovered through search engines.</li>
                    <li><strong>AI Analysis:</strong> Our AI tools analyze your descriptions to check for completeness and quality, offering suggestions for improvement.</li>
                </ul>
                <p className="mt-8">By implementing these advanced practices, you transform Zeneva from a simple record-keeping tool into the strategic core of your retail operation.</p>
            </>
        ),
        'understanding-your-customers-with-crm': (
             <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">Beyond the Transaction: Building Relationships with Zeneva CRM</h2>
                <p>In today's market, the most successful businesses don't just sell products; they build relationships. A one-time buyer is good, but a loyal, repeat customer is invaluable. Zeneva's integrated Customer Relationship Management (CRM) features are designed to help you turn transactions into long-term loyalty.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Your Customer Database: A Single Source of Truth</h3>
                <p>The "Customers" page is your business's digital address book. Every time you add a new customer, either directly on the page or through the Point of Sale, you are building a valuable asset. This centralized database allows you to:</p>
                <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Maintain Clean Records:</strong> Keep track of customer names, emails, and phone numbers in one organized place. No more scattered notebooks or contact lists.</li>
                    <li><strong>View Purchase History:</strong> By attaching a customer to a sale in the POS, their receipt is linked to their profile, giving you a clear view of their buying habits over time.</li>
                    <li><strong>Segment Your Audience:</strong> As your list grows, you can identify different types of customers. Who are your biggest spenders? Who hasn't purchased in a while? This information is gold for marketing efforts.</li>
                </ul>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">The POS as a CRM Tool</h3>
                <p>Your checkout counter is one of the best opportunities to build your customer list. The Zeneva POS makes this seamless:</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Quick Search:</strong> When a returning customer is at the counter, a quick search for their name or email brings up their profile instantly.</li>
                    <li><strong>On-the-Spot Enrollment:</strong> If they're a new customer, you can add them to your system in seconds directly within the POS workflow. Frame it as a benefit to them: "Would you like to join our loyalty program and get points on today's purchase?"</li>
                </ul>

                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We make it a policy to ask every customer if they'd like to be added. Our customer list has grown by 300% in two months, and we're seeing more familiar faces than ever."
                </blockquote>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">Driving Repeat Business with the Loyalty Program</h3>
                <p>The built-in loyalty program is one of the most powerful CRM features in Zeneva. Found in your settings, it allows you to automatically reward customers for their repeat business.</p>
                 <ul className="list-disc list-inside space-y-2 my-4">
                    <li><strong>Effortless Point Accrual:</strong> When a sale is attached to a customer, Zeneva automatically calculates the loyalty points earned based on the total amount spent and adds it to their profile.</li>
                    <li><strong>Incentivize Return Visits:</strong> Customers are more likely to return when they know they are working towards a reward, such as a discount on a future purchase.</li>
                    <li><strong>Identify Your VIPs:</strong> The "Top Loyalty Customers" card on your dashboard instantly shows you who your most valuable and frequent shoppers are. These are the customers you should engage with the most.</li>
                </ul>
                <p>A simple "Thank you" to a top customer or a special offer for your most loyal patrons can go a long way in strengthening that relationship.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">The Foundation for Future Marketing</h3>
                <p>By consistently building your customer database through Zeneva, you are creating a powerful foundation for future marketing initiatives. While Zeneva currently focuses on in-store interactions, this database of engaged customers will be invaluable when you're ready to launch email newsletters, SMS promotions, or targeted advertising campaigns.</p>
                <p className="mt-8">Start today. Make it a habit to add every customer to your Zeneva CRM. The long-term value of the relationships you build will far exceed the value of any single transaction.</p>
            </>
        ),
        '5-things-you-will-not-miss-about-manual-stock-taking': (
            <>
                <h2 className="text-3xl font-bold font-instrument-serif mt-12 mb-4">Say Goodbye to the Clipboard of Despair</h2>
                <p>For any retail business owner, the phrase "manual stock-taking" can send a shiver down the spine. It's a tedious, time-consuming, and error-prone process that involves clipboards, pens, and long hours spent in a quiet, closed store. But what if we told you there's a better way? Switching to a digital inventory management system like Zeneva doesn't just save time—it transforms your business. Here are five things you definitely won't miss about the old way of doing things.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">1. The Human Error Headaches</h3>
                <p>Counting hundreds or thousands of items by hand is a recipe for mistakes. A tired employee might write a '1' instead of a '7', skip a shelf, or double-count a box. These small errors compound over time, leading to inaccurate stock levels, which can cause you to either order too much of a slow-moving item or run out of a bestseller. With Zeneva, every sale automatically decrements your stock, and you can update counts with a few taps on your phone, ensuring 99.9% accuracy.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">2. The "Closed for Stock-Taking" Sign</h3>
                <p>Closing your store for a full day (or more) just to count inventory means lost sales. It's a necessary evil in the manual world, but it directly impacts your bottom line. A digital system works 24/7 in the background. You get a real-time view of your inventory without ever having to turn away a customer. You can perform quick cycle counts on specific sections during slow periods instead of shutting down entirely.</p>
                
                <blockquote className="border-l-4 border-primary pl-4 italic my-8">
                    "We used to close for two full days every quarter. That's eight days of zero revenue a year. With Zeneva, we haven't closed for stock-taking in over a year." - Retail Store Owner
                </blockquote>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">3. The Data Entry Drudgery</h3>
                <p>After the counting is done, the "fun" isn't over. Someone then has to manually enter all those tally sheets into an Excel spreadsheet or an outdated accounting program. This is another opportunity for typos and errors, not to mention a mind-numbingly boring task. Zeneva eliminates this step entirely. The data is the data—live, accurate, and accessible from anywhere.</p>

                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">4. The Lack of Real-Time Insight</h3>
                <p>A manual stock-take gives you a snapshot of your inventory on one specific day. The moment you re-open your doors, that data starts becoming obsolete. You have no way of knowing your exact stock level on a random Tuesday afternoon without doing another count. Zeneva gives you a live, dynamic view. You can see which products are flying off the shelves during a flash sale or identify slow-moving items that need to be discounted, all in real-time.</p>
                
                <h3 className="text-2xl font-bold font-instrument-serif mt-8 mb-4">5. The Mystery of "Shrinkage"</h3>
                <p>Shrinkage—the portion of inventory that is lost, stolen, or damaged—is a major cost for retailers. With manual counts done infrequently, it's almost impossible to pinpoint when or why items went missing. With Zeneva, you can track inventory movements more closely. Discrepancies between your digital count and a physical spot-check can be identified and investigated immediately, helping you tighten security and reduce losses.</p>

                <p className="mt-8">Ready to ditch the clipboard and embrace a more efficient way of working? Zeneva makes it easy to get started. Sign up today and spend less time counting and more time growing your business.</p>
            </>
        )
    };

    return contentMap[post.slug] || <p>Content for this post is not available.</p>;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 hover:bg-muted">
            <Link href="/blog"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Link>
        </Button>
        <p className="text-sm font-semibold uppercase text-primary tracking-wider">{post.category}</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight font-instrument-serif mt-2 mb-4">
            {post.title}
        </h1>
        <p className="text-lg text-muted-foreground">{post.excerpt}</p>
      </div>

      <div className="aspect-[16/9] w-full relative rounded-xl overflow-hidden mb-8 border-4 border-black shadow-lg">
        <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
      </div>

      <div className="prose lg:prose-xl dark:prose-invert max-w-none mx-auto">
        <PostContent post={post} />
      </div>

    </div>
  );
}
