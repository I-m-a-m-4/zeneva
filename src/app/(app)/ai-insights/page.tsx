'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import {
  ArrowUp, Loader2, Package, TrendingUp, DollarSign, Users, ReceiptText,
  Sparkles, ShieldAlert, SquarePen, BookOpen, Trash2, Send, Gauge,
  PanelLeft, PanelLeftClose, XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppConfig } from '@/lib/config';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ZenMark } from '@/components/ai-insights/zen-mark';
import { ZenStatus, labelForTool } from '@/components/ai-insights/zen-status';
import { Markdown } from '@/components/ai-insights/markdown';
import { ToolResult } from '@/components/ai-insights/tool-renderer';
import { validateProposal, buildSaleFromProposal } from '@/components/ai-insights/proposal-guard';
import { usePOS } from '@/context/pos-context';
import { cn } from '@/lib/utils';
import { aiDailyLimit, effectivePlan } from '@/lib/plan';

/**
 * One message in the chat transcript.
 *
 * AI SDK v5+ switched from `{role, content}` to UI messages with `parts`, and
 * `toolInvocations` became `tool-*` parts. We persist whatever the SDK hands us
 * so old and new sessions stay loadable.
 */
type ZenMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts?: any[];
  content?: string;      // pre-v5 sessions saved by older builds
  createdAt?: string;
  toolInvocations?: any[]; // pre-v5 sessions
};

/** Extract the visible text of a message for display + title generation. */
function textOf(message: ZenMessage | undefined | null): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.parts)) return '';
  return message.parts
    .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join(' ');
}

/** Normalise an old {content} session doc into the v5+ parts shape. */
function normaliseMessage(m: any): ZenMessage {
  if (!m || typeof m !== 'object') return m;
  if (Array.isArray(m.parts)) return m as ZenMessage;
  const parts = typeof m.content === 'string' && m.content.length
    ? [{ type: 'text', text: m.content }]
    : [];
  return { ...m, parts, content: undefined } as ZenMessage;
}

