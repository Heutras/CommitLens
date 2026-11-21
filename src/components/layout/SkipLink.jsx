import styles from './SkipLink.module.css';

export function SkipLink({ targetId = 'main' }) {
  return (
    <a className={styles.skip} href={`#${targetId}`}>
      Skip to content
    </a>
  );
}
