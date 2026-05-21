# DOMImportExtension example

A reduced rich-text editor focused on demonstrating the new
`DOMImportExtension` import pipeline:

- **Rich text** — paragraphs, headings, quotes (`RichTextExtension` +
  `RichTextImportExtension`).
- **Lists** — bullet / numbered / check-list (`ListExtension` +
  `ListImportExtension`).
- **Tables** (`TableExtension` + `TableImportExtension`).
- **Links** (`LinkImportExtension`).
- **Code blocks with Shiki highlighting** (`CodeShikiExtension`
  registers `CodeNode` / `CodeHighlightNode` and wires Shiki up as
  the syntax-highlighting tokenizer; `CodeImportExtension` adds the
  import rules — `<pre>`, multi-line `<code>`, GitHub raw-file-view
  code tables, monospace `<div>`, and the VS Code paste
  consolidation preprocess).
- **Markdown shortcuts** — type `# `, `* `, `1. `, `> `, ``` ``` ```, etc.
  to convert on the fly.
- **MS Word paste** — a preprocess detects the
  `<meta name="Generator" content="Microsoft Word…">` tag and pushes
  a Word-specific overlay onto `ImportOverlays`. The overlay groups
  flat `<p class="MsoListParagraph*">` runs into proper nested
  `ListNode` trees. Pastes from other sources pay nothing for Word
  handling. See [`src/wordPaste.ts`](src/wordPaste.ts) for the rule
  and preprocess; [`src/fixtures/word.html`](src/fixtures/word.html)
  is the bundled clipboard payload the dialog uses to demo it.
- **VS Code paste** — a preprocess shipped by `@lexical/code-core`
  detects either browser's VS Code paste shape (Chrome's outer
  monospace+pre wrapper, Safari's flat sibling run) and pushes a
  small overlay that collapses the run into a single `CodeNode`. The
  bundled
  [`src/fixtures/vscode-safari.html`](src/fixtures/vscode-safari.html)
  is the verbatim Safari clipboard payload — the legacy
  `CodeNode.importDOM` produces one `CodeNode` per `<div>` on that
  shape; the new pipeline produces one.
- **Import HTML button** — opens a modal with a textarea so you can
  paste raw HTML directly (handy when the clipboard's
  `DataTransfer` doesn't carry a `text/html` slot, e.g. copying
  from a code editor or a GitHub issue). Two **Load** buttons in the
  modal populate the textarea with the bundled fixtures so you can
  exercise the Word and VS Code paths without opening the source
  apps.

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
