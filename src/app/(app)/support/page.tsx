
'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Bot, HelpCircle, Expand } from 'lucide-react';
import { zenevaSupportChat } from '@/ai/flows/support-chat-flow';
import AIChat from '@/components/support/ai-chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const faqItems = [
  {
    question: "How do I add a new product to my inventory?",
    answer: "Navigate to the 'Inventory' page from the sidebar. Click the 'Add Product' button, fill in the details like name, price, and stock, and then click 'Save Product'."
  },
  {
    question: "Can I import products in bulk?",
    answer: "Yes! On the 'Inventory' page, click the 'Import' button. You can upload a CSV file with your product data. Make sure your file has at least 'Name' and 'Price' columns."
  },
  {
    question: "How do I process a sale using the POS?",
    answer: "Go to the 'POS' page. Select the products the customer wants to buy, proceed to the 'Customer' step (optional), then to 'Payment'. Once you complete the sale, inventory will be updated automatically."
  },
  {
    question: "How do I void or cancel a sale that was already made?",
    answer: "You can void a completed sale from the 'Receipts' page. Find the receipt you want to void, click the three-dots menu on the right, and select 'Void Sale'. This action is permanent and will restore the stock for the items sold. This option is only available for Admins and Managers."
  },
  {
    question: "What's the difference between Admin, Manager, and Vendor Operator roles?",
    answer: "Admins have full access to everything, including settings, billing, and user management. Managers can manage products, sales, and customers, but cannot change core settings or manage other users. Vendor Operators have the most limited access, primarily focused on using the Point of Sale (POS) system."
  },
  {
    question: "How does the referral system work?",
    answer: "You can find your unique referral code and link on the 'Settings' page. When a new user signs up using your code or link, your business trial period is extended by 10 days. You'll receive a notification confirming the reward."
  }
];

type Message = {
    sender: 'user' | 'ai';
    text: string;
};

export default function SupportPage() {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isChatExpanded, setIsChatExpanded] = React.useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await zenevaSupportChat({ query: input });
            const aiMessage: Message = { sender: 'ai', text: aiResponse.answer };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: Message = { sender: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <PageTitle title="Help & Support" subtitle="Find answers to your questions and get assistance." />
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><HelpCircle />Frequently Asked Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {faqItems.map((item, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger>{item.question}</AccordionTrigger>
                                        <AccordionContent>{item.answer}</AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                     <Card className="flex flex-col h-[60vh] lg:h-auto lg:max-h-[70vh]">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2"><Bot />Zeneva AI Assistant</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsChatExpanded(true)}>
                                    <Expand className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>Ask me anything about the app!</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                             <AIChat
                                messages={messages}
                                input={input}
                                onInputChange={setInput}
                                onSendMessage={handleSendMessage}
                                isLoading={isLoading}
                                className="h-full"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isChatExpanded} onOpenChange={setIsChatExpanded}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Bot />Zeneva AI Assistant</DialogTitle>
                        <DialogDescription>Ask me anything about the app!</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <AIChat
                            messages={messages}
                            input={input}
                            onInputChange={setInput}
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading}
                            className="h-full"
                            isExpanded={true}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
