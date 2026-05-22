# ProseMirror vs. Lexical Performance Comparison

A re-run of [emergence-engineering/prosemirror-vs-lexical-performance-comparison](https://github.com/emergence-engineering/prosemirror-vs-lexical-performance-comparison)
against the current `main` of this Lexical monorepo (originally compared against
Lexical `^0.12.2`).

> Original repo MIT-licensed by Emergence Engineering. The benchmark
> harness (Next.js app, Playwright test, graph generator) is theirs; the
> wiring to consume locally-built Lexical packages, the editor rewrite
> against the extensions API, the toolbar component, and the produced
> results are this monorepo's.

## What it measures

Playwright drives Chromium against a Next.js **production** server (`next
start`) that hosts a Lexical editor at `/lexical` and a ProseMirror editor
at `/prosemirror`. For each, it types `"typing "<Enter>` in a loop up to
`MAX_NODES` times, sampling Chrome DevTools `Performance.getMetrics`
(`LayoutCount`, `ScriptDuration`, `JSHeapUsedSize`) every
`MEASUREMENT_INTERVAL` milliseconds. Tunable in `test/constants.ts`.

Both editors are configured to match each other where the original harness
diverged:

- **History** — Lexical's `HistoryExtension` is configured with
  `{maxDepth: 100, delay: 500}` to match `prosemirror-history`'s defaults
  of `depth: 100, newGroupDelay: 500ms`. `maxDepth` is a config option on
  this branch (default `null` = unbounded; long-lived editors should opt
  in — see `docs/concepts/history.md`'s "Tuning HistoryExtension"
  section).
- **Toolbar** — `prosemirror-example-setup` auto-installs
  `prosemirror-menu`'s `menuBar`. The Lexical editor renders a matching
  toolbar via a benchmark-local `ToolbarStateExtension` (signals for
  `blockType` / `isBold` / `isItalic` / `isCode` / `isLink` / `canUndo` /
  `canRedo`, all `computed()` lazily off `EditorStateExtension` and
  `HistoryExtension` outputs) and a `<Toolbar>` React component that
  reads via `useExtensionSignalValue`.

## Diff vs. upstream

Upstream targets `@lexical/* ^0.12.2`, React 18 / Next 14, and runs the
benchmark against `next dev`. To run against this repo's `main` with the
current framework versions in production mode:

- **`package.json`** — `@lexical/*` and `lexical` deps switched to
  `link:../../packages/<pkg>/npm` so we consume the locally-built
  packages. Extra third-party deps that newer Lexical pulls in
  (`@floating-ui/react`, `@preact/signals-core`, `shiki`/`@shikijs/*`,
  `react-error-boundary`, `prismjs`, `@types/trusted-types`) added
  explicitly. `next` bumped to `15.x`, `react` / `react-dom` /
  `@types/react` / `@types/react-dom` bumped to v19, `prosemirror-*`
  pinned to current latest patch. `canvas` bumped to v3 so the graph
  generator builds against Node 22. `@playwright/test` pinned to
  `1.56.1` (matches the chromium revision preinstalled in the container
  at `/opt/pw-browsers`).
- **`next.config.js`** — webpack config sets `resolve.symlinks = false`
  so transitive imports between linked packages resolve from this app's
  `node_modules` instead of the package source directory, and aliases
  `react`/`react-dom` to single instances to avoid hook-dispatcher
  duplication. Type-check during `next build` is also disabled because
  pnpm hoists `@types/react` 19 transitively even where it isn't needed.
- **`components/LexicalEditor.tsx`** — rewritten to use the **extensions
  API** (`LexicalExtensionComposer` + `RichTextExtension` /
  `HistoryExtension` / `ListExtension` / `LinkExtension` /
  `CodeExtension` / `HorizontalRuleExtension` / `ToolbarStateExtension`)
  instead of the legacy `LexicalComposer` + plugin components.
- **`components/Toolbar.tsx`** + **`components/extensions/ToolbarStateExtension.ts`**
  — new. Replaces the upstream `ToolbarPlugin.tsx` / `ToolbarItems.tsx`
  with a signals-driven extension graph that only re-renders when its
  inputs change.
- **`pages/lexical.tsx`, `pages/prosemirror.tsx`** — editors now imported
  with `next/dynamic({ ssr: false })`. Lexical's hooks-using composer
  can't prerender server-side under the Next 14/15 pipeline.
- **`playwright.config.ts`** — `webServer.command` is `pnpm run start`
  (`next start`) by default; pre-build with `next build` before invoking
  playwright. Set `BENCH_DEV=1` to fall back to `pnpm run dev` for quick
  iteration.
- **`test/constants.ts`** — `MAX_NODES` is now overridable via
  `BENCH_MAX_NODES` env var for quicker smoke testing without editing
  the file.
- **`test/heapProbe.spec.ts`** — new. Standalone Playwright spec that
  drives the live Lexical page to a smaller `PROBE_NODES` window
  (default 2000) and writes a Chrome DevTools-readable
  `.heapsnapshot` plus checkpoint samples for offline inspection.

## How to run

The harness expects local Lexical packages to be built in their `npm/`
layout (i.e. `pnpm run build-release && node scripts/npm/prepare-release.mjs`
in the monorepo root). Then, inside this directory:

```bash
pnpm install --ignore-workspace

# Production build of the benchmark app. Re-run after any change to
# linked @lexical/* packages — Next does not detect link: changes.
rm -rf .next
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers pnpm exec next build

# Run the stress test (1hr per editor by default; both phases run
# back-to-back). webServer is `next start` against the build above.
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers pnpm exec playwright test test/stressTest.spec.ts

# Render the PNGs from the raw JSON in test/results/.
pnpm exec ts-node-dev --project ./tsconfig.json --no-deps test/createGraphs.ts
```

Results land in `test/results/*.json`; graphs in `test/results/graphs/*.png`.

For a quicker iteration, the standalone heap probe is much faster:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PROBE_NODES=2000 \
  pnpm exec playwright test test/heapProbe.spec.ts
```

It writes `test/results/heap-end.heapsnapshot` (Chrome
DevTools-readable; gitignored) plus
`test/results/heap-end-checkpoints.json`.

## Results

See [`RESULTS.md`](./RESULTS.md) for the run we did against this branch.
The raw JSON and PNG graphs live in `test/results-prod-capped-toolbar/`.
