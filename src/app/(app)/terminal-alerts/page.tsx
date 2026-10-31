'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePOS } from '@/context/pos-context';
import { hasProFeatures } from '@/lib/plan';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Bell, 
  Search, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  TrendingUp,
  Building,
  Eye,
  Trash2,
  Banknote,
  ArrowRightLeft,
  ShieldCheck,
  Printer,
  Copy,
  Share2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { FeatureGateUpgradeCard } from '@/components/shared/feature-gate';
import { useFirestore } from '@/firebase';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import { NOTIFICATION_FETCH_LIMIT } from '@/lib/lifecycle-notifications';
import type { Receipt } from '@/types';

interface TerminalAlert {
  id: string;
  title: string;
  body: string;
  createdAt: any;
  read: boolean;
  type?: string;
  amount?: number;
  reference?: string;
  bankName?: string;
  accountNumber?: string;
}

const MOCK_STARTER_ALERTS: TerminalAlert[] = [
  {
    id: "mock-1",
    title: "Transfer Confirmed",
    body: "Received ₦25,000 from CHINEDU OKOYE",
    createdAt: new Date(),
    read: false,
    amount: 25000,
    bankName: "Guaranty Trust Bank",
    reference: "PS_928172901"
  },
  {
    id: "mock-2",
    title: "Transfer Confirmed",
    body: "Received ₦12,500 from FATIMA BELLO",
    createdAt: new Date(Date.now() - 15 * 60000),
    read: false,
    amount: 12500,
    bankName: "Access Bank",
    reference: "PS_830182903"
  },
  {
    id: "mock-3",
    title: "Transfer Confirmed",
    body: "Received ₦8,000 from TOBI ADEBAYO",
    createdAt: new Date(Date.now() - 42 * 60000),
    read: true,
    amount: 8000,
    bankName: "Opay",
    reference: "PS_291028392"
  },
  {
    id: "mock-4",
    title: "Transfer Confirmed",
    body: "Received ₦150,000 from EZEKIEL RETAILS",
    createdAt: new Date(Date.now() - 90 * 60000),
    read: true,
    amount: 150000,
    bankName: "Zenith Bank",
    reference: "PS_738192837"
  }
];

