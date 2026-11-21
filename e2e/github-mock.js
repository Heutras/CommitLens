/**
 * Route every api.github.com request to deterministic fixtures, so end-to-end
 * tests never depend on GitHub availability or the anonymous rate limit.
 */
const WEEK = 7 * 24 * 3600;
const lastWeek = Math.floor(Date.UTC(2026, 10, 15) / 1000);

export const fixtures = {
  repository: {
    full_name: 'acme/rocket',
    name: 'rocket',
    owner: { login: 'acme', avatar_url: null, type: 'Organization' },
    description: 'Mocked repository for end-to-end tests.',
    html_url: 'https://github.com/acme/rocket',
    visibility: 'public',
    stargazers_count: 4321,
    forks_count: 210,
    subscribers_count: 33,
    open_issues_count: 17,
    license: { name: 'Apache License 2.0', spdx_id: 'Apache-2.0' },
    default_branch: 'trunk',
    pushed_at: '2026-11-18T12:00:00Z',
  },
  languages: { Rust: 9000, Python: 1000 },
  contributors: [
    {
      login: 'grace',
      avatar_url: null,
      html_url: 'https://github.com/grace',
      contributions: 300,
      type: 'User',
    },
    {
      login: 'linus',
      avatar_url: null,
      html_url: 'https://github.com/linus',
      contributions: 120,
      type: 'User',
    },
  ],
  commitActivity: Array.from({ length: 52 }, (_, index) => ({
    week: lastWeek - (51 - index) * WEEK,
    total: (index * 7) % 23,
    days: [0, 0, 0, 0, 0, 0, 0],
  })),
  commits: [
    {
      sha: '1234567890abcdef',
      html_url: 'https://github.com/acme/rocket/commit/1234567',
      author: { login: 'grace', avatar_url: null },
      commit: {
        message: 'Add ignition checks',
        author: { name: 'Grace', date: '2026-11-18T11:00:00Z' },
      },
    },
  ],
};

// Mirrors the CORS headers api.github.com sends; without them the browser
// hides rate-limit and Link headers from JavaScript.
export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers':
    'ETag, Link, Location, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset',
};

const json = (body, status = 200, headers = {}) => ({
  status,
  contentType: 'application/json',
  headers: {
    ...CORS_HEADERS,
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '42',
    'x-ratelimit-reset': '1800000000',
    ...headers,
  },
  body: JSON.stringify(body),
});

/** @param {import('@playwright/test').Page} page */
export async function mockGitHub(page, overrides = {}) {
  const calls = [];
  await page.route('https://api.github.com/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    calls.push(path);
    const suffix = path.replace(/^\/repos\/[^/]+\/[^/]+/, '');
    if (overrides[suffix]) return route.fulfill(overrides[suffix]);
    if (!path.startsWith('/repos/acme/rocket'))
      return route.fulfill(json({ message: 'Not Found' }, 404));
    const routes = {
      '': fixtures.repository,
      '/languages': fixtures.languages,
      '/contributors': fixtures.contributors,
      '/stats/commit_activity': fixtures.commitActivity,
      '/commits': fixtures.commits,
    };
    return route.fulfill(
      json(routes[suffix] ?? { message: 'Not Found' }, routes[suffix] ? 200 : 404),
    );
  });
  return calls;
}

export const rateLimited = json({ message: 'API rate limit exceeded for 0.0.0.0.' }, 403, {
  'x-ratelimit-remaining': '0',
});
