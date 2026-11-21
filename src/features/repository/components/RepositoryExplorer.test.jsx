import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render.jsx';
import { mockGitHub, rawRepository, successRoutes } from '../../../test/fixtures/github.js';
import { findExample } from '../../../data/snapshots/index.js';
import { RepositoryExplorer } from './RepositoryExplorer.jsx';

const live = (fullName) => {
  const [owner, repo] = fullName.split('/');
  return { owner, repo, fullName, source: 'live' };
};
const snapshot = (fullName) => ({ ...live(fullName), source: 'snapshot' });
const panel = (name) => screen.getByRole('region', { name });
const status = () => screen.getByRole('status');

/** Live GitHub answers for vitejs/vite, distinguishable from the snapshot by star count. */
const viteLiveRoutes = {
  ...successRoutes,
  '': {
    body: { ...rawRepository, full_name: 'vitejs/vite', name: 'vite', owner: { login: 'vitejs' } },
  },
};

function renderExplorer(selection, props = {}) {
  return renderWithProviders(
    <RepositoryExplorer
      selection={selection}
      onRefresh={vi.fn()}
      onSelectExample={vi.fn()}
      {...props}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('RepositoryExplorer with snapshots', () => {
  it.each(['vitejs/vite', 'vercel/next.js', 'microsoft/vscode', 'golang/go', 'torvalds/linux'])(
    'shows the %s snapshot with its date and makes no requests',
    (fullName) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      renderExplorer(snapshot(fullName));

      expect(screen.getByText('Snapshot')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: new RegExp(fullName.replace('.', '\\.')) }),
      ).toBeInTheDocument();
      expect(status()).toHaveTextContent(`Showing the ${fullName} snapshot from`);
      expect(screen.getByRole('button', { name: 'Refresh live data' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('shows a section GitHub refused at capture time as unavailable, without retry', () => {
    vi.stubGlobal('fetch', vi.fn());
    renderExplorer(snapshot('torvalds/linux'));
    expect(findExample('torvalds/linux').sections.contributors.error.kind).toBe('too-large');
    const contributors = panel('Top contributors');
    expect(within(contributors).getByText('Too large for the API')).toBeInTheDocument();
    expect(within(contributors).queryByRole('button')).not.toBeInTheDocument();
    expect(within(panel('Languages')).getByText('C')).toBeInTheDocument();
  });

  it('keeps the snapshot visible while live data loads, then swaps to live data', async () => {
    vi.stubGlobal('fetch', mockGitHub(viteLiveRoutes));
    renderExplorer(live('vitejs/vite'));

    expect(screen.getByText('Snapshot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing live data' })).toBeDisabled();
    expect(status()).toHaveTextContent('Refreshing live data for vitejs/vite.');

    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(screen.getByText('12.3K')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show snapshot' })).toBeInTheDocument();
    await waitFor(() => expect(status()).toHaveTextContent('Loaded vitejs/vite.'));
  });

  it('preserves the snapshot and explains a rate-limited refresh', async () => {
    const fetchMock = mockGitHub({
      '': {
        status: 403,
        body: { message: 'API rate limit exceeded' },
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    renderExplorer(live('vitejs/vite'));

    expect(
      await screen.findByText(/Live refresh failed: GitHub rate limit reached/, {
        selector: 'strong',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Snapshot')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /vitejs\/vite/ })).toBeInTheDocument();
    expect(within(panel('Languages')).getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('Live refresh failed: GitHub rate limit reached.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('offers a retry after a transient refresh failure', async () => {
    const fetchMock = mockGitHub({ '': { status: 502, body: { message: 'Bad gateway' } } });
    vi.stubGlobal('fetch', fetchMock);
    renderExplorer(live('vitejs/vite'));

    expect(
      await screen.findByText(/Live refresh failed: GitHub is unavailable/, { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3); // first request + 2 bounded retries
    vi.stubGlobal('fetch', mockGitHub(viteLiveRoutes));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Live')).toBeInTheDocument();
  });
});

describe('RepositoryExplorer with custom repositories', () => {
  const target = live('acme/rocket');

  it('announces loading, then renders every section from live data', async () => {
    vi.stubGlobal('fetch', mockGitHub(successRoutes));
    renderExplorer(target);

    expect(status()).toHaveTextContent('Loading acme/rocket.');
    expect(await screen.findByRole('heading', { name: /acme\/rocket/ })).toBeInTheDocument();
    await waitFor(() => expect(status()).toHaveTextContent('Loaded acme/rocket.'));
    expect(screen.getByText('Open issues and PRs')).toBeInTheDocument();
    expect(within(panel('Languages')).getByText('JavaScript')).toBeInTheDocument();
    expect(within(panel('Languages')).getByText('70.0%')).toBeInTheDocument();
    expect(within(panel('Top contributors')).getByText('dependabot[bot]')).toBeInTheDocument();
    expect(within(panel('Top contributors')).getByText('bot')).toBeInTheDocument();
    expect(within(panel('Recent commits')).getByText('Fix launch sequence')).toBeInTheDocument();
    expect(
      await within(panel('Weekly commits')).findByText(/in the last 12 weeks/),
    ).toBeInTheDocument();
  });

  it('makes one request for a missing repository and offers the default snapshot', async () => {
    const fetchMock = mockGitHub({});
    vi.stubGlobal('fetch', fetchMock);
    const onSelectExample = vi.fn();
    renderExplorer(target, { onSelectExample });

    expect(
      await screen.findByRole('heading', { name: 'Repository not found' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Show vitejs/vite snapshot' }));
    expect(onSelectExample).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'vitejs/vite' }),
    );
  });

  it('explains rate limits and does not retry them', async () => {
    const fetchMock = mockGitHub({
      '': {
        status: 403,
        body: { message: 'API rate limit exceeded' },
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    renderExplorer(target);

    expect(
      await screen.findByRole('heading', { name: 'GitHub rate limit reached' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps working sections when one section fails (partial success)', async () => {
    vi.stubGlobal(
      'fetch',
      mockGitHub({
        ...successRoutes,
        '/stats/commit_activity': { status: 500, body: { message: 'boom' } },
      }),
    );
    renderExplorer(target);

    expect(
      await within(panel('Weekly commits')).findByText('GitHub is unavailable'),
    ).toBeInTheDocument();
    expect(
      within(panel('Weekly commits')).getByRole('button', { name: /Try again/ }),
    ).toBeInTheDocument();
    expect(within(panel('Languages')).getByText('JavaScript')).toBeInTheDocument();
    await waitFor(() => expect(status()).toHaveTextContent('Unavailable: commit activity.'));
  });

  it('retries pending statistics (HTTP 202) a bounded number of times', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      mockGitHub({
        ...successRoutes,
        '/stats/commit_activity': () => {
          calls += 1;
          return { status: 202 };
        },
      }),
    );
    renderExplorer(target);

    expect(
      await within(panel('Weekly commits')).findByText('Statistics are still being prepared'),
    ).toBeInTheDocument();
    expect(calls).toBe(4); // first request + 3 retries
  });

  it('loads sections from the canonical name of a renamed repository', async () => {
    const fetchMock = mockGitHub(successRoutes);
    vi.stubGlobal('fetch', fetchMock);
    renderExplorer(live('old-acme/old-rocket'));
    await waitFor(() => expect(status()).toHaveTextContent(/Loaded/));
    const paths = fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);
    expect(paths[0]).toBe('/repos/old-acme/old-rocket');
    expect(paths.slice(1).every((path) => path.startsWith('/repos/acme/rocket/'))).toBe(true);
  });

  it('shows an empty state for a repository without detected languages', async () => {
    vi.stubGlobal('fetch', mockGitHub({ ...successRoutes, '/languages': { body: {} } }));
    renderExplorer(target);
    expect(
      await within(panel('Languages')).findByText(/detected no programming languages/),
    ).toBeInTheDocument();
  });
});
