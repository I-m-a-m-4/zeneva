'use client';

import * as React from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SwitchCamera,
  Zap,
  ZapOff,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Check,
  HelpCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiBase } from '@/lib/platform';
import { VisualStockTakeGuideDialog } from './visual-stock-take-guide-dialog';

export interface DetectedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface ProductVisualStockTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productImage?: string | null;
  currentStock: number;
  onApplyCount: (counted: number, mode: 'add' | 'set') => void;
}

type Stage = 'camera' | 'analyzing' | 'review';

export default function ProductVisualStockTakeDialog({
  open,
  onOpenChange,
  productName,
  productImage,
  currentStock,
  onApplyCount,
}: ProductVisualStockTakeDialogProps) {
  const { toast } = useToast();

  const [stage, setStage] = React.useState<Stage>('camera');
  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  // Roboflow Vision State
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [boxes, setBoxes] = React.useState<DetectedBox[]>([]);
  const [manualCount, setManualCount] = React.useState<number>(0);
  const [engineUsed, setEngineUsed] = React.useState<string>('Roboflow Vision');
  const [processingTimeMs, setProcessingTimeMs] = React.useState<number>(0);
  const [isAiVerifying, setIsAiVerifying] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);
  const [showGuide, setShowGuide] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Onboarding guide check
  React.useEffect(() => {
    if (open) {
      try {
        const seen = localStorage.getItem('zeneva_seen_stocktake_guide');
        const neverShow = localStorage.getItem('zeneva_never_show_stocktake_guide');
        if (seen !== 'true' && neverShow !== 'true') {
          setShowGuide(true);
        }
      } catch {}
    }
  }, [open]);

  // Clean stop of camera hardware
  const stopCameraStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setTorchOn(false);
  }, []);

  // Initialize camera with mobile-friendly fallbacks
  const startCamera = React.useCallback(
    async (facing: 'environment' | 'user' = facingMode) => {
      setCameraError(null);
      setCameraReady(false);
      stopCameraStream();

      // Check for HTTPS / Secure context (required by mobile Chrome and Safari)
      if (
        typeof window !== 'undefined' &&
        window.isSecureContext === false &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraError(
          'Mobile browsers require HTTPS or localhost to stream the camera. Use "Take Photo with Phone" below.'
        );
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not available on this browser. Please use the Take Photo with Phone button below.');
        return;
      }

      try {
        let stream: MediaStream;
        try {
          // Ideal mobile resolution (1280x720) with preferred rear facing camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to basic video constraint for older mobile chipsets
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;

        // Check torch/flashlight capability safely
        try {
          const track = stream.getVideoTracks()[0];
          const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
          setTorchAvailable(Boolean(capabilities && 'torch' in capabilities));
        } catch {}

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.muted = true;

          // Wait for video metadata to resolve on mobile before playing
          await new Promise<void>((resolve) => {
            if (video.readyState >= 2) {
              resolve();
            } else {
              video.onloadedmetadata = () => resolve();
              setTimeout(resolve, 800);
            }
          });

          await video.play().catch((e) => console.warn('video.play() autoplay note:', e));
          setCameraReady(true);
        }
      } catch (err: any) {
        console.warn('Camera initialization error:', err);
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera permissions in your mobile browser or use Take Photo with Phone below.'
            : err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not access device camera. Please use Take Photo with Phone below.';
        setCameraError(msg);
      }
    },
    [facingMode, stopCameraStream]
  );

  // Toggle flashlight/torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch rear/front camera
  const switchCameraFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Start camera when modal opens
  React.useEffect(() => {
    if (open && stage === 'camera') {
      startCamera();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [open, stage, startCamera, stopCameraStream]);

  // Reset dialog on close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      stopCameraStream();
      setStage('camera');
      setCapturedImage(null);
      setBoxes([]);
      setManualCount(0);
      setAiNote(null);
    }
    onOpenChange(isOpen);
  };

  // ── Roboflow Primary Vision Pipeline ──────────────────────────────────
  const countWithRoboflow = async (dataUrl: string) => {
    setStage('analyzing');
    const startMs = Date.now();

    try {
      const res = await fetch(`${apiBase()}/api/ai/visual-count-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          productName,
          productImage,
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error('Received an invalid response format from vision server.');
      }

      if (!res.ok) throw new Error(data.error || 'Vision request failed');

      const aiResult = data.result || {};
      const count = typeof aiResult.count === 'number' ? aiResult.count : 0;
      const rawBoxes = Array.isArray(aiResult.boxes) ? aiResult.boxes : [];

      const mappedBoxes: DetectedBox[] = rawBoxes.map((b: any, idx: number) => ({
        id: `box-${idx}-${Date.now()}`,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        confidence: b.confidence || aiResult.confidence || 95,
      }));

      setBoxes(mappedBoxes);
      setManualCount(count);
      setEngineUsed(aiResult.engine || 'Roboflow Vision');
      setProcessingTimeMs(Date.now() - startMs);
      setAiNote(aiResult.explanation || (count === 0 ? `No physical units of "${productName}" found.` : `Identified ${count} units.`));
      setStage('review');

      if (count > 0) {
        toast({
          title: `Counted ${count} Units`,
          description: `Roboflow vision recognized ${count} matching item${count !== 1 ? 's' : ''}.`,
          variant: 'success',
        });
      } else {
        toast({
          title: '0 Units Detected',
          description: `No items matching "${productName}" found in frame. You can tap on the photo to add items manually.`,
        });
      }
    } catch (err: any) {
      console.warn('Roboflow error:', err);
      setBoxes([]);
      setManualCount(0);
      setStage('review');
      toast({
        title: 'Review Mode',
        description: 'Ready for manual review. Tap on items in the photo to count them.',
      });
    }
  };

  // Capture frame from active video stream
  const handleCaptureAndCount = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    setCapturedImage(dataUrl);

    stopCameraStream();
    await countWithRoboflow(dataUrl);
  };

  // Native Mobile File Input (Take Photo or Upload Image)
  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      setCapturedImage(dataUrl);
      stopCameraStream();
      await countWithRoboflow(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setBoxes([]);
    setManualCount(0);
    setAiNote(null);
    setStage('camera');
  };

  // Remove a detected box
  const handleRemoveBox = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = boxes.filter((b) => b.id !== id);
    setBoxes(updated);
    setManualCount(updated.length);
  };

  // Tap on photo to add a missed item
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const medianW =
      boxes.length > 0 ? [...boxes].sort((a, b) => a.width - b.width)[Math.floor(boxes.length / 2)].width : 0.12;
    const medianH =
      boxes.length > 0 ? [...boxes].sort((a, b) => a.height - b.height)[Math.floor(boxes.length / 2)].height : 0.12;

    const newBox: DetectedBox = {
      id: `box-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: Math.max(0, clickX - medianW / 2),
      y: Math.max(0, clickY - medianH / 2),
      width: Math.min(1 - clickX, medianW),
      height: Math.min(1 - clickY, medianH),
      confidence: 100,
    };

    const nextBoxes = [...boxes, newBox];
    setBoxes(nextBoxes);
    setManualCount(nextBoxes.length);
  };

  // Re-run Roboflow Check
  const handleRecheck = async () => {
    if (!capturedImage) return;
    setIsAiVerifying(true);
    await countWithRoboflow(capturedImage);
    setIsAiVerifying(false);
  };

  // Apply to stock
  const applyCount = (mode: 'add' | 'set') => {
    onApplyCount(manualCount, mode);
    handleOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-3xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-orange-500 shrink-0" />
                  <DialogTitle className="text-sm sm:text-base font-bold truncate">
                    Visual Stock Take: <span className="text-orange-600 dark:text-orange-400">{productName}</span>
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  Roboflow Vision automatically identifies and counts units in real time.
                </DialogDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(true)}
                className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-full border-dashed"
                title="How visual counting works"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Guide</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Hidden native mobile file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeFileUpload}
          />

          {/* Viewport container */}
          <div className="relative flex-1 min-h-[360px] sm:min-h-[440px] bg-black flex items-center justify-center overflow-hidden">
            {/* STAGE 1: CAMERA STREAM */}
            {stage === 'camera' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Overlay */}
                {cameraReady && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                    {/* Top Bar with Camera Controls */}
                    <div className="w-full flex items-center justify-between pointer-events-auto z-10">
                      <Badge className="bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] px-2.5 py-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5 inline-block" />
                        Roboflow Vision Active
                      </Badge>

                      <div className="flex items-center gap-1.5">
                        {torchAvailable && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={toggleTorch}
                            className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white"
                            title="Toggle Flash"
                          >
                            {torchOn ? <Zap className="h-4 w-4 text-amber-400" /> : <ZapOff className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={switchCameraFacing}
                          className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white"
                          title="Switch Camera"
                        >
                          <SwitchCamera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Framing Reticle */}
                    <div className="relative w-[85%] max-w-[480px] h-[55%] border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-400 rounded-tl-sm" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-400 rounded-tr-sm" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-400 rounded-bl-sm" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-400 rounded-br-sm" />
                      <p className="text-white/80 text-xs font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm shadow">
                        Align {productName} inside box
                      </p>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="w-full flex items-center justify-between sm:justify-center gap-2 sm:gap-4 pointer-events-auto px-4 pb-2 z-10">
                      {/* Native camera trigger fallback for mobile */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-3 rounded-full bg-black/60 text-white/90 hover:bg-black/80 text-xs gap-1.5 backdrop-blur-sm border border-white/20"
                        title="Upload photo or take with native phone camera"
                      >
                        <Camera className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-[11px] font-medium">Phone Camera</span>
                      </Button>

                      {/* Main Big Shutter Button */}
                      <button
                        type="button"
                        onClick={handleCaptureAndCount}
                        className="group relative flex items-center justify-center h-16 w-16 rounded-full bg-white/20 border-4 border-white backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-xl"
                        title="Capture and Count"
                      >
                        <div className="h-12 w-12 rounded-full bg-orange-500 group-hover:bg-orange-600 transition-colors shadow-inner flex items-center justify-center text-white">
                          <Camera className="h-6 w-6" />
                        </div>
                      </button>

                      <div className="w-[100px] sm:w-[130px] hidden sm:block" />
                    </div>
                  </div>
                )}

                {/* Camera Error / Loading state */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white z-20">
                    {cameraError ? (
                      <div className="space-y-3 max-w-sm">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                        <h4 className="font-semibold text-sm">Camera Stream Unavailable</h4>
                        <p className="text-xs text-slate-400">{cameraError}</p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startCamera()}
                            className="text-xs gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry Camera
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Take Photo with Phone
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
                        <p className="text-xs text-slate-400 font-medium">Starting camera...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STAGE 2: ANALYZING SPINNER */}
            {stage === 'analyzing' && (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured snapshot"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                  />
                )}
                <div className="relative z-10 space-y-4 max-w-xs p-6 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl">
                  <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 text-orange-500 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Roboflow Vision Active</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Identifying physical units of <span className="text-orange-400 font-semibold">{productName}</span>...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 3: REVIEW & BOUNDING BOXES */}
            {stage === 'review' && capturedImage && (
              <div
                ref={imageContainerRef}
                onClick={handleImageClick}
                className="relative w-full h-full cursor-crosshair select-none flex items-center justify-center"
              >
                <img
                  src={capturedImage}
                  alt="Captured snapshot"
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Detected Bounding Boxes */}
                {boxes.map((b, i) => (
                  <div
                    key={b.id}
                    onClick={(e) => handleRemoveBox(b.id, e)}
                    style={{
                      left: `${b.x * 100}%`,
                      top: `${b.y * 100}%`,
                      width: `${b.width * 100}%`,
                      height: `${b.height * 100}%`,
                    }}
                    className="absolute border-2 border-emerald-400 bg-emerald-500/15 rounded transition-all hover:bg-destructive/30 hover:border-destructive group cursor-pointer z-10"
                    title="Click box to remove this unit"
                  >
                    <span className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow group-hover:bg-destructive group-hover:text-white transition-colors">
                      {i + 1}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 font-bold bg-black/60 rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                ))}

                {/* Visual Feedback Instruction Header */}
                <div className="absolute top-2 left-2 right-2 pointer-events-none flex items-center justify-between">
                  <Badge className="bg-black/75 backdrop-blur-md text-white border border-white/20 text-[11px] gap-1 px-2.5 py-1">
                    <span>👆 Tap photo to add unit or click a box to delete</span>
                  </Badge>
                  <Badge className="bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 text-[11px] font-mono">
                    {engineUsed} ({processingTimeMs}ms)
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Dialog Footer with Count Actions */}
          {stage === 'review' ? (
            <div className="p-4 border-t bg-card space-y-3">
              {aiNote && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-950 dark:text-orange-200">
                  <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span className="truncate">{aiNote}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Result count display */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Count Result:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-foreground font-mono">
                      {manualCount}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      unit{manualCount !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                </div>

                {/* Manual +/- fine-tuning adjustments */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="flex items-center gap-1.5 bg-background border rounded-lg p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={manualCount <= 0}
                      onClick={() => setManualCount((c) => Math.max(0, c - 1))}
                      title="Decrease count"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center font-mono font-bold text-sm">{manualCount}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setManualCount((c) => c + 1)}
                      title="Increase count"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Recheck Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRecheck}
                    disabled={isAiVerifying}
                    className="text-xs h-8 gap-1.5"
                    title="Re-run Roboflow vision detection"
                  >
                    {isAiVerifying ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    <span>Re-check</span>
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRetake}
                  className="text-xs gap-1.5 w-full sm:w-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retake Photo
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyCount('set')}
                    className="text-xs flex-1 sm:flex-none"
                    title={`Set product stock to exactly ${manualCount}`}
                  >
                    Set Stock to {manualCount}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => applyCount('add')}
                    className="text-xs flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 font-semibold"
                    title={`Add +${manualCount} to existing stock`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Add as Restock (+{manualCount})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <DialogFooter className="p-3 border-t bg-muted/10 sm:justify-between flex-row items-center">
              <span className="text-[11px] text-muted-foreground">
                💡 Powered by Roboflow Vision. Point straight at items on the shelf or table.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Onboarding Guide Modal */}
      <VisualStockTakeGuideDialog
        open={showGuide}
        onOpenChange={setShowGuide}
        productName={productName}
      />
    </>
  );
}
