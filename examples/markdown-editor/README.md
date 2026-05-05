# Markdown Editor example

This example demonstrates a split-view markdown editor: a WYSIWYG editor on the
left synchronized with a live markdown preview on the right.

It uses the Lexical [Extension](https://lexical.dev/docs/concepts/extensions)
system. Because there is no first-party markdown extension, this example
defines its own `MarkdownExtension` (in `src/extensions/MarkdownExtension.ts`)
that registers a curated set of transformers (history, lists, checklists,
headings, bold, italics, inline code) and the corresponding markdown
shortcuts so that typing `# `, `**bold**`, `` `code` ``, `- item`, `- [ ] todo`,
etc. transforms inline.

The editor is initialized from `localStorage`. Persistence is performed at the
markdown layer via `$convertToMarkdownString` / `$convertFromMarkdownString`,
so what is saved is exactly the markdown source. If nothing is persisted, the
editor is seeded with a demo document that exercises every supported feature.

**Run it locally:** `pnpm i && pnpm run dev`

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/facebook/lexical/tree/main/examples/markdown-editor?file=src/main.tsx)
