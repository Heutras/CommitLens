/**
 * GitHub naming rules, simplified to what the REST API accepts:
 * - owner: 1-39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.
 * - repo: 1-100 chars of letters, digits, ".", "-" or "_", and not "." or "..".
 */
const OWNER_PATTERN = /^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const GITHUB_HOST = /^(?:www\.)?github\.com$/i;
const URL_PREFIX = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/\s]+)(\/.*)?$/i;

/**
 * @typedef {{ ok: true, owner: string, repo: string, fullName: string }} ParseSuccess
 * @typedef {{ ok: false, error: string }} ParseFailure
 */

/**
 * Parse user input into a GitHub owner and repository name.
 *
 * Accepts `owner/repo`, `github.com/owner/repo` and full `https://github.com/owner/repo`
 * URLs, including trailing paths such as `/tree/main`, a `.git` suffix, query strings
 * and hash fragments.
 *
 * @param {string} input
 * @returns {ParseSuccess | ParseFailure}
 */
export function parseRepoInput(input) {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return { ok: false, error: 'Enter a repository, for example facebook/react.' };
  }

  let path = raw;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  const [, firstSegment, rest] = raw.match(URL_PREFIX) ?? [];

  // GitHub owner names cannot contain dots, so a dotted first segment is a host.
  if (hasScheme || (firstSegment ?? '').includes('.')) {
    if (!GITHUB_HOST.test(firstSegment ?? '')) {
      return { ok: false, error: 'Only github.com repository links are supported.' };
    }
    path = rest ?? '';
  }

  const segments = path.split(/[?#]/)[0].split('/').filter(Boolean);

  if (segments.length < 2) {
    return { ok: false, error: 'Use the format owner/repository, for example facebook/react.' };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  if (!OWNER_PATTERN.test(owner)) {
    return { ok: false, error: `“${owner}” is not a valid GitHub user or organization name.` };
  }
  if (!REPO_PATTERN.test(repo) || repo === '.' || repo === '..') {
    return { ok: false, error: `“${repo}” is not a valid repository name.` };
  }

  return { ok: true, owner, repo, fullName: `${owner}/${repo}` };
}
