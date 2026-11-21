import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './app/App.jsx';
import { AppProviders } from './app/AppProviders.jsx';

/** Render the landing page to HTML at build time (see scripts/prerender.js). */
export function render() {
  return renderToString(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}
