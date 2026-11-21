import { afterEach, describe, expect, it, vi } from 'vitest';
import { githubGet, rateLimitStore } from './githubClient.js';
import { fetchCommitActivity, fetchContributors, fetchRepository } from './repositoryApi.js';
import { mockGitHub, rawContributors, successRoutes } from '../../../test/fixtures/github.js';

const target = { owner: 'acme', repo: 'rocket' };

afterEach(() => vi.unstubAllGlobals());

describe('githubGet', () => {
  it('sends the versioned GitHub media type and forwards the abort signal', async () => {
    const fetchMock = mockGitHub(successRoutes);
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    await githubGet('/repos/acme/rocket', { signal: controller.signal });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.github.com/repos/acme/rocket');
    expect(init.signal).toBe(controller.signal);
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  });

  it('records the remaining quota from response headers', async () => {
    vi.stubGlobal('fetch', mockGitHub(successRoutes));
    await githubGet('/repos/acme/rocket');
    expect(rateLimitStore.getSnapshot()).toMatchObject({ limit: 60, remaining: 55 });
  });

  it('turns a failed fetch into a retryable network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(githubGet('/repos/acme/rocket')).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
    });
  });

  it('lets aborts pass through unchanged', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(githubGet('/repos/acme/rocket')).rejects.toBe(abort);
  });
});

describe('repository API', () => {
  it('classifies a missing repository', async () => {
    vi.stubGlobal('fetch', mockGitHub({}));
    await expect(fetchRepository(target)).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('throws a retryable stats-pending error while GitHub computes statistics (202)', async () => {
    vi.stubGlobal('fetch', mockGitHub({ '/stats/commit_activity': { status: 202 } }));
    await expect(fetchCommitActivity(target)).rejects.toMatchObject({
      kind: 'stats-pending',
      retryable: true,
    });
  });

  it('reports a contributor subset when GitHub has another page', async () => {
    vi.stubGlobal(
      'fetch',
      mockGitHub({
        '/contributors': {
          body: rawContributors,
          headers: {
            link: '<https://api.github.com/repositories/1/contributors?page=2>; rel="next"',
          },
        },
      }),
    );
    await expect(fetchContributors(target)).resolves.toMatchObject({ hasMore: true });
  });

  it('treats 204 from the contributors endpoint as an empty list', async () => {
    vi.stubGlobal('fetch', mockGitHub({ '/contributors': { status: 204 } }));
    await expect(fetchContributors(target)).resolves.toEqual({ items: [], hasMore: false });
  });
});
