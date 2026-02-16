
import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace \n from the private key string in environment variable
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error: any) {
        console.log('Firebase admin initialization error', error.stack);
    }
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export const adminMessaging = admin.messaging();
