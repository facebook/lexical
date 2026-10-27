---
'@lexical/mdast': minor
---

[breaking] `MdastTableExtension` reads and writes GFM tables, and stores column alignment as the cell paragraphs' format instead of the `mdastTableAlign` NodeState
@etrepum
PR: #9478

Import pads or truncates body rows to the header row's cell count, reads `\|` and raw `<br>` in cells, and turns column alignment into the element format of each cell's paragraph. Export writes any table as a GFM table: multi-block cells as lines joined by `<br>`, merged and ragged cells padded, blocks with no inline form after the table, and pipes escaped.

Migration: read and set column alignment through the element format of the paragraphs in the column's cells instead of the `mdastTableAlign` NodeState. Editor states serialized with `mdastTableAlign` lose their column alignment on load; re-import them from Markdown to recover it.

Detect: uses of `mdastTableAlign`, or stored editor state JSON containing `mdastTableAlign`.

Codemod: none.
