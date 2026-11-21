import { render } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { AppProviders } from '../app/AppProviders.jsx';
import { shouldRetry } from '../app/queryClient.js';

/**
 * Render inside the real providers with a fresh cache per test. Retries keep
 * the production policy but without delays, so retry behavior is still tested.
 */
export function renderWithProviders(ui, { retry = shouldRetry } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry, retryDelay: 0, gcTime: Infinity } },
  });
  return { queryClient, ...render(<AppProviders queryClient={queryClient}>{ui}</AppProviders>) };
}
