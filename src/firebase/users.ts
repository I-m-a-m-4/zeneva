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
 * Creates a user profile document in Firestore, ensuring atomicity for signup.
 * This is the single source of truth for creating a new user and their associated business.
 * It's designed to be called only once upon successful user creation in Firebase Auth.
 */
export const createUserProfileDocument = async (
  firestore: Firestore,
  user: User,
  displayName: string,
  phone?: string
) => {
  const userDocRef = doc(firestore, `users/${user.uid}`);

  try {
    const invitationQuery = query(collection(firestore, 'invitations'), where('email', '==', user.email));
    const invitationSnapshot = await getDocs(invitationQuery);
    const invitationDoc = !invitationSnapshot.empty ? invitationSnapshot.docs[0] : null;

    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (userDoc.exists()) {
        console.warn(`User profile for ${user.uid} already exists. Aborting document creation.`);
        if (invitationDoc) {
          transaction.delete(invitationDoc.ref);
        }
        return;
      }
      
      let businessId: string;
      let userRole: UserRole;

      if (invitationDoc) {
        const invitationData = invitationDoc.data();
        businessId = invitationData.businessId;
        userRole = invitationData.role;
        transaction.delete(invitationDoc.ref);
      } else {
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

      const userProfile: Omit<UserProfile, 'id'> = {
        email: user.email!,
        name: displayName,
        phone: phone || '',
        createdAt: serverTimestamp(),
        businessId: businessId,
        role: userRole,
        surveyCompleted: true,
        status: 'active',
      };
      transaction.set(userDocRef, userProfile);
    });

  } catch (error) {
    console.error("FATAL: User and Business creation transaction failed.", error);
    throw error;
  }
};

/**
 * Polls Firestore until the user's profile document is available.
 * This is used after signup to prevent a race condition where the app
 * tries to read the profile before it has been created.
 */
export const waitForUserProfile = (firestore: Firestore, userId: string, timeout = 5000): Promise<void> => {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      const userDocRef = doc(firestore, `users/${userId}`);
      try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("Timed out waiting for user profile creation."));
        } else {
          setTimeout(check, 300); // Poll every 300ms
        }
      } catch (error) {
         console.error("Polling for user profile failed:", error);
         // Keep polling unless we time out
         if (Date.now() - startTime > timeout) {
           reject(error);
         } else {
           setTimeout(check, 300);
         }
      }
    };
    check();
  });
};
