'use client';

/**
 * The audience: every user on the platform, described by what they actually do in
 * the app, with a segment attached and a checkbox to put them in a campaign.
 *
 * All of it comes off the `users` documents the page already loaded — see the
 * header of `src/lib/behavior-segments.ts` for why no per-user subcollection read
 * is needed to show time-in-app and a page mix.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BanIcon, Crown, MailX, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, UserPresence } from '@/components/admin/user-detail/user-primitives';
import {
  BEHAVIOR_SEGMENT_META,
  BEHAVIOR_SEGMENT_ORDER,
  FAMILY_META,
  type BehaviorProfile,
  type BehaviorSegment,
} from '@/lib/behavior-segments';
import { TONE_CLASSES } from './segment-styles';

export type PlanFilter = 'all' | 'paid' | 'starter';

interface AudienceTableProps {
  profiles: BehaviorProfile[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
  /** Replaces the whole selection — used by "select all shown". */
  onSelectMany: (userIds: string[]) => void;
  segmentFilter: BehaviorSegment | null;
  onSegmentFilterChange: (segment: BehaviorSegment | null) => void;
  segmentCounts: Record<BehaviorSegment, number>;
}

export default function AudienceTable({
  profiles,
  isLoading,
  selectedIds,
  onToggle,
  onSelectMany,
  segmentFilter,
  onSegmentFilterChange,
  segmentCounts,
}: AudienceTableProps) {
  const [search, setSearch] = React.useState('');
  const [planFilter, setPlanFilter] = React.useState<PlanFilter>('all');
  const [contactableOnly, setContactableOnly] = React.useState(true);

  const shown = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return profiles.filter(p => {
      if (segmentFilter && p.segment !== segmentFilter) return false;
      if (planFilter === 'paid' && p.plan === 'starter') return false;
      if (planFilter === 'starter' && p.plan !== 'starter') return false;
      if (contactableOnly && !p.contactable) return false;
      if (!needle) return true;
      return (
        (p.name || '').toLowerCase().includes(needle)
        || (p.email || '').toLowerCase().includes(needle)
        || p.businessName.toLowerCase().includes(needle)
      );
    });
  }, [profiles, segmentFilter, planFilter, contactableOnly, search]);

  const selectableShown = React.useMemo(
    () => shown.filter(p => p.contactable).map(p => p.userId),
    [shown],
  );
  const allShownSelected =
    selectableShown.length > 0 && selectableShown.every(id => selectedIds.has(id));

  return (
    <div className="flex flex-col gap-4">
      {/* Segment rail. Counts come from the engine over the whole book, so they
          always sum to every non-deleted user regardless of the filters below. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSegmentFilterChange(null)}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
            segmentFilter === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          Everyone ({profiles.length})
        </button>
        {BEHAVIOR_SEGMENT_ORDER.map(key => (
          <button
            key={key}
            type="button"
            title={BEHAVIOR_SEGMENT_META[key].blurb}
            onClick={() => onSegmentFilterChange(segmentFilter === key ? null : key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
              segmentFilter === key
                ? 'border-primary bg-primary text-primary-foreground'
                : cn(TONE_CLASSES[BEHAVIOR_SEGMENT_META[key].tone], 'hover:opacity-80'),
            )}
          >
            {BEHAVIOR_SEGMENT_META[key].label} ({segmentCounts[key]})
          </button>
        ))}
      </div>

      {segmentFilter && (
        <p className="text-xs text-muted-foreground">
          {BEHAVIOR_SEGMENT_META[segmentFilter].blurb}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email or business…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={v => setPlanFilter(v as PlanFilter)}>
            <SelectTrigger className="w-[150px]">
              <Crown className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="paid">Paying only</SelectItem>
              <SelectItem value="starter">Free only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={contactableOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setContactableOnly(v => !v)}
            className="gap-1.5"
            title="Hide accounts with no email address, and anyone who has unsubscribed"
          >
            <MailX className="h-3.5 w-3.5" />
            {contactableOnly ? 'Mailable only' : 'Showing all'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectableShown.length === 0}
            onClick={() => onSelectMany(allShownSelected ? [] : selectableShown)}
            className="gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            {allShownSelected ? 'Clear selection' : `Select all ${selectableShown.length}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4" />
                  <TableHead>User</TableHead>
                  <TableHead>Behaviour</TableHead>
                  <TableHead className="hidden md:table-cell">Time in app</TableHead>
                  <TableHead className="hidden lg:table-cell">Where they spend it</TableHead>
                  <TableHead className="hidden md:table-cell">Last seen</TableHead>
                  <TableHead className="pr-4">Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : shown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No users match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  shown.map(profile => {
                    const meta = BEHAVIOR_SEGMENT_META[profile.segment];
                    return (
                      <TableRow
                        key={profile.userId}
                        className={cn(!profile.contactable && 'opacity-60')}
                      >
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(profile.userId)}
                            disabled={!profile.contactable}
                            onCheckedChange={() => onToggle(profile.userId)}
                            aria-label={`Select ${profile.name || profile.email || 'user'}`}
                          />
                        </TableCell>

                        <TableCell>
                          <p className="text-sm font-medium leading-tight">
                            {profile.name || '—'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {profile.email || 'no email on file'}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {profile.businessName}
                          </p>
                          {profile.optedOut && (
                            <Badge
                              variant="outline"
                              className="mt-1 gap-1 border-destructive/30 text-[9px] font-bold uppercase text-destructive"
                            >
                              <BanIcon className="h-2.5 w-2.5" />
                              Unsubscribed
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[240px]">
                          <Badge variant="outline" className={cn('text-[10px]', TONE_CLASSES[meta.tone])}>
                            {meta.label}
                          </Badge>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {profile.reasons.slice(0, 2).map(reason => (
                              <span
                                key={reason}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatDuration(profile.usageSeconds)}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {profile.pageViews.toLocaleString()} views
                          </p>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell w-[200px]">
                          {profile.topPages.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No pages tracked</span>
                          ) : (
                            <div className="space-y-1">
                              {profile.topPages.map(page => (
                                <div key={page.path} className="space-y-0.5">
                                  <div className="flex items-baseline justify-between gap-2 text-[10px]">
                                    <span className="truncate font-mono">{page.path}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                      {page.views.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{ width: `${Math.round(page.share * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                              {profile.topFeature && (
                                <p className="pt-0.5 text-[10px] text-muted-foreground">
                                  Mostly {FAMILY_META[profile.topFeature].label}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <UserPresence lastSeen={profile.lastSeen} />
                          <p className="text-[11px] text-muted-foreground">
                            {profile.daysSinceSeen === null
                              ? 'never'
                              : `${profile.daysSinceSeen}d ago`}
                          </p>
                        </TableCell>

                        <TableCell className="pr-4">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'gap-1 text-[10px] font-semibold capitalize',
                              profile.plan === 'starter'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                            )}
                          >
                            {profile.plan !== 'starter' && <Crown className="h-3 w-3" />}
                            {profile.plan === 'starter' ? 'Free' : profile.plan}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
