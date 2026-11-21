import { describe, expect, it } from 'vitest';
import { retryDelay, shouldRetry } from './queryClient.js';
import { GitHubError } from '../features/repository/api/errors.js';

describe('retry policy', () => {
  it('never retries rate limits or client errors', () => {
    expect(shouldRetry(0, new GitHubError('rate-limited', ''))).toBe(false);
    expect(shouldRetry(0, new GitHubError('not-found', ''))).toBe(false);
    expect(shouldRetry(0, new Error('plain'))).toBe(false);
  });

  it('retries network and server errors twice', () => {
    const error = new GitHubError('network', '');
    expect([0, 1, 2].map((count) => shouldRetry(count, error))).toEqual([true, true, false]);
  });

  it('retries pending statistics three times with longer delays', () => {
    const error = new GitHubError('stats-pending', '');
    expect([0, 1, 2, 3].map((count) => shouldRetry(count, error))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(retryDelay(0, error)).toBeGreaterThan(retryDelay(0, new GitHubError('network', '')));
    expect(retryDelay(10, error)).toBe(12_000);
  });
});
