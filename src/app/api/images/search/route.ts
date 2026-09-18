import { NextResponse } from 'next/server';

export interface ImageResult {
  id: string;
  title: string;
  urls: {
    regular: string;
    full: string;
    small: string;
  };
  alt_description: string;
  dimensions?: {
    width?: number;
    height?: number;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
}

// In-memory cache for fast repeated queries
const cache = new Map<string, { timestamp: number; results: ImageResult[] }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generates progressive fallback search queries for multi-word or detailed product names.
 * For example, "ALTRUIST SUNSCREEN SPF 30 200mls" produces:
 * 1. "ALTRUIST SUNSCREEN SPF 30 200mls" (exact query)
 * 2. "ALTRUIST SUNSCREEN SPF 30 200ml"  (normalized volume/units)
 * 3. "ALTRUIST SUNSCREEN SPF 30"        (without volume/packaging)
 * 4. "ALTRUIST SUNSCREEN"               (core brand + product name)
 */
function generateQueryFallbacks(rawQuery: string): string[] {
  const clean = rawQuery.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fallbacks: string[] = [clean];

  // 1. Normalize common unit typos: '200mls' -> '200ml', '500gms' -> '500g', etc.
  const normalizedUnits = clean
    .replace(/(\d+)\s*mls\b/gi, '$1ml')
    .replace(/(\d+)\s*ltrs?\b/gi, '$1l')
    .replace(/(\d+)\s*gms\b/gi, '$1g')
    .replace(/(\d+)\s*pcs\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalizedUnits && normalizedUnits.toLowerCase() !== clean.toLowerCase()) {
    fallbacks.push(normalizedUnits);
  }

  // 2. Remove parenthesized/bracketed details: (pack of 2), (for dry skin), [500ml]
  const noParentheses = clean.replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (noParentheses && noParentheses.toLowerCase() !== clean.toLowerCase()) {
    fallbacks.push(noParentheses);
  }

  // 3. Remove size/volume/weight suffix at the end (e.g. '200mls', '200ml', '50g', '1kg', 'pack of 3')
  const noSize = clean
    .replace(/\b\d+(\.\d+)?\s*(ml|mls|l|ltr|g|gm|gms|kg|oz|fl\s*oz|tablet|capsule|pack|pcs|piece|sachet|count)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (noSize && noSize.toLowerCase() !== clean.toLowerCase() && noSize.length >= 3) {
    fallbacks.push(noSize);
  }

  // 4. Remove secondary codes/SKU markers like '#123', 'SKU-...', 'v2', 'spf 30'
  const brandAndProduct = noSize
    .replace(/#\w+/g, '')
    .replace(/\b(spf\s*\d+|v\d+|no\.\s*\d+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (brandAndProduct && brandAndProduct.toLowerCase() !== noSize.toLowerCase() && brandAndProduct.length >= 3) {
    fallbacks.push(brandAndProduct);
  }

  // 5. First 3-4 significant words for very long product titles
  const words = clean.split(' ').filter(w => w.length > 1);
  if (words.length > 3) {
    const first3 = words.slice(0, 3).join(' ');
    if (!fallbacks.some(f => f.toLowerCase() === first3.toLowerCase())) {
      fallbacks.push(first3);
    }
  }

  return Array.from(new Set(fallbacks)).filter(q => q.length >= 2);
}

async function searchBing(query: string, limit: number): Promise<ImageResult[]> {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Bing HTTP ${response.status}`);
  }

  const html = await response.text();
  let matches = [...html.matchAll(/class="iusc"[^>]*m="([^"]+)"/g)].map(m => m[1]);
  if (matches.length === 0) {
    matches = [...html.matchAll(/m="({[^"]*?&quot;murl&quot;[^"]*?})"/g)].map(m => m[1]);
  }
  if (matches.length === 0) {
    throw new Error('No iusc matches found in Bing response');
  }

  const results: ImageResult[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    try {
      const data = JSON.parse(matches[i].replace(/&quot;/g, '"'));
      const regularUrl = data.murl;
      const thumbnailUrl = (data.turl || data.murl || '').replace(/&amp;/g, '&');

      if (!regularUrl || seenUrls.has(regularUrl)) continue;
      seenUrls.add(regularUrl);

      const cleanTitle = data.t ? data.t.replace(/[\uE000-\uF8FF]/g, '').trim() : query;

      let retailerName = 'Web';
      let sourceUrl = '#';
      if (data.purl) {
        try {
          sourceUrl = data.purl;
          const hostname = new URL(data.purl).hostname.replace(/^www\./, '');
          retailerName = hostname.charAt(0).toUpperCase() + hostname.slice(1);
        } catch {
          retailerName = 'Web';
        }
      }

      results.push({
        id: `bing-${i}-${Date.now()}`,
        title: cleanTitle,
        urls: {
          regular: regularUrl,
          full: regularUrl,
          small: thumbnailUrl || regularUrl
        },
        alt_description: cleanTitle,
        dimensions: {
          width: data.w ? parseInt(data.w, 10) : undefined,
          height: data.h ? parseInt(data.h, 10) : undefined,
        },
        user: {
          name: retailerName,
          links: { html: sourceUrl }
        }
      });

      if (results.length >= limit) break;
    } catch {
      // Continue parsing next match
    }
  }

  return results;
}

async function searchDuckDuckGo(query: string, limit: number): Promise<ImageResult[]> {
  // 1. Fetch token
  const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(8000)
  });

  const html = await tokenRes.text();
  const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([^"']+)["']/);
  if (!vqdMatch) throw new Error('No DDG vqd found');

  const rawCookies = tokenRes.headers.getSetCookie ? tokenRes.headers.getSetCookie() : [tokenRes.headers.get('set-cookie')];
  const cookieHeader = rawCookies.filter((c): c is string => Boolean(c)).map(c => c.split(';')[0]).join('; ');

  // 2. Fetch image JSON
  const apiRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}&f=,,,`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://duckduckgo.com/',
      'Cookie': cookieHeader,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!apiRes.ok) throw new Error(`DDG API HTTP ${apiRes.status}`);

  const data = await apiRes.json();
  const rawResults = data.results || [];

  return rawResults.slice(0, limit).map((r: any, i: number) => ({
    id: `ddg-${i}-${Date.now()}`,
    title: r.title || query,
    urls: {
      regular: r.image,
      full: r.image,
      small: r.thumbnail || r.image
    },
    alt_description: r.title || query,
    dimensions: {
      width: r.width ? parseInt(r.width, 10) : undefined,
      height: r.height ? parseInt(r.height, 10) : undefined,
    },
    user: {
      name: r.source || 'Web',
      links: { html: r.url || '#' }
    }
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limitParam = parseInt(searchParams.get('limit') || '30', 10);
  const limit = Math.min(Math.max(limitParam || 30, 1), 50);

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const cleanQuery = query.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  const results = await performImageSearch(cleanQuery, limit);

  // Always return 200 with results array, even if empty, to avoid frontend 500 crash
  return NextResponse.json({ results });
}

export async function performImageSearch(cleanQuery: string, limit: number): Promise<ImageResult[]> {
  const cacheKey = `${cleanQuery.toLowerCase()}:${limit}`;

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  const queryCandidates = generateQueryFallbacks(cleanQuery);
  let results: ImageResult[] = [];

  // Try candidate queries from most specific to relaxed until we find images
  for (const candidateQuery of queryCandidates) {
    // Tier 1: Try Bing Images (Fast, 30+ items)
    try {
      results = await searchBing(candidateQuery, limit);
      if (results.length > 0) break;
    } catch (bingErr) {
      console.warn(`[Image Search] Bing attempt failed for "${candidateQuery}":`, (bingErr as Error).message);
    }

    // Tier 2: Fallback to DuckDuckGo if Bing failed or had 0 results
    try {
      results = await searchDuckDuckGo(candidateQuery, limit);
      if (results.length > 0) break;
    } catch (ddgErr) {
      console.warn(`[Image Search] DDG attempt failed for "${candidateQuery}":`, (ddgErr as Error).message);
    }
  }

  // Cache results if we got any
  if (results.length > 0) {
    if (cache.size > 100) {
      // Evict oldest entries
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(cacheKey, { timestamp: Date.now(), results });
  }

  return results;
}
