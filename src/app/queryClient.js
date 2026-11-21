import { QueryClient } from '@tanstack/react-query';
import { GitHubError } from '../features/repository/api/errors.js';

const MAX_TRANSIENT_RETRIES = 2;
const MAX_STATS_RETRIES = 3;

/**
 * Bounded retry policy.
 * - Never retries client errors (404, 403, 409) or rate limits: retrying a
 *   rate-limited request only burns quota.
 * - Retries network and 5xx failures twice.
 * - Retries "statistics still computing" (HTTP 202) three times with a longer delay.
 */
export function shouldRetry(failureCount, error) {
  if (!(error instanceof GitHubError) || !error.retryable) return false;
  const limit = error.kind === 'stats-pending' ? MAX_STATS_RETRIES : MAX_TRANSIENT_RETRIES;
  return failureCount < limit;
}

export function retryDelay(attempt, error) {
  const base = error?.kind === 'stats-pending' ? 2500 : 800;
  return Math.min(base * 2 ** attempt, 12_000);
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}
