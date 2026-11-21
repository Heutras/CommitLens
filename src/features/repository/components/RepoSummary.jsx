import { ArrowUpRight } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { ExternalLink } from '../../../components/ui/ExternalLink.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
} from '../../../utils/format.js';
import styles from './RepoSummary.module.css';

const STATS = [
  { key: 'stars', label: 'Stars' },
  { key: 'forks', label: 'Forks' },
  {
    key: 'openIssuesAndPulls',
    label: 'Open issues and PRs',
    note: 'GitHub counts open pull requests as issues in this total.',
  },
  { key: 'watchers', label: 'Watchers' },
];

function Stat({ label, value, note }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>
        <span title={formatNumber(value)}>{formatCompact(value)}</span>
        {typeof value === 'number' && (
          <span className="visually-hidden"> ({formatNumber(value)})</span>
        )}
      </dd>
      {note && <dd className={styles.statNote}>{note}</dd>}
    </div>
  );
}

/**
 * @param {{ repository: import('../utils/normalize.js').Repository, relativeDates?: boolean }} props
 * `relativeDates` is off for the saved sample, where "3 hours ago" would go stale.
 */
export function RepoSummary({ repository, relativeDates = true }) {
  const facts = [
    repository.visibility && {
      label: 'Visibility',
      value: repository.visibility[0].toUpperCase() + repository.visibility.slice(1),
    },
    {
      label: 'License',
      value: repository.license?.spdxId ?? repository.license?.name ?? 'None detected',
    },
    { label: 'Default branch', value: repository.defaultBranch ?? 'Unavailable', mono: true },
    {
      label: 'Last push',
      value: relativeDates ? formatRelative(repository.pushedAt) : formatDate(repository.pushedAt),
      title: formatDateTime(repository.pushedAt),
    },
  ].filter(Boolean);

  return (
    <div className={styles.summary}>
      <div className={styles.identity}>
        <Avatar src={repository.owner.avatarUrl} name={repository.owner.login} size={40} />
        <div className={styles.titles}>
          <h3 className={styles.name}>
            <ExternalLink
              href={repository.htmlUrl}
              className={styles.nameLink}
              aria-label={`${repository.fullName} on GitHub (opens in a new tab)`}
            >
              <span className={styles.owner}>{repository.owner.login} / </span>
              {repository.name}
              <ArrowUpRight size={16} aria-hidden="true" className={styles.nameIcon} />
            </ExternalLink>
          </h3>
          {(repository.isFork || repository.isArchived) && (
            <p className={styles.flags}>
              {repository.isArchived && <span className={styles.flag}>Archived</span>}
              {repository.isFork && <span className={styles.flag}>Fork</span>}
            </p>
          )}
        </div>
      </div>

      <p className={styles.description}>{repository.description ?? 'No description provided.'}</p>

      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt>{fact.label}</dt>
            <dd className={fact.mono ? styles.mono : undefined} title={fact.title}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <dl className={styles.stats}>
        {STATS.map((stat) => (
          <Stat key={stat.key} label={stat.label} value={repository[stat.key]} note={stat.note} />
        ))}
      </dl>
    </div>
  );
}

export function RepoSummarySkeleton() {
  return (
    <div className={styles.summary} aria-hidden="true">
      <div className={styles.identity}>
        <Skeleton width="40px" height="40px" radius="50%" />
        <Skeleton width="14rem" height="1.5rem" />
      </div>
      <Skeleton width="min(36rem, 100%)" height="1rem" className={styles.description} />
      <div className={styles.facts}>
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} width="6rem" height="2.25rem" />
        ))}
      </div>
      <div className={styles.stats}>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className={styles.stat}>
            <Skeleton width="4rem" height="0.75rem" />
            <Skeleton width="5rem" height="2rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
