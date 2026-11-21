import { Container } from '../../../components/layout/Container.jsx';
import { RepoForm } from '../../repository/index.js';
import styles from './FinalCta.module.css';

export function FinalCta({ onAnalyze }) {
  return (
    <section className={styles.section} aria-labelledby="cta-heading">
      <Container className={styles.inner}>
        <h2 id="cta-heading" className={styles.heading}>
          Analyze another repository.
        </h2>
        <RepoForm onAnalyze={onAnalyze} />
      </Container>
    </section>
  );
}
