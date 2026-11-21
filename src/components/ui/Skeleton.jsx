import styles from './Skeleton.module.css';

/** Placeholder block. Always decorative: pair it with a live status message. */
export function Skeleton({ width = '100%', height = '1rem', radius, className }) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
