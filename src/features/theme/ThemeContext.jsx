import { useMemo, useSyncExternalStore } from 'react';
import { ThemeContext } from './themeContextObject.js';
import { themeStore } from './themeStore.js';

/**
 * Provides the active color theme.
 * The first visit follows the operating system. An explicit choice is saved to
 * localStorage and wins on later visits.
 */
export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme: themeStore.set,
      toggleTheme: () => themeStore.set(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
