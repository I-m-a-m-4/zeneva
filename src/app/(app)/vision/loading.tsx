import { SkeletonPage } from '@/components/shared/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function VisionLoading() {
  return (
    <SkeletonPage className="max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Main Studio Viewport */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-[460px] w-full rounded-2xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
