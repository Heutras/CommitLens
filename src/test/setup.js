import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.history.replaceState(null, '', '/');
});

// jsdom lacks these browser APIs.
if (!window.matchMedia) {
  window.matchMedia = vi.fn((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver ??= ResizeObserverStub;
window.scrollTo ??= vi.fn();
Element.prototype.scrollIntoView ??= vi.fn();
window.requestAnimationFrame ??= (callback) => setTimeout(callback, 0);
