'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Trophy, Users, DollarSign, Sparkles, ShoppingBag, Store, Star, ArrowUpRight, Flame, Heart, Loader, X, Download } from 'lucide-react';
import type { Receipt, Product, BusinessInstance, UserProfile } from '@/types';
import Confetti from '@/components/shared/confetti';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

// =================================================================
// AchievementModal Component (With HTML2Canvas Capture Feature)
// =================================================================
interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  isDarkMode: boolean;
  icon: React.ElementType;
  targetText: string;
  progressText: string;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  isDarkMode,
  icon: Icon,
  targetText,
  progressText
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `zeneva-achievement-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Certificate Captured!", description: "Your platform achievement has been saved." });
    } catch (error) {
      console.error("Capture failed", error);
      toast({ variant: "destructive", title: "Capture Failed", description: "Could not capture the certificate." });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in zoom-in duration-300">
      <div className="relative w-full max-w-md flex flex-col items-center">
        
        {/* Capture Container (This gets saved as the image) */}
        <div 
          ref={captureRef}
          className={cn(
            "relative w-full p-8 rounded-2xl shadow-2xl border flex flex-col items-center text-center overflow-hidden min-h-[460px] justify-center",
            isDarkMode ? 'bg-[#0f172a] border-primary/30 text-white' : 'bg-white border-primary/20 text-slate-900'
          )}
        >
          {/* Confetti falling specifically inside the captured card context */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <Confetti trigger={showConfetti} onComplete={() => {}} />
          </div>

          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/20 rounded-full blur-[60px] pointer-events-none z-0" />

          {/* Ribbon */}
          <div className="relative z-10 mb-4 px-3 py-1 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-full">
            <p className="text-[10px] font-black text-yellow-500 tracking-wider uppercase flex items-center gap-1.5">
              <Trophy className="h-3 w-3 animate-pulse" /> Zeneva Honor
            </p>
          </div>

          {/* Icon Badge */}
          <div className="relative z-10 w-24 h-24 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center shadow-lg mb-6 text-primary animate-pulse">
            <Icon className="h-12 w-12" />
          </div>
          
          <h2 className="relative z-10 text-2xl font-black tracking-tight mb-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            {title}
          </h2>
          
          <p className={cn(
            "relative z-10 text-sm font-medium mb-6 leading-relaxed px-2",
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          )}>
            {message}
          </p>

          <div className={cn(
            "relative z-10 w-full p-4 rounded-xl border mb-6",
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">Target Reached</p>
            <p className="text-base font-black text-primary">{progressText} / {targetText}</p>
          </div>

          <div className="absolute bottom-3 left-0 right-0 text-center">
            <p className="text-[10px] font-black tracking-[0.2em] text-primary/80 uppercase">
              zeneva.space
            </p>
          </div>
        </div>

        {/* Buttons Panel (Outside capture boundary so they don't show on certificate image) */}
        <div className="w-full mt-4 flex gap-3">
          <button 
            onClick={handleCapture}
            disabled={isDownloading}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-slate-950 font-black tracking-wider uppercase text-xs rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-primary/30"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Capturing...' : 'Capture Certificate'}
          </button>
          
          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors border border-slate-700/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// AchievementsPage Component
// =================================================================
export default function AchievementsPage() {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const firestore = useFirestore();

  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

  const triggerConfetti = () => {
    setShowConfetti(true);
  };

  // Queries to compute active stats
  const businessesQuery = useMemoFirebase(() => query(collection(firestore, 'businessInstances')), [firestore]);
  const productsQuery = useMemoFirebase(() => query(collection(firestore, 'products')), [firestore]);
  const receiptsQuery = useMemoFirebase(() => query(collection(firestore, 'receipts')), [firestore]);
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);

  const { data: businesses, isLoading: bLoading } = useCollection<BusinessInstance>(businessesQuery);
  const { data: products, isLoading: pLoading } = useCollection<Product>(productsQuery);
  const { data: receipts, isLoading: rLoading } = useCollection<Receipt>(receiptsQuery);
  const { data: users, isLoading: uLoading } = useCollection<UserProfile>(usersQuery);

  const isLoading = bLoading || pLoading || rLoading || uLoading;

  const stats = useMemo(() => {
    if (!businesses || !products || !receipts || !users) return null;

    const totalSales = receipts.length;
    const totalProducts = products.length;
    const activeSellers = businesses.filter(b => b.status !== 'deleted').length;
    const totalGmv = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalUsers = users.length;
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyActiveUsers = users.filter(u => {
      if (!u.lastSeen) return false;
      const date = u.lastSeen.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
      return date > oneDayAgo;
    }).length;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeWithin7Days = users.filter(u => {
      if (!u.lastSeen) return false;
      const date = u.lastSeen.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
      return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;
    const totalOldUsers = users.filter(u => {
      const date = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || Date.now());
      return date < thirtyDaysAgo;
    }).length;
    const retentionPercentage = totalOldUsers > 0 ? Math.round((activeWithin7Days / totalOldUsers) * 100) : 100;

    return {
      totalGmv,
      totalUsers,
      totalSuccessfulOrders: totalSales,
      activeSellers,
      totalProducts,
      dailyActiveUsers,
      retentionPercentage
    };
  }, [businesses, products, receipts, users]);

  const achievements = useMemo(() => {
    return [
      // Sales Milestones
      {
        id: "achievement_10_sales",
        title: "First 10 Sales",
        description: "The platform successfully facilitated its first 10 sales.",
        icon: ShoppingBag,
        color: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
        unlocked: stats ? stats.totalSuccessfulOrders >= 10 : false,
        target: 10,
        current: stats ? stats.totalSuccessfulOrders : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_100_sales",
        title: "Century of Sales",
        description: "We have successfully completed 100 sales across the entire platform.",
        icon: ShoppingBag,
        color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        unlocked: stats ? stats.totalSuccessfulOrders >= 100 : false,
        target: 100,
        current: stats ? stats.totalSuccessfulOrders : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_1k_sales",
        title: "Sales Master",
        description: "We have breached 1,000 sales across the platform! Incredible momentum.",
        icon: Star,
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        unlocked: stats ? stats.totalSuccessfulOrders >= 1000 : false,
        target: 1000,
        current: stats ? stats.totalSuccessfulOrders : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_10k_sales",
        title: "Ten Thousand Transactions",
        description: "We successfully completed 10,000 sales platform-wide. Unstoppable.",
        icon: Flame,
        color: "bg-red-500/10 text-red-500 border-red-500/20",
        unlocked: stats ? stats.totalSuccessfulOrders >= 10000 : false,
        target: 10000,
        current: stats ? stats.totalSuccessfulOrders : 0,
        format: (val: number) => val.toLocaleString()
      },

      // GMV Milestones
      {
        id: "achievement_100k_gmv",
        title: "₦100K GMV Milestone",
        description: "Zeneva successfully crossed ₦100,000 in Gross Merchandise Value.",
        icon: DollarSign,
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        unlocked: stats ? stats.totalGmv >= 100000 : false,
        target: 100000,
        current: stats ? stats.totalGmv : 0,
        format: (val: number) => `₦${val.toLocaleString()}`
      },
      {
        id: "achievement_1m_gmv",
        title: "₦1M GMV Milestone",
        description: "Zeneva crosses ₦1,000,000 in Gross Merchandise Value.",
        icon: DollarSign,
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        unlocked: stats ? stats.totalGmv >= 1000000 : false,
        target: 1000000,
        current: stats ? stats.totalGmv : 0,
        format: (val: number) => `₦${val.toLocaleString()}`
      },
      {
        id: "achievement_10m_gmv",
        title: "₦10M GMV Milestone",
        description: "Zeneva crosses ₦10,000,000 in Gross Merchandise Value.",
        icon: Trophy,
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        unlocked: stats ? stats.totalGmv >= 10000000 : false,
        target: 10000000,
        current: stats ? stats.totalGmv : 0,
        format: (val: number) => `₦${val.toLocaleString()}`
      },
      {
        id: "achievement_100m_gmv",
        title: "₦100M GMV Milestone",
        description: "Zeneva crosses ₦100,000,000 in Gross Merchandise Value.",
        icon: Flame,
        color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        unlocked: stats ? stats.totalGmv >= 100000000 : false,
        target: 100000000,
        current: stats ? stats.totalGmv : 0,
        format: (val: number) => `₦${val.toLocaleString()}`
      },
      {
        id: "achievement_1b_gmv",
        title: "₦1B GMV Milestone",
        description: "Legendary status. The platform has officially moved ₦1,000,000,000 in GMV.",
        icon: Trophy,
        color: "bg-red-500/10 text-red-500 border-red-500/20",
        unlocked: stats ? stats.totalGmv >= 1000000000 : false,
        target: 1000000000,
        current: stats ? stats.totalGmv : 0,
        format: (val: number) => `₦${val.toLocaleString()}`
      },

      // User Milestones
      {
        id: "achievement_500_users",
        title: "500 Users Milestone",
        description: "Zeneva crossed 500 registered users.",
        icon: Users,
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        unlocked: stats ? stats.totalUsers >= 500 : false,
        target: 500,
        current: stats ? stats.totalUsers : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_1k_users",
        title: "1,000 Users",
        description: "Zeneva crossed 1,000 registered users.",
        icon: Users,
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        unlocked: stats ? stats.totalUsers >= 1000 : false,
        target: 1000,
        current: stats ? stats.totalUsers : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_10k_users",
        title: "10,000 Users",
        description: "Zeneva crossed 10,000 registered users.",
        icon: Users,
        color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        unlocked: stats ? stats.totalUsers >= 10000 : false,
        target: 10000,
        current: stats ? stats.totalUsers : 0,
        format: (val: number) => val.toLocaleString()
      },

      // Seller & Listing Milestones
      {
        id: "achievement_10_sellers",
        title: "10 Pioneers",
        description: "Our first 10 active businesses trust Zeneva.",
        icon: Store,
        color: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        unlocked: stats ? stats.activeSellers >= 10 : false,
        target: 10,
        current: stats ? stats.activeSellers : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_100_sellers",
        title: "100 Active Sellers",
        description: "100 active businesses running on Zeneva.",
        icon: Store,
        color: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        unlocked: stats ? stats.activeSellers >= 100 : false,
        target: 100,
        current: stats ? stats.activeSellers : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_500_sellers",
        title: "Enterprise Scale",
        description: "An army of 500 active businesses now operate via Zeneva.",
        icon: Store,
        color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        unlocked: stats ? stats.activeSellers >= 500 : false,
        target: 500,
        current: stats ? stats.activeSellers : 0,
        format: (val: number) => val.toLocaleString()
      },

      // Product Milestones
      {
        id: "achievement_50_listings",
        title: "Catalog Starter",
        description: "We reached 50 unique products listed on Zeneva.",
        icon: ShoppingBag,
        color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
        unlocked: stats ? stats.totalProducts >= 50 : false,
        target: 50,
        current: stats ? stats.totalProducts : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_500_listings",
        title: "Inventory Builder",
        description: "We officially host over 500 unique products on the platform.",
        icon: ShoppingBag,
        color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
        unlocked: stats ? stats.totalProducts >= 500 : false,
        target: 500,
        current: stats ? stats.totalProducts : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_5k_listings",
        title: "Massive Marketplace",
        description: "5,000 unique products are now available through businesses on Zeneva.",
        icon: Star,
        color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        unlocked: stats ? stats.totalProducts >= 5000 : false,
        target: 5000,
        current: stats ? stats.totalProducts : 0,
        format: (val: number) => val.toLocaleString()
      },

      // Retention & Activity
      {
        id: "achievement_100_daily_active",
        title: "100 Daily Active Users",
        description: "Reached 100 daily active users (DAU).",
        icon: ArrowUpRight,
        color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
        unlocked: stats ? stats.dailyActiveUsers >= 100 : false,
        target: 100,
        current: stats ? stats.dailyActiveUsers : 0,
        format: (val: number) => val.toLocaleString()
      },
      {
        id: "achievement_high_retention",
        title: "Super Retention",
        description: "Over 30% user retention month-over-month.",
        icon: Heart,
        color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        unlocked: stats ? stats.retentionPercentage >= 30 : false,
        target: 30,
        current: stats ? stats.retentionPercentage : 0,
        format: (val: number) => `${val}%`
      }
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Achievements...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in zoom-in duration-300">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div>
          <h2 className={cn(
            "text-2xl font-black tracking-tight flex items-center gap-2",
            isDarkMode ? 'text-white' : 'text-slate-900'
          )}>
            <Trophy className="w-6 h-6 text-yellow-500" />
            Platform Achievements
          </h2>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          )}>
            Track and celebrate major milestones reached by the platform.
          </p>
        </div>
        <button 
          onClick={triggerConfetti}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" />
          Celebrate!
        </button>
      </div>

      {/* Scrollable grid area */}
      <div className="flex-1 overflow-y-auto pr-2 pb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          {achievements.map((achievement, idx) => {
            const Icon = achievement.icon;
            const isUnlocked = achievement.unlocked;
            return (
              <div key={achievement.id} className="relative group">
                {/* Connecting dashed line to the next card */}
                {idx !== achievements.length - 1 && (
                  <div className={cn(
                    "absolute left-[41px] top-1/2 w-px h-[calc(100%+24px)] border-l-2 border-dashed group-hover:border-primary/40 transition-colors -ml-px z-0",
                    isDarkMode ? 'border-slate-800' : 'border-slate-300'
                  )} />
                )}
                
                <div 
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedAchievement(achievement);
                    }
                  }}
                  className={cn(
                    "relative z-10 p-5 rounded-lg border cursor-pointer transition-all",
                    isUnlocked 
                      ? isDarkMode ? 'bg-[#0f172a] border-primary/30 hover:border-primary/60 shadow-md shadow-primary/5' : 'bg-white border-primary/30 hover:border-primary/60 shadow-sm'
                      : isDarkMode ? 'bg-[#0a0f1d] border-slate-800 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500' : 'bg-slate-50 border-slate-200 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500'
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "relative z-20 p-3 rounded-lg border shrink-0",
                      achievement.color,
                      isDarkMode ? 'bg-[#0f172a]' : 'bg-white'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "text-base font-bold leading-tight mb-1",
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      )}>
                        {achievement.title}
                      </h3>
                      <p className={cn(
                        "text-[11px] leading-snug",
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      )}>
                        {achievement.description}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isUnlocked ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                          <Trophy className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                          isDarkMode ? 'text-slate-600 border-slate-800 bg-slate-900/50' : 'text-slate-400 border-slate-200 bg-slate-100/50'
                        )}>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AchievementModal
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        title={selectedAchievement?.title || ''}
        message={selectedAchievement?.description || ''}
        isDarkMode={isDarkMode}
        icon={selectedAchievement?.icon || Trophy}
        targetText={selectedAchievement ? selectedAchievement.format(selectedAchievement.target) : ''}
        progressText={selectedAchievement ? selectedAchievement.format(selectedAchievement.current) : ''}
      />
    </div>
  );
}
