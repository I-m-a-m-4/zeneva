'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
  DocumentReference,
  getDoc, // Changed from onSnapshot
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  mutate: Dispatch<SetStateAction<WithId<T> | null>>; // Function to manually update data
}

/**
 * React hook to fetch a single Firestore document once.
 * This has been optimized to use a one-time 'get' request instead of a real-time listener
 * to reduce database reads and costs. Data can be refreshed using the global Refresh button.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!memoizedDocRef) {
        if (isMounted) {
          setData(null);
          setIsLoading(false);
          setError(null);
        }
        return;
      }
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const snapshot = await getDoc(memoizedDocRef);
        if (isMounted) {
          if (snapshot.exists()) {
            setData({ ...(snapshot.data() as T), id: snapshot.id });
          } else {
            setData(null); // Document does not exist
          }
        }
      } catch (error: any) {
        if (!isMounted) return;

        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: memoizedDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          console.error(`useDoc error for path ${memoizedDocRef.path}:`, error);
          setError(error);
        }
        setData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [memoizedDocRef]); // Re-run if the memoizedDocRef changes.

  return { data, isLoading, error, mutate: setData };
}
