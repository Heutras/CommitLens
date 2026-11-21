import { Logo } from '../ui/Logo.jsx';
import { ExternalLink } from '../ui/ExternalLink.jsx';
import { navigation, siteConfig } from '../../app/siteConfig.js';
import { Container } from './Container.jsx';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.brand}>
          <Logo />
        </div>

        <nav aria-label="Footer" className={styles.nav}>
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
            <li>
              <a href="#explore">Explore</a>
            </li>
            {siteConfig.repositoryUrl && (
              <li>
                <ExternalLink href={siteConfig.repositoryUrl}>Source on GitHub</ExternalLink>
              </li>
            )}
          </ul>
        </nav>

        <div className={styles.legal}>
          <p>
            Repository data comes from the{' '}
            <ExternalLink href={siteConfig.githubDocsUrl}>GitHub REST API</ExternalLink>. CommitLens
            reads public data only, from your browser, without an account.
          </p>
          <p>
            CommitLens is an independent project. It is not affiliated with or endorsed by GitHub.
          </p>
        </div>
      </Container>
    </footer>
  );
}
