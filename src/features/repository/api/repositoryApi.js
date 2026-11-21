import { githubGet } from './githubClient.js';
import { GitHubError } from './errors.js';
import {
  hasNextPage,
  normalizeCommitActivity,
  normalizeCommits,
  normalizeContributors,
  normalizeLanguages,
  normalizeRepository,
} from '../utils/normalize.js';

export const CONTRIBUTORS_LIMIT = 10;
export const COMMITS_LIMIT = 8;

const repoPath = (owner, repo) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

/** GET /repos/{owner}/{repo} */
export async function fetchRepository({ owner, repo }, { signal } = {}) {
  const { data } = await githubGet(repoPath(owner, repo), { signal });
  return normalizeRepository(data);
}

/** GET /repos/{owner}/{repo}/languages — values are bytes of code per language. */
export async function fetchLanguages({ owner, repo }, { signal } = {}) {
  const { data } = await githubGet(`${repoPath(owner, repo)}/languages`, { signal });
  return normalizeLanguages(data);
}

/**
 * GET /repos/{owner}/{repo}/contributors
 * Returns the first page only. `hasMore` tells the UI that this is a subset.
 * GitHub answers 204 for empty repositories.
 */
export async function fetchContributors({ owner, repo }, { signal } = {}) {
  const { data, headers } = await githubGet(`${repoPath(owner, repo)}/contributors`, {
    signal,
    params: { per_page: CONTRIBUTORS_LIMIT },
  });
  return normalizeContributors(data, hasNextPage(headers.get('link')));
}

/**
 * GET /repos/{owner}/{repo}/stats/commit_activity
 * GitHub answers 202 while it computes statistics for an uncached repository.
 * That case throws a retryable `stats-pending` error so the query layer can
 * retry a bounded number of times.
 */
export async function fetchCommitActivity({ owner, repo }, { signal } = {}) {
  const { data, status } = await githubGet(`${repoPath(owner, repo)}/stats/commit_activity`, {
    signal,
  });
  if (status === 202) {
    throw new GitHubError('stats-pending', 'GitHub is computing commit statistics.', { status });
  }
  return normalizeCommitActivity(data);
}

/**
 * GET /repos/{owner}/{repo}/commits
 * GitHub answers 409 for an empty repository; the client classifies that.
 */
export async function fetchRecentCommits({ owner, repo }, { signal } = {}) {
  const { data } = await githubGet(`${repoPath(owner, repo)}/commits`, {
    signal,
    params: { per_page: COMMITS_LIMIT },
  });
  return normalizeCommits(data);
}
