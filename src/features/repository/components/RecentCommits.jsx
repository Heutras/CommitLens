import { Avatar } from '../../../components/ui/Avatar.jsx';
import { ExternalLink } from '../../../components/ui/ExternalLink.jsx';
import { formatDate, formatDateTime, formatRelative } from '../../../utils/format.js';
import styles from './RecentCommits.module.css';

/** @param {{ commits: import('../utils/normalize.js').CommitSummary[], relativeDates?: boolean }} props */
export function RecentCommits({ commits, relativeDates = true }) {
  return (
    <ol className={styles.list}>
      {commits.map((commit) => (
        <li key={commit.sha} className={styles.row}>
          <p className={styles.message}>
            {commit.htmlUrl ? (
              <ExternalLink href={commit.htmlUrl} className={styles.messageLink}>
                {commit.message}
              </ExternalLink>
            ) : (
              commit.message
            )}
          </p>
          <p className={styles.meta}>
            <Avatar src={commit.avatarUrl} name={commit.authorName} size={16} />
            <span className={styles.author}>{commit.authorName}</span>
            {commit.date && (
              <time dateTime={commit.date} title={formatDateTime(commit.date)}>
                {relativeDates ? formatRelative(commit.date) : formatDate(commit.date)}
              </time>
            )}
            <code className={styles.sha}>{commit.shortSha}</code>
          </p>
        </li>
      ))}
    </ol>
  );
}
