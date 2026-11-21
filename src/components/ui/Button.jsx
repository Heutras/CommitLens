import styles from './Button.module.css';

const cx = (...names) => names.filter(Boolean).join(' ');

/**
 * Button with three visual weights.
 * - primary: the one main action in a view (accent fill)
 * - ink: strong secondary action
 * - quiet: low-emphasis action
 * Pass `href` to render a link that looks like a button.
 */
export function Button({ variant = 'primary', size = 'md', href, className, children, ...props }) {
  const classes = cx(styles.button, styles[variant], styles[size], className);
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
