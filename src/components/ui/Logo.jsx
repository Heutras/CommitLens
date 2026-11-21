import styles from './Logo.module.css';

/**
 * CommitLens mark: a commit line passing through a lens, with the commit in focus.
 * Decorative by default; the wordmark text carries the accessible name.
 */
export function LogoMark({ size = 20, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1 12h5.5M17.5 12H23"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.75" className={styles.focus} />
    </svg>
  );
}

export function Logo({ className }) {
  return (
    <span className={[styles.logo, className].filter(Boolean).join(' ')}>
      <LogoMark />
      <span className={styles.wordmark}>
        Commit<span className={styles.lens}>Lens</span>
      </span>
    </span>
  );
}
