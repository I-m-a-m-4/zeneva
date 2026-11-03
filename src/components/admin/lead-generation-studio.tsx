'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Search,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  Check,
  BookmarkPlus,
  BookmarkCheck,
  MapPin,
  TrendingUp,
  Store,
  Zap,
  Target,
  RefreshCw,
  Building2,
  Users,
  Send,
  Droplets,
  ShieldCheck,
  Clock,
  Calendar,
  Globe,
  Flame,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { idToken } from '@/lib/id-token';
import type { DiscoveredLead } from '@/lib/server/exa-client';

interface PersonaPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  category: string;
  defaultLocation: string;
  defaultQuery: string;
  icon: React.ElementType;
}

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'top-electronics',
    name: 'Top Merchant Lookalike: Electrical & Electronics',
    badge: 'Modeled after Uv Electric',
    description: 'High-volume electrical supplies, appliance showrooms, inverter/solar parts, and gadget wholesalers with multi-item receipts.',
    category: 'Electrical & Electronics',
    defaultLocation: 'Lagos & Abuja, Nigeria',
    defaultQuery: 'wholesale electrical supplies electronics gadgets lighting and appliance distributors showroom with phone',
    icon: Zap,
  },
  {
    id: 'top-cosmetics',
    name: 'Top Merchant Lookalike: Skincare & Cosmetics',
    badge: 'Modeled after Safeway Skincare',
    description: 'High-margin beauty boutiques, skincare specialists, cosmetics wholesalers, and luxury fragrance distributors.',
    category: 'Skincare & Cosmetics',
    defaultLocation: 'Lagos, Nigeria',
    defaultQuery: 'premium beauty supply cosmetics skincare shops wholesale beauty distributors with contact details and address',
    icon: Store,
  },
  {
    id: 'fast-supermarkets',
    name: 'High-Velocity Supermarkets & Minimarts',
    badge: 'High Cashier Volume',
    description: 'Retailers with 1,000+ SKUs needing offline-first cashier lanes that never freeze during network dips and thermal barcode printers.',
    category: 'Supermarkets & Groceries',
    defaultLocation: 'Nigeria',
    defaultQuery: 'supermarket retail branches minimarts grocery stores showroom branches with phone contact and address',
    icon: Building2,
  },
  {
    id: 'pharmacies',
    name: 'Pharmacies & Healthcare Retailers',
    badge: 'High Compliance & Debts',
    description: 'Chemist shops and pharmacy chains requiring batch expiry alerts, prescription tracking, and customer debt ledger.',
    category: 'Pharmacies & Health',
    defaultLocation: 'Abuja & Lagos, Nigeria',
    defaultQuery: 'pharmacy chemist retail branches healthcare drug stores with phone number and location',
    icon: Target,
  },
  {
    id: 'churn-revival',
    name: 'Churned Merchant Lookalikes (Low Tech Barrier)',
    badge: 'Zero-Setup Pitch',
    description: 'Retailers who dropped off complex cloud ERP systems because of complexity or internet instability, primed for Zeneva offline simplicity.',
    category: 'General Retail',
    defaultLocation: 'Nigeria',
    defaultQuery: 'commercial hub retail shops hardware boutique stores with telephone and storefront in Nigeria',
    icon: Users,
  },
];

