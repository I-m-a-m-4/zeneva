import { adminMessaging, adminFirestore } from '@/firebase/admin';

export async function sendNotificationToUser(userId: string, payload: { title: string; body: string; url?: string }) {
    try {
        // 1. Get user's FCM tokens
        const tokensSnapshot = await adminFirestore
            .collection('users')
            .doc(userId)
            .collection('fcmTokens')
            .get();

        if (tokensSnapshot.empty) {
            console.log(`No devices found for user ${userId}`);
            return;
        }

        // use-fcm.ts writes the token as both the doc id and a `token` field, so fall
        // back to the id — a missing field would otherwise put `undefined` in the array
        // and make the send throw.
        const tokens = tokensSnapshot.docs
            .map(doc => doc.data().token || doc.id)
            .filter(Boolean) as string[];

        if (tokens.length === 0) {
            console.log(`No usable FCM tokens for user ${userId}`);
            return;
        }

        // 2. Send multicast message
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: 'https://zeneva.app/zeneva.png', // Optional: precise URL if possible, or relative if PWA
                // icon: '/zeneva.png', // Note: icon is often ignored by FCM on iOS/Android unless handled in SW
            },
            data: {
                url: payload.url || '/',
                icon: '/zeneva.png', // Send in data for SW to use
            },
            tokens: tokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);

        // 3. Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
            // Optional: Delete from Firestore
        }

        return response;
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}
