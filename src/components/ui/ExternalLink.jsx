/** Link to another site. Opens in a new tab and says so to screen readers. */
export function ExternalLink({ href, children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}
