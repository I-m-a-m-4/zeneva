'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase,
  ShoppingCart,
  Shirt,
  Coffee,
  Laptop,
  GraduationCap,
  HeartPulse,
  Home,
  Store,
  Clock,
  Layers,
  ArrowRight,
  BarChart3,
  ListFilter,
  PieChart as PieChartIcon,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { BusinessInstance } from '@/types';

export interface FormattedIndustryMeta {
  displayName: string;
  subLabel: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export function formatIndustryName(raw: string | undefined | null): FormattedIndustryMeta {
  const norm = (raw || '').trim().toLowerCase();

  if (
    !raw ||
    norm === 'pendingonboarding' ||
    norm === 'pending onboarding' ||
    norm === 'pending_onboarding' ||
    norm === 'pending'
  ) {
    return {
      displayName: 'Pending Onboarding',
      subLabel: 'Setup & categorization pending',
      icon: 'clock',
      color: '#94a3b8',
      badgeBg: 'bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-800',
      badgeText: 'Setup',
    };
  }

  if (norm.includes('fashion') || norm.includes('boutique') || norm.includes('apparel')) {
    return {
      displayName: 'Fashion & Boutique',
      subLabel: 'Apparel, Clothing & Accessories',
      icon: 'shirt',
      color: '#a855f7',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      badgeText: 'Fashion',
    };
  }

  if (norm.includes('supermarket') || norm.includes('grocer')) {
    return {
      displayName: 'Supermarket & Groceries',
      subLabel: 'Multi-category retail & FMCG',
      icon: 'shopping-cart',
      color: '#10b981',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      badgeText: 'Grocery',
    };
  }

  if (norm.includes('health') || norm.includes('beauty') || norm.includes('pharmacy')) {
    return {
      displayName: 'Health & Beauty',
      subLabel: 'Pharmacies, Cosmetics & Wellness',
      icon: 'heart-pulse',
      color: '#ec4899',
      badgeBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
      badgeText: 'Health',
    };
  }

  if (
    norm.includes('food') ||
    norm.includes('beverage') ||
    norm.includes('restaurant') ||
    norm.includes('bakery') ||
    norm.includes('cafe')
  ) {
    return {
      displayName: 'Food & Beverage',
      subLabel: 'Restaurants, Cafes & Eateries',
      icon: 'coffee',
      color: '#f59e0b',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      badgeText: 'F&B',
    };
  }

  if (
    norm.includes('electronic') ||
    norm.includes('gadget') ||
    norm.includes('phone') ||
    norm.includes('computer')
  ) {
    return {
      displayName: 'Electronics & Gadgets',
      subLabel: 'Tech, Hardware & Accessories',
      icon: 'laptop',
      color: '#06b6d4',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
      badgeText: 'Tech',
    };
  }

  if (norm.includes('school') || norm.includes('education') || norm.includes('academy')) {
    return {
      displayName: 'Education & Schools',
      subLabel: 'Institutions, Books & Stationery',
      icon: 'graduation-cap',
      color: '#6366f1',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      badgeText: 'Education',
    };
  }

  if (norm.includes('furniture') || norm.includes('home')) {
    return {
      displayName: 'Home & Furniture',
      subLabel: 'Decor, Interior & Living',
      icon: 'home',
      color: '#14b8a6',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
      badgeText: 'Living',
    };
  }

  if (norm.includes('retail') || norm.includes('commerce')) {
    return {
      displayName: 'Retail & E-commerce',
      subLabel: 'General merchandise & online retail',
      icon: 'store',
      color: '#3b82f6',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      badgeText: 'Retail',
    };
  }

  if (norm === 'other') {
    return {
      displayName: 'Other Services',
      subLabel: 'Specialized enterprise businesses',
      icon: 'layers',
      color: '#71717a',
      badgeBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
      badgeText: 'Other',
    };
  }

  const cleanName = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    displayName: cleanName,
    subLabel: 'Custom business category',
    icon: 'briefcase',
    color: '#8b5cf6',
    badgeBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    badgeText: 'Custom',
  };
}

