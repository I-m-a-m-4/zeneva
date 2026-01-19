
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

  // --- 2. Handle Referral Logic (Secondary, non-blocking operation) ---
  // If a referrer was found, attempt to apply rewards in a separate, safe transaction.
  if (referrer && referrer.referrerId && referrer.referrerBusinessId) {
    try {
      const rewardBatch = writeBatch(firestore);
      const referrerUserRef = doc(firestore, 'users', referrer.referrerId);
      const referrerBusinessRef = doc(firestore, 'businessInstances', referrer.referrerBusinessId);
      
      // Increment referrer's count first
      rewardBatch.update(referrerUserRef, { referrals: increment(1) });
      
      // Log the successful referral event
      const referralLogRef = doc(collection(firestore, 'referrals'));
      rewardBatch.set(referralLogRef, { referrerId: referrer.referrerId, referredUserId: user.uid, createdAt: serverTimestamp() });

      // Now, fetch the business doc to check its status for the reward
      const referrerBusinessDoc = await getDoc(referrerBusinessRef);

      if (referrerBusinessDoc.exists()) {
        const businessData = referrerBusinessDoc.data();
        // Only apply trial extension reward if the referrer is not a lifetime user
        if (businessData.accessLevel !== 'lifetime') {
            const now = new Date();
            // Use existing trial date, or now if it doesn't exist
            const currentExpiry = businessData.trialExpiresAt ? (businessData.trialExpiresAt as Timestamp).toDate() : now;
            
            // If the trial has already expired, start the new 10-day period from today.
            // Otherwise, extend the existing future trial date.
            const newTrialStartDate = currentExpiry > now ? currentExpiry : now;
            const newExpiry = add(newTrialStartDate, { days: 10 });
            
            rewardBatch.update(referrerBusinessRef, { trialExpiresAt: newExpiry });
            
            // Notify the referrer of their reward
            const notificationRef = doc(collection(firestore, `users/${referrer.referrerId}/notifications`));
            rewardBatch.set(notificationRef, {
                title: 'Referral Success! 🎉',
                body: `Someone signed up with your code! 10 days have been added to your trial.`,
                read: false,
                createdAt: serverTimestamp()
            });
        }
      }

      await rewardBatch.commit(); // Commit the reward.

    } catch (rewardError) {
      // Log the error but don't fail the signup. The new user's account is already safe.
      console.error("Failed to apply referral reward, but user creation was successful.", rewardError);
    }
  }
};
