import { describe, expect, it } from 'vitest';
import { GitHubError, classifyResponse, describeError } from './errors.js';

const response = (status, headers = {}) => new Response(null, { status, headers });

describe('classifyResponse', () => {
  it('detects primary rate limits from exhausted quota and reads the reset time', () => {
    const error = classifyResponse(
      response(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' }),
    );
    expect(error.kind).toBe('rate-limited');
    expect(error.resetAt).toEqual(new Date(1800000000 * 1000));
    expect(error.retryable).toBe(false);
  });

  it('detects secondary rate limits from retry-after and 429', () => {
    expect(classifyResponse(response(403, { 'retry-after': '60' })).kind).toBe('rate-limited');
    expect(classifyResponse(response(429)).kind).toBe('rate-limited');
  });

  it.each([
    [404, {}, 'not-found'],
    [409, {}, 'empty-repository'],
    [451, {}, 'forbidden'],
    [401, {}, 'forbidden'],
    [500, {}, 'server'],
    [503, {}, 'server'],
    [418, {}, 'unknown'],
  ])('classifies %i as %s', (status, headers, kind) => {
    expect(classifyResponse(response(status, headers)).kind).toBe(kind);
  });

  it('separates a permission 403 from a rate-limit 403', () => {
    expect(classifyResponse(response(403, { 'x-ratelimit-remaining': '12' })).kind).toBe(
      'forbidden',
    );
  });

  it('recognizes lists too large for the API', () => {
    const error = classifyResponse(response(403, { 'x-ratelimit-remaining': '40' }), {
      message:
        'The history or contributor list is too large to list contributors for this repository via the API.',
    });
    expect(error.kind).toBe('too-large');
  });
});

describe('GitHubError.retryable', () => {
  it('is true only for transient failures', () => {
    expect(new GitHubError('network', '').retryable).toBe(true);
    expect(new GitHubError('server', '').retryable).toBe(true);
    expect(new GitHubError('stats-pending', '').retryable).toBe(true);
    expect(new GitHubError('not-found', '').retryable).toBe(false);
    expect(new GitHubError('rate-limited', '').retryable).toBe(false);
  });
});

describe('describeError', () => {
  it('explains rate limits with the reset time', () => {
    const error = new GitHubError('rate-limited', '', {
      resetAt: new Date('2026-11-20T15:30:00Z'),
    });
    expect(describeError(error).title).toBe('GitHub rate limit reached');
    expect(describeError(error).description).toMatch(/60 anonymous requests per hour/);
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(describeError(new Error('boom')).description).toBe('boom');
  });
});
