import { useState } from 'react';
import styles from './Avatar.module.css';

/**
 * GitHub avatar with an initials fallback when the image cannot load.
 * Width and height are fixed to avoid layout shift.
 */
export function Avatar({ src, name, size = 28 }) {
  const [failed, setFailed] = useState(!src);
  const dimension = { width: size, height: size };

  if (failed) {
    return (
      <span className={styles.fallback} style={dimension} aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  const url = new URL(src);
  url.searchParams.set('s', String(size * 2));
  return (
    <img
      className={styles.avatar}
      src={url.toString()}
      alt=""
      {...dimension}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
