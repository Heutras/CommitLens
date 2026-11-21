import { useQuery } from '@tanstack/react-query';
import {
  fetchCommitActivity,
  fetchContributors,
  fetchLanguages,
  fetchRecentCommits,
  fetchRepository,
} from '../api/repositoryApi.js';
import { repositoryKeys } from './queryKeys.js';

const HOUR = 60 * 60 * 1000;

/**
 * Secondary sections and their fetchers. Statistics change slowly and cost a
 * request each, so they stay fresh longer than repository metadata.
 */
const SECTIONS = {
  languages: { queryFn: fetchLanguages, staleTime: HOUR },
  contributors: { queryFn: fetchContributors, staleTime: HOUR },
  commitActivity: { queryFn: fetchCommitActivity, staleTime: HOUR },
  commits: { queryFn: fetchRecentCommits, staleTime: 5 * 60 * 1000 },
};

function useSection(target, name) {
  const { queryFn, staleTime } = SECTIONS[name];
  return useQuery({
    queryKey: target ? repositoryKeys.section(target.owner, target.repo, name) : ['idle', name],
    queryFn: ({ signal }) => queryFn(target, { signal }),
    staleTime,
    enabled: Boolean(target),
  });
}

/**
 * Load everything CommitLens shows for one repository.
 *
 * The repository request runs first. The four section requests start only after
 * it succeeds, so a typo or a private repository costs one request instead of
 * five. Each section then succeeds or fails on its own, which gives partial
 * results when, for example, statistics are still computing.
 *
 * Sections use the canonical owner/name from the repository response. GitHub
 * answers renamed or transferred repositories (facebook/react is now
 * react/react) with a 301 redirect, and following it for every section would
 * double the request count.
 *
 * TanStack Query deduplicates identical in-flight requests and caches results,
 * so re-analyzing a repository within the stale time costs no requests.
 *
 * @param {{ owner: string, repo: string } | null} target `null` keeps every query idle.
 */
export function useRepositoryAnalysis(target) {
  const repository = useQuery({
    queryKey: target ? repositoryKeys.section(target.owner, target.repo, 'repository') : ['idle'],
    queryFn: ({ signal }) => fetchRepository(target, { signal }),
    enabled: Boolean(target),
  });

  const canonical = repository.data
    ? { owner: repository.data.owner.login, repo: repository.data.name }
    : null;
  return {
    repository,
    languages: useSection(canonical, 'languages'),
    contributors: useSection(canonical, 'contributors'),
    commitActivity: useSection(canonical, 'commitActivity'),
    commits: useSection(canonical, 'commits'),
  };
}
