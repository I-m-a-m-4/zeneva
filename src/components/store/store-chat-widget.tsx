'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import {
    collection,
    query,
    orderBy,
    limitToLast,
    onSnapshot,
    addDoc,
    setDoc,
    updateDoc,
    doc,
    serverTimestamp,
    increment,
    getDoc,
} from 'firebase/firestore';
import type { StoreChatMessage } from '@/types/store-chat';
import { MessageSquare, X, Send, User, Phone, Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface StoreChatWidgetProps {
    businessId: string;
    businessName: string;
    primaryColor?: string;
}

export default function StoreChatWidget({ businessId, businessName, primaryColor }: StoreChatWidgetProps) {
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = React.useState(false);

    // Customer Identity State (stored in localStorage)
    const [customerName, setCustomerName] = React.useState('');
    const [customerPhone, setCustomerPhone] = React.useState('');
    const [isIdentified, setIsIdentified] = React.useState(false);

    const [conversationId, setConversationId] = React.useState<string | null>(null);
    const [messages, setMessages] = React.useState<StoreChatMessage[]>([]);
    const [inputText, setInputText] = React.useState('');
    const [unreadCustomerCount, setUnreadCustomerCount] = React.useState(0);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    // Load customer identity and existing conversation from localStorage
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedInfo = localStorage.getItem('zeneva_store_customer_info');
        if (storedInfo) {
            try {
                const parsed = JSON.parse(storedInfo);
                if (parsed.name) {
                    setCustomerName(parsed.name);
                    setCustomerPhone(parsed.phone || '');
                    setIsIdentified(true);
                }
            } catch (_) { }
        }

        const storedConvo = localStorage.getItem(`zeneva_store_convo_${businessId}`);
        if (storedConvo) {
            setConversationId(storedConvo);
        }

        const handleOpenChatEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.conversationId) {
                setConversationId(customEvent.detail.conversationId);
            }
            if (customEvent.detail?.name) {
                setCustomerName(customEvent.detail.name);
                setIsIdentified(true);
            }
            setIsOpen(true);
            setUnreadCustomerCount(0);
        };

        window.addEventListener('zeneva_open_chat', handleOpenChatEvent);
        return () => window.removeEventListener('zeneva_open_chat', handleOpenChatEvent);
    }, [businessId]);

    // Listen to messages for this active conversation (guarded to last 25 to prevent runaway reads)
    React.useEffect(() => {
        if (!firestore || !businessId || !conversationId) return;

        const messagesRef = collection(
            firestore,
            'businessInstances',
            businessId,
            'conversations',
            conversationId,
            'messages'
        );
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(25));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StoreChatMessage[] = [];
            snapshot.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as StoreChatMessage);
            });
            setMessages(list);

            if (!isOpen) {
                // If closed, check if last message was from staff
                const last = list[list.length - 1];
                if (last && last.sender === 'staff' && !last.read) {
                    setUnreadCustomerCount((prev) => prev + 1);
                }
            }

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (err) => {
            console.error('Customer chat subscription error:', err);
        });

        // When opened, clear unread count
        if (isOpen) {
            setUnreadCustomerCount(0);
            const convoDocRef = doc(firestore, 'businessInstances', businessId, 'conversations', conversationId);
            updateDoc(convoDocRef, {
                unreadCountCustomer: 0,
            }).catch(() => { });
        }

        return () => unsubscribe();
    }, [firestore, businessId, conversationId, isOpen]);

    // Initialize or start conversation
    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !firestore || !businessId) return;

        localStorage.setItem(
            'zeneva_store_customer_info',
            JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() })
        );
        setIsIdentified(true);

        if (!conversationId) {
            try {
                const convosRef = collection(firestore, 'businessInstances', businessId, 'conversations');
                const newConvoRef = await addDoc(convosRef, {
                    businessId,
                    customerName: customerName.trim(),
                    customerPhone: customerPhone.trim() || null,
                    lastMessage: 'Conversation started',
                    lastSender: 'customer',
                    unreadCountStaff: 1,
                    unreadCountCustomer: 0,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });

                setConversationId(newConvoRef.id);
                localStorage.setItem(`zeneva_store_convo_${businessId}`, newConvoRef.id);

                // Add welcome message from system
                const messagesRef = collection(
                    firestore,
                    'businessInstances',
                    businessId,
                    'conversations',
                    newConvoRef.id,
                    'messages'
                );
                await addDoc(messagesRef, {
                    conversationId: newConvoRef.id,
                    sender: 'staff',
                    senderName: businessName,
                    text: `Hello ${customerName.trim()}! Welcome to ${businessName}. How can we assist you with our catalog today?`,
                    productAttachment: null,
                    createdAt: serverTimestamp(),
                    read: false,
                });
            } catch (err) {
                console.error('Error starting conversation:', err);
            }
        }
    };

    // Send customer message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !firestore || !businessId || !conversationId) return;

        const text = inputText.trim();
        setInputText('');

        try {
            const messagesRef = collection(
                firestore,
                'businessInstances',
                businessId,
                'conversations',
                conversationId,
                'messages'
            );

            await addDoc(messagesRef, {
                conversationId,
                sender: 'customer',
                senderName: customerName || 'Customer',
                text,
                productAttachment: null,
                createdAt: serverTimestamp(),
                read: false,
            });

            // Update conversation metadata
            const convoDocRef = doc(firestore, 'businessInstances', businessId, 'conversations', conversationId);
            await updateDoc(convoDocRef, {
                lastMessage: text,
                lastSender: 'customer',
                status: 'active',
                unreadCountStaff: increment(1),
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Chat Trigger Button */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(true);
                        setUnreadCustomerCount(0);
                    }}
                    className="relative flex items-center gap-2.5 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                    style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : undefined }}
                    aria-label="Chat with store"
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs font-semibold">Chat with Us</span>
                    {unreadCustomerCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white animate-bounce">
                            {unreadCustomerCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Floating Window */}
            {isOpen && (
                <div className="w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-100px)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div
                        className="p-3.5 bg-orange-500 text-white flex items-center justify-between shadow-xs"
                        style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : undefined }}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {businessName ? businessName.charAt(0).toUpperCase() : 'Z'}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold truncate leading-tight">{businessName}</h3>
                                <p className="text-[10px] text-white/80 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                    Live Store Assistant
                                </p>
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Body */}
                    {!isIdentified ? (
                        /* Identification Step */
                        <form onSubmit={handleStartChat} className="flex-1 p-5 flex flex-col justify-center space-y-4 bg-slate-50/60">
                            <div className="text-center space-y-1">
                                <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-2">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800">Have a Question?</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Chat directly with our store team about available sizes, stock availability, or orders.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Your Name</label>
                                    <Input
                                        placeholder="e.g. Ahmed"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="text-xs h-9"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Phone / WhatsApp (Optional)</label>
                                    <Input
                                        placeholder="e.g. +967 77..."
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="text-xs h-9"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs h-9"
                                style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : undefined }}
                            >
                                Start Live Chat
                            </Button>
                        </form>
                    ) : (
                        /* Chat Messages Stream */
                        <>
                            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50/40">
                                {messages.map((m) => {
                                    const isCustomer = m.sender === 'customer';
                                    return (
                                        <div
                                            key={m.id}
                                            className={cn(
                                                "flex flex-col max-w-[85%]",
                                                isCustomer ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <span className="text-[9px] text-slate-400 mb-0.5 px-1">
                                                {m.senderName}
                                            </span>

                                            <div
                                                className={cn(
                                                    "p-2.5 rounded-xl text-xs space-y-1.5 shadow-2xs",
                                                    isCustomer
                                                        ? "bg-orange-500 text-white rounded-br-none"
                                                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                                                )}
                                                style={isCustomer && primaryColor ? { backgroundColor: `hsl(${primaryColor})` } : undefined}
                                                dir="auto"
                                            >
                                                {/* Product Card Attachment */}
                                                {m.productAttachment && (
                                                    <div className={cn(
                                                        "p-2 rounded-lg border text-left flex items-center gap-2",
                                                        isCustomer ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                                    )}>
                                                        <div className="h-9 w-9 rounded bg-black/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                            {m.productAttachment.imageUrl ? (
                                                                <Image
                                                                    src={m.productAttachment.imageUrl}
                                                                    alt={m.productAttachment.productName}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <Package className="h-4 w-4 opacity-70" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-[11px] truncate">{m.productAttachment.productName}</p>
                                                            <p className="text-[10px] font-bold">${Number(m.productAttachment.price || 0).toLocaleString()}</p>
                                                            {m.productAttachment.isInStock ? (
                                                                <span className={cn(
                                                                    "inline-block text-[9px] font-medium px-1 rounded",
                                                                    isCustomer ? "bg-emerald-400/30 text-white" : "bg-emerald-100 text-emerald-800"
                                                                )}>
                                                                    In Stock: {m.productAttachment.stock} units
                                                                </span>
                                                            ) : (
                                                                <span className={cn(
                                                                    "inline-block text-[9px] font-medium px-1 rounded",
                                                                    isCustomer ? "bg-red-400/30 text-white" : "bg-red-100 text-red-800"
                                                                )}>
                                                                    Out of Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <form onSubmit={handleSendMessage} className="p-2 border-t bg-white flex items-center gap-1.5">
                                <Input
                                    placeholder="Type a message..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="text-xs h-9 flex-1"
                                    dir="auto"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
                                    style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : undefined }}
                                    disabled={!inputText.trim()}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
