/** Raw GitHub REST payloads, trimmed to the fields CommitLens reads. */

export const rawRepository = {
  full_name: 'acme/rocket',
  name: 'rocket',
  owner: {
    login: 'acme',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    type: 'Organization',
  },
  description: 'A test repository.',
  html_url: 'https://github.com/acme/rocket',
  homepage: '',
  visibility: 'public',
  private: false,
  fork: false,
  archived: false,
  stargazers_count: 12345,
  forks_count: 678,
  subscribers_count: 90,
  open_issues_count: 42,
  license: { name: 'MIT License', spdx_id: 'MIT' },
  default_branch: 'main',
  pushed_at: '2026-11-19T10:00:00Z',
  topics: ['testing'],
};

export const rawLanguages = { JavaScript: 7000, CSS: 2000, HTML: 1000 };

export const rawContributors = [
  {
    login: 'ada',
    avatar_url: null,
    html_url: 'https://github.com/ada',
    contributions: 120,
    type: 'User',
  },
  { login: 'dependabot[bot]', avatar_url: null, html_url: null, contributions: 30, type: 'Bot' },
];

const WEEK = 7 * 24 * 3600;
const firstWeek = Math.floor(Date.UTC(2026, 0, 4) / 1000);
export const rawCommitActivity = Array.from({ length: 52 }, (_, index) => ({
  week: firstWeek + index * WEEK,
  total: index % 5,
  days: [0, 0, 0, 0, 0, 0, 0],
}));

export const rawCommits = [
  {
    sha: 'abcdef1234567890',
    html_url: 'https://github.com/acme/rocket/commit/abcdef1',
    author: { login: 'ada', avatar_url: null },
    commit: {
      message: 'Fix launch sequence\n\nLonger body',
      author: { name: 'Ada', date: '2026-11-19T09:00:00Z' },
    },
  },
];

/**
 * Build a fetch mock that answers GitHub API paths.
 * @param {Record<string, { status?: number, body?: any, headers?: Record<string, string> } | (() => any)>} routes
 *   Keys are path suffixes after /repos/acme/rocket ('' for the repository itself).
 */
export function mockGitHub(routes) {
  return vi.fn(async (input) => {
    const url = new URL(String(input));
    const suffix = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');
    const route = typeof routes[suffix] === 'function' ? routes[suffix]() : routes[suffix];
    if (!route) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    const { status = 200, body = null, headers = {} } = route;
    return new Response(status === 202 || status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '55', ...headers },
    });
  });
}

export const successRoutes = {
  '': { body: rawRepository },
  '/languages': { body: rawLanguages },
  '/contributors': { body: rawContributors },
  '/stats/commit_activity': { body: rawCommitActivity },
  '/commits': { body: rawCommits },
};
