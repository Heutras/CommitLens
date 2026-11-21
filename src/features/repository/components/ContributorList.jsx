import { Avatar } from '../../../components/ui/Avatar.jsx';
import { ExternalLink } from '../../../components/ui/ExternalLink.jsx';
import { formatNumber } from '../../../utils/format.js';
import styles from './ContributorList.module.css';

/**
 * First page of GitHub's contributor list, ranked by commits to the default branch.
 * The bar is relative to the first entry and only shows rank order.
 *
 * @param {{ contributors: import('../utils/normalize.js').ContributorList }} props
 */
export function ContributorList({ contributors }) {
  const max = Math.max(...contributors.items.map((item) => item.contributions), 1);

  return (
    <div className={styles.wrap}>
      <ol className={styles.list}>
        {contributors.items.map((person) => (
          <li key={person.login} className={styles.row}>
            <Avatar src={person.avatarUrl} name={person.login} size={24} />
            <span className={styles.identity}>
              {person.htmlUrl ? (
                <ExternalLink href={person.htmlUrl} className={styles.login}>
                  {person.login}
                </ExternalLink>
              ) : (
                <span className={styles.login}>{person.login}</span>
              )}
              {person.isBot && <span className={styles.bot}>bot</span>}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.fill}
                style={{ width: `${(person.contributions / max) * 100}%` }}
              />
            </span>
            <span className={styles.count}>
              {formatNumber(person.contributions)}
              <span className="visually-hidden"> commits</span>
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        {contributors.hasMore
          ? `GitHub lists more contributors. This is the first ${contributors.items.length}. `
          : ''}
        Counts show commit authorship, not the size or value of anyone’s work.
      </p>
    </div>
  );
}
