'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import {
  ArrowUp, Loader2, Clock, TrendingUp, DollarSign, Users, ReceiptText,
  SquarePen, BookOpen, Trash2, Send, Gauge, X, Zap, Search,
  PanelLeft, PanelLeftClose, XCircle, Mic, SlidersHorizontal,
  Laptop, ArrowUpRight, RotateCw, Sparkles, Layers, Box, FileText, ChevronRight, ChevronLeft, ChevronDown,
  Camera, Image as ImageIcon, Maximize2, Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RestockSheetProposal } from '@/components/ai-insights/restock-sheet-proposal';
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
import { trackFeature } from '@/lib/product-telemetry';
import { usePOS } from '@/context/pos-context';
import { cn } from '@/lib/utils';
import { aiMonthlyLimit, effectivePlan, aiImageDailyLimit } from '@/lib/plan';
import { apiBase } from '@/lib/platform';

type ZenMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts?: any[];
  content?: string;
  createdAt?: string;
  toolInvocations?: any[];
};

function textOf(message: ZenMessage | undefined | null): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.parts)) return '';
  return message.parts
    .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join(' ');
}

function normaliseMessage(m: any): ZenMessage {
  if (!m || typeof m !== 'object') return m;
  if (Array.isArray(m.parts)) return m as ZenMessage;
  const parts = typeof m.content === 'string' && m.content.length
    ? [{ type: 'text', text: m.content }]
    : [];
  return { ...m, parts, content: undefined } as ZenMessage;
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

function formatThinkingTime(seconds: number): string {
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds - mins * 60)}s`;
}

const UPGRADE_HREF = '/billing';

const SUGGESTION_POOLS = [
  [
    {
      title: "Scan stock sheet or photo",
      desc: "Tap the camera to upload delivery notes, receipts, or handwritten sheets.",
      prompt: "How do I scan a handwritten stock sheet or delivery invoice with camera?"
    },
    {
      title: "Fetch product images",
      desc: "Automatically find and assign pictures for your inventory items.",
      prompt: "Fetch images for all my products that don't have one"
    },
    {
      title: "Bulk restock & price updates",
      desc: "Quickly add stock or update cost prices just by typing them.",
      prompt: "Restock: Pepsi 50cl +20 units, Coke set stock to 50"
    }
  ],
  [
    {
      title: "Identify lapsed regular buyers",
      desc: "Find customers who used to buy regularly but haven't visited in 30 days.",
      prompt: "Who are my top customers that haven't purchased anything recently?"
    },
    {
      title: "Best-selling items by profit",
      desc: "Rank products by net contribution rather than gross volume.",
      prompt: "Show me my top 5 most profitable products this quarter"
    },
    {
      title: "Audit pending credit debts",
      desc: "Summarize total unpaid customer balances and overdue waybills.",
      prompt: "What is my total outstanding customer debt and who owes the most?"
    }
  ]
];

const QUICK_CHIPS = [
  { label: "Sales Report", icon: TrendingUp, prompt: "Give me a breakdown of this week's sales compared to last week." },
  { label: "Stock Audit", icon: Box, prompt: "Which products are currently low in stock or nearing their depletion threshold?" },
  { label: "Profit & Loss", icon: DollarSign, prompt: "Generate an estimated P&L summary for this month with gross margin." },
  { label: "VIP Customers", icon: Users, prompt: "Show my top customer segment and loyalty points distribution." },
  { label: "Price Sweep", icon: Layers, prompt: "Check for any products that have missing cost prices or zero margin." }
];

const CAROUSEL_SLIDES = [
  {
    title: "Zeneva for Windows & macOS",
    desc: "Manage sales and inventory completely offline and sync seamlessly with your desktop.",
    badge: "Native App",
    icon: Laptop
  },
  {
    title: "Instant AI Sales Proposals",
    desc: "Type or speak natural instructions to record sales, adjust stock, and issue receipts.",
    badge: "Copilot",
    icon: Sparkles
  },
  {
    title: "Automated Debt & Credit Tracking",
    desc: "Track unpaid customer balances and follow up with automated reminder alerts.",
    badge: "Finances",
    icon: ReceiptText
  },
  {
    title: "Depletion & Restock Intelligence",
    desc: "Prevent unexpected stockouts with smart velocity forecasts and reorder alerts.",
    badge: "Inventory",
    icon: Box
  }
];

function ZenAIChat({ businessId, user, firestore }: { businessId: string; user: any; firestore: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { addToQueue, products, customers, currentUserProfile } = usePOS();

  const [sessionId, setSessionId] = useState<string>(() => {
    return searchParams.get('session') || `session_${Date.now()}`;
  });

  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [creditsExhausted, setCreditsExhausted] = useState<{ plan: string; monthlyLimit: number; errorText?: string } | null>(null);

  // Plan & Credits info
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const plan = effectivePlan(businessData);
  const monthlyLimit = aiMonthlyLimit(businessData);
  const allowanceUsed = businessData?.aiUsageCurrentDate === currentMonth ? (Number(businessData?.aiUsageCount) || 0) : 0;
  const bonusCredits = Number(businessData?.aiBonusCredits) || 0;
  const allowanceLeft = Math.max(0, monthlyLimit - allowanceUsed);
  const totalCreditsLeft = allowanceLeft + bonusCredits;
  const isCreditsExhausted = totalCreditsLeft <= 0;

  // Zen Vision Daily Image Upload Allowance (Starter: 5/day, Pro: 10/day, Business: 15/day)
  const imageDailyLimit = aiImageDailyLimit(businessData);
  const imagesUsedToday = businessData?.aiImageUsageDate === todayDateStr
    ? (Number(businessData?.aiImageUsageCount) || 0)
    : 0;
  const imagesLeftToday = Math.max(0, imageDailyLimit - imagesUsedToday);
  const isImageQuotaExhausted = imagesLeftToday <= 0;

  // Sync URL session param when browser navigation occurs
  const urlSession = searchParams.get('session');
  useEffect(() => {
    if (urlSession && urlSession !== sessionId) {
      setSessionId(urlSession);
    }
  }, [urlSession, sessionId]);

  // Current session & its messages
  const currentSession = React.useMemo(() => {
    return sessions.find((s) => s.id === sessionId);
  }, [sessions, sessionId]);

  const currentSessionMessages = React.useMemo(() => {
    return (currentSession?.messages || []).map(normaliseMessage);
  }, [currentSession]);

  // Filtered sessions by title and conversation message content
  const filteredSessions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const title = (session.title || '').toLowerCase();
      if (title.includes(q)) return true;
      if (Array.isArray(session.messages)) {
        return session.messages.some((m: any) => textOf(m).toLowerCase().includes(q));
      }
      return false;
    });
  }, [sessions, searchQuery]);

  // Manus UI States
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('zen_ai_suggestions_seen');
    if (!hasVisited) {
      setShowSuggestions(true);
      localStorage.setItem('zen_ai_suggestions_seen', 'true');
    } else {
      setShowSuggestions(Math.random() > 0.9);
    }
  }, []);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const recognitionRef = useRef<any>(null);

  const [proposalStatuses, setProposalStatuses] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const skipNextSyncRef = useRef(false);
  const lastLoadedSessionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto rotate carousel every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Speech Recognition Setup
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Transcription failed');
          const data = await res.json();
          if (data.text) {
            setLocalInput((prev) => (prev.trim() + ' ' + data.text.trim()).trim());
          }
        } catch (error) {
          console.error('Transcription error:', error);
          toast({ title: 'Transcription failed', description: 'Could not process audio.', variant: 'destructive' });
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({ title: 'Microphone access denied', description: 'Please allow microphone access to use voice dictation.', variant: 'destructive' });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<{
    id: string;
    file: File;
    previewUrl: string;
    name: string;
    size: number;
  }[]>([]);

  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    e.target.value = '';

    const availableSlots = Math.max(0, imagesLeftToday - pendingImages.length);
    if (availableSlots <= 0) {
      toast({
        title: 'Daily image limit reached',
        description: `You have reached your daily limit of ${imageDailyLimit} images on ${plan}. ${
          plan === 'business'
            ? 'Your allowance resets tomorrow.'
            : 'Upgrade to Business for 15 image scans per day.'
        }`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: File[] = [];
    for (const file of rawFiles) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file format',
          description: `${file.name} is not an image file (PNG, JPG, JPEG, WEBP).`,
          variant: 'destructive',
        });
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: 'Image too large',
          description: `${file.name} exceeds 15MB.`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (validFiles.length > availableSlots) {
      toast({
        title: 'Daily allowance limit',
        description: `Only ${availableSlots} more image${
          availableSlots === 1 ? '' : 's'
        } can be uploaded today (${imageDailyLimit}/day limit). Adding first ${availableSlots}.`,
      });
    }

    const filesToRead = validFiles.slice(0, availableSlots);

    Promise.all(
      filesToRead.map(
        (file) =>
          new Promise<{ id: string; file: File; previewUrl: string; name: string; size: number }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                file,
                previewUrl: reader.result as string,
                name: file.name,
                size: file.size,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((newImages) => {
        setPendingImages((prev) => [...prev, ...newImages]);
        toast({
          title: newImages.length > 1 ? `${newImages.length} images attached` : 'Image attached',
          description: 'Type a prompt or tap Send to analyze with Zen Vision.',
        });
      })
      .catch((err) => {
        console.error('Failed to read images:', err);
        toast({
          title: 'Failed to read image',
          description: 'Could not load one or more selected images. Please try again.',
          variant: 'destructive',
        });
      });
  };

  const submitImagePrompt = async (
    promptText: string,
    attachments: { id: string; file: File; previewUrl: string; name: string; size: number }[]
  ) => {
    if (!authRef.current.businessId) {
      toast({
        title: 'No store selected',
        description: 'Please wait for your store session to load.',
        variant: 'destructive',
      });
      return;
    }

    if (attachments.length === 0) return;

    setIsAnalyzingImage(true);
    toast({
      title: 'Zen Vision is analyzing...',
      description: `Scanning ${attachments.length > 1 ? `${attachments.length} images` : 'image'} and cross-referencing with your store catalog.`,
    });

    const userMsgId = `user-img-${Date.now()}`;
    const assistantMsgId = `zen-sheet-${Date.now()}`;
    const previewUrls = attachments.map((a) => a.previewUrl);

    // Append user message with text prompt and thumbnail gallery
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: promptText,
        imageUrl: previewUrls[0],
        imageUrls: previewUrls,
        parts: [{ type: 'text', text: promptText }],
      } as any,
    ]);

    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/ai/analyze-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          images: previewUrls,
          businessId: authRef.current.businessId,
          prompt: promptText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze images with Zen Vision');
      }

      const data = await res.json();
      const items = data.items || [];

      if (items.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content:
              data.message ||
              "I scanned the images, but couldn't detect any clear product items or handwritten stock lines. Please make sure the lighting is bright and the text is legible, or try taking closer photos.",
            parts: [
              {
                type: 'text',
                text:
                  data.message ||
                  "I scanned the images, but couldn't detect any clear product items or handwritten stock lines. Please make sure the lighting is bright and the text is legible, or try taking closer photos.",
              },
            ],
          } as any,
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: `I've analyzed your ${attachments.length > 1 ? `${attachments.length} images` : 'image'} with Zen Vision and identified ${items.length} items. Here is your restock review deck cross-referenced against your live inventory. You can verify matched items, adjust quantities, and tap "Approve & Update" to apply the changes.`,
          parts: [
            {
              type: 'text',
              text: `I've analyzed your ${attachments.length > 1 ? `${attachments.length} images` : 'image'} with Zen Vision and identified ${items.length} items. Here is your restock review deck cross-referenced against your live inventory. You can verify matched items, adjust quantities, and tap "Approve & Update" to apply the changes.`,
            },
            {
              type: 'restock-sheet',
              id: `${assistantMsgId}-restock-sheet`,
              toolCallId: `${assistantMsgId}-restock-sheet`,
              output: {
                type: 'RESTOCK_SHEET',
                sheetTitle: data.sheetTitle || 'Inventory Restock Count',
                items,
                imageUrl: previewUrls[0],
                imageUrls: previewUrls,
                status: 'pending',
              },
            },
          ],
        } as any,
      ]);

      const remMsg = data.dailyLimitInfo ? ` (${data.dailyLimitInfo.remainingToday} uploads left today)` : '';
      toast({
        title: 'Images Analyzed',
        description: `Zen Vision identified ${items.length} items across ${attachments.length} image${attachments.length > 1 ? 's' : ''}${remMsg}.`,
        variant: 'success',
      });
    } catch (err: any) {
      console.error('Error analyzing image with Zen Vision:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: `⚠️ **Zen Vision Error**: ${err.message || 'Could not process the images.'}\n\nPlease check your daily upload limit and try again.`,
          parts: [
            {
              type: 'text',
              text: `⚠️ **Zen Vision Error**: ${err.message || 'Could not process the images.'}\n\nPlease check your daily upload limit and try again.`,
            },
          ],
        } as any,
      ]);
      toast({
        title: 'Analysis Failed',
        description: err.message || 'Could not analyze images with Zen Vision.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Business Data
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

  const transport = React.useMemo(() => new DefaultChatTransport({
    api: apiBase() + '/api/chat',
    prepareSendMessagesRequest: async ({ messages, body }) => {
      const token = await getAuth().currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return { body: { ...body, messages }, headers };
    },
  }), []);


  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat({
    id: sessionId,
    messages: currentSessionMessages,
    transport,
    onError: (err) => {
      console.error('Zen AI error:', err);
      let description = err?.message || 'Please try again in a moment.';
      let parsed: any = null;
      try {
        parsed = JSON.parse(description);
        if (typeof parsed?.error === 'string') description = parsed.error;
      } catch { /* use raw */ }

      if (parsed?.code === 'credits_exhausted') {
        setCreditsExhausted({
          plan: typeof parsed.plan === 'string' ? parsed.plan : plan,
          monthlyLimit: Number(parsed.monthlyLimit) || monthlyLimit,
          errorText: parsed.error,
        });
        return;
      }

      toast({ title: 'Zen AI could not respond', description, variant: 'destructive' });
    },
  });

  // Ensure messages populate when switching sessions or when Firestore sessions are loaded
  useEffect(() => {
    if (!sessionId) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (session && lastLoadedSessionIdRef.current !== sessionId) {
      lastLoadedSessionIdRef.current = sessionId;
      skipNextSyncRef.current = true;
      const loadedMsgs = (session.messages || []).map(normaliseMessage);
      setMessages(loadedMsgs);
    }
  }, [sessionId, sessions, setMessages]);

  useEffect(() => {
    if (status === 'streaming') setCreditsExhausted(null);
  }, [status]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Sync messages to Firestore
  useEffect(() => {
    if (!firestore || !businessId || !user || messages.length === 0) return;
    if (isLoading) return;
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
  const [localInput, setLocalInput] = useState('');
  const [durations, setDurations] = useState<Record<string, number>>({});
  const turnStartRef = useRef<number | null>(null);

  const submitPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !authRef.current.businessId) return;

    // Instant client-side check
    if (isCreditsExhausted) {
      setCreditsExhausted({
        plan,
        monthlyLimit,
        errorText: `You are out of AI credits. The ${plan} plan includes ${monthlyLimit.toLocaleString()} credits a month, and it is spent. It resets at the start of next month, or upgrade for a larger monthly allowance.`
      });
      return;
    }

    setLastUserPrompt(trimmed);
    turnStartRef.current = Date.now();
    sendMessage({ text: trimmed });
    setLocalInput('');
  }, [sendMessage, isCreditsExhausted, plan, monthlyLimit]);

  // Handle incoming ?q=... from use cases or external links
  const queryParam = searchParams.get('q');
  const handledQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (queryParam && handledQueryRef.current !== queryParam && isMounted) {
      handledQueryRef.current = queryParam;
      submitPrompt(queryParam);
    }
  }, [queryParam, submitPrompt, isMounted]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingImages.length > 0) {
      const promptToSend =
        localInput.trim() ||
        (pendingImages.length > 1
          ? `Analyze these ${pendingImages.length} images and compile inventory restock counts for identified items`
          : 'Analyze this image and update inventory restock count if items are found');
      const imagesToSubmit = [...pendingImages];
      setPendingImages([]);
      setLocalInput('');
      submitImagePrompt(promptToSend, imagesToSubmit);
      return;
    }
    if (!localInput.trim() || isLoading) return;
    submitPrompt(localInput);
  };

  const handleApprove = useCallback(async (proposalId: string, action: any) => {
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
      } else if (action.action === 'COST_PRICES' || action.action === 'COST_ESTIMATE') {
        const writes = check.writes ?? [];
        if (writes.length === 0) {
          toast({ title: 'Not applied', description: 'Nothing was left to change.', variant: 'destructive' });
          return;
        }

        let queued = 0;
        for (const write of writes) {
          const id = write.productIds
            ? addToQueue(
                { type: 'bulk-update-products', payload: { productIds: write.productIds, values: write.values } },
                `Zen AI: ${write.label}`,
              )
            : addToQueue(
                { type: 'update-product', payload: { productId: write.productId, values: write.values } },
                `Zen AI: ${write.label}`,
              );
          if (id) queued++;
        }

        if (queued === 0) {
          toast({
            title: 'Not applied',
            description: 'Those changes could not be queued — you may not have permission to change inventory.',
            variant: 'destructive',
          });
          return;
        }

        const affected = check.count ?? writes.length;
        toast({
          variant: 'success',
          title: action.action === 'COST_ESTIMATE' ? 'Cost prices estimated' : 'Cost prices set',
          description:
            action.action === 'COST_ESTIMATE'
              ? `${affected.toLocaleString()} products estimated. They stay marked as estimates until a waybill replaces them.`
              : `${affected.toLocaleString()} cost price${affected === 1 ? '' : 's'} updated.`,
        });
      }
      setProposalStatuses(prev => ({ ...prev, [proposalId]: 'APPROVED' }));
      toast({ variant: 'success', title: 'Proposal applied' });
    } catch (err: any) {
      toast({ title: 'Could not apply', description: err?.message, variant: 'destructive' });
    }
  }, [products, customers, addToQueue, currentUserProfile, businessData, businessId, user?.uid, toast]);

  const handleReject = useCallback((proposalId: string) => {
    setProposalStatuses(prev => ({ ...prev, [proposalId]: 'REJECTED' }));
    trackFeature('ai_proposal_rejected');
  }, []);

  const handlePick = useCallback((val: any) => {
    if (typeof val === 'string') {
      submitPrompt(val);
    } else {
      if (val.isPicker) {
        submitPrompt(`I mean "${val.name}" (product id: ${val.id})`);
      } else {
        setLocalInput(`Show stock level and cost price for ${val.name}`);
        setTimeout(() => {
          document.getElementById('zen-ai-input')?.focus();
        }, 50);
      }
    }
  }, [submitPrompt]);

  const handleNewChat = () => {
    try { stop(); } catch {}
    const newId = `session_${Date.now()}`;
    lastLoadedSessionIdRef.current = newId;
    setSessionId(newId);
    setMessages([]);
    setCreditsExhausted(null);
    setSidebarOpen(false);
    router.push('/ai-insights', { scroll: false });
  };

  const loadSession = (session: any) => {
    try { stop(); } catch {}
    setSidebarOpen(false);
    lastLoadedSessionIdRef.current = session.id;
    skipNextSyncRef.current = true;
    setSessionId(session.id);
    const loadedMsgs = (session.messages || []).map(normaliseMessage);
    setMessages(loadedMsgs);
    setCreditsExhausted(null);
    router.push(`/ai-insights?session=${session.id}`, { scroll: false });
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'ai_sessions', sessionToDelete));
      if (sessionId === sessionToDelete) {
        handleNewChat();
      }
      toast({ title: 'Chat deleted' });
    } catch (err) {
      toast({ title: 'Failed to delete chat', variant: 'destructive' });
    }
    setSessionToDelete(null);
  };

  const isInitialState = messages.length === 0;

  const creditWall = creditsExhausted && (
    <div className="w-full rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 shadow-sm mb-4 relative">
      <button 
        onClick={() => setCreditsExhausted(null)} 
        className="absolute top-2 right-2 p-1 rounded-full text-orange-600/60 hover:text-orange-600 hover:bg-orange-500/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mr-6">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-orange-600 fill-current" />
            You are out of AI credits
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {creditsExhausted.errorText || (creditsExhausted.monthlyLimit > 0
              ? `Your ${creditsExhausted.plan || 'current'} plan includes ${creditsExhausted.monthlyLimit.toLocaleString()} credits a month, and it is spent. Upgrade for higher limits.`
              : 'Your monthly allowance is spent. Upgrade to Pro for higher limits.')}
          </p>
        </div>
        <Link
          href={UPGRADE_HREF}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
        >
          <Zap className="h-3.5 w-3.5 fill-current" /> Upgrade plan
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground relative overflow-hidden">
      {/* Delete Chat Confirmation Dialog */}
      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat?</DialogTitle>
            <DialogDescription>This will permanently remove this conversation from your history.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteSession}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobile Backdrop Overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-background/60 backdrop-blur-xs z-20 md:hidden"
        />
      )}

      {/* ── Sidebar Rail ── */}
      <div
        className={`bg-orange-50/50 dark:bg-orange-950/10 border-r border-border flex flex-col transition-all duration-300 z-30
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-64 max-md:shadow-2xl
          ${sidebarOpen ? 'max-md:translate-x-0 md:w-64' : 'max-md:-translate-x-full md:w-0 md:border-r-0'}
          md:relative md:flex-shrink-0 overflow-hidden`}
      >
        <div className="p-3 border-b border-border/70 flex flex-col gap-2 w-64">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleNewChat}
              className="flex-1 justify-start gap-2 border-dashed hover:text-foreground h-9 text-xs font-medium"
              variant="outline"
            >
              <SquarePen className="w-4 h-4 text-orange-500 shrink-0" />
              <span>New Chat</span>
            </Button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Collapse rail"
              aria-label="Collapse rail"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-background/80 dark:bg-background/40 border border-border/80 rounded-lg placeholder:text-muted-foreground/70 text-foreground focus:outline-hidden focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 w-64">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {searchQuery.trim() ? 'Search Results' : 'Recent Chats'}
            </div>
            {sessions.length > 0 && (
              <span className="text-[10px] text-muted-foreground/80 font-medium">
                {searchQuery.trim() ? `${filteredSessions.length} of ${sessions.length}` : sessions.length}
              </span>
            )}
          </div>

          {filteredSessions.map(session => (
            <div
              key={session.id}
              onClick={() => loadSession(session)}
              className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                sessionId === session.id
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-medium shadow-2xs'
                  : 'hover:bg-muted text-foreground/80 hover:text-foreground'
              }`}
            >
              <span className="text-xs truncate flex-1">{session.title || 'New Chat'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {filteredSessions.length === 0 && searchQuery.trim() !== '' && (
            <div className="text-center py-6 px-2 space-y-2">
              <p className="text-xs text-muted-foreground">No chats found for &ldquo;{searchQuery}&rdquo;</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-7 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-500/10"
              >
                Clear search
              </Button>
            </div>
          )}

          {sessions.length === 0 && searchQuery.trim() === '' && (
            <div className="text-xs text-muted-foreground px-2 py-4 italic text-center">
              No previous chats.
            </div>
          )}
        </div>
      </div>

      {/* ── Main Workspace Area ── */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-background">
        {/* Hidden persistent file input for Zen Vision image attachments */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Top Header Actions */}
        <Link
          href="/ai-insights/use-cases"
          prefetch={false}
          className="absolute top-4 right-4 z-[15] flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur border border-border rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted shadow-xs transition-all"
        >
          <BookOpen className="w-3.5 h-3.5 text-orange-500" /> Use Cases
        </Link>

        {isMounted && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-[15] flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur border border-border rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted shadow-xs transition-all"
          >
            <PanelLeft className="w-3.5 h-3.5 text-orange-500" />
            <span>Chats</span>
          </button>
        )}

        {/* ── Main Scrollable Area ── */}
        <div className={`flex-1 min-h-0 flex flex-col ${isInitialState ? 'items-center' : ''} overflow-y-auto z-10`}>

          {/* ── Initial Empty State (Manus AI Redesign) ── */}
          <AnimatePresence>
            {isInitialState && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 flex flex-col items-center min-h-full py-8"
              >
                {/* Spacer to push content down so it centers perfectly */}
                <div className="flex-1 w-full" />
                
                <div className="w-full flex flex-col items-center">
                  {/* ── MOBILE: just the headline, input is in the floating bar below ── */}
                  {/* Headline — always visible */}
                  <h1 className="text-[32px] sm:text-4xl lg:text-[44px] font-serif text-foreground font-normal tracking-tight text-center mb-8 sm:mb-10">
                    What can I do for you?
                  </h1>

                  {/* Credit wall — always visible */}
                  {creditWall && <div className="w-full mb-3">{creditWall}</div>}

                  {/* ── DESKTOP ONLY: unified input box ── */}
                <div className="hidden sm:flex w-full bg-card border border-border/90 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden flex-col">
                  {/* Attached images preview banner */}
                  {pendingImages.length > 0 && (
                    <div className="p-2.5 sm:p-3 bg-muted/40 border-b border-border/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/20 font-semibold">
                            Zen Vision
                          </Badge>
                          <span className="font-semibold text-foreground">
                            {pendingImages.length} {pendingImages.length === 1 ? 'image' : 'images'} attached
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            • {Math.max(0, imagesLeftToday - pendingImages.length)} uploads remaining today
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingImages([])}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {pendingImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group shrink-0 flex items-center gap-2 p-1.5 rounded-xl border border-border/80 bg-background shadow-2xs hover:border-orange-500/40 transition-all max-w-[200px]"
                          >
                            <div
                              onClick={() => setLightboxImage({ url: img.previewUrl, title: img.name })}
                              className="relative cursor-pointer h-10 w-10 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted"
                              title="Click to preview full size"
                            >
                              <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Maximize2 className="w-3 h-3" />
                              </div>
                            </div>
                            <div className="min-w-0 pr-5">
                              <p className="text-xs font-medium text-foreground truncate max-w-[110px]" title={img.name}>
                                {img.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(img.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePendingImage(img.id)}
                              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {pendingImages.length < imagesLeftToday && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="shrink-0 flex items-center gap-1.5 h-11 px-3 rounded-xl border border-dashed border-border/90 hover:border-orange-500/60 bg-muted/20 hover:bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                            title="Attach another photo"
                          >
                            <Plus className="w-3.5 h-3.5 text-orange-500" />
                            <span>Add photo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prompt Text Input */}
                  <form onSubmit={handleSend} className="p-4 sm:p-5 flex flex-col gap-4">
                    <input
                      className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/80 text-base sm:text-lg"
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      placeholder={
                        pendingImages.length > 0
                          ? `What would you like Zen Vision to do with ${pendingImages.length === 1 ? 'this image' : `these ${pendingImages.length} images`}? (e.g. Restock these items)`
                          : isTranscribing
                          ? "Transcribing audio..."
                          : isListening
                          ? "Listening to your voice..."
                          : "Assign a task, analyze inventory, or type a prompt..."
                      }
                      disabled={isLoading || isTranscribing}
                    />

                    {/* Inner Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Store tools active"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/60">
                          <Laptop className="h-3 w-3 text-orange-500" />
                          <span>Zeneva Store OS</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isImageQuotaExhausted) {
                              toast({
                                title: 'Daily image limit reached',
                                description: `You have reached your limit of ${imageDailyLimit} images today. ${
                                  plan === 'business'
                                    ? 'Your limit resets tomorrow.'
                                    : 'Upgrade to Business for 15 image scans per day.'
                                }`,
                                variant: 'destructive',
                              });
                              return;
                            }
                            fileInputRef.current?.click();
                          }}
                          disabled={isAnalyzingImage || isLoading}
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                            pendingImages.length > 0 || isAnalyzingImage ? "bg-orange-500/20 text-orange-600 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={
                            isImageQuotaExhausted
                              ? `Daily limit reached (${imageDailyLimit}/${imageDailyLimit} images used)`
                              : `Upload inventory sheets (${imagesLeftToday} left today, up to ${imageDailyLimit}/day)`
                          }
                        >
                          {isAnalyzingImage ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : <Camera className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                            isListening ? "bg-orange-500/20 text-orange-600 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={isListening ? "Stop listening" : "Voice dictation"}
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                        {isLoading ? (
                          <button
                            type="button"
                            onClick={() => { try { stop(); } catch {} }}
                            className="h-8 w-8 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 shadow-sm"
                          >
                            <span className="h-3 w-3 bg-white rounded-xs" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={(!localInput.trim() && pendingImages.length === 0) || !businessId}
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                              localInput.trim() || pendingImages.length > 0 ? "bg-foreground text-background hover:opacity-90 shadow-sm cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                          >
                            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Suggested for you — desktop only */}
                  <div className="border-t border-border/60 bg-muted/20 flex flex-col transition-all">
                    <button 
                      type="button" 
                      onClick={() => setShowSuggestions(prev => !prev)}
                      className="flex items-center justify-between w-full p-4 sm:px-5 sm:py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">Suggested for you</span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showSuggestions && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex flex-col gap-3">
                            <div className="flex justify-end -mt-8 relative z-10 mr-8">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setSuggestionIndex((prev) => (prev + 1) % SUGGESTION_POOLS.length); }} className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 flex items-center justify-center transition-colors">
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                              {SUGGESTION_POOLS[suggestionIndex].map((item, idx) => (
                                <button key={idx} type="button" onClick={() => submitPrompt(item.prompt)}
                                  className="text-left p-3 rounded-2xl bg-card border border-border/80 hover:border-orange-500/40 hover:shadow-xs transition-all flex flex-col justify-between group h-24">
                                  <div className="flex items-start justify-between gap-1 w-full">
                                    <span className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-orange-600 transition-colors">{item.title}</span>
                                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
                                  </div>
                                  <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{item.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ── DESKTOP ONLY: quick chips ── */}
                <div className="hidden sm:flex flex-wrap items-center justify-center gap-2 mt-6 max-w-2xl">
                  {QUICK_CHIPS.map((chip, i) => {
                    const Icon = chip.icon;
                    return (
                      <button key={i} type="button" onClick={() => submitPrompt(chip.prompt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/70 bg-card hover:bg-muted hover:border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all shadow-2xs">
                        <Icon className="h-3.5 w-3.5 text-orange-500" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
                </div>

                {/* Spacer to push carousel to the bottom */}
                <div className="flex-1 w-full" />

                {/* ── DESKTOP ONLY: feature carousel ── */}
                <div className="hidden sm:flex w-full max-w-xl mt-8 flex-col items-center gap-3">
                  <div className="w-full p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {React.createElement(CAROUSEL_SLIDES[carouselIndex].icon, { className: "h-6 w-6 text-orange-500 shrink-0" })}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{CAROUSEL_SLIDES[carouselIndex].title}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20">{CAROUSEL_SLIDES[carouselIndex].badge}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{CAROUSEL_SLIDES[carouselIndex].desc}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {CAROUSEL_SLIDES.map((_, i) => (
                      <button key={i} type="button" onClick={() => setCarouselIndex(i)}
                        className={cn("h-1.5 rounded-full transition-all", carouselIndex === i ? "w-4 bg-orange-500" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50")}
                        aria-label={`Go to slide ${i + 1}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Active Chat Thread ── */}
          {!isInitialState && (
            <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-36">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                const text = textOf(m as any);
                const toolParts = (m.parts ?? []).filter((p: any) => isToolUIPart(p) || p?.type === 'restock-sheet' || p?.output?.type === 'RESTOCK_SHEET');
                const hasToolUI = toolParts.length > 0;
                const streaming = isLoading && !isUser && i === messages.length - 1;

                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden p-1.5 bg-card border border-border shadow-sm">
                        <ZenMark animated={streaming} />
                      </div>
                    )}

                    <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'items-start w-full max-w-full'}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {isUser ? 'You' : 'Zen AI'}
                        {!isUser && typeof durations[m.id] === 'number' && (
                          <span className="inline-flex items-center gap-1 font-normal normal-case tracking-normal text-muted-foreground/70">
                            <Clock className="w-3 h-3" />
                            {formatThinkingTime(durations[m.id])}
                          </span>
                        )}
                      </div>

                      {isUser && text.trim() && (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap px-4 py-2.5 rounded-2xl rounded-br-md bg-stone-100 text-stone-800 border border-stone-200/70 shadow-sm dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700">
                          {text}
                        </div>
                      )}

                      {isUser && ((m as any).imageUrls || (m as any).imageUrl) && (
                        <div className="mt-1.5 flex flex-wrap gap-2 max-w-xl">
                          {(((m as any).imageUrls && (m as any).imageUrls.length > 0)
                            ? (m as any).imageUrls
                            : [(m as any).imageUrl]
                          ).map((url: string, imgIdx: number) => (
                            <div
                              key={imgIdx}
                              onClick={() => setLightboxImage({ url, title: text || `Uploaded photo ${imgIdx + 1}` })}
                              className="relative group cursor-pointer h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-muted/30 p-1 hover:border-orange-500/50 transition-all shrink-0"
                              title="Click to view full image"
                            >
                              <div className="relative w-full h-full rounded-xl overflow-hidden">
                                <img
                                  src={url}
                                  alt={`Uploaded photo ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <span className="text-[10px] bg-black/75 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-medium">
                                    <Maximize2 className="w-3 h-3" /> View
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isUser && text.trim() && (
                        <div className="w-full max-w-full text-foreground">
                          <Markdown>{text}</Markdown>
                          {streaming && <span className="zen-caret" aria-hidden />}
                        </div>
                      )}

                      {streaming && !text.trim() && !hasToolUI && (
                        <ZenStatus
                          activeTool={runningTool(m)}
                          lastUserPrompt={lastUserPrompt}
                          showMark={false}
                        />
                      )}

                      {hasToolUI && (
                        <div className="flex flex-col gap-3 w-full">
                          {toolParts.map((part: any, partIdx: number) => {
                            const output = part.output;
                            const isProposal = output?.type === 'PROPOSAL';
                            const enriched = isProposal
                              ? { ...output, status: proposalStatuses[output.proposalId] || output.status }
                              : output;

                            const stableKey =
                              part.toolCallId ||
                              part.id ||
                              `${m.id}-part-${part.type || 'tool'}-${partIdx}`;

                            return (
                              <div key={stableKey} className="flex flex-col gap-1.5">
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

              {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden p-1.5 bg-card border border-border shadow-sm">
                    <ZenMark animated />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 justify-center">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zen AI</div>
                    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-muted border border-border rounded-xl w-fit shadow-inner">
                      <ZenStatus
                        activeTool={runningTool(messages[messages.length - 1])}
                        lastUserPrompt={lastUserPrompt}
                        showMark={false}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Floating Bottom Input (Chat Mode + Mobile Initial State) ── */}
        {(
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background via-background/90 to-transparent",
              isInitialState
                ? "sm:hidden p-4 pb-20" // mobile-only floating bar on initial state
                : "p-4 pb-20 md:p-5 md:pb-8"
            )}
          >
            <div className="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
              {creditWall && <div className="mb-3">{creditWall}</div>}
              <div className="w-full bg-card rounded-2xl border border-border shadow-md focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-lg transition-all overflow-hidden flex flex-col">
                {pendingImages.length > 0 && (
                  <div className="p-2 sm:p-2.5 bg-muted/40 border-b border-border/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/20 font-semibold">
                          Zen Vision
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {pendingImages.length} {pendingImages.length === 1 ? 'image' : 'images'} attached
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          • {Math.max(0, imagesLeftToday - pendingImages.length)} uploads remaining today
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingImages([])}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {pendingImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative group shrink-0 flex items-center gap-2 p-1.5 rounded-xl border border-border/80 bg-background shadow-2xs hover:border-orange-500/40 transition-all max-w-[200px]"
                        >
                          <div
                            onClick={() => setLightboxImage({ url: img.previewUrl, title: img.name })}
                            className="relative cursor-pointer h-10 w-10 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted"
                            title="Click to preview full size"
                          >
                            <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Maximize2 className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="min-w-0 pr-5">
                            <p className="text-xs font-medium text-foreground truncate max-w-[110px]" title={img.name}>
                              {img.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(img.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingImage(img.id)}
                            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {pendingImages.length < imagesLeftToday && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="shrink-0 flex items-center gap-1.5 h-11 px-3 rounded-xl border border-dashed border-border/90 hover:border-orange-500/60 bg-muted/20 hover:bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                          title="Attach another photo"
                        >
                          <Plus className="w-3.5 h-3.5 text-orange-500" />
                          <span>Add photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-center p-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isImageQuotaExhausted) {
                        toast({
                          title: 'Daily image limit reached',
                          description: `You have reached your limit of ${imageDailyLimit} images today. ${
                            plan === 'business'
                              ? 'Your limit resets tomorrow.'
                              : 'Upgrade to Business for 15 image scans per day.'
                          }`,
                          variant: 'destructive',
                        });
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={isAnalyzingImage || isLoading}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      pendingImages.length > 0 || isAnalyzingImage ? "bg-orange-500/20 text-orange-600 animate-pulse" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={
                      isImageQuotaExhausted
                        ? `Daily limit reached (${imageDailyLimit}/${imageDailyLimit} images used)`
                        : `Upload inventory sheets (${imagesLeftToday} left today, up to ${imageDailyLimit}/day)`
                    }
                  >
                    {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      isListening ? "bg-orange-500/20 text-orange-600 animate-pulse" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <input
                    id="zen-ai-input"
                    className="flex-1 bg-transparent py-2.5 px-2 outline-none text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    placeholder={
                      pendingImages.length > 0
                        ? `What would you like Zen Vision to do with ${pendingImages.length === 1 ? 'this image' : `these ${pendingImages.length} images`}?`
                        : isTranscribing
                        ? "Transcribing audio..."
                        : isListening
                        ? "Listening to your voice..."
                        : "Ask Zen AI anything about your store..."
                    }
                    disabled={isLoading || isTranscribing}
                  />
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={() => { try { stop(); } catch {} }}
                      className="p-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors ml-2"
                      title="Stop"
                    >
                      <span className="block h-3.5 w-3.5 bg-white rounded-xs" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={(!localInput.trim() && pendingImages.length === 0) || !businessId}
                      className="p-2.5 rounded-xl bg-foreground text-background hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground transition-colors ml-2"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </form>
              </div>
              <div className="flex justify-between items-center mt-2 px-1 text-xs text-muted-foreground flex-wrap gap-2">
                <span>Zen AI may make mistakes. All stock and sale updates require your approval.</span>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-medium flex items-center gap-1.5",
                      isImageQuotaExhausted ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"
                    )}
                    title={`Your plan (${plan}) includes ${imageDailyLimit} image scans per day`}
                  >
                    <Camera className="w-3.5 h-3.5 text-orange-500" />
                    <span>{imagesLeftToday} / {imageDailyLimit} images left today</span>
                  </span>
                  {businessData && (
                    <span className="font-medium flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-orange-500" />
                      {totalCreditsLeft > 0 ? `${totalCreditsLeft.toLocaleString()} credits left` : '0 credits left'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Image Preview Lightbox Modal */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
              onClick={() => setLightboxImage(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-5xl w-full max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 font-medium shrink-0">
                      Zen Vision
                    </Badge>
                    <span className="text-xs font-semibold text-foreground truncate max-w-md">
                      {lightboxImage.title || 'Image Preview'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(null)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-black/40 min-h-[320px]">
                  <img
                    src={lightboxImage.url}
                    alt={lightboxImage.title || 'Full image'}
                    className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ZenAIPage() {
  const { user } = useUser();
  const { business } = usePOS();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const businessId = business?.id;

  if (!mounted || !businessId || !user) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Loading AI Copilot...</p>
      </div>
    );
  }

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
