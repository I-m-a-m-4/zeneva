'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '@ai-sdk/react';
import {
  ArrowUp, Sparkles, Loader2, User, CheckCircle2, Mic,
  Paperclip, Package, TrendingUp, Users, AlertTriangle,
  DollarSign, BarChart2, ShieldAlert, XCircle, ChevronDown, HelpCircle,
  SquarePen, BookOpen, Trash2, Zap, Send, Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppConfig } from '@/lib/config';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Card Component — Handles all write approvals
// ─────────────────────────────────────────────────────────────────────────────
function ProposalCard({ tool, onApprove, onReject }: {
  tool: any;
  onApprove: (proposalId: string, action: any) => void;
  onReject: (proposalId: string) => void;
}) {
  const result = tool.result;
  if (!result || result.type !== 'PROPOSAL') return null;

  const icons: Record<string, React.ReactNode> = {
    STOCK_ADJUSTMENT: <Package className="w-5 h-5 text-blue-500" />,
    PRICE_CHANGE: <DollarSign className="w-5 h-5 text-purple-500" />,
    LOYALTY_ADJUSTMENT: <Users className="w-5 h-5 text-emerald-500" />,
  };

  const labels: Record<string, string> = {
    STOCK_ADJUSTMENT: 'Stock Adjustment',
    PRICE_CHANGE: 'Price Change',
    LOYALTY_ADJUSTMENT: 'Loyalty Points',
  };

  const isApproved = result.status === 'APPROVED';
  const isRejected = result.status === 'REJECTED';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 p-5 rounded-xl bg-white border border-gray-200 shadow-sm w-full max-w-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        {icons[result.action] || <Sparkles className="w-5 h-5 text-gray-500" />}
        <h3 className="font-semibold text-gray-900">{labels[result.action] || 'Proposed Action'}</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Proposal</span>
      </div>

      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{result.reason}</p>

      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">
            {result.action === 'LOYALTY_ADJUSTMENT' ? 'Customer' : 'Product'}
          </span>
          <span className="font-medium text-gray-900">
            {result.productName || result.customerName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Current</span>
          <span className="font-medium text-gray-900">
            {result.action === 'PRICE_CHANGE' ? `₦${result.currentValue}` : result.currentValue}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">New Value</span>
          <span className="font-bold text-gray-900">
            {result.action === 'PRICE_CHANGE' ? `₦${result.newValue}` : result.newValue}
            {result.changePercent && (
              <span className={`ml-2 text-xs font-normal ${Number(result.changePercent) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ({result.changePercent > 0 ? '+' : ''}{result.changePercent}%)
              </span>
            )}
            {result.change !== undefined && !result.changePercent && (
              <span className={`ml-2 text-xs font-normal ${result.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ({result.change > 0 ? '+' : ''}{result.change})
              </span>
            )}
          </span>
        </div>
      </div>

      {isApproved ? (
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium py-2">
          <CheckCircle2 className="w-4 h-4" /> Action approved and applied!
        </div>
      ) : isRejected ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <XCircle className="w-4 h-4" /> Rejected
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(result.proposalId, result)}
            className="flex-1 py-2.5 bg-gray-900 text-white hover:bg-black rounded-lg font-medium transition-colors text-sm"
          >
            Approve
          </button>
          <button
            onClick={() => onReject(result.proposalId)}
            className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors text-sm"
          >
            Reject
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Status Chip — Shows live thought process
// ─────────────────────────────────────────────────────────────────────────────
function ToolStatusChip({ tool }: { tool: any }) {
  const toolLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    queryProducts: { label: 'Scanning inventory', icon: <Package className="w-3.5 h-3.5" /> },
    proposeStockAdjustment: { label: 'Preparing stock proposal', icon: <Package className="w-3.5 h-3.5" /> },
    proposePriceChange: { label: 'Preparing price proposal', icon: <DollarSign className="w-3.5 h-3.5" /> },
    getSalesMetrics: { label: 'Analyzing sales data', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    getTopSellingProducts: { label: 'Ranking top products', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    queryCustomer: { label: 'Looking up customer', icon: <Users className="w-3.5 h-3.5" /> },
    proposeLoyaltyAdjustment: { label: 'Preparing loyalty proposal', icon: <Users className="w-3.5 h-3.5" /> },
    getLowStockAlerts: { label: 'Checking stock levels', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  };

  const info = toolLabels[tool.toolName];
  const isDone = tool.state === 'result';
  const isProposal = tool.result?.type === 'PROPOSAL';

  if (!info || isProposal) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-fit transition-colors ${
      isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
    }`}>
      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      <span className="flex items-center gap-1.5">{info.icon}{isDone ? `${info.label} — done` : `${info.label}...`}</span>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function ZenAIChat({ businessId, user, firestore }: { businessId: string, user: any, firestore: any }) {
  const { toast } = useToast();
  const [proposalStatuses, setProposalStatuses] = React.useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  
  // Chat Session State
  const [sessionId, setSessionId] = React.useState<string>(() => `session_${Date.now()}`);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [sessionToDelete, setSessionToDelete] = React.useState<string | null>(null);
  const [businessData, setBusinessData] = React.useState<any>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!businessId || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, 'businessInstances', businessId), (docSnap) => {
      if (docSnap.exists()) {
        setBusinessData(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [businessId, firestore]);

  // Load Sessions
  useEffect(() => {
    if (!businessId || !firestore || !user) return;
    const q = query(
      collection(firestore, 'ai_sessions'),
      where('businessId', '==', businessId),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory to avoid needing a Firestore composite index
      loaded.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setSessions(loaded);
    });
    return () => unsubscribe();
  }, [businessId, firestore, user]);

  const authRef = useRef({ businessId, userId: user?.uid });
  useEffect(() => {
    authRef.current = { businessId, userId: user?.uid };
  }, [businessId, user]);

  const { messages, setMessages, append, sendMessage, isLoading, stop } = useChat({
    id: sessionId,
    api: `/api/chat?businessId=${businessId || ''}&userId=${user?.uid || ''}`,
    fetch: async (url, options) => {
      const fetchHeaders = new Headers(options?.headers);
      const { businessId: currentBizId, userId: currentUserId } = authRef.current;
      if (currentBizId) fetchHeaders.set('x-business-id', currentBizId);
      if (currentUserId) fetchHeaders.set('x-user-id', currentUserId);
      
      return fetch(url, {
        ...options,
        headers: fetchHeaders
      });
    }
  });
  const [localInput, setLocalInput] = React.useState('');

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localInput.trim() || !businessId) return;
    
    const userMessage = { role: 'user', content: localInput };
    
    // send handles optimistic update internally
    const send = append || sendMessage;
    if (send) {
      send(userMessage, { 
        data: { businessId, userId: user?.uid },
        options: {
          headers: {
            'x-business-id': businessId || '',
            'x-user-id': user?.uid || ''
          },
          body: { businessId, userId: user?.uid }
        }
      });
    }
    setLocalInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync messages to Firestore
  useEffect(() => {
    if (!firestore || !businessId || !user || messages.length === 0) return;
    try {
      const cleanMessages = JSON.parse(JSON.stringify(messages));
      const title = cleanMessages.find((m: any) => m.role === 'user')?.content.slice(0, 40) || 'New Chat';
      setDoc(doc(firestore, 'ai_sessions', sessionId), {
        businessId,
        userId: user.uid,
        title,
        messages: cleanMessages,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error syncing messages', e);
    }
  }, [messages, sessionId, firestore, businessId, user]);

  const handleNewChat = () => {
    stop?.();
    setSessionId(`session_${Date.now()}`);
    if (setMessages) setMessages([]);
  };

  const loadSession = (session: any) => {
    stop?.();
    setSessionId(session.id);
    setTimeout(() => {
      if (setMessages) setMessages(session.messages || []);
    }, 0);
  };

  const deleteSession = async () => {
    if (!firestore || !sessionToDelete) return;
    await deleteDoc(doc(firestore, 'ai_sessions', sessionToDelete));
    if (sessionToDelete === sessionId) {
      handleNewChat();
    }
    setSessionToDelete(null);
  };

  // ── Execute an approved proposal ──
  const handleApprove = useCallback(async (proposalId: string, action: any) => {
    if (!firestore) return;
    try {
      if (action.action === 'STOCK_ADJUSTMENT') {
        await updateDoc(doc(firestore, 'products', action.productId), {
          stock: action.newValue,
          updatedAt: serverTimestamp(),
        });
      } else if (action.action === 'PRICE_CHANGE') {
        await updateDoc(doc(firestore, 'products', action.productId), {
          price: action.newValue,
          updatedAt: serverTimestamp(),
        });
      } else if (action.action === 'LOYALTY_ADJUSTMENT') {
        await updateDoc(doc(firestore, 'customers', action.customerId), {
          loyaltyPoints: action.newValue,
          updatedAt: serverTimestamp(),
        });
      }
      setProposalStatuses(prev => ({ ...prev, [proposalId]: 'APPROVED' }));
      toast({ title: 'Action Applied', description: 'The change has been saved to the database.' });
    } catch (e: any) {
      toast({ title: 'Error', description: `Failed to apply: ${e.message}`, variant: 'destructive' });
    }
  }, [firestore, toast]);

  const handleReject = useCallback((proposalId: string) => {
    setProposalStatuses(prev => ({ ...prev, [proposalId]: 'REJECTED' }));
  }, []);

  const isInitialState = messages.length === 0;

  const SUGGESTED_PROMPTS = [
    { icon: <AlertTriangle className="w-4 h-4" />, text: 'Show me low stock items' },
    { icon: <TrendingUp className="w-4 h-4" />, text: 'Top selling products this month' },
    { icon: <BarChart2 className="w-4 h-4" />, text: 'Today\'s sales summary' },
    { icon: <Package className="w-4 h-4" />, text: 'Search inventory for Pepsi' },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const plan = businessData?.plan || 'starter';
  let dailyLimit = 20;
  if (plan === 'pro') dailyLimit = 100;
  if (plan === 'business' || businessData?.accessLevel === 'lifetime') dailyLimit = 500;
  
  let used = 0;
  if (businessData?.aiUsageCurrentDate === todayStr) {
    used = businessData?.aiUsageCount || 0;
  }
  const bonus = businessData?.aiBonusCredits || 0;
  
  const remaining = Math.max(0, dailyLimit - used);
  const isUsingBonus = used >= dailyLimit && bonus > 0;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white text-gray-900 relative overflow-hidden">
      
      {typeof window !== 'undefined' && !!sessionToDelete && createPortal(
        <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] transition-opacity animate-in fade-in-0" 
            onClick={() => setSessionToDelete(null)} 
        />,
        document.body
      )}
      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)} modal={false}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteSession}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ── Sidebar (Chat History) ── */}
      <div className={`w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col transition-all ${sidebarOpen ? 'block' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <Button onClick={handleNewChat} className="w-full justify-start gap-2 bg-white hover:bg-gray-100 hover:text-gray-900" variant="outline">
            <SquarePen className="w-4 h-4 text-orange-500" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-2">Recent Chats</div>
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => loadSession(session)}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${sessionId === session.id ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              <span className="text-sm truncate pr-2 flex-1">{session.title || 'New Chat'}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-white transition-all"
                title="Delete chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-sm text-gray-400 px-2 italic">No previous chats.</div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white">

      {/* ── Help Button ── */}
      {/* ── Link to Use Cases Page ── */}
      <Link 
        href="/ai-insights/use-cases"
        className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm transition-all"
      >
        <BookOpen className="w-3.5 h-3.5 text-orange-500" /> Zen AI Use Cases
      </Link>

      {/* ── Main Scrollable Area ── */}
      <div className={`flex-1 flex flex-col ${isInitialState ? 'justify-center items-center' : ''} overflow-y-auto z-10 scroll-smooth`}>

        {/* ── Initial Empty State ── */}
        <AnimatePresence>
          {isInitialState && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-2xl px-4 flex flex-col items-center justify-center -mt-16"
            >
              <img src={AppConfig.logoUrl} alt="Zeneva" className="h-12 w-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">What would you like to know?</h1>
              <p className="text-gray-500 text-center mb-8 text-base">I can analyze your inventory, sales, and customers — and propose changes for your approval.</p>

              {/* Suggested prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const send = append || sendMessage;
                        if (send && businessId) {
                          send({ role: 'user', content: prompt.text }, { data: { businessId, userId: user?.uid } });
                        }
                      }}
                      className="text-left p-3.5 rounded-xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm transition-all flex items-center gap-3 text-sm text-gray-700 hover:text-orange-600 group"
                    >
                    <span className="text-gray-400">{prompt.icon}</span>{prompt.text}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-md transition-all">
                <form onSubmit={handleSend} className="flex flex-col">
                  <div className="flex items-center p-2">
                    <input
                      className="flex-1 bg-transparent py-3 px-3 outline-none text-gray-900 placeholder-gray-400 text-base"
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      placeholder="Ask anything about your business..."
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                        Guarded mode — all changes require approval
                      </span>
                      {businessData && (
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5 border-l border-gray-200 pl-2">
                          <Gauge className="w-3.5 h-3.5 text-orange-500" />
                          {isUsingBonus ? `${bonus} bonus credits left` : `${remaining} daily AI responses left`}
                        </span>
                      )}
                    </div>
                    <button type="submit" disabled={!localInput.trim() || isLoading || !businessId}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 transition-colors text-sm font-medium">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat Thread ── */}
        {!isInitialState && (
          <div className="w-full max-w-3xl mx-auto py-8 px-4 space-y-8 pb-36">
            {messages.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                {/* Avatar */}
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden p-1">
                      <img src={AppConfig.logoUrl} alt="Zen AI" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col gap-1 min-w-0 max-w-[85%] items-start">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    {m.role === 'user' ? 'You' : 'Zen AI'}
                    {m.createdAt && <span className="text-xs font-normal text-gray-400">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>

                  {m.content && (
                    <div className={`text-base leading-relaxed whitespace-pre-wrap px-4 py-2.5 rounded-2xl ${m.role === 'user' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-800 bg-transparent px-0'}`}>
                      {m.content}
                    </div>
                  )}

                  {/* Tool calls — Thought Process + Proposals */}
                  <div className="flex flex-col gap-3">
                    {m.toolInvocations?.map(tool => {
                      const enrichedResult = tool.state === 'result' && tool.result?.type === 'PROPOSAL'
                        ? { ...tool.result, status: proposalStatuses[tool.result.proposalId] || tool.result.status }
                        : tool.result;

                      const enrichedTool = { ...tool, result: enrichedResult };

                      return (
                        <div key={tool.toolCallId}>
                          <ToolStatusChip tool={tool} />
                          {tool.state === 'result' && tool.result?.type === 'PROPOSAL' && (
                            <ProposalCard
                              tool={enrichedTool}
                              onApprove={handleApprove}
                              onReject={handleReject}
                            />
                          )}
                          {/* Error from tool */}
                          {tool.state === 'result' && tool.result?.error && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-100 w-fit">
                              <XCircle className="w-3.5 h-3.5" /> {tool.result.error}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
            {/* ── Reasoning / Thinking State ── */}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden p-1">
                    <img src={AppConfig.logoUrl} alt="Zen AI" className="w-full h-full object-contain animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 flex-1 min-w-0 justify-center">
                  <div className="text-sm font-semibold text-gray-600">Zen AI</div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl w-fit shadow-inner">
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-sm font-medium text-gray-600">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Floating Bottom Input (chat mode) ── */}
      {!isInitialState && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-0 left-0 right-0 p-4 pb-6 md:p-5 md:pb-8 bg-gradient-to-t from-white via-white/90 to-transparent z-20"
        >
          <div className="max-w-3xl mx-auto">
            <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-md focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-lg transition-all">
              <form onSubmit={handleSend} className="flex items-center p-2">
                <input
                  className="flex-1 bg-transparent py-3 px-3 outline-none text-gray-900 placeholder-gray-400 text-base"
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder="Ask Zen AI..."
                  disabled={isLoading}
                />
                <button type="submit" disabled={!localInput.trim() || isLoading || !businessId}
                  className="p-3 rounded-xl bg-gray-900 text-white hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 transition-colors ml-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </form>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <p className="text-xs text-gray-400">Zen AI may make mistakes. All changes require your explicit approval.</p>
              {businessData && (
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-orange-500" />
                  {isUsingBonus ? `${bonus} bonus credits left` : `${remaining} daily AI responses left`}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Wrapper
// ─────────────────────────────────────────────────────────────────────────────
export default function ZenAIPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [businessId, setBusinessId] = React.useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    getDoc(doc(firestore, `users/${user.uid}`))
      .then(snap => {
        if (snap.exists()) setBusinessId(snap.data().businessId ?? null);
      });
  }, [user, firestore]);

  if (!businessId || !user) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading AI Copilot...</p>
      </div>
    );
  }

  return <ZenAIChat businessId={businessId} user={user} firestore={firestore} />;
}
