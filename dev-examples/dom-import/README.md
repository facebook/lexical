# DOMImportExtension example

A reduced rich-text editor focused on demonstrating the new
`DOMImportExtension` import pipeline:

- **Rich text** — paragraphs, headings, quotes (`RichTextExtension` +
  `RichTextImportExtension`).
- **Lists** — bullet / numbered / check-list (`ListExtension` +
  `ListImportExtension`).
- **Tables** (`TableExtension` + `TableImportExtension`).
- **Links** (`LinkImportExtension`).
- **Markdown shortcuts** — type `# `, `* `, `1. `, `> `, ``` ``` ```, etc.
  to convert on the fly.
- **MS Word paste** — a preprocess detects the
  `<meta name="Generator" content="Microsoft Word…">` tag and pushes
  a Word-specific overlay onto `ImportOverlays`. The overlay groups
  flat `<p class="MsoListParagraph*">` runs into proper nested
  `ListNode` trees. Pastes from other sources pay nothing for Word
  handling. See `src/wordPaste.ts`.
- **Import HTML button** — opens a modal with a textarea so you can
  paste raw HTML directly (handy when the clipboard's
  `DataTransfer` doesn't carry a `text/html` slot, e.g. copying
  from a code editor or a GitHub issue).

This example lives in `dev-examples/` (not `examples/`) because it
depends on unreleased Lexical functionality and builds against the
workspace source directly (via `lexicalMonorepoPlugin` in the
default `vite.config.ts`).

**Run it locally** (from the repo root, after the workspace's
`pnpm install`):

```sh
cd dev-examples/dom-import
pnpm run dev
```
