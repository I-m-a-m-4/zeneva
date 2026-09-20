import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/firebase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token, true);
        } catch (error) {
            return new NextResponse('Invalid token', { status: 401 });
        }

        const body = await request.json();
        const { businessId, event, payload } = body;

        if (!businessId || !event || !payload) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Verify the user is part of the business (optional strict check, but auth is enough for MVP)
        // Fetch webhooks for the business
        const webhooksSnapshot = await adminFirestore
            .collection('businessInstances')
            .doc(businessId)
            .collection('webhooks')
            .get();

        if (webhooksSnapshot.empty) {
            return NextResponse.json({ dispatched: 0 });
        }

        const promises = webhooksSnapshot.docs.map(async (doc) => {
            const webhook = doc.data();
            if (webhook.events && !webhook.events.includes(event)) {
                return;
            }

            const url = webhook.url;
            const secret = webhook.secret;

            const requestBody = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                businessId,
                data: payload,
            });

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'Zeneva-Webhook-Dispatcher/1.0'
            };

            if (secret) {
                const signature = crypto.createHmac('sha256', secret).update(requestBody).digest('hex');
                headers['X-Zeneva-Signature'] = signature;
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: requestBody,
                    // Timeout and not throwing on failure to not block other webhooks
                    signal: AbortSignal.timeout(5000), 
                });
                
                // We could log the result here to a webhook_logs subcollection
                if (!response.ok) {
                    console.error(`Webhook ${url} failed with status ${response.status}`);
                }
            } catch (err) {
                console.error(`Webhook ${url} failed to dispatch:`, err);
            }
        });

        await Promise.all(promises);

        return NextResponse.json({ success: true, dispatched: webhooksSnapshot.size });
    } catch (error) {
        console.error('Error dispatching webhooks:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
