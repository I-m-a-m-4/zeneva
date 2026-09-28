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
  ArrowRight,
  RotateCcw,
  Check,
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
import { countItemsFromCanvas, loadOpenCV, type DetectedBox } from '@/lib/opencv-stock-counter';

interface ProductVisualStockTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  currentStock: number;
  onApplyCount: (counted: number, mode: 'add' | 'set') => void;
}

type Stage = 'camera' | 'analyzing' | 'review';

export default function ProductVisualStockTakeDialog({
  open,
  onOpenChange,
  productName,
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

  // Computer Vision state
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [boxes, setBoxes] = React.useState<DetectedBox[]>([]);
  const [manualCount, setManualCount] = React.useState<number>(0);
  const [engineUsed, setEngineUsed] = React.useState<'opencv' | 'canvas'>('canvas');
  const [processingTimeMs, setProcessingTimeMs] = React.useState<number>(0);
  const [isAiVerifying, setIsAiVerifying] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);

  // Preload OpenCV in the background when dialog mounts
  React.useEffect(() => {
    if (open) {
      loadOpenCV().catch(() => {});
    }
  }, [open]);

  // Stop camera tracks cleanly
  const stopCameraStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setTorchOn(false);
  }, []);

  // Directly initialize device camera
  const startCamera = React.useCallback(
    async (facing: 'environment' | 'user' = facingMode) => {
      setCameraError(null);
      setCameraReady(false);
      stopCameraStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setTorchAvailable(Boolean(capabilities && 'torch' in capabilities));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser.'
            : err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not access device camera. Please check your camera permissions.';
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

  // Flip rear / front camera
  const switchCameraFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Start/stop camera based on dialog open and current stage
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

  // Reset when dialog closes
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

  // Capture frame and run OpenCV recognition & grouping
  const handleCaptureAndCount = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    setStage('analyzing');

    // Create offscreen canvas for snapshot
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Stop camera stream to free hardware while reviewing
    stopCameraStream();

    try {
      // Execute OpenCV detection & similarity grouping
      const result = await countItemsFromCanvas(canvas);
      setBoxes(result.boxes);
      setManualCount(result.count);
      setEngineUsed(result.engine);
      setProcessingTimeMs(result.executionTimeMs);
      setStage('review');

      toast({
        title: `Counted ${result.count} Units`,
        description: `Recognized and grouped ${result.count} matching item${result.count !== 1 ? 's' : ''}.`,
        variant: 'success',
      });
    } catch (err: any) {
      console.error('Detection pipeline error:', err);
      // Fallback with empty boxes allowing user to tap-to-add
      setBoxes([]);
      setManualCount(0);
      setStage('review');
      toast({
        title: 'Ready for Review',
        description: 'You can tap on items to count them manually or use AI Double-Check.',
      });
    }
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

    // Use median dimensions of existing boxes or default 12% width
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
      clusterId: 1,
      isPrimaryGroup: true,
    };

    const nextBoxes = [...boxes, newBox];
    setBoxes(nextBoxes);
    setManualCount(nextBoxes.length);
  };

  // AI Verification / Refinement
  const handleAiDoubleCheck = async () => {
    if (!capturedImage) return;
    setIsAiVerifying(true);
    setAiNote(null);

    try {
      const res = await fetch('/api/ai/visual-count-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          productName,
        }),
      });

      if (!res.ok) throw new Error('AI count request failed');

      const data = await res.json();
      const aiResult = data.result;

      if (typeof aiResult?.count === 'number') {
        setManualCount(aiResult.count);
        setAiNote(aiResult.explanation || `AI verified ${aiResult.count} units of ${productName}`);

        // If AI returned boxes, map them
        if (Array.isArray(aiResult.boxes) && aiResult.boxes.length > 0) {
          const mappedBoxes: DetectedBox[] = aiResult.boxes.map((b: any, idx: number) => ({
            id: `ai-box-${idx}`,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            confidence: aiResult.confidence || 95,
            clusterId: 1,
            isPrimaryGroup: true,
          }));
          setBoxes(mappedBoxes);
        }

        toast({
          title: 'AI Verification Complete',
          description: `AI counted ${aiResult.count} items (${aiResult.confidence || 95}% confidence).`,
          variant: 'success',
        });
      }
    } catch (err: any) {
      console.error('AI verification error:', err);
      toast({
        title: 'AI Verification Unavailable',
        description: err.message || 'Could not reach AI server. Computer vision count is preserved.',
        variant: 'destructive',
      });
    } finally {
      setIsAiVerifying(false);
    }
  };

  // Apply to stock
  const applyCount = (mode: 'add' | 'set') => {
    onApplyCount(manualCount, mode);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold truncate">
                <Camera className="h-4 w-4 text-primary shrink-0" />
                Visual Stock Take: <span className="text-primary truncate">{productName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Point your camera to detect, group, and count physical units automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
                      Live Camera Active
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
                        title="Switch Camera (Front/Rear)"
                      >
                        <SwitchCamera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Center Scanning Reticle */}
                  <div className="relative w-[78%] h-[65%] border-2 border-dashed border-white/40 rounded-2xl flex items-center justify-center">
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                    {/* Laser scanning line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]" />

                    <div className="absolute bottom-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white/80 text-[10px] font-medium tracking-wide">
                      Align items inside frame
                    </div>
                  </div>

                  {/* Bottom Controls Bar */}
                  <div className="w-full flex flex-col items-center gap-2 pointer-events-auto z-10 mb-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleCaptureAndCount}
                      className="h-14 px-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/40 flex items-center gap-2 text-base active:scale-95 transition-transform"
                    >
                      <Camera className="h-5 w-5" />
                      Capture & Count
                    </Button>
                  </div>
                </div>
              )}

              {/* Camera Error State */}
              {cameraError && (
                <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center z-20">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <h3 className="font-semibold text-base mb-1">Camera Access Required</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">{cameraError}</p>
                  <Button type="button" onClick={() => startCamera()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: ANALYZING OVERLAY */}
          {stage === 'analyzing' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white z-30">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <Sparkles className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="font-bold text-base mb-1">Analyzing Visual Patterns</p>
              <p className="text-xs text-zinc-400 text-center max-w-xs leading-relaxed">
                Detecting and grouping matching units of {productName}...
              </p>
            </div>
          )}

          {/* STAGE 3: REVIEW & INTERACTIVE BOUNDING BOXES */}
          {stage === 'review' && capturedImage && (
            <div
              ref={imageContainerRef}
              onClick={handleImageClick}
              className="relative w-full h-full max-h-[440px] flex items-center justify-center select-none cursor-crosshair overflow-hidden"
              title="Click anywhere to add a missed unit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captured stock frame"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Render Detected Bounding Boxes */}
              {boxes.map((box, index) => {
                const left = `${box.x * 100}%`;
                const top = `${box.y * 100}%`;
                const width = `${box.width * 100}%`;
                const height = `${box.height * 100}%`;

                return (
                  <div
                    key={box.id}
                    onClick={(e) => handleRemoveBox(box.id, e)}
                    style={{ left, top, width, height }}
                    className="absolute border-2 border-emerald-400 bg-emerald-500/15 rounded-md hover:bg-red-500/20 hover:border-red-400 transition-colors group cursor-pointer"
                    title={`Item #${index + 1} (${box.confidence}% match). Click to remove.`}
                  >
                    {/* Number Badge */}
                    <div className="absolute -top-3 -left-2.5 h-5 min-w-[20px] px-1 rounded-full bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-md border border-white/40 group-hover:bg-red-500">
                      {index + 1}
                    </div>

                    {/* Trash hint on hover */}
                    <div className="absolute inset-0 items-center justify-center hidden group-hover:flex">
                      <Trash2 className="h-4 w-4 text-red-400 bg-black/70 rounded-full p-0.5" />
                    </div>
                  </div>
                );
              })}

              {/* Floating Instructions Banner */}
              <div className="absolute top-2 left-3 right-3 pointer-events-none flex items-center justify-between">
                <Badge className="bg-black/70 backdrop-blur-md text-[10px] text-white border-white/20">
                  👆 Tap any item to add or click a box to delete
                </Badge>

              </div>
            </div>
          )}
        </div>

        {/* REVIEW SUMMARY & ACTIONS FOOTER */}
        {stage === 'review' ? (
          <div className="p-4 border-t bg-card space-y-3">
            {/* KPI Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/50 p-3 rounded-xl border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Visual Count Result
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {manualCount}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    unit{manualCount !== 1 ? 's' : ''} detected
                  </span>
                </div>
              </div>

              {/* Manual +/- fine-tuning adjustments */}
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

              {/* Optional AI Double-Check */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiDoubleCheck}
                disabled={isAiVerifying}
                className="text-xs h-8 gap-1.5"
                title="Use multimodal AI to verify count"
              >
                {isAiVerifying ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                <span>AI Double-Check</span>
              </Button>
            </div>

            {aiNote && (
              <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-2 flex items-start gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span>{aiNote}</span>
              </div>
            )}

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
              💡 For best results, place items in clear view without heavy overlapping.
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
  );
}
