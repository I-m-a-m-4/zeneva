import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!getFirestore) {
    initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    try {
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e) {}
}

const db = getFirestore();

async function cleanup() {
  console.log("Cleaning up old PDF references in blog posts...");
  try {
    const snapshot = await db.collection('blogPosts').where('title', '>=', 'Best Free PDF').get();
    
    if (snapshot.empty) {
      console.log("No PDF posts found.");
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      const title = doc.data().title;
      if (title.includes("PDF")) {
        console.log(`Deleting/Replacing post: ${title}`);
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log("Cleanup complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanup();
