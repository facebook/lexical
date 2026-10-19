---
sidebar_position: 4
---

# Comments and Annotations

Comment threads, review suggestions and similar annotations mark ranges of
text with an id. `@lexical/mark` offers two ways to store those marks:

- [`MarkNode`](/docs/api/modules/lexical_mark#marknode), an inline
  `ElementNode` that wraps the marked text. This is the established API.
- [`MarkStateExtension`](/docs/api/modules/lexical_mark#markstateextension)
  (experimental), which stores the ids as a set-valued
  [NodeState](/docs/concepts/node-state) (`markIds`) on the TextNodes,
  LineBreakNodes and inline DecoratorNodes it covers, with no wrapper
  element.

## When to use `MarkStateExtension`

Prefer it when marks overlap or when the document is edited collaboratively
with the Yjs v2 binding (`CollaborationPluginV2__EXPERIMENTAL`).

- **Overlap.** Text covered by two comments is a single TextNode carrying
  both ids. With `MarkNode`, overlapping comments become sibling wrappers
  whose `ids` the app has to keep consistent (the playground uses
  `registerNestedElementResolver`).
- **Concurrent edits.** Adding or removing an id only changes NodeState on
  the existing leaves, so a collaborator typing inside a comment, two
  collaborators commenting on the same text, or one resolving a comment
  while another types in it do not move or duplicate text. With `MarkNode`
  the same edits are structural changes that the bindings sync as a delete
  and a re-insert, which can move or duplicate text.
- **Concurrent changes to the same ids.** The ids of a leaf are one
  [set-valued](/docs/concepts/node-state#set-valued-state) NodeState. The
  `@lexical/yjs` bindings store it as one value, so when two collaborators
  change the ids of the same text at once (for example both comment on it),
  the last writer wins for that text and the other id is dropped there.
  Peers still converge on the same document.

Keep using `MarkNode` when you need one element around the marked content
(for example to render it as a single DOM element), or when you depend on
code that looks for `MarkNode`.

:::caution v1 collaboration

The v1 binding (`CollaborationPlugin`) syncs a TextNode split or merge as a
delete and a re-insert of the text. Adding the first id to part of a run, or
removing the last id of a run, splits or merges TextNodes, so on v1 those
edits race like `MarkNode`: typed text can move and concurrent comments can
duplicate text.

:::

## Usage

```ts
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $addMarkID,
  $getMarkIDsAtSelection,
  $removeMarkID,
  MarkStateExtension,
} from '@lexical/mark';
import {$getSelection, defineExtension} from 'lexical';

const editor = buildEditorFromExtensions(
  defineExtension({
    dependencies: [MarkStateExtension],
    name: 'my-editor',
    theme: {mark: 'comment', markOverlap: 'comment-overlap'},
  }),
);

const threadId = 'c1';
editor.update(() => {
  const selection = $getSelection();
  if (selection) {
    $addMarkID(threadId, selection);
  }
});
// Remove the id everywhere (or pass a selection to remove it from a range)
editor.update(() => $removeMarkID(threadId));
// The ids at the caret, for example to open the matching thread
editor.read(() => $getMarkIDsAtSelection());
```

- Ids are non-empty strings without whitespace; `$addMarkID` throws on
  anything else. Short ids keep collaborative documents smaller, since each
  id is stored on every text run it covers.
- Marked leaves get the `mark` theme class (`markOverlap` when they carry
  more than one id) and a `data-lexical-mark-ids` attribute.
- The `markIDNodeKeys` output signal maps each id to the keys of the leaves
  that carry it, for example to scroll to a comment with
  `editor.getElementByKey(key)`.
- In JSON, a leaf covered by `c1` and `c2` has `"$": {"markIds": ["c1", "c2"]}`.
  Every peer of a collaborative document should use the extension: it
  registers the state on every node type, so ids read from JSON or from a
  peer are parsed right away.
- `markableNodes` sets which nodes carry ids: node classes and guard
  functions. The default, `DEFAULT_MARKABLE_NODES`, is TextNode,
  LineBreakNode and every inline DecoratorNode; extend it with
  `[...DEFAULT_MARKABLE_NODES, MyNode]`.
- Marking a range also marks the content of the
  [slots](/docs/concepts/named-slots) of the nodes in it.
- Text typed at the edge of a marked run does not join it, as with
  `MarkNode`; text typed inside a run does.
- HTML export leaves the ids out by default, so that they do not leak into
  other applications through the clipboard. Set `exportIDsToHTML: true` to
  write `data-lexical-mark-ids`; HTML imported through the
  [DOM import pipeline](/docs/serialization/dom-import) reads it back.
- `$migrateMarkNodesToMarkState()` converts a `MarkNode` document. Run it
  once per document with a single writer (for example in a headless editor
  before the document is shared).

### Limitations

- The ids are copied with the text: pasting copied commented text elsewhere
  puts the same id in a second place, as with `MarkNode`.
- A leaf that is replaced by a new node loses its ids. Code that re-creates
  TextNodes instead of editing them drops the marks on them: syntax
  highlighting in a code block, node replacement, text entities and similar
  transforms.
- A collaborator's concurrent structural change to the same text, such as
  wrapping it in a link or merging its paragraph into the previous one, can
  drop the marks on it or extend them over neighboring text. Typing exactly
  at the edge of a mark while a peer edits follows the order Yjs gives the
  two edits. Peers always converge on the same document.
