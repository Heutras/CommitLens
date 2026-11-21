const SECTION_NAMES = {
  languages: 'languages',
  contributors: 'contributors',
  commitActivity: 'commit activity',
  commits: 'recent commits',
};

/**
 * One sentence that sums up the analysis state for screen readers.
 * Exported for tests; rendered into a polite live region by the explorer.
 */
export function describeAnalysis(fullName, sections) {
  if (!fullName) return '';
  const { repository } = sections;
  if (repository.status === 'pending') return `Loading ${fullName}.`;
  if (repository.status === 'error') return `Could not load ${fullName}.`;

  const others = Object.keys(SECTION_NAMES).map((key) => [key, sections[key]]);
  if (others.some(([, state]) => state.status === 'pending'))
    return `Loaded ${fullName}. Loading details.`;

  const failed = others
    .filter(([, state]) => state.status === 'error')
    .map(([key]) => SECTION_NAMES[key]);
  return failed.length
    ? `Loaded ${fullName}. Unavailable: ${failed.join(', ')}.`
    : `Loaded ${fullName}.`;
}
