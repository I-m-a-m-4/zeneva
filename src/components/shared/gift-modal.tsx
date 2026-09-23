'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import Confetti from './confetti';

export function GiftModal() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const [message, setMessage] = React.useState('2 Months of Zeneva Business Plan on us!');
  const [businessId, setBusinessId] = React.useState<string | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    if (!user || !firestore) return;

    if (user.businessId) {
      setBusinessId(user.businessId);
    }
  }, [user, firestore]);

  React.useEffect(() => {
    if (!firestore || !businessId) return;

    const unsubscribe = onSnapshot(doc(firestore, 'businessInstances', businessId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        if (data.giftNotificationPending) {
          setMessage(data.giftMessage || '2 Months of Zeneva Business Plan on us!');
          setIsOpen(true);
          setShowConfetti(true);
        } else {
          setIsOpen(false);
        }
      }
    });

    return () => unsubscribe();
  }, [firestore, businessId]);

  const handleDismiss = async () => {
    setIsOpen(false);
    setShowConfetti(false);
    if (!firestore || !businessId) return;
    try {
      await updateDoc(doc(firestore, 'businessInstances', businessId), {
        giftNotificationPending: false,
      });
    } catch (error) {
      console.error('Failed to dismiss gift notification:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {showConfetti && <Confetti />}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-orange-100 dark:border-orange-900/50"
            >
              <div className="absolute right-4 top-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-black/5 text-slate-500 hover:bg-black/10 hover:text-slate-900 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/20 dark:hover:text-white"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-6 py-10 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay"></div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-inner backdrop-blur-md"
                >
                  <Gift className="h-8 w-8 text-white drop-shadow-md" />
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight drop-shadow-sm flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-200" />
                  Surprise!
                  <Sparkles className="h-5 w-5 text-amber-200" />
                </h2>
              </div>

              <div className="px-6 py-8 text-center space-y-4">
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {message}
                </p>
                
                <p className="text-sm text-muted-foreground">
                  Your account has been upgraded. Enjoy all the premium features!
                </p>

                <div className="pt-4">
                  <Button 
                    onClick={handleDismiss} 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-6 text-lg font-semibold shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
                  >
                    Awesome!
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
