import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { parseRepoInput } from '../utils/parseRepoInput.js';
import styles from './RepoForm.module.css';

/**
 * Repository input with validation. Calls `onAnalyze` only with a parsed,
 * valid target, so nothing reaches the network for malformed input.
 *
 * @param {object} props
 * @param {(target: { owner: string, repo: string, fullName: string }) => void} props.onAnalyze
 * @param {string} [props.label]
 * @param {import('react').Ref<HTMLInputElement>} [props.inputRef]
 */
export function RepoForm({ onAnalyze, label = 'GitHub repository', inputRef, className }) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  const analyze = (input) => {
    const result = parseRepoInput(input);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setError(null);
    onAnalyze({ owner: result.owner, repo: result.repo, fullName: result.fullName });
    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!analyze(value)) event.currentTarget.elements.namedItem('repository')?.focus();
  };

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <div className={styles.field} data-invalid={Boolean(error) || undefined}>
          <input
            ref={inputRef}
            id={inputId}
            name="repository"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="owner/repository"
            className={styles.input}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          <Button type="submit" className={styles.submit}>
            Analyze
          </Button>
        </div>
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      </form>
    </div>
  );
}
