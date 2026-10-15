import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ZEN-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function backfill() {
  console.log('--- Starting Referral Code Backfill for Businesses ---');
  
  const assignedCodes = new Set<string>();

  // Fetch all existing businessInstances
  const snapshot = await db.collection('businessInstances').get();
  console.log(`Found ${snapshot.size} total businesses in businessInstances.`);

  // First collect any already assigned valid codes
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.referralCode && data.referralCode !== 'ZEN-APP' && data.referralCode !== 'ZEN-XXXXXX') {
      assignedCodes.add(data.referralCode);
    }
  });

  let updatedCount = 0;
  let alreadyValidCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentCode = data.referralCode;
    const bizName = data.name || doc.id;

    if (currentCode && currentCode !== 'ZEN-APP' && currentCode !== 'ZEN-XXXXXX') {
      console.log(`[SKIP] Business "${bizName}" (${doc.id}) already has valid referral code: ${currentCode}`);
      alreadyValidCount++;
      continue;
    }

    // Generate unique code
    let newCode = generateCode();
    while (assignedCodes.has(newCode)) {
      newCode = generateCode();
    }
    assignedCodes.add(newCode);

    await doc.ref.set(
      {
        referralCode: newCode,
        referralStats: data.referralStats || {
          totalReferred: 0,
          completedReferrals: 0,
          rewardDaysEarned: 0,
        },
      },
      { merge: true }
    );

    console.log(`[UPDATED] Business "${bizName}" (${doc.id}) assigned new referral code: ${newCode}`);
    updatedCount++;
  }

  // Also check if 'businesses' collection exists and synchronize
  try {
    const legacySnap = await db.collection('businesses').get();
    if (!legacySnap.empty) {
      console.log(`Found ${legacySnap.size} legacy businesses in 'businesses' collection.`);
      for (const doc of legacySnap.docs) {
        const data = doc.data();
        if (!data.referralCode || data.referralCode === 'ZEN-APP' || data.referralCode === 'ZEN-XXXXXX') {
          // Look if businessInstances has it
          const mirror = snapshot.docs.find(d => d.id === doc.id);
          const mirrorCode = mirror?.data()?.referralCode;
          let codeToUse = mirrorCode && mirrorCode !== 'ZEN-APP' ? mirrorCode : generateCode();
          while (assignedCodes.has(codeToUse)) {
            codeToUse = generateCode();
          }
          assignedCodes.add(codeToUse);
          await doc.ref.set({ referralCode: codeToUse }, { merge: true });
          console.log(`[LEGACY] Business "${data.name || doc.id}" updated with code: ${codeToUse}`);
        }
      }
    }
  } catch (err) {
    // Ignore legacy collection errors
  }

  console.log('--- Referral Code Backfill Complete ---');
  console.log(`Summary: ${updatedCount} updated, ${alreadyValidCount} already valid, ${snapshot.size} total.`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