function renderIndustryIcon(iconName: string) {
  switch (iconName) {
    case 'shirt':
      return <Shirt className="h-4 w-4" />;
    case 'shopping-cart':
      return <ShoppingCart className="h-4 w-4" />;
    case 'heart-pulse':
      return <HeartPulse className="h-4 w-4" />;
    case 'coffee':
      return <Coffee className="h-4 w-4" />;
    case 'laptop':
      return <Laptop className="h-4 w-4" />;
    case 'graduation-cap':
      return <GraduationCap className="h-4 w-4" />;
    case 'home':
      return <Home className="h-4 w-4" />;
    case 'store':
      return <Store className="h-4 w-4" />;
    case 'clock':
      return <Clock className="h-4 w-4" />;
    case 'layers':
      return <Layers className="h-4 w-4" />;
    default:
      return <Briefcase className="h-4 w-4" />;
  }
}

export interface IndustryDataItem {
  name: string;
  displayName: string;
  subLabel: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  value: number;
  share: number;
  fill: string;
  businesses: BusinessInstance[];
}

interface IndustryDiversityCardProps {
  industryData: IndustryDataItem[];
  totalBusinesses?: number;
  onSelectIndustry: (item: IndustryDataItem) => void;
}

export default function IndustryDiversityCard({
  industryData,
  totalBusinesses,
  onSelectIndustry,
}: IndustryDiversityCardProps) {
  const [viewMode, setViewMode] = React.useState<'list' | 'chart'>('list');

  const totalCount = React.useMemo(() => {
    if (typeof totalBusinesses === 'number' && totalBusinesses > 0) return totalBusinesses;
    return industryData.reduce((sum, item) => sum + item.value, 0);
  }, [totalBusinesses, industryData]);

  const topSector = industryData[0] || null;

  return (
    <Card className="hover:shadow-md transition-shadow border border-border/80 overflow-hidden flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Briefcase className="h-4 w-4" />
              </span>
              Industry Diversity
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {totalCount} registered businesses categorized across {industryData.length} sectors.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {topSector && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 border-border/70"
                style={{ color: topSector.color }}
              >
                Top: {topSector.displayName} ({topSector.share}%)
              </Badge>
            )}

            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-background shadow-xs text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Ranked List View"
              >
                <ListFilter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`p-1 rounded-md text-xs transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-background shadow-xs text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Bar Chart View"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-segment visual proportion bar */}
        {industryData.length > 0 && totalCount > 0 && (
          <div className="pt-2">
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted/50 p-0.5 gap-0.5 border border-border/40">
              {industryData.map((item) => (
                <div
                  key={item.name}
                  className="h-full rounded-sm transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    width: `${Math.max(item.share, 2)}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.displayName}: ${item.value} businesses (${item.share}%)`}
                  onClick={() => onSelectIndustry(item)}
                />
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {industryData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No industry data recorded yet.
          </div>
        ) : viewMode === 'list' ? (
          <ScrollArea className="h-[250px] pr-3">
            <div className="space-y-2.5">
              {industryData.map((item) => (
                <div
                  key={item.name}
                  onClick={() => onSelectIndustry(item)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {renderIndustryIcon(item.icon)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                          {item.displayName}
                        </p>
                        {item.name === 'Pending Onboarding' && (
                          <span className="text-[10px] text-amber-500 font-medium">· Incomplete</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Share visual bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1 w-20">
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(item.share, 100)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground font-mono w-9 text-right">
                      {item.share}%
                    </span>

                    <Badge
                      variant="secondary"
                      className="font-mono text-xs px-2 py-0.5 min-w-[28px] justify-center"
                    >
                      {item.value}
                    </Badge>

                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[250px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={industryData.slice(0, 8)}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const d = data.activePayload[0].payload as IndustryDataItem;
                    if (d) onSelectIndustry(d);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="displayName"
                  type="category"
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  width={140}
                  axisLine={false}
                  tickLine={false}
                />
                <ReTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as IndustryDataItem;
                    return (
                      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span style={{ color: d.color }}>●</span>
                          {d.displayName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{d.subLabel}</div>
                        <div className="flex items-center justify-between border-t border-border/60 pt-1 text-foreground font-medium">
                          <span>Businesses:</span>
                          <span className="font-bold">{d.value} ({d.share}%)</span>
                        </div>
                        <p className="text-[10px] text-primary pt-0.5">Click to view businesses in sector</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} className="cursor-pointer" maxBarSize={20}>
                  {industryData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
