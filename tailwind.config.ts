
import type {Config} from 'tailwindcss';
const plugin = require('tailwindcss/plugin');

export default {
  darkMode: "class",
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['"DM Sans"', 'sans-serif'],
        headline: ['"Bricolage Grotesque"', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        code: ['"Source Code Pro"', 'monospace'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
        'instrument-serif': ['"Instrument Serif"', 'serif'],
        'bricolage': ['"Bricolage Grotesque"', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--primary))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'border-shift': {
          'to': {
            transform: 'translateX(-25%)'
          }
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        clipIn: {
          '0%': { opacity: '0', clipPath: 'inset(0 0 100% 0)' },
          '100%': { opacity: '1', clipPath: 'inset(0 0 0 0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'border-shift': 'border-shift .75s linear infinite',
        'marquee': 'marquee 40s linear infinite',
        'clip-in': 'clipIn 1.2s cubic-bezier(0.25, 1, 0.5, 1) both',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    plugin(function({ addUtilities }: { addUtilities: any }) {
      const rotateXUtilities: { [key: string]: any } = {};
      const rotateYUtilities: { [key: string]: any } = {};
      const rotateZUtilities: { [key: string]: any } = {};
      const rotateValues = [0, 5, 10, 15, 20, 30, 45, 75];
      
      rotateValues.forEach((value) => {
        rotateXUtilities[`.rotate-x-${value}`] = {
          '--tw-rotate-x': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateXUtilities[`.-rotate-x-${value}`] = {
            '--tw-rotate-x': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });

      rotateValues.forEach((value) => {
        rotateYUtilities[`.rotate-y-${value}`] = {
          '--tw-rotate-y': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateYUtilities[`.-rotate-y-${value}`] = {
            '--tw-rotate-y': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });
      
      rotateValues.forEach((value) => {
        rotateZUtilities[`.rotate-z-${value}`] = {
          '--tw-rotate-z': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateZUtilities[`.-rotate-z-${value}`] = {
            '--tw-rotate-z': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });
      
      const perspectiveUtilities = {
        ".perspective-none": { perspective: "none" },
        ".perspective-dramatic": { perspective: "100px" },
        ".perspective-near": { perspective: "300px" },
        ".perspective-normal": { perspective: "500px" },
        ".perspective-midrange": { perspective: "800px" },
        ".perspective-distant": { perspective: "1200px" },
      };
      
      const transformStyleUtilities = {
        ".transform-style-preserve-3d": { "transform-style": "preserve-3d" },
        ".transform-style-flat": { "transform-style": "flat" },
      };
      addUtilities({
        ...rotateXUtilities,
        ...rotateYUtilities,
        ...rotateZUtilities,
        ...perspectiveUtilities,
        ...transformStyleUtilities,
      });
    })
  ],
} satisfies Config;
