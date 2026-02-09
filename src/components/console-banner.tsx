'use client';

import { useEffect } from 'react';

export function ConsoleBanner() {
    useEffect(() => {
        // ZENEVA ASCII Banner
        const banner = `
______
|___  /
   / /   ___  _ __    ___  __   __  __ _
  / /   / _ \\| '_ \\  / _ \\ \\ \\ / / / _\` |
 / /___|  __/| | | ||  __/  \\ V / | (_| |
/_____/ \\___||_| |_| \\___|   \\_/   \\__,_|
`;
        // Using a specific color for the ascii art
        console.log(`%c${banner}`, 'color: #F97316; font-weight: bold;');

        // Tagline with background styling
        console.log(
            '%c Never Lose a Sale. Never Waste Stock. ',
            'background: #F97316; color: white; padding: 4px; border-radius: 4px; font-weight: bold; font-size: 12px;'
        );
    }, []);

    return null;
}
