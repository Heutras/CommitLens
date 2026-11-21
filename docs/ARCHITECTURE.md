# Architecture

CommitLens is a static, client-side React app. The browser calls the public GitHub REST API directly. There is no backend.

## Layers

```
UI components ──► hooks (TanStack Query) ──► API functions ──► githubClient (fetch)
      ▲                                           │
      └──────────── normalized data ◄── normalize.js (pure)
```

| Layer         | Files                                      | Responsibility                                                                         |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Composition   | `src/app/`                                 | Providers, page assembly, query client and retry policy                                |
| HTTP          | `features/repository/api/githubClient.js`  | One `fetch` wrapper: headers, abort signal, rate-limit tracking, error classification  |
| Errors        | `features/repository/api/errors.js`        | `GitHubError` kinds and the user-facing copy for each kind                             |
| Endpoints     | `features/repository/api/repositoryApi.js` | One function per GitHub endpoint. HTTP 202 and 204 handling                            |
| Data          | `features/repository/utils/normalize.js`   | Pure functions from raw GitHub JSON to UI shapes. Unit tested                          |
| Server state  | `features/repository/hooks/`               | Query keys, the analysis hook, URL sync, rate-limit subscription                       |
| Presentation  | `features/repository/components/`          | Panels, charts, lists. Each panel renders loading, error and empty states the same way |
| Landing       | `features/landing/`                        | Hero, capabilities, how it works, final call to action                                 |
| Theme         | `features/theme/`                          | External store over `<html data-theme>`, context, toggle                               |
| Design tokens | `src/styles/tokens.css`                    | Color, type, spacing, radius and motion tokens for both themes                         |

## Request flow

1. `RepoForm` parses the input with `parseRepoInput`. Invalid input never reaches the network.
2. `useRepositorySelection` stores the selection: a repository plus its source, `snapshot` or `live`. Live selections are mirrored in `?repo=owner/name`. Example snapshots never reach the network.
3. `useRepositoryAnalysis` runs `GET /repos/{owner}/{repo}` first.
4. When that succeeds, four section queries start in parallel. They use the **canonical** name from the response, because GitHub redirects renamed repositories with HTTP 301 (`facebook/react` is now `react/react`), and following a redirect for every section would double the cost.
5. Each section succeeds or fails on its own. This gives partial results.

| Section         | Endpoint                    | Stale time | Notes                                                               |
| --------------- | --------------------------- | ---------- | ------------------------------------------------------------------- |
| Repository      | `/repos/{o}/{r}`            | 5 min      | Gate for the others. 404 covers both missing and private            |
| Languages       | `/languages`                | 1 h        | Bytes of code per language                                          |
| Contributors    | `/contributors?per_page=10` | 1 h        | First page only. `Link: rel="next"` sets `hasMore`. 204 means empty |
| Commit activity | `/stats/commit_activity`    | 1 h        | 202 means "computing". Retried 3 times with backoff                 |
| Recent commits  | `/commits?per_page=8`       | 5 min      | 409 means empty repository                                          |

## Example snapshots

- `src/data/exampleRepositories.js` lists the examples and their categories, in display order. The first one is shown on load.
- `src/data/snapshots/<owner>__<repo>.json` holds each snapshot: `{ fullName, capturedAt, sections }`. Every section is either `{ data }` (normalized exactly like live data) or `{ error: { kind, status, message } }` when GitHub refused it at capture time.
- `src/data/snapshots/index.js` loads the files with `import.meta.glob` and fails the build if an example has no snapshot.
- `scripts/capture-snapshots.js` (`npm run snapshots`) captures them from the real API. It refuses to save a snapshot when a request fails because of the rate limit or the network, so those states never end up in bundled data.

| View             | When                                                              | Data on screen                                                       |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `snapshot`       | An example is selected                                            | Bundled snapshot. No requests                                        |
| `refreshing`     | "Refresh live data" clicked, repository request pending           | Snapshot                                                             |
| `refresh-failed` | Repository request of a refresh failed                            | Snapshot, plus an error notice and "Try again" when a retry can help |
| `live`           | Live repository data arrived, or a custom repository was analyzed | Live sections                                                        |

## Error policy

| Kind                | Trigger                                                      | Automatic retry                   | User action                 |
| ------------------- | ------------------------------------------------------------ | --------------------------------- | --------------------------- |
| `rate-limited`      | 429, or 403 with `x-ratelimit-remaining: 0` or `retry-after` | Never                             | Reset time shown            |
| `not-found`         | 404                                                          | Never                             | Show default snapshot       |
| `forbidden`         | 401, 403, 451                                                | Never                             | Show default snapshot       |
| `too-large`         | 403 "too large" (huge histories)                             | Never                             | Explained in the panel      |
| `empty-repository`  | 409                                                          | Never                             | Empty state                 |
| `stats-pending`     | 202                                                          | 3 times, after 2.5 s / 5 s / 10 s | "Try again" after the limit |
| `network`, `server` | `fetch` failure, 5xx                                         | 2 times, after 0.8 s / 1.6 s      | "Try again"                 |

Window focus and reconnect refetching are off. Every request costs anonymous quota (60 per hour per IP address).

## Rendering

- **Prerendering.** `npm run build` runs a client build, then an SSR build of `src/entry-server.jsx`. `scripts/prerender.js` writes the rendered HTML into `dist/index.html`. Crawlers and the first paint get the full page, including the default example snapshot.
- **Hydration safety.** The prerendered HTML is the same for every visitor. Values that differ per visitor are read after hydration:
  - theme: `useSyncExternalStore` with a server snapshot,
  - `?repo=`: read in an effect after mount,
  - lazy chart: mounted after hydration (`useIsClient`).
    Formatting uses the fixed `en-US` locale and UTC, so numbers and dates match between build and browser. Snapshots show absolute dates, because "3 hours ago" goes stale in a saved snapshot.
- **Code splitting.** Recharts (about 119 KB gzipped) loads in its own chunk. Motion's animation features load on demand through `LazyMotion`. The main chunk is about 119 KB gzipped, including the five snapshots, and React DOM is most of it.

## State

| State                                       | Owner                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| GitHub data, loading, errors, cache         | TanStack Query                                                                  |
| Theme                                       | External store and React context, persisted in `localStorage`                   |
| Selected repository and data source         | `useRepositorySelection` (component state, live selections mirrored in the URL) |
| Form input, chart/table toggle, mobile menu | Local component state                                                           |
| Remaining API quota                         | A small external store fed by response headers                                  |
