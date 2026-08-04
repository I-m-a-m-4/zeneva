
'use client';
import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { SupportThread, SupportMessage, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Loader2, Send, MessageSquare, Archive } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot } from 'lucide-react';

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

function ChatDetail({ thread, adminUser }: { thread: SupportThread, adminUser: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [reply, setReply] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, `supportThreads/${thread.id}/messages`), orderBy('createdAt', 'asc')),
        [firestore, thread.id]
    );
    const { data: messages, isLoading } = useCollection<SupportMessage>(messagesQuery);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);
    
    // Mark as read when admin views it
    React.useEffect(() => {
        if(thread.isReadByAdmin === false) {
            const threadRef = doc(firestore, 'supportThreads', thread.id);
            updateDoc(threadRef, { isReadByAdmin: true });
        }
    }, [thread, firestore]);

    const handleSendReply = async () => {
        if (!reply.trim()) return;
        setIsSending(true);
        try {
            const messagesRef = collection(firestore, `supportThreads/${thread.id}/messages`);
            await addDoc(messagesRef, {
                senderId: 'admin',
                senderName: adminUser.name || 'Admin Support',
                text: reply,
                createdAt: serverTimestamp()
            });

            const threadRef = doc(firestore, 'supportThreads', thread.id);
            await updateDoc(threadRef, {
                lastMessageSnippet: reply,
                lastMessageAt: serverTimestamp(),
            });

            setReply('');
            toast({ variant: 'success', title: 'Reply Sent' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send reply.' });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleStatusChange = async (status: 'open' | 'closed') => {
        const threadRef = doc(firestore, 'supportThreads', thread.id);
        try {
            await updateDoc(threadRef, { status });
            toast({ variant: 'success', title: 'Status Updated', description: `Conversation has been ${status}.` });
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
        }
    }

    return (
        <div className="flex flex-col h-full bg-card border rounded-lg">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold">{thread.subject}</h3>
                        <p className="text-sm text-muted-foreground">{thread.userName} ({thread.userEmail})</p>
                    </div>
                     <Select value={thread.status} onValueChange={(value: 'open' | 'closed') => handleStatusChange(value)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : messages?.map(msg => (
                        <div key={msg.id} className={cn('flex items-end gap-2', msg.senderId === 'admin' ? 'justify-end' : 'justify-start')}>
                             {msg.senderId !== 'admin' && <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">{msg.senderName.charAt(0)}</div>}
                             <div className={cn("max-w-[70%] rounded-lg p-3 text-sm whitespace-pre-wrap", msg.senderId === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                {msg.text}
                                <div className="text-xs opacity-70 mt-1 text-right">
                                    {msg.createdAt && typeof msg.createdAt.toDate === 'function' 
                                        ? formatDistanceToNowStrict(msg.createdAt.toDate(), {addSuffix: true}) 
                                        : ''}
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
                <Textarea placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} disabled={isSending} className="flex-1"/>
                <Button onClick={handleSendReply} disabled={!reply.trim() || isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}


export default function AdminSupportPage() {
    const firestore = useFirestore();
    const [selectedThread, setSelectedThread] = React.useState<SupportThread | null>(null);

    // This is a simplified user object for the admin.
    const adminUser = { id: 'admin', name: 'Zeneva Support', email: 'support@zeneva.com' } as UserProfile;

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

    return (
        <div className="h-[calc(100vh_-_10rem)] flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Support Center</h1>
            <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mb-4 self-start">
                    <TabsTrigger value="inbox" className="flex gap-2"><MessageSquare className="h-4 w-4" /> Human Inbox</TabsTrigger>
                    <TabsTrigger value="ai-logs" className="flex gap-2"><Bot className="h-4 w-4" /> AI Chat Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inbox" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                    <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <div className="col-span-1 h-full flex flex-col">
                            <ScrollArea className="flex-1 border rounded-lg bg-card">
                    {isLoading && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {threads && threads.length > 0 ? (
                        threads.map(thread => (
                            <button
                                key={thread.id}
                                onClick={() => setSelectedThread(thread)}
                                className={cn(
                                    "w-full text-left p-3 border-b last:border-b-0 hover:bg-muted",
                                    selectedThread?.id === thread.id && 'bg-muted'
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className='flex-1 min-w-0'>
                                        <p className={cn("font-semibold truncate", !thread.isReadByAdmin && 'text-primary')}>{thread.subject}</p>
                                        <p className="text-sm text-muted-foreground truncate">{thread.userName}</p>
                                    </div>
                                    {!thread.isReadByAdmin && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 ml-2 flex-shrink-0"></div>}
                                </div>
                                 <p className="text-xs text-muted-foreground mt-1 truncate">{thread.lastMessageSnippet}</p>
                                <div className="flex justify-between items-center mt-2">
                                     <Badge variant={thread.status === 'open' ? 'default' : 'secondary'}>{thread.status}</Badge>
                                     <p className="text-xs text-muted-foreground">
                                         {thread.lastMessageAt && typeof thread.lastMessageAt.toDate === 'function' 
                                             ? formatDistanceToNowStrict(thread.lastMessageAt.toDate(), {addSuffix: true}) 
                                             : 'Just now'}
                                     </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        !isLoading && <div className="p-4 text-center text-muted-foreground">No support tickets found.</div>
                    )}
                </ScrollArea>
            </div>
            <div className="h-full md:col-span-2 lg:col-span-3">
                {selectedThread ? (
                    <ChatDetail thread={selectedThread} adminUser={adminUser} />
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
                     <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <div className="col-span-1 h-full flex flex-col">
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
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{log.userName}</p>
                                                <p className="text-[10px] text-muted-foreground">
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
                        <div className="h-full md:col-span-2 lg:col-span-3">
                            {selectedAiLog ? (
                                <div className="h-full bg-card border rounded-lg flex flex-col">
                                    <div className="p-4 border-b">
                                        <h3 className="font-semibold text-lg">AI Interaction Details</h3>
                                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                            <p><strong>User:</strong> {selectedAiLog.userName} ({selectedAiLog.userEmail || 'No email'})</p>
                                            <p><strong>Business ID:</strong> {selectedAiLog.businessId}</p>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 p-6">
                                        <div className="space-y-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Query</span>
                                                <div className="bg-primary/10 text-primary p-4 rounded-xl rounded-tl-sm w-fit max-w-[80%] whitespace-pre-wrap">
                                                    {selectedAiLog.query}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zen AI Response</span>
                                                <div className="bg-muted p-4 rounded-xl rounded-tr-sm w-fit max-w-[80%] whitespace-pre-wrap text-sm">
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
