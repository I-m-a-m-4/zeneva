'use client';

import * as React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export type Timeframe = 'today' | '7d' | '30d' | '90d' | 'all';

interface TimeframePickerProps {
    value: Timeframe;
    onValueChange: (value: Timeframe) => void;
}

export function TimeframePicker({ value, onValueChange }: TimeframePickerProps) {
    const labels: Record<Timeframe, string> = {
        today: 'Today',
        '7d': 'Last 7d',
        '30d': 'Last 30d',
        '90d': '90 Days',
        all: 'Lifetime'
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[100px] h-8 text-[11px] px-2.5 justify-between font-normal bg-background border-input">
                    {labels[value]}
                    <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => onValueChange('today')} className="text-[11px]">Today</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onValueChange('7d')} className="text-[11px]">Last 7d</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onValueChange('30d')} className="text-[11px]">Last 30d</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onValueChange('90d')} className="text-[11px]">90 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onValueChange('all')} className="text-[11px]">Lifetime</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
