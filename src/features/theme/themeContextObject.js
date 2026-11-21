import { createContext } from 'react';

/** @type {import('react').Context<{ theme: 'light' | 'dark', toggleTheme: () => void, setTheme: (theme: 'light' | 'dark') => void } | null>} */
export const ThemeContext = createContext(null);
