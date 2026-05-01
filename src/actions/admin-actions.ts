
'use server';

import { adminAuth } from '@/firebase/admin';

export async function deleteBusinessUsersAuth(uids: string[]) {
    if (!adminAuth) {
        throw new Error("Firebase Admin not initialized. Cannot delete auth accounts.");
    }

    const results = {
        success: [] as string[],
        failed: [] as string[]
    };

    for (const uid of uids) {
        try {
            await adminAuth.deleteUser(uid);
            results.success.push(uid);
        } catch (error: any) {
            console.error(`Failed to delete auth user ${uid}:`, error.message);
            // We don't throw here to allow other deletions to continue
            // If the user doesn't exist in Auth but exists in Firestore, it's fine
            results.failed.push(uid);
        }
    }

    return results;
}
