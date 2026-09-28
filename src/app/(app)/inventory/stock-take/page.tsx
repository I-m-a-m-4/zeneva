'use client';

import * as React from 'react';
import {
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  VideoOff,
  SwitchCamera,
  ZapOff,
  Zap,
} from 'lucide-react';
import PageTitle from '@/components/shared/page-title';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/context/pos-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type Mode = 'idle' | 'camera' | 'preview';

export default function VisualStockTakePage() {
  const { products, updateProduct } = usePOS();
  const { toast } = useToast();
  const router = useRouter();

  // ── Image state ───────────────────────────────────────────────────────────
  const [mode, setMode] = React.useState<Mode>('idle');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanResults, setScanResults] = React.useState<
    Array<{ id: string; expected: number; counted: number; name: string }>
  >([]);

  // ── Camera state ──────────────────────────────────────────────────────────
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraReady, setCameraReady] = React.useState(false);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = React.useCallback(
    async (facing: 'environment' | 'user' = facingMode) => {
      setCameraError(null);
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
        setMode('camera');
      } catch (err: any) {
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access.'
            : err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not start camera.';
        setCameraError(msg);
      }
    },
    [facingMode],
  );

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setMode('idle');
  }, []);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Capture frame ─────────────────────────────────────────────────────────
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setImagePreview(dataUrl);
    setScanResults([]);
    stopCamera();
    setMode('preview');
  };

  // ── Switch camera ─────────────────────────────────────────────────────────
  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setScanResults([]);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    stopCamera();
    setImagePreview(null);
    setScanResults([]);
    setMode('idle');
  };

  // ── Scan with AI ──────────────────────────────────────────────────────────
  const startScan = async () => {
    if (!imagePreview || !products) return;

    setIsScanning(true);
    try {
      const inventoryItems = products
        .filter((p) => p.categoryType !== 'service')
        .map((p) => ({ id: p.id, name: p.name }));

      const res = await fetch('/api/ai/scan-shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imagePreview, products: inventoryItems }),
      });

      if (!res.ok) throw new Error('Failed to analyze image');

      const data = await res.json();
      const counts: { id: string; count: number }[] = data.result || [];

      const results = counts.map((c) => {
        const product = products.find((p) => p.id === c.id);
        return {
          id: c.id,
          name: product?.name || 'Unknown',
          expected: product?.stock || 0,
          counted: c.count,
        };
      });

      setScanResults(results);
      toast({
        title: 'Scan Complete',
        description: `Found ${results.length} unique product${results.length !== 1 ? 's' : ''} on the shelf.`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Scan Failed',
        description: error.message || 'An error occurred while analyzing the shelf',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // ── Reconcile ─────────────────────────────────────────────────────────────
  const handleReconcile = async () => {
    try {
      await Promise.all(
        scanResults
          .filter((r) => r.expected !== r.counted)
          .map((r) => updateProduct(r.id, { stock: r.counted })),
      );
      toast({
        title: 'Reconciliation Complete',
        description: 'Stock levels have been updated to match the shelf count.',
        variant: 'success',
      });
      router.push('/inventory');
    } catch {
      toast({
        title: 'Reconciliation Failed',
        description: 'Could not update stock levels. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <PageTitle
        title="Visual Stock Take"
        subtitle="Use your camera or upload a shelf photo — the AI will count what's visible and reconcile with your records."
      />

      <div className="grid md:grid-cols-2 gap-12 mt-4">
        {/* ── Left: Image / Camera ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <Camera className="w-6 h-6 text-primary" /> Shelf Image
            </h2>
            <p className="text-muted-foreground mt-1">
              Point your camera at the shelf or upload an existing photo.
            </p>
          </div>

          {/* Live camera view */}
          {mode === 'camera' && (
            <div className="relative w-full rounded-xl overflow-hidden border border-border/50 shadow-sm bg-black aspect-video">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Shutter */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
                <button
                  onClick={captureFrame}
                  disabled={!cameraReady}
                  aria-label="Capture photo"
                  className={cn(
                    'h-16 w-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm shadow-xl',
                    'flex items-center justify-center transition-transform active:scale-95',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-white" />
                </button>
              </div>

              {/* Switch camera */}
              <button
                onClick={switchCamera}
                aria-label="Switch camera"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>

              {/* Cancel */}
              <button
                onClick={stopCamera}
                aria-label="Close camera"
                className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition"
              >
                <VideoOff className="h-4 w-4" />
              </button>

              {/* Starting overlay */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Starting camera…
                </div>
              )}
            </div>
          )}

          {/* Image preview */}
          {mode === 'preview' && imagePreview && (
            <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Shelf preview"
                className="w-full h-auto object-contain max-h-[500px]"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-3 right-3 shadow-md opacity-90 hover:opacity-100"
                onClick={reset}
              >
                Change Photo
              </Button>
            </div>
          )}

          {/* Idle: pick source */}
          {mode === 'idle' && (
            <>
              {cameraError && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {cameraError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => startCamera()}
                  className={cn(
                    'h-40 rounded-xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center gap-3',
                    'hover:bg-muted/30 hover:border-primary/50 transition-colors group cursor-pointer',
                  )}
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Use Camera</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Live capture</p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'h-40 rounded-xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center gap-3',
                    'hover:bg-muted/30 hover:border-primary/50 transition-colors group cursor-pointer',
                  )}
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Upload Photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          {/* Scan button — only in preview mode */}
          {mode === 'preview' && (
            <Button
              className="w-full h-12 text-base"
              disabled={!imagePreview || isScanning}
              onClick={startScan}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Counting products…
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" /> Count &amp; Scan Shelf
                </>
              )}
            </Button>
          )}
        </div>

        {/* ── Right: Results ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <CheckCircle2 className="w-6 h-6 text-primary" /> Reconciliation
            </h2>
            <p className="text-muted-foreground mt-1">
              Review the counted items against expected stock.
            </p>
          </div>

          <div className="flex-1 overflow-auto max-h-[600px]">
            {scanResults.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanResults.map((result) => {
                    const variance = result.counted - result.expected;
                    return (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell className="text-right">{result.expected}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {result.counted}
                        </TableCell>
                        <TableCell className="text-right">
                          {variance === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Match
                            </Badge>
                          ) : variance > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 bg-green-50 border-green-200"
                            >
                              +{variance}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-red-600 bg-red-50 border-red-200"
                            >
                              {variance}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-muted-foreground text-center px-4">
                {isScanning ? (
                  <>
                    <RefreshCw className="h-10 w-10 mb-4 animate-spin opacity-40" />
                    <p className="text-base font-medium">Analyzing shelf…</p>
                    <p className="text-sm mt-1">The AI is counting visible products.</p>
                  </>
                ) : (
                  <>
                    <ZapOff className="h-10 w-10 mb-4 opacity-20" />
                    <p className="text-base font-medium">No scan results yet.</p>
                    <p className="text-sm mt-1">
                      Capture or upload a shelf photo, then tap{' '}
                      <span className="font-semibold">Count &amp; Scan Shelf</span>.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            className="w-full h-12 text-base"
            disabled={scanResults.length === 0}
            onClick={handleReconcile}
          >
            Update Inventory Stock
          </Button>
        </div>
      </div>
    </div>
  );
}
