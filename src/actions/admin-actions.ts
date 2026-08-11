
'use server';

import { adminAuth } from '@/firebase/admin';
import { requireSuperAdmin } from './admin-guard';

/**
 * Delete Firebase Auth accounts for a terminated business.
 *
 * Called by Cyber Shield's entity termination. This is about as destructive as a
 * call gets, and until now it took a bare array of uids with no proof of who was
 * asking — a `'use server'` export is a public endpoint, so that let anyone who
 * read the client bundle delete arbitrary accounts, including the owner's.
 *
 * `idToken` is now required and verified against the platform owner first.
 */
export async function deleteBusinessUsersAuth(uids: string[], idToken?: string) {
    await requireSuperAdmin(idToken);

    if (!adminAuth) {
        throw new Error("Firebase Admin not initialized. Cannot delete auth accounts.");
    }

    if (!Array.isArray(uids)) {
        throw new Error("Expected a list of user ids.");
    }

    const results = {
        success: [] as string[],
        failed: [] as string[]
    };

    for (const uid of uids) {
        if (typeof uid !== 'string' || !uid) {
            results.failed.push(String(uid));
            continue;
        }
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

/**
 * Revoke every refresh token for a user, killing all their live sessions.
 *
 * Suspending a user in Firestore stops new writes at the rules layer, but their
 * existing ID token stays valid for up to an hour. This is what makes a hard
 * kill immediate: paired with the `checkRevoked` verification in the chat route
 * and `requireSuperAdmin`, a revoked account loses server access at once.
 */
export async function revokeUserSessions(uid: string, idToken?: string) {
    await requireSuperAdmin(idToken);

    if (!adminAuth) {
        throw new Error("Firebase Admin not initialized.");
    }
    if (typeof uid !== 'string' || !uid) {
        throw new Error("A user id is required.");
    }

    await adminAuth.revokeRefreshTokens(uid);
    return { revoked: true, uid };
}
