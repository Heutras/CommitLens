/**
 * Build-time prerendering of the landing page.
 *
 * Renders the React app to HTML with the server bundle from `vite build --ssr`
 * and writes it into dist/index.html. Crawlers and first paint get the full
 * landing page (headline, sample analysis, sections) before JavaScript runs.
 * The client then hydrates the same markup.
 *
 * Also preloads the two fonts the first screen needs and, when VITE_SITE_URL
 * is set, writes canonical/Open Graph URLs, robots.txt and sitemap.xml.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');
const siteUrl = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const appHtml = render();

const assets = await readdir(path.join(dist, 'assets'));
const preloadFonts = ['instrument-serif-latin-400-normal', 'geist-latin-wght-normal']
  .map((name) => assets.find((file) => file.startsWith(name) && file.endsWith('.woff2')))
  .filter(Boolean)
  .map(
    (file) =>
      `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin />`,
  );

const seoLinks = [...preloadFonts];
if (siteUrl)
  seoLinks.push(
    `<link rel="canonical" href="${siteUrl}/" />`,
    `<meta property="og:url" content="${siteUrl}/" />`,
  );

let html = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('<!--app-html-->'))
  throw new Error('dist/index.html has no <!--app-html--> marker.');
html = html
  .replace('<!--app-html-->', appHtml)
  .replace('<!--seo-links-->', seoLinks.join('\n    '));
if (siteUrl) html = html.replace('content="/og-image.png"', `content="${siteUrl}/og-image.png"`);
await writeFile(path.join(dist, 'index.html'), html);

if (siteUrl) {
  await writeFile(
    path.join(dist, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
  await writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`,
  );
}

await rm(ssrDir, { recursive: true, force: true });
console.log(
  `Prerendered dist/index.html (${(appHtml.length / 1024).toFixed(1)} KB of markup, ${preloadFonts.length} font preloads${siteUrl ? `, SEO files for ${siteUrl}` : ''}).`,
);
process.exit(0);
