'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { hasProFeatures } from '@/lib/plan';
import FeatureGate from '@/components/shared/feature-gate';
import { Code, Webhook, Plus, Trash2, Loader2, Save, Globe, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
    
    // Custom Integration State
    const [customFetchUrl, setCustomFetchUrl] = React.useState(business?.settings?.customFetchUrl || '');
    const [customPushUrl, setCustomPushUrl] = React.useState(business?.settings?.customPushUrl || '');
    const [customApiKey, setCustomApiKey] = React.useState(business?.settings?.customApiKey || '');
    const [isSavingCustom, setIsSavingCustom] = React.useState(false);
    const [showCustomApiKey, setShowCustomApiKey] = React.useState(false);
    const [showOnlineSecret, setShowOnlineSecret] = React.useState(false);

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

    const handleSaveCustomIntegration = async () => {
        if (!business?.id || !firestore) return;
        setIsSavingCustom(true);
        try {
            const ref = doc(firestore, `businessInstances/${business.id}`);
            await updateDoc(ref, {
                'settings.customFetchUrl': customFetchUrl,
                'settings.customPushUrl': customPushUrl,
                'settings.customApiKey': customApiKey,
            });
            toast({ variant: 'success', title: 'Integration Saved', description: 'Your custom website integration settings have been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save integration settings.' });
        } finally {
            setIsSavingCustom(false);
        }
    };

    const [isSyncing, setIsSyncing] = React.useState(false);
    const handleSyncOrders = async () => {
        if (!business?.id || !firestore || !customFetchUrl || !customApiKey) {
            toast({ variant: 'destructive', title: 'Missing Settings', description: 'Please save your API Key and Fetch URL first.' });
            return;
        }
        setIsSyncing(true);
        try {
            const res = await fetch(customFetchUrl, {
                headers: { 'x-api-key': customApiKey }
            });
            const data = await res.json();
            if (data.success && data.orders) {
                let imported = 0;
                for (const order of data.orders) {
                    const q = query(collection(firestore, `businessInstances/${business.id}/sales`), where('externalOrderId', '==', order.id));
                    const snap = await getDocs(q);
                    if (snap.empty) {
                        await addDoc(collection(firestore, `businessInstances/${business.id}/sales`), {
                            externalOrderId: order.id,
                            totalAmount: order.totalAmount,
                            status: order.status,
                            date: Timestamp.fromDate(new Date(order.createdAt)),
                            source: 'website',
                            items: order.items || [],
                            createdAt: serverTimestamp(),
                        });
                        imported++;
                    }
                }
                toast({ variant: 'success', title: 'Sync Complete', description: `Imported ${imported} new orders from your website.` });
            } else {
                toast({ variant: 'destructive', title: 'Sync Failed', description: 'Invalid response from website.' });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Sync Error', description: 'Failed to connect to your website.' });
        } finally {
            setIsSyncing(false);
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Online Orders Sync (WooCommerce / Shopify)</CardTitle>
                    <CardDescription>
                        Connect your external storefronts to push live orders directly into your Zeneva dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-sm">
                         <h4 className="font-semibold mb-2">How it works</h4>
                         <p className="text-muted-foreground mb-4">
                             Generate an API key below. Copy the Endpoint URL and your Secret Key into your WooCommerce webhook settings or custom Shopify app. We will automatically log new incoming orders for your store.
                         </p>
                         
                         <div className="space-y-3">
                             <div>
                                 <Label className="text-xs text-muted-foreground">Endpoint URL (POST)</Label>
                                 <code className="block mt-1 p-2 bg-background border rounded-md text-xs font-mono text-primary">
                                     https://api.zeneva.com/v1/business/{business.id}/orders/webhook
                                 </code>
                             </div>
                             <div>
                                 <Label className="text-xs text-muted-foreground">API Secret Key</Label>
                                 <div className="flex gap-2 mt-1">
                                     <div className="relative flex-1">
                                         <Input readOnly type={showOnlineSecret ? 'text' : 'password'} value={business.settings?.onlineOrdersSecret || 'sk_live_zeneva_demo_secret'} className="font-mono text-xs h-9 bg-background pr-10" />
                                         <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setShowOnlineSecret(!showOnlineSecret)}>
                                             {showOnlineSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                         </Button>
                                     </div>
                                     <Button variant="secondary" size="sm" className="shrink-0 h-9" onClick={() => toast({ title: 'Key generated', description: 'New API secret generated. Make sure to update your WooCommerce/Shopify settings.', variant: 'success' })}>Generate New Key</Button>
                                 </div>
                             </div>
                         </div>
                     </div>
                     <div className="border-t border-orange-500/20 pt-4 mt-4 bg-orange-500/5 p-4 rounded-lg">
                         <h4 className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">Expected Payload Format (JSON)</h4>
                         <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-2">Your webhook payload must match this structure for Zeneva to process the order correctly.</p>
                         <pre className="p-4 bg-orange-950/80 text-orange-200 rounded-lg text-[11px] overflow-x-auto shadow-inner font-mono border border-orange-900/50">
{`{
  "order_id": "WC-10293",
  "status": "processing",
  "total": 150.00,
  "currency": "USD",
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "line_items": [
    {
      "product_id": "PROD-123",
      "quantity": 2,
      "price": 75.00
    }
  ]
}`}
                         </pre>
                     </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Custom Website Integration (e.g. Skincare365ng)</CardTitle>
                    <CardDescription>
                        Connect Zeneva directly to your custom website. Zeneva will fetch new orders from your site and push stock level updates when sales are made in-store.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customFetchUrl">Fetch Orders Endpoint URL</Label>
                            <Input 
                                id="customFetchUrl" 
                                placeholder="https://yoursite.com/api/inventory/orders" 
                                value={customFetchUrl} 
                                onChange={e => setCustomFetchUrl(e.target.value)} 
                            />
                            <p className="text-[10px] text-muted-foreground">Zeneva will send a GET request here to import online orders.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customPushUrl">Update Stock Endpoint URL</Label>
                            <Input 
                                id="customPushUrl" 
                                placeholder="https://yoursite.com/api/inventory/stock" 
                                value={customPushUrl} 
                                onChange={e => setCustomPushUrl(e.target.value)} 
                            />
                            <p className="text-[10px] text-muted-foreground">Zeneva will send a PUT request here to update stock levels.</p>
                        </div>
                    </div>
                    <div className="space-y-2 max-w-md">
                        <Label htmlFor="customApiKey">API Key (x-api-key)</Label>
                        <div className="relative">
                            <Input 
                                id="customApiKey" 
                                type={showCustomApiKey ? "text" : "password"}
                                placeholder="default_inventory_key_123" 
                                value={customApiKey} 
                                onChange={e => setCustomApiKey(e.target.value)} 
                                className="pr-10"
                            />
                            <Button 
                                type="button"
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowCustomApiKey(!showCustomApiKey)}
                            >
                                {showCustomApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">This key will be sent in the header of every request for authentication.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleSaveCustomIntegration} disabled={isSavingCustom}>
                            {isSavingCustom ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                            Save Settings
                        </Button>
                        {business?.settings?.customFetchUrl && (
                            <Button variant="secondary" onClick={handleSyncOrders} disabled={isSyncing}>
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <RefreshCw className="h-4 w-4 me-2" />}
                                Sync Orders Now
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