/** Name of the tool still running in this message, if any — drives the status line. */
function runningTool(message: any): string | null {
  const parts = message?.parts ?? [];
  for (const part of parts) {
    if (isToolUIPart(part) && (part.state === 'input-streaming' || part.state === 'input-available')) {
      return getToolName(part);
    }
  }
  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function ZenAIChat({ businessId, user, firestore }: { businessId: string, user: any, firestore: any }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToQueue, products, customers, currentUserProfile } = usePOS();
  const [proposalStatuses, setProposalStatuses] = React.useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  
  // Chat Session State
  const [sessionId, setSessionId] = React.useState<string>(() => `session_${Date.now()}`);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sessionToDelete, setSessionToDelete] = React.useState<string | null>(null);
  const [businessData, setBusinessData] = React.useState<any>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set when `messages` changes because a session was opened rather than
  // edited, so the Firestore checkpoint below skips that one pass.
  const skipNextSyncRef = useRef(false);

  // Restore the last collapse state. Defaults to open on desktop and closed on
  // phones, where a 16rem rail would eat most of the screen.
  useEffect(() => {
    setIsMounted(true);
    const saved = typeof window !== 'undefined' ? localStorage.getItem('zen_ai_sidebar') : null;
    if (saved === 'open') setSidebarOpen(true);
    else if (saved === 'closed') setSidebarOpen(false);
    else setSidebarOpen(window.innerWidth >= 768);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('zen_ai_sidebar', next ? 'open' : 'closed'); } catch { /* private mode */ }
      return next;
    });
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

  // The transport is built once; `prepareSendMessagesRequest` runs on every send.
  //
  // The server derives businessId from the ID token's uid, so sending it from
  // here would be ignored — the token is the whole authorisation story. It is
  // fetched per send rather than cached because Firebase rotates it hourly and
  // a stale one 401s mid-conversation.
  const transport = React.useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: async ({ messages, body }) => {
      const token = await getAuth().currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return { body: { ...body, messages }, headers };
    },
  }), []);

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    id: sessionId,
    transport,
    onError: (err) => {
      // The server sends {"error": "..."} for quota/auth failures; surface that
      // rather than the raw JSON blob the SDK puts in err.message.
      let description = err?.message || 'Something went wrong.';
      try {
        const parsed = JSON.parse(description);
        if (parsed?.error) description = parsed.error;
      } catch { /* not JSON - use as-is */ }
      toast({ title: 'Zen AI could not respond', description, variant: 'destructive' });
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const [localInput, setLocalInput] = React.useState('');

  const submitPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !authRef.current.businessId) return;
    sendMessage({ text: trimmed });
  }, [sendMessage]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localInput.trim() || isLoading) return;
    submitPrompt(localInput);
    setLocalInput('');
  };

  /*
   * `/ai-insights?q=...` opens the chat with that question already asked.
   *
   * The use-cases page links here with its example prompts, so a tap goes
   * straight to a real answer instead of leaving the owner to retype it. The
   * param is stripped afterwards — otherwise a refresh, or the back button,
   * re-asks the same question and burns another quota unit.
   */
  const sentPrefill = useRef(false);
  useEffect(() => {
    const q = searchParams?.get('q');
    if (!q || sentPrefill.current) return;
    sentPrefill.current = true;
    submitPrompt(q);
    router.replace('/ai-insights');
  }, [searchParams, submitPrompt, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync messages to Firestore
  useEffect(() => {
    if (!firestore || !businessId || !user || messages.length === 0) return;
    // Don't checkpoint a half-streamed reply - wait for the turn to settle.
    if (isLoading) return;
    // Loading an existing session also lands in `messages`, but it is a read,
    // not an edit. Checkpointing it would bump updatedAt and reshuffle the
    // recent-chats list mid-tap. See loadSession.
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    try {
      const cleanMessages = JSON.parse(JSON.stringify(messages));
      const firstUser = cleanMessages.find((m: any) => m.role === 'user');
      const title = (textOf(firstUser).slice(0, 40) || 'New Chat').trim();
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
  }, [messages, isLoading, sessionId, firestore, businessId, user]);

  const handleNewChat = () => {
    stop?.();
    setSessionId(`session_${Date.now()}`);
    setMessages([]);
  };

  const loadSession = (session: any) => {
    stop?.();
    setSessionId(session.id);
    // Opening a chat is not a change to it. Suppress the next checkpoint, or
    // the sync effect below fires on the new `messages` and rewrites
    // updatedAt — which reorders the list under the finger that just tapped.
    skipNextSyncRef.current = true;
    // Defer so the new sessionId is in effect before the messages land; the
    // chat then re-fetches nothing (we set from local state) but the id
    // switch means the next send belongs to the loaded session.
    setTimeout(() => {
      setMessages((session.messages || []).map(normaliseMessage));
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

  /**
   * Execute an approved proposal.
   *
   * Everything goes through `addToQueue`, never a direct `updateDoc`. The queue
   * is what enforces RBAC (`record_sales`, `manage_inventory`), injects
   * `activeBranchId`, survives being offline, and keeps the SQLite mirror in
   * step. A direct write skipped all four.
   *
   * The proposal itself is model output, so it is re-validated here against the
   * live product/customer record before anything is queued. A stale or invented
   * id, a value that moved since the model read it, or a quantity outside sane
   * bounds is refused at this point rather than trusted.
   */
  const handleApprove = useCallback(async (proposalId: string, action: any) => {
    const check = validateProposal(action, { products, customers });
    if (!check.ok) {
      toast({ title: 'Not applied', description: check.reason, variant: 'destructive' });
      return;
    }

    try {
      if (action.action === 'STOCK_ADJUSTMENT' || action.action === 'PRICE_CHANGE' || action.action === 'THRESHOLD_CHANGE') {
        const field = action.action === 'STOCK_ADJUSTMENT' ? 'stock'
          : action.action === 'PRICE_CHANGE' ? 'price'
          : 'lowStockThreshold';

        addToQueue({
          type: 'update-product',
          payload: { productId: action.productId, values: { [field]: action.newValue } },
        }, `Zen AI: ${action.productName} ${field} → ${action.newValue}`);

        // Stock movements are auditable events; the Inventory page logs them the
        // same way on a manual quick-edit.
        if (action.action === 'STOCK_ADJUSTMENT') {
          addToQueue({
            type: 'add-audit-log',
            payload: {
              businessId,
              userId: currentUserProfile?.id || user?.uid,
              userName: currentUserProfile?.name || 'Owner',
              userEmail: currentUserProfile?.email || user?.email || '',
              userRole: currentUserProfile?.role || 'owner',
              action: 'stock.adjusted',
              entityType: 'Product', entityId: action.productId,
              details: {
                entityName: action.productName,
                oldStock: check.current, newStock: action.newValue,
                adjustment: action.newValue - (check.current ?? 0),
                reason: `Zen AI proposal approved: ${action.reason ?? 'no reason given'}`,
              },
            },
          }, `Logging stock adjustment for ${action.productName}`);
        }
      } else if (action.action === 'LOYALTY_ADJUSTMENT') {
        // Note: this queue action keys off `payload.id`, not `customerId`.
        addToQueue({
          type: 'update-customer',
          payload: { id: action.customerId, values: { loyaltyPoints: action.newValue } },
        }, `Zen AI: ${action.customerName} loyalty → ${action.newValue}`);
      } else if (action.action === 'RECORD_SALE') {
        const isAdmin = currentUserProfile?.role === 'admin'
          || businessData?.ownerId === currentUserProfile?.id;
        const built = buildSaleFromProposal(action, {
          products, customers, business: businessData, businessId, userId: user?.uid, isAdmin,
        });
        if (!built.ok) {
          toast({ title: 'Sale not recorded', description: built.reason, variant: 'destructive' });
          return;
        }
        addToQueue({ type: 'complete-sale', payload: built.payload }, `Zen AI: recording sale ${built.receiptNumber}`);
      } else {
        toast({ title: 'Not applied', description: `Unrecognised action "${action.action}".`, variant: 'destructive' });
        return;
      }

      setProposalStatuses(prev => ({ ...prev, [proposalId]: 'APPROVED' }));
      toast({
        variant: 'success',
        title: 'Applied',
        description: navigator.onLine ? 'The change is syncing now.' : 'Saved locally — it will sync when you are back online.',
      });
    } catch (e: any) {
      toast({ title: 'Error', description: `Failed to apply: ${e.message}`, variant: 'destructive' });
    }
  }, [addToQueue, products, customers, businessData, businessId, user, currentUserProfile, toast]);

  const handleReject = useCallback((proposalId: string) => {
    setProposalStatuses(prev => ({ ...prev, [proposalId]: 'REJECTED' }));
  }, []);

  /**
   * A product card was tapped — either in a disambiguation picker or in a
   * result grid. Answer the model's question for the owner rather than making
   * them retype the name, and include the SKU so the next lookup is exact.
   */
  /*
   * A tap on the picker is an unambiguous answer, so send the product *id*
   * rather than the name again. Re-sending 'I mean "Semoliva"' read as another
   * ambiguous mention and the model just redrew the picker — an inescapable
   * loop. The id names one row in Firestore, so there is nothing left to
   * resolve and `getProductDetails` is the obvious next call.
   */
  const handlePick = useCallback((product: any) => {
    if (!product?.name || isLoading) return;
    const ref = product.id ? ` (product id: ${product.id})` : product.sku ? ` (SKU ${product.sku})` : '';
    submitPrompt(`I mean "${product.name}"${ref} — this is resolved, don't ask again.`);
  }, [submitPrompt, isLoading]);

  const isInitialState = messages.length === 0;

  /*
   * The welcome screen is the whole pitch. "Show me low stock items" reads like
   * a search box and undersells what this can do, so each of these is a
   * question an owner actually has, chosen to show a capability they would not
   * assume was there: margin leaks, lapsed customers, forecasting, and ringing
   * up a sale by typing it. The hint line is what makes it land at a glance.
   */
  const SUGGESTED_PROMPTS = [
    {
      icon: <DollarSign className="w-4 h-4" />,
      text: 'Which products are quietly losing me money?',
      hint: 'Margins, item by item — including anything selling below cost',
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      text: 'What will I make next month?',
      hint: 'Projects your real sales trend, and says how much to trust it',
    },
    {
      icon: <Package className="w-4 h-4" />,
      text: 'What should I reorder before the weekend?',
      hint: 'Ranked by how fast each item actually sells',
    },
    {
      icon: <Users className="w-4 h-4" />,
      text: "Who used to buy from me but stopped?",
      hint: 'Lapsed regulars worth a phone call',
    },
    {
      icon: <ReceiptText className="w-4 h-4" />,
      text: 'Record a sale: 2 bags of rice, paid cash',
      hint: 'Asks what it needs, then waits for your approval',
      desktopOnly: true,
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      text: 'Teach me how to bulk import my products',
      hint: 'Step by step, with the page you need at the end',
      desktopOnly: true,
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const plan = effectivePlan(businessData);
  const dailyLimit = aiDailyLimit(businessData);
  
  let used = 0;
  if (businessData?.aiUsageCurrentDate === todayStr) {
    used = businessData?.aiUsageCount || 0;
  }
  const bonus = businessData?.aiBonusCredits || 0;
  
  const remaining = Math.max(0, dailyLimit - used);
  const isUsingBonus = used >= dailyLimit && bonus > 0;

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground relative overflow-hidden">
      
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
      
      {/* Backdrop for the drawer on phones, where the sidebar overlays the chat. */}
      {isMounted && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      {/* ── Sidebar (Chat History) ── */}
      {/* Collapses to zero width on desktop and slides out as a drawer on
          phones. Rendered either way so the collapse animates. */}
      <div
        className={`z-30 flex flex-col bg-muted/40 border-r border-border transition-[width,transform] duration-200 ease-in-out
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-64
          ${sidebarOpen ? 'max-md:translate-x-0 md:w-64' : 'max-md:-translate-x-full md:w-0 md:border-r-0'}
          md:relative md:flex-shrink-0 overflow-hidden`}
      >
        <div className="p-4 border-b border-border flex items-center gap-2 w-64">
          <Button onClick={handleNewChat} className="flex-1 justify-start gap-2" variant="outline">
            <SquarePen className="w-4 h-4 text-orange-500" /> New Chat
          </Button>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-none"
            title="Collapse chat history"
            aria-label="Collapse chat history"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 w-64">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-2">Recent Chats</div>
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => loadSession(session)}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${sessionId === session.id ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'hover:bg-accent text-foreground/80'}`}
            >
              <span className="text-sm truncate pr-2 flex-1">{session.title || 'New Chat'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1.5 rounded-md hover:bg-background transition-all"
                title="Delete chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 italic">No previous chats.</div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-background">

      {/* ── Help Button ── */}
      {/* ── Link to Use Cases Page ── */}
      <Link
        href="/ai-insights/use-cases"
        className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur border border-border rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-all"
      >
        <BookOpen className="w-3.5 h-3.5 text-orange-500" /> Zen AI Use Cases
      </Link>

      {/* Reopen the history rail. Only mounted while collapsed, so it never
          sits on top of the sidebar's own collapse button. */}
      {isMounted && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 bg-background/80 backdrop-blur border border-border rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-all"
          title="Show chat history"
          aria-label="Show chat history"
        >
          <PanelLeft className="w-3.5 h-3.5 text-orange-500" />
          <span className="hidden sm:inline">Chats</span>
        </button>
      )}

      {/* ── Main Scrollable Area ── */}
      <div className={`flex-1 min-h-0 flex flex-col ${isInitialState ? 'justify-center items-center' : ''} overflow-y-auto z-10 scroll-smooth`}>

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
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">What would you like to know?</h1>
              <p className="text-muted-foreground text-center mb-8 text-base">I can analyze your inventory, sales, and customers — and propose changes for your approval.</p>

              {/* Suggested prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 w-full">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => submitPrompt(prompt.text)}
                      disabled={isLoading}
                      className={`text-left p-3.5 rounded-xl border border-border bg-card hover:border-orange-500/50 hover:shadow-sm transition-all flex items-start gap-3 group ${prompt.desktopOnly ? 'hidden sm:flex' : 'flex'}`}
                    >
                      <span className="text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0 mt-px">{prompt.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug">{prompt.text}</span>
                        <span className="block text-[11px] text-muted-foreground mt-1 leading-relaxed">{prompt.hint}</span>
                      </span>
                    </button>
                ))}
              </div>

              {/* Input */}
              <div className="w-full bg-card rounded-2xl border border-border shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-md transition-all">
                <form onSubmit={handleSend} className="flex flex-col">
                  <div className="flex items-center p-2">
                    <input
                      className="flex-1 bg-transparent py-3 px-3 outline-none text-foreground placeholder:text-muted-foreground text-base"
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      placeholder="Ask anything about your business..."
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-muted border-t border-border rounded-b-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                        Guarded mode — all changes require approval
                      </span>
                      {businessData && (
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 border-l border-border pl-2">
                          <Gauge className="w-3.5 h-3.5 text-orange-500" />
                          {isUsingBonus ? `${bonus} bonus credits left` : `${remaining} daily AI responses left`}
                        </span>
                      )}
                    </div>
                    <button type="submit" disabled={!localInput.trim() || isLoading || !businessId}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground transition-colors text-sm font-medium">
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
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              const text = textOf(m as any);
              const toolParts = (m.parts ?? []).filter(isToolUIPart);
              const hasToolUI = toolParts.length > 0;
              // The mark only sheens on the reply that is actively streaming.
              const streaming = isLoading && !isUser && i === messages.length - 1;

              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                  {/* Avatar — the mark itself for Zen AI */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden p-1.5 bg-card border border-border shadow-sm">
                      <ZenMark animated={streaming} />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? 'items-end max-w-[85%]' : 'items-start max-w-[85%]'}`}>
                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${isUser ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                      {isUser ? 'You' : 'Zen AI'}
                    </div>

                    {/* The prompt the owner sent — warm gray bubble, smaller type */}
                    {isUser && text.trim() && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap px-4 py-2.5 rounded-2xl rounded-br-md bg-stone-100 text-stone-800 border border-stone-200/70 shadow-sm dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700">
                        {text}
                      </div>
                    )}

                    {/* The reply. Markdown carries its own type scale. */}
                    {!isUser && text.trim() && (
                      <div className="w-full max-w-full text-foreground">
                        <Markdown>{text}</Markdown>
                        {streaming && <span className="zen-caret" aria-hidden />}
                      </div>
                    )}

                    {/* Streaming, but nothing to show yet — the gap before the
                        first token, or between two tool calls. */}
                    {streaming && !text.trim() && !hasToolUI && (
                      <ZenStatus activeTool={runningTool(m)} showMark={false} />
                    )}

                    {/* Tool calls — thought process, pickers and proposals */}
                    {hasToolUI && (
                      <div className="flex flex-col gap-3 w-full">
                        {toolParts.map((part: any) => {
                          const output = part.output;
                          const toolName = getToolName(part);
                          const isProposal = output?.type === 'PROPOSAL';
                          const enriched = isProposal
                            ? { ...output, status: proposalStatuses[output.proposalId] || output.status }
                            : output;

                          return (
                            <div key={part.toolCallId} className="flex flex-col gap-1.5">
                              {/* while a tool runs, the chip is the progress line */}
                              {part.state === 'input-streaming' && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border w-fit text-xs font-medium text-muted-foreground">
                                  <ZenStatus activeTool={toolName} showMark={false} />
                                </div>
                              )}
                              {output && (
                                <ToolResult
                                  output={enriched}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  onPick={handlePick}
                                />
                              )}
                              {(output?.error || part.state === 'output-error') && (
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-100 w-fit dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {output?.error || part.errorText}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* ── Working State ── */}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden p-1.5 bg-card border border-border shadow-sm">
                  <ZenMark animated />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0 justify-center">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zen AI</div>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-muted border border-border rounded-xl w-fit shadow-inner">
                    <ZenStatus activeTool={runningTool(messages[messages.length - 1])} showMark={false} />
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
          className="absolute bottom-0 left-0 right-0 p-4 pb-6 md:p-5 md:pb-8 bg-gradient-to-t from-background via-background/90 to-transparent z-20"
        >
          <div className="max-w-3xl mx-auto">
            <div className="w-full bg-card rounded-2xl border border-border shadow-md focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-lg transition-all">
              <form onSubmit={handleSend} className="flex items-center p-2">
                <input
                  className="flex-1 bg-transparent py-3 px-3 outline-none text-foreground placeholder:text-muted-foreground text-base"
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder="Ask Zen AI..."
                  disabled={isLoading}
                />
                <button type="submit" disabled={!localInput.trim() || isLoading || !businessId}
                  className="p-3 rounded-xl bg-foreground text-background hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground transition-colors ml-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </form>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <p className="text-xs text-muted-foreground">Zen AI may make mistakes. All changes require your explicit approval.</p>
              {businessData && (
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
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
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Loading AI Copilot...</p>
      </div>
    );
  }

  // ZenAIChat reads `?q=` via useSearchParams, which needs a Suspense boundary
  // above it or the route opts out of static rendering at build time.
  return (
    <React.Suspense fallback={
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <ZenAIChat businessId={businessId} user={user} firestore={firestore} />
    </React.Suspense>
  );
}
