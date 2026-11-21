import { useSyncExternalStore } from 'react';
import { rateLimitStore } from '../api/githubClient.js';

/** Latest anonymous GitHub quota seen in any response, or null before the first request. */
export function useRateLimit() {
  return useSyncExternalStore(
    rateLimitStore.subscribe,
    rateLimitStore.getSnapshot,
    rateLimitStore.getServerSnapshot,
  );
}
