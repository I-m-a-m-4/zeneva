'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { hasProFeatures } from '@/lib/plan';
import FeatureGate from '@/components/shared/feature-gate';
import { Code, Webhook, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface DevelopersTabProps {
    business: any;
}

interface WebhookEndpoint {
    id: string;
    url: string;
    secret: string;
    events: string[];
}

export default function DevelopersTab({ business }: DevelopersTabProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const isPro = hasProFeatures(business);

    const [webhooks, setWebhooks] = React.useState<WebhookEndpoint[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [newUrl, setNewUrl] = React.useState('');
    const [newSecret, setNewSecret] = React.useState('');

    React.useEffect(() => {
        if (!isPro || !business?.id || !firestore) return;
        const fetchWebhooks = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(firestore, `businessInstances/${business.id}/webhooks`));
                const snap = await getDocs(q);
                setWebhooks(snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookEndpoint)));
            } catch (error) {
                console.error("Failed to fetch webhooks", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWebhooks();
    }, [isPro, business?.id, firestore]);

    const handleAddWebhook = async () => {
        if (!newUrl) {
            toast({ variant: 'destructive', title: 'URL required', description: 'Please provide a valid webhook URL' });
            return;
        }
        if (!business?.id || !firestore) return;
        setIsSaving(true);
        try {
            const id = Math.random().toString(36).substring(2, 15);
            const ref = doc(firestore, `businessInstances/${business.id}/webhooks/${id}`);
            const data: WebhookEndpoint = { id, url: newUrl, secret: newSecret, events: ['inventory.updated'] };
            await setDoc(ref, data);
            setWebhooks([...webhooks, data]);
            setNewUrl('');
            setNewSecret('');
            toast({ variant: 'success', title: 'Webhook added', description: 'Your endpoint is now active.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to add', description: 'An error occurred while saving.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!business?.id || !firestore) return;
        try {
            await deleteDoc(doc(firestore, `businessInstances/${business.id}/webhooks/${id}`));
            setWebhooks(webhooks.filter(w => w.id !== id));
            toast({ variant: 'success', title: 'Webhook deleted', description: 'The endpoint has been removed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to delete', description: 'An error occurred while deleting.' });
        }
    };

    if (!isPro) {
        return (
            <Card className="border-border/15">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground"><Code className="h-5 w-5" /> Developers & Integrations</CardTitle>
                    <CardDescription>Connect Zeneva to your external systems and websites.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FeatureGate 
                        requiredPlan="pro" 
                        currentPlan={business?.plan || 'starter'} 
                        hasLifetimeAccess={business?.accessLevel === 'lifetime'}
                        featureName="Developer Tools" 
                        description="Upgrade to the Pro plan to access webhooks, connect to WooCommerce or Wix, and sync your inventory live."
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /> Webhooks</CardTitle>
                    <CardDescription>
                        Receive real-time HTTP POST notifications when events happen in your Zeneva account. 
                        Use this to sync inventory to WooCommerce, Wix, custom sites, or Zapier.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="space-y-4">
                            {webhooks.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center p-6 border border-dashed rounded-lg">
                                    No webhooks configured yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {webhooks.map(wh => (
                                        <div key={wh.id} className="flex items-center justify-between p-3 border rounded-md">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{wh.url}</span>
                                                <span className="text-xs text-muted-foreground">Subscribed to: {wh.events?.join(', ') || 'inventory.updated'}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWebhook(wh.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-medium text-sm">Add New Webhook</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="webhookUrl">Endpoint URL</Label>
                                        <Input 
                                            id="webhookUrl" 
                                            placeholder="https://your-site.com/wp-json/..." 
                                            value={newUrl} 
                                            onChange={e => setNewUrl(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="webhookSecret">Secret (Optional)</Label>
                                        <Input 
                                            id="webhookSecret" 
                                            placeholder="For payload verification" 
                                            value={newSecret} 
                                            onChange={e => setNewSecret(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleAddWebhook} disabled={isSaving || !newUrl}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Plus className="h-4 w-4 me-2" />}
                                    Add Endpoint
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
