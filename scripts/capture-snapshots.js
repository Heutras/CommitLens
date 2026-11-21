/**
 * Capture snapshots of the example repositories from the real GitHub API.
 *
 *   npm run snapshots                 # every repository in src/data/exampleRepositories.js
 *   npm run snapshots -- golang/go    # one repository
 *
 * Each section is normalized with the same functions the app uses. A section
 * GitHub cannot provide (for example, contributors of torvalds/linux, which
 * GitHub refuses as "too large") is stored as an error record with its real
 * error kind. Nothing is filled in or estimated.
 *
 * Cost: about 5 requests per repository, plus retries while GitHub computes
 * statistics (HTTP 202). Anonymous quota is 60 requests per hour.
 */
import { writeFile } from 'node:fs/promises';
import { parseRepoInput } from '../src/features/repository/utils/parseRepoInput.js';
import {
  fetchCommitActivity,
  fetchContributors,
  fetchLanguages,
  fetchRecentCommits,
  fetchRepository,
} from '../src/features/repository/api/repositoryApi.js';
import { rateLimitStore } from '../src/features/repository/api/githubClient.js';
import { EXAMPLE_REPOSITORIES, snapshotFileName } from '../src/data/exampleRepositories.js';

const STATS_ATTEMPTS = 8;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withStatsRetry(fn) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (error.kind !== 'stats-pending' || attempt >= STATS_ATTEMPTS) throw error;
      console.log(`    statistics pending (202), waiting before retry ${attempt}`);
      await sleep(5000 * attempt);
    }
  }
}

/** Run one section and record either its data or its classified error. */
async function capture(label, fn) {
  try {
    const data = await fn();
    console.log(`  ok    ${label}`);
    return { data };
  } catch (error) {
    if (!error.kind) throw error;
    if (error.kind === 'rate-limited' || error.kind === 'network') {
      // Transient: do not save a snapshot that only reflects our own quota or connection.
      throw new Error(`${label}: ${error.message} Snapshot not saved.`);
    }
    console.log(`  error ${label}: ${error.kind} (${error.message})`);
    return { error: { kind: error.kind, status: error.status ?? null, message: error.message } };
  }
}

async function captureRepository(fullName) {
  const parsed = parseRepoInput(fullName);
  if (!parsed.ok) throw new Error(parsed.error);
  console.log(fullName);

  const capturedAt = new Date().toISOString();
  const repository = await capture('repository', () => fetchRepository(parsed));
  if (!repository.data)
    throw new Error(`${fullName}: repository request failed. Snapshot not saved.`);

  // Use the canonical name, as the app does, to avoid redirects.
  const target = { owner: repository.data.owner.login, repo: repository.data.name };
  const sections = {
    repository,
    languages: await capture('languages', () => fetchLanguages(target)),
    contributors: await capture('contributors', () => fetchContributors(target)),
    commitActivity: await capture('commit activity', () =>
      withStatsRetry(() => fetchCommitActivity(target)),
    ),
    commits: await capture('recent commits', () => fetchRecentCommits(target)),
  };

  const file = new URL(`../src/data/snapshots/${snapshotFileName(fullName)}`, import.meta.url);
  await writeFile(file, `${JSON.stringify({ fullName, capturedAt, sections }, null, 2)}\n`);
  console.log(`  saved src/data/snapshots/${snapshotFileName(fullName)}`);
}

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const names = requested.length ? requested : EXAMPLE_REPOSITORIES.map((entry) => entry.fullName);

for (const name of names) {
  try {
    await captureRepository(name);
  } catch (error) {
    console.error(`  FAILED ${error.message}`);
    process.exitCode = 1;
  }
}

const quota = rateLimitStore.getSnapshot();
if (quota) console.log(`GitHub quota: ${quota.remaining}/${quota.limit} left`);
