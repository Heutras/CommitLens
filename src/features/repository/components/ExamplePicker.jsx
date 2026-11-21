import { useId } from 'react';
import styles from './ExamplePicker.module.css';

/**
 * Example repositories with saved snapshots. Choosing one swaps the whole
 * dashboard to its snapshot without calling GitHub.
 *
 * @param {object} props
 * @param {import('../../../data/snapshots/index.js').ExampleRepository[]} props.examples
 * @param {string | null} props.selected Full name of the example on screen, if any.
 * @param {(example: import('../../../data/snapshots/index.js').ExampleRepository) => void} props.onSelect
 */
export function ExamplePicker({ examples, selected, onSelect }) {
  const labelId = useId();
  const selectedKey = selected?.toLowerCase();

  return (
    <div className={styles.picker} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        Examples
      </p>
      <ul className={styles.list}>
        {examples.map((example) => (
          <li key={example.fullName}>
            <button
              type="button"
              className={styles.option}
              aria-pressed={example.fullName.toLowerCase() === selectedKey}
              onClick={() => onSelect(example)}
            >
              <span className={styles.name}>{example.fullName}</span>
              <span className={styles.category}>{example.category}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
