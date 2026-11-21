import { Container } from '../../../components/layout/Container.jsx';
import { ExamplePicker, RepoForm } from '../../repository/index.js';
import { examples } from '../../../data/snapshots/index.js';
import styles from './Hero.module.css';

/** Headline, repository input, example picker and the product view below it. */
export function Hero({ onAnalyze, inputRef, selectedExample, onSelectExample, children }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <Container>
        <div className={styles.intro}>
          <h1 id="hero-heading" className={styles.title}>
            Understand what moves your codebase.
          </h1>
          <div className={styles.side}>
            <p className={styles.lede}>
              CommitLens reads any public GitHub repository and puts its weekly commits, language
              mix, top contributors and latest changes on one page. No account or token needed.
            </p>
            <RepoForm onAnalyze={onAnalyze} inputRef={inputRef} />
            <ExamplePicker
              examples={examples}
              selected={selectedExample}
              onSelect={onSelectExample}
            />
          </div>
        </div>
        <div className={styles.product}>{children}</div>
      </Container>
    </section>
  );
}
