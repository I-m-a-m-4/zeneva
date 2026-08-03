'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Branch } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface BranchContextType {
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  branches: Branch[];
  isLoadingBranches: boolean;
  isMultiBranchEnabled: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoadingBranches(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('zeneva_active_branch');
      if (cached) {
        setActiveBranchId(cached);
      }
    }

    const loadBranches = async () => {
      try {
        setIsLoadingBranches(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const businessId = userDocSnap.data().businessId;
          const isValidBusinessId = businessId && 
                                    businessId !== 'undefined' && 
                                    businessId !== 'null' && 
                                    businessId !== 'none' && 
                                    businessId.trim() !== '';
          
          if (isValidBusinessId) {
            const branchesQuery = query(
              collection(firestore, 'branches'),
              where('businessId', '==', businessId),
              orderBy('createdAt', 'asc')
            );
            
            const branchesSnap = await getDocs(branchesQuery);
            let fetchedBranches = branchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
            
            // Ensure a primary branch exists with ID = businessId
            let correctPrimary = fetchedBranches.find(b => b.id === businessId && b.isPrimary);
            
            // Fetch the business instance info to get its name & address
            let businessName = 'Main Store (Primary)';
            let businessAddress = '';
            try {
              const businessDocRef = doc(firestore, 'businessInstances', businessId);
              const businessDocSnap = await getDoc(businessDocRef);
              if (businessDocSnap.exists()) {
                businessName = businessDocSnap.data().name || businessName;
                businessAddress = businessDocSnap.data().address || '';
              }
            } catch (err) {
              console.error("Failed to fetch business info for primary branch sync", err);
            }
            
            if (!correctPrimary) {
              try {
                // Write the correct primary branch with ID = businessId
                const { setDoc, serverTimestamp } = await import('firebase/firestore');
                const primaryBranchRef = doc(firestore, 'branches', businessId);
                const newBranch = {
                  businessId: businessId,
                  name: businessName,
                  address: businessAddress,
                  isPrimary: true,
                  isActive: true,
                  createdAt: serverTimestamp(),
                };

                await setDoc(primaryBranchRef, newBranch);
                const createdBranch = {
                  id: businessId,
                  businessId: businessId,
                  name: businessName,
                  address: businessAddress,
                  isPrimary: true,
                  isActive: true,
                  createdAt: new Date(),
                } as Branch;

                // Add to fetched branches and remove any old primary branches
                fetchedBranches = [createdBranch, ...fetchedBranches.filter(b => b.id !== businessId)];
              } catch (createErr) {
                console.error("Failed to write primary branch", createErr);
              }
            } else if (correctPrimary.name !== businessName || correctPrimary.address !== businessAddress) {
              try {
                const { updateDoc } = await import('firebase/firestore');
                const primaryBranchRef = doc(firestore, 'branches', businessId);
                await updateDoc(primaryBranchRef, {
                  name: businessName,
                  address: businessAddress
                });
                correctPrimary.name = businessName;
                correctPrimary.address = businessAddress;
              } catch (updateErr) {
                console.error("Failed to update primary branch name/address in sync with business", updateErr);
              }
            }

            // Clean up duplicates: if there are other primary branches (whose ID !== businessId), delete them!
            const duplicates = fetchedBranches.filter(b => b.isPrimary && b.id !== businessId);
            if (duplicates.length > 0) {
              try {
                const { deleteDoc } = await import('firebase/firestore');
                for (const dup of duplicates) {
                  await deleteDoc(doc(firestore, 'branches', dup.id));
                }
                fetchedBranches = fetchedBranches.filter(b => !duplicates.some(dup => dup.id === b.id));
              } catch (delErr) {
                console.error("Failed to delete duplicate primary branches", delErr);
              }
            }

            setBranches(fetchedBranches);
            
            if (fetchedBranches.length > 0 && activeBranchId !== 'all') {
               const isValid = fetchedBranches.find(b => b.id === activeBranchId);
               if (!isValid) {
                 setActiveBranchId('all');
               }
            }
          } else {
            setBranches([]);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
        setBranches([]);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    loadBranches();
  }, [user, firestore]);

  const handleSetActiveBranch = (id: string) => {
    setActiveBranchId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zeneva_active_branch', id);
    }
  };

  const value = {
    activeBranchId,
    setActiveBranchId: handleSetActiveBranch,
    branches,
    isLoadingBranches,
    isMultiBranchEnabled: branches.length > 0
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
