# ProseMirror vs. Lexical Performance Comparison

A re-run of [emergence-engineering/prosemirror-vs-lexical-performance-comparison](https://github.com/emergence-engineering/prosemirror-vs-lexical-performance-comparison)
against the current `main` of this Lexical monorepo (originally compared against
Lexical `^0.12.2`).

> Original repo MIT-licensed by Emergence Engineering. The benchmark
> harness (Next.js app, Playwright test, graph generator) is theirs; the
> wiring to consume locally-built Lexical packages and the produced results
> are this monorepo's.

## What it measures

Playwright drives Chromium against a Next.js dev server that hosts a Lexical
editor at `/lexical` and a ProseMirror editor at `/prosemirror`. For each, it
types `"typing "<Enter>` in a loop up to `MAX_NODES` times, sampling Chrome
DevTools `Performance.getMetrics` (`LayoutCount`, `ScriptDuration`,
`JSHeapUsedSize`) every `MEASUREMENT_INTERVAL` milliseconds. Tunable in
`test/constants.ts`.

## Diff vs. upstream

Upstream targets `@lexical/* ^0.12.2`. To run against this repo's `main`:

- **`package.json`** — `@lexical/*` and `lexical` deps switched to
  `link:../../packages/<pkg>/npm` so we consume the locally-built packages.
  Extra third-party deps that newer Lexical pulls in (`@floating-ui/react`,
  `@preact/signals-core`, `shiki`/`@shikijs/*`, `react-error-boundary`,
  `prismjs`, `@types/trusted-types`) added explicitly. `canvas` bumped to v3
  so the graph generator builds against Node 22. `next` bumped to `14.2.x`
  and `@playwright/test` pinned to `1.56.1` (matches the chromium revision
  preinstalled in the container at `/opt/pw-browsers`).
- **`next.config.js`** — webpack config sets `resolve.symlinks = false` so
  transitive imports between linked packages resolve from this app's
  `node_modules` instead of the package source directory, and aliases
  `react`/`react-dom` to single instances to avoid hook-dispatcher
  duplication. Type-check during `next build` is also disabled because pnpm
  hoists React 19 `@types` via transitive peer deps while the runtime is
  React 18.
- **`components/LexicalEditor.tsx`** — `LexicalErrorBoundary` import changed
  from default to named (breaking change in `@lexical/react`).
- **`pages/lexical.tsx`, `pages/prosemirror.tsx`** — editors now imported
  with `next/dynamic({ ssr: false })`. Lexical's hooks-using composer can't
  prerender server-side under the Next 14 pipeline.
- **`playwright.config.ts`** — `npm run dev` → `pnpm run dev` to match the
  monorepo's package manager.
- **`test/constants.ts`** — `MAX_NODES` is now overridable via
  `BENCH_MAX_NODES` env var for quicker smoke testing without editing the
  file.

## How to run

The harness expects local Lexical packages to be built in their `npm/`
layout (i.e. `pnpm run build-release && node scripts/npm/prepare-release.mjs`
in the monorepo root). Then, inside this directory:

```bash
pnpm install --ignore-workspace
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers pnpm exec playwright test
pnpm exec ts-node --project ./tsconfig.json test/createGraphs.ts
```

Results land in `test/results/*.json`; graphs in `test/results/graphs/*.png`.

## Results

See `RESULTS.md` for the run we did against this branch.
