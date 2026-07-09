'use client';

import React from 'react';
import { useBranch } from '@/context/branch-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

export function BranchSwitcher() {
  const { activeBranchId, setActiveBranchId, branches, isMultiBranchEnabled, isLoadingBranches } = useBranch();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (!isMultiBranchEnabled || isLoadingBranches) return null;

  return (
    <div className={cn("px-2 py-2 w-full", isCollapsed && "hidden")}>
      <Select value={activeBranchId} onValueChange={setActiveBranchId} modal={false}>
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
        <SelectContent>
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
