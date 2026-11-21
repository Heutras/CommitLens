import styles from './Container.module.css';

export function Container({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={[styles.container, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  );
}
