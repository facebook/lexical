# Mdast Editor (dev example)

A WYSIWYG Markdown editor with a live preview, built on the unreleased
[`@lexical/mdast`](../../packages/lexical-mdast) package — the
micromark/mdast-based alternative to `@lexical/markdown`. It is a port of
[`examples/markdown-editor`](../../examples/markdown-editor), which is the
same app built on the legacy bespoke implementation; comparing the two shows
what the extension-first design removes.

```bash
pnpm run start:dev-example mdast-editor
```

## What got simpler vs. `examples/markdown-editor`

The legacy example's `MarkdownExtension.ts` is ~240 lines; the equivalent
[`MdastEditorExtension.ts`](./src/extensions/MdastEditorExtension.ts) here is
example plumbing only (the preview signal and two toolbar commands), because
`@lexical/mdast` ships extension-ready:

- **No transformer list to curate.** Depending on `MdastShortcutsExtension`
  pulls in the CommonMark + GFM grammar and every node it needs.
- **No `registerMarkdownShortcuts` call.** The extension registers the
  streaming shortcuts itself, driven by the same micromark grammar as
  document import.
- **No checklist workaround.** The legacy example needed a custom
  `text-match` transformer (`CHECK_LIST_ITEM`, ~50 lines) so `[ ] ` typed in
  an existing bullet item would convert; that behavior is built in.
- **No newline-handling configuration.** `shouldPreserveNewlines` /
  `mergeAdjacentNewlines` don't exist; micromark parses CommonMark as-is
  and the original syntax is preserved on the nodes via `NodeState`.

It also does more: blockquotes, links, strikethrough, thematic breaks, and
fenced code blocks round-trip out of the box (the legacy example's default
set covered headings, lists, and inline formatting).

## Bundle size

The flip side of parsing with micromark is bundle weight. Build the
production dist artifacts first, then run the comparison:

```bash
pnpm run build-prod   # at the monorepo root
npm run size          # in this directory
```

It builds functionally-equivalent headless bundles — editor + markdown
node set + typing shortcuts + import/export — one per implementation, from
the production dist artifacts, and prints their sizes. All include the
lexical core, so the deltas are the markdown machinery itself. Snapshot at
the time of writing:

| bundle                         | minified  | min+gzip |
| ------------------------------ | --------- | -------- |
| legacy `@lexical/markdown`     | 287.3 kB  | 77.3 kB  |
| `@lexical/mdast`               | 407.7 kB  | 103.4 kB |
| `@lexical/mdast` (import only) | 392.8 kB  | 99.7 kB  |
| delta (full vs legacy)         | +120.5 kB | +26.1 kB |

Two packaging decisions keep the delta down:

- The dist build keeps the micromark/mdast dependencies **external**, so
  the app bundler resolves them with browser export conditions (named
  character references decode through the DOM instead of shipping a
  ~36 kB entity table) and tree-shakes what's unused.
- Import and export are **separate extensions**; the import-only row
  omits `MdastExportExtension` and with it most of
  `mdast-util-to-markdown`.

That ~26 kB (gzip) buys spec-compliant CommonMark + GFM parsing, a single
grammar shared by import and typing shortcuts, and the micromark/mdast
extension ecosystem (footnotes, frontmatter, directives, ...) as the path
for new syntax.
