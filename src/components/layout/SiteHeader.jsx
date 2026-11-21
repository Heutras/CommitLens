import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo.jsx';
import { Button } from '../ui/Button.jsx';
import { ExternalLink } from '../ui/ExternalLink.jsx';
import { ThemeToggle } from '../../features/theme/index.js';
import { navigation, siteConfig } from '../../app/siteConfig.js';
import { Container } from './Container.jsx';
import styles from './SiteHeader.module.css';

function NavLinks({ onNavigate }) {
  return (
    <>
      {navigation.map((item) => (
        <li key={item.href}>
          <a className={styles.link} href={item.href} onClick={onNavigate}>
            {item.label}
          </a>
        </li>
      ))}
      {siteConfig.repositoryUrl && (
        <li>
          <ExternalLink className={styles.link} href={siteConfig.repositoryUrl}>
            GitHub
          </ExternalLink>
        </li>
      )}
    </>
  );
}

/**
 * Sticky site header. Below 48rem the links move into a disclosure menu that
 * closes on Escape, on outside click and after navigation, and returns focus
 * to the menu button.
 */
export function SiteHeader({ onExplore }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={styles.header}>
      <Container className={styles.bar}>
        <a href="#top" className={styles.brand} aria-label="CommitLens, back to top">
          <Logo />
        </a>

        <nav aria-label="Main" className={styles.desktopNav}>
          <ul className={styles.links}>
            <NavLinks />
          </ul>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <Button
            size="sm"
            variant="ink"
            href="#explore"
            onClick={onExplore}
            className={styles.cta}
          >
            Explore
          </Button>
          <button
            ref={buttonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {open && (
          <m.nav
            ref={panelRef}
            id={menuId}
            aria-label="Main"
            className={styles.mobileNav}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Container as="ul" className={styles.mobileLinks}>
              <NavLinks onNavigate={close} />
              <li>
                <a
                  className={styles.link}
                  href="#explore"
                  onClick={(event) => {
                    close();
                    onExplore?.(event);
                  }}
                >
                  Explore a repository
                </a>
              </li>
            </Container>
          </m.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
