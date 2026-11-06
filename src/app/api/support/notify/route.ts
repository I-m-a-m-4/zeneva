import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';
import { sendNotificationToUser } from '@/lib/server/notifications';
import { INTERNAL_ACCOUNT_EMAILS } from '@/lib/platform-revenue';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // This fans a message out to every internal admin's notification feed
        // and devices. Require a verified, active account; the sender name is
        // taken from their profile rather than the request body so nobody can
        // impersonate another user or business.
        if (!adminAuth) {
            return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 503 });
        }

        const authHeader = request.headers.get('authorization') || '';
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        if (!bearer) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(bearer, true);
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!adminFirestore) {
            return NextResponse.json({ error: 'Database unavailable.' }, { status: 500 });
        }

        const callerSnap = await adminFirestore.collection('users').doc(decoded.uid).get();
        if (!callerSnap.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const caller = callerSnap.data() || {};
        if (caller.status === 'suspended') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message is too long.' }, { status: 413 });
        }

        const querySnapshot = await adminFirestore
            .collection('users')
            .where('email', 'in', INTERNAL_ACCOUNT_EMAILS)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json({ success: true, message: 'No admin users to notify' });
        }

        const senderName =
            caller.name ||
            caller.displayName ||
            (typeof caller.email === 'string' ? caller.email.split('@')[0] : '') ||
            'A user';
        const title = `New Support Message from ${senderName}`;
        const bodyText = message.length > 100 ? message.substring(0, 97) + '...' : message;

        const notificationPromises = querySnapshot.docs.flatMap((doc: any) => {
            // Write to in-app notification feed
            const dbWrite = adminFirestore
                .collection('users')
                .doc(doc.id)
                .collection('notifications')
                .add({
                    title,
                    body: bodyText,
                    createdAt: new Date(),
                    read: false,
                    type: 'system',
                    link: '/admin-imamshaffy/support'
                });

            // Send push notification
            const pushSend = sendNotificationToUser(doc.id, {
                title,
                body: bodyText,
                url: '/admin-imamshaffy/support',
                source: 'system',
            });

            return [dbWrite, pushSend];
        });

        await Promise.all(notificationPromises);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in support notification API:', error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
