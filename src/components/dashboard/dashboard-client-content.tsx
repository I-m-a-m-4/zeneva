
"use client";

import dynamic from 'next/dynamic';

const OverviewChart = dynamic(() => import('@/components/dashboard/overview-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full rounded-lg bg-muted animate-pulse"></div>
});

const CategoryPieChart = dynamic(() => import('@/components/dashboard/category-pie-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full rounded-lg bg-muted animate-pulse"></div>
});


export default function DashboardClientContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <OverviewChart />
      </div>
      <CategoryPieChart />
    </div>
  );
}
