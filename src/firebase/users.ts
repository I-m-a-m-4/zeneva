
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
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { add, set } from 'date-fns';

/**
 * Creates a user profile document in Firestore.
 * This is intended to be called right after a new user is created.
 * It now checks for an invitation or a referral code to assign the correct business and role.
 * If neither exists, it creates a new business for the user.
 */
export const createUserProfileDocument = async (
  firestore: Firestore,
  user: User,
  displayName: string,
  referralCodeInput?: string,
) => {
  const batch = writeBatch(firestore);
  const userDocRef = doc(firestore, `users/${user.uid}`);
  const newReferralCode = user.uid.substring(0, 8).toUpperCase();

  // 1. Check for an invitation for this user's email
  const invitationQuery = query(collection(firestore, 'invitations'), where('email', '==', user.email));
  const invitationSnapshot = await getDocs(invitationQuery);

  if (!invitationSnapshot.empty) {
    // ---- CASE 1: User was invited ----
    const invitationDoc = invitationSnapshot.docs[0];
    const invitationData = invitationDoc.data();

    const userProfile = {
      email: user.email,
      name: displayName || invitationData.name || user.email,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      businessId: invitationData.businessId,
      role: invitationData.role,
      surveyCompleted: true, // Invited users are considered fully onboarded
      referralCode: newReferralCode, // Generate a referral code for the new user
      referrals: 0,
    };
    batch.set(userDocRef, userProfile);

    // Delete the invitation so it can't be reused
    batch.delete(invitationDoc.ref);

  } else if (referralCodeInput) {
    // ---- CASE 2: User signed up with a referral code ----
    const referrerQuery = query(collection(firestore, 'users'), where('referralCode', '==', referralCodeInput.toUpperCase()));
    const referrerSnapshot = await getDocs(referrerQuery);

    if (!referrerSnapshot.empty) {
        const referrerDoc = referrerSnapshot.docs[0];
        const referrerData = referrerDoc.data();
        
        // Create a new business for the referred user
        const businessDocRef = doc(collection(firestore, 'businessInstances'));
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const businessData = { name: `${displayName}'s Business`, createdAt: serverTimestamp(), ownerId: user.uid, plan: 'pro', trialExpiresAt: sevenDaysFromNow };
        batch.set(businessDocRef, businessData);

        // Create the new user's profile
        const userProfile = { email: user.email, name: displayName, photoURL: user.photoURL || '', createdAt: serverTimestamp(), businessId: businessDocRef.id, role: 'admin', surveyCompleted: true, referralCode: newReferralCode, referredBy: referrerDoc.id, referrals: 0 };
        batch.set(userDocRef, userProfile);
        
        // --- Apply rewards to the referrer ---
        // 1. Extend referrer's business trial
        const referrerBusinessRef = doc(firestore, 'businessInstances', referrerData.businessId);
        const referrerBusinessSnap = await getDocs(query(collection(firestore, 'businessInstances'), where('__name__', '==', referrerData.businessId)));
        const referrerBusinessDoc = referrerBusinessSnap.docs[0];
        if(referrerBusinessDoc.exists()) {
            const currentExpiry = referrerBusinessDoc.data().trialExpiresAt.toDate();
            const newExpiry = add(currentExpiry, { days: 10 });
            batch.update(referrerBusinessRef, { trialExpiresAt: newExpiry });
        }

        // 2. Increment referrer's referral count
        batch.update(referrerDoc.ref, { referrals: increment(1) });
        
        // 3. Create a notification for the referrer
        const notificationRef = doc(collection(firestore, `users/${referrerDoc.id}/notifications`));
        batch.set(notificationRef, { title: 'Referral Success! 🎉', body: `Someone signed up with your code! 10 days have been added to your trial.`, read: false, createdAt: serverTimestamp() });
        
        // 4. Log the referral event
        const referralLogRef = doc(collection(firestore, 'referrals'));
        batch.set(referralLogRef, { referrerId: referrerDoc.id, referredUserId: user.uid, createdAt: serverTimestamp() });
        
    } else {
        // Referral code was invalid, proceed with normal signup
         await createNewBusinessForUser(firestore, user, displayName, newReferralCode, batch);
    }
  } else {
    // ---- CASE 3: No invitation, no referral code ----
    await createNewBusinessForUser(firestore, user, displayName, newReferralCode, batch);
  }
  
  await batch.commit();
};


async function createNewBusinessForUser(firestore: Firestore, user: User, displayName: string, referralCode: string, batch: any) {
    const businessDocRef = doc(collection(firestore, 'businessInstances'));
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const businessData = {
        name: `${displayName}'s Business`,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        plan: 'pro',
        trialExpiresAt: sevenDaysFromNow,
        settings: {
            currency: 'NGN',
            timezone: 'Africa/Lagos',
            defaultTaxRate: 0,
        }
    };
    batch.set(businessDocRef, businessData);

    const userProfile = {
        email: user.email,
        name: displayName || user.email,
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        businessId: businessDocRef.id,
        role: 'admin',
        surveyCompleted: true,
        referralCode: referralCode,
        referrals: 0,
    };
    const userDocRef = doc(firestore, `users/${user.uid}`);
    batch.set(userDocRef, userProfile);
}
