
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
 * The function now uses set with merge to be more resilient, creating the user
 * doc if it doesn't exist.
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

    // Use set with merge to prevent "No document to update" errors.
    batch.set(userDocRef, {
        businessId: businessDocRef.id,
        role: 'admin', // Ensure they are admin of the new business
        surveyCompleted: true, // This is now an automatic step
    }, { merge: true });

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
  
  // --- Pre-Transaction: Find Referrer ---
  const referrerId = await findReferrerId(firestore, referralCodeInput);

  // --- Main User Creation Transaction ---
  try {
    const invitationQuery = query(collection(firestore, 'invitations'), where('email', '==', user.email));
    const invitationSnapshot = await getDocs(invitationQuery);
    const invitationDoc = !invitationSnapshot.empty ? invitationSnapshot.docs[0] : null;

    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      // If user document already exists, stop the transaction to prevent overwrites.
      if (userDoc.exists()) {
        console.log("User document already exists, skipping creation in this flow.");
        return; 
      }
      
      let businessId: string;
      let userRole: UserRole;

      if (invitationDoc) {
        // User is joining an existing business.
        const invitationData = invitationDoc.data();
        businessId = invitationData.businessId;
        userRole = invitationData.role;
        transaction.delete(invitationDoc.ref); // Consume invitation
      } else {
        // User is creating a new business.
        const businessDocRef = doc(collection(firestore, 'businessInstances'));
        businessId = businessDocRef.id;
        userRole = 'admin';
        const trialEndDate = add(new Date(), { days: 30 });
        const newBusiness: Omit<BusinessInstance, 'id'> = {
          name: `${displayName}'s Business`,
          createdAt: serverTimestamp(),
          ownerId: user.uid,
          plan: 'starter',
          trialExpiresAt: trialEndDate,
          status: 'active',
          settings: { currency: 'NGN', timezone: 'Africa/Lagos', defaultTaxRate: 0, productCategories: [] }
        };
        transaction.set(businessDocRef, newBusiness);
      }

      // Create the new user's profile, now including the referrerId if it exists.
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
        // Add the referredBy field atomically
        ...(referrerId && { referredBy: referrerId }),
      };
      transaction.set(userDocRef, userProfile);
    });

  } catch (error) {
    console.error("FATAL: User and Business creation failed.", error);
    throw error;
  }

  // --- Post-Transaction: Handle Referral Rewards & Notifications ---
  if (referrerId && referrerId !== user.uid) {
    try {
      const referrerUserRef = doc(firestore, 'users', referrerId);
      const referrerDoc = await getDoc(referrerUserRef);

      if (referrerDoc.exists()) {
        const referrerData = referrerDoc.data() as UserProfile;
        
        // Log the successful referral
        await addDoc(collection(firestore, 'referrals'), {
            referrerId: referrerId, 
            referredUserId: user.uid, 
            createdAt: serverTimestamp(),
        });
        
        // Let the new user know the referral was successful
        const newUserNotificationRef = collection(firestore, `users/${user.uid}/notifications`);
        await addDoc(newUserNotificationRef, {
            title: 'Referral Successful!',
            body: `Your account has been successfully credited for using a referral code from ${referrerData.name}.`,
            read: false, 
            createdAt: serverTimestamp()
        });
        
        await updateDoc(referrerUserRef, { referrals: increment(1) });
        
        const referrerNotificationRef = collection(firestore, `users/${referrerId}/notifications`);
        await addDoc(referrerNotificationRef, {
            title: 'New Referral!',
            body: `Success! ${displayName} just signed up with your code.`,
            read: false, 
            createdAt: serverTimestamp()
        });

        if (referrerData.businessId) {
          const businessRef = doc(firestore, 'businessInstances', referrerData.businessId);
          const businessDoc = await getDoc(businessRef);
          if (businessDoc.exists()) {
            const businessData = businessDoc.data() as BusinessInstance;
            if (businessData.accessLevel !== 'lifetime') {
                const currentExpiry = businessData.trialExpiresAt?.toDate() ?? new Date();
                const startDateForExtension = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiryDate = add(startDateForExtension, { days: 10 });
                await updateDoc(businessRef, { trialExpiresAt: newExpiryDate });
            }
          }
        }
      }
    } catch (referralError) {
        console.error("Non-critical error during referral processing:", referralError);
    }
  }
};
