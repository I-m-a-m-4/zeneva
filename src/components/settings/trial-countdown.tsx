
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface TrialCountdownProps {
  expiryDate: Date | null;
}

const TrialCountdown: React.FC<TrialCountdownProps> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiryDate) {
            setIsExpired(true);
            return;
        }

        const calculateTimeLeft = () => {
             const now = new Date().getTime();
            const distance = expiryDate.getTime() - now;

            if (distance < 0) {
                setIsExpired(true);
                setTimeLeft(null);
                return null;
            }
            
            setIsExpired(false);
            return {
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            };
        }

        setTimeLeft(calculateTimeLeft());
        
        const intervalId = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            if(newTimeLeft === null) {
                clearInterval(intervalId);
            }
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [expiryDate]);

    if (isExpired || !expiryDate) {
        return (
            <div className="flex items-center gap-3">
                 <ShieldAlert className="h-8 w-8 text-destructive" />
                 <div>
                    <p className="text-lg font-semibold text-destructive">Trial Expired or Inactive</p>
                    <p className="text-xs text-muted-foreground">Please subscribe to a plan to continue.</p>
                 </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
            <div>
                <p className="text-lg font-semibold text-primary">
                    {timeLeft ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s remaining` : 'Calculating...'}
                </p>
                <p className="text-xs text-muted-foreground">
                    Your trial expires on {format(expiryDate, 'PPp')}.
                </p>
            </div>
        </div>
    );
};

export default TrialCountdown;
