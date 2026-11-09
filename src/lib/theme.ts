export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'amit_crm_theme';

/**
 * Pure function to resolve initial theme given stored value and system preference
 */
export function resolveInitialTheme(
  storedTheme: string | null,
  systemPrefersDark: boolean = false
): ThemeMode {
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Pure function to toggle theme mode
 */
export function toggleThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Applies the 'dark' class to the given element (typically document.documentElement)
 */
export function applyThemeClass(
  element: { classList: { add: (c: string) => void; remove: (c: string) => void; toggle: (c: string, force?: boolean) => boolean } },
  theme: ThemeMode
): void {
  if (theme === 'dark') {
    element.classList.add('dark');
  } else {
    element.classList.remove('dark');
  }
}
