
'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import type { SupportThread, SupportMessage, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { Loader2, Send, MessageSquare, Archive, Check, CheckCheck, Trash2, Paperclip, Mic, Image as ImageIcon, Play, Pause, X, MoreVertical, Edit2, Clock, ArrowLeft, Megaphone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ToastAction } from '@/components/ui/toast';
import { acquireMicStream, describeMicError, pickAudioMimeType } from '@/lib/mic';
import { useI18n } from '@/context/i18n-context';
import { Bot } from 'lucide-react';
import { sendDirectUserPush } from '@/actions/notifications';

interface AISupportLog {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    businessId: string;
    query: string;
    response: string;
    createdAt: any;
}

function getCleanAudioSource(voiceUrl: string): string {
    if (!voiceUrl) return '';
    if (voiceUrl.startsWith('http://') || voiceUrl.startsWith('https://') || voiceUrl.startsWith('blob:')) {
        return voiceUrl;
    }
    if (voiceUrl.startsWith('data:')) {
        try {
            const parts = voiceUrl.split(',');
            const header = parts[0];
            const mimeMatch = header.match(/:(.*?);/);
            let mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
            if (!mime.includes('audio')) mime = 'audio/webm';
            
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error("Base64 audio conversion error:", e);
            return voiceUrl;
        }
    }
    return voiceUrl;
}

/**
 * Two-letter avatar label. The inbox reads as a list of people, not of subject
 * lines, so every row and thread header leads with an initials bubble.
 */
function initialsOf(name?: string | null): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Right-hand timestamp in the conversation list, on WhatsApp's rule: clock time
 * for today, "Yesterday", then the date. `formatDistanceToNowStrict` renders
 * "2 hours" there, which is both wider and less useful than "2:35 PM" — and
 * width is the whole problem on a phone.
 */
function conversationTime(value: any): string {
    if (!value) return '';
    try {
        const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        if (isToday(date)) return format(date, 'h:mm a');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'dd/MM/yy');
    } catch {
        return '';
    }
}

