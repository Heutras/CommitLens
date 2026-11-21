export const THEME_STORAGE_KEY = 'commitlens-theme';
export const THEMES = /** @type {const} */ (['light', 'dark']);

/** @returns {'light' | 'dark' | null} The explicitly saved theme, if any. */
export function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null; // Storage can be blocked (private mode, strict privacy settings).
  }
}

/** @param {'light' | 'dark'} theme */
export function storeTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore: the theme still applies for this visit.
  }
}

/** @returns {'light' | 'dark'} */
export function getSystemTheme() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
