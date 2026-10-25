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

The ids live on the leaves, so they travel with the text. Typing inside a
marked run adds to the TextNode that carries the ids. Marking part of a run
splits the TextNode, and each part keeps its own ids; neighbors with the same
ids merge back. Copying or cutting text carries its ids, and deleting it
deletes them. There is no element to move or repair. The one exception: text
inserted exactly at the edge of a run stays outside it, as with `MarkNode`
(see [Inserted text](#inserted-text)).

## When to use `MarkStateExtension`

Prefer it when marks overlap or when the document is edited collaboratively
with the Yjs v2 binding (`CollaborationPluginV2__EXPERIMENTAL`) or the
[Yjs 14 binding](./y.md) (`@lexical/y`).

- **Overlap.** Text covered by two comments is a single TextNode carrying
  both ids. With `MarkNode`, overlapping comments become sibling wrappers
  whose `ids` the app has to keep consistent (the playground uses
  `registerNestedElementResolver`).
- **Concurrent edits.** Adding or removing an id only changes NodeState on
  the existing leaves, so a collaborator typing inside a comment, two
  collaborators commenting on the same text, or one resolving a comment
  while another types in it do not move or duplicate text on v2. With
  `MarkNode` the same edits are structural changes that the bindings sync as
  a delete and a re-insert, which can move or duplicate text.

Keep using `MarkNode` when you need one element around the marked content
(for example to render it as a single DOM element), or when you depend on
code that looks for `MarkNode`.

### Moving from `MarkNode`

| `MarkNode`                                            | `MarkStateExtension`                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `$wrapSelectionInMarkNode(selection, isBackward, id)` | `$addMarkID(id, selection)`                                |
| `markNode.deleteID(id)`, `$unwrapMarkNode(markNode)`  | `$removeMarkID(id, selection?)`                            |
| `$getMarkIDs(node, offset)`, `markNode.getIDs()`      | `$getMarkIDsAtSelection(selection)`, `$getNodeMarkIDs(leaf)` |
| a mutation listener on `MarkNode`                     | the `markIDNodeKeys` output                                |

`$migrateMarkNodesToMarkState()` converts an existing `MarkNode` document.
Run it once per document with a single writer (for example in a headless
editor before the document is shared): the unwrap is a structural change.

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
  anything else, and an invalid id read from JSON, HTML or a collaborator is
  dropped. Short ids keep collaborative documents smaller, since each id is
  stored on every text run it covers.
- Marked leaves get the `mark` theme class (`markOverlap` when they carry
  more than one id) and a `data-lexical-mark-ids` attribute.
- The `markIDNodeKeys` output signal maps each id to the keys of the leaves
  that carry it, for example to scroll to a comment with
  `editor.getElementByKey(key)`.
- `$getNodeMarkIDs` and `$getMarkIDsAtSelection` return new sorted arrays,
  which you may change; changing them does not change the document.
- In JSON, a leaf covered by `c1` and `c2` has `"$": {"markIds": ["c1", "c2"]}`.
  Every peer of a collaborative document should use the extension: it
  registers the state on every node type, so ids read from JSON or from a
  peer are parsed right away.
- `markableNodes` sets which nodes carry ids: node classes and guard
  functions. The default, `DEFAULT_MARKABLE_NODES`, is TextNode,
  LineBreakNode and every inline DecoratorNode; extend it with
  `[...DEFAULT_MARKABLE_NODES, MyNode]`. All peers should use the same set.
- Marking a range also marks the content of the
  [slots](/docs/concepts/named-slots) of the nodes in it.
- HTML export leaves the ids out by default, so that they do not leak into
  other applications through the clipboard. Set `exportIDsToHTML: true` to
  write `data-lexical-mark-ids`; HTML imported through the
  [DOM import pipeline](/docs/serialization/dom-import) reads it back.

### Inserted text

Text inserted by a local edit (typing, an input method, a paste, a drop,
or code that inserts text and leaves the caret after it) gets:

- the ids shared by the text right before and right after the place it was
  inserted, within its paragraph. Text inserted inside a marked run joins
  it; text inserted at its edge does not, as with `MarkNode`. Text inserted
  between two runs that share an id joins that id.
- when it replaces a selection, also the ids that all of the replaced text
  had, so retyping a commented word keeps the comment (`MarkNode` loses the
  comment when all of its text is replaced). When the editor knows the
  replaced selection (see the limitations), this holds whatever letters the
  new text shares with the replaced text: selecting `teh` and typing `t`, or
  an autocorrection to `the`, gives the new text those ids, and pasting `bX`
  over `bc` in `abcde`, where only `cde` is marked, leaves `bX` unmarked.
- its own ids: pasted or dropped content, and nodes that code inserts, keep
  the ids they came with, wherever they land, and also join the run they
  land inside, the way typed text does. Text inserted into existing text
  has no ids of its own, also when a transform then splits it off into a
  new TextNode: the piece starts out with the very ids of the node it was
  split from (the same array, not a copy), which is how it is told apart
  from inserted content, whose ids are its own array even when they are
  the same ids. So text typed or pasted as plain text after a commented
  hashtag or mention is not commented, as with `MarkNode`, while pasted
  commented text keeps its comment there.

Text that the edit does not delete keeps exactly its ids, also when the
editor or a transform moves it into a new TextNode: a hashtag or a mention
created from commented text, a segmented node that typing turns into plain
text. An id removed with `$removeMarkID` in the same update is not given
back, neither to that text nor to inserted text (see the limitations for
how far that reaches).

A TextNode whose text gets different ids is split when its pieces stay of
its own class: `TextNode`, or the class that replaces it through a node
replacement. Other TextNodes are not split and get every id their text had:
token and segmented nodes, and subclasses whose boundaries their own
transforms set, such as a hashtag or a code highlighting token. In such a
node, text typed at the edge of a mark joins it, and unmarked text that the
node takes in (a code token that grows over the next word) gets its ids.

This does not depend on which TextNode the editor puts the text in. Updates
replayed from history (undo and redo) or tagged `COLLABORATION_TAG` are left
as they are. With `disabled: true`, inserted text keeps whatever ids the
TextNode it lands in has.

### Limitations

- The ids are copied with the text: pasting copied commented text elsewhere
  puts the same id in a second place, as with `MarkNode`.
- Only the change around the caret is adjusted: the changed text of the
  caret's paragraph that unchanged text does not separate from the caret.
  Text that code inserts elsewhere keeps the ids of the TextNode it lands
  in, and text that code moves into a new TextNode elsewhere loses its ids.
  An insertion is also only adjusted when the caret is right after it.
- The selection that an insertion replaces is known when the insertion is
  dispatched as `CONTROLLED_TEXT_INSERTION_COMMAND` or `PASTE_COMMAND`
  (which typing, autocorrection and pasting use), inside an update or not,
  or starts an input method composition. Code that replaces a selection
  with `selection.insertText()` directly is treated as the smallest edit:
  the letters the new text shares with the old one keep their ids, and only
  the other letters are inserted. So such a replacement across the edge of
  a mark, starting or ending with the letter it replaces, can join the
  mark.
- Updates that the editor batches into one commit (several updates in the
  same task) are compared with the document from before the commit, as one
  edit. The last insertion or paste command dispatched before the commit
  decides the replaced selection for all of them.
- An id removed with `$removeMarkID` is not given back anywhere in that
  update, or in the updates batched with it: not to text the removal did
  not cover (a removal from a range), and not after the update adds the id
  again. Text that such an update re-creates (a hashtag) or that replaces a
  selection loses that id, also where the removal did not reach. Let the
  editor commit between the removal and such an edit.
- Code that gives a plain `TextNode` the very ids array of a commented
  hashtag or mention and inserts it right after that node inserts what
  looks like text split off it (see above), so at the end of the mark it is
  not marked. Copying NodeState without a round trip through a string
  passes the array on: the node's `exportJSON()` output imported as a plain
  text node, or `$copyNode` of text split off it. Insert the node without
  ids and add them with `$addMarkID`.
- Code that removes ids by re-creating nodes with `$createTextNode` gets
  them back by the rule above when the caret is in that paragraph; use
  `$removeMarkID`.
- If a collaborator edits the paragraph while an input method composition
  is in progress there, the composed text keeps the ids of the TextNode it
  was composed in, so it can join a mark at its edge.

## Collaboration

`@lexical/yjs` syncs the ids as any other NodeState. Both bindings store the
ids of a leaf as one value, so:

- **Concurrent changes to the ids of the same text keep one collaborator's
  set** (the last writer wins for that text). Peers still converge on the
  same document, but one change is lost there: an added id can be dropped,
  or a removed id can come back. For example, when one collaborator resolves
  comment `c1` while another adds `c2` to the same text, the text ends up
  either without `c2` (the addition is lost) or with both `c1` and `c2` (the
  removal is lost, so the resolved `c1` reappears).
  Keep the state of each thread (open or resolved) in your own store, and
  ignore the ids of resolved threads when you render or list comments.
- A collaborator's concurrent structural change to the same text, such as
  wrapping it in a link or merging its paragraph into the previous one, can
  drop the marks on it or extend them over neighboring text. Typing exactly
  at the edge of a mark while a peer edits follows the order Yjs gives the
  two edits. Peers always converge on the same document.

The experimental [Yjs 14 binding](./y.md) (`@lexical/y`) stores each id
separately on text, line breaks and nodes stored as their own Yjs node, so
there concurrent additions and removals of different ids all apply: two
collaborators commenting on the same words both keep their comment, and a
comment resolved while another is added stays resolved. Ids on a line such as a paragraph or
heading, a list item, a list or a link are still one value there.

:::caution v1 collaboration

The v1 binding (`CollaborationPlugin`) syncs a TextNode split or merge as a
delete and a re-insert of the text. Adding or removing an id on part of a
run splits that run's TextNode, and a removal that leaves neighbors with the
same ids merges them, so on v1 those edits race like `MarkNode`: typed text
can move and concurrent comments can duplicate text.

:::
