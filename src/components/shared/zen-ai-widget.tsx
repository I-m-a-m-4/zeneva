'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import { Bot, X, Sparkles, Loader2, User, Mic, ArrowUp, Maximize2, Minimize2, Trash2, Square, ExternalLink, Zap } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { apiBase } from '@/lib/platform';
import { Markdown } from '@/components/ai-insights/markdown';
import { ToolResult } from '@/components/ai-insights/tool-renderer';
import { validateProposal, buildSaleFromProposal } from '@/components/ai-insights/proposal-guard';
import { ZenStatus } from '@/components/ai-insights/zen-status';
import { trackFeature } from '@/lib/product-telemetry';
import { usePOS } from '@/context/pos-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { effectivePlan, aiMonthlyLimit } from '@/lib/plan';

function textOf(message: any): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.parts)) return '';
  return message.parts
    .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join(' ');
}

function runningTool(message: any): string | null {
  const parts = message?.parts ?? [];
  for (const part of parts) {
    if (isToolUIPart(part) && (part.state === 'input-streaming' || part.state === 'input-available')) {
      return getToolName(part);
    }
  }
  return null;
}

interface ZenAIWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  dictationTrigger?: number;
}

export default function ZenAIWidget({ isOpen, onClose, dictationTrigger = 0 }: ZenAIWidgetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { addToQueue, products, customers, currentUserProfile } = usePOS();

  const businessId = currentUserProfile?.businessId || (user as any)?.businessId || '';
  const [businessData, setBusinessData] = React.useState<any>(null);
  const [proposalStatuses, setProposalStatuses] = React.useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  
  const [creditsExhausted, setCreditsExhausted] = React.useState<{ plan: string; monthlyLimit: number; errorText?: string } | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(() => `session_widget_${Date.now()}`);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch business instance data
  React.useEffect(() => {
    if (!businessId || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, 'businessInstances', businessId), (docSnap) => {
      if (docSnap.exists()) {
        setBusinessData(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [businessId, firestore]);

  // Precise Credit Calculation
  const currentMonth = new Date().toISOString().slice(0, 7);
  const plan = effectivePlan(businessData);
  const monthlyLimit = aiMonthlyLimit(plan);
  const allowanceUsed = businessData?.aiUsageCurrentDate === currentMonth ? (Number(businessData?.aiUsageCount) || 0) : 0;
  const bonusCredits = Number(businessData?.aiBonusCredits) || 0;
  const allowanceLeft = Math.max(0, monthlyLimit - allowanceUsed);
  const totalCreditsLeft = allowanceLeft + bonusCredits;
  const isCreditsExhausted = totalCreditsLeft <= 0;

  // Audio dictation state
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const transport = React.useMemo(() => new DefaultChatTransport({
    api: apiBase() + '/api/chat',
    prepareSendMessagesRequest: async ({ messages, body }) => {
      const token = await getAuth().currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return { body: { ...body, messages }, headers };
    },
  }), []);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: sessionId,
    transport,
    onError: (err) => {
      console.error('Zen AI Widget Error:', err);
      let desc = err?.message || 'Something went wrong.';
      try {
        const parsed = JSON.parse(desc);
        if (parsed?.code === 'credits_exhausted') {
          setCreditsExhausted({
            plan: typeof parsed.plan === 'string' ? parsed.plan : plan,
            monthlyLimit: Number(parsed.monthlyLimit) || monthlyLimit,
            errorText: parsed.error,
          });
          return;
        }
        if (parsed?.error) desc = parsed.error;
      } catch { /* use as is */ }
      toast({ title: 'Zen AI', description: desc, variant: 'destructive' });
    }
  });

  React.useEffect(() => {
    if (status === 'streaming') setCreditsExhausted(null);
  }, [status]);

  const isLoading = status === 'submitted' || status === 'streaming';
  const [input, setInput] = React.useState('');
  const [lastUserPrompt, setLastUserPrompt] = React.useState('');

  const handleApprove = React.useCallback(async (proposalId: string, action: any) => {
    const check = validateProposal(action, { products, customers });
    if (!check.ok) {
      toast({ title: 'Not applied', description: check.reason, variant: 'destructive' });
      return;
    }

    try {
      trackFeature('ai_proposal_approved');
      if (action.action === 'STOCK_ADJUSTMENT' || action.action === 'PRICE_CHANGE' || action.action === 'THRESHOLD_CHANGE') {
        const field = action.action === 'STOCK_ADJUSTMENT' ? 'stock'
          : action.action === 'PRICE_CHANGE' ? 'price'
          : 'lowStockThreshold';

        addToQueue({
          type: 'update-product',
          payload: { productId: action.productId, values: { [field]: action.newValue } },
        }, `Zen AI: ${action.productName} ${field} → ${action.newValue}`);
      } else if (action.action === 'LOYALTY_ADJUSTMENT') {
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
      }
      setProposalStatuses(prev => ({ ...prev, [proposalId]: 'APPROVED' }));
      toast({ title: 'Proposal applied', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Could not apply proposal', description: err?.message, variant: 'destructive' });
    }
  }, [products, customers, addToQueue, currentUserProfile, businessData, businessId, user?.uid, toast]);

  const handleReject = React.useCallback((proposalId: string) => {
    setProposalStatuses(prev => ({ ...prev, [proposalId]: 'REJECTED' }));
    trackFeature('ai_proposal_rejected');
  }, []);

  const handlePick = React.useCallback((text: string) => {
    if (isCreditsExhausted) {
      setCreditsExhausted({
        plan,
        monthlyLimit,
        errorText: `You are out of AI credits. The ${plan} plan includes ${monthlyLimit.toLocaleString()} credits a month, and it is spent.`
      });
      return;
    }
    setLastUserPrompt(text);
    sendMessage({ text });
  }, [sendMessage, isCreditsExhausted, plan, monthlyLimit]);

  // Speech Recognition Setup
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev.trim() + ' ' + transcript.trim()).trim());
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); } catch {}
    }
  };

  React.useEffect(() => {
    if (isOpen && dictationTrigger > 0) {
      const timer = setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          try { recognitionRef.current.start(); } catch {}
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [dictationTrigger, isOpen, isListening]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isLoading, creditsExhausted]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Instant client-side check
    if (isCreditsExhausted) {
      setCreditsExhausted({
        plan,
        monthlyLimit,
        errorText: `You are out of AI credits. The ${plan} plan includes ${monthlyLimit.toLocaleString()} credits a month, and it is spent. It resets at the start of next month, or upgrade for a larger monthly allowance.`
      });
      return;
    }

    const prompt = input.trim();
    setLastUserPrompt(prompt);
    setInput('');
    sendMessage({ text: prompt });
  };

  const handleStop = () => {
    try { stop(); } catch {}
  };

  const handleClear = () => {
    try { stop(); } catch {}
    setMessages([]);
    setProposalStatuses({});
    setCreditsExhausted(null);
    setSessionId(`session_widget_${Date.now()}`);
  };

  return (
    <>
      <style jsx global>{`
        @keyframes orange-border-glow {
          0%, 100% {
            box-shadow: 0 0 16px rgba(234, 88, 12, 0.3), 0 0 35px rgba(234, 88, 12, 0.15), inset 0 0 4px rgba(234, 88, 12, 0.05);
            border-color: rgba(234, 88, 12, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(234, 88, 12, 0.75), 0 0 55px rgba(249, 115, 22, 0.45), inset 0 0 8px rgba(234, 88, 12, 0.2);
            border-color: rgba(249, 115, 22, 0.7);
          }
        }
        @keyframes orange-listening-glow {
          0%, 100% {
            box-shadow: 0 0 24px rgba(234, 88, 12, 0.55), 0 0 45px rgba(234, 88, 12, 0.35);
            border-color: rgba(234, 88, 12, 0.85);
          }
          50% {
            box-shadow: 0 0 40px rgba(234, 88, 12, 0.95), 0 0 70px rgba(249, 115, 22, 0.65);
            border-color: rgba(249, 115, 22, 0.95);
          }
        }
        @keyframes orange-ai-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(234, 88, 12, 0.5)); }
          50% { filter: drop-shadow(0 0 16px rgba(234, 88, 12, 0.95)) drop-shadow(0 0 25px rgba(249, 115, 22, 0.7)); }
        }
        .orange-glow-box { animation: orange-border-glow 2.5s infinite ease-in-out; }
        .orange-glow-listening { animation: orange-listening-glow 1.4s infinite ease-in-out; }
        .orange-glow-processing { animation: orange-ai-pulse 1.8s infinite ease-in-out; }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Animated Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            />

            {/* Ambient Behind-Modal Glow */}
            <div className="absolute w-[500px] h-[350px] bg-gradient-to-r from-orange-500/25 via-amber-500/15 to-orange-600/25 blur-3xl pointer-events-none rounded-full" />

            {/* Center Floating Dialog Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className={cn(
                "relative z-10 w-full transition-all duration-300 flex flex-col",
                "bg-background/95 backdrop-blur-md rounded-3xl border border-primary/40",
                "shadow-2xl flex flex-col overflow-hidden",
                isListening ? "orange-glow-listening" : isLoading ? "orange-glow-box" : "shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
                isExpanded ? "max-w-5xl h-[78vh]" : "max-w-[700px] h-[520px]"
              )}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xs">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold leading-none flex items-center gap-1.5 text-foreground">
                      Zen AI
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Copilot
                      </span>
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {totalCreditsLeft > 0 ? `${totalCreditsLeft.toLocaleString()} credits remaining` : '0 credits left'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push('/ai-insights');
                    }}
                    className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center gap-1.5 transition-colors"
                    title="Open full page"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Open in Zen AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors"
                    title={isExpanded ? "Standard view" : "Expand view"}
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>

                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted/80 flex items-center justify-center transition-colors"
                      title="Clear chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors ml-1"
                    title="Close"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 sm:p-5 overflow-y-auto">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.length === 0 && !creditsExhausted && (
                    <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 border border-primary/20 shadow-xs">
                        <Bot className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">How can I help you today?</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
                        Ask about stock levels, analyze revenue, or propose sales and inventory adjustments.
                      </p>

                      {/* Quick Chips in Widget */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                        {[
                          { title: 'Check low stock alerts', text: 'Which products are low on stock?' },
                          { title: 'Today\'s sales summary', text: 'How did we do today in sales and profit?' },
                          { title: 'Record a quick sale', text: 'Record a sale: 2 units of Zeneva, paid cash' },
                          { title: 'Audit dead inventory', text: 'Which products have zero sales this month?' },
                        ].map((suggestion, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handlePick(suggestion.text)}
                            className="text-left text-xs p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted hover:border-primary/40 transition-all group"
                          >
                            <span className="font-medium text-foreground block group-hover:text-primary transition-colors">
                              {suggestion.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                              {suggestion.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Messages */}
                  {messages.map((m) => {
                    const isUser = m.role === 'user';
                    const text = textOf(m);
                    const toolParts = (m.parts ?? []).filter(isToolUIPart);
                    const hasToolUI = toolParts.length > 0;

                    return (
                      <div key={m.id} className={cn("flex gap-2.5 items-start", isUser ? "justify-end" : "justify-start")}>
                        {!isUser && (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 mt-0.5">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser && "items-end")}>
                          {text.trim() && (
                            <div className={cn(
                              "rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed",
                              isUser
                                ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-tr-none"
                                : "bg-card text-foreground border border-border/80 rounded-tl-none shadow-xs"
                            )}>
                              {isUser ? text : <Markdown>{text}</Markdown>}
                            </div>
                          )}

                          {hasToolUI && (
                            <div className="flex flex-col gap-2 w-full mt-1">
                              {toolParts.map((part: any) => {
                                const output = part.output;
                                const isProposal = output?.type === 'PROPOSAL';
                                const enriched = isProposal
                                  ? { ...output, status: proposalStatuses[output.proposalId] || output.status }
                                  : output;

                                return (
                                  <div key={part.toolCallId} className="flex flex-col gap-1 w-full">
                                    {output && (
                                      <ToolResult
                                        output={enriched}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onPick={handlePick}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {isUser && (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground border shrink-0 mt-0.5">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Contextual Progressive Thinking Indicator */}
                  {isLoading && (
                    <div className="flex items-start gap-2.5 w-full">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 orange-glow-processing">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 rounded-tl-none shadow-xs">
                        <ZenStatus
                          activeTool={runningTool(messages[messages.length - 1])}
                          lastUserPrompt={lastUserPrompt}
                          showMark={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Credit Exhaustion Instant Upgrade Banner */}
                  {creditsExhausted && (
                    <div className="w-full rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 shadow-sm my-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-orange-600 fill-current" />
                            Out of AI Credits
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                            {creditsExhausted.errorText || `Your ${creditsExhausted.plan} plan includes ${creditsExhausted.monthlyLimit.toLocaleString()} monthly AI credits, which are spent. Upgrade for higher limits.`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push('/billing');
                          }}
                          className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-8 px-3 rounded-xl shadow-xs"
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Bottom Input Composer */}
              <div className="p-3 sm:p-4 bg-muted/20 border-t border-border/40 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                      isListening
                        ? "bg-primary text-white shadow-md animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={isListening ? "Stop listening" : "Voice dictation"}
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening to your voice..." : "Ask Zen AI anything..."}
                      disabled={isLoading}
                      className="w-full bg-background border border-border/80 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {isLoading ? (
                    <Button
                      type="button"
                      onClick={handleStop}
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shrink-0 shadow-xs"
                      title="Stop generation"
                    >
                      <Square className="h-4.5 w-4.5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!input.trim()}
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-foreground text-background hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground shrink-0 shadow-xs"
                      title="Send prompt"
                    >
                      <ArrowUp className="h-5.5 w-5.5 stroke-[2.75]" />
                    </Button>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
