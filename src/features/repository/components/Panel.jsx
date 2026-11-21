import { useId } from 'react';
import { describeError } from '../api/errors.js';
import styles from './Panel.module.css';

/**
 * One titled area of the explorer. Renders the loading, error and empty states
 * for its section so every panel fails the same way.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} [props.meta] Short fact shown next to the title.
 * @param {import('../utils/sectionState.js').SectionState} props.state
 * @param {(data: any) => boolean} [props.isEmpty]
 * @param {string} [props.emptyMessage]
 * @param {import('react').ReactNode} props.skeleton
 * @param {(data: any) => import('react').ReactNode} props.children
 */
export function Panel({
  title,
  meta,
  state,
  isEmpty,
  emptyMessage,
  skeleton,
  className,
  children,
}) {
  const headingId = useId();
  const { status, data, error, failureReason, retry, isFetching } = state;
  const waitingOnStats = status === 'pending' && failureReason?.kind === 'stats-pending';

  let body;
  if (status === 'pending') {
    body = (
      <>
        {skeleton}
        {waitingOnStats && (
          <p className={styles.hint}>
            GitHub is preparing these statistics. Checking again shortly.
          </p>
        )}
      </>
    );
  } else if (status === 'error') {
    const { title: errorTitle, description } = describeError(error);
    const canRetry = retry && error?.kind !== 'rate-limited' && error?.kind !== 'not-found';
    body = (
      <div className={styles.notice} role="group" aria-label={`${title}: ${errorTitle}`}>
        <p className={styles.noticeTitle}>{errorTitle}</p>
        <p className={styles.noticeText}>{description}</p>
        {canRetry && (
          <button type="button" className={styles.retry} onClick={retry} disabled={isFetching}>
            {isFetching ? 'Retrying' : 'Try again'}
          </button>
        )}
      </div>
    );
  } else if (isEmpty?.(data)) {
    body = <p className={styles.empty}>{emptyMessage}</p>;
  } else {
    body = children(data);
  }

  return (
    <section
      className={[styles.panel, className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
      aria-busy={status === 'pending'}
    >
      <header className={styles.head}>
        <h3 id={headingId} className={styles.title}>
          {title}
        </h3>
        {meta && status === 'success' && <p className={styles.meta}>{meta}</p>}
      </header>
      <div className={styles.body}>{body}</div>
    </section>
  );
}
