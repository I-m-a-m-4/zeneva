

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
            <p className="text-[10px] text-muted-foreground italic mt-3 underline decoration-emerald-500/30 underline-offset-4">Note: We are currently undergoing Microsoft Developer Certification to remove this warning permanently.</p>
        </div>
    )
  },
  {
    question: "Is the Zeneva Mobile Application ready for production?",
    tags: ["mobile", "android", "ios", "iphone", "app"],
    answer: (
        <div className="space-y-4">
            <p className="text-sm">Yes. The Zeneva ecosystem includes high-performance mobile apps for **Android and iOS**. These are not just companion apps; they are powerful tools for your business:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Stock Taking</p>
                    <p className="text-xs text-muted-foreground">Use your phone's camera as a high-speed barcode scanner to audit stock without a dedicated terminal.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Live Telemetry</p>
                    <p className="text-xs text-muted-foreground">Monitor live cashier sales and cash-in-hand totals while you are away from the shop.</p>
                </div>
            </div>
        </div>
    )
  },
  {
    question: "How does the Offline-First synchronization work?",
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
                            <p className="text-xs text-muted-foreground">Every sale is processed in milliseconds on your local chip. No cloud round-trips for basic receipts.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Cloud className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-sm">Delta Syncing</p>
                            <p className="text-xs text-muted-foreground">As soon as connection is detected, Zeneva pushes only the "changes" to the cloud to save bandwidth.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
  },
  {
    question: "What is Zen AI and how does it maximize my profit?",
    tags: ["ai", "insight", "business", "profit"],
    answer: (
        <div className="space-y-4">
            <p className="text-sm">Zen AI goes beyond raw numbers. It acts as an **Artificial General Intelligence for your Retail Store**. It looks for patterns that humans often miss.</p>
            <ul className="space-y-3">
                <li className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <Badge variant="outline" className="bg-primary text-primary-foreground border-none text-[10px]">Predictive</Badge>
                    <span className="text-xs">Tells you which items will run out next week based on current velocity.</span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <Badge variant="outline" className="bg-orange-500 text-white border-none text-[10px]">Loss Audit</Badge>
                    <span className="text-xs">Detects anomalies in inventory vs. sales to prevent leakage or theft.</span>
                </li>
            </ul>
        </div>
    )
  },
  {
      question: "Can I manage multiple shops (Outlets) under one account?",
      tags: ["multi-device", "terminal", "sync", "staff", "outlets"],
      answer: (
          <p className="leading-relaxed text-sm">Absolutely. Zeneva is an **Enterprise-Ready architecture**. You can create multiple outlets from your master dashboard and monitor stock transfers, individual shop profits, and staff performance across your entire retail empire from a single login.</p>
      )
  },
  {
      question: "Is my business data backed up and secure?",
      tags: ["backup", "security", "data", "cloud"],
      answer: (
          <div className="space-y-4">
            <p className="text-sm">Security is the foundation of Zeneva. We provide **Military-Grade Data Protection**:</p>
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="text-[10px] font-bold p-2 border rounded bg-muted/20">AES-256 Encryption</div>
                <div className="text-[10px] font-bold p-2 border rounded bg-muted/20">SSL/TLS Transit</div>
                <div className="text-[10px] font-bold p-2 border rounded bg-muted/20">End-to-End Backups</div>
                <div className="text-[10px] font-bold p-2 border rounded bg-muted/20">Hardware Locking</div>
            </div>
          </div>
      )
  },
  {
      question: "What thermal printers and hardware are supported?",
      tags: ["printer", "receipt", "hardware", "thermal"],
      answer: (
          <p className="text-sm">We support **all standard POS hardware**. Whether you have an 80mm high-speed thermal printer or a generic 58mm Bluetooth printer, Zeneva's adaptive printing engine will format receipts perfectly.</p>
      )
  },
  {
      question: "How do I handle returns and partial refunds?",
      tags: ["refund", "return", "sales", "transaction"],
      answer: (
          <p className="text-sm">Inside the 'Orders' module, select the transaction. You can perform a **Full Refund** (returning balance to the customer and stock to the shelf) or a **Partial Refund** for specific items in an order.</p>
      )
  },
  {
      question: "How do I add variation products (e.g., Colors/Sizes)?",
      tags: ["inventory", "product", "variation"],
      answer: (
          <p className="text-sm">When adding a product, enable the **"Variations"** switch. You can then add multiple types (e.g., Red, Blue, L, XL) and set individual stock levels and even different prices for each variation while keeping them under a single product entry.</p>
      )
  },
  {
    question: "Using barcode scanners for high-speed POS checkouts",
    tags: ["barcode", "scanner", "pos", "sku"],
    answer: (
      <div className="space-y-4">
        <p className="text-sm">Zeneva is optimized for **Zero-Latency Scanning**. Simply connect your USB or Bluetooth scanner. In the POS interface, just scan, and the item is instantly added to the cart.</p>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] leading-relaxed border border-blue-100 dark:border-blue-800">
            <strong>Pro Tip:</strong> You can also generate and print barcode labels for your own unique products directly from the Zeneva Inventory module.
        </div>
      </div>
    )
  },
  {
    question: "Setting up Low Stock & Expiry Date alerts",
    tags: ["alerts", "inventory", "stock", "expiry"],
    answer: (
        <p className="text-sm">Under each product's settings, you can define a **Minimum Stock Level**. Zeneva will proactively alert you when stock falls below this. You can also set **Expiry Date alerts** to notify you weeks before items expire.</p>
    )
  },
  {
    question: "Exporting deep-business insights to Excel/PDF",
    tags: ["export", "csv", "excel", "data", "reports"],
    answer: (
        <p className="text-sm">Every intelligence module in Zeneva has a **"High-Resolution Export"** button. You can download your Sales Journals, Inventory Valuations, and Profit/Loss statements as clean Excel files or presentation-ready PDFs.</p>
    )
  },
  {
    question: "Multi-Currency and Global Business Settings",
    tags: ["currency", "price", "settings", "global"],
    answer: (
        <p className="text-sm">Navigate to **Settings {'->'} Business Profile**. You can set your base currency (NGN, USD, GHS, KES, etc.), your tax rates (VAT/GST), and your trading hours. These settings synchronize instantly across all your terminals.</p>
    )
  },
  {
    question: "Managing High-Value Rewards & Loyalty Programs",
    tags: ["loyalty", "points", "customer", "rewards"],
    answer: (
        <p className="text-sm">Zeneva includes a powerful **CRM suite**. You can enable loyalty points and set reward thresholds. Customers can then redeem these points for discounts at checkout, driving repeat business.</p>
    )
  },
  {
    question: "How do I add staff members and manage their permissions?",
    tags: ["staff", "users", "permissions", "security"],
    answer: (
        <div className="space-y-3">
            <p className="text-sm">Go to **Settings {'->'} Staff Management**. You can invite team members via email and assign them dynamic roles:</p>
            <ul className="text-xs space-y-2 list-disc list-inside text-muted-foreground">
                <li><strong className="text-foreground">Cashier:</strong> Only POS access, no reports.</li>
                <li><strong className="text-foreground">Manager:</strong> Full operations, but no business settings.</li>
                <li><strong className="text-foreground">Auditor:</strong> Read-only access to all reports.</li>
            </ul>
        </div>
    )
  },
  {
    question: "Tracking daily business expenses vs. gross profit",
    tags: ["finance", "profit", "loss", "expenses"],
    answer: (
        <p className="text-sm text-balance">Record your utility bills, salaries, and supply costs in the 'Expenses' module. Zeneva will subtract these from your sales to show you your **True Net Profit** for the day, month, or year.</p>
    )
  },
  {
    question: "Reviewing the Secure Audit Trail & Action Logs",
    tags: ["audit", "logs", "security", "tracking"],
    answer: (
        <p className="text-sm">Every critical action in Zeneva—deleting an order, changing a stock amount, or editing a price—is recorded in the **Immutable Audit Log**. This ensures complete accountability for every button pressed on the platform.</p>
  )
  },
  {
    question: "Managing your Zeneva Subscription and Billing",
    tags: ["billing", "subscription", "pricing", "plan"],
    answer: (
        <p className="text-sm">Your subscription is managed under **Settings {'->'} Subscription**. You can upgrade to the 'Pro' or 'Enterprise' plans for advanced features like Multi-Store management and Zen AI Strategic Intelligence.</p>
    )
  },
  {
    question: "Resetting your password and enabling MFA security",
    tags: ["security", "password", "mfa", "login"],
    answer: (
        <p className="text-sm">If you've forgotten your password, use the 'Forgot Password' link on the login page. For maximum security, we recommend enabling **Two-Factor Authentication (2FA)** in your profile settings.</p>
    )
  },
  {
    question: "Generating Custom Reports and Strategic Forecasts",
    tags: ["reports", "intelligence", "zen-ai", "strategy"],
    answer: (
        <p className="text-sm">While Zeneva comes with 20+ built-in reports, you can use the **Report Builder (Powered by Zen AI)** to create custom views tailored to your specific business needs.</p>
    )
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
            const aiMessage: Message = { sender: 'ai', text: response.answer };
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
        () => firestore ? query(collection(firestore, 'supportThreads'), where('userId', '==', userProfile.id)) : null,
        [firestore, userProfile.id]
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
                <Card className="border-none shadow-premium transition-shadow group overflow-hidden">
                    <AccordionItem value="ai-chat" className="border-b-0">
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
                    </AccordionItem>
                </Card>
                
                <Card className="border-none shadow-premium transition-shadow group overflow-hidden">
                     <AccordionItem value="human-support" className="border-b-0">
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
                    </AccordionItem>
                </Card>

                <Card className="border-none shadow-premium">
                    <AccordionItem value="faq" className="border-b-0">
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
                                        <AccordionItem key={index} value={`faq-${index}`} id={item.id} className="border rounded-lg px-4 bg-muted/10 border-transparent hover:border-primary/20 transition-colors">
                                            <AccordionTrigger className="hover:no-underline font-semibold text-sm text-left">{item.question}</AccordionTrigger>
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
                    </AccordionItem>
                </Card>
            </Accordion>
        </div>
    );
}
