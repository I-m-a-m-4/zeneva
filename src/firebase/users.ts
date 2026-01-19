
'use client';
import {
  doc,
  setDoc,
  serverTimestamp,
  type Firestore,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  increment,
  addDoc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { add } from 'date-fns';

/**
 * Finds a referrer's user ID and business ID based on a referral code.
 * @param firestore The Firestore instance.
 * @param referralCode The referral code to look for.
 * @returns An object with the referrer's ID and business ID, or null if not found.
 */
async function findReferrer(firestore: Firestore, referralCode?: string): Promise<{ referrerId: string, referrerBusinessId: string } | null> {
    if (!referralCode) return null;
    try {
        const q = query(collection(firestore, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return {
                referrerId: doc.id,
                referrerBusinessId: doc.data().businessId,
            };
        }
    } catch (e) {
        console.error("Error finding referrer:", e);
    }
    return null;
}


/**
 * Creates a user profile document in Firestore.
 * This is intended to be called right after a new user is created.
 * This function is now structured to be more robust, ensuring the new user's
 * account is always created successfully, even if referral logic fails.
 */
export const createUserProfileDocument = async (
  firestore: Firestore,
  user: User,
  displayName: string,
  referralCodeInput?: string,
) => {
  const userDocRef = doc(firestore, `users/${user.uid}`);

  // 1. Check for a pending invitation first (highest priority).
  const invitationQuery = query(collection(firestore, 'invitations'), where('email', '==', user.email));
  const invitationSnapshot = await getDocs(invitationQuery);

  if (!invitationSnapshot.empty) {
    // ---- CASE 1: User was invited to an existing business ----
    const inviteBatch = writeBatch(firestore);
    const invitationDoc = invitationSnapshot.docs[0];
    const invitationData = invitationDoc.data();

    const userProfile = {
      email: user.email,
      name: displayName || invitationData.name || user.email,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      businessId: invitationData.businessId,
      role: invitationData.role,
      surveyCompleted: true,
      referralCode: user.uid.substring(0, 8).toUpperCase(),
      referrals: 0,
      status: 'active',
    };
    inviteBatch.set(userDocRef, userProfile);
    inviteBatch.delete(invitationDoc.ref); // Consume the invitation
    await inviteBatch.commit();
    return; // Done.
  }

  // --- If not invited, create a new business for the user. ---
  // This is the primary operation and must succeed.
  const newUserBatch = writeBatch(firestore);
  const businessDocRef = doc(collection(firestore, 'businessInstances'));
  const trialEndDate = add(new Date(), { days: 7 });

  const businessData = {
      name: `${displayName}'s Business`,
      createdAt: serverTimestamp(),
      ownerId: user.uid,
      plan: 'starter',
      trialExpiresAt: trialEndDate,
      settings: { currency: 'NGN', timezone: 'Africa/Lagos', defaultTaxRate: 0, productCategories: [] }
  };
  newUserBatch.set(businessDocRef, businessData);
  
  // Find referrer ID before creating user profile
  const referrer = await findReferrer(firestore, referralCodeInput);

  const newUserProfile = {
      email: user.email,
      name: displayName,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      businessId: businessDocRef.id,
      role: 'admin',
      surveyCompleted: true,
      referralCode: user.uid.substring(0, 8).toUpperCase(),
      referrals: 0,
      status: 'active',
      ...(referrer && { referredBy: referrer.referrerId }), // Add referredBy if a referrer was found
  };
  newUserBatch.set(userDocRef, newUserProfile);

  // CRITICAL: Commit the creation of the new user and their business.
  await newUserBatch.commit();

  // --- Step 2. Handle Referral Logic (Secondary, non-blocking operation) ---
  if (referrer && referrer.referrerId && referrer.referrerBusinessId) {
    try {
      await runTransaction(firestore, async (transaction) => {
        const referrerUserRef = doc(firestore, 'users', referrer.referrerId);
        const referrerBusinessRef = doc(firestore, 'businessInstances', referrer.referrerBusinessId);

        // --- READS FIRST ---
        const referrerBusinessDoc = await transaction.get(referrerBusinessRef);
        if (!referrerBusinessDoc.exists()) {
            console.error("Referrer's business document not found. Cannot apply reward.");
            return; // Abort transaction gracefully
        }

        // --- LOGIC ---
        const businessData = referrerBusinessDoc.data();
        const currentExpiry = businessData.trialExpiresAt?.toDate();
        const now = new Date();
        
        // If trial is expired/in the past, start a new 10-day trial from today.
        // Otherwise, extend the current trial by 10 days.
        const newExpiryDate = (currentExpiry && currentExpiry > now)
            ? add(currentExpiry, { days: 10 })
            : add(now, { days: 10 });
        
        // --- WRITES ---
        // 1. Update the referrer's business with the new trial date.
        transaction.update(referrerBusinessRef, { trialExpiresAt: newExpiryDate });

        // 2. Increment the referrer's count.
        transaction.update(referrerUserRef, { referrals: increment(1) });
        
        // 3. Log the successful referral event for analytics.
        const referralLogRef = doc(collection(firestore, 'referrals'));
        transaction.set(referralLogRef, { 
          referrerId: referrer.referrerId, 
          referredUserId: user.uid, 
          createdAt: serverTimestamp() 
        });

        // 4. Send a notification to the referrer.
        const notificationRef = doc(collection(firestore, `users/${referrer.referrerId}/notifications`));
        transaction.set(notificationRef, {
            title: 'New Referral! 🎉',
            body: `10 days have been added to your trial. Your referral count is now updated.`,
            read: false,
            createdAt: serverTimestamp()
        });
      });
    } catch (rewardError) {
      console.error("Failed to apply referral reward, but user creation was successful.", rewardError);
    }
  }
};
