/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeColors {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export const THEME_PRESETS: Record<string, { name: string; colors: ThemeColors; primaryClass: string }> = {
  purple: {
    name: 'Royal Purple (Default)',
    primaryClass: 'bg-violet-600',
    colors: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3ade',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#1e113a',
    }
  },
  blue: {
    name: 'Ocean Blue',
    primaryClass: 'bg-blue-600',
    colors: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#03253a',
    }
  },
  green: {
    name: 'Emerald Green',
    primaryClass: 'bg-emerald-600',
    colors: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    }
  },
  gold: {
    name: 'Sunset Gold',
    primaryClass: 'bg-amber-500',
    colors: {
      50: '#fffdf0',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006',
    }
  },
  rose: {
    name: 'Rose Crimson',
    primaryClass: 'bg-rose-600',
    colors: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519',
    }
  },
  teal: {
    name: 'Teal Breeze',
    primaryClass: 'bg-teal-600',
    colors: {
      50: '#f0fdfb',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e',
    }
  },
  slate: {
    name: 'Slate Charcoal',
    primaryClass: 'bg-slate-700',
    colors: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    }
  }
};

export function applyTheme(styleKey: string) {
  const root = document.documentElement;
  const preset = THEME_PRESETS[styleKey] || THEME_PRESETS.purple;
  
  // Set each color variable steps
  Object.entries(preset.colors).forEach(([weight, hex]) => {
    root.style.setProperty(`--brand-${weight}`, hex);
  });
}
