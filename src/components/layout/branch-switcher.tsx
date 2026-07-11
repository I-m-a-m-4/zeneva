'use client';

import React from 'react';
import { useBranch } from '@/context/branch-context';
import { usePOS } from '@/context/pos-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface BranchSwitcherProps {
  variant?: 'sidebar' | 'header' | 'sheet';
  className?: string;
}

export function BranchSwitcher({ variant = 'sidebar', className }: BranchSwitcherProps) {
  const { activeBranchId, setActiveBranchId, branches, isMultiBranchEnabled, isLoadingBranches } = useBranch();
  const { currentUserProfile, business } = usePOS();
  const { state } = useSidebar();
  const isCollapsed = variant === 'sidebar' && state === 'collapsed';

  const isOwner = currentUserProfile && (
    currentUserProfile.role === 'owner' ||
    business?.ownerId === currentUserProfile.id
  );

  if (!isMultiBranchEnabled || isLoadingBranches) return null;

  const currentBranchName = activeBranchId === 'all' 
    ? 'All Branches' 
    : branches.find(b => b.id === activeBranchId)?.name || 'Select Branch';

  if (variant === 'header') {
    return (
      <div className={cn("flex items-center", className)}>
        <Select value={activeBranchId} onValueChange={setActiveBranchId} disabled={!isOwner} modal={false}>
          <SelectTrigger className="h-8 md:h-9 px-2 sm:px-2.5 bg-muted/40 hover:bg-muted/60 border border-dashed border-primary/40 focus:ring-1 focus:ring-primary text-xs sm:text-sm font-semibold text-foreground rounded-lg max-w-[130px] xs:max-w-[170px] sm:max-w-[220px] transition-all shadow-2xs">
            <div className="flex items-center gap-1.5 truncate">
              {activeBranchId === 'all' ? (
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <Store className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <span className="truncate">{currentBranchName}</span>
            </div>
          </SelectTrigger>
          <SelectContent align="start" position="item-aligned">
            <SelectItem value="all" className="font-semibold text-primary">All Branches</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name} {branch.isPrimary ? '(Primary)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (variant === 'sheet') {
    return (
      <div className={cn("w-full py-1.5", className)}>
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 tracking-wider px-1">Current Branch</p>
        <Select value={activeBranchId} onValueChange={setActiveBranchId} disabled={!isOwner} modal={false}>
          <SelectTrigger className="w-full h-11 bg-muted/40 border-2 border-dashed border-primary/40 focus:ring-1 focus:ring-primary text-sm font-bold text-foreground rounded-xl px-3 transition-all">
            <div className="flex items-center gap-2 truncate">
              {activeBranchId === 'all' ? (
                <Building2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Store className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="truncate">{currentBranchName}</span>
            </div>
          </SelectTrigger>
          <SelectContent align="start" position="item-aligned">
            <SelectItem value="all" className="font-semibold text-primary">All Branches</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name} {branch.isPrimary ? '(Primary)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("px-2 py-2 w-full", isCollapsed && "hidden", className)}>
      <Select value={activeBranchId} onValueChange={setActiveBranchId} disabled={!isOwner} modal={false}>
        <SelectTrigger className="w-full h-9 bg-muted/30 border-dashed focus:ring-1 focus:ring-primary">
          <div className="flex items-center gap-2 truncate">
            {activeBranchId === 'all' ? (
              <Building2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Store className="h-4 w-4 text-primary shrink-0" />
            )}
            <SelectValue placeholder="Select Branch" />
          </div>
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
          <SelectItem value="all" className="font-semibold text-primary">All Branches</SelectItem>
          {branches.map(branch => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name} {branch.isPrimary ? '(Primary)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
