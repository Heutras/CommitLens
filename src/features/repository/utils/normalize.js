/**
 * Pure functions that turn raw GitHub REST responses into the shapes the UI
 * renders. They never invent values: missing fields become `null`, which the
 * UI shows as "Unavailable", distinct from a real zero.
 */

const MAX_NAMED_LANGUAGES = 5;
const ACTIVITY_WEEKS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const numberOrNull = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * @typedef {object} Repository
 * @property {string} fullName
 * @property {string} name
 * @property {{ login: string, avatarUrl: string | null, type: string | null }} owner
 * @property {string | null} description
 * @property {string} htmlUrl
 * @property {string | null} homepage
 * @property {string | null} visibility
 * @property {boolean} isFork
 * @property {boolean} isArchived
 * @property {number | null} stars
 * @property {number | null} forks
 * @property {number | null} watchers  Users subscribed to notifications.
 * @property {number | null} openIssuesAndPulls  GitHub's open_issues_count, which includes pull requests.
 * @property {{ name: string, spdxId: string | null } | null} license  `null` means GitHub detected no license.
 * @property {string | null} defaultBranch
 * @property {string | null} pushedAt
 * @property {string[]} topics
 */

/** @returns {Repository} */
export function normalizeRepository(raw) {
  const license = raw.license
    ? {
        name: raw.license.name ?? raw.license.spdx_id ?? 'Unknown license',
        spdxId:
          raw.license.spdx_id && raw.license.spdx_id !== 'NOASSERTION' ? raw.license.spdx_id : null,
      }
    : null;

  return {
    fullName: raw.full_name,
    name: raw.name,
    owner: {
      login: raw.owner?.login ?? raw.full_name.split('/')[0],
      avatarUrl: raw.owner?.avatar_url ?? null,
      type: raw.owner?.type ?? null,
    },
    description: raw.description?.trim() || null,
    htmlUrl: raw.html_url,
    homepage: raw.homepage?.trim() || null,
    visibility: raw.visibility ?? (raw.private ? 'private' : null),
    isFork: Boolean(raw.fork),
    isArchived: Boolean(raw.archived),
    stars: numberOrNull(raw.stargazers_count),
    forks: numberOrNull(raw.forks_count),
    watchers: numberOrNull(raw.subscribers_count),
    openIssuesAndPulls: numberOrNull(raw.open_issues_count),
    license,
    defaultBranch: raw.default_branch ?? null,
    pushedAt: raw.pushed_at ?? null,
    topics: Array.isArray(raw.topics) ? raw.topics.slice(0, 6) : [],
  };
}

/**
 * @typedef {{ name: string, bytes: number, percent: number }} LanguageShare
 * @typedef {{ totalBytes: number, items: LanguageShare[], languageCount: number }} LanguageBreakdown
 */

/**
 * Convert GitHub's `{ language: bytes }` map into sorted shares of total code bytes.
 * At most five languages are named; the rest are grouped into "Other". Five matches
 * the number of validated chart colors.
 * Percentages use one decimal and are adjusted with the largest-remainder method so
 * they always add up to exactly 100.
 *
 * @param {Record<string, number> | null} raw
 * @returns {LanguageBreakdown}
 */
export function normalizeLanguages(raw) {
  const entries = Object.entries(raw ?? {})
    .filter(([, bytes]) => typeof bytes === 'number' && bytes > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (totalBytes === 0) return { totalBytes: 0, items: [], languageCount: 0 };

  let grouped = entries.map(([name, bytes]) => ({ name, bytes }));
  if (grouped.length > MAX_NAMED_LANGUAGES) {
    const head = grouped.slice(0, MAX_NAMED_LANGUAGES);
    const otherBytes = grouped
      .slice(MAX_NAMED_LANGUAGES)
      .reduce((sum, item) => sum + item.bytes, 0);
    grouped = [...head, { name: 'Other', bytes: otherBytes }];
  }

  const percents = roundToTotal(
    grouped.map((item) => (item.bytes / totalBytes) * 1000),
    1000,
  ).map((tenths) => tenths / 10);

  return {
    totalBytes,
    languageCount: entries.length,
    items: grouped.map((item, index) => ({ ...item, percent: percents[index] })),
  };
}

/**
 * Largest-remainder rounding: floor every value, then hand the missing units to
 * the values with the largest fractional parts.
 * @param {number[]} values
 * @param {number} total
 */
export function roundToTotal(values, total) {
  const floors = values.map(Math.floor);
  let missing = total - floors.reduce((sum, value) => sum + value, 0);
  const order = values
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of order) {
    if (missing <= 0) break;
    floors[index] += 1;
    missing -= 1;
  }
  return floors;
}

