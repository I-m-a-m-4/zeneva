'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Timeframe = 'today' | '7d' | '30d' | '90d' | 'all';

interface TimeframePickerProps {
    value: Timeframe;
    onValueChange: (value: Timeframe) => void;
}

export function TimeframePicker({ value, onValueChange }: TimeframePickerProps) {
    return (
        <Select value={value} onValueChange={(val: any) => onValueChange(val)}>
            <SelectTrigger className="w-[100px] h-8 text-[11px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="30d">Last 30d</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="all">Lifetime</SelectItem>
            </SelectContent>
        </Select>
    );
}
