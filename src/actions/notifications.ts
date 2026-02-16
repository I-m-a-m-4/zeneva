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
