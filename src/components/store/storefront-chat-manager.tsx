'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    increment,
    limitToLast,
} from 'firebase/firestore';
import type { StoreConversation, StoreChatMessage, StoreChatProductAttachment } from '@/types/store-chat';
import type { Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    MessageSquare,
    Search,
    Send,
    Package,
    CheckCircle2,
    Clock,
    User,
    Phone,
    Plus,
    X,
    Filter,
    ArrowLeft,
    Check,
    AlertCircle,
    Store
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function StorefrontChatManager() {
    const { business, currentUserProfile, products } = usePOS();
    const firestore = useFirestore();

    const currencySymbol = business?.settings?.currency || '$';
    const formatPrice = (val: number | undefined | null) =>
        `${currencySymbol}${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const [conversations, setConversations] = React.useState<StoreConversation[]>([]);
    const [loadingConversations, setLoadingConversations] = React.useState(true);
    const [selectedConvoId, setSelectedConvoId] = React.useState<string | null>(null);
    const [messages, setMessages] = React.useState<StoreChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = React.useState(false);

    const [replyText, setReplyText] = React.useState('');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState<'all' | 'unread' | 'resolved'>('all');

    // Product Picker Dialog State
    const [isProductPickerOpen, setIsProductPickerOpen] = React.useState(false);
    const [productSearch, setProductSearch] = React.useState('');
    const [selectedProductAttachment, setSelectedProductAttachment] = React.useState<StoreChatProductAttachment | null>(null);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    // 1. Listen to Conversations (Strictly limited to 30 most recent to prevent excess reads)
    React.useEffect(() => {
        if (!firestore || !business?.id) return;

        setLoadingConversations(true);
        const convosRef = collection(firestore, 'businessInstances', business.id, 'conversations');
        const q = query(convosRef, orderBy('updatedAt', 'desc'), limit(30));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StoreConversation[] = [];
            snapshot.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as StoreConversation);
            });
            setConversations(list);
            setLoadingConversations(false);
        }, (err) => {
            console.error('Error listening to customer conversations:', err);
            setLoadingConversations(false);
        });

        return () => unsubscribe();
    }, [firestore, business?.id]);

    // 2. Listen to Messages of SELECTED Conversation only (limitToLast 35 to prevent runaway reads)
    React.useEffect(() => {
        if (!firestore || !business?.id || !selectedConvoId) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        const messagesRef = collection(
            firestore,
            'businessInstances',
            business.id,
            'conversations',
            selectedConvoId,
            'messages'
        );
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(35));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StoreChatMessage[] = [];
            snapshot.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as StoreChatMessage);
            });
            setMessages(list);
            setLoadingMessages(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (err) => {
            console.error('Error listening to messages:', err);
            setLoadingMessages(false);
        });

        // Mark unread staff count as 0 for this conversation
        const convoDocRef = doc(firestore, 'businessInstances', business.id, 'conversations', selectedConvoId);
        updateDoc(convoDocRef, {
            unreadCountStaff: 0
        }).catch(() => { });

        return () => unsubscribe();
    }, [firestore, business?.id, selectedConvoId]);

    const activeConversation = React.useMemo(() => {
        return conversations.find((c) => c.id === selectedConvoId);
    }, [conversations, selectedConvoId]);

    // Filter conversations
    const filteredConversations = React.useMemo(() => {
        return conversations.filter((c) => {
            const matchesSearch =
                (c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.customerPhone || '').includes(searchTerm) ||
                (c.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filterStatus === 'unread') return (c.unreadCountStaff || 0) > 0;
            if (filterStatus === 'resolved') return c.status === 'resolved';
            return true;
        });
    }, [conversations, searchTerm, filterStatus]);

    // Send Reply
    const handleSendReply = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!replyText.trim() && !selectedProductAttachment) || !firestore || !business?.id || !selectedConvoId) return;

        const textToSend = replyText.trim();
        const attachmentToSend = selectedProductAttachment;

        setReplyText('');
        setSelectedProductAttachment(null);

        try {
            const messagesRef = collection(
                firestore,
                'businessInstances',
                business.id,
                'conversations',
                selectedConvoId,
                'messages'
            );

            const staffName = currentUserProfile?.name || 'Staff';

            await addDoc(messagesRef, {
                conversationId: selectedConvoId,
                sender: 'staff',
                senderName: staffName,
                senderId: currentUserProfile?.id || 'staff',
                text: textToSend,
                productAttachment: attachmentToSend || null,
                createdAt: serverTimestamp(),
                read: false,
            });

            // Update conversation metadata
            const convoDocRef = doc(firestore, 'businessInstances', business.id, 'conversations', selectedConvoId);
            await updateDoc(convoDocRef, {
                lastMessage: attachmentToSend ? `[Product: ${attachmentToSend.productName}] ${textToSend}` : textToSend,
                lastSender: 'staff',
                status: 'active',
                unreadCountCustomer: increment(1),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    // Toggle conversation status (active vs resolved)
    const handleToggleResolve = async () => {
        if (!firestore || !business?.id || !selectedConvoId || !activeConversation) return;
        const newStatus = activeConversation.status === 'resolved' ? 'active' : 'resolved';
        try {
            const convoDocRef = doc(firestore, 'businessInstances', business.id, 'conversations', selectedConvoId);
            await updateDoc(convoDocRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Failed to update conversation status:', error);
        }
    };

    // Filter products for the product picker
    const pickerProducts = React.useMemo(() => {
        if (!products) return [];
        if (!productSearch.trim()) return products.slice(0, 15);
        const lower = productSearch.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            (p.sku && p.sku.toLowerCase().includes(lower)) ||
            (p.category && p.category.toLowerCase().includes(lower))
        ).slice(0, 20);
    }, [products, productSearch]);

    const handleSelectProduct = (p: Product) => {
        const stockQty = p.stock ?? 0;
        setSelectedProductAttachment({
            productId: p.id,
            productName: p.name,
            price: p.price,
            stock: stockQty,
            isInStock: stockQty > 0,
            sku: p.sku || undefined,
            imageUrl: p.imageUrl || null,
        });
        setIsProductPickerOpen(false);
    };

    const totalUnreadStaff = React.useMemo(() => {
        return conversations.reduce((acc, c) => acc + (c.unreadCountStaff || 0), 0);
    }, [conversations]);

    return (
        <div className="space-y-4">
            {/* Top Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Storefront Customer Inquiries</h2>
                        <p className="text-xs text-slate-500">
                            Multi-device live chat for all 4–5 employees without WhatsApp bans or third-party fees.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {totalUnreadStaff > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                            {totalUnreadStaff} Unread {totalUnreadStaff === 1 ? 'Message' : 'Messages'}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main Chat Interface */}
            <div className="grid grid-cols-1 md:grid-cols-12 bg-white border rounded-xl overflow-hidden min-h-[580px] shadow-sm">
                {/* Left Panel: Conversation List */}
                <div className={cn(
                    "md:col-span-4 lg:col-span-4 border-r flex flex-col bg-slate-50/50",
                    selectedConvoId ? "hidden md:flex" : "flex"
                )}>
                    {/* Search & Filter Header */}
                    <div className="p-3 border-b space-y-2 bg-white">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search customer or message..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-xs bg-slate-50"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant={filterStatus === 'all' ? 'default' : 'ghost'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setFilterStatus('all')}
                            >
                                All ({conversations.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterStatus === 'unread' ? 'default' : 'ghost'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setFilterStatus('unread')}
                            >
                                Unread {totalUnreadStaff > 0 && `(${totalUnreadStaff})`}
                            </Button>
                            <Button
                                size="sm"
                                variant={filterStatus === 'resolved' ? 'default' : 'ghost'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setFilterStatus('resolved')}
                            >
                                Resolved
                            </Button>
                        </div>
                    </div>

                    {/* Conversation List Items */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {loadingConversations ? (
                            <div className="p-8 text-center text-xs text-slate-400">Loading customer threads...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                                <p className="text-xs font-medium text-slate-600">No customer chats found</p>
                                <p className="text-[11px] text-slate-400">
                                    When shoppers visit your public storefront, their inquiries will appear here in real-time.
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((c) => {
                                const isSelected = c.id === selectedConvoId;
                                const hasUnread = (c.unreadCountStaff || 0) > 0;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedConvoId(c.id)}
                                        className={cn(
                                            "w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-100/70",
                                            isSelected && "bg-orange-50/80 border-l-4 border-l-orange-500",
                                            !isSelected && hasUnread && "bg-white font-medium"
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                            {c.customerName ? c.customerName.charAt(0).toUpperCase() : 'C'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <h4 className="text-xs font-semibold text-slate-900 truncate">
                                                    {c.customerName || 'Shopper'}
                                                </h4>
                                                {c.status === 'resolved' && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-slate-500">
                                                        Resolved
                                                    </Badge>
                                                )}
                                                {hasUnread && (
                                                    <span className="h-4 min-w-4 px-1 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                        {c.unreadCountStaff}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate" dir="auto">
                                                {c.lastSender === 'staff' ? 'You: ' : ''}{c.lastMessage || 'Sent an attachment'}
                                            </p>
                                            {c.customerPhone && (
                                                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Phone className="h-2.5 w-2.5" /> {c.customerPhone}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Active Chat Thread */}
                <div className={cn(
                    "md:col-span-8 lg:col-span-8 flex flex-col bg-white",
                    !selectedConvoId ? "hidden md:flex" : "flex"
                )}>
                    {activeConversation ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-3.5 border-b flex items-center justify-between gap-2 bg-slate-50/60">
                                <div className="flex items-center gap-2.5">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 md:hidden"
                                        onClick={() => setSelectedConvoId(null)}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                                        {activeConversation.customerName ? activeConversation.customerName.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {activeConversation.customerName || 'Store Customer'}
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0 h-4",
                                                    activeConversation.status === 'resolved'
                                                        ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                                                        : "text-amber-700 border-amber-300 bg-amber-50"
                                                )}
                                            >
                                                {activeConversation.status === 'resolved' ? 'Resolved' : 'Active'}
                                            </Badge>
                                        </div>
                                        {activeConversation.customerPhone && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Phone className="h-3 w-3" /> {activeConversation.customerPhone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleToggleResolve}
                                        className="h-8 text-xs text-slate-600 gap-1.5"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {activeConversation.status === 'resolved' ? 'Reopen Chat' : 'Mark Resolved'}
                                    </Button>
                                </div>
                            </div>

                            {/* Messages Stream */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]/40">
                                {loadingMessages ? (
                                    <div className="py-12 text-center text-xs text-slate-400">Loading conversation...</div>
                                ) : messages.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400">
                                        No messages yet. Greet the customer to start!
                                    </div>
                                ) : (
                                    messages.map((m) => {
                                        const isStaff = m.sender === 'staff';
                                        return (
                                            <div
                                                key={m.id}
                                                className={cn(
                                                    "flex flex-col max-w-[80%]",
                                                    isStaff ? "ml-auto items-end" : "mr-auto items-start"
                                                )}
                                            >
                                                <div className="text-[10px] text-slate-400 mb-0.5 px-1 flex items-center gap-1">
                                                    <span>{m.senderName}</span>
                                                    {isStaff && <span className="text-orange-500 font-medium">(Store Staff)</span>}
                                                </div>

                                                <div
                                                    className={cn(
                                                        "p-3 rounded-2xl text-xs space-y-2 shadow-xs",
                                                        isStaff
                                                            ? "bg-orange-500 text-white rounded-br-none"
                                                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                                                    )}
                                                    dir="auto"
                                                >
                                                    {/* Product attachment card if present */}
                                                    {m.productAttachment && (
                                                        <div className={cn(
                                                            "p-2.5 rounded-xl border flex items-center gap-3",
                                                            isStaff ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                                        )}>
                                                            <div className="h-10 w-10 rounded-lg bg-black/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                                {m.productAttachment.imageUrl ? (
                                                                    <Image
                                                                        src={m.productAttachment.imageUrl}
                                                                        alt={m.productAttachment.productName}
                                                                        fill
                                                                        className="object-cover"
                                                                    />
                                                                ) : (
                                                                    <Package className="h-5 w-5 opacity-70" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-xs truncate">
                                                                    {m.productAttachment.productName}
                                                                </p>
                                                                <p className="text-[11px] font-bold">
                                                                    {formatPrice(m.productAttachment.price)}
                                                                </p>
                                                                <div className="mt-0.5">
                                                                    {m.productAttachment.isInStock ? (
                                                                        <span className={cn(
                                                                            "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                                            isStaff ? "bg-emerald-400/30 text-white" : "bg-emerald-100 text-emerald-800"
                                                                        )}>
                                                                            In Stock: {m.productAttachment.stock} units
                                                                        </span>
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                                            isStaff ? "bg-red-400/30 text-white" : "bg-red-100 text-red-800"
                                                                )}>
                                                                            Out of Stock
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input Box */}
                            <form onSubmit={handleSendReply} className="p-3 border-t bg-white space-y-2">
                                {/* Attached Product Chip */}
                                {selectedProductAttachment && (
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-200 text-xs">
                                        <div className="flex items-center gap-2 truncate">
                                            <Package className="h-4 w-4 text-orange-600 shrink-0" />
                                            <span className="font-medium text-slate-800 truncate">
                                                Attaching: {selectedProductAttachment.productName} ({formatPrice(selectedProductAttachment.price)} — {selectedProductAttachment.isInStock ? `${selectedProductAttachment.stock} in stock` : 'Out of stock'})
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-slate-500 hover:text-slate-900"
                                            onClick={() => setSelectedProductAttachment(null)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 text-xs gap-1.5 text-slate-600 shrink-0"
                                        onClick={() => setIsProductPickerOpen(true)}
                                    >
                                        <Package className="h-4 w-4 text-orange-600" />
                                        <span>Send Stock Info</span>
                                    </Button>

                                    <Input
                                        placeholder="Type reply to customer... (Press Enter to send)"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="text-xs h-10 flex-1"
                                        dir="auto"
                                    />

                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
                                        disabled={!replyText.trim() && !selectedProductAttachment}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <MessageSquare className="h-7 w-7" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-700">Select a Conversation</h3>
                            <p className="text-xs max-w-sm text-slate-500">
                                Choose an incoming customer chat from the list on the left to review questions, confirm product availability, or send stock cards.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Product Stock Picker Dialog */}
            <Dialog open={isProductPickerOpen} onOpenChange={setIsProductPickerOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Package className="h-4 w-4 text-orange-600" />
                            Attach Product & Live Stock Status
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Quickly tell the customer if this item is in stock, the available quantity, and the current price.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by product name, SKU, or category..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
                            {pickerProducts.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No matching products found in catalog.
                                </div>
                            ) : (
                                pickerProducts.map((p) => {
                                    const stockQty = p.stock ?? 0;
                                    const inStock = stockQty > 0;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectProduct(p)}
                                            className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                                                <p className="text-[11px] text-slate-500">{formatPrice(p.price)}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                {inStock ? (
                                                    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                        In Stock ({stockQty})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                                        Out of Stock
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
