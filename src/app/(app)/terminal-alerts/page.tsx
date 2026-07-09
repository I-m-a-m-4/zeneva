'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePOS } from '@/context/pos-context';
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
  Printer
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

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

export default function TerminalAlertsPage() {
  const { currentUserProfile, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [alerts, setAlerts] = React.useState<TerminalAlert[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Daily Stats State
  const [dailyCash, setDailyCash] = React.useState(0);
  const [dailyTransferExpected, setDailyTransferExpected] = React.useState(0);
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });

  // Audio elements for alerts
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    // Create audio context or sound element
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
  }, []);

  // Fetch today's receipts for the summary cards
  React.useEffect(() => {
    if (!currentUserProfile?.id || !firestore) return;

    const fromDate = date?.from || startOfDay(new Date());
    const toDate = date?.to || endOfDay(new Date());

    const q = query(
      collection(firestore, `users/${currentUserProfile.id}/receipts`),
      where('createdAt', '>=', fromDate),
      where('createdAt', '<=', toDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let cash = 0;
      let transferExpected = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.paymentMethod === 'Cash') cash += (data.total || 0);
        if (data.paymentMethod === 'Bank Transfer') transferExpected += (data.total || 0);
      });

      setDailyCash(cash);
      setDailyTransferExpected(transferExpected);
    });

    return () => unsubscribe();
  }, [currentUserProfile?.id, firestore, date]);


  React.useEffect(() => {
    if (!currentUserProfile?.id || !firestore) return;

    const q = query(
      collection(firestore, `users/${currentUserProfile.id}/notifications`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts: TerminalAlert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for payment/sale related alerts
        if (data.type === 'sale' || data.type === 'payment' || data.title?.toLowerCase().includes('payment') || data.title?.toLowerCase().includes('alert')) {
          newAlerts.push({
            id: doc.id,
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

      // Play alert sound if a new payment alert arrives and we aren't loading first batch
      if (!isLoading && newAlerts.length > alerts.length && soundEnabled) {
        audioRef.current?.play().catch(err => console.log('Audio playback prevented:', err));
      }

      setAlerts(newAlerts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to alerts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserProfile?.id, firestore, soundEnabled, isLoading, alerts.length]);

  // Compute total received via Terminal today
  const dailyTransferReceived = React.useMemo(() => {
    const start = date?.from || startOfDay(new Date());
    const end = date?.to || endOfDay(new Date());
    return alerts
      .filter(a => {
        const d = a.createdAt ? safeToDate(a.createdAt) : new Date();
        return d >= start && d <= end;
      })
      .reduce((sum, a) => {
        const amount = a.amount || parseFloat(a.body.match(/[\d,]+(\.\d+)?/)?.[0]?.replace(/,/g, '') || '0');
        return sum + amount;
      }, 0);
  }, [alerts]);

  // Filter alerts by search query and date
  const filteredAlerts = React.useMemo(() => {
    const start = date?.from || startOfDay(new Date());
    const end = date?.to || endOfDay(new Date());
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b pb-4">
        <PageTitle title="Terminal Alerts" subtitle="Live stream of confirmed payments and transfers." />
        <div className="flex items-center gap-3 print:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Export PDF
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
        </div>
      </div>

      {/* Daily Sales Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">Today's Cash Sales</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{currencySymbol}{dailyCash.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Total physical cash expected in drawer</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-blue-600">Expected Bank Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{currencySymbol}{dailyTransferExpected.toLocaleString()}</div>
            <p className="text-xs text-blue-600/70 mt-1">Total transfers processed via POS</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-emerald-600">Verified Transfers</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{currencySymbol}{dailyTransferReceived.toLocaleString()}</div>
            <p className="text-xs text-emerald-600/70 mt-1">Confirmed landing in terminal</p>
          </CardContent>
        </Card>
      </div>

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
            setDate={setDate}
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground font-medium">Connecting to live Terminal feed...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
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
                  {filteredAlerts.map((alert) => {
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
  );
}
