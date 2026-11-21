import { lazy, Suspense, useState } from 'react';
import { m } from 'motion/react';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { defaultExample, examples, findExample } from '../../../data/snapshots/index.js';
import { useIsClient } from '../../../utils/useIsClient.js';
import { formatBytes, formatDate, formatNumber } from '../../../utils/format.js';
import { describeError } from '../api/errors.js';
import { useRepositoryAnalysis } from '../hooks/useRepositoryAnalysis.js';
import { fromQuery, fromSnapshot } from '../utils/sectionState.js';
import { Panel } from './Panel.jsx';
import { RepoSummary, RepoSummarySkeleton } from './RepoSummary.jsx';
import { LanguageBreakdown } from './LanguageBreakdown.jsx';
import { ContributorList } from './ContributorList.jsx';
import { RecentCommits } from './RecentCommits.jsx';
import { RateLimitMeter } from './RateLimitMeter.jsx';
import { describeAnalysis } from './ExplorerStatus.jsx';
import styles from './RepositoryExplorer.module.css';

// Recharts is the largest dependency. Load it in a separate chunk, in parallel
// with first render, behind a skeleton of the same height.
const CommitActivityChart = lazy(() => import('./CommitActivityChart.jsx'));

/** Section states for every example snapshot, built once. */
const SNAPSHOT_SECTIONS = new Map(
  examples.map((example) => [
    example.fullName,
    Object.fromEntries(
      Object.entries(example.sections).map(([key, record]) => [key, fromSnapshot(record)]),
    ),
  ]),
);

const ChartSkeleton = () => <Skeleton height="16.5rem" radius="var(--radius-md)" />;

const ListSkeleton = ({ rows }) => (
  <div className={styles.listSkeleton}>
    {Array.from({ length: rows }, (_, index) => (
      <Skeleton key={index} height="1.25rem" width={`${92 - index * 6}%`} />
    ))}
  </div>
);

const canRetry = (error) => error?.kind !== 'rate-limited' && error?.kind !== 'not-found';

/**
 * Where the data on screen comes from, and the action that changes it.
 * @param {{ view: 'snapshot' | 'refreshing' | 'refresh-failed' | 'live', example: object | null, fullName: string, liveRepository: import('../utils/sectionState.js').SectionState, onRefresh: () => void, onShowSnapshot: () => void }} props
 */
function SourceBar({ view, example, fullName, liveRepository, onRefresh, onShowSnapshot }) {
  const failure = view === 'refresh-failed' ? describeError(liveRepository.error) : null;

  let action = null;
  if (view === 'snapshot') action = { label: 'Refresh live data', onClick: onRefresh };
  if (view === 'refreshing') action = { label: 'Refreshing live data', disabled: true };
  if (failure && canRetry(liveRepository.error)) {
    action = {
      label: 'Try again',
      onClick: liveRepository.retry,
      disabled: liveRepository.isFetching,
    };
  }
  // A failed custom search shows the same action in its failure panel.
  if (view === 'live' && liveRepository.status !== 'error') {
    action = {
      label: example ? 'Show snapshot' : `Show ${defaultExample.fullName} snapshot`,
      onClick: onShowSnapshot,
    };
  }

  return (
    <div className={styles.sourceArea}>
      <div className={styles.source}>
        <p className={styles.sourceText}>
          {view === 'live' ? (
            <>
              <span className={styles.liveTag}>Live</span>
              {fullName}, from the GitHub API
            </>
          ) : (
            <>
              <span className={styles.sampleTag}>Snapshot</span>
              Saved from the GitHub API on {formatDate(example.capturedAt)}.
            </>
          )}
          {action && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          )}
        </p>
        <RateLimitMeter />
      </div>
      {failure && (
        <p className={styles.refreshError}>
          <strong>Live refresh failed: {failure.title}.</strong> {failure.description} The snapshot
          below is unchanged.
        </p>
      )}
    </div>
  );
}

function RepositoryFailure({ state, fullName, onShowSnapshot }) {
  const { title, description } = describeError(state.error);
  const showRetry = state.error?.retryable || state.error?.kind === 'unknown';
  return (
    <div className={styles.failure} role="alert">
      <h3 className={styles.failureTitle}>{title}</h3>
      <p className={styles.failureText}>
        <code>{fullName}</code>: {description}
      </p>
      <div className={styles.failureActions}>
        {showRetry && (
          <Button variant="ink" size="sm" onClick={state.retry} disabled={state.isFetching}>
            Try again
          </Button>
        )}
        <Button variant="quiet" size="sm" onClick={onShowSnapshot}>
          Show {defaultExample.fullName} snapshot
        </Button>
      </div>
    </div>
  );
}

/** One sentence for the polite live region. */
function describeView(view, example, fullName, sections, liveRepository) {
  switch (view) {
    case 'snapshot':
      return `Showing the ${example.fullName} snapshot from ${formatDate(example.capturedAt)}.`;
    case 'refreshing':
      return `Refreshing live data for ${example.fullName}.`;
    case 'refresh-failed':
      return `Live refresh failed: ${describeError(liveRepository.error).title}. Showing the snapshot from ${formatDate(example.capturedAt)}.`;
    default:
      return describeAnalysis(fullName, sections);
  }
}

