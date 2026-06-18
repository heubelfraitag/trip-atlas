import { useEffect, useState } from 'react';

const STORAGE_KEY = 'atlas-theme';
export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  // Drive color-scheme from JS (declaring it in CSS makes lightningcss rewrite
  // the rule into a prefers-color-scheme media query, breaking class-based toggle).
  root.style.colorScheme = theme;
  // Keep the iOS PWA chrome in sync with the active bg
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#14182a' : '#f5ede0');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);
  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}
