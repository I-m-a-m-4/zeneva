'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CountryCode {
  name: string;
  code: string; // dial code e.g. "+234"
  iso: string;  // ISO 3166-1 alpha-2
  flag: string; // emoji flag
}

export const COUNTRY_CODES: CountryCode[] = [
  // Pinned – most common Zeneva markets
  { name: 'Nigeria', code: '+234', iso: 'NG', flag: '🇳🇬' },
  { name: 'Ghana', code: '+233', iso: 'GH', flag: '🇬🇭' },
  { name: 'Kenya', code: '+254', iso: 'KE', flag: '🇰🇪' },
  { name: 'South Africa', code: '+27', iso: 'ZA', flag: '🇿🇦' },
  { name: 'United Kingdom', code: '+44', iso: 'GB', flag: '🇬🇧' },
  { name: 'United States', code: '+1', iso: 'US', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', iso: 'CA', flag: '🇨🇦' },
  // Alphabetical rest
  { name: 'Afghanistan', code: '+93', iso: 'AF', flag: '🇦🇫' },
  { name: 'Albania', code: '+355', iso: 'AL', flag: '🇦🇱' },
  { name: 'Algeria', code: '+213', iso: 'DZ', flag: '🇩🇿' },
  { name: 'Angola', code: '+244', iso: 'AO', flag: '🇦🇴' },
  { name: 'Argentina', code: '+54', iso: 'AR', flag: '🇦🇷' },
  { name: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺' },
  { name: 'Austria', code: '+43', iso: 'AT', flag: '🇦🇹' },
  { name: 'Bahrain', code: '+973', iso: 'BH', flag: '🇧🇭' },
  { name: 'Bangladesh', code: '+880', iso: 'BD', flag: '🇧🇩' },
  { name: 'Belgium', code: '+32', iso: 'BE', flag: '🇧🇪' },
  { name: 'Benin', code: '+229', iso: 'BJ', flag: '🇧🇯' },
  { name: 'Bolivia', code: '+591', iso: 'BO', flag: '🇧🇴' },
  { name: 'Brazil', code: '+55', iso: 'BR', flag: '🇧🇷' },
  { name: 'Cameroon', code: '+237', iso: 'CM', flag: '🇨🇲' },
  { name: 'Chile', code: '+56', iso: 'CL', flag: '🇨🇱' },
  { name: 'China', code: '+86', iso: 'CN', flag: '🇨🇳' },
  { name: 'Colombia', code: '+57', iso: 'CO', flag: '🇨🇴' },
  { name: "Côte d'Ivoire", code: '+225', iso: 'CI', flag: '🇨🇮' },
  { name: 'Cyprus', code: '+357', iso: 'CY', flag: '🇨🇾' },
  { name: 'Czech Republic', code: '+420', iso: 'CZ', flag: '🇨🇿' },
  { name: 'Denmark', code: '+45', iso: 'DK', flag: '🇩🇰' },
  { name: 'DR Congo', code: '+243', iso: 'CD', flag: '🇨🇩' },
  { name: 'Egypt', code: '+20', iso: 'EG', flag: '🇪🇬' },
  { name: 'Ethiopia', code: '+251', iso: 'ET', flag: '🇪🇹' },
  { name: 'Finland', code: '+358', iso: 'FI', flag: '🇫🇮' },
  { name: 'France', code: '+33', iso: 'FR', flag: '🇫🇷' },
  { name: 'Gambia', code: '+220', iso: 'GM', flag: '🇬🇲' },
  { name: 'Germany', code: '+49', iso: 'DE', flag: '🇩🇪' },
  { name: 'Guinea', code: '+224', iso: 'GN', flag: '🇬🇳' },
  { name: 'Hungary', code: '+36', iso: 'HU', flag: '🇭🇺' },
  { name: 'India', code: '+91', iso: 'IN', flag: '🇮🇳' },
  { name: 'Indonesia', code: '+62', iso: 'ID', flag: '🇮🇩' },
  { name: 'Iraq', code: '+964', iso: 'IQ', flag: '🇮🇶' },
  { name: 'Ireland', code: '+353', iso: 'IE', flag: '🇮🇪' },
  { name: 'Israel', code: '+972', iso: 'IL', flag: '🇮🇱' },
  { name: 'Italy', code: '+39', iso: 'IT', flag: '🇮🇹' },
  { name: 'Jamaica', code: '+1876', iso: 'JM', flag: '🇯🇲' },
  { name: 'Japan', code: '+81', iso: 'JP', flag: '🇯🇵' },
  { name: 'Jordan', code: '+962', iso: 'JO', flag: '🇯🇴' },
  { name: 'Kuwait', code: '+965', iso: 'KW', flag: '🇰🇼' },
  { name: 'Lebanon', code: '+961', iso: 'LB', flag: '🇱🇧' },
  { name: 'Liberia', code: '+231', iso: 'LR', flag: '🇱🇷' },
  { name: 'Libya', code: '+218', iso: 'LY', flag: '🇱🇾' },
  { name: 'Madagascar', code: '+261', iso: 'MG', flag: '🇲🇬' },
  { name: 'Malawi', code: '+265', iso: 'MW', flag: '🇲🇼' },
  { name: 'Malaysia', code: '+60', iso: 'MY', flag: '🇲🇾' },
  { name: 'Mali', code: '+223', iso: 'ML', flag: '🇲🇱' },
  { name: 'Mexico', code: '+52', iso: 'MX', flag: '🇲🇽' },
  { name: 'Morocco', code: '+212', iso: 'MA', flag: '🇲🇦' },
  { name: 'Mozambique', code: '+258', iso: 'MZ', flag: '🇲🇿' },
  { name: 'Namibia', code: '+264', iso: 'NA', flag: '🇳🇦' },
  { name: 'Netherlands', code: '+31', iso: 'NL', flag: '🇳🇱' },
  { name: 'New Zealand', code: '+64', iso: 'NZ', flag: '🇳🇿' },
  { name: 'Niger', code: '+227', iso: 'NE', flag: '🇳🇪' },
  { name: 'Norway', code: '+47', iso: 'NO', flag: '🇳🇴' },
  { name: 'Oman', code: '+968', iso: 'OM', flag: '🇴🇲' },
  { name: 'Pakistan', code: '+92', iso: 'PK', flag: '🇵🇰' },
  { name: 'Philippines', code: '+63', iso: 'PH', flag: '🇵🇭' },
  { name: 'Poland', code: '+48', iso: 'PL', flag: '🇵🇱' },
  { name: 'Portugal', code: '+351', iso: 'PT', flag: '🇵🇹' },
  { name: 'Qatar', code: '+974', iso: 'QA', flag: '🇶🇦' },
  { name: 'Romania', code: '+40', iso: 'RO', flag: '🇷🇴' },
  { name: 'Russia', code: '+7', iso: 'RU', flag: '🇷🇺' },
  { name: 'Rwanda', code: '+250', iso: 'RW', flag: '🇷🇼' },
  { name: 'Saudi Arabia', code: '+966', iso: 'SA', flag: '🇸🇦' },
  { name: 'Senegal', code: '+221', iso: 'SN', flag: '🇸🇳' },
  { name: 'Sierra Leone', code: '+232', iso: 'SL', flag: '🇸🇱' },
  { name: 'Singapore', code: '+65', iso: 'SG', flag: '🇸🇬' },
  { name: 'Somalia', code: '+252', iso: 'SO', flag: '🇸🇴' },
  { name: 'Spain', code: '+34', iso: 'ES', flag: '🇪🇸' },
  { name: 'Sri Lanka', code: '+94', iso: 'LK', flag: '🇱🇰' },
  { name: 'Sudan', code: '+249', iso: 'SD', flag: '🇸🇩' },
  { name: 'Sweden', code: '+46', iso: 'SE', flag: '🇸🇪' },
  { name: 'Switzerland', code: '+41', iso: 'CH', flag: '🇨🇭' },
  { name: 'Tanzania', code: '+255', iso: 'TZ', flag: '🇹🇿' },
  { name: 'Togo', code: '+228', iso: 'TG', flag: '🇹🇬' },
  { name: 'Trinidad & Tobago', code: '+1868', iso: 'TT', flag: '🇹🇹' },
  { name: 'Tunisia', code: '+216', iso: 'TN', flag: '🇹🇳' },
  { name: 'Turkey', code: '+90', iso: 'TR', flag: '🇹🇷' },
  { name: 'UAE', code: '+971', iso: 'AE', flag: '🇦🇪' },
  { name: 'Uganda', code: '+256', iso: 'UG', flag: '🇺🇬' },
  { name: 'Ukraine', code: '+380', iso: 'UA', flag: '🇺🇦' },
  { name: 'Venezuela', code: '+58', iso: 'VE', flag: '🇻🇪' },
  { name: 'Vietnam', code: '+84', iso: 'VN', flag: '🇻🇳' },
  { name: 'Yemen', code: '+967', iso: 'YE', flag: '🇾🇪' },
  { name: 'Zambia', code: '+260', iso: 'ZM', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: '+263', iso: 'ZW', flag: '🇿🇼' },
];

/** Parse a full E.164 number into country + local digits */
function parseE164(value: string, countries: CountryCode[]): { country: CountryCode; local: string } {
  const defaultCountry = countries[0];
  if (!value) return { country: defaultCountry, local: '' };
  const raw = value.startsWith('+') ? value : `+${value}`;
  // Try longest match first to avoid "+1" swallowing "+1868" etc.
  const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (raw.startsWith(c.code)) {
      return { country: c, local: raw.slice(c.code.length) };
    }
  }
  return { country: defaultCountry, local: value.replace(/^\+?/, '') };
}

interface PhoneInputProps {
  id?: string;
  value: string; // full E.164 e.g. "+2348012345678"
  onChange: (e164: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({ id, value, onChange, className, placeholder = '801 234 5678', disabled }: PhoneInputProps) {
  const { country: parsedCountry, local: parsedLocal } = useMemo(() => parseE164(value, COUNTRY_CODES), [value]);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(parsedCountry);
  const [localNumber, setLocalNumber] = useState(parsedLocal);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync when parent value changes externally
  useEffect(() => {
    const { country, local } = parseE164(value, COUNTRY_CODES);
    setSelectedCountry(country);
    setLocalNumber(local);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const filtered = useMemo(() =>
    search.trim()
      ? COUNTRY_CODES.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
        )
      : COUNTRY_CODES,
    [search]
  );

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch('');
    onChange(localNumber ? `${country.code}${localNumber}` : '');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setLocalNumber(raw);
    onChange(raw ? `${selectedCountry.code}${raw}` : '');
  };

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <div className={cn(
        'flex items-center rounded-md border border-input bg-background overflow-hidden transition-shadow',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {/* Country code selector */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-10 bg-muted/50 border-r border-input shrink-0',
            'hover:bg-muted/80 transition-colors text-sm font-medium focus:outline-none'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-xs font-semibold tracking-wide text-foreground">{selectedCountry.code}</span>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
        </button>

        {/* Number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={localNumber}
          onChange={handleNumberChange}
          className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">No results</li>
            )}
            {filtered.map(c => (
              <li
                key={`${c.iso}-${c.code}`}
                role="option"
                aria-selected={c.iso === selectedCountry.iso && c.code === selectedCountry.code}
                onClick={() => handleCountrySelect(c)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer text-sm transition-colors select-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  c.iso === selectedCountry.iso && c.code === selectedCountry.code
                    ? 'bg-primary/10 text-primary font-semibold'
                    : ''
                )}
              >
                <span className="text-base w-6 shrink-0 leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{c.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
