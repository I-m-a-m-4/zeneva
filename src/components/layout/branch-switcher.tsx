'use client';

import React from 'react';
import { useBranch } from '@/context/branch-context';
import { usePOS } from '@/context/pos-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Store, Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

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

  if (isLoadingBranches) {
    if (variant === 'header') {
      return (
        <div className={cn("flex items-center", className)}>
          <Skeleton className="h-8 md:h-9 w-[130px] xs:w-[170px] sm:w-[220px] rounded-lg" />
        </div>
      );
    }
    if (variant === 'sheet') {
      return (
        <div className={cn("w-full py-1.5", className)}>
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 tracking-wider px-1">Current Branch</p>
          <Skeleton className="w-full h-11 rounded-xl" />
        </div>
      );
    }
    return (
      <div className={cn("px-2 py-2 w-full", isCollapsed && "hidden", className)}>
        <Skeleton className="w-full h-9 rounded-md" />
      </div>
    );
  }

  if (!isMultiBranchEnabled) return null;

  const currentBranchName = activeBranchId === 'all' 
    ? 'All Branches' 
    : branches.find(b => b.id === activeBranchId)?.name || 'Select Branch';

  if (variant === 'header') {
    return (
      <div className={cn("flex items-center", className)}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              disabled={!isOwner} 
              className="h-8 md:h-9 px-2 sm:px-2.5 bg-muted/40 hover:bg-muted/60 border border-dashed border-primary/40 focus:ring-1 focus:ring-primary text-xs sm:text-sm font-semibold text-foreground rounded-lg max-w-[130px] xs:max-w-[170px] sm:max-w-[220px] transition-all shadow-2xs justify-between gap-1.5"
            >
              <div className="flex items-center gap-1.5 truncate">
                {activeBranchId === 'all' ? (
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span className="truncate">{currentBranchName}</span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem onClick={() => setActiveBranchId('all')} className="font-semibold text-primary">
              All Branches
            </DropdownMenuItem>
            {branches.map(branch => (
              <DropdownMenuItem key={branch.id} onClick={() => setActiveBranchId(branch.id)}>
                {branch.name} {branch.isPrimary ? '(Primary)' : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (variant === 'sheet') {
    return (
      <div className={cn("w-full py-1.5", className)}>
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 tracking-wider px-1">Current Branch</p>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              disabled={!isOwner} 
              className="w-full h-11 bg-muted/40 border-2 border-dashed border-primary/40 focus:ring-1 focus:ring-primary text-sm font-bold text-foreground rounded-xl px-3 transition-all justify-between gap-2"
            >
              <div className="flex items-center gap-2 truncate">
                {activeBranchId === 'all' ? (
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Store className="h-4 w-4 text-primary shrink-0" />
                )}
                <span className="truncate">{currentBranchName}</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            <DropdownMenuItem onClick={() => setActiveBranchId('all')} className="font-semibold text-primary">
              All Branches
            </DropdownMenuItem>
            {branches.map(branch => (
              <DropdownMenuItem key={branch.id} onClick={() => setActiveBranchId(branch.id)}>
                {branch.name} {branch.isPrimary ? '(Primary)' : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("px-2 py-2 w-full", isCollapsed && "hidden", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            disabled={!isOwner} 
            className="w-full h-9 bg-muted/30 border-dashed focus:ring-1 focus:ring-primary justify-between font-normal gap-2"
          >
            <div className="flex items-center gap-2 truncate">
              {activeBranchId === 'all' ? (
                <Building2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Store className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="truncate text-xs">{currentBranchName}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuItem onClick={() => setActiveBranchId('all')} className="font-semibold text-primary">
            All Branches
          </DropdownMenuItem>
          {branches.map(branch => (
            <DropdownMenuItem key={branch.id} onClick={() => setActiveBranchId(branch.id)}>
              {branch.name} {branch.isPrimary ? '(Primary)' : ''}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