export default function TerminalAlertsPage() {
  const { currentUserProfile, currencySymbol, business, receipts, fetchReceiptsInRange } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [alerts, setAlerts] = React.useState<TerminalAlert[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [copiedAccount, setCopiedAccount] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });

  // Synthesized Web Audio chime — 100% offline, zero-latency, no external audio downloads
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const playTerminalChime = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Primary crisp bell chime (880Hz -> 1320Hz ascending tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Shimmering second harmonic (1760Hz bell ping)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.08);
      gain2.gain.setValueAtTime(0.22, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.75);
    } catch (err) {
      console.warn('Audio chime playback failed:', err);
    }
  }, []);

  // Compute daily sales KPIs from POSContext receipts with backfill for date ranges
  const [rangeReceipts, setRangeReceipts] = React.useState<Receipt[]>([]);

  React.useEffect(() => {
    const fromDate = date?.from ? startOfDay(safeToDate(date.from)) : startOfDay(new Date());
    const toDate = date?.to ? endOfDay(safeToDate(date.to)) : (date?.from ? endOfDay(safeToDate(date.from)) : endOfDay(new Date()));

    // 1. Immediately filter in-memory synced receipts from POS context
    const inMem = (receipts || []).filter(r => {
      const d = safeToDate(r.createdAt);
      return d >= fromDate && d <= toDate;
    });
    setRangeReceipts(inMem);

    // 2. If range is historical or needs verification, query receipts for that range
    if (fetchReceiptsInRange) {
      let isCancelled = false;
      fetchReceiptsInRange(fromDate, toDate).then(fetched => {
        if (!isCancelled && fetched && fetched.length > 0) {
          setRangeReceipts(fetched);
        }
      }).catch(err => {
        console.warn('Receipts range query failed:', err);
      });
      return () => { isCancelled = true; };
    }
  }, [date, receipts, fetchReceiptsInRange]);

  const { dailyCash, dailyTransferExpected } = React.useMemo(() => {
    let cash = 0;
    let transferExpected = 0;
    for (const r of rangeReceipts) {
      if (r.paymentMethod === 'Cash') cash += (r.total || 0);
      if (r.paymentMethod === 'Bank Transfer') transferExpected += (r.total || 0);
    }
    return { dailyCash: cash, dailyTransferExpected: transferExpected };
  }, [rangeReceipts]);

  // Real-time listener for incoming terminal notifications
  const soundEnabledRef = React.useRef(soundEnabled);
  const isLoadingRef = React.useRef(isLoading);
  const alertCountRef = React.useRef(0);
  React.useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  React.useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  React.useEffect(() => {
    if (!currentUserProfile?.id || !firestore) return;

    const q = query(
      collection(firestore, `users/${currentUserProfile.id}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(NOTIFICATION_FETCH_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts: TerminalAlert[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.type === 'sale' || 
          data.type === 'payment' || 
          data.title?.toLowerCase().includes('payment') || 
          data.title?.toLowerCase().includes('alert')
        ) {
          newAlerts.push({
            id: docSnap.id,
            title: data.title || 'Payment Alert',
            body: data.body || '',
            createdAt: data.createdAt,
            read: data.read || false,
            type: data.type || 'payment',
            amount: data.amount,
            reference: data.reference,
            bankName: data.bankName,
            accountNumber: data.accountNumber
          });
        }
      });

      // Play alert chime when a new payment arrives (skip initial load)
      if (!isLoadingRef.current && newAlerts.length > alertCountRef.current && soundEnabledRef.current) {
        playTerminalChime();
      }

      alertCountRef.current = newAlerts.length;
      setAlerts(newAlerts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to alerts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserProfile?.id, firestore, playTerminalChime]);

  // Total received via Terminal within the selected date filter
  const dailyTransferReceived = React.useMemo(() => {
    const start = date?.from ? startOfDay(safeToDate(date.from)) : startOfDay(new Date());
    const end = date?.to ? endOfDay(safeToDate(date.to)) : (date?.from ? endOfDay(safeToDate(date.from)) : endOfDay(new Date()));
    return alerts
      .filter(a => {
        const d = a.createdAt ? safeToDate(a.createdAt) : new Date();
        return d >= start && d <= end;
      })
      .reduce((sum, a) => {
        const amount = a.amount || parseFloat(a.body.match(/[\d,]+(\.\d+)?/)?.[0]?.replace(/,/g, '') || '0');
        return sum + amount;
      }, 0);
  }, [alerts, date]);

  // Filter alerts by search query and date
  const filteredAlerts = React.useMemo(() => {
    const start = date?.from ? startOfDay(safeToDate(date.from)) : startOfDay(new Date());
    const end = date?.to ? endOfDay(safeToDate(date.to)) : (date?.from ? endOfDay(safeToDate(date.from)) : endOfDay(new Date()));
    return alerts.filter(alert => {
      const alertDate = alert.createdAt ? safeToDate(alert.createdAt) : new Date();
      const isWithinDate = alertDate >= start && alertDate <= end;
      if (!isWithinDate) return false;
      const matchText = `${alert.title} ${alert.body} ${alert.reference || ''} ${alert.bankName || ''}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });
  }, [alerts, searchQuery, date]);

  const handleDeleteAlert = async (id: string) => {
    if (!currentUserProfile?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `users/${currentUserProfile.id}/notifications`, id));
      toast({ title: 'Alert Deleted', description: 'The terminal alert has been removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCopyAccountNumber = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(true);
    toast({
      title: 'Account Number Copied',
      description: `${accNumber} copied to clipboard.`
    });
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleCopyFullDetails = () => {
    const bank = business?.settings?.terminalBankName || 'Wema Bank';
    const num = business?.settings?.terminalAccountNumber || '';
    const name = business?.settings?.terminalAccountName || `Zeneva - ${business?.name || 'Store'}`;
    const text = `*Store Bank Transfer Details*\nBank: ${bank}\nAccount Number: ${num}\nAccount Name: ${name}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Transfer Details Copied',
      description: 'Bank, account number, and name copied to clipboard for customer.'
    });
  };

  const hasAccess = hasProFeatures(business);

  const displayedAlerts = hasAccess ? filteredAlerts : MOCK_STARTER_ALERTS;
  const displayedCash = hasAccess ? dailyCash : 245000;
  const displayedTransferExpected = hasAccess ? dailyTransferExpected : 195500;
  const displayedTransferReceived = hasAccess ? dailyTransferReceived : 195500;

  if (!isMounted) return null;

  return (
    <div className="relative flex flex-col gap-6 min-h-[70vh]">
      <div className={cn("flex flex-col gap-6 transition-all duration-500", !hasAccess && "blur-[3px] pointer-events-none select-none opacity-45")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <PageTitle title="Terminal Alerts" subtitle="Live stream of confirmed payments, instant chimes, and automatic POS reconciliation." />
          <div className="flex items-center gap-2.5 print:hidden flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playTerminalChime();
                toast({
                  title: 'Chime Sound Played',
                  description: 'Terminal alert sound is active and loud.'
                });
              }}
              className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              title="Test chime output"
            >
              <Volume2 className="h-4 w-4 text-emerald-600" />
              Test Chime
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-2"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              {soundEnabled ? "Sound On" : "Sound Muted"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Dedicated Store Terminal Account Banner */}
        {business?.settings?.terminalAccountNumber ? (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 mt-0.5">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Store Dedicated Virtual Account
                      </span>
                      <Badge variant="outline" className="bg-emerald-100/90 text-emerald-800 border-emerald-300 text-[10px] py-0 font-medium">
                        🟢 Active & Monitoring 24/7
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-slate-900 select-all">
                        {business.settings.terminalAccountNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-xs">
                        {business.settings.terminalBankName || 'Wema Bank'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Beneficiary: <span className="font-semibold text-slate-900">{business.settings.terminalAccountName || `Zeneva - ${business.name}`}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCopyAccountNumber(business.settings.terminalAccountNumber!)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                  >
                    {copiedAccount ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedAccount ? 'Copied!' : 'Copy Account'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFullDetails}
                    className="gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    <Share2 className="h-4 w-4 text-slate-600" />
                    Copy Full Info
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Link href="/settings">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Transfers to this account trigger real-time sound chimes and auto-verify POS sales.
                </span>
                <span className="text-slate-400">
                  Daily automated payout settlement
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 mt-0.5">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm">Activate Your Store Virtual Terminal</h4>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                      Setup Required
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Provide customers with a dedicated store account number for zero-friction bank transfers. Confirmed payments chime aloud automatically and reconcile directly into your POS.
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                asChild
                className="bg-primary hover:bg-primary/90 text-white shrink-0 self-start sm:self-center gap-1.5"
              >
                <Link href="/settings">
                  Configure in Settings
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Daily Sales Summary Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">Cash in Drawer</CardTitle>
              <Banknote className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{currencySymbol}{displayedCash.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Physical cash recorded in selected period</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-600">Expected Bank Transfers</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{currencySymbol}{displayedTransferExpected.toLocaleString()}</div>
              <p className="text-xs text-blue-600/70 mt-1">Total transfers processed via POS checkout</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-600">Verified Terminal Transfers</CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">{currencySymbol}{displayedTransferReceived.toLocaleString()}</div>
              <p className="text-xs text-emerald-600/70 mt-1">Confirmed landing directly in terminal</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between max-w-full print:hidden">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by amount, bank, or transaction reference..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <DateRangePicker
              date={date}
              onDateChange={setDate}
            />
          </div>
        </div>

        {/* Live Feed Table */}
        <div className="flex-grow flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <span className="text-sm text-muted-foreground font-medium">Connecting to live Terminal feed...</span>
            </div>
          ) : displayedAlerts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
              <Bell className="h-16 w-16 text-muted-foreground/30 mb-4 animate-bounce" />
              <CardTitle className="text-lg font-semibold mb-2">No Terminal Alerts Yet</CardTitle>
              <CardDescription className="max-w-sm">
                All confirmed payments made to your Zeneva Terminal account will appear here in real-time with sound alerts.
              </CardDescription>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Destination Bank</TableHead>
                      <TableHead>Reference ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right print:hidden">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAlerts.map((alert) => {
                      const alertDate = alert.createdAt ? safeToDate(alert.createdAt) : new Date();
                      const amountText = alert.amount?.toLocaleString() || alert.body.match(/₦[\d,]+/)?.[0].replace('₦', '') || 'Confirmed';
                      
                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" />
                              {alertDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <div className="truncate text-xs text-slate-500" title={alert.body}>
                              <span className="font-semibold text-slate-900 block truncate text-sm">{alert.title}</span>
                              {alert.body}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                            {currencySymbol}{amountText}
                          </TableCell>
                          <TableCell>
                            {alert.bankName ? (
                              <span className="flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
                                <Building className="h-3.5 w-3.5 text-slate-400" />
                                {alert.bankName}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                            {alert.reference || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <div className="flex justify-end items-center gap-2">
                              <Button variant="ghost" size="icon" asChild title="Trace Receipt">
                                <Link href={`/receipts?search=${alert.reference || alert.id}`}>
                                  <Eye className="h-4 w-4 text-slate-500" />
                                </Link>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteAlert(alert.id)}
                                title="Delete Alert"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {!hasAccess && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-background/5 backdrop-blur-[2px] pointer-events-auto">
          <FeatureGateUpgradeCard
            featureName="Zeneva Terminal Alerts"
            featureDescription="Never ask customers for screenshots or call your bank again. Get instant audio notifications as soon as transfers hit your accounts."
            requiredPlan="business"
            icon={Bell}
            featurePoints={[
              { title: "Real-time Chimes", description: "Sound alerts play instantly when operator receives transfers." },
              { title: "Permanent Store DVAs", description: "Customers transfer directly to your static business account." },
              { title: "Auto Payout Settlement", description: "Money lands in your local bank automatically within 24 hours." },
              { title: "0% Processing Markups", description: "Pay only standard processing gateway fees." }
            ]}
          />
        </div>
      )}
    </div>
  );
}