/**
 * The analysis view.
 *
 * - Snapshot selections render bundled data and make no requests.
 * - Live selections load data section by section. For an example repository,
 *   its snapshot stays on screen until the live repository data arrives, and
 *   stays there if the refresh fails.
 *
 * @param {{ selection: import('../hooks/useRepositorySelection.js').Selection, onRefresh: () => void, onSelectExample: (example: object) => void, ref?: import('react').Ref<HTMLElement> }} props
 */
export function RepositoryExplorer({ selection, onRefresh, onSelectExample, ref }) {
  const example = findExample(selection.fullName);
  const isLive = selection.source === 'live';
  const analysis = useRepositoryAnalysis(isLive ? selection : null);
  const isClient = useIsClient();

  const liveSections = Object.fromEntries(
    Object.entries(analysis).map(([key, query]) => [key, fromQuery(query)]),
  );
  const liveRepository = liveSections.repository;

  let view = 'live';
  if (example && !isLive) view = 'snapshot';
  else if (example && liveRepository.status === 'pending') view = 'refreshing';
  else if (example && liveRepository.status === 'error') view = 'refresh-failed';

  const showSnapshot = view !== 'live';
  const sections = showSnapshot ? SNAPSHOT_SECTIONS.get(example.fullName) : liveSections;
  const { repository, languages, contributors, commitActivity, commits } = sections;
  // GitHub may answer with a new name for renamed or transferred repositories.
  const fullName = repository.data?.fullName ?? selection.fullName;
  const showDefault = () => onSelectExample(example ?? defaultExample);

  // Animate changes of repository or source, but not the first view: the
  // prerendered HTML must be fully visible before JavaScript runs.
  const viewKey = `${selection.fullName}:${showSnapshot ? 'snapshot' : 'live'}`;
  const [firstViewKey] = useState(viewKey);

  return (
    <section
      id="explore"
      ref={ref}
      tabIndex={-1}
      className={styles.explorer}
      aria-labelledby="explore-heading"
    >
      <h2 id="explore-heading" className="visually-hidden">
        Repository analysis
      </h2>
      <p className="visually-hidden" role="status" aria-live="polite">
        {describeView(view, example, fullName, sections, liveRepository)}
      </p>

      <SourceBar
        view={view}
        example={example}
        fullName={fullName}
        liveRepository={liveRepository}
        onRefresh={onRefresh}
        onShowSnapshot={showDefault}
      />

      {repository.status === 'error' ? (
        <RepositoryFailure state={repository} fullName={fullName} onShowSnapshot={showDefault} />
      ) : (
        <m.div
          key={viewKey}
          initial={viewKey === firstViewKey ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {repository.status === 'success' ? (
            <RepoSummary repository={repository.data} relativeDates={!showSnapshot} />
          ) : (
            <RepoSummarySkeleton />
          )}

          <div className={styles.grid}>
            <Panel
              className={styles.activity}
              title="Weekly commits"
              meta="Last 12 weeks, default branch"
              state={commitActivity}
              isEmpty={(data) => data.weeks.length === 0}
              emptyMessage="GitHub has no commit activity for this repository in the last year."
              skeleton={<ChartSkeleton />}
            >
              {(data) =>
                isClient ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <CommitActivityChart activity={data} />
                  </Suspense>
                ) : (
                  <ChartSkeleton />
                )
              }
            </Panel>

            <Panel
              className={styles.languages}
              title="Languages"
              meta={languages.data ? `${formatBytes(languages.data.totalBytes)} of code` : null}
              state={languages}
              isEmpty={(data) => data.items.length === 0}
              emptyMessage="GitHub detected no programming languages in this repository."
              skeleton={<ListSkeleton rows={5} />}
            >
              {(data) => <LanguageBreakdown languages={data} />}
            </Panel>

            <Panel
              className={styles.contributors}
              title="Top contributors"
              meta={
                contributors.data?.items.length
                  ? `By commits to ${repository.data?.defaultBranch ?? 'the default branch'}`
                  : null
              }
              state={contributors}
              isEmpty={(data) => data.items.length === 0}
              emptyMessage="GitHub lists no contributors for this repository."
              skeleton={<ListSkeleton rows={8} />}
            >
              {(data) => <ContributorList contributors={data} />}
            </Panel>

            <Panel
              className={styles.commits}
              title="Recent commits"
              meta={
                commits.data?.length
                  ? `Latest ${formatNumber(commits.data.length)} on ${repository.data?.defaultBranch ?? 'the default branch'}`
                  : null
              }
              state={commits}
              isEmpty={(data) => data.length === 0}
              emptyMessage="This repository has no commits yet."
              skeleton={<ListSkeleton rows={8} />}
            >
              {(data) => <RecentCommits commits={data} relativeDates={!showSnapshot} />}
            </Panel>
          </div>
        </m.div>
      )}
    </section>
  );
}