/**
 * @typedef {{ weekStart: string, commits: number, inProgress: boolean }} ActivityWeek
 * @typedef {{ weeks: ActivityWeek[], total: number, peak: ActivityWeek | null, average: number }} CommitActivity
 */

/**
 * Keep the latest 12 weeks from /stats/commit_activity (which returns 52).
 * The final week is usually still in progress; it is flagged so the UI can say so.
 *
 * @param {Array<{ week: number, total: number }> | null} raw
 * @param {number} [now] Current time in ms, injectable for tests.
 * @returns {CommitActivity}
 */
export function normalizeCommitActivity(raw, now = Date.now()) {
  const weeks = (Array.isArray(raw) ? raw : [])
    .filter((entry) => typeof entry?.week === 'number')
    .sort((a, b) => a.week - b.week)
    .slice(-ACTIVITY_WEEKS)
    .map((entry) => ({
      weekStart: new Date(entry.week * 1000).toISOString(),
      commits: numberOrNull(entry.total) ?? 0,
      inProgress: entry.week * 1000 + WEEK_MS > now,
    }));

  const total = weeks.reduce((sum, week) => sum + week.commits, 0);
  const peak = weeks.reduce(
    (best, week) => (!best || week.commits > best.commits ? week : best),
    null,
  );

  return {
    weeks,
    total,
    peak: peak && peak.commits > 0 ? peak : null,
    average: weeks.length ? total / weeks.length : 0,
  };
}

/**
 * @typedef {{ login: string, avatarUrl: string | null, htmlUrl: string | null, contributions: number, isBot: boolean }} Contributor
 * @typedef {{ items: Contributor[], hasMore: boolean }} ContributorList
 */

/**
 * @param {any[] | null} raw
 * @param {boolean} hasMore Whether GitHub reported another page.
 * @returns {ContributorList}
 */
export function normalizeContributors(raw, hasMore = false) {
  const items = (Array.isArray(raw) ? raw : [])
    .filter((entry) => entry?.login)
    .map((entry) => ({
      login: entry.login,
      avatarUrl: entry.avatar_url ?? null,
      htmlUrl: entry.html_url ?? null,
      contributions: numberOrNull(entry.contributions) ?? 0,
      isBot: entry.type === 'Bot' || /\[bot\]$/.test(entry.login),
    }));
  return { items, hasMore };
}

/**
 * @typedef {{ sha: string, shortSha: string, message: string, authorName: string, authorLogin: string | null, avatarUrl: string | null, date: string | null, htmlUrl: string | null }} CommitSummary
 */

/** @returns {CommitSummary[]} */
export function normalizeCommits(raw) {
  return (Array.isArray(raw) ? raw : []).map((entry) => ({
    sha: entry.sha,
    shortSha: String(entry.sha ?? '').slice(0, 7),
    message:
      String(entry.commit?.message ?? '')
        .split('\n')[0]
        .trim() || '(no message)',
    authorName: entry.author?.login ?? entry.commit?.author?.name ?? 'Unknown author',
    authorLogin: entry.author?.login ?? null,
    avatarUrl: entry.author?.avatar_url ?? null,
    date: entry.commit?.author?.date ?? entry.commit?.committer?.date ?? null,
    htmlUrl: entry.html_url ?? null,
  }));
}

/**
 * Detect whether a `Link` response header points at a further page.
 * @param {string | null} linkHeader
 */
export function hasNextPage(linkHeader) {
  return typeof linkHeader === 'string' && /rel="next"/.test(linkHeader);
}
