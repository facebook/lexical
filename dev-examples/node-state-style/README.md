# Node State Style example — DOMImportExtension variant

A copy of [`examples/node-state-style`](../../examples/node-state-style)
that uses the new `DOMImportExtension` (plus
[`@lexical/html`](../../packages/lexical-html)'s `CoreImportExtension`)
instead of the legacy `html: {import: ...}` field on the extension
config.

The structural difference is in `src/styleState.ts`: the legacy
`constructStyleImportMap()` workaround — which wrapped every TextNode
importer in turn so it could also capture inline `style` properties — is
replaced by a single wildcard
`defineImportRule({match: sel.any().attr('style', /\S/), ...})`
registered via `DOMImportExtension`. The rule calls `$next()` to get the
children produced by the underlying tag's importer, then walks them and
applies the captured style object to any `TextNode`s.

Everything else (the `DOMRenderExtension` overrides for export, the
state-management helpers, the React app shell) is identical.

This example lives in `dev-examples/` (not `examples/`) because it
depends on unreleased Lexical functionality. Unlike `examples/`, a
`dev-examples/` package builds against the Lexical workspace source
directly (via `lexicalMonorepoPlugin` in the default `vite.config.ts`
and the root `tsconfig.json`'s path mappings inherited via `extends`).
No publish step is involved.

**Run it locally** (from the repo root, after the workspace's
`pnpm install`):

```sh
pnpm run start:dev-example node-state-style
```

(or `pnpm -F @lexical/dev-node-state-style-example dev` directly.)
