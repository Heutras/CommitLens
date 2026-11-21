import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render.jsx';
import { mockGitHub, rawRepository, successRoutes } from '../test/fixtures/github.js';
import { App } from './App.jsx';

afterEach(() => vi.unstubAllGlobals());

const exampleButton = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('App', () => {
  it('has one h1 and landmarks', () => {
    vi.stubGlobal('fetch', vi.fn());
    renderWithProviders(<App />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });

  it('starts on the vitejs/vite snapshot and switches examples without requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<App />);

    expect(exampleButton('vitejs/vite')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: /vitejs\/vite/ })).toBeInTheDocument();

    await userEvent.click(exampleButton('golang/go'));
    expect(exampleButton('golang/go')).toHaveAttribute('aria-pressed', 'true');
    expect(exampleButton('vitejs/vite')).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByRole('heading', { name: /golang\/go/ })).toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes the selected example with live data and returns to its snapshot', async () => {
    vi.stubGlobal(
      'fetch',
      mockGitHub({
        ...successRoutes,
        '': {
          body: {
            ...rawRepository,
            full_name: 'golang/go',
            name: 'go',
            owner: { login: 'golang' },
          },
        },
      }),
    );
    renderWithProviders(<App />);
    await userEvent.click(exampleButton('golang/go'));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh live data' }));

    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(window.location.search).toBe('?repo=golang%2Fgo');
    expect(exampleButton('golang/go')).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Show snapshot' }));
    expect(screen.getByText('Snapshot')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('analyzes a custom repository from the hero form and mirrors it in the URL', async () => {
    vi.stubGlobal('fetch', mockGitHub(successRoutes));
    renderWithProviders(<App />);
    const [heroInput] = screen.getAllByLabelText('GitHub repository');
    await userEvent.type(heroInput, 'acme/rocket{Enter}');

    expect(await screen.findByRole('heading', { name: /acme\/rocket/ })).toBeInTheDocument();
    expect(window.location.search).toBe('?repo=acme%2Frocket');
    const picker = screen.getByRole('group', { name: 'Examples' });
    expect(within(picker).queryByRole('button', { pressed: true })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show vitejs/vite snapshot' }));
    expect(screen.getByText('Snapshot')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('loads a shared ?repo= link as live data', async () => {
    window.history.replaceState(null, '', '/?repo=acme/rocket');
    vi.stubGlobal('fetch', mockGitHub(successRoutes));
    renderWithProviders(<App />);
    expect(await screen.findByRole('heading', { name: /acme\/rocket/ })).toBeInTheDocument();
  });
});
