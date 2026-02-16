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

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        // 2. Send multicast message
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: {
                url: payload.url || '/',
            },
            tokens: tokens,
        };

        const response = await adminMessaging.sendMulticast(message);

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
