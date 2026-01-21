
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
import type { UserProfile, UserRole, BusinessInstance } from '@/types';

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
    const trialEndDate = add(new Date(), { days: 30 });

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

  // --- PRE-TRANSACTION READS ---
  // These are queries, which are not allowed inside a client-side transaction.
  const invitationQuery = query(collection(firestore, 'invitations'), where('email', '==', user.email));
  const invitationSnapshot = await getDocs(invitationQuery);
  const invitationDoc = !invitationSnapshot.empty ? invitationSnapshot.docs[0] : null;

  const referrerId = await findReferrerId(firestore, referralCodeInput);

  // --- ATOMIC TRANSACTION ---
  await runTransaction(firestore, async (transaction) => {
    let businessId: string;
    let userRole: UserRole;

    // 1. Determine Business & Role
    if (invitationDoc) {
      const invitationData = invitationDoc.data();
      businessId = invitationData.businessId;
      userRole = invitationData.role;
      transaction.delete(invitationDoc.ref); // Consume invitation
    } else {
      const businessDocRef = doc(collection(firestore, 'businessInstances'));
      businessId = businessDocRef.id;
      userRole = 'admin';
      const trialEndDate = add(new Date(), { days: 30 });
      transaction.set(businessDocRef, {
        name: `${displayName}'s Business`,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        plan: 'starter',
        trialExpiresAt: trialEndDate,
        status: 'active',
        settings: { currency: 'NGN', timezone: 'Africa/Lagos', defaultTaxRate: 0, productCategories: [] }
      });
    }

    // 2. Process Referral
    let referredBy: string | null = null;
    if (referrerId && referrerId !== user.uid) {
        referredBy = referrerId;
        const referrerUserRef = doc(firestore, 'users', referrerId);
        const referrerDoc = await transaction.get(referrerUserRef);

        if (referrerDoc.exists()) {
            const referrerData = referrerDoc.data() as UserProfile;

            // Only proceed if the referrer has a business to apply the reward to
            if (referrerData.businessId) {
                const businessRef = doc(firestore, 'businessInstances', referrerData.businessId);
                const businessDoc = await transaction.get(businessRef); // Read inside transaction

                if (businessDoc.exists()) {
                    const businessData = businessDoc.data() as BusinessInstance;
                    // If trial has expired, start new trial from now. Otherwise, extend existing.
                    const currentExpiry = businessData.trialExpiresAt?.toDate() ?? new Date();
                    const startDateForExtension = currentExpiry > new Date() ? currentExpiry : new Date();
                    const newExpiryDate = add(startDateForExtension, { days: 10 });
                    
                    // Update referrer's business trial period
                    transaction.update(businessRef, { trialExpiresAt: newExpiryDate });

                    // Create a notification for the referrer confirming the reward
                    const notificationRef = doc(collection(firestore, `users/${referrerId}/notifications`));
                    transaction.set(notificationRef, {
                        title: 'Referral Reward!',
                        body: `Success! A new user signed up with your code and your trial has been extended by 10 days.`,
                        read: false, 
                        createdAt: serverTimestamp()
                    });
                }
            }
            
            // Always increment the referrer's counter
            transaction.update(referrerUserRef, { referrals: increment(1) });

            // Always log the referral event for analytics
            const referralLogRef = doc(collection(firestore, 'referrals'));
            transaction.set(referralLogRef, {
                referrerId: referrerId, 
                referredUserId: user.uid, 
                createdAt: serverTimestamp(),
            });
        }
    }
    
    // 3. Create the new user's profile
    const userProfile: Omit<UserProfile, 'id'> = {
        email: user.email!,
        name: displayName,
        phone: phone || '',
        createdAt: serverTimestamp(),
        businessId: businessId,
        role: userRole,
        surveyCompleted: true,
        referralCode: user.uid.substring(0, 8).toUpperCase(),
        referrals: 0,
        status: 'active',
        ...(referredBy && { referredBy: referredBy }),
    };
    transaction.set(userDocRef, userProfile);
  });
};
