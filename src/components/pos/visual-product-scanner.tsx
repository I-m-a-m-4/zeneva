'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
    X, 
    Camera, 
    Zap, 
    ZapOff, 
    RefreshCw, 
    Sparkles, 
    Plus, 
    Check, 
    AlertCircle,
    ScanLine,
    Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/types';
import { 
    extractVisualSignature, 
    compareSignatures, 
    getProductImageSignature, 
    playCheckoutBeep,
    type VisualSignature 
} from '@/lib/vision/product-matcher';

interface VisualProductScannerProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onProductSelect: (product: Product) => void;
    currencySymbol?: string;
}

export function VisualProductScanner({
    isOpen,
    onClose,
    products,
    onProductSelect,
    currencySymbol = '₦'
}: VisualProductScannerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastScanTimeRef = useRef<number>(0);
    const isProcessingRef = useRef<boolean>(false);
    // Guards against overlapping getUserMedia/play() calls: the play() promise
    // rejects with AbortError when a newer session swaps srcObject mid-flight.
    const cameraSessionRef = useRef<number>(0);
    // Hysteresis so one product is auto-added only once until it leaves frame.
    const autoAddArmedRef = useRef<boolean>(true);
    const missCountRef = useRef<number>(0);

    // States
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [torchSupported, setTorchSupported] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [autoAdd, setAutoAdd] = useState(true);

    // Matching states
    const [topMatch, setTopMatch] = useState<{ product: Product; confidence: number } | null>(null);
    const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
    const [signaturesIndexed, setSignaturesIndexed] = useState<number>(0);
    const productSignaturesRef = useRef<Map<string, VisualSignature>>(new Map());

    // 1. Pre-index product images signatures in background
    useEffect(() => {
        if (!isOpen || !products || products.length === 0) return;

        let isSubscribed = true;
        const indexProducts = async () => {
            let count = 0;
            // Focus on active products with images
            const itemsWithImages = products.filter(p => !p.isArchived && p.imageUrl);

            for (const product of itemsWithImages) {
                if (!isSubscribed) break;
                if (!productSignaturesRef.current.has(product.id) && product.imageUrl) {
                    const sig = await getProductImageSignature(product.imageUrl);
                    if (sig && isSubscribed) {
                        productSignaturesRef.current.set(product.id, sig);
                        count++;
                        if (count % 5 === 0) {
                            setSignaturesIndexed(productSignaturesRef.current.size);
                        }
                    }
                }
            }
            if (isSubscribed) {
                setSignaturesIndexed(productSignaturesRef.current.size);
            }
        };

        indexProducts();

        return () => {
            isSubscribed = false;
        };
    }, [isOpen, products]);

    // 2. Camera stream lifecycle
    const startCamera = useCallback(async () => {
        const session = ++cameraSessionRef.current;
        setCameraError(null);
        setCameraActive(false);

        // Stop existing tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error('Camera access not supported on this browser or platform.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            if (session !== cameraSessionRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            streamRef.current = stream;

            if (videoRef.current) {
                const video = videoRef.current;
                video.srcObject = stream;
                try {
                    await video.play();
                } catch (playErr) {
                    // A newer startCamera() replaced srcObject — this session is stale.
                    if ((playErr as DOMException)?.name !== 'AbortError') throw playErr;
                    return;
                }
                if (session !== cameraSessionRef.current) return;
                setCameraActive(true);
            }

            // Check torch support
            const track = stream.getVideoTracks()[0];
            const capabilities = (track as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
            setTorchSupported(!!capabilities?.torch);
        } catch (err: unknown) {
            // Stale or aborted attempts must not paint an error over a healthy stream.
            if (session !== cameraSessionRef.current) return;
            if ((err as DOMException)?.name === 'AbortError') return;
            console.error('[VisionScanner] Camera error:', err);
            const msg = err instanceof Error ? err.message : 'Unable to connect to camera.';
            setCameraError(msg.includes('Permission') ? 'Camera permission was denied. Please allow camera access in browser settings.' : msg);
        }
    }, [facingMode]);

    useEffect(() => {
        if (isOpen) {
            autoAddArmedRef.current = true;
            missCountRef.current = 0;
            startCamera();
        } else {
            // Cleanup
            cameraSessionRef.current++;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            setCameraActive(false);
            setTopMatch(null);
            setAddedFeedback(null);
        }

        return () => {
            cameraSessionRef.current++;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isOpen, startCamera]);

    // 3. Torch toggle
    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        try {
            await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
                advanced: [{ torch: !isTorchOn }]
            });
            setIsTorchOn(!isTorchOn);
        } catch (e) {
            console.warn('Torch constraint error', e);
        }
    };

    // 4. Handle adding the product
    const handleConfirmAdd = useCallback((product: Product) => {
        // Require the product to leave the frame before auto-add fires again.
        autoAddArmedRef.current = false;
        playCheckoutBeep('success');
        onProductSelect(product);
        setAddedFeedback(product.name);
        setTopMatch(null);

        // Clear feedback banner after 1.5s
        setTimeout(() => {
            setAddedFeedback(null);
        }, 1500);
    }, [onProductSelect]);

    // 5. Native BarcodeDetector check (parallel bonus)
    const checkNativeBarcode = useCallback(async (video: HTMLVideoElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        if (!win.BarcodeDetector) return null;

        try {
            if (!win.__cachedBarcodeDetector) {
                win.__cachedBarcodeDetector = new win.BarcodeDetector({
                    formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
                });
            }
            const barcodes = await win.__cachedBarcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue;
                const match = products.find(p => p.sku === raw || p.barcode === raw);
                if (match) return match;
            }
        } catch {
            // Barcode detector failed or not allowed
        }
        return null;
    }, [products]);

    // 6. Main Scanning Loop
    useEffect(() => {
        if (!cameraActive || !isOpen) return;

        let isRunning = true;

        const scanLoop = async (time: number) => {
            if (!isRunning) return;

            // Run analysis every 280ms
            if (time - lastScanTimeRef.current > 280 && !isProcessingRef.current && videoRef.current && canvasRef.current) {
                lastScanTimeRef.current = time;
                isProcessingRef.current = true;

                try {
                    const video = videoRef.current;
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        // 1. Parallel check: Did we see a barcode?
                        const barcodeMatch = await checkNativeBarcode(video);
                        if (barcodeMatch && isRunning) {
                            missCountRef.current = 0;
                            setTopMatch({ product: barcodeMatch, confidence: 0.99 });
                            if (autoAdd && autoAddArmedRef.current) {
                                handleConfirmAdd(barcodeMatch);
                                // Pause scanning briefly
                                await new Promise(r => setTimeout(r, 1200));
                            }
                            isProcessingRef.current = false;
                            animationFrameRef.current = requestAnimationFrame(scanLoop);
                            return;
                        }

                        // 2. Visual Center Extraction (Region of Interest: center 60% of frame)
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const cropSize = Math.min(vw, vh) * 0.65;
                        const cropX = (vw - cropSize) / 2;
                        const cropY = (vh - cropSize) / 2;

                        const canvas = canvasRef.current;
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });

                        if (ctx) {
                            ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 64, 64);
                            const frameSig = await extractVisualSignature(canvas, 64, 64);

                            if (frameSig && isRunning) {
                                let bestProduct: Product | null = null;
                                let highestScore = 0.72; // Minimum threshold

                                for (const [prodId, sig] of productSignaturesRef.current.entries()) {
                                    const score = compareSignatures(frameSig, sig);
                                    if (score > highestScore) {
                                        highestScore = score;
                                        const found = products.find(p => p.id === prodId);
                                        if (found) bestProduct = found;
                                    }
                                }

                                if (bestProduct && isRunning) {
                                    missCountRef.current = 0;
                                    setTopMatch({
                                        product: bestProduct,
                                        confidence: Math.round(highestScore * 100) / 100
                                    });

                                    // Auto add if threshold is very solid (>83%)
                                    if (autoAdd && highestScore >= 0.83 && autoAddArmedRef.current) {
                                        handleConfirmAdd(bestProduct);
                                        // Pause for 1.2s to prevent duplicate adds
                                        await new Promise(r => setTimeout(r, 1200));
                                    }
                                } else {
                                    // Three consecutive misses (~840ms) re-arm auto-add and
                                    // drop stale cards; a single jitter frame must not.
                                    missCountRef.current += 1;
                                    if (missCountRef.current >= 3) {
                                        autoAddArmedRef.current = true;
                                        setTopMatch(null);
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[VisionScanner] Frame error:', e);
                } finally {
                    isProcessingRef.current = false;
                }
            }

            if (isRunning) {
                animationFrameRef.current = requestAnimationFrame(scanLoop);
            }
        };

        animationFrameRef.current = requestAnimationFrame(scanLoop);

        return () => {
            isRunning = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [cameraActive, isOpen, autoAdd, checkNativeBarcode, handleConfirmAdd, products]);

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
                <DialogHeader className="p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                                Vision AI Scanner
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-[10px] font-mono py-0">
                                    EDGE AI
                                </Badge>
                            </DialogTitle>
                            <p className="text-xs text-slate-400">
                                Point camera at any product to recognize it
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full h-8 w-8"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </DialogHeader>

                {/* Viewfinder Area */}
                <div className="relative aspect-[3/4] w-full bg-black overflow-hidden flex items-center justify-center">
                    {/* Hidden canvas for mathematical frame parsing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera Video Feed */}
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Camera Error Display */}
                    {cameraError && (
                        <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                            <h4 className="text-sm font-semibold text-white mb-1">Camera Unavailable</h4>
                            <p className="text-xs text-slate-400 max-w-xs mb-4">{cameraError}</p>
                            <Button size="sm" variant="outline" onClick={startCamera} className="border-slate-700 text-slate-200">
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                            </Button>
                        </div>
                    )}

                    {/* AI Target Box & Corner Brackets */}
                    {cameraActive && !cameraError && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {/* Darkened overlay mask around center box */}
                            <div className="w-64 h-64 relative">
                                {/* Glowing Corner Accents */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-400 rounded-tl-lg shadow-[0_0_12px_rgba(244,113,37,0.5)]" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400 rounded-tr-lg shadow-[0_0_12px_rgba(244,113,37,0.5)]" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400 rounded-bl-lg shadow-[0_0_12px_rgba(244,113,37,0.5)]" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-400 rounded-br-lg shadow-[0_0_12px_rgba(244,113,37,0.5)]" />

                                {/* Sweeping Scanline Animation */}
                                <motion.div 
                                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_8px_rgba(244,113,37,0.8)]"
                                    animate={{ top: ['5%', '95%', '5%'] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                />

                                {/* Center Reticle */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                    <ScanLine className="w-12 h-12 text-orange-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Added Banner Notification */}
                    <AnimatePresence>
                        {addedFeedback && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className="absolute top-4 left-4 right-4 z-30 bg-emerald-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg shadow-emerald-950/40"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-xs font-semibold truncate max-w-[220px]">
                                        Added: {addedFeedback}
                                    </span>
                                </div>
                                <Badge className="bg-white/20 text-white text-[10px] uppercase font-bold">
                                    In Cart
                                </Badge>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Camera Controls Overlay (Top Right) */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {torchSupported && (
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={toggleTorch}
                                className={`rounded-full h-8 w-8 backdrop-blur-md ${isTorchOn ? 'bg-orange-500 text-white' : 'bg-slate-900/70 text-slate-200'}`}
                            >
                                {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                            className="rounded-full h-8 w-8 bg-slate-900/70 backdrop-blur-md text-slate-200 hover:text-white"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Bottom Status / Detected Item Card */}
                    <div className="absolute bottom-4 left-4 right-4 z-20">
                        <AnimatePresence mode="wait">
                            {topMatch ? (
                                <motion.div
                                    key={topMatch.product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                                            {topMatch.product.imageUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img 
                                                    src={topMatch.product.imageUrl} 
                                                    alt={topMatch.product.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 font-medium">
                                                    {Math.round(topMatch.confidence * 100)}% Match
                                                </Badge>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    Stock: {topMatch.product.stock}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-semibold text-white truncate">
                                                {topMatch.product.name}
                                            </h4>
                                            <p className="text-xs font-bold text-orange-400">
                                                {currencySymbol}{topMatch.product.price?.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => handleConfirmAdd(topMatch.product)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium shrink-0 h-9 px-3 gap-1 rounded-xl shadow-md shadow-orange-950/50"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-slate-900/70 border border-slate-800/60 backdrop-blur-md px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs text-slate-300"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Scanning frame...</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                        {signaturesIndexed} items indexed
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Settings */}
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="auto-add"
                            checked={autoAdd}
                            onCheckedChange={setAutoAdd}
                            className="data-[state=checked]:bg-orange-500"
                        />
                        <Label htmlFor="auto-add" className="cursor-pointer text-xs text-slate-300">
                            Auto-Add on match (&gt;82%)
                        </Label>
                    </div>
                    <span className="text-[10px] text-slate-500">
                        100% On-Device · Zero Cloud Cost
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
