/**
 * Error kinds the UI knows how to explain. Every failed GitHub request is
 * classified into exactly one of these.
 * @typedef {'not-found' | 'rate-limited' | 'forbidden' | 'stats-pending' | 'too-large' | 'empty-repository' | 'network' | 'server' | 'unknown'} GitHubErrorKind
 */

export class GitHubError extends Error {
  /**
   * @param {GitHubErrorKind} kind
   * @param {string} message
   * @param {{ status?: number, resetAt?: Date | null, cause?: unknown }} [details]
   */
  constructor(kind, message, { status, resetAt = null, cause } = {}) {
    super(message, { cause });
    this.name = 'GitHubError';
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }

  /** Transient failures that a bounded automatic retry may fix. */
  get retryable() {
    return this.kind === 'network' || this.kind === 'server' || this.kind === 'stats-pending';
  }
}

/**
 * Read the rate-limit reset time from response headers.
 * @param {Headers} headers
 * @returns {Date | null}
 */
export function readResetTime(headers) {
  const retryAfter = Number(headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return new Date(Date.now() + retryAfter * 1000);
  }
  const reset = Number(headers.get('x-ratelimit-reset'));
  return Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
}

/**
 * Turn a non-OK GitHub response into a typed error.
 *
 * GitHub returns 403 or 429 for rate limits. A 403 without exhausted quota or
 * `retry-after` is a permission problem, not a rate limit.
 *
 * @param {Response} response
 * @param {{ message?: string }} [body]
 * @returns {GitHubError}
 */
export function classifyResponse(response, body = {}) {
  const { status, headers } = response;
  const apiMessage = typeof body.message === 'string' ? body.message : '';
  const exhausted = headers.get('x-ratelimit-remaining') === '0';
  const throttled = headers.has('retry-after') || /rate limit/i.test(apiMessage);

  if (status === 429 || (status === 403 && (exhausted || throttled))) {
    return new GitHubError('rate-limited', 'GitHub API rate limit reached.', {
      status,
      resetAt: readResetTime(headers),
    });
  }
  if (status === 404) {
    return new GitHubError('not-found', 'Repository not found, or it is private.', { status });
  }
  if (status === 409) {
    return new GitHubError('empty-repository', 'This repository has no commits yet.', { status });
  }
  if (status === 403 && /too large/i.test(apiMessage)) {
    return new GitHubError(
      'too-large',
      'GitHub does not list this data for very large repositories.',
      {
        status,
      },
    );
  }
  if (status === 401 || status === 403 || status === 451) {
    return new GitHubError('forbidden', 'GitHub refused access to this repository.', { status });
  }
  if (status >= 500) {
    return new GitHubError('server', 'GitHub is having trouble responding.', { status });
  }
  return new GitHubError('unknown', apiMessage || `Unexpected response (${status}).`, { status });
}

/**
 * Plain-language copy for each error kind. Kept here so every panel explains
 * the same failure the same way.
 * @param {GitHubError | Error | null | undefined} error
 * @returns {{ title: string, description: string }}
 */
export function describeError(error) {
  const kind = error instanceof GitHubError ? error.kind : 'unknown';
  switch (kind) {
    case 'not-found':
      return {
        title: 'Repository not found',
        description: 'Check the spelling. Private repositories are not available without sign-in.',
      };
    case 'rate-limited': {
      const time = error.resetAt
        ? error.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      return {
        title: 'GitHub rate limit reached',
        description: time
          ? `GitHub allows 60 anonymous requests per hour. The limit resets at ${time}.`
          : 'GitHub allows 60 anonymous requests per hour. Try again later.',
      };
    }
    case 'forbidden':
      return {
        title: 'Access denied',
        description: 'GitHub did not allow access to this repository.',
      };
    case 'stats-pending':
      return {
        title: 'Statistics are still being prepared',
        description: 'GitHub computes these on first request. Try again in a minute.',
      };
    case 'too-large':
      return {
        title: 'Too large for the API',
        description: 'GitHub does not return this list for repositories with very long histories.',
      };
    case 'empty-repository':
      return { title: 'No commits yet', description: 'This repository is empty.' };
    case 'network':
      return {
        title: 'Could not reach GitHub',
        description: 'Check your connection and try again.',
      };
    case 'server':
      return {
        title: 'GitHub is unavailable',
        description: 'GitHub returned a server error. Try again shortly.',
      };
    default:
      return {
        title: 'Something went wrong',
        description: error?.message || 'The request failed. Try again.',
      };
  }
}
