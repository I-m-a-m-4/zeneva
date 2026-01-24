
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
 * Creates a user profile document in Firestore.
 * This is intended to be called right after a new user is created.
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
        console.log("User document already exists, skipping creation.");
        return; 
      }
      
      let businessId: string;
      let userRole: UserRole;

      if (invitationDoc) {
        // User is joining an existing business.
        const invitationData = invitationDoc.data();
        businessId = invitationData.businessId;
        userRole = invitationData.role;
        transaction.delete(invitationDoc.ref);
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
    console.error("FATAL: User and Business creation failed.", error);
    throw error; // Re-throw to be caught by the signup form
  }
};
