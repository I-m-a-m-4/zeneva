'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Volume2, 
  VolumeX, 
  Play,
  TrendingUp,
  ShieldCheck,
  Building
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

  // Audio elements for alerts
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    // Create audio context or sound element
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
  }, []);

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

  // Filter alerts by search query
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter(alert => {
      const matchText = `${alert.title} ${alert.body} ${alert.reference || ''} ${alert.bankName || ''}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });
  }, [alerts, searchQuery]);

  // Trigger a test alert in development
  const handleTriggerTestAlert = async () => {
    if (!currentUserProfile?.id || !firestore) return;
    try {
      const testAmount = Math.floor(Math.random() * 45000) + 5000;
      const references = ['TXN893274982', 'TXN304928402', 'TXN029384920'];
      const banks = ['Access Bank', 'GTBank', 'Wema Bank', 'Zenith Bank'];
      
      await addDoc(collection(firestore, `users/${currentUserProfile.id}/notifications`), {
        title: "Payment Received",
        body: `₦${testAmount.toLocaleString()} received via Bank Transfer reference ${references[Math.floor(Math.random() * references.length)]}`,
        createdAt: serverTimestamp(),
        read: false,
        type: 'payment',
        amount: testAmount,
        reference: references[Math.floor(Math.random() * references.length)],
        bankName: banks[Math.floor(Math.random() * banks.length)],
        accountNumber: '901***5932'
      });
      toast({ title: "Test Alert Triggered", description: "Incoming payment simulated." });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-background p-1 h-full min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between border-b pb-4">
        <PageTitle title="Terminal Alerts" subtitle="Live stream of confirmed payments and transfers." />
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-2"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            {soundEnabled ? "Sound On" : "Sound Muted"}
          </Button>

          {process.env.NODE_ENV !== 'production' && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleTriggerTestAlert}
              className="flex items-center gap-2 bg-orange-50 text-primary border border-orange-100 hover:bg-orange-100/50"
            >
              <Play className="h-3.5 w-3.5" />
              Simulate Payment
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by amount, bank, or transaction reference..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-6">
            {filteredAlerts.map((alert) => {
              const alertDate = alert.createdAt ? safeToDate(alert.createdAt) : new Date();
              return (
                <Card key={alert.id} className="relative border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified Payout
                      </Badge>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {alertDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                        {currencySymbol}
                        {alert.amount?.toLocaleString() || alert.body.match(/₦[\d,]+/)?.[0].replace('₦', '') || 'Confirmed'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.body}</p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1.5 font-mono text-slate-600">
                      {alert.bankName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Destination Bank</span>
                          <span className="font-semibold flex items-center gap-1"><Building className="h-3 w-3" />{alert.bankName}</span>
                        </div>
                      )}
                      {alert.reference && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Reference ID</span>
                          <span className="font-semibold">{alert.reference}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
