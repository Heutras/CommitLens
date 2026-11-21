import { m } from 'motion/react';
import { formatBytes, formatPercent } from '../../../utils/format.js';
import styles from './LanguageBreakdown.module.css';

const SLOT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
const colorFor = (item, index) =>
  item.name === 'Other' ? 'var(--chart-other)' : SLOT_COLORS[index];

/**
 * Share of code bytes per language as a segmented bar with a legend.
 * The legend is the identity channel; the bar shows proportion at a glance.
 *
 * @param {{ languages: import('../utils/normalize.js').LanguageBreakdown }} props
 */
export function LanguageBreakdown({ languages }) {
  const described = languages.items
    .map((item) => `${item.name} ${formatPercent(item.percent)}`)
    .join(', ');

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="img" aria-label={`Share of code bytes: ${described}.`}>
        {languages.items.map((item, index) => (
          <m.span
            key={item.name}
            className={styles.segment}
            style={{ backgroundColor: colorFor(item, index) }}
            initial={false}
            animate={{ flexGrow: Math.max(item.percent, 0.4) }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            title={`${item.name}: ${formatPercent(item.percent)}`}
          />
        ))}
      </div>

      <ul className={styles.legend}>
        {languages.items.map((item, index) => (
          <li key={item.name} className={styles.row}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: colorFor(item, index) }}
              aria-hidden="true"
            />
            <span className={styles.name}>
              {item.name}
              {item.name === 'Other' && languages.languageCount > 5 && (
                <span className={styles.otherCount}>
                  {' '}
                  ({languages.languageCount - 5} languages)
                </span>
              )}
            </span>
            <span className={styles.percent}>{formatPercent(item.percent)}</span>
            <span className={styles.bytes}>{formatBytes(item.bytes)}</span>
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        Measured in bytes of code, as detected by GitHub. Not lines or files.
      </p>
    </div>
  );
}
