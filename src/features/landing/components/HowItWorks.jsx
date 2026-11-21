import { Container } from '../../../components/layout/Container.jsx';
import styles from './HowItWorks.module.css';

const REPO = '/repos/{owner}/{repo}';
const ENDPOINTS = [
  REPO,
  `${REPO}/languages`,
  `${REPO}/contributors`,
  `${REPO}/stats/commit_activity`,
  `${REPO}/commits`,
];

const STEPS = [
  {
    title: 'Enter a public GitHub repository',
    body: 'Type owner/name, or paste a github.com link. CommitLens checks the format before it sends anything.',
  },
  {
    title: 'Retrieve repository data',
    body: 'Your browser calls the GitHub REST API directly. One request confirms the repository exists; four more load its details.',
    detail: (
      <ul className={styles.endpoints} aria-label="GitHub endpoints used">
        {ENDPOINTS.map((endpoint) => (
          <li key={endpoint}>
            <code>GET {endpoint}</code>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'Explore the resulting insights',
    body: 'Read the charts, or switch the commit chart to a table. Results stay cached while the page is open, so going back to a repository costs no new requests.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-heading">
      <Container>
        <h2 id="how-heading" className={styles.heading}>
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.body}>{step.body}</p>
              {step.detail}
            </li>
          ))}
        </ol>
        <p className={styles.limit}>
          GitHub allows 60 anonymous API requests per hour from one IP address. A new analysis uses
          five.
        </p>
      </Container>
    </section>
  );
}
