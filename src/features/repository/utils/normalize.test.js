import { describe, expect, it } from 'vitest';
import {
  hasNextPage,
  normalizeCommitActivity,
  normalizeCommits,
  normalizeContributors,
  normalizeLanguages,
  normalizeRepository,
  roundToTotal,
} from './normalize.js';
import {
  rawCommitActivity,
  rawCommits,
  rawContributors,
  rawRepository,
} from '../../../test/fixtures/github.js';

describe('normalizeRepository', () => {
  it('maps GitHub fields and keeps open issues labeled as issues plus PRs', () => {
    const repo = normalizeRepository(rawRepository);
    expect(repo).toMatchObject({
      fullName: 'acme/rocket',
      stars: 12345,
      forks: 678,
      watchers: 90,
      openIssuesAndPulls: 42,
      license: { name: 'MIT License', spdxId: 'MIT' },
      homepage: null,
      visibility: 'public',
    });
  });

  it('uses null, not zero, for missing numbers and missing licenses', () => {
    const repo = normalizeRepository({
      ...rawRepository,
      stargazers_count: undefined,
      license: null,
    });
    expect(repo.stars).toBeNull();
    expect(repo.license).toBeNull();
  });

  it('drops the NOASSERTION SPDX id for custom licenses', () => {
    const repo = normalizeRepository({
      ...rawRepository,
      license: { name: 'Other', spdx_id: 'NOASSERTION' },
    });
    expect(repo.license).toEqual({ name: 'Other', spdxId: null });
  });
});

describe('normalizeLanguages', () => {
  it('sorts by bytes and computes shares of total code bytes', () => {
    const result = normalizeLanguages({ CSS: 2000, JavaScript: 7000, HTML: 1000 });
    expect(result.totalBytes).toBe(10000);
    expect(result.items).toEqual([
      { name: 'JavaScript', bytes: 7000, percent: 70 },
      { name: 'CSS', bytes: 2000, percent: 20 },
      { name: 'HTML', bytes: 1000, percent: 10 },
    ]);
  });

  it('always sums to exactly 100 percent', () => {
    const result = normalizeLanguages({ A: 1, B: 1, C: 1 });
    expect(result.items.map((item) => item.percent)).toEqual([33.4, 33.3, 33.3]);
    expect(result.items.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100, 5);
  });

  it('groups languages beyond the top five into Other', () => {
    const result = normalizeLanguages({ A: 600, B: 500, C: 400, D: 300, E: 200, F: 100, G: 50 });
    expect(result.items.map((item) => item.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'Other']);
    expect(result.items.at(-1).bytes).toBe(150);
    expect(result.languageCount).toBe(7);
  });

  it('returns an empty breakdown for repositories without detected code', () => {
    expect(normalizeLanguages({})).toEqual({ totalBytes: 0, items: [], languageCount: 0 });
    expect(normalizeLanguages(null).items).toEqual([]);
  });
});

describe('roundToTotal', () => {
  it('gives the missing units to the largest remainders', () => {
    expect(roundToTotal([1.5, 1.5, 7], 10)).toEqual([2, 1, 7]);
  });
});

describe('normalizeCommitActivity', () => {
  it('keeps the latest 12 weeks in order and summarizes them', () => {
    const now = (rawCommitActivity.at(-1).week + 3 * 24 * 3600) * 1000;
    const activity = normalizeCommitActivity(rawCommitActivity, now);
    expect(activity.weeks).toHaveLength(12);
    expect(activity.weeks[0].weekStart).toBe(
      new Date(rawCommitActivity[40].week * 1000).toISOString(),
    );
    expect(activity.total).toBe(
      rawCommitActivity.slice(-12).reduce((sum, week) => sum + week.total, 0),
    );
    expect(activity.peak.commits).toBe(4);
  });

  it('flags only the unfinished current week as in progress', () => {
    const now = (rawCommitActivity.at(-1).week + 3 * 24 * 3600) * 1000;
    const flags = normalizeCommitActivity(rawCommitActivity, now).weeks.map(
      (week) => week.inProgress,
    );
    expect(flags.filter(Boolean)).toHaveLength(1);
    expect(flags.at(-1)).toBe(true);
  });

  it('keeps real zero weeks and reports no peak when all weeks are zero', () => {
    const zeros = rawCommitActivity.map((week) => ({ ...week, total: 0 }));
    const activity = normalizeCommitActivity(zeros);
    expect(activity.weeks.every((week) => week.commits === 0)).toBe(true);
    expect(activity.peak).toBeNull();
  });

  it('handles empty or missing statistics', () => {
    expect(normalizeCommitActivity(null)).toEqual({ weeks: [], total: 0, peak: null, average: 0 });
  });
});

describe('normalizeContributors', () => {
  it('marks bots and keeps the subset flag', () => {
    const result = normalizeContributors(rawContributors, true);
    expect(result.hasMore).toBe(true);
    expect(result.items.map((item) => [item.login, item.isBot])).toEqual([
      ['ada', false],
      ['dependabot[bot]', true],
    ]);
  });

  it('ignores anonymous entries without a login', () => {
    expect(normalizeContributors([{ contributions: 5, type: 'Anonymous' }]).items).toEqual([]);
  });
});

describe('normalizeCommits', () => {
  it('uses the first line of the message and a short SHA', () => {
    expect(normalizeCommits(rawCommits)[0]).toMatchObject({
      shortSha: 'abcdef1',
      message: 'Fix launch sequence',
      authorName: 'ada',
      date: '2026-11-19T09:00:00Z',
    });
  });

  it('falls back to the git author name when the commit has no GitHub user', () => {
    const [commit] = normalizeCommits([{ ...rawCommits[0], author: null }]);
    expect(commit.authorName).toBe('Ada');
    expect(commit.authorLogin).toBeNull();
  });
});

describe('hasNextPage', () => {
  it('reads the Link header', () => {
    expect(hasNextPage('<https://api.github.com/x?page=2>; rel="next", <...>; rel="last"')).toBe(
      true,
    );
    expect(hasNextPage('<https://api.github.com/x?page=1>; rel="prev"')).toBe(false);
    expect(hasNextPage(null)).toBe(false);
  });
});
