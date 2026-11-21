/**
 * Example repositories offered below the search input, in display order.
 * The first entry is shown on the initial page load.
 *
 * Each entry needs a snapshot file at `src/data/snapshots/<owner>__<repo>.json`.
 * To add one, append it here and run `npm run snapshots -- owner/repo`.
 */
export const EXAMPLE_REPOSITORIES = [
  { fullName: 'vitejs/vite', category: 'Frontend tooling' },
  { fullName: 'vercel/next.js', category: 'Web framework' },
  { fullName: 'microsoft/vscode', category: 'Developer tools' },
  { fullName: 'golang/go', category: 'Programming language' },
  { fullName: 'torvalds/linux', category: 'Operating system' },
];

/** File name of a snapshot. Lowercase, because GitHub names are case-insensitive. */
export const snapshotFileName = (fullName) => `${fullName.toLowerCase().replace('/', '__')}.json`;
