import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeContext.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { THEME_STORAGE_KEY } from './themeStorage.js';

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe('ThemeToggle', () => {
  it('follows the system preference on the first visit', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('dark'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderToggle();
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches the theme, updates <html> and saves the choice', async () => {
    document.documentElement.dataset.theme = 'light';
    renderToggle();
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('prefers a saved choice over the system preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
