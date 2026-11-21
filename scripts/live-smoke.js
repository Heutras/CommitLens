/**
 * Live smoke test against the real GitHub REST API (5-9 requests).
 * Not part of the deterministic test suite.
 *
 *   node scripts/live-smoke.js [owner/repo]
 *
 * To save example snapshots, use scripts/capture-snapshots.js instead.
 */
import { parseRepoInput } from '../src/features/repository/utils/parseRepoInput.js';
import {
  fetchCommitActivity,
  fetchContributors,
  fetchLanguages,
  fetchRecentCommits,
  fetchRepository,
} from '../src/features/repository/api/repositoryApi.js';
import { rateLimitStore } from '../src/features/repository/api/githubClient.js';

const args = process.argv.slice(2);
const target = parseRepoInput(args.find((arg) => !arg.startsWith('--')) ?? 'vitejs/vite');
if (!target.ok) {
  console.error(target.error);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withStatsRetry(fn, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (error.kind !== 'stats-pending' || attempt >= attempts) throw error;
      console.log(`  stats pending (202), retry ${attempt}/${attempts - 1}`);
      await sleep(3000 * attempt);
    }
  }
}

async function step(label, fn) {
  const started = performance.now();
  try {
    const value = await fn();
    console.log(`ok   ${label} (${Math.round(performance.now() - started)} ms)`);
    return value;
  } catch (error) {
    console.log(`FAIL ${label}: ${error.kind ?? error.name} ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

console.log(`Live smoke test for ${target.fullName}`);
await step('repository', () => fetchRepository(target));
await step('languages', () => fetchLanguages(target));
await step('contributors', () => fetchContributors(target));
await step('commit activity', () => withStatsRetry(() => fetchCommitActivity(target)));
await step('recent commits', () => fetchRecentCommits(target));

const quota = rateLimitStore.getSnapshot();
if (quota) console.log(`rate limit: ${quota.remaining}/${quota.limit} left`);
