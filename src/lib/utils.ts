import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeToDate(timestamp: any): Date {
  if (!timestamp) return new Date(0);
  
  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }

  return isNaN(date.getTime()) ? new Date(0) : date;
}

export async function getCountryFromIP(): Promise<string> {
  // Check session storage cache first
  try {
    const cached = sessionStorage.getItem('zeneva_ip_country');
    if (cached) return cached;
  } catch (e) {
    // Ignore storage errors
  }

  let country = 'Unknown';

  // Try Service 1: freeipapi.com (No strict CORS/Rate limit issues usually)
  try {
    const res = await fetch('https://freeipapi.com/api/json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.countryName) {
        country = data.countryName;
      }
    }
  } catch (e) {
    // Silently fail
  }

  // Try Service 2: ipwho.is (Generous limits)
  if (country === 'Unknown') {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.country) {
          country = data.country;
        }
      }
    } catch (e) {
      // Silently fail
    }
  }

  // Try Service 3: ipapi.co (Strict limits, causes 429 CORS errors)
  if (country === 'Unknown') {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.country_name) {
          country = data.country_name;
        }
      }
    } catch (e) {
      // Silently fail
    }
  }

  // Cache result
  try {
    sessionStorage.setItem('zeneva_ip_country', country);
  } catch (e) {
    // Ignore storage errors
  }

  return country;
}
