
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
  updateDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { add } from 'date-fns';

/**
 * Creates a new business instance and links it to an existing user.
 * This is used for reactivated users who need a fresh start.
 * @param firestore The Firestore instance.
 * @param user The Firebase user object.
 */
export const createNewBusinessForUser = async (firestore: Firestore, user: User) => {
    const userDocRef = doc(firestore, `users/${user.uid}`);
    
    const batch = writeBatch(firestore);
    const businessDocRef = doc(collection(firestore, 'businessInstances'));
    const trialEndDate = add(new Date(), { days: 7 });

    batch.set(businessDocRef, {
        name: `${user.displayName}'s Business`,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        plan: 'starter',
        trialExpiresAt: trialEndDate,
        status: 'active',
        settings: { currency: 'NGN', timezone: 'Africa/Lagos', defaultTaxRate: 0, productCategories: [] }
    });

    batch.update(userDocRef, {
        businessId: businessDocRef.id,
        role: 'admin', // Ensure they are admin of the new business
        surveyCompleted: true, // This is now an automatic step
    });

    await batch.commit();
};


/**
 * Finds a referrer's user ID based on a referral code.
 * @param firestore The Firestore instance.
 * @param referralCode The referral code to look for.
 * @returns The referrer's user ID, or null if not found.
 */
async function findReferrerId(firestore: Firestore, referralCode?: string): Promise<string | null> {
    if (!referralCode) return null;
    try {
        const q = query(collection(firestore, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].id;
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
  phone?: string
) => {
  const userDocRef = doc(firestore, `users/${user.uid}`);

  const existingUserDoc = await getDoc(userDocRef);
  if (existingUserDoc.exists()) {
    if (!existingUserDoc.data().businessId) {
        await createNewBusinessForUser(firestore, user);
    }
    return;
  }

  // Check for a pending invitation first (highest priority).
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
      phone: phone || invitationData.phone || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      businessId: invitationData.businessId,
      role: invitationData.role,
      surveyCompleted: true, // They are joining an existing business
      referralCode: user.uid.substring(0, 8).toUpperCase(),
      referrals: 0,
      status: 'active',
    };
    inviteBatch.set(userDocRef, userProfile);
    inviteBatch.delete(invitationDoc.ref); // Consume the invitation
    await inviteBatch.commit();
    return; // Done.
  }

  // --- CASE 2: New user creating their own business ---
  const batch = writeBatch(firestore);
  const businessDocRef = doc(collection(firestore, 'businessInstances'));
  
  let trialEndDate = add(new Date(), { days: 7 });

  batch.set(businessDocRef, {
      name: `${displayName}'s Business`,
      createdAt: serverTimestamp(),
      ownerId: user.uid,
      plan: 'starter',
      trialExpiresAt: trialEndDate,
      status: 'active',
      settings: { currency: 'NGN', timezone: 'Africa/Lagos', defaultTaxRate: 0, productCategories: [] }
  });

  const newUserProfile: any = {
      email: user.email,
      name: displayName,
      phone: phone || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      businessId: businessDocRef.id,
      role: 'admin',
      surveyCompleted: true,
      referralCode: user.uid.substring(0, 8).toUpperCase(),
      referrals: 0,
      status: 'active',
  };

  // Find the referrer ID first, before the transaction
  const referrerId = await findReferrerId(firestore, referralCodeInput);
  
  // If a referrer was found, add referral tracking to the batch
  if (referrerId) {
      newUserProfile.referredBy = referrerId;
      
      const referrerUserRef = doc(firestore, 'users', referrerId);
      const referrerDoc = await getDoc(referrerUserRef);

      if(referrerDoc.exists()) {
        const referrerData = referrerDoc.data();
        if (referrerData.businessId) {
            const referrerBusinessRef = doc(firestore, 'businessInstances', referrerData.businessId);
            const referrerBusinessDoc = await getDoc(referrerBusinessRef);

            if (referrerBusinessDoc.exists()) {
                const referrerBusinessData = referrerBusinessDoc.data();
                // Safely get the current expiry date, or use now() if it's missing/invalid
                const currentExpiry = referrerBusinessData.trialExpiresAt?.toDate() ?? new Date();
                const newExpiryDate = add(currentExpiry, { days: 10 });

                // Extend referrer's trial by 10 days
                batch.update(referrerBusinessRef, {
                    trialExpiresAt: newExpiryDate,
                });
                
                // Add log for the referral bonus
                const historyRef = doc(collection(firestore, `businessInstances/${referrerData.businessId}/subscription_history`));
                batch.set(historyRef, {
                    action: `Referral Bonus: +10 Days (from ${displayName})`,
                    amount: 0,
                    currency: 'NGN',
                    timestamp: serverTimestamp(),
                });
            }
        }
        
        batch.update(referrerUserRef, { referrals: increment(1) });
      
        const notificationRef = doc(collection(firestore, `users/${referrerId}/notifications`));
        batch.set(notificationRef, {
            title: 'New Referral! +10 Days Trial 🎉',
            body: `Someone signed up with your code. 10 days have been added to your trial period!`,
            read: false,
            createdAt: serverTimestamp()
        });

        const referralLogRef = doc(collection(firestore, 'referrals'));
        batch.set(referralLogRef, {
          referrerId: referrerId,
          referredUserId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
  }
  
  // Set the new user's profile (with or without referredBy)
  batch.set(userDocRef, newUserProfile);
  
  // Commit all user creation and referral counting operations at once.
  await batch.commit();

};


    