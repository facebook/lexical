# DOMImportExtension example

A reduced rich-text editor focused on demonstrating the new
`DOMImportExtension` import pipeline. Each node-providing extension
registers its own import rules, so listing the runtime extensions is
all the configuration the pipeline needs —
`ClipboardDOMImportExtension` is the only import-specific dependency:

- **Rich text** — paragraphs, headings, quotes (`RichTextExtension`,
  which also registers the `<h1>`–`<h6>` / `<blockquote>` import
  rules and the shared `CoreImportExtension` baseline).
- **Lists** — bullet / numbered / check-list (`ListExtension`).
- **Tables** (`TableExtension`).
- **Links** (`LinkExtension`).
- **Horizontal rules** (`HorizontalRuleExtension` — the `<hr>` rule
  ships with `CoreImportExtension`, gated on the node being
  registered).
- **Code blocks with Shiki highlighting** (`CodeShikiExtension`
  registers `CodeNode` / `CodeHighlightNode` and wires Shiki up as
  the syntax-highlighting tokenizer; the underlying `CodeExtension`
  brings the import rules — `<pre>`, multi-line `<code>`, GitHub
  raw-file-view code tables, monospace `<div>`, and the VS Code
  paste consolidation preprocess).
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
pnpm run start:dev-example dom-import
```

(or `pnpm -F @lexical/dev-dom-import-example dev` directly.)
