'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>(null);

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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to search leads using Exa.');
      }

      setLeads(data.leads || []);
      toast({
        variant: 'success',
        title: 'Leads Discovered!',
        description: `Found ${data.leads?.length || 0} targeted retail prospects via Exa AI.`,
      });
    } catch (err: any) {
      console.error('Lead search error:', err);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: err.message || 'Could not fetch leads from Exa API.',
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

  const handleSaveLead = async (lead: DiscoveredLead) => {
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
        description: `${lead.title} saved to CRM.`,
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

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to Clipboard!', description: `${label} ready to paste.` });
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Exa Semantic Client Discovery & Intelligence
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Use neural semantic queries modeled after Zeneva’s top-performing active retail merchants (e.g. Electrical Wholesalers, Cosmetics, Supermarkets) to discover high-value storefront leads, extract verified WhatsApp/phone contacts, and generate high-conversion outreach pitches.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 py-1 px-3 text-xs">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Exa.ai Neural Engine Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs: Discovery vs Saved CRM */}
      <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="discover" className="gap-2">
              <Search className="h-4 w-4" /> Discover Leads
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <BookmarkCheck className="h-4 w-4 text-orange-600" /> Saved CRM ({savedLeads.length})
            </TabsTrigger>
          </TabsList>

          {activeSubTab === 'saved' && (
            <Button variant="outline" size="sm" onClick={fetchSavedLeads} disabled={loadingSaved} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingSaved ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          )}
        </div>

        {/* TAB 1: DISCOVER LEADS */}
        <TabsContent value="discover" className="space-y-6 mt-0">
          {/* Persona Presets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Select Target Merchant Persona (Derived from Real Zeneva Store Profiles)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PERSONA_PRESETS.map((preset) => {
                const isSelected = selectedPersona.id === preset.id;
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPersona(preset)}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-400/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            isSelected ? 'border-orange-400 text-orange-800 bg-orange-100' : 'text-slate-500'
                          }`}
                        >
                          {preset.badge}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{preset.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Controls Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-bold text-slate-900">
                2. Semantic Search Parameters
              </CardTitle>
              <CardDescription className="text-xs">
                Exa will perform neural embedding search across live web directories, Google Business, Facebook Storefronts, and local business registries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Semantic Query Prompt</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Electrical supplies wholesalers with showroom phone contact in Alaba Lagos"
                        className="pl-9 text-xs font-medium bg-slate-50/50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Target Region / Hub</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Lagos & Abuja, Nigeria"
                      className="text-xs font-medium bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Retail Category</label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Electrical & Electronics"
                      className="text-xs font-medium bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Results</label>
                    <select
                      value={numResults}
                      onChange={(e) => setNumResults(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-slate-50/50 px-2 py-1 text-xs font-medium focus:bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-600" />
                    <span>Neural rank prioritization enabled for stores with direct telephone lines.</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !searchQuery.trim()}
                    className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs h-9"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning with Exa AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run Semantic Lead Discovery
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
                <p className="text-sm font-bold text-slate-800">Searching web & business registries via Exa...</p>
                <p className="text-xs text-slate-500">
                  Parsing retail storefronts, phone contacts, and synthesizing tailored outreach pitches...
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

                  return (
                    <Card
                      key={lead.id}
                      className="border-slate-200 hover:border-orange-200 transition-all duration-200 bg-white"
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
                                  <Phone className="h-3 w-3" /> Phone Available
                                </Badge>
                              )}
                              {lead.email && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1">
                                  <Mail className="h-3 w-3" /> Email Available
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {lead.location}
                              </span>
                              <span>·</span>
                              <span className="font-medium text-slate-700">{lead.category}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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

                        {/* Summary from Exa */}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <p className="font-semibold text-slate-900 mb-1">Store Intelligence & Products:</p>
                          <p>{lead.summary}</p>
                        </div>

                        {/* Direct Contact Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {lead.phone ? (
                              <div className="flex items-center gap-1.5 font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                <span>+{lead.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No direct phone detected</span>
                            )}

                            {lead.email ? (
                              <div className="flex items-center gap-1.5 font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                <Mail className="h-3.5 w-3.5 text-blue-600" />
                                <span>{lead.email}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
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
                                variant="outline"
                                asChild
                                className="h-8 text-xs text-slate-700 hover:text-slate-900 gap-1.5"
                              >
                                <a
                                  href={`mailto:${lead.email}?subject=${encodeURIComponent(
                                    lead.emailDraft.subject
                                  )}&body=${encodeURIComponent(lead.emailDraft.body)}`}
                                >
                                  <Mail className="h-3.5 w-3.5" /> Send Email
                                </a>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedPlaybookId(isPlaybookOpen ? null : lead.id)}
                              className="h-8 text-xs text-orange-700 hover:bg-orange-50 gap-1"
                            >
                              {isPlaybookOpen ? 'Hide Outreach Copy' : 'View Outreach Copy'}
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
                                        `Subject: ${lead.emailDraft.subject}\n\n${lead.emailDraft.body}`,
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
                                    Subject: <span className="text-slate-800">{lead.emailDraft.subject}</span>
                                  </p>
                                  <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 max-h-44 overflow-y-auto">
                                    {lead.emailDraft.body}
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
                Select one of the merchant personas above or write a custom semantic search prompt, then click &quot;Run Semantic Lead Discovery&quot;.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SAVED LEADS CRM */}
        <TabsContent value="saved" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Saved Prospects Pipeline</h3>
              <p className="text-xs text-slate-500">
                Track outreach status and manage communications with retail businesses found through Exa AI.
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
              {savedLeads.map((item) => (
                <Card key={item.id} className="border-slate-200 bg-white">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
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
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {item.phone && (
                          <span className="flex items-center gap-1 font-mono text-emerald-700">
                            <Phone className="h-3 w-3" /> +{item.phone}
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center gap-1 font-mono text-blue-700">
                            <Mail className="h-3 w-3" /> {item.email}
                          </span>
                        )}
                        <span>· {item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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

                      <select
                        value={item.status || 'new'}
                        onChange={(e) => handleUpdateLeadStatus(item.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-white px-2 py-1 text-xs font-medium"
                      >
                        <option value="new">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="demo_scheduled">Demo Scheduled</option>
                        <option value="converted">Converted (Signed Up)</option>
                        <option value="not_interested">Not Interested</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
