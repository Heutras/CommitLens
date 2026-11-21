import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource/instrument-serif/latin-400.css';
import './styles/global.css';
import { App } from './app/App.jsx';
import { AppProviders } from './app/AppProviders.jsx';

const container = document.getElementById('root');
const app = (
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);

// Production HTML is prerendered at build time; hydrate it. The dev server
// serves an empty root, so render from scratch there.
if (container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
