

'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Bot, HelpCircle, Loader2, Send, MessageSquare } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, setDoc, orderBy } from 'firebase/firestore';
import type { SupportThread, SupportMessage, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { zenevaSupportChat, type ZenevaSupportChatInput } from '@/ai/flows/support-chat-flow';
import AIChat from '@/components/support/ai-chat';

const faqItems: { question: string; answer: React.ReactNode; id?: string }[] = [
  {
    question: "What is Zen AI and how does it help my business?",
    answer: (
        <>
            <p>Zen AI is your proactive business strategist. Its primary goal is to **maximize your profit and ensure you never miss a sale.** It moves beyond simple reports to give you actionable, intelligent advice.</p>
            <h4 className="font-semibold mt-4 mb-2">Key Capabilities:</h4>
            <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong>Optimal Stock Forecasting:</strong> Instead of just a "low stock" alert, Zen AI analyzes your sales velocity to recommend the *optimal* quantity to reorder for your bestsellers, helping you avoid both stockouts and costly overstocking.</li>
                <li><strong>Capital Optimization:</strong> The AI identifies which slow-moving products are tying up your cash and recommends strategies (like targeted discounts) to liquidate them, freeing up capital for products that actually sell.</li>
                <li><strong>Market Opportunity Discovery:</strong> By analyzing your top-selling items and categories, Zen AI suggests new, related products your customer demographic is likely to want, turning your sales data into a roadmap for future growth.</li>
                <li><strong>Data Quality Improvement:</strong> It scans all your product listings for issues like missing prices or weak descriptions and provides a prioritized list of fixes to make your products more appealing to customers.</li>
            </ul>
            <p className="mt-4">In short, Zen AI doesn't just give you data; it gives you judgment and a clear path to increasing your revenue.</p>
        </>
    )
  },
  {
    question: "How do I add a new product to my inventory?",
    answer: (
        <p>Navigate to the 'Inventory' page from the sidebar menu. In the top-right corner, click the 'Add Product' button. This will take you to a form where you can fill in the product's details such as Name, Description, Price, Stock quantity, SKU (Stock Keeping Unit), and assign it to a Category. Once you're done, click 'Save Product'.</p>
    )
  },
  {
    id: "how-barcodes-work",
    question: "How do barcodes work for POS and stock-taking?",
    answer: (
      <>
        <p>Using a barcode scanner with Zeneva is incredibly simple and dramatically speeds up your workflow. Here’s everything you need to know:</p>
        
        <h4 className="font-semibold mt-4 mb-2">What is an SKU?</h4>
        <p>An SKU (Stock Keeping Unit) is a unique code you assign to each product (e.g., `TSHIRT-RED-L`). The barcode label you print is just a machine-readable version of this SKU.</p>
        
        <h4 className="font-semibold mt-4 mb-2">How Does the Scanner Connect?</h4>
        <p>A standard USB barcode scanner acts just like a keyboard. You don't need any special software or drivers. Simply plug the scanner into your computer's USB port, and it's ready to go.</p>

        <h4 className="font-semibold mt-4 mb-2">How to Use it for Sales (POS):</h4>
        <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>Navigate to the <strong>POS</strong> page.</li>
            <li>Click your mouse into the <strong>"Search by name or SKU..."</strong> input field.</li>
            <li>Scan the product's barcode.</li>
        </ol>
        <p className="mt-2">The scanner will instantly "type" the product's SKU into the search bar and filter the list to show only that item. You can then add it to the cart. This reduces checkout time from minutes to seconds.</p>
        
        <h4 className="font-semibold mt-4 mb-2">How to Use it for Stock-Taking:</h4>
        <p>The process is similar. On the <strong>Inventory</strong> page, click into the search bar, scan an item, and its details will appear, ready for you to update the stock count.</p>
      </>
    )
  },
  {
    id: "csv-formatting",
    question: "How should I format my CSV files for import?",
    answer: (
      <>
        <p>To ensure a smooth import, your CSV file's first row must contain headers. We can automatically detect many common header names (e.g., 'Regular Price' from WooCommerce is automatically mapped to 'Price'). Below are the fields we support and common headers for each.</p>
        
        <h4 className="font-semibold mt-4 mb-2">Product Import Headers</h4>
        <p>Required headers: <strong>Name</strong> and <strong>Price</strong>.</p>
        <ul className="list-disc list-inside space-y-1 my-2 text-sm text-muted-foreground">
          <li>For <strong>Name</strong>, common headers are: <code>Name</code>, <code>Product Name</code>, <code>Title</code>.</li>
          <li>For <strong>Price</strong>, common headers are: <code>Price</code>, <code>RetailPrice</code>, <code>Sale Price</code>, <code>Regular Price</code>.</li>
          <li>For <strong>Stock</strong>, common headers are: <code>Stock</code>, <code>Quantity</code>, <code>Qty</code>, <code>In Stock</code>.</li>
          <li>For <strong>SKU</strong>, common headers are: <code>SKU</code>, <code>Code</code>.</li>
          <li>For <strong>Category</strong>, common headers are: <code>Category</code>, <code>Type</code>.</li>
          <li>For <strong>Description</strong>, common headers are: <code>Description</code>, <code>Body HTML</code>, <code>Details</code>.</li>
          <li>For <strong>Image URL</strong>, common headers are: <code>Image URL</code>, <code>Image Src</code>, <code>Image</code>, <code>Images</code>.</li>
        </ul>

        <h4 className="font-semibold mt-6 mb-2">Customer Import Headers</h4>
        <p>Required headers: <strong>Name</strong> and <strong>Email</strong> (or enable placeholder generation).</p>
        <ul className="list-disc list-inside space-y-1 my-2 text-sm text-muted-foreground">
          <li>For <strong>Name</strong>, common headers are: <code>Name</code>, <code>Full Name</code>.</li>
          <li>For <strong>Email</strong>, common headers are: <code>Email</code>, <code>Email Address</code>.</li>
          <li>For <strong>Phone</strong>, common headers are: <code>Phone</code>, <code>Mobile</code>.</li>
        </ul>
      </>
    )
  },
  {
    question: "How do I process a sale using the POS?",
    answer: (
      <>
        <p>The Point of Sale (POS) is a simple multi-step process:</p>
        <ol className="list-decimal list-inside space-y-2 mt-2">
            <li><strong>Select Products:</strong> Go to the 'POS' page. Tap on the product images to add them to the cart. You can adjust quantities directly in the cart.</li>
            <li><strong>Customer (Optional):</strong> Click 'Next' to proceed. Here you can search for and select an existing customer to link the sale to their profile for history and loyalty points.</li>
            <li><strong>Payment:</strong> Click 'Next' again. On this screen, you can apply a discount, adjust the tax rate, and select the customer's payment method (Cash, Card, or Bank Transfer).</li>
            <li><strong>Review & Complete:</strong> The final step shows a summary of the sale. Click 'Complete Sale' to finalize the transaction. This will automatically update your inventory stock and generate a receipt.</li>
        </ol>
      </>
    )
  },
    {
    question: "How do I see my sales reports?",
    answer: (
        <p>If you are on a Pro or Business plan, you can access the 'Reports' page. This dashboard provides detailed analytics on your sales revenue, top-selling products, and top customers. You can filter all reports by a specific date range to analyze performance over time.</p>
    )
  },
  {
    id: "audit-log-guide",
    question: "How do I use the Audit Log?",
    answer: (
      <>
        <p>The Audit Log, available on Pro and Business plans, is a crucial security feature that records important actions taken within your business. It helps you track changes and investigate potential issues.</p>
        <ol className="list-decimal list-inside space-y-2 mt-2">
            <li><strong>Access the Log:</strong> Navigate to the 'Audit Log' page from the sidebar.</li>
            <li><strong>Review Events:</strong> The log shows a chronological list of events, including who performed the action, what they did (e.g., 'product.create', 'sale.void'), and when it happened. Click on any row to see more details in a pop-up modal.</li>
            <li><strong>Scan for Issues:</strong> Click the "Scan for Issues" button. The system will instantly analyze your logs for common suspicious patterns, such as a sale being voided immediately after it was created, and present them to you for review. This can help you identify potential theft or operational mistakes quickly.</li>
            <li><strong>Investigate:</strong> Use the information to investigate any discrepancies. For example, if you see an unusual number of voided sales by a specific staff member, you can cross-reference it with your cash drawer records.</li>
        </ol>
        <p className="mt-2">Regularly reviewing your audit log is a good practice for maintaining the security and integrity of your business operations.</p>
      </>
    )
  },
  {
    question: "How can I upgrade or manage my subscription?",
    answer: (
        <p>Navigate to the 'Billing' page from the main menu. Here, you can view your current plan, see your payment history, and choose to upgrade to a higher tier to unlock more features like advanced reporting and a public storefront.</p>
    )
  },
  {
    question: "How do I customize my public storefront?",
    answer: (
      <p>If you are on a Pro or Business plan, you can access the 'Storefront' page. This is your mission control for your online store. You can enable or disable the store, set a custom URL (slug), change the theme color, upload a banner image, and add social media links. It provides a live preview so you can see your changes as you make them.</p>
    )
  },
  {
    id: 'paystack-setup',
    question: 'How do I set up my account for online payments?',
    answer: (
      <>
        <p>
          Zeneva makes it easy to accept payments for your online store. For bank transfers, funds go to the account you set. For card payments, we integrate with Paystack to send funds directly to you. Here's how it works:
        </p>
        <ol className="list-decimal list-inside space-y-2 mt-4">
          <li>
            <strong>Provide Your Bank Details:</strong> In Zeneva, go to <strong>Settings {'->'} Financials</strong>. Fill in your business's bank name and account number. Our system will verify the account name for you. This is the account where funds from "Bank Transfer" orders will go.
          </li>
          <li>
            <strong>(For Card Payments) Create a Paystack Subaccount:</strong> To accept credit/debit cards, you need a Paystack account. Inside your Paystack dashboard, create a "Subaccount" for your Zeneva store.
          </li>
          <li>
            <strong>Set Transaction Split:</strong> When creating the subaccount, Paystack will ask how to split the money. Set <strong>"Subaccount gets" to 100%</strong>. Zeneva does not take a commission on your sales.
          </li>
          <li>
            <strong>Get the Subaccount Code:</strong> Paystack will give you a code that looks like `ACCT_xxxxxxxxxxxxxxx`. Go to Zeneva's <strong>Settings {'->'} Financials</strong> page and paste this code into the "Paystack Subaccount" field.
          </li>
        </ol>
        <p className="mt-4">
          By providing your bank details, you can receive orders via manual bank transfer. Adding a Paystack subaccount enables direct card payments for your customers on your online store.
        </p>
      </>
    ),
  },
  {
    question: "How do I manage staff roles and permissions?",
    answer: (
        <p>As an 'admin', you can invite new users from the 'Users' page. You can assign them roles like 'Manager' (who can manage products and view most reports) or 'Vendor Operator' (who can primarily use the POS). Permissions are pre-set for each role to ensure security.</p>
    )
  },
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
            const aiMessage: Message = { sender: 'ai', text: response.answer };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("AI chat error:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Could not get a response from the AI. Please try again.'
            });
            // Remove the user's message if the AI fails
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
        () => firestore ? query(collection(firestore, 'supportThreads'), where('userId', '==', userProfile.id)) : null,
        [firestore, userProfile.id]
    );
    
    // This hook just finds if a thread exists
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

    const { data: messages, isLoading: isLoadingMessages } = useCollection<SupportMessage>(messagesQuery);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

     React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!message.trim() || !firestore) return;
        
        setIsSending(true);
        let currentThread = thread;
        
        try {
            // Create a new thread if one doesn't exist
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

            // Add the new message to the messages subcollection
            const messageRef = collection(firestore, 'supportThreads', currentThread.id, 'messages');
            await addDoc(messageRef, {
                senderId: userProfile.id,
                senderName: userProfile.name,
                text: message,
                createdAt: serverTimestamp(),
            });

            // Update the parent thread document
            const threadRef = doc(firestore, 'supportThreads', currentThread.id);
            await setDoc(threadRef, {
                lastMessageAt: serverTimestamp(),
                lastMessageSnippet: message,
                isReadByAdmin: false, // Mark as unread for admin
                status: 'open' // Re-open the ticket if it was closed
            }, { merge: true });

            setMessage('');
            if (!thread) setSubject(''); // Clear subject only if it was a new thread
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
                    {messages?.map(msg => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === userProfile.id ? 'justify-end' : 'justify-start'}`}>
                             {msg.senderId !== userProfile.id && (
                                <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                             <div className={`rounded-lg p-3 max-w-[80%] whitespace-pre-wrap ${msg.senderId === userProfile.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{msg.text}</p>
                                <p className="text-xs opacity-70 mt-1 text-right">{msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                             </div>
                        </div>
                    ))}
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

    return (
        <div className="space-y-8">
            <PageTitle title="Help & Support" subtitle="Find answers to your questions and get assistance." />
            
            <Accordion type="multiple" defaultValue={['faq']} className="w-full space-y-6">
                <Card>
                    <AccordionItem value="ai-chat" className="border-b-0">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline">
                             <div className="flex items-center gap-3">
                                <Bot className="h-6 w-6 text-primary" />
                                <span>Chat with Zen AI</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <ZenAIChatBot />
                        </AccordionContent>
                    </AccordionItem>
                </Card>
                
                <Card>
                     <AccordionItem value="human-support" className="border-b-0">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline">
                             <div className="flex items-center gap-3">
                                <MessageSquare className="h-6 w-6 text-primary" />
                                <span>Contact Human Support</span>
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
                    </AccordionItem>
                </Card>

                <Card>
                    <AccordionItem value="faq" className="border-b-0">
                        <AccordionTrigger className="p-6 text-lg hover:no-underline">
                            <div className="flex items-center gap-3">
                                <HelpCircle className="h-6 w-6 text-primary" />
                                <span>Frequently Asked Questions</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                             <Accordion type="single" collapsible className="w-full">
                                {faqItems.map((item, index) => (
                                    <AccordionItem key={index} value={`faq-${index}`} id={item.id}>
                                        <AccordionTrigger>{item.question}</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            </Accordion>
        </div>
    );
}
