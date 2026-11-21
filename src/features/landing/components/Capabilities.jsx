import { Container } from '../../../components/layout/Container.jsx';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { defaultExample } from '../../../data/snapshots/index.js';
import { formatPercent, formatWeek } from '../../../utils/format.js';
import styles from './Capabilities.module.css';

// The illustrations use the default example, whose snapshot has every section.
const { commitActivity, languages, contributors, repository } = Object.fromEntries(
  Object.entries(defaultExample.sections).map(([key, record]) => [key, record.data]),
);
const SLOT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function ActivityVisual() {
  const max = Math.max(...commitActivity.weeks.map((week) => week.commits), 1);
  const peak = commitActivity.peak;
  return (
    <figure className={styles.visual}>
      <div className={styles.columns} aria-hidden="true">
        {commitActivity.weeks.map((week) => {
          const isPeak = week.weekStart === peak?.weekStart;
          return (
            <span key={week.weekStart} className={styles.column}>
              {isPeak && <span className={styles.callout}>Busiest week</span>}
              {week.inProgress && <span className={styles.calloutBelow}>In progress</span>}
              <span
                className={styles.columnBar}
                data-peak={isPeak || undefined}
                data-partial={week.inProgress || undefined}
                style={{ height: `${(week.commits / max) * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <figcaption className={styles.caption}>
        {repository.fullName}: {commitActivity.total} commits in 12 weeks, peaking at{' '}
        {peak?.commits} in the week of {peak && formatWeek(peak.weekStart)}.
      </figcaption>
    </figure>
  );
}

function CompositionVisual() {
  return (
    <figure className={styles.visual}>
      <div className={styles.segments} aria-hidden="true">
        {languages.items.map((item, index) => (
          <span
            key={item.name}
            className={styles.segment}
            style={{
              flexGrow: Math.max(item.percent, 0.6),
              backgroundColor: item.name === 'Other' ? 'var(--chart-other)' : SLOT_COLORS[index],
            }}
          >
            {item.percent >= 12 && formatPercent(item.percent)}
          </span>
        ))}
      </div>
      <ul className={styles.keys} aria-hidden="true">
        {languages.items.map((item, index) => (
          <li key={item.name}>
            <span
              className={styles.key}
              style={{
                backgroundColor: item.name === 'Other' ? 'var(--chart-other)' : SLOT_COLORS[index],
              }}
            />
            {item.name}
          </li>
        ))}
      </ul>
      <figcaption className={styles.caption}>
        {repository.fullName}:{' '}
        {languages.items
          .slice(0, 3)
          .map((item) => `${item.name} ${formatPercent(item.percent)}`)
          .join(', ')}{' '}
        of {languages.languageCount} detected languages, by bytes of code.
      </figcaption>
    </figure>
  );
}

function ContributorsVisual() {
  const bot = contributors.items.find((person) => person.isBot);
  return (
    <figure className={styles.visual}>
      <ul className={styles.avatars} aria-hidden="true">
        {contributors.items.map((person) => (
          <li key={person.login} data-bot={person.isBot || undefined}>
            <Avatar src={person.avatarUrl} name={person.login} size={36} />
          </li>
        ))}
      </ul>
      <figcaption className={styles.caption}>
        {repository.fullName}: the first {contributors.items.length} contributors GitHub lists,
        ranked by commits.{bot && ` Automated accounts such as ${bot.login} are marked as bots.`}
      </figcaption>
    </figure>
  );
}

const CAPABILITIES = [
  {
    id: 'activity',
    title: 'Understand development activity',
    body: 'See how many commits landed in each of the last 12 weeks. The busiest week is marked, and the current week is shown as unfinished, so a quiet Monday does not read as a slowdown.',
    Visual: ActivityVisual,
  },
  {
    id: 'composition',
    title: 'Explore code composition',
    body: 'See which languages make up the codebase, measured in bytes of code as GitHub detects them. Beyond the top five, languages are grouped so the main ones stay readable.',
    Visual: CompositionVisual,
  },
  {
    id: 'contributors',
    title: 'Discover project contributors',
    body: 'See who authored the most commits on the default branch, with bots marked. CommitLens shows commit counts only. It does not rate people or the value of their work.',
    Visual: ContributorsVisual,
  },
];

export function Capabilities() {
  return (
    <section id="product" className={styles.section} aria-labelledby="product-heading">
      <Container>
        <h2 id="product-heading" className={styles.heading}>
          What CommitLens shows
        </h2>
        <ul className={styles.list}>
          {CAPABILITIES.map(({ id, title, body, Visual }) => (
            <li key={id} className={styles.item}>
              <div className={styles.copy}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.body}>{body}</p>
              </div>
              <Visual />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
