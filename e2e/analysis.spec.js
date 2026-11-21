import { expect, test } from '@playwright/test';
import { CORS_HEADERS, fixtures, mockGitHub, rateLimited } from './github-mock.js';

test.describe('repository analysis', () => {
  test('starts on the vitejs/vite snapshot and switches examples without calling GitHub', async ({
    page,
  }) => {
    const calls = await mockGitHub(page);
    await page.goto('/');
    const picker = page.getByRole('group', { name: 'Examples' });
    await expect(picker.getByRole('button')).toHaveCount(5);
    await expect(picker.getByRole('button', { name: /^vitejs\/vite/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Snapshot', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /vitejs\/vite/ })).toBeVisible();

    for (const name of ['vercel/next.js', 'microsoft/vscode', 'golang/go', 'torvalds/linux']) {
      await picker
        .getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')}`) })
        .click();
      await expect(
        page.getByRole('heading', { name: new RegExp(name.replace('.', '\\.')) }),
      ).toBeVisible();
    }
    expect(calls).toHaveLength(0);
  });

  test('refreshes the selected example with live data', async ({ page }) => {
    const calls = await mockGitHub(page, {
      '': {
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ...fixtures.repository,
          full_name: 'golang/go',
          name: 'go',
          owner: { login: 'golang' },
        }),
      },
    });
    await page.goto('/');
    await page
      .getByRole('group', { name: 'Examples' })
      .getByRole('button', { name: /^golang\/go/ })
      .click();
    await page.getByRole('button', { name: 'Refresh live data' }).click();
    await expect(page.getByText('Live', { exact: true })).toBeVisible();
    await expect(page.getByText('4.3K')).toBeVisible();
    await expect(page).toHaveURL(/\?repo=golang%2Fgo$/);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  test('keeps the snapshot when a live refresh is rate limited', async ({ page }) => {
    const calls = await mockGitHub(page, { '': rateLimited });
    await page.goto('/');
    await page.getByRole('button', { name: 'Refresh live data' }).click();
    await expect(
      page.locator('strong', { hasText: 'Live refresh failed: GitHub rate limit reached' }),
    ).toBeVisible();
    await expect(page.getByText('Snapshot', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /vitejs\/vite/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    expect(calls).toHaveLength(1);
  });

  test('analyzes a valid repository from a pasted URL', async ({ page }) => {
    const calls = await mockGitHub(page);
    await page.goto('/');
    await page.getByLabel('GitHub repository').first().fill('https://github.com/acme/rocket');
    await page.getByRole('button', { name: 'Analyze', exact: true }).first().click();

    await expect(page.getByRole('heading', { name: /acme\/rocket/ })).toBeVisible();
    await expect(page.getByText('Live', { exact: true })).toBeVisible();
    await expect(page.getByText('4.3K')).toBeVisible();
    await expect(page.getByText('Apache-2.0')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Languages' }).getByText('90.0%')).toBeVisible();
    await expect(page.getByText('Add ignition checks')).toBeVisible();
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
    await expect(page.getByText('42 of 60 GitHub requests left')).toBeVisible();
    await expect(page).toHaveURL(/\?repo=acme%2Frocket$/);
    expect(calls).toHaveLength(5);

    // A second analysis of the same repository is served from cache.
    await page.getByRole('button', { name: 'Show vitejs/vite snapshot' }).click();
    await page.getByLabel('GitHub repository').first().fill('acme/rocket');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /acme\/rocket/ })).toBeVisible();
    expect(calls).toHaveLength(5);
  });

  test('rejects invalid input without calling GitHub', async ({ page }) => {
    const calls = await mockGitHub(page);
    await page.goto('/');
    const input = page.getByLabel('GitHub repository').first();
    await input.fill('https://gitlab.com/acme/rocket');
    await input.press('Enter');
    await expect(page.getByRole('alert').first()).toHaveText(
      'Only github.com repository links are supported.',
    );
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  test('explains a missing repository and offers the default snapshot', async ({ page }) => {
    await mockGitHub(page);
    await page.goto('/?repo=acme/missing');
    await expect(page.getByRole('heading', { name: 'Repository not found' })).toBeVisible();
    await page.getByRole('button', { name: 'Show vitejs/vite snapshot' }).click();
    await expect(page.getByText('Snapshot', { exact: true })).toBeVisible();
  });

  test('explains the rate limit and does not retry', async ({ page }) => {
    const calls = await mockGitHub(page, { '': rateLimited });
    await page.goto('/?repo=acme/rocket');
    await expect(page.getByRole('heading', { name: 'GitHub rate limit reached' })).toBeVisible();
    await expect(page.getByText(/60 anonymous requests per hour/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    expect(calls).toHaveLength(1);
  });

  test('switches the commit chart to an accessible table', async ({ page }) => {
    await mockGitHub(page);
    await page.goto('/?repo=acme/rocket');
    const panel = page.getByRole('region', { name: 'Weekly commits' });
    await panel.getByRole('button', { name: 'Table' }).click();
    await expect(panel.getByRole('table')).toBeVisible();
    await expect(panel.getByRole('row')).toHaveCount(13);
  });
});
