export const dynamic = 'force-static'; // [TAURI_INJECTED]
// [TAURI_HIDDEN] export const dynamic = 'force-static';
﻿import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';

/**
 * GET /api/admin/users
 *
 * Returns the users collection fresh from Firestore (no Redis cache).
 * This is intentionally uncached so that the admin User Management page
 * always shows accurate real-time `lastSeen` presence data.
 */
export async function GET() {
    try {
        const snapshot = await adminFirestore
            .collection('users')
            .orderBy('name')
            .get();

        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // No-cache headers so the browser also doesn't cache this
        return NextResponse.json(users, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}


