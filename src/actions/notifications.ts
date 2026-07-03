'use server';

// import { getAuth } from '@/lib/auth'; // Ensure this exists or use firebase-admin
import { sendNotificationToUser } from '@/lib/server/notifications'; // Adjust path
// import { cookies } from 'next/headers'; // If using session cookies for auth
import { adminAuth } from '@/firebase/admin';

export async function sendTestNotification(userId: string) {
    if (!userId) {
        return { success: false, error: "User ID is required" };
    }

    // In a real app, verify the caller is authorized to trigger this for themselves
    // For now, we trust the client-provided ID or check session if available.
    // Better: Get ID from session.

    try {
        await sendNotificationToUser(userId, {
            title: "Test Notification 🔔",
            body: "This is a test alert! Your notifications are working perfectly.",
            url: "/settings"
        });
        return { success: true };
    } catch (error: any) {
        console.error("Test notification failed:", error);
        return { success: false, error: error.message };
    }
}

export async function broadcastNotification(title: string, body: string, url: string = '/') {
    try {
        if (!adminFirestore || !adminMessaging) {
            throw new Error("Firebase Admin Services are not initialized on the server.");
        }

        // Retrieve all tokens across all users
        const tokensSnapshot = await adminFirestore.collectionGroup('fcmTokens').get();
        if (tokensSnapshot.empty) {
            return { success: true, message: "No registered devices found." };
        }

        const tokens = Array.from(new Set(tokensSnapshot.docs.map(doc => doc.data().token || doc.id).filter(Boolean))) as string[];

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

            const response = await adminMessaging.sendMulticast(message);
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
