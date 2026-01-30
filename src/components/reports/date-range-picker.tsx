
'use client';

import * as React from 'react';
import { format, isSameDay, startOfDay, subDays, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '../ui/separator';

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

const presets = [
    { label: 'Today', range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { label: 'Yesterday', range: { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) } },
    { label: 'Last 7 Days', range: { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) } },
    { label: 'Last 30 Days', range: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) } },
    { label: 'This Month', range: { from: startOfMonth(new Date()), to: endOfDay(new Date()) } },
    { label: 'Last Month', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
];


export function DateRangePicker({ className, date, onDateChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const getDisplayString = () => {
        if (!date?.from) return "Pick a date range";

        const today = new Date();
        const yesterday = subDays(today, 1);
        
        if (date.to && isSameDay(date.from, date.to)) {
            if (isSameDay(date.from, today)) return "Today";
            if (isSameDay(date.from, yesterday)) return "Yesterday";
            return format(date.from, 'LLL dd, y');
        }

        return `${format(date.from, 'LLL dd, y')} - ${date.to ? format(date.to, 'LLL dd, y') : '...'}`;
    };

    const handlePresetClick = (range: DateRange) => {
        onDateChange(range);
        setIsOpen(false);
    };

    return (
        <div className={cn('grid gap-2', className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                        'w-full sm:w-[300px] justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDisplayString()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex" align="start">
                    <div className="flex flex-col space-y-1 p-2 border-r">
                        {presets.map((preset) => (
                             <Button
                                key={preset.label}
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => handlePresetClick(preset.range)}
                             >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range) => {
                            onDateChange(range);
                            if (range?.from && range?.to) {
                                setIsOpen(false);
                            }
                        }}
                        numberOfMonths={1}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

