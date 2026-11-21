import { useCallback, useEffect, useState } from 'react';
import { defaultExample, findExample } from '../../../data/snapshots/index.js';
import { parseRepoInput } from '../utils/parseRepoInput.js';

const PARAM = 'repo';

/**
 * @typedef {object} Selection
 * @property {string} owner
 * @property {string} repo
 * @property {string} fullName
 * @property {'snapshot' | 'live'} source  `snapshot` reads bundled data and makes no requests.
 */

/** @returns {Selection} */
const snapshotOf = (example) => ({
  owner: example.owner,
  repo: example.repo,
  fullName: example.fullName,
  source: 'snapshot',
});

const INITIAL = snapshotOf(defaultExample);

/** A `?repo=` link is a deliberate request for live data; anything else shows the default snapshot. */
function readSelectionFromUrl() {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  const result = value ? parseRepoInput(value) : null;
  if (!result?.ok) return INITIAL;
  // Use the example's spelling when the link names an example, so it stays selected.
  const example = findExample(result.fullName);
  return example
    ? { ...snapshotOf(example), source: 'live' }
    : { owner: result.owner, repo: result.repo, fullName: result.fullName, source: 'live' };
}

function writeUrl(selection) {
  const url = new URL(window.location.href);
  if (selection.source === 'live') url.searchParams.set(PARAM, selection.fullName);
  else url.searchParams.delete(PARAM);
  if (url.href !== window.location.href) window.history.pushState(null, '', url);
}

/**
 * The repository on screen and where its data comes from.
 *
 * - `selectExample` shows a bundled snapshot. No GitHub request.
 * - `analyze` loads live data for any repository (custom search).
 * - `refreshLive` loads live data for the current repository.
 *
 * Live selections are mirrored in `?repo=owner/name` so they can be shared.
 * The URL is read after mount, so the prerendered HTML (the default snapshot)
 * and the first client render match.
 */
export function useRepositorySelection() {
  const [selection, setSelection] = useState(INITIAL);

  useEffect(() => {
    // Syncing from the URL, an external system, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(readSelectionFromUrl());
    const onPopState = () => setSelection(readSelectionFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const apply = useCallback((next) => {
    setSelection(next);
    writeUrl(next);
  }, []);

  const selectExample = useCallback((example) => apply(snapshotOf(example)), [apply]);

  const analyze = useCallback(
    (target) => {
      const example = findExample(target.fullName);
      apply(example ? { ...snapshotOf(example), source: 'live' } : { ...target, source: 'live' });
    },
    [apply],
  );

  const refreshLive = useCallback(
    () => apply({ ...selection, source: 'live' }),
    [apply, selection],
  );

  return { selection, selectExample, analyze, refreshLive };
}
