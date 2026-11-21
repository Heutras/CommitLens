import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` during prerendering and hydration, `true` afterwards.
 * Lets client-only content (lazy chunks, browser APIs) mount right after
 * hydration without a server/client mismatch.
 */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
