'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Volume2, Maximize2, MoreVertical, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface FeatureUpdate {
  id: string;
  title: string;
  badge?: string;
  description: string;
  videoUrl?: string; // YouTube link, mp4, or webm
  changelogLink?: string;
  actionText?: string;
  actionHref?: string;
  releaseVersion?: string;
  isActive?: boolean;
}

const DEFAULT_LATEST_UPDATE: FeatureUpdate = {
  id: 'release_v3_2_10_playstore',
  title: 'Zeneva is Now Available on Google Play Store!',
  badge: 'v3.2.10 Update',
  description:
    'You can now download and install Zeneva directly from the Google Play Store on your Android phone or tablet! Manage inventory, process sales, and access Zen AI on the go.',
  videoUrl: '',
  changelogLink: '/notifications',
  actionText: 'Get on Play Store',
  actionHref: 'https://play.google.com/store/apps/details?id=com.zeneva.app',
  releaseVersion: '3.2.10',
  isActive: true,
};

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const watchMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&mute=0&rel=0&modestbranding=1`;
    }
  } catch {}
  return null;
}

export function FeatureUpdateModal() {
  const firestore = useFirestore();
  const router = useRouter();

  const [update, setUpdate] = React.useState<FeatureUpdate>(DEFAULT_LATEST_UPDATE);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progress, setProgress] = React.useState(28);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Demo progress timer for visual aesthetic when no live video is loaded
  React.useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1.2));
    }, 200);
    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  // Listen for active feature releases in Firestore
  React.useEffect(() => {
    if (!firestore) return;

    try {
      const q = query(
        collection(firestore, 'feature_updates'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as any;
          const activeUpdate: FeatureUpdate = {
            id: snapshot.docs[0].id,
            title: docData.title || DEFAULT_LATEST_UPDATE.title,
            badge: docData.badge || DEFAULT_LATEST_UPDATE.badge,
            description: docData.description || DEFAULT_LATEST_UPDATE.description,
            videoUrl: docData.videoUrl || '',
            changelogLink: docData.changelogLink || '/notifications',
            actionText: docData.actionText || 'Got it',
            actionHref: docData.actionHref || '',
            releaseVersion: docData.releaseVersion || '3.2.10',
            isActive: true,
          };
          setUpdate(activeUpdate);
          checkAndShow(activeUpdate.id);
        } else {
          setUpdate(DEFAULT_LATEST_UPDATE);
          checkAndShow(DEFAULT_LATEST_UPDATE.id);
        }
      }, () => {
        checkAndShow(DEFAULT_LATEST_UPDATE.id);
      });

      return () => unsubscribe();
    } catch {
      checkAndShow(DEFAULT_LATEST_UPDATE.id);
    }
  }, [firestore]);

  const checkAndShow = (updateId: string) => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(`dismissed_update_${updateId}`);
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && update?.id) {
      localStorage.setItem(`dismissed_update_${update.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleAction = () => {
    handleDismiss();
    if (update.actionHref && update.actionText !== 'Got it') {
      if (update.actionHref.startsWith('http://') || update.actionHref.startsWith('https://')) {
        window.open(update.actionHref, '_blank', 'noopener,noreferrer');
      } else {
        router.push(update.actionHref);
      }
    }
  };

  if (!isClient) return null;

  const youtubeEmbed = update.videoUrl ? getYouTubeEmbedUrl(update.videoUrl) : null;
  const isDirectVideo = update.videoUrl && !youtubeEmbed && (update.videoUrl.endsWith('.mp4') || update.videoUrl.endsWith('.webm'));

  // Extract clean title keywords for the watermark
  const watermarkKeyword = update.title.replace(/^introducing\s+/i, '').split(' ')[0] || 'Zen AI';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Subtle Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card - 100% Light Theme matching Image 1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-[520px] bg-white text-zinc-900 rounded-3xl border border-zinc-200/80 shadow-[0_25px_70px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col"
          >
            {/* Circular Close Button Top Right */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-30 h-7 w-7 rounded-full bg-zinc-800/15 hover:bg-zinc-800/25 text-zinc-700 hover:text-zinc-950 flex items-center justify-center transition-all shadow-xs"
              title="Close"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>

            {/* Top Media / Showcase Area */}
            <div className="relative w-full aspect-[16/10] bg-gradient-to-b from-white via-zinc-50 to-zinc-100/90 flex flex-col justify-between overflow-hidden border-b border-zinc-100 select-none">
              {youtubeEmbed ? (
                <iframe
                  src={youtubeEmbed}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={update.title}
                />
              ) : isDirectVideo ? (
                <video
                  src={update.videoUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Pure White Showcase Canvas with Faded Repeating Typography Watermark */
                <>
                  {/* Faded Watermark in Upper Right */}
                  <div className="absolute top-4 right-8 flex flex-col items-start opacity-[0.14] pointer-events-none select-none font-bold text-4xl sm:text-5xl tracking-tight text-zinc-900 leading-tight">
                    <span>{watermarkKeyword}</span>
                    <span>{watermarkKeyword}</span>
                    <span>{watermarkKeyword}</span>
                    <span>{watermarkKeyword}</span>
                    <span>{watermarkKeyword}</span>
                  </div>

                  {/* Centered Hero Headline */}
                  <div className="flex-1 flex items-center justify-center px-6 relative z-10">
                    <div className="flex items-center gap-2.5 text-center">
                      <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                        <span>Introducing</span>
                        <Zap className="h-6 w-6 text-orange-500 fill-orange-500 shrink-0 inline-block" />
                        <span className="text-zinc-900">{update.title.replace(/^introducing\s+/i, '')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Realistic Media Controls Bar matching Image 1 */}
                  <div className="relative z-10 px-4 py-2.5 bg-gradient-to-t from-black/20 via-black/5 to-transparent flex flex-col gap-1.5 text-zinc-700">
                    {/* Scrub Bar */}
                    <div className="w-full h-1 bg-zinc-300/80 rounded-full overflow-hidden cursor-pointer">
                      <div
                        className="h-full bg-zinc-800 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="hover:text-zinc-900 transition-colors"
                        >
                          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                        </button>
                        <span>0:{Math.floor(progress / 7).toString().padStart(2, '0')} / 0:16</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Volume2 className="h-3.5 w-3.5 hover:text-zinc-900 cursor-pointer transition-colors" />
                        <Maximize2 className="h-3.5 w-3.5 hover:text-zinc-900 cursor-pointer transition-colors" />
                        <MoreVertical className="h-3.5 w-3.5 hover:text-zinc-900 cursor-pointer transition-colors" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lower Content Area matching Image 1 */}
            <div className="p-6 sm:p-7 bg-white flex flex-col gap-3">
              <h3 className="text-xl sm:text-[22px] font-bold text-zinc-900 tracking-tight">
                {update.title}
              </h3>
              
              <p className="text-sm text-zinc-600 leading-relaxed font-normal">
                {update.description}
              </p>

              {/* Footer Row matching Image 1 */}
              <div className="flex items-center justify-between pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    router.push(update.changelogLink || '/notifications');
                  }}
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors"
                >
                  See all updates
                </button>

                <Button
                  onClick={handleAction}
                  className="bg-[#18181b] hover:bg-black text-white font-medium text-xs h-9 px-6 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {update.actionText || 'Got it'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