export function LeadGenerationStudio() {
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'discover' | 'saved'>('discover');
  const [selectedPersona, setSelectedPersona] = useState<PersonaPreset>(PERSONA_PRESETS[0]);
  const [searchQuery, setSearchQuery] = useState(PERSONA_PRESETS[0].defaultQuery);
  const [location, setLocation] = useState(PERSONA_PRESETS[0].defaultLocation);
  const [category, setCategory] = useState(PERSONA_PRESETS[0].category);
  const [numResults, setNumResults] = useState(10);
  const [searchProvider, setSearchProvider] = useState<'hybrid' | 'tavily' | 'exa'>('hybrid');
  const [autoWaterfall, setAutoWaterfall] = useState(true);

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>(null);

  // Enrichment state (Prospeo Waterfall)
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  // Outreach Email modal state (Resend)
  const [outreachModalLead, setOutreachModalLead] = useState<any | null>(null);
  const [outreachSubject, setOutreachSubject] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [isSendingOutreach, setIsSendingOutreach] = useState(false);

  // Daily Batch Dispatch state
  const [isDispatchingBatch, setIsDispatchingBatch] = useState(false);
  const [batchLimit, setBatchLimit] = useState(5);

  // Saved leads CRM state
  const [savedLeads, setSavedLeads] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    fetchSavedLeads();
  }, []);

  const handleSelectPersona = (preset: PersonaPreset) => {
    setSelectedPersona(preset);
    setSearchQuery(preset.defaultQuery);
    setLocation(preset.defaultLocation);
    setCategory(preset.category);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast({ variant: 'destructive', title: 'Query Required', description: 'Please enter a search query.' });
      return;
    }

    setLoading(true);
    setLeads([]);

    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: searchQuery.trim(),
          category,
          location,
          numResults,
          persona: selectedPersona.id,
          provider: searchProvider,
          autoWaterfall,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to search leads.');
      }

      setLeads(data.leads || []);
      toast({
        variant: 'success',
        title: 'Prospects Discovered!',
        description: `Found ${data.leads?.length || 0} targeted retail stores via ${data.provider || searchProvider}.`,
      });
    } catch (err: any) {
      console.error('Lead search error:', err);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: err.message || 'Could not fetch leads.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedLeads = async () => {
    setLoadingSaved(true);
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/manage', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.leads)) {
        setSavedLeads(data.leads);
        setSavedIds(new Set(data.leads.map((l: any) => l.url || l.title)));
      }
    } catch (err) {
      console.warn('Failed to load saved leads:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSaveLead = async (lead: any) => {
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...lead,
          persona: selectedPersona.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save lead');

      setSavedIds(prev => new Set(prev).add(lead.url || lead.title));
      toast({
        variant: 'success',
        title: 'Lead Bookmarked!',
        description: `${lead.title} saved to CRM pipeline.`,
      });
      fetchSavedLeads();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    }
  };

  const handleUpdateLeadStatus = async (id: string, newStatus: string) => {
    try {
      const token = await idToken();
      await fetch('/api/admin/leads/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setSavedLeads(prev => prev.map(l => (l.id === id ? { ...l, status: newStatus } : l)));
      toast({ title: 'Status Updated', description: `Lead moved to ${newStatus}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  };

  // Run Prospeo Waterfall Email Enrichment for a specific lead
  const handleEnrichLead = async (lead: any) => {
    setEnrichingId(lead.id);
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leadId: lead.id,
          domain: lead.domain,
          companyName: lead.title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Waterfall enrichment failed');

      const enrichment = data.enrichment;
      if (enrichment?.email) {
        // Update local state in leads and savedLeads
        const updater = (prevList: any[]) =>
          prevList.map(item =>
            item.id === lead.id
              ? {
                  ...item,
                  email: enrichment.email,
                  emailStatus: enrichment.emailStatus,
                  decisionMaker: enrichment.fullName,
                  jobTitle: enrichment.jobTitle,
                  phone: item.phone || enrichment.phone,
                }
              : item
          );

        setLeads(updater);
        setSavedLeads(updater);

        toast({
          variant: 'success',
          title: 'Waterfall Enrichment Success!',
          description: `Discovered verified email: ${enrichment.email} ${enrichment.fullName ? `(${enrichment.fullName})` : ''}`,
        });
      } else {
        toast({
          title: 'No Work Email Discovered',
          description: 'Prospeo waterfall found no public verified corporate mail for this domain.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Enrichment Failed',
        description: err.message || 'Could not reach Prospeo API.',
      });
    } finally {
      setEnrichingId(null);
    }
  };

  // Open the Resend Email Modal
  const openOutreachModal = (lead: any) => {
    setOutreachModalLead(lead);
    setOutreachSubject(lead.emailDraft?.subject || `Quick question regarding checkout & inventory speed at ${lead.title}`);
    setOutreachBody(lead.emailDraft?.body || '');
  };

  // Send single outreach email via Resend
  const handleSendSingleOutreach = async () => {
    if (!outreachModalLead?.email) {
      toast({ variant: 'destructive', title: 'Missing Email', description: 'Lead must have a valid email.' });
      return;
    }

    setIsSendingOutreach(true);
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'single',
          leadId: outreachModalLead.id,
          email: outreachModalLead.email,
          businessName: outreachModalLead.title,
          category: outreachModalLead.category,
          recipientName: outreachModalLead.decisionMaker,
          location: outreachModalLead.location,
          customSubject: outreachSubject,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to dispatch email');

      toast({
        variant: 'success',
        title: 'Outreach Email Dispatched!',
        description: `Delivered via Resend to ${outreachModalLead.email} with open-tracking.`,
      });

      // Update local status
      setSavedLeads(prev =>
        prev.map(l => (l.id === outreachModalLead.id ? { ...l, status: 'contacted' } : l))
      );

      setOutreachModalLead(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Dispatch Failed',
        description: err.message || 'Error sending email via Resend.',
      });
    } finally {
      setIsSendingOutreach(false);
    }
  };

  // Run daily automated batch dispatch
  const handleRunDailyBatch = async () => {
    setIsDispatchingBatch(true);
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/leads/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'daily_batch',
          batchLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Batch dispatch failed');

      if (data.sentCount > 0) {
        toast({
          variant: 'success',
          title: `Daily Batch Complete! (${data.sentCount} Sent)`,
          description: `Dispatched customized retail outreach emails to ${data.sentCount} queued leads via Resend.`,
        });
        fetchSavedLeads();
      } else {
        toast({
          title: 'No Pending Leads Ready',
          description: data.message || 'No saved leads with emails are waiting for outreach.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Batch Dispatch Failed',
        description: err.message || 'Error running daily dispatch.',
      });
    } finally {
      setIsDispatchingBatch(false);
    }
  };

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to Clipboard!', description: `${label} ready to paste.` });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const verifiedSavedCount = savedLeads.filter(l => l.email && l.status !== 'contacted').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Tavily & Prospeo Intelligence Status */}
      <div className="relative overflow-hidden rounded-xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Client Discovery, Waterfall Enrichment & Outreach
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Find target storefronts using multi-engine search (Tavily Deep Web + Exa Neural), enrich verified work emails with Prospeo Waterfall, and dispatch customized retail cold outreach directly via Resend.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 py-1 px-2.5 text-xs">
              <Globe className="h-3 w-3" /> Tavily AI Live
            </Badge>
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 py-1 px-2.5 text-xs">
              <Droplets className="h-3 w-3" /> Prospeo Waterfall
            </Badge>
            <Badge className="bg-orange-600 hover:bg-orange-700 text-white gap-1 py-1 px-2.5 text-xs">
              <Send className="h-3 w-3" /> Resend Outreach
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs: Discovery vs Saved CRM */}
      <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="discover" className="gap-2">
              <Search className="h-4 w-4" /> Discover Leads
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <BookmarkCheck className="h-4 w-4 text-orange-600" /> Saved CRM ({savedLeads.length})
            </TabsTrigger>
          </TabsList>

          {activeSubTab === 'saved' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSavedLeads}
                disabled={loadingSaved}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSaved ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: DISCOVER LEADS */}
        <TabsContent value="discover" className="space-y-6 mt-0">
          {/* Persona Presets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Merchant Target Profile
              </h3>
              <span className="text-[11px] text-orange-700 font-medium">Modeled after real high-GMV stores</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {PERSONA_PRESETS.map((preset) => {
                const isSelected = selectedPersona.id === preset.id;
                const Icon = preset.icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPersona(preset)}
                    className={`text-left p-3.5 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/70 shadow-sm ring-1 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-orange-800 bg-orange-100/80 px-2 py-0.5 rounded-full">
                          {preset.badge}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">{preset.name}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{preset.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Query & Engine Configuration */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Search className="h-4 w-4 text-orange-600" />
                    2. Query & Engine Configuration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure search provider, geo-location, and automated email waterfall enrichment.
                  </CardDescription>
                </div>

                {/* Engine Selector Segmented Control */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSearchProvider('hybrid')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      searchProvider === 'hybrid'
                        ? 'bg-white text-orange-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Hybrid Engine
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchProvider('tavily')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      searchProvider === 'tavily'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 Tavily Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchProvider('exa')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      searchProvider === 'exa'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🧠 Exa Neural
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Semantic Search Prompt</label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. wholesale electronics and phone accessories showroom with contact in Lagos"
                    className="text-xs h-10 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Target Category</label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Electrical & Electronics"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Location / Region</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Lagos, Nigeria"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Max Results</label>
                    <select
                      value={numResults}
                      onChange={(e) => setNumResults(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-slate-50/50 px-2 py-1 text-xs font-medium focus:bg-white"
                    >
                      <option value={5}>5 Leads</option>
                      <option value={10}>10 Leads</option>
                      <option value={15}>15 Leads</option>
                      <option value={20}>20 Leads</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoWaterfall}
                      onChange={(e) => setAutoWaterfall(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                    />
                    <span>Auto-run Prospeo Waterfall Email Enrichment on top leads</span>
                  </label>

                  <Button
                    type="submit"
                    disabled={loading || !searchQuery.trim()}
                    className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs h-9 w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning Web & Registries...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run Client Discovery ({searchProvider})
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results Deck */}
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-9 w-9 animate-spin text-orange-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Searching web & registries via {searchProvider}...</p>
                <p className="text-xs text-slate-500">
                  Parsing storefronts, extracting phone numbers, and discovering verified decision maker emails...
                </p>
              </div>
            </div>
          )}

          {!loading && leads.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Discovered Store Leads ({leads.length})
                  </h3>
                  <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                    {category} · {location}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {leads.map((lead) => {
                  const isSaved = savedIds.has(lead.url || lead.title);
                  const isPlaybookOpen = expandedPlaybookId === lead.id;
                  const isEnriching = enrichingId === lead.id;

                  return (
                    <Card
                      key={lead.id}
                      className="border-slate-200 hover:border-orange-200 transition-all duration-200 bg-white shadow-sm"
                    >
                      <CardContent className="p-5 space-y-4">
                        {/* Header: Title, URL, Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-bold text-slate-900">{lead.title}</h4>
                              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none text-[10px]">
                                {lead.domain}
                              </Badge>
                              {lead.phone && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                                  <Phone className="h-3 w-3" /> Phone Detected
                                </Badge>
                              )}
                              {lead.email ? (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1">
                                  <ShieldCheck className="h-3 w-3" /> {lead.emailStatus || 'Email Found'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] gap-1">
                                  Email Missing
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {lead.location}
                              </span>
                              <span>·</span>
                              <span className="font-medium text-slate-700">{lead.category}</span>
                              {lead.decisionMaker && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-blue-800">
                                    Contact: {lead.decisionMaker} {lead.jobTitle ? `(${lead.jobTitle})` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {lead.url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 text-xs gap-1 text-slate-600 hover:text-slate-900"
                              >
                                <a href={lead.url} target="_blank" rel="noopener noreferrer">
                                  Visit Store <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}

                            {/* Prospeo Waterfall Email Finder */}
                            {!lead.email && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEnrichLead(lead)}
                                disabled={isEnriching}
                                className="h-8 text-xs gap-1.5 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                title="Run Prospeo Waterfall to uncover corporate decision maker work email"
                              >
                                {isEnriching ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waterfalling...
                                  </>
                                ) : (
                                  <>
                                    <Droplets className="h-3.5 w-3.5 text-blue-600" /> Enrich Email (Prospeo)
                                  </>
                                )}
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveLead(lead)}
                              disabled={isSaved}
                              className={`h-8 text-xs gap-1.5 ${
                                isSaved
                                  ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                  : 'text-orange-700 border-orange-300 hover:bg-orange-50'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <BookmarkCheck className="h-3.5 w-3.5" /> Saved
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="h-3.5 w-3.5" /> Save Lead
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <p className="font-semibold text-slate-900 mb-1">Store Intelligence & Products:</p>
                          <p>{lead.summary}</p>
                        </div>

                        {/* Direct Contact & Outreach Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {lead.phone ? (
                              <div className="flex items-center gap-1.5 font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                <span>+{lead.phone}</span>
                              </div>
                            ) : null}

                            {lead.email ? (
                              <div className="flex items-center gap-1.5 font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                <Mail className="h-3.5 w-3.5 text-blue-600" />
                                <span>{lead.email}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {lead.phone && (
                              <Button
                                size="sm"
                                asChild
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                              >
                                <a
                                  href={`https://wa.me/${lead.phone}?text=${encodeURIComponent(lead.whatsappMessage)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Pitch
                                </a>
                              </Button>
                            )}

                            {lead.email && (
                              <Button
                                size="sm"
                                onClick={() => openOutreachModal(lead)}
                                className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white gap-1.5 shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5" /> Send Email (Resend)
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedPlaybookId(isPlaybookOpen ? null : lead.id)}
                              className="h-8 text-xs text-orange-700 hover:bg-orange-50 gap-1"
                            >
                              {isPlaybookOpen ? 'Hide Pitch' : 'View Pitch'}
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Outreach Playbook */}
                        {isPlaybookOpen && (
                          <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/30 space-y-3 text-xs animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-orange-950">
                                <Sparkles className="h-4 w-4 text-orange-600" />
                                <span>Personalized Zeneva Pitch Angle</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-white border-orange-200">
                                {lead.pitchAngle}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* WhatsApp Copy Box */}
                              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp Message
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(lead.whatsappMessage, `${lead.id}-wa`, 'WhatsApp message')}
                                    className="h-7 text-[11px] gap-1 px-2"
                                  >
                                    {copiedId === `${lead.id}-wa` ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" /> Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 max-h-48 overflow-y-auto">
                                  {lead.whatsappMessage}
                                </pre>
                              </div>

                              {/* Cold Email Copy Box */}
                              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-blue-800 flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-blue-600" /> Cold Email Proposal
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(
                                        `Subject: ${lead.emailDraft?.subject}\n\n${lead.emailDraft?.body}`,
                                        `${lead.id}-email`,
                                        'Email proposal'
                                      )
                                    }
                                    className="h-7 text-[11px] gap-1 px-2"
                                  >
                                    {copiedId === `${lead.id}-email` ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" /> Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-slate-500">
                                    Subject: <span className="text-slate-800">{lead.emailDraft?.subject}</span>
                                  </p>
                                  <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 max-h-44 overflow-y-auto">
                                    {lead.emailDraft?.body}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
              <Store className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No leads retrieved yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select one of the merchant personas above or write a custom semantic search prompt, then click &quot;Run Client Discovery&quot;.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SAVED LEADS CRM & DAILY DISPATCH QUEUE */}
        <TabsContent value="saved" className="space-y-4 mt-0">
          {/* Daily Automated Dispatch Control Card */}
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50/60 to-amber-50/40">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Daily Automated Outreach Dispatch (Resend Engine)
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Sends personalized retail pitch emails to queued prospects with 1x1 open-tracking. Currently 
                  <strong className="text-orange-950 font-bold mx-1">{verifiedSavedCount} leads</strong> ready.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <span>Batch:</span>
                  <select
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(Number(e.target.value))}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value={3}>3 leads / day</option>
                    <option value={5}>5 leads / day</option>
                    <option value={10}>10 leads / day</option>
                    <option value={15}>15 leads / day</option>
                  </select>
                </div>

                <Button
                  onClick={handleRunDailyBatch}
                  disabled={isDispatchingBatch || verifiedSavedCount === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs h-8 shadow-sm"
                >
                  {isDispatchingBatch ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Run Today&apos;s Dispatch Batch
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Saved Prospects Pipeline</h3>
              <p className="text-xs text-slate-500">
                Manage communications, track outreach states, and run waterfall enrichment.
              </p>
            </div>
          </div>

          {loadingSaved ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600 mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading saved leads...</p>
            </div>
          ) : savedLeads.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
              <BookmarkPlus className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No saved leads yet</h4>
              <p className="text-xs text-slate-500">
                Switch to the &quot;Discover Leads&quot; tab, run a search, and click &quot;Save Lead&quot; on any prospect to track them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedLeads.map((item) => {
                const isEnriching = enrichingId === item.id;

                return (
                  <Card key={item.id} className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                          <Badge variant="outline" className="text-[10px]">
                            {item.category}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              item.status === 'converted'
                                ? 'bg-emerald-600 text-white'
                                : item.status === 'contacted'
                                ? 'bg-blue-600 text-white'
                                : item.status === 'demo_scheduled'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {item.status?.toUpperCase() || 'NEW'}
                          </Badge>
                          {item.decisionMaker && (
                            <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                              {item.decisionMaker}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {item.phone && (
                            <span className="flex items-center gap-1 font-mono text-emerald-700">
                              <Phone className="h-3 w-3" /> +{item.phone}
                            </span>
                          )}
                          {item.email ? (
                            <span className="flex items-center gap-1 font-mono text-blue-700">
                              <Mail className="h-3 w-3" /> {item.email}
                            </span>
                          ) : (
                            <span className="text-amber-700 italic text-[11px]">No email</span>
                          )}
                          <span>· {item.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* Waterfall button if email missing */}
                        {!item.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnrichLead(item)}
                            disabled={isEnriching}
                            className="h-8 text-xs gap-1 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            {isEnriching ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Droplets className="h-3 w-3 text-blue-600" />
                            )}
                            Enrich (Prospeo)
                          </Button>
                        )}

                        {item.phone && (
                          <Button
                            size="sm"
                            asChild
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <a
                              href={`https://wa.me/${item.phone}?text=${encodeURIComponent(item.whatsappMessage || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </Button>
                        )}

                        {item.email && (
                          <Button
                            size="sm"
                            onClick={() => openOutreachModal(item)}
                            className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white gap-1 shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5" /> Send Email
                          </Button>
                        )}

                        <select
                          value={item.status || 'new'}
                          onChange={(e) => handleUpdateLeadStatus(item.id, e.target.value)}
                          className="h-8 rounded-md border border-input bg-white px-2 py-1 text-xs font-medium"
                        >
                          <option value="new">New Lead</option>
                          <option value="queued">Queued for Daily Dispatch</option>
                          <option value="contacted">Contacted</option>
                          <option value="demo_scheduled">Demo Scheduled</option>
                          <option value="converted">Converted (Signed Up)</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Outreach Email Dispatch Modal */}
      <Dialog open={!!outreachModalLead} onOpenChange={(open) => !open && setOutreachModalLead(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Send className="h-4 w-4 text-orange-600" />
              Dispatch Cold Outreach Email via Resend
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sending to <strong className="text-slate-800">{outreachModalLead?.email}</strong> ({outreachModalLead?.title})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Subject Line</label>
              <Input
                value={outreachSubject}
                onChange={(e) => setOutreachSubject(e.target.value)}
                className="text-xs h-9 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Outreach Message Body</label>
                <span className="text-[10px] text-slate-500">Includes live demo link, WhatsApp CTA, and 1x1 open pixel</span>
              </div>
              <Textarea
                rows={10}
                value={outreachBody}
                onChange={(e) => setOutreachBody(e.target.value)}
                className="text-xs font-mono leading-relaxed"
              />
            </div>

            <div className="p-3 bg-orange-50/70 rounded-lg border border-orange-200/60 text-xs text-orange-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-orange-600" />
                <span>Deliverability Protection Enabled</span>
              </div>
              <p className="text-[11px] text-orange-900/80">
                Email will be sent from <strong>hello@zeneva.space</strong> using the responsive Zeneva retail shell, with RFC 8058 one-click unsubscribe and behavioral open-rate tracking.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOutreachModalLead(null)}
              disabled={isSendingOutreach}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendSingleOutreach}
              disabled={isSendingOutreach}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5"
            >
              {isSendingOutreach ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching via Resend...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send Outreach Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
