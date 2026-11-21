import { EXAMPLE_REPOSITORIES, snapshotFileName } from '../exampleRepositories.js';

/**
 * Saved GitHub API data for each example repository, captured with
 * `npm run snapshots`. Bundled with the app, so switching between examples
 * never calls GitHub.
 *
 * Snapshot file shape:
 * {
 *   fullName: 'owner/repo',
 *   capturedAt: ISO date,
 *   sections: {
 *     repository | languages | contributors | commitActivity | commits:
 *       { data: <normalized data> } | { error: { kind, status, message } }
 *   }
 * }
 * A section GitHub could not provide keeps its real error, never invented data.
 */
const files = import.meta.glob('./*.json', { eager: true, import: 'default' });

/**
 * @typedef {object} ExampleRepository
 * @property {string} fullName
 * @property {string} owner
 * @property {string} repo
 * @property {string} category
 * @property {string} capturedAt
 * @property {Record<string, { data?: any, error?: { kind: string, status: number | null, message: string } }>} sections
 */

/** @type {ExampleRepository[]} */
export const examples = EXAMPLE_REPOSITORIES.map((entry) => {
  const snapshot = files[`./${snapshotFileName(entry.fullName)}`];
  if (!snapshot) {
    throw new Error(
      `Missing snapshot for ${entry.fullName}. Run: npm run snapshots -- ${entry.fullName}`,
    );
  }
  const [owner, repo] = entry.fullName.split('/');
  return { ...entry, owner, repo, capturedAt: snapshot.capturedAt, sections: snapshot.sections };
});

/** Shown on the initial page load. */
export const defaultExample = examples[0];

/** @returns {ExampleRepository | null} */
export function findExample(fullName) {
  const key = String(fullName ?? '').toLowerCase();
  return examples.find((example) => example.fullName.toLowerCase() === key) ?? null;
}
