import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockGitHub, rateLimited } from './github-mock.js';

test.describe('theme', () => {
  test('follows the system theme, then persists an explicit choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens, navigates, and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'How it works' })
      .click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeInViewport();

    await menuButton.click();
    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toBeFocused();
  });

  test('has no horizontal scrolling, including the example picker', async ({ page }) => {
    await page.goto('/');
    const picker = page.getByRole('group', { name: 'Examples' });
    await expect(picker.getByRole('button')).toHaveCount(5);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(overflow).toBeLessThanOrEqual(width);
      const pickerRight = await picker.evaluate((node) => node.getBoundingClientRect().right);
      expect(pickerRight).toBeLessThanOrEqual(width);
    }
    await picker.getByRole('button', { name: /^torvalds\/linux/ }).click();
    await expect(page.getByRole('heading', { name: /torvalds\/linux/ })).toBeVisible();
  });
});

test.describe('keyboard', () => {
  test('skip link, form submission and focus move to the results', async ({ page }) => {
    await mockGitHub(page);
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();

    // From the main landmark, the first form control is the repository input.
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('GitHub repository').first()).toBeFocused();
    await page.keyboard.type('acme/rocket');
    await page.keyboard.press('Enter');

    await expect(page.locator('#explore')).toBeFocused();
    await expect(
      page.getByRole('status').filter({ hasText: 'Loaded acme/rocket.' }),
    ).toBeAttached();
  });

  test('header Explore action focuses the repository input', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Explore', exact: true }).click();
    await expect(page.getByLabel('GitHub repository').first()).toBeFocused();
  });
});

test.describe('accessibility', () => {
  const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  const violations = async (page) =>
    (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );

  for (const colorScheme of ['light', 'dark']) {
    test(`has no axe violations on live data in the ${colorScheme} theme`, async ({ page }) => {
      await mockGitHub(page);
      await page.emulateMedia({ colorScheme });
      await page.goto('/?repo=acme/rocket');
      await expect(page.getByRole('heading', { name: /acme\/rocket/ })).toBeVisible();
      await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test(`has no axe violations on a snapshot with a failed refresh in the ${colorScheme} theme`, async ({
      page,
    }) => {
      await mockGitHub(page, { '': rateLimited });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      await page
        .getByRole('group', { name: 'Examples' })
        .getByRole('button', { name: /^golang\/go/ })
        .click();
      await page.getByRole('button', { name: 'Refresh live data' }).click();
      await expect(page.locator('strong', { hasText: 'Live refresh failed' })).toBeVisible();
      await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }
});
