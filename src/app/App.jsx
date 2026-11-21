import { useCallback, useRef } from 'react';
import { SkipLink } from '../components/layout/SkipLink.jsx';
import { SiteHeader } from '../components/layout/SiteHeader.jsx';
import { SiteFooter } from '../components/layout/SiteFooter.jsx';
import { Capabilities, FinalCta, Hero, HowItWorks } from '../features/landing/index.js';
import { RepositoryExplorer, useRepositorySelection } from '../features/repository/index.js';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const { selection, selectExample, analyze, refreshLive } = useRepositorySelection();
  const explorerRef = useRef(null);
  const heroInputRef = useRef(null);

  // After an analysis starts, move focus and the viewport to the results so
  // keyboard and screen reader users land where the new content appears.
  const handleAnalyze = useCallback(
    (next) => {
      analyze(next);
      requestAnimationFrame(() => {
        const explorer = explorerRef.current;
        explorer?.focus({ preventScroll: true });
        explorer?.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    },
    [analyze],
  );

  const handleExplore = useCallback((event) => {
    const input = heroInputRef.current;
    if (!input) return;
    event.preventDefault();
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }, []);

  return (
    <>
      <SkipLink targetId="main" />
      <SiteHeader onExplore={handleExplore} />
      <main id="main" tabIndex={-1}>
        <span id="top" />
        <Hero
          onAnalyze={handleAnalyze}
          inputRef={heroInputRef}
          selectedExample={selection.fullName}
          onSelectExample={selectExample}
        >
          <RepositoryExplorer
            ref={explorerRef}
            selection={selection}
            onRefresh={refreshLive}
            onSelectExample={selectExample}
          />
        </Hero>
        <Capabilities />
        <HowItWorks />
        <FinalCta onAnalyze={handleAnalyze} />
      </main>
      <SiteFooter />
    </>
  );
}
