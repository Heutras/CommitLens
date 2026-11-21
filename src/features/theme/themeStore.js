import { getSystemTheme, readStoredTheme, storeTheme, THEMES } from './themeStorage.js';

/**
 * The applied theme lives on <html data-theme>. The inline script in index.html
 * sets it before first paint, so there is no flash of the wrong theme. This
 * store reads and writes that attribute and notifies React subscribers.
 */
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  notify();
}

export const themeStore = {
  /** @returns {'light' | 'dark'} */
  getSnapshot() {
    const applied = document.documentElement.dataset.theme;
    return THEMES.includes(applied) ? applied : (readStoredTheme() ?? getSystemTheme());
  },
  /** Prerendered HTML is theme-neutral; React swaps in the real value after hydration. */
  getServerSnapshot: () => 'light',
  subscribe(listener) {
    listeners.add(listener);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    // Follow the operating system until the visitor makes an explicit choice.
    const onSystemChange = (event) => {
      if (!readStoredTheme()) apply(event.matches ? 'dark' : 'light');
    };
    media?.addEventListener('change', onSystemChange);
    return () => {
      listeners.delete(listener);
      media?.removeEventListener('change', onSystemChange);
    };
  },
  /** @param {'light' | 'dark'} theme */
  set(theme) {
    storeTheme(theme);
    apply(theme);
  },
};
