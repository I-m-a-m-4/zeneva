/**
 * ZENEVA EDGE VISION ENGINE
 * Local-first, on-device visual product recognition for POS checkout.
 * Operates 100% client-side with zero cloud API latency and zero cost.
 */

import type { Product } from '@/types';

export interface VisualSignature {
    // 64-bit perceptual luminance hash for shape & edges
    pHash: string;
    // Spatial color histogram (8-zone HSV color distribution: 8 zones * 12 color bins = 96 floats)
    colorHist: number[];
    // Dominant Hue, Saturation, Lightness
    dominantColor: { h: number; s: number; l: number };
    // Aspect ratio & contrast variance
    contrast: number;
}

export interface VisualMatch {
    product: Product;
    confidence: number; // 0 to 1
    reason: string;
}

/**
 * Resizes an image source into an offscreen canvas and computes a spatial color + perceptual shape signature.
 */
export async function extractVisualSignature(
    source: CanvasImageSource,
    width = 64,
    height = 64
): Promise<VisualSignature | null> {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(source, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 1. Compute Perceptual Hash (DCT / Mean Luminance Comparison on 8x8 blocks)
        let totalLuma = 0;
        const lumas: number[] = new Array(64).fill(0);
        const blockW = width / 8;
        const blockH = height / 8;

        for (let by = 0; by < 8; by++) {
            for (let bx = 0; bx < 8; bx++) {
                let blockSum = 0;
                let count = 0;
                for (let y = by * blockH; y < (by + 1) * blockH; y++) {
                    for (let x = bx * blockW; x < (bx + 1) * blockW; x++) {
                        const idx = ((Math.floor(y) * width) + Math.floor(x)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                        blockSum += luma;
                        count++;
                    }
                }
                const avg = blockSum / (count || 1);
                lumas[by * 8 + bx] = avg;
                totalLuma += avg;
            }
        }

        const avgLuma = totalLuma / 64;
        let pHash = '';
        for (let i = 0; i < 64; i++) {
            pHash += lumas[i] >= avgLuma ? '1' : '0';
        }

        // 2. Spatial 4-quadrant Color Distribution (Top, Bottom, Left, Right)
        // 12 hue bins (30 deg each) across 4 quadrants = 48 values
        const colorHist: number[] = new Array(48).fill(0);
        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = width * height;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            totalR += r;
            totalG += g;
            totalB += b;

            const pixelIdx = i / 4;
            const px = pixelIdx % width;
            const py = Math.floor(pixelIdx / width);

            // Quadrant 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
            const q = (py < height / 2 ? 0 : 2) + (px < width / 2 ? 0 : 1);

            // Convert RGB to Hue (0 to 360)
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0;
            const d = max - min;
            if (d !== 0) {
                if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                else if (max === g) h = ((b - r) / d + 2) * 60;
                else h = ((r - g) / d + 4) * 60;
            }

            const hueBin = Math.min(11, Math.floor(h / 30));
            colorHist[q * 12 + hueBin]++;
        }

        // Normalize color histogram
        const normHist = colorHist.map(v => v / (pixelCount / 4 || 1));

        // 3. Dominant Color
        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        const domHsl = rgbToHsl(avgR, avgG, avgB);

        // 4. Contrast standard deviation
        let varianceSum = 0;
        for (let i = 0; i < 64; i++) {
            varianceSum += Math.pow(lumas[i] - avgLuma, 2);
        }
        const contrast = Math.sqrt(varianceSum / 64);

        return {
            pHash,
            colorHist: normHist,
            dominantColor: domHsl,
            contrast
        };
    } catch (e) {
        console.warn('[VisionEngine] Failed to extract signature:', e);
        return null;
    }
}

/**
 * Computes cosine/Hamming similarity between two visual signatures (0.0 to 1.0)
 */
export function compareSignatures(a: VisualSignature, b: VisualSignature): number {
    // 1. Shape similarity via Hamming distance on 64-bit pHash
    let hammingMatches = 0;
    for (let i = 0; i < 64; i++) {
        if (a.pHash[i] === b.pHash[i]) hammingMatches++;
    }
    const shapeScore = hammingMatches / 64; // 0.0 to 1.0

    // 2. Color histogram cosine similarity
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.colorHist.length; i++) {
        dot += a.colorHist[i] * b.colorHist[i];
        normA += a.colorHist[i] * a.colorHist[i];
        normB += b.colorHist[i] * b.colorHist[i];
    }
    const colorScore = (normA > 0 && normB > 0) ? (dot / (Math.sqrt(normA) * Math.sqrt(normB))) : 0;

    // 3. Dominant Hue proximity
    const hueDiff = Math.abs(a.dominantColor.h - b.dominantColor.h);
    const circularHueDiff = Math.min(hueDiff, 360 - hueDiff);
    const hueScore = Math.max(0, 1 - (circularHueDiff / 180));

    // Weighted composite score (Shape: 35%, Spatial Color: 50%, Dominant Hue: 15%)
    return (shapeScore * 0.35) + (colorScore * 0.50) + (hueScore * 0.15);
}

/**
 * Helper to convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * Loads an image from URL and extracts its signature, with in-memory caching
 */
const signatureCache = new Map<string, VisualSignature>();

export async function getProductImageSignature(imageUrl: string): Promise<VisualSignature | null> {
    if (!imageUrl) return null;
    if (signatureCache.has(imageUrl)) return signatureCache.get(imageUrl)!;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            const sig = await extractVisualSignature(img);
            if (sig) signatureCache.set(imageUrl, sig);
            resolve(sig);
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}

/**
 * Plays an authentic, crisp POS checkout chime using the Web Audio API.
 */
let audioCtx: AudioContext | null = null;

export function playCheckoutBeep(type: 'success' | 'confirm' = 'success') {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }

        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'success') {
            // Bright 2-tone POS chime (1760Hz -> 2093Hz)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1760, now);
            osc.frequency.setValueAtTime(2093, now + 0.06);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now);
            osc.stop(now + 0.16);
        } else {
            // Confirmation lower chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }

        // Haptic pulse on mobile devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40]);
        }
    } catch {
        // Audio might be blocked by autoplay policies
    }
}

