import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 2;

// Deliberately excludes SVG: it is a scriptable document, and serving one from
// our own origin would turn an attacker-supplied URL into same-origin XSS.
const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/bmp',
]);

function isPrivateIPv4(ip: string): boolean {
    const [a, b] = ip.split('.').map(Number);
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 192 && b === 0) ||
        (a === 198 && b >= 18 && b <= 19) ||
        a >= 224
    );
}

function isPrivateAddress(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) return isPrivateIPv4(ip);
    if (version !== 6) return true;

    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (/^f[cd]/.test(normalized)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(normalized)) return true; // fe80::/10 link local

    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return false;
}

/**
 * Rejects anything that is not a public http(s) URL.
 *
 * The hostname is resolved here rather than left to fetch, so a public-looking
 * name that points at loopback/metadata (or a wildcard-DNS alias) is refused
 * before a connection is opened. Redirects are re-validated hop by hop.
 */
async function assertSafeImageUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error('Invalid image URL');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported image URL');
    if (url.username || url.password) throw new Error('Unsupported image URL');

    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host) throw new Error('Unsupported image URL');
    if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.endsWith('.home.arpa')
    ) {
        throw new Error('Unsupported image URL');
    }

    // Numeric aliases (2130706433, 0x7f000001, 017700000001) avoid hostname checks.
    if (!isIP(host) && (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host))) {
        throw new Error('Unsupported image URL');
    }
    if (isIP(host) && isPrivateAddress(host)) throw new Error('Unsupported image URL');

    if (!isIP(host)) {
        const addresses = await lookup(host, { all: true, verbatim: true });
        if (addresses.length === 0 || addresses.some(a => isPrivateAddress(a.address))) {
            throw new Error('Unsupported image URL');
        }
    }

    return url;
}

async function fetchImageBuffer(rawUrl: string) {
    let url = await assertSafeImageUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const response = await fetch(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(15_000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/gif,image/*,*/*;q=0.8',
            },
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) throw new Error('Image host redirected without a location');
            if (hop === MAX_REDIRECTS) throw new Error('Too many redirects');
            url = await assertSafeImageUrl(new URL(location, url).toString());
            continue;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const declaredLength = Number(response.headers.get('content-length') || 0);
        if (declaredLength > MAX_IMAGE_BYTES) throw new Error('Image is too large');

        const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
            throw new Error('Unsupported image content type');
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error('Image is too large');

        return { buffer, contentType };
    }

    throw new Error('Too many redirects');
}

function imageResponse(buffer: ArrayBuffer, contentType: string) {
    return new NextResponse(buffer, {
        headers: {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'",
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const fallbackUrl = searchParams.get('fallback');

    if (!imageUrl) {
        return new NextResponse('URL parameter is required', { status: 400 });
    }

    try {
        try {
            const { buffer, contentType } = await fetchImageBuffer(imageUrl);
            return imageResponse(buffer, contentType);
        } catch (primaryErr) {
            console.warn(`[Image Proxy] Primary download failed for ${imageUrl}:`, primaryErr);

            // If primary failed and fallback exists, attempt fallback (e.g. CDN thumbnail)
            if (fallbackUrl && fallbackUrl !== imageUrl) {
                console.log(`[Image Proxy] Attempting fallback to ${fallbackUrl}`);
                const { buffer, contentType } = await fetchImageBuffer(fallbackUrl);
                return imageResponse(buffer, contentType);
            }
            throw primaryErr;
        }
    } catch (error: any) {
        // Do not echo internal resolution errors back to the caller.
        console.error('[Image Proxy] Error downloading image:', error);
        return new NextResponse('Could not load image', { status: 502 });
    }
}
