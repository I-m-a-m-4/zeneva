

'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Bot, HelpCircle, Loader2, Send, MessageSquare, Search as SearchIcon, ShieldCheck, Monitor, Cloud, Github, Zap, Lock, CreditCard, Users, History, Settings, TrendingUp, Info } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, setDoc, orderBy } from 'firebase/firestore';
import type { SupportThread, SupportMessage, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { zenevaSupportChat, type ZenevaSupportChatInput } from '@/ai/flows/support-chat-flow';
import AIChat from '@/components/support/ai-chat';

const faqItems: { question: string; answer: React.ReactNode; id?: string; tags: string[] }[] = [
  // --- CATEGORY: INSTALLATION & DESKTOP (5) ---
  {
    id: "windows-protection",
    question: "Windows protected your PC? How to install Zeneva",
    tags: ["install", "windows", "security", "defender", "unrecognized"],
    answer: (
        <div className="space-y-4">
            <p className="leading-relaxed text-sm">This purple warning screen occurs because Zeneva is a new, high-performance desktop suite that hasn't yet built a "reputation" with Microsoft's SmartScreen filters. It does **not** indicate a threat.</p>
            <div className="my-6 border rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/20">
                <img src="/images/support/windows-protected.jpg" alt="Windows protected your PC" className="w-full object-cover" />
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Quick Installation Fix:
                </h4>
                <ol className="space-y-3">
                    <li className="flex gap-3 items-start text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">1</span>
                        <span>Click the <strong className="text-foreground">"More info"</strong> link inside the warning window.</span>
                    </li>
                    <li className="flex gap-3 items-start text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">2</span>
                        <span>The window will expand to show a <strong className="text-foreground">"Run anyway"</strong> button.</span>
                    </li>
                    <li className="flex gap-3 items-start text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">3</span>
                        <span>Click it, and the Zeneva installer will launch immediately.</span>
                    </li>
                </ol>
            </div>
        </div>
    )
  },
  {
      question: "What are the minimum system requirements for Zeneva Desktop?",
      tags: ["system", "requirements", "windows", "mac", "linux"],
      answer: <p className="text-sm">Zeneva is optimized to run on modest hardware. Minimum: Windows 10/11 (64-bit), 4GB RAM, and 500MB disk space. For the best experience with Zen AI local processing, we recommend 8GB RAM and an SSD.</p>
  },
  {
      question: "How do I update the desktop application to the latest version?",
      tags: ["update", "version", "download", "auto-update"],
      answer: <p className="text-sm">Zeneva checks for updates every time it launches. If a new version (e.g., v0.5.8) is available, you will see a "New Version Available" button in the Top Title Bar. Simply click it to download and relaunch with the latest features.</p>
  },
  {
      question: "Can I run Zeneva on multiple computers at the same time?",
      tags: ["multi-device", "login", "synced"],
      answer: <p className="text-sm">Yes. Your subscription allows you to log in on multiple terminals. Every sale made on one computer will synchronize with the others as soon as they are online, giving you a real-time view of your entire store.</p>
  },
  {
      question: "How to fix 'Database Initialization Error' on startup?",
      tags: ["error", "database", "sqlite", "fix"],
      answer: <p className="text-sm">This usually happens if the application is prevented from writing to its data folder. Try running Zeneva as an Administrator, or ensure that your Antivirus isn't blocking the `zeneva.db` file in your AppData directory.</p>
  },

  // --- CATEGORY: OFFLINE & SYNC (5) ---
  {
    question: "How exactly does the Offline-First synchronization work?",
    tags: ["offline", "sync", "internet", "data"],
    answer: (
        <div className="space-y-4">
            <p className="text-sm">Zeneva's core philosophy is that **your business should never wait for the internet.**</p>
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <Monitor className="h-5 w-5 text-primary shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-sm">Edge Computing</p>
                            <p className="text-xs text-muted-foreground">Every sale is processed locally on your hardware. Even without internet, your POS is fully functional.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Cloud className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-sm">Transactional Queueing</p>
                            <p className="text-xs text-muted-foreground">Actions made offline are queued and processed in exact order once a connection is detected to ensure data integrity.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
  },
  {
      question: "What happens if I make a sale while the internet is completely out?",
      tags: ["pos", "offline", "sale", "offline-sync"],
      answer: <p className="text-sm">Nothing changes for your customer. You scan items, accept cash/local payments, and print the receipt exactly as usual. The status bar will show "Offline". Once internet returns, the app will silently upload the receipt in the background.</p>
  },
  {
      question: "How do I know if my data has finished syncing to the cloud?",
      tags: ["sync", "status", "cloud", "indicator"],
      answer: <p className="text-sm">Look at the **Connection Badge** in the top-right corner. A rotating loader or a "Syncing..." label indicates data is moving. A green "Online" or "Synced" checkmark means your cloud dashboard is up to date.</p>
  },
  {
      question: "Can I manage my inventory while offline?",
      tags: ["offline", "inventory", "edit", "add-product"],
      answer: <p className="text-sm">Yes. You can add new products, update prices, and edit stock levels while offline. These changes are saved to your local SQLite database and will synchronize to your online dashboard once you reconnect.</p>
  },
  {
      question: "Does the search function work when I'm offline?",
      tags: ["search", "offline-search", "products"],
      answer: <p className="text-sm">Yes. Zeneva stores your entire product and customer database locally. Searching by name, SKU, or category is just as fast (and sometimes faster) when offline because it queries your local drive directly.</p>
  },

  // --- CATEGORY: POS & SALES (8) ---
  {
    question: "Using barcode scanners for high-speed POS checkouts",
    tags: ["barcode", "scanner", "pos", "sku"],
    answer: (
      <div className="space-y-4">
        <p className="text-sm">Zeneva is optimized for **Zero-Latency Scanning**. Simply connect your USB or Bluetooth scanner. In the POS interface, just scan, and the item is instantly added to the cart.</p>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs leading-relaxed border border-blue-100 dark:border-blue-800">
            <strong>Pro Tip:</strong> Ensure your scanner is set to "Keyboard Mode" with a Carriage Return (Enter) suffix enabled.
        </div>
      </div>
    )
  },
  {
      question: "How do I perform a split payment (Cash + Card)?",
      tags: ["payment", "split", "pos", "checkout"],
      answer: <p className="text-sm">In the Checkout dialog, enter the amount being paid in the first method (e.g., Cash). Clicking the "+" next to the payment field allows you to add a second method for the remaining balance.</p>
  },
  {
      question: "Can I save a cart and recall it later (On-Hold Orders)?",
      tags: ["pos", "hold", "save-cart", "orders"],
      answer: <p className="text-sm">Yes. Click the **"Pause"** icon in the POS cart. This saves the current items as a 'Pending' order, allowing you to serve the next customer. You can recall it anytime from the 'On-Hold' tab.</p>
  },
  {
      question: "How do I print a duplicate receipt for a past sale?",
      tags: ["print", "receipt", "history", "duplicate"],
      answer: <p className="text-sm">Navigate to **Sales History**, locate the transaction, and click the three-dot menu. Select **"Re-print"** to send the receipt back to your thermal printer or download it as a PDF.</p>
  },
  {
      question: "What thermal printers and hardware are supported?",
      tags: ["printer", "receipt", "hardware", "thermal"],
      answer: <p className="text-sm">We support all standard **ESC/POS** hardware. 80mm high-speed thermal printers are recommended, but 58mm portable Bluetooth printers also work perfectly with our adaptive formatting engine.</p>
  },
  {
      question: "How do I handle returns and partial refunds?",
      tags: ["refund", "return", "sales", "transaction"],
      answer: <p className="text-sm">Inside the 'Receipts' module, select the transaction and click **"Initiate Return"**. You can choose to return specific items (Partial) or the entire order (Full). Stock levels will be auto-corrected.</p>
  },
  {
      question: "Can I apply discounts to a whole order or just single items?",
      tags: ["discount", "pos", "coupon", "price"],
      answer: <p className="text-sm">Both! You can click on an individual item in the cart to set a specific discount, or use the **"Group Discount"** button at the bottom to apply a percentage or fixed-amount deduction to the entire total.</p>
  },
  {
      question: "How does the POS handle taxes and inclusive/exclusive pricing?",
      tags: ["tax", "vat", "accounting", "pos"],
      answer: <p className="text-sm">Under Business Settings, you can configure your tax rate (e.g., VAT 7.5%). You can decide whether your shelf prices already include tax or if tax should be added at the point of sale.</p>
  },

  // --- CATEGORY: INVENTORY & PRODUCTS (8) ---
  {
      question: "How do I add variation products (e.g., Colors/Sizes)?",
      tags: ["inventory", "product", "variation"],
      answer: (
          <p className="text-sm">When adding a product, enable the **"Variations"** switch. You can then add multiple types (e.g., Red, Blue, L, XL) and set individual stock levels and even different prices for each variation while keeping them under a single product entry.</p>
      )
  },
  {
      question: "What is the difference between a Product and a Service?",
      tags: ["inventory", "service", "stock"],
      answer: <p className="text-sm">Products are physical items with stock levels that decrement when sold. Services (like "Installation" or "Consulting") have no stock limit and don't require inventory tracking, making them always available for sale.</p>
  },
  {
      question: "How do I bulk import my products from an Excel or CSV file?",
      tags: ["import", "bulk", "csv", "excel", "inventory"],
      answer: <p className="text-sm">Go to **Inventory {'->'} Import**. Download our template CSV, fill in your product names, SKUs, and prices, and upload it. Zeneva can process thousands of products in seconds.</p>
  },
  {
    question: "Setting up Low Stock & Expiry Date alerts",
    tags: ["alerts", "inventory", "stock", "expiry"],
    answer: <p className="text-sm">Under each product's settings, you can define a **Minimum Stock Level**. Zeneva will proactively alert you when stock falls below this. You can also enable **Expiry Date tracking** for perishable goods.</p>
  },
  {
      question: "Can I track the 'Cost Price' to calculate profit margins?",
      tags: ["margin", "profit", "cost", "accounting"],
      answer: <p className="text-sm">Yes. By entering the Cost Price (your buy price) and Selling Price, Zen AI can automatically calculate your **Gross Profit Margin** and show you which items are your biggest money-makers.</p>
  },
  {
      question: "How do I perform a stock adjustment or audit (Visual Count)?",
      tags: ["audit", "stock-take", "adjustment", "inventory"],
      answer: <p className="text-sm">Use the **Visual Count** feature in the Inventory module. You can scan or select items and enter their actual shelf count. Zeneva will log the difference as a 'Stock Adjustment' in your audit trails.</p>
  },
  {
      question: "Does Zeneva support composite products (Bundles/Kits)?",
      tags: ["bundle", "kit", "composite", "inventory"],
      answer: <p className="text-sm">Yes. You can create a 'Bundle' product that is linked to multiple other items. When the bundle is sold, the stock levels for all its components are automatically decremented.</p>
  },
  {
      question: "How to export inventory reports for accounting?",
      tags: ["export", "accounting", "reports", "excel"],
      answer: <p className="text-sm">In the Reports module, go to **Inventory Valuation**. You can download a high-fidelity PDF or Excel sheet showing every item you own, its current value, and its total asset worth.</p>
  },

  // --- CATEGORY: ZEN AI & INTELLIGENCE (4) ---
  {
    question: "What is Zen AI and how does it maximize my profit?",
    tags: ["ai", "insight", "business", "profit"],
    answer: (
        <div className="space-y-4">
            <p className="text-sm">Zen AI acts as an **Artificial General Intelligence for your Store**. It identifies patterns in your sales that are often hidden.</p>
            <ul className="space-y-3">
                <li className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <Badge variant="outline" className="bg-primary text-primary-foreground border-none text-[10px]">Predictive</Badge>
                    <span className="text-xs">Tells you which items will run out next week based on purchase velocity.</span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <Badge variant="outline" className="bg-emerald-500 text-white border-none text-[10px]">Smart Pricing</Badge>
                    <span className="text-xs">Suggests price adjustments based on item demand and sales frequency.</span>
                </li>
            </ul>
        </div>
    )
  },
  {
      question: "Can I generate AI insights while I am offline?",
      tags: ["ai", "offline", "intelligence"],
      answer: <p className="text-sm">Yes. Zeneva's core intelligence module is deterministic and runs locally on your computer. It analyzes your SQLite data to provide "Customer Intelligence" and "Sales Forecasts" even without internet.</p>
  },
  {
      question: "How do I use 'Report Builder' for custom analysis?",
      tags: ["reports", "custom", "ai", "builder"],
      answer: <p className="text-sm">The Report Builder allows you to combine different data points (e.g., Sales by Staff vs. Category). Zen AI can then interpret this data to show you a text-based "Strategic Summary" of your performance.</p>
  },
  {
      question: "Does the AI learn from my specific business habits?",
      tags: ["ai", "learning", "data"],
      answer: <p className="text-sm">Zen AI respects your privacy. It analyzes your data locally on your device to build a model of your business's "Sales Velocity". This data is never used to train global models that your competitors could see.</p>
  },

  // --- CATEGORY: CUSTOMERS & CRM (5) ---
  {
    question: "Managing High-Value Rewards & Loyalty Programs",
    tags: ["loyalty", "points", "customer", "rewards"],
    answer: <p className="text-sm">Zeneva includes a powerful **CRM suite**. You can enable loyalty points and set reward thresholds (e.g., 1 point per ₦100 spent). Customers can then redeem these for discounts during checkout.</p>
  },
  {
      question: "How do I track 'Store Credit' for my frequent buyers?",
      tags: ["credit", "customer", "debt", "crm"],
      answer: <p className="text-sm">In the Customer profile, you can view their 'Wallet'. If a customer overpays or has a refund returned to store credit, it is tracked here and can be selected as a payment method in the POS.</p>
  },
  {
      question: "Can I capture customer phone numbers and emails at checkout?",
      tags: ["crm", "customer", "data-collection"],
      answer: <p className="text-sm">Yes. At checkout, you can quickly search for an existing customer or click "+" to add a new one. This allows you to track their purchase history and generate AI segments for them.</p>
  },
  {
      question: "What are 'Customer Segments' and how do I use them?",
      tags: ["marketing", "segments", "vip", "churn"],
      answer: <p className="text-sm">Zen AI automatically categorizes your buyers into groups like **"VIP Patrons"** (High spend), **"At-Risk"** (Haven't visited recently), and **"Occasional Buyers"**. This helps you know who to send special offers to.</p>
  },
  {
      question: "Can I manage customer debts (Buy Now Pay Later)?",
      tags: ["debt", "credit", "sales", "unpaid"],
      answer: <p className="text-sm">Yes. Zeneva allows you to record an order as 'Unpaid'. It will track the outstanding balance on the customer's profile, and you can record payments against that debt later to balance the books.</p>
  },

  // --- CATEGORY: SECURITY & MULTI-STORE (5) ---
  {
      question: "How do I add staff members and manage their permissions?",
      tags: ["staff", "users", "permissions", "security"],
      answer: (
          <div className="space-y-3">
              <p className="text-sm">Go to **Settings {'->'} Staff Management**. You can invite team members and assign them roles:</p>
              <ul className="text-xs space-y-2 list-disc list-inside text-muted-foreground">
                  <li><strong className="text-foreground">Cashier:</strong> Only POS access, no reports or deleting items.</li>
                  <li><strong className="text-foreground">Manager:</strong> Full ops, but no business-level settings.</li>
                  <li><strong className="text-foreground">Auditor:</strong> Read-only access to all financial reports.</li>
              </ul>
          </div>
      )
  },
  {
    question: "Reviewing the Secure Audit Trail & Action Logs",
    tags: ["audit", "logs", "security", "tracking"],
    answer: <p className="text-sm">Every critical action—deleting an order, changing a price, or editing stock—is recorded in the **Immutable Audit Log**. You can see exactly WHO did WHAT and WHEN they did it.</p>
  },
  {
    question: "Is my business data backed up and secure in the cloud?",
    tags: ["backup", "security", "data", "cloud"],
    answer: <p className="text-sm">Security is our priority. We use **AES-256 Encryption** for data at rest and SSL/TLS for transit. Every night, a redundant backup is created in the cloud to ensure you never lose a single digit.</p>
  },
  {
      question: "Can I manage multiple shops under one account?",
      tags: ["multi-store", "outlet", "enterprise"],
      answer: <p className="text-sm">Absolutely. Zeneva is an **Enterprise-Ready architecture**. You can create multiple 'Outlets' and monitor stock transfers, individual shop profits, and total company performance from one master dashboard.</p>
  },
  {
      question: "How do I enable Two-Factor Authentication (2FA)?",
      tags: ["security", "2fa", "mfa", "protection"],
      answer: <p className="text-sm">Go to **Settings {'->'} My Profile**. You can enable MFA via an Authenticator App (like Google Authenticator). This ensures that even if someone knows your password, they cannot access your business data without your phone.</p>
  },
  
  // --- CATEGORY: BILLING & ACCOUNT (5) ---
  {
      question: "How do I upgrade or cancel my Zeneva subscription?",
      tags: ["billing", "subscription", "upgrade", "cancel"],
      answer: <p className="text-sm">You can manage your plan under **Settings {'->'} Subscription**. To upgrade, select your preferred plan and follow the secure checkout. To cancel, click 'Downgrade to Starter' or contact support if you wish to close your business instance entirely.</p>
  },
  {
      question: "Will I lose my data if my subscription expires?",
      tags: ["billing", "data", "expiry", "safety"],
      answer: <p className="text-sm">No. We never delete your business data without your explicit request. If your subscription expires, your account will move to 'Read-Only' mode until a payment is made, allowing you to still view and export your past records.</p>
  },
  {
      question: "Can I get a custom plan for a large enterprise with 50+ stores?",
      tags: ["enterprise", "pricing", "custom", "multi-store"],
      answer: <p className="text-sm">Yes. We offer custom **Zeneva Enterprise** solutions for high-volume retailers. Please contact our Executive Support team via the chat above or email `enterprise@zeneva.ai` for a tailored quote and dedicated account manager.</p>
  },
  {
      question: "How do I change my business name or logo in the app?",
      tags: ["settings", "branding", "logo", "business-name"],
      answer: <p className="text-sm">Go to **Settings {'->'} Business Profile**. You can upload your high-resolution logo and change your trading name. These updates will instantly reflect on your printed receipts and online storefront.</p>
  },
  {
      question: "Does Zeneva offer a free trial for the Pro features?",
      tags: ["trial", "pricing", "pro", "free"],
      answer: <p className="text-sm">Every new Zeneva account starts with a **14-day Free Trial** of our 'Pro' features (including Zen AI and Multi-User). After the trial, you can choose to subscribe or continue using our 'Starter' plan for free.</p>
  }
];

type Message = {
    sender: 'user' | 'ai';
    text: string;
};

function ZenAIChatBot() {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await zenevaSupportChat({ query: input });
            const aiText = response.answer || (response as any).response || "I'm sorry, I couldn't process that request.";
            const aiMessage: Message = { sender: 'ai', text: aiText };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("AI chat error:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Could not get a response from the AI. Please try again.'
            });
            setMessages(prev => prev.filter(m => m !== userMessage));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <AIChat
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            className="h-[60vh]"
        />
    )
}


function UserSupportChat({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [thread, setThread] = React.useState<SupportThread | null>(null);
    const [message, setMessage] = React.useState('');
    const [subject, setSubject] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSending, setIsSending] = React.useState(false);

    const threadQuery = useMemoFirebase(
        () => (firestore && userProfile?.id) ? query(collection(firestore, 'supportThreads'), where('userId', '==', userProfile.id)) : null,
        [firestore, userProfile?.id]
    );
    
    const { data: threads, isLoading: isLoadingThreads } = useCollection<SupportThread>(threadQuery);

    React.useEffect(() => {
        if (!isLoadingThreads) {
            if (threads && threads.length > 0) {
                setThread(threads[0]);
            }
            setIsLoading(false);
        }
    }, [threads, isLoadingThreads]);
    
    const messagesQuery = useMemoFirebase(
        () => (firestore && thread) ? query(collection(firestore, 'supportThreads', thread.id, 'messages'), orderBy('createdAt', 'asc')) : null,
        [firestore, thread]
    );

    const safeFormatDate = (val: any) => {
        if (!val) return '';
        try {
            if (val instanceof Date) return formatDistanceToNow(val, { addSuffix: true });
            if (typeof val.toDate === 'function') return formatDistanceToNow(val.toDate(), { addSuffix: true });
            if (val.seconds) return formatDistanceToNow(new Date(val.seconds * 1000), { addSuffix: true });
            return '';
        } catch (e) {
            return '';
        }
    };

    const { data: messages, isLoading: isLoadingMessages } = useCollection<SupportMessage>(messagesQuery);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

     React.useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!message.trim() || !firestore) return;
        
        setIsSending(true);
        let currentThread = thread;
        
        try {
            if (!currentThread) {
                if (!subject.trim()) {
                    toast({ variant: 'destructive', title: 'Subject Required', description: 'Please provide a subject to start a new conversation.' });
                    setIsSending(false);
                    return;
                }
                const newThreadRef = doc(collection(firestore, 'supportThreads'));
                const newThreadData: Omit<SupportThread, 'id'> = {
                    userId: userProfile.id,
                    userName: userProfile.name,
                    userEmail: userProfile.email,
                    subject: subject,
                    status: 'open',
                    lastMessageAt: serverTimestamp(),
                    lastMessageSnippet: message,
                    isReadByAdmin: false,
                    createdAt: serverTimestamp(),
                };
                await setDoc(newThreadRef, newThreadData);
                currentThread = { ...newThreadData, id: newThreadRef.id, createdAt: new Date(), lastMessageAt: new Date() };
                setThread(currentThread);
            }

            const messageRef = collection(firestore, 'supportThreads', currentThread.id, 'messages');
            await addDoc(messageRef, {
                senderId: userProfile.id,
                senderName: userProfile.name,
                text: message,
                createdAt: serverTimestamp(),
            });

            const threadRef = doc(firestore, 'supportThreads', currentThread.id);
            await setDoc(threadRef, {
                lastMessageAt: serverTimestamp(),
                lastMessageSnippet: message,
                isReadByAdmin: false,
                status: 'open'
            }, { merge: true });

            setMessage('');
            if (!thread) setSubject('');
            toast({ variant: 'success', title: 'Message Sent!' });
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!thread) {
        return (
             <div className="p-4 border rounded-lg h-full flex flex-col">
                <p className="text-center text-muted-foreground mb-4">You have no active support conversations. Start a new one below.</p>
                <div className="space-y-4">
                    <Input 
                        placeholder="Subject (e.g., Issue with Billing)" 
                        value={subject} 
                        onChange={(e) => setSubject(e.target.value)} 
                        disabled={isSending}
                    />
                    <Textarea 
                        placeholder="Type your message here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1"
                        rows={5}
                        disabled={isSending}
                    />
                </div>
                <Button onClick={handleSendMessage} disabled={isSending || !message.trim() || !subject.trim()} className="mt-4 w-full">
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Start Conversation
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                    {isLoadingMessages && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {(messages || []).map(msg => {
                        if (!msg || !msg.id) return null;
                        return (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === userProfile.id ? 'justify-end' : 'justify-start'}`}>
                                 {msg.senderId !== userProfile.id && (
                                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                )}
                                 <div className={`rounded-lg p-3 max-w-[80%] whitespace-pre-wrap ${msg.senderId === userProfile.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm">{msg.text || ''}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">{safeFormatDate(msg.createdAt)}</p>
                                 </div>
                            </div>
                        );
                    })}
                 </div>
            </ScrollArea>
            <div className="mt-4 flex w-full items-center gap-2">
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your reply..."
                    disabled={isSending}
                    className="flex-1"
                    rows={1}
                />
                <Button onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                   {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
                </Button>
            </div>
        </div>
    )
}

export default function SupportPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const isLoading = isUserLoading || isProfileLoading;
    const [faqSearch, setFaqSearch] = React.useState('');

    const filteredFaqs = React.useMemo(() => {
        if (!faqSearch.trim()) return faqItems;
        const search = faqSearch.toLowerCase();
        return faqItems.filter(item => 
            item.question.toLowerCase().includes(search) || 
            item.tags.some(tag => tag.toLowerCase().includes(search))
        );
    }, [faqSearch]);

    return (
        <div className="space-y-8 pb-10">
            <PageTitle title="Help & Support" subtitle="Find answers to your questions and get assistance." />
            
            <Accordion type="multiple" defaultValue={['faq']} className="w-full space-y-6">
                <AccordionItem value="ai-chat" className="border-none">
                    <Card className="shadow-premium transition-shadow group overflow-hidden">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline group-data-[state=open]:bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">Chat with Zen AI</p>
                                    <p className="text-xs text-muted-foreground font-normal">Get instant answers from our intelligent strategist.</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <ZenAIChatBot />
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                <AccordionItem value="human-support" className="border-none">
                    <Card className="shadow-premium transition-shadow group overflow-hidden">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline group-data-[state=open]:bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">Contact Executive Support</p>
                                    <p className="text-xs text-muted-foreground font-normal">Message our technical team for complex assistance.</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0 h-[60vh]">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : userProfile ? (
                                <UserSupportChat userProfile={userProfile} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-center">Could not load your user profile.</div>
                            )}
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="faq" className="border-none">
                    <Card className="shadow-premium transition-shadow group overflow-hidden">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <HelpCircle className="h-6 w-6" />
                                </div>
                                <span>Frequently Asked Questions</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                             <div className="relative mb-6">
                                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                                <Input 
                                    className="pl-10 h-10 bg-muted/30 border-none ring-1 ring-border" 
                                    placeholder="Search FAQs by question or keyword..." 
                                    value={faqSearch}
                                    onChange={(e) => setFaqSearch(e.target.value)}
                                />
                             </div>

                             <Accordion type="single" collapsible className="w-full space-y-2">
                                {filteredFaqs.length > 0 ? (
                                    filteredFaqs.map((item, index) => (
                                        <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-4 bg-muted/10 border-transparent transition-all duration-300">
                                            <AccordionTrigger className="hover:no-underline hover:underline decoration-black underline-offset-2 font-semibold text-sm text-left">{item.question}</AccordionTrigger>
                                            <AccordionContent className="prose prose-sm dark:prose-invert max-w-none pb-4">
                                                {item.answer}
                                                <div className="flex flex-wrap gap-1 mt-4">
                                                    {item.tags.map(tag => (
                                                        <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-tighter opacity-70">#{tag}</Badge>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-muted-foreground italic">No FAQs found matching your search. Try "offline", "install", or "AI".</p>
                                    </div>
                                )}
                            </Accordion>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
