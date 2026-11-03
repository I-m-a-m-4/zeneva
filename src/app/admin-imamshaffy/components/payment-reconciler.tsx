'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Search, RefreshCw, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { idToken } from '@/lib/id-token';

export function PaymentReconciler({ onReconciled }: { onReconciled?: () => void }) {
  const { toast } = useToast();
  const [reference, setReference] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = reference.trim();
    if (!cleanRef) {
      toast({
        variant: 'destructive',
        title: 'Reference Required',
        description: 'Please paste the Paystack transaction reference (e.g. z-p3JahP-1793692049474).',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = await idToken();
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reference: cleanRef,
          businessId: businessId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to reconcile transaction.');
      }

      setResult({
        success: true,
        data,
      });

      toast({
        variant: 'success',
        title: 'Payment Reconciled & Applied!',
        description: `Upgraded store to ${data.plan.toUpperCase()} plan until ${new Date(data.expiresAt).toLocaleDateString()}.`,
      });

      if (onReconciled) {
        onReconciled();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message,
      });
      toast({
        variant: 'destructive',
        title: 'Reconciliation Failed',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-orange-200 bg-orange-50/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Paystack Instant Reconciler & Store Activator
            </CardTitle>
          </div>
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100/50">
            Automated Safe Verifier
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-600">
          Paste any Paystack transaction reference to re-verify against the Paystack Secret Key, renew the store for 30+ days, and record the purchase in Firestore immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleReconcile} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Paystack Reference *</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. z-p3JahP-1793692049474 or Paystack Ref"
                  className="pl-9 font-mono text-xs bg-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Business ID (Optional Override)</label>
              <Input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Auto-detected if empty"
                className="font-mono text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="submit"
              disabled={loading || !reference.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-9"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Verifying on Paystack...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Verify & Activate Store
                </>
              )}
            </Button>
          </div>
        </form>

        {result && (
          <div
            className={`p-3 rounded-lg border text-xs ${
              result.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {result.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Subscription successfully verified and applied!</p>
                  <p>
                    <span className="font-semibold">Target Business:</span> {result.data.businessId}
                  </p>
                  <p>
                    <span className="font-semibold">Plan Activated:</span>{' '}
                    <span className="capitalize font-bold">{result.data.plan}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Expires:</span>{' '}
                    {new Date(result.data.expiresAt).toLocaleString()}
                  </p>
                  {result.data.alreadyProcessed && (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-100/50 mt-1">
                      Note: This transaction was already applied earlier.
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Reconciliation Failed</p>
                  <p>{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
