import { GitHubError, classifyResponse, readResetTime } from './errors.js';

export const GITHUB_API = 'https://api.github.com';

/**
 * Latest rate-limit state seen in any GitHub response. Exposed as a tiny
 * external store so the UI can show the remaining anonymous quota without
 * spending an extra request on /rate_limit.
 * @typedef {{ limit: number, remaining: number, resetAt: Date | null }} RateLimitState
 */
let rateLimit = /** @type {RateLimitState | null} */ (null);
const listeners = new Set();

export const rateLimitStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => rateLimit,
  getServerSnapshot: () => null,
};

function recordRateLimit(headers) {
  const limit = Number(headers.get('x-ratelimit-limit'));
  const remaining = Number(headers.get('x-ratelimit-remaining'));
  if (!headers.has('x-ratelimit-remaining') || !Number.isFinite(remaining)) return;
  rateLimit = { limit, remaining, resetAt: readResetTime(headers) };
  listeners.forEach((listener) => listener());
}

/**
 * Perform a GET request against the GitHub REST API.
 *
 * Returns `data: null` for 202 (statistics still computing) and 204 (no content);
 * the endpoint functions decide what those mean. Throws a classified
 * {@link GitHubError} for every other non-2xx response and for network failures.
 *
 * @param {string} path API path starting with "/".
 * @param {{ signal?: AbortSignal, params?: Record<string, string | number> }} [options]
 * @returns {Promise<{ data: any, status: number, headers: Headers }>}
 */
export async function githubGet(path, { signal, params } = {}) {
  const url = new URL(path, GITHUB_API);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  let response;
  try {
    response = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new GitHubError('network', 'Network request failed.', { cause });
  }

  recordRateLimit(response.headers);

  if (response.status === 202 || response.status === 204) {
    return { data: null, status: response.status, headers: response.headers };
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw classifyResponse(response, body);

  return { data: body, status: response.status, headers: response.headers };
}
