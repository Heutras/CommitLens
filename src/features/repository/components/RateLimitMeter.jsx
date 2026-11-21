import { useRateLimit } from '../hooks/useRateLimit.js';
import styles from './RepositoryExplorer.module.css';

/** Remaining anonymous GitHub quota, read from the latest response headers. */
export function RateLimitMeter() {
  const quota = useRateLimit();
  if (!quota) return null;
  const reset = quota.resetAt?.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <p className={styles.quota}>
      {quota.remaining} of {quota.limit} GitHub requests left
      {reset && <span className={styles.quotaReset}>, resets {reset}</span>}
    </p>
  );
}
