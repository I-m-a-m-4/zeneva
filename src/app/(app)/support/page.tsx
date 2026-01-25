

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
    question: "How do I add a new product to my inventory?",
    answer: (
        <p>Navigate to the 'Inventory' page from the sidebar menu. In the top-right corner, click the 'Add Product' button. This will take you to a form where you can fill in the product's details such as Name, Description, Price, Stock quantity, SKU (Stock Keeping Unit), and assign it to a Category. Once you're done, click 'Save Product'.</p>
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
    question: "How can I upgrade or manage my subscription?",
    answer: (
        <p>Navigate to the 'Billing' page from the main menu. Here, you can view your current plan, see your payment history, and choose to upgrade to a higher tier to unlock more features like advanced reporting and a public storefront.</p>
    )
  },
    {
    question: "What is the AI Troubleshoot feature?",
    answer: (
      <p>You can find this feature in the 'Inventory' section under the 'Troubleshoot' tab. Zen AI analyzes all your product data for issues like missing prices, short descriptions, or missing categories. It provides a prioritized list of actionable suggestions to help you improve your data quality and sell more effectively. This is a Pro and Business plan feature.</p>
    )
  },
  {
    question: "How do I customize my public storefront?",
    answer: (
      <p>If you are on a Pro or Business plan, you can access the 'Storefront' page. This is your mission control for your online store. You can enable or disable the store, set a custom URL (slug), change the theme color, upload a banner image, and add social media links. It provides a live preview so you can see your changes as you make them.</p>
    )
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
