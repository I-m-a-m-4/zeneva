import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const url = req.nextUrl;

    // Get hostname (e.g. zeneva.space, shop.zeneva.space, localhost:3000)
    const hostname = req.headers.get("host") || "";

    // Remove port if present
    const domain = hostname.split(":")[0];

    // Define restricted subdomains that should NOT be rewritten to /store
    const restrictedSubdomains = ["www", "app", "localhost"];

    // Logic for zeneva.space subdomains
    if (domain.endsWith(".zeneva.space") && domain !== "zeneva.space") {
        const subdomain = domain.replace(".zeneva.space", "");

        // If it's a restricted subdomain (like www.zeneva.space), let it pass through (don't rewrite to store)
        if (restrictedSubdomains.includes(subdomain)) {
            return NextResponse.next();
        }

        // Rewrite to the store path
        // e.g. zeneva-shop.zeneva.space/cart -> zeneva.space/store/zeneva-shop/cart
        console.log(`[Middleware] Rewriting subdomain ${subdomain} to /store/${subdomain}`);
        url.pathname = `/store/${subdomain}${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_vercel/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};
