---
sidebar_position: 99
---

# Developing against a local Lexical checkout

If you're iterating on Lexical itself and want a downstream app to pick
up your changes without publishing, the Lexical packages support two
linking workflows.

Both rely on the fact that each `packages/<name>/` directory is its own
publishable npm package: after a build, `packages/lexical/package.json`
plus the `dist/` it sits next to is a complete tarball. There is no
intermediate `npm/` directory and no copy step — `pnpm pack` /
`pnpm publish` run straight from the package root.

## Option A: built artifacts (works for any consumer)

Build the artifacts, then point your downstream project at the package
directory:

```bash
# in the Lexical checkout
pnpm install
pnpm run build-release   # produces dist/<Name>.{dev,prod,node}.{js,mjs} + .d.ts + .js.flow

# in your downstream app
pnpm add link:/path/to/lexical/packages/lexical
pnpm add link:/path/to/lexical/packages/lexical-react   # etc.
```

`pnpm` follows the `link:` protocol by creating a real symlink into your
`node_modules/`, so subsequent rebuilds of Lexical (e.g.
`pnpm run build` in the Lexical checkout) become visible immediately.
Standard `exports` resolution picks up the `development` /
`production` / `node` conditions, so dev builds load the unminified
variants and prod builds load the minified ones automatically.

If you prefer the dev-only loop (faster builds, no minification), use
`pnpm run build` instead of `build-release`. The fork modules emitted
by a dev-only build re-export the `.dev` variant unconditionally; you
won't be able to `pnpm publish` from such a checkout because the
publish guard will report missing `.prod` files.

`file:/path/to/...` works too if your package manager treats it as a
symlink (modern pnpm does); npm copies the directory into
`node_modules` instead, which loses any live-reload benefit but is
otherwise equivalent for one-shot installs.

## Option B: TypeScript source (no Lexical build needed)

For the tightest dev loop — edit a Lexical source file and have your
downstream bundler pick it up on the next request — opt into the
`source` export condition. Each public package's `exports` map exposes
its `./src/<entry>.tsx?` next to the compiled `import`/`require`
conditions, so a bundler configured with
`resolve.conditions: ['source', …]` will load TypeScript directly out
of the linked package.

The only requirement is **bundler support**: your consumer's bundler has to
be configured to pick up the `source` condition AND to transform
`.ts`/`.tsx` from inside `node_modules`. Vite, Rspack, and Parcel can all be
told to do this; webpack needs a loader override for the linked package.

There is **no aliasing and no extra `define` to set up**. Internal utilities
the source depends on are a real (internal) dependency, `@lexical/internal`,
which resolves through normal package resolution; the React/test helpers are
package-internal; and the dev/prod branch is `process.env.NODE_ENV !==
'production'`, which every mainstream bundler substitutes by default. So
`source` mode works without any `resolve.alias` entries or build-time globals
— including for the transitive `@lexical/*` packages.

### Minimal Vite setup

```ts
// vite.config.ts
import {defineConfig} from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['source', 'development', 'module', 'browser', 'default'],
  },
});
```

The integration fixture at
`scripts/__tests__/integration/fixtures/lexical-link-source-mode/`
exercises exactly this setup and is the canonical reference if you need
a fuller example.

> [!NOTE]
> `@lexical/internal` is published only so this resolution works (and for
> direct internal consumers); the compiled `dist/` artifacts inline it, so
> a normal `npm install` of `lexical` never executes a separate copy.
