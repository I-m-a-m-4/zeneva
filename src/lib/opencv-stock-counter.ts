/**
 * OpenCV & Computer Vision Stock Counter Utility
 *
 * Implements client-side contour detection, shape filtering, color feature extraction,
 * and similarity grouping to detect and count product units from a camera frame.
 * Includes automatic OpenCV.js dynamic loading and a resilient Canvas-based fallback.
 */

export interface DetectedBox {
  id: string;
  x: number;      // 0 to 1 relative coordinate
  y: number;      // 0 to 1 relative coordinate
  width: number;  // 0 to 1 relative coordinate
  height: number; // 0 to 1 relative coordinate
  confidence: number;
  clusterId: number;
  isPrimaryGroup: boolean;
}

export interface CountResult {
  boxes: DetectedBox[];
  count: number;
  engine: 'opencv' | 'canvas';
  executionTimeMs: number;
}

let openCvPromise: Promise<any> | null = null;

/**
 * Loads OpenCV.js dynamically if not already available.
 */
export function loadOpenCV(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  // If already loaded and initialized
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve((window as any).cv);
  }

  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve) => {
    // Check if script tag already exists
    const existing = document.getElementById('opencv-script');
    if (existing && (window as any).cv?.Mat) {
      return resolve((window as any).cv);
    }

    const script = document.createElement('script');
    script.id = 'opencv-script';
    script.src = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.1/opencv.js';
    script.async = true;

    // Timeout safety fallback (5s)
    const timer = setTimeout(() => {
      console.warn('OpenCV.js loading timed out, using Canvas fallback.');
      resolve(null);
    }, 6000);

    script.onload = () => {
      const checkReady = () => {
        if ((window as any).cv && (window as any).cv.Mat) {
          clearTimeout(timer);
          resolve((window as any).cv);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      clearTimeout(timer);
      console.warn('Failed to load OpenCV.js script from CDN.');
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return openCvPromise;
}

/**
 * Calculates Intersection over Union between two normalized boxes
 */
function calculateIoU(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Non-Maximum Suppression (NMS) to eliminate duplicate/overlapping detections.
 */
function applyNMS(boxes: DetectedBox[], iouThreshold = 0.35): DetectedBox[] {
  if (boxes.length <= 1) return boxes;

  // Sort by confidence descending
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: DetectedBox[] = [];

  for (const box of sorted) {
    let shouldKeep = true;
    for (const k of kept) {
      if (calculateIoU(box, k) > iouThreshold) {
        shouldKeep = false;
        break;
      }
    }
    if (shouldKeep) {
      kept.push(box);
    }
  }

  return kept;
}

/**
 * Extracts average color (RGB and HSV hue) from a bounding box region in the canvas.
 */
function extractBoxColor(ctx: CanvasRenderingContext2D, box: { x: number; y: number; width: number; height: number }, canvasWidth: number, canvasHeight: number) {
  const px = Math.floor(box.x * canvasWidth);
  const py = Math.floor(box.y * canvasHeight);
  const pw = Math.max(1, Math.floor(box.width * canvasWidth));
  const ph = Math.max(1, Math.floor(box.height * canvasHeight));

  try {
    const imgData = ctx.getImageData(px, py, pw, ph);
    const data = imgData.data;
    let rSum = 0, gSum = 0, bSum = 0;
    const step = Math.max(1, Math.floor(data.length / (4 * 100))); // sample up to 100 pixels

    let count = 0;
    for (let i = 0; i < data.length; i += 4 * step) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    const r = count > 0 ? rSum / count : 128;
    const g = count > 0 ? gSum / count : 128;
    const b = count > 0 ? bSum / count : 128;

    // Convert to HSV Hue (0-360)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }

    return { r, g, b, h };
  } catch {
    return { r: 128, g: 128, b: 128, h: 0 };
  }
}

/**
 * Groups candidate boxes into clusters of similar products based on area, aspect ratio, and color.
 */
function groupSimilarProducts(
  rawBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }>,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): DetectedBox[] {
  if (rawBoxes.length === 0) return [];

  // Enrich boxes with features
  const enriched = rawBoxes.map((b, i) => {
    const area = b.width * b.height;
    const aspect = b.width / b.height;
    const color = extractBoxColor(ctx, b, canvasWidth, canvasHeight);
    return {
      id: `box-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      ...b,
      area,
      aspect,
      color,
      clusterId: 0,
      isPrimaryGroup: false,
    };
  });

  // Calculate median area and aspect ratio of candidates
  const sortedAreas = [...enriched].map(e => e.area).sort((a, b) => a - b);
  const medianArea = sortedAreas[Math.floor(sortedAreas.length / 2)];

  const sortedAspects = [...enriched].map(e => e.aspect).sort((a, b) => a - b);
  const medianAspect = sortedAspects[Math.floor(sortedAspects.length / 2)];

  // Group into clusters: items close to the median or close to each other
  enriched.forEach(item => {
    const areaRatio = item.area / (medianArea || 1);
    const aspectDiff = Math.abs(item.aspect - medianAspect);

    // If within 2.5x area ratio and comparable aspect ratio, mark as primary group
    const isSimilar = areaRatio >= 0.35 && areaRatio <= 2.8 && aspectDiff < 1.4;
    item.isPrimaryGroup = isSimilar;
    item.clusterId = isSimilar ? 1 : 2;
  });

  // Keep primary group items as main count
  const primaryBoxes = enriched.filter(e => e.isPrimaryGroup);
  const finalBoxes = primaryBoxes.length > 0 ? primaryBoxes : enriched;

  return applyNMS(finalBoxes);
}

/**
 * Counts items on a canvas using OpenCV.js.
 */
async function processWithOpenCV(cv: any, canvas: HTMLCanvasElement): Promise<DetectedBox[]> {
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const closed = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // 1. Grayscale conversion
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. Gaussian blur to remove camera sensor noise
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

    // 3. Multi-scale Canny edge detection
    cv.Canny(blur, edges, 45, 135);

    // 4. Morphological closing to connect adjacent product contours
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    // 5. Find external contours
    cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const rawBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }> = [];
    const totalArea = canvas.width * canvas.height;
    const minArea = totalArea * 0.003; // At least 0.3% of viewfinder
    const maxArea = totalArea * 0.50;  // At most 50% of viewfinder

    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      const area = rect.width * rect.height;
      const aspect = rect.width / rect.height;

      // Filter out border frames, tiny specks, and extreme line shapes
      if (area >= minArea && area <= maxArea && aspect >= 0.22 && aspect <= 4.5) {
        // Calculate rough solidity/confidence
        const contourArea = cv.contourArea(contour);
        const solidity = Math.min(1.0, Math.max(0.4, contourArea / (area || 1)));

        rawBoxes.push({
          x: rect.x / canvas.width,
          y: rect.y / canvas.height,
          width: rect.width / canvas.width,
          height: rect.height / canvas.height,
          confidence: Math.round(solidity * 100),
        });
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return rawBoxes.map((b, i) => ({ ...b, id: `box-${i}`, clusterId: 1, isPrimaryGroup: true }));

    return groupSimilarProducts(rawBoxes, ctx, canvas.width, canvas.height);
  } finally {
    src.delete();
    gray.delete();
    blur.delete();
    edges.delete();
    closed.delete();
    contours.delete();
    hierarchy.delete();
  }
}

/**
 * Resilient Canvas-based Fallback edge and connected-component detector.
 * Runs instantly without any external script dependencies or internet access.
 */
function processWithCanvasFallback(canvas: HTMLCanvasElement): DetectedBox[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Downsample to a fast grid (e.g. 160x120) for rapid connected-component analysis
  const gw = 160;
  const gh = Math.floor((h / w) * gw);
  const scaleX = w / gw;
  const scaleY = h / gh;

  const grayGrid = new Float32Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const px = Math.min(w - 1, Math.floor(gx * scaleX));
      const py = Math.min(h - 1, Math.floor(gy * scaleY));
      const idx = (py * w + px) * 4;
      grayGrid[gy * gw + gx] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  // Sobel Edge Detection
  const edgeGrid = new Uint8Array(gw * gh);
  let edgeSum = 0;

  for (let gy = 1; gy < gh - 1; gy++) {
    for (let gx = 1; gx < gw - 1; gx++) {
      const gxVal =
        -grayGrid[(gy - 1) * gw + (gx - 1)] + grayGrid[(gy - 1) * gw + (gx + 1)] +
        -2 * grayGrid[gy * gw + (gx - 1)] + 2 * grayGrid[gy * gw + (gx + 1)] +
        -grayGrid[(gy + 1) * gw + (gx - 1)] + grayGrid[(gy + 1) * gw + (gx + 1)];

      const gyVal =
        -grayGrid[(gy - 1) * gw + (gx - 1)] - 2 * grayGrid[(gy - 1) * gw + gx] - grayGrid[(gy - 1) * gw + (gx + 1)] +
        grayGrid[(gy + 1) * gw + (gx - 1)] + 2 * grayGrid[(gy + 1) * gw + gx] + grayGrid[(gy + 1) * gw + (gx + 1)];

      const mag = Math.sqrt(gxVal * gxVal + gyVal * gyVal);
      edgeGrid[gy * gw + gx] = mag > 35 ? 1 : 0;
      edgeSum += edgeGrid[gy * gw + gx];
    }
  }

  // Connected Components Labeling (BFS)
  const visited = new Uint8Array(gw * gh);
  const rawBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }> = [];

  const minGridPixels = (gw * gh) * 0.004;
  const maxGridPixels = (gw * gh) * 0.40;

  for (let gy = 1; gy < gh - 1; gy++) {
    for (let gx = 1; gx < gw - 1; gx++) {
      const idx = gy * gw + gx;
      if (edgeGrid[idx] === 1 && !visited[idx]) {
        // BFS flood fill
        let minX = gx, maxX = gx, minY = gy, maxY = gy, pixelCount = 0;
        const queue = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          const cy = Math.floor(curr / gw);
          const cx = curr % gw;
          pixelCount++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4-neighborhood
          const neighbors = [curr - 1, curr + 1, curr - gw, curr + gw];
          for (const n of neighbors) {
            if (n >= 0 && n < gw * gh && edgeGrid[n] === 1 && !visited[n]) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const area = bw * bh;

        if (pixelCount >= minGridPixels && pixelCount <= maxGridPixels && bw >= 4 && bh >= 4) {
          rawBoxes.push({
            x: (minX * scaleX) / w,
            y: (minY * scaleY) / h,
            width: (bw * scaleX) / w,
            height: (bh * scaleY) / h,
            confidence: 85,
          });
        }
      }
    }
  }

  return groupSimilarProducts(rawBoxes, ctx, w, h);
}

/**
 * Main detection pipeline: captures and counts items on the canvas,
 * prioritizing OpenCV.js with instant Canvas fallback.
 */
export async function countItemsFromCanvas(canvas: HTMLCanvasElement): Promise<CountResult> {
  const start = performance.now();
  let cv: any = null;

  try {
    cv = await loadOpenCV();
  } catch (err) {
    console.warn('OpenCV load check failed:', err);
  }

  let boxes: DetectedBox[] = [];
  let engine: 'opencv' | 'canvas' = 'canvas';

  if (cv && cv.Mat) {
    try {
      boxes = await processWithOpenCV(cv, canvas);
      engine = 'opencv';
    } catch (err) {
      console.error('OpenCV processing encountered an error, falling back to Canvas:', err);
      boxes = processWithCanvasFallback(canvas);
      engine = 'canvas';
    }
  } else {
    boxes = processWithCanvasFallback(canvas);
    engine = 'canvas';
  }

  const executionTimeMs = Math.round(performance.now() - start);

  return {
    boxes,
    count: boxes.length,
    engine,
    executionTimeMs,
  };
}