function VoiceNotePlayer({ voiceUrl, voiceDuration }: { voiceUrl: string; voiceDuration?: number }) {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [audioSrc, setAudioSrc] = React.useState<string>('');
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    React.useEffect(() => {
        if (voiceUrl) {
            const src = getCleanAudioSource(voiceUrl);
            setAudioSrc(src);
            return () => {
                if (src && src.startsWith('blob:')) {
                    URL.revokeObjectURL(src);
                }
            };
        }
    }, [voiceUrl]);

    const togglePlay = () => {
        if (!audioRef.current || !audioSrc) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
                console.warn("Audio playback error:", err);
            });
        }
    };

    return (
        <div className="flex items-center gap-3 p-2 min-w-[220px] bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {audioSrc && (
                <audio 
                    ref={audioRef} 
                    src={audioSrc} 
                    preload="auto"
                    onTimeUpdate={() => {
                        if (audioRef.current) {
                            const current = audioRef.current.currentTime;
                            const duration = audioRef.current.duration || voiceDuration || 1;
                            setProgress((current / duration) * 100);
                        }
                    }}
                    onEnded={() => {
                        setIsPlaying(false);
                        setProgress(0);
                    }}
                    onError={(e) => console.warn("Audio element load error:", e)}
                />
            )}
            <button 
                type="button"
                onClick={togglePlay}
                className="h-9 w-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 shrink-0"
            >
                {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
                <div 
                    className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden relative cursor-pointer"
                    onClick={(e) => {
                        if (!audioRef.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = clickX / rect.width;
                        const duration = audioRef.current.duration || voiceDuration || 1;
                        audioRef.current.currentTime = pct * duration;
                        setProgress(pct * 100);
                    }}
                >
                    <div 
                        className="h-full bg-orange-500 transition-all duration-100 rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>🎙️ Voice Note</span>
                    <span>{voiceDuration ? `${voiceDuration}s` : 'Audio'}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * A single conversation, WhatsApp-style.
 *
 * `onBack` is what makes the mobile layout work: below `md` the inbox shows one
 * pane at a time, so entering a thread replaces the list and the only way out is
 * this button. On desktop the list stays visible beside the thread, so the
 * button is hidden there rather than made conditional on the prop.
 */
function ChatDetail({ thread, adminUser, onBack }: { thread: SupportThread, adminUser: UserProfile, onBack?: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useI18n();
    const [reply, setReply] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    
    // Media & Voice states
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [editMessageText, setEditMessageText] = React.useState('');
    const [editMessageId, setEditMessageId] = React.useState<string | null>(null);
    const [attachedImage, setAttachedImage] = React.useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [recordingSeconds, setRecordingSeconds] = React.useState(0);
    const recTimerRef = React.useRef<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Audio Playback & Media recorder references
    const [playingAudioId, setPlayingAudioId] = React.useState<string | null>(null);
    const [activeLightboxUrl, setActiveLightboxUrl] = React.useState<string | null>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, `supportThreads/${thread.id}/messages`), orderBy('createdAt', 'asc')),
        [firestore, thread.id]
    );
    const { data: messages, isLoading } = useCollection<any>(messagesQuery);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const prevMessageCountRef = React.useRef(0);

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;
            viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        }
    }, []);

    React.useEffect(() => {
        if (messages && messages.length > 0) {
            if (prevMessageCountRef.current === 0) {
                scrollToBottom('auto');
                setTimeout(() => scrollToBottom('auto'), 50);
            } else if (messages.length > prevMessageCountRef.current) {
                scrollToBottom('smooth');
            }
            prevMessageCountRef.current = messages.length;
        }
    }, [messages, scrollToBottom]);
    
    // Mark as read when admin views it
    React.useEffect(() => {
        if (thread && firestore) {
            if (thread.isReadByAdmin === false) {
                const threadRef = doc(firestore, 'supportThreads', thread.id);
                updateDoc(threadRef, { isReadByAdmin: true });
            }
            if (messages) {
                messages.forEach((msg: any) => {
                    if (msg.senderId !== 'admin' && !msg.isSeen) {
                        const msgRef = doc(firestore, `supportThreads/${thread.id}/messages`, msg.id);
                        updateDoc(msgRef, { isSeen: true });
                    }
                });
            }
        }
    }, [thread, firestore, messages]);

    const uploadImageToImgBB = async (file: File): Promise<string> => {
        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '2ec1d17c7ad748bbb605eda60a54a896';
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload image to ImgBB');
        }
        
        const resData = await response.json();
        return resData.data.url;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(true);
        toast({ title: 'Uploading image...', description: 'Please wait while we host your file.' });
        try {
            const url = await uploadImageToImgBB(file);
            setAttachedImage(url);
            toast({ variant: 'success', title: 'Image Uploaded', description: 'Your file is ready to send.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload image to ImgBB.' });
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendReply = async () => {
        if (!reply.trim() && !attachedImage) return;
        setIsSending(true);
        try {
            const messagesRef = collection(firestore, `supportThreads/${thread.id}/messages`);
            const payload: any = {
                senderId: 'admin',
                senderName: adminUser.name || 'Admin Support',
                createdAt: serverTimestamp(),
                isSeen: true
            };

            if (reply.trim()) payload.text = reply;
            if (attachedImage) {
                payload.mediaUrl = attachedImage;
                payload.text = reply || '📷 Sent an image';
            }

            await addDoc(messagesRef, payload);

            const threadRef = doc(firestore, 'supportThreads', thread.id);
            await updateDoc(threadRef, {
                lastMessageSnippet: payload.text,
                lastMessageAt: serverTimestamp(),
            });

            if (thread.userId) {
                await addDoc(collection(firestore, `users/${thread.userId}/notifications`), {
                    title: '💬 New Message from Support',
                    body: payload.text,
                    url: '/support',
                    type: 'support',
                    createdAt: serverTimestamp(),
                    read: false,
                }).catch(() => {});

                sendDirectUserPush(thread.userId, {
                    title: '💬 New Message from Support',
                    body: payload.text,
                    url: '/support'
                }).catch((err) => console.warn('Support push error:', err));
            }

            setReply('');
            setAttachedImage(null);
            toast({ variant: 'success', title: 'Reply Sent' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send reply.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveEditedMessage = async () => {
        if (!editMessageId || !thread || !firestore || !editMessageText.trim()) return;
        try {
            const msgRef = doc(firestore, `supportThreads/${thread.id}/messages`, editMessageId);
            await updateDoc(msgRef, {
                text: editMessageText,
                updatedAt: serverTimestamp()
            });
            const threadRef = doc(firestore, 'supportThreads', thread.id);
            await updateDoc(threadRef, {
                lastMessageSnippet: editMessageText,
                lastMessageAt: serverTimestamp()
            });
            setEditModalOpen(false);
            setEditMessageId(null);
            setEditMessageText('');
            toast({ variant: 'success', title: 'Reply Updated' });
        } catch (e) {
            console.error("Failed to update reply:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update reply.' });
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        try {
            await deleteDoc(doc(firestore, `supportThreads/${thread.id}/messages`, msgId));
            toast({ variant: 'success', title: 'Message Deleted', description: 'The message was deleted from this chat.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete message.' });
        }
    };

    const startRecording = async () => {
        try {
            const stream = await acquireMicStream();
            audioChunksRef.current = [];
            const mimeType = pickAudioMimeType();
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                
                // Convert audio to base64 Data URL (safe, robust, live-ready)
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    setIsSending(true);
                    try {
                        const messagesRef = collection(firestore, `supportThreads/${thread.id}/messages`);
                        await addDoc(messagesRef, {
                            senderId: 'admin',
                            senderName: adminUser.name || 'Admin Support',
                            voiceUrl: base64Audio,
                            voiceDuration: recordingSeconds,
                            createdAt: serverTimestamp(),
                            isSeen: true
                        });

                        const threadRef = doc(firestore, 'supportThreads', thread.id);
                        await updateDoc(threadRef, {
                            lastMessageSnippet: `🎙️ Voice note (${recordingSeconds}s)`,
                            lastMessageAt: serverTimestamp(),
                        });

                        toast({ variant: 'success', title: 'Voice Note Sent' });
                    } catch (e) {
                        toast({ variant: 'destructive', title: 'Error', description: 'Could not send voice note.' });
                    } finally {
                        setIsSending(false);
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recTimerRef.current = setInterval(() => {
                setRecordingSeconds(s => s + 1);
            }, 1000);
        } catch (err) {
            const failure = describeMicError(err);
            console.error(`Microphone unavailable (${failure.kind}):`, err);
            toast({
                variant: 'destructive',
                title: t(failure.titleKey),
                description: t(failure.bodyKey),
                action: failure.recoverable
                    ? <ToastAction altText={t('common.tryAgain')} onClick={() => { void startRecording(); }}>{t('common.tryAgain')}</ToastAction>
                    : undefined,
            });
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null; // Prevent sending on cancel
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(recTimerRef.current);
        setIsRecording(false);
        setRecordingSeconds(0);
    };

    const stopAndSendVoice = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(recTimerRef.current);
        setIsRecording(false);
    };

    const safeFormatTime = (val: any) => {
        if (!val) return '';
        try {
            const date = val.toDate ? val.toDate() : new Date(val);
            return format(date, 'h:mm a');
        } catch (e) {
            return '';
        }
    };

    return (
        // `relative` scopes the edit panel below, which is `absolute inset-0`:
        // without a positioned ancestor it escaped the pane entirely.
        <div className="relative flex flex-col h-full bg-[#efeae2] dark:bg-slate-950 border rounded-xl overflow-hidden shadow-lg">
            {/* Hidden inputs for real file uploads */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />

            {/* Thread header. Every text node here is width-capped: `userEmail`
                printed raw was pushing the header past the screen edge on a
                phone, which is what dragged the whole pane sideways. */}
            <div className="p-2.5 md:p-4 bg-white dark:bg-slate-900 border-b flex items-center gap-2 md:gap-3 z-10 shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-9 w-9 shrink-0 -ml-1 md:hidden"
                    aria-label="Back to conversations"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold uppercase text-orange-600 dark:text-orange-400">
                    {initialsOf(thread.userName)}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-sm md:text-base text-slate-800 dark:text-white">
                        {thread.userName || 'Unknown user'}
                    </h3>
                    <p className="truncate text-[11px] md:text-xs text-muted-foreground">
                        {thread.subject}{thread.userEmail ? ` • ${thread.userEmail}` : ''}
                    </p>
                </div>
                <Select value={thread.status} onValueChange={(value: 'open' | 'closed') => {
                    const threadRef = doc(firestore, 'supportThreads', thread.id);
                    updateDoc(threadRef, { status: value });
                }}>
                    <SelectTrigger className="w-[84px] md:w-[110px] h-8 md:h-9 shrink-0 text-xs bg-muted/50 border-none">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Message viewport */}
            <ScrollArea className="flex-1 p-3 md:p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[size:360px]" ref={scrollAreaRef}>
                <div className="space-y-3">
                    {isLoading ? (
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mt-10" />
                    ) : messages?.map(msg => {
                        const isAdmin = msg.senderId === 'admin';
                        return (
                            <div key={msg.id} className={cn('flex items-end gap-1 group', isAdmin ? 'justify-end' : 'justify-start')}>
                                 <div className={cn(
                                     // Wider share of a phone than of a desktop pane: at 70% of a
                                     // 330px viewport a two-word message wraps for no reason.
                                     "max-w-[85%] md:max-w-[70%] rounded-xl p-2.5 relative shadow-sm transition-all duration-300",
                                     isAdmin
                                        ? 'bg-orange-100 dark:bg-orange-950/40 text-slate-800 dark:text-slate-100 rounded-tr-none pr-8'
                                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none'
                                 )}>
                                    {/* Dropdown menu for Edit/Delete instead of absolute trash button.
                                        Always visible on touch: hover never fires there, so a
                                        hover-only trigger made edit and delete unreachable on a phone. */}
                                    {isAdmin && (
                                         <div className="absolute top-1.5 right-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                                             <DropdownMenu modal={false}>
                                                 <DropdownMenuTrigger asChild>
                                                     <button className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border hover:bg-slate-200 dark:hover:bg-slate-700">
                                                         <MoreVertical className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                                                     </button>
                                                 </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end" className="w-[100px]">
                                                     {msg.text && (
                                                         <DropdownMenuItem onClick={() => {
                                                             setEditMessageId(msg.id);
                                                             setEditMessageText(msg.text || '');
                                                             setEditModalOpen(true);
                                                         }}>
                                                             <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                                                         </DropdownMenuItem>
                                                     )}
                                                     <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-red-500 focus:text-red-500">
                                                         <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                     </DropdownMenuItem>
                                                 </DropdownMenuContent>
                                             </DropdownMenu>
                                         </div>
                                     )}

                                    {/* Image Attachment inside Bubble */}
                                    {msg.mediaUrl && (
                                        <div 
                                            className="mb-2 rounded-lg overflow-hidden border max-w-sm cursor-pointer group/img"
                                            onClick={() => setActiveLightboxUrl(msg.mediaUrl)}
                                        >
                                            <img src={msg.mediaUrl} alt="Attached File" className="w-full h-auto object-cover max-h-60 group-hover/img:scale-105 transition-transform duration-300" />
                                        </div>
                                    )}

                                    {msg.replyTo && (
                                        <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/10 border-l-4 border-orange-500 text-xs">
                                            <p className="font-semibold text-orange-600 dark:text-orange-400 text-[11px]">{msg.replyTo.senderName}</p>
                                            <p className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{msg.replyTo.text}</p>
                                        </div>
                                    )}

                                    {/* Voice Player inside Bubble */}
                                    {msg.voiceUrl && (
                                        <div className="mb-2">
                                            <VoiceNotePlayer voiceUrl={msg.voiceUrl} voiceDuration={msg.voiceDuration} />
                                        </div>
                                    )}

                                    {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}

                                    {/* Status tick and timestamp */}
                                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-75">
                                        {msg.updatedAt && <span className="italic font-medium text-slate-500 dark:text-slate-400 mr-0.5">Edited •</span>}
                                        <span>{safeFormatTime(msg.createdAt)}</span>
                                        {isAdmin && (
                                            msg.isSeen ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" /> : <Check className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                    </div>
                                 </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Input action toolbar */}
            <div className="bg-[#f0f0f0] dark:bg-slate-900 p-2 md:p-3 border-t flex flex-col gap-2">
                {/* Image attachment preview zone */}
                {attachedImage && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border max-w-xs animate-fade-in relative">
                        <img src={attachedImage} alt="Attachment Preview" className="h-14 w-14 object-cover rounded-md border" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">Image Attached</p>
                            <p className="text-[10px] text-muted-foreground">Ready to send</p>
                        </div>
                        <button onClick={() => setAttachedImage(null)} className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300">
                            <X className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-1 md:gap-2">
                    {/* File Attachment Button */}
                    <Button type="button" size="icon" variant="ghost" disabled={isUploadingImage} className="h-10 w-10 shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => fileInputRef.current?.click()}>
                        {isUploadingImage ? <Loader2 className="h-5 w-5 animate-spin text-slate-400"/> : <Paperclip className="h-5 w-5" />}
                    </Button>
                    {/* Opens the same picker as the paperclip. Kept for desktop, where
                        there is room for it; on a phone a second identical button
                        costs 40px of the ~300px the composer actually has. */}
                    <Button type="button" size="icon" variant="ghost" disabled={isUploadingImage} className="hidden md:inline-flex h-10 w-10 shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5" />
                    </Button>

                    {isRecording ? (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1 bg-white dark:bg-slate-800 px-2 md:px-3 py-2 rounded-lg border h-10 animate-pulse">
                            <div className="flex min-w-0 items-center gap-1.5 text-rose-500">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 animate-ping"></span>
                                <span className="truncate text-[10px] md:text-xs font-bold font-mono">{recordingSeconds}s</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] md:text-xs text-muted-foreground" onClick={cancelRecording}>Cancel</Button>
                                <Button size="sm" variant="default" className="h-7 px-2.5 text-[10px] md:text-xs bg-orange-600 text-white" onClick={stopAndSendVoice}>Send</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0 flex items-center gap-1 md:gap-2">
                            <Textarea
                                placeholder={editMessageId ? "Edit your reply..." : "Type your reply..."}
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                disabled={isSending}
                                className="flex-1 min-w-0 min-h-[40px] h-[40px] max-h-[80px] bg-white dark:bg-slate-800 border-none ring-1 ring-border resize-none rounded-lg text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply();
                                    }
                                }}
                            />
                            {/* Voice recording activator */}
                            <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:text-slate-900 dark:hover:text-slate-100" onClick={startRecording}>
                                <Mic className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    {!isRecording && (
                        <Button onClick={handleSendReply} disabled={(!reply.trim() && !attachedImage) || isSending} size="icon" className="h-10 w-10 rounded-lg bg-orange-600 text-white hover:bg-orange-700 flex-shrink-0">
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Inline Premium Edit Message Panel */}
            {editModalOpen && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 rounded-xl">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-orange-600">
                                <Edit2 className="h-4 w-4" /> Edit Reply
                            </div>
                            <button 
                                onClick={() => setEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <Textarea 
                                value={editMessageText}
                                onChange={(e) => setEditMessageText(e.target.value)}
                                className="min-h-[100px] w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                placeholder="Edit your reply text..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 text-xs">
                            <Button variant="ghost" size="sm" className="rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 h-8" onClick={() => setEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg h-8 px-3" onClick={handleSaveEditedMessage} disabled={!editMessageText.trim()}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Fullscreen Image Lightbox Modal using React Portal */}
            {activeLightboxUrl && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in select-none"
                    onClick={() => setActiveLightboxUrl(null)}
                >
                    {/* Top action bar */}
                    <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
                        <a 
                            href={activeLightboxUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-white hover:text-orange-400 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-xs font-semibold px-4 flex items-center gap-1.5"
                            title="Open Original Image"
                        >
                            Open Original
                        </a>
                        <button 
                            className="text-white hover:text-rose-400 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            onClick={() => setActiveLightboxUrl(null)}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Deep expanded high-res image display */}
                    <div className="relative max-w-[95vw] max-h-[92vh] flex items-center justify-center overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={activeLightboxUrl} 
                            alt="Expanded View" 
                            className="max-h-[90vh] max-w-[95vw] w-auto h-auto object-contain rounded-xl shadow-2xl ring-1 ring-white/10 cursor-zoom-out" 
                            onClick={() => setActiveLightboxUrl(null)}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}


export default function AdminSupportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedThread, setSelectedThread] = React.useState<SupportThread | null>(null);
    /**
     * Controlled purely so the mobile layout can tell which pane is on screen.
     * `selectedThread` outlives a tab switch, so hiding the page chrome on
     * "a thread is open" alone would strand someone on the AI Logs tab with no
     * way back to the tab strip.
     */
    const [activeTab, setActiveTab] = React.useState('inbox');

    // This is a simplified user object for the admin.
    const adminUser = { id: 'admin', name: 'Zeneva Support', email: 'support@zeneva.com' } as UserProfile;

    const handleBroadcastInvite = async () => {
        if (!firestore) return;
        const confirmSend = window.confirm("Are you sure you want to broadcast a 'Chat with CEO' notification to all merchants?");
        if (!confirmSend) return;
        try {
            const broadcastsRef = collection(firestore, 'ceo_broadcasts');
            await addDoc(broadcastsRef, {
                title: "Direct Line to CEO",
                message: "Bello Imam (CEO of Zeneva) is online! You can chat directly for feature requests, feedback, or custom support.",
                createdAt: serverTimestamp()
            });
            toast({ variant: 'success', title: 'Broadcast Sent', description: 'All active merchants will receive a notification and invitation modal.' });
        } catch (e) {
            console.error("Failed to broadcast CEO invite:", e);
            toast({ variant: 'destructive', title: 'Broadcast Failed', description: 'Could not send broadcast.' });
        }
    };

    const threadsQuery = useMemoFirebase(
        () => query(collection(firestore, 'supportThreads'), orderBy('lastMessageAt', 'desc')),
        [firestore]
    );
    const { data: threads, isLoading } = useCollection<SupportThread>(threadsQuery);

    const aiLogsQuery = useMemoFirebase(
        () => query(collection(firestore, 'ai_support_logs'), orderBy('createdAt', 'desc')),
        [firestore]
    );
    const { data: aiLogs, isLoading: isAiLogsLoading } = useCollection<AISupportLog>(aiLogsQuery);
    const [selectedAiLog, setSelectedAiLog] = React.useState<AISupportLog | null>(null);

    const unreadCount = React.useMemo(() => {
        if (!threads) return 0;
        return threads.filter(t => !t.isReadByAdmin).length;
    }, [threads]);

    /**
     * True when the phone is showing a conversation rather than the list.
     *
     * Below `md` the inbox is one pane at a time — the old two-column grid
     * collapsed to a single column, which stacked the chat *underneath* the
     * whole thread list and meant scrolling past every ticket to reach the
     * reply box. Entering a thread now replaces the list, WhatsApp-style, and
     * the page title and tab strip step out of the way so the conversation gets
     * the full height.
     */
    const inThreadOnMobile =
        (activeTab === 'inbox' && !!selectedThread) ||
        (activeTab === 'ai-logs' && !!selectedAiLog);

    return (
        // 11rem on a phone rather than 10: the admin shell spends 56px on its
        // header and 96px on the bottom-nav reserve, so 10rem overflowed and let
        // the page itself scroll under a chat that is supposed to be fixed.
        <div className="h-[calc(100vh_-_11rem)] md:h-[calc(100vh_-_10rem)] flex flex-col">
            <h1 className={cn("text-xl md:text-2xl font-bold mb-3 md:mb-4", inThreadOnMobile && "hidden md:block")}>
                Support Center
            </h1>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className={cn(
                    "flex items-center justify-between gap-2 mb-3 md:mb-4",
                    inThreadOnMobile && "hidden md:flex",
                )}>
                    <TabsList className="mb-0 h-9 md:h-10">
                        <TabsTrigger value="inbox" className="flex gap-1.5 md:gap-2 items-center text-xs md:text-sm">
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Human Inbox</span>
                            <span className="sm:hidden">Inbox</span>
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-0.5 md:ml-2 px-1.5 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full animate-pulse">
                                    {unreadCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="ai-logs" className="flex gap-1.5 md:gap-2 items-center text-xs md:text-sm">
                            <Bot className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">AI Chat Logs</span>
                            <span className="sm:hidden">AI Logs</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Label collapses to the icon on a phone — the full sentence
                        was wider than the tab strip it sits beside. */}
                    <Button
                        onClick={handleBroadcastInvite}
                        className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs h-9 flex items-center gap-1.5 px-2.5 md:px-4"
                    >
                        <Megaphone className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Broadcast CEO Invite</span>
                        <span className="md:hidden">CEO</span>
                    </Button>
                </div>

                <TabsContent value="inbox" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                    <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6">
                        {/* Conversation list. Hidden on a phone while a thread is
                            open; always present from md up, where the list beside
                            the thread is the desktop-WhatsApp layout. */}
                        <div className={cn(
                            "col-span-1 h-full min-h-0 flex-col",
                            selectedThread ? 'hidden md:flex' : 'flex',
                        )}>
                            <ScrollArea className="flex-1 border rounded-lg bg-card">
                                {isLoading && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                                {threads && threads.length > 0 ? (
                                    threads.map(thread => {
                                        const unread = !thread.isReadByAdmin;
                                        const when = conversationTime(thread.lastMessageAt) || 'now';
                                        return (
                                            <button
                                                key={thread.id}
                                                onClick={() => setSelectedThread(thread)}
                                                className={cn(
                                                    "flex w-full items-start gap-3 px-3 py-2.5 text-left border-b last:border-b-0 transition-colors hover:bg-muted",
                                                    selectedThread?.id === thread.id && 'bg-muted',
                                                )}
                                            >
                                                <span className={cn(
                                                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
                                                    unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                                                )}>
                                                    {initialsOf(thread.userName)}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline justify-between gap-2">
                                                        <span className={cn("min-w-0 truncate text-sm", unread ? 'font-bold text-primary' : 'font-semibold')}>
                                                            {thread.userName || 'Unknown user'}
                                                        </span>
                                                        <span className={cn("shrink-0 text-[10px]", unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                                            {when}
                                                        </span>
                                                    </span>
                                                    <span className="mt-0.5 flex items-center gap-1.5">
                                                        <span className={cn("min-w-0 flex-1 truncate text-xs", unread ? 'text-foreground' : 'text-muted-foreground')}>
                                                            {thread.lastMessageSnippet || thread.subject}
                                                        </span>
                                                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                                                    </span>
                                                    <span className="mt-1 flex items-center gap-1.5">
                                                        <Badge
                                                            variant={thread.status === 'open' ? 'default' : 'secondary'}
                                                            className="h-4 shrink-0 px-1.5 text-[9px] uppercase shadow-none"
                                                        >
                                                            {thread.status}
                                                        </Badge>
                                                        <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                                                            {thread.subject}
                                                        </span>
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    !isLoading && <div className="p-4 text-center text-muted-foreground">No support tickets found.</div>
                                )}
                            </ScrollArea>
                        </div>
                        <div className={cn(
                            "h-full min-h-0 md:col-span-2 lg:col-span-3",
                            selectedThread ? 'block' : 'hidden md:block',
                        )}>
                            {selectedThread ? (
                                <ChatDetail
                                    key={selectedThread.id}
                                    thread={selectedThread}
                                    adminUser={adminUser}
                                    onBack={() => setSelectedThread(null)}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-card border rounded-lg text-muted-foreground">
                                    <MessageSquare className="h-16 w-16 opacity-50"/>
                                    <p className="mt-4 text-lg font-medium">Select a conversation to view</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="ai-logs" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                     <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6">
                        <div className={cn(
                            "col-span-1 h-full min-h-0 flex-col",
                            selectedAiLog ? 'hidden md:flex' : 'flex',
                        )}>
                            <ScrollArea className="flex-1 border rounded-lg bg-card">
                                {isAiLogsLoading && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                                {aiLogs && aiLogs.length > 0 ? (
                                    aiLogs.map(log => (
                                        <button
                                            key={log.id}
                                            onClick={() => setSelectedAiLog(log)}
                                            className={cn(
                                                "w-full text-left p-3 border-b last:border-b-0 hover:bg-muted transition-colors",
                                                selectedAiLog?.id === log.id && 'bg-muted'
                                            )}
                                        >
                                            <p className="font-semibold text-sm truncate">{log.query}</p>
                                            <div className="flex justify-between items-center gap-2 mt-1">
                                                <p className="min-w-0 flex-1 text-xs text-muted-foreground truncate">{log.userName}</p>
                                                <p className="shrink-0 text-[10px] text-muted-foreground">
                                                    {log.createdAt && typeof log.createdAt.toDate === 'function'
                                                        ? formatDistanceToNowStrict(log.createdAt.toDate(), {addSuffix: true})
                                                        : ''}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    !isAiLogsLoading && <div className="p-4 text-center text-muted-foreground">No AI logs found.</div>
                                )}
                            </ScrollArea>
                        </div>
                        <div className={cn(
                            "h-full min-h-0 md:col-span-2 lg:col-span-3",
                            selectedAiLog ? 'block' : 'hidden md:block',
                        )}>
                            {selectedAiLog ? (
                                <div className="h-full bg-card border rounded-lg flex flex-col">
                                    <div className="flex items-start gap-2 p-3 md:p-4 border-b">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedAiLog(null)}
                                            className="h-9 w-9 shrink-0 -ml-1 md:hidden"
                                            aria-label="Back to AI logs"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-base md:text-lg">AI Interaction Details</h3>
                                            <div className="mt-1 space-y-0.5 text-xs md:text-sm text-muted-foreground">
                                                <p className="break-words"><strong>User:</strong> {selectedAiLog.userName} ({selectedAiLog.userEmail || 'No email'})</p>
                                                <p className="break-all"><strong>Business ID:</strong> {selectedAiLog.businessId}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 p-3 md:p-6">
                                        <div className="space-y-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Query</span>
                                                <div className="bg-primary/10 text-primary p-3 md:p-4 rounded-xl rounded-tl-sm w-fit max-w-[90%] md:max-w-[80%] whitespace-pre-wrap break-words text-sm">
                                                    {selectedAiLog.query}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zen AI Response</span>
                                                <div className="bg-muted p-3 md:p-4 rounded-xl rounded-tr-sm w-fit max-w-[90%] md:max-w-[80%] whitespace-pre-wrap break-words text-sm">
                                                    {selectedAiLog.response}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-card border rounded-lg text-muted-foreground">
                                    <Bot className="h-16 w-16 opacity-50"/>
                                    <p className="mt-4 text-lg font-medium">Select an AI log to review</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
