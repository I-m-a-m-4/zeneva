'use server';

// import { getAuth } from '@/lib/auth'; // Ensure this exists or use firebase-admin
import { sendNotificationToUser } from '@/lib/server/notifications'; // Adjust path
// import { cookies } from 'next/headers'; // If using session cookies for auth
import { adminAuth, adminFirestore, adminMessaging } from '@/firebase/admin';
import { requireSuperAdmin, requireUser } from './admin-guard';

/**
 * Send the caller a test push.
 *
 * The target is the verified token's own uid, not a client-supplied id — this
 * used to accept any `userId`, which let anyone push a notification to any
 * user's devices. The parameter is kept for call-site compatibility but is only
 * honoured when it matches the caller.
 */
export async function sendTestNotification(userId: string, idToken?: string) {
    let callerUid: string;
    try {
        callerUid = await requireUser(idToken);
    } catch (err: any) {
        return { success: false, error: err.message };
    }

    if (userId && userId !== callerUid) {
        return { success: false, error: "You can only send a test notification to yourself." };
    }

    try {
        userId = callerUid;
        await sendNotificationToUser(userId, {
            title: "Test notification",
            body: "This is a test alert. Your notifications are working correctly.",
            url: "/settings"
        });
        return { success: true };
    } catch (error: any) {
        console.error("Test notification failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Push a notification to every registered device on the platform.
 *
 * Owner-only, and verified server-side: this reads `collectionGroup('fcmTokens')`
 * across all tenants, so an unauthenticated version of this action was a
 * spam-every-customer button sitting on a public URL.
 */
export async function broadcastNotification(title: string, body: string, url: string = '/', idToken?: string) {
    try {
        await requireSuperAdmin(idToken);

        if (!adminFirestore || !adminMessaging) {
            throw new Error("Firebase Admin Services are not initialized on the server.");
        }

        // Retrieve all tokens across all users
        const tokensSnapshot = await adminFirestore.collectionGroup('fcmTokens').get();
        if (tokensSnapshot.empty) {
            return { success: true, message: "No registered devices found." };
        }

        const tokens = Array.from(new Set(tokensSnapshot.docs.map((doc: any) => doc.data().token || doc.id).filter(Boolean))) as string[];

        // Firebase multicast limit is 500 tokens per request
        const chunks: string[][] = [];
        for (let i = 0; i < tokens.length; i += 500) {
            chunks.push(tokens.slice(i, i + 500));
        }

        let successCount = 0;
        let failureCount = 0;

        for (const chunk of chunks) {
            const message = {
                notification: {
                    title,
                    body,
                    imageUrl: 'https://zeneva.space/zeneva.png',
                },
                data: {
                    url,
                    icon: '/zeneva.png',
                },
                tokens: chunk,
            };

            const response = await adminMessaging.sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;
        }

        return { 
            success: true, 
            message: `Broadcast sent to ${successCount} devices. Failed on ${failureCount} devices.` 
        };
    } catch (error: any) {
        console.error("Broadcast notification failed:", error);
        return { success: false, error: error.message };
    }
}
