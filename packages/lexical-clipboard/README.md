# `@lexical/clipboard`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_clipboard)

This package contains the functionality for the clipboard feature of Lexical.

`$handlePlainTextDrop` accepts an optional `LexicalDropTargetResolver` as its
third argument. It runs synchronously in a read-only view of the current pending
update, after source selection capture. The active selection is still the original
selection: the source for a same-editor drag, or the destination editor's selection
for a cross-editor drag. Return a caller-normalized caret from the destination
editor's pending state to accept the destination; the handler does not normalize
it automatically. Returning `null` or an invalid caret consumes and cancels the
drop without moving the source, and stops
lower-priority `DROP_COMMAND` handlers. Unmarked native drags return `false`.
The plain-text handler consumes a marked drag with no nonempty plain-text or URI
payload without calling the resolver, mutating the source, or reporting an error.

The optional `$beforeInsert` callback prepares the accepted destination. This
example inserts a structural line break and adjusts the insertion selection:

```ts
import {$handlePlainTextDrop, type LexicalDropTargetResolver} from '@lexical/clipboard';
import {$createLineBreakNode} from 'lexical';

const resolveDropTarget: LexicalDropTargetResolver = caret => ({
  caret,
  $beforeInsert: selection => {
    selection.insertNodes([$createLineBreakNode()]);
  },
});

// Inside the destination editor's synchronous DROP_COMMAND handler:
$handlePlainTextDrop(event, editor, resolveDropTarget);
```

The accepted caret is checked against the source range, including both
endpoints, before preparation. A same-editor drop within that range is a no-op
and does not call `$beforeInsert`. For comparison only, text edges and adjacent
node boundaries within the same parent are equivalent; root and block boundaries
remain distinct, and the insertion caret is unchanged. Both immediately adjacent
sides of an empty text source endpoint are inclusive for this drop policy only;
they remain distinct structural positions generally. Preparation redirects to
either side still error before source removal. Otherwise, text at the target is
split with the source selection active so its points follow the split. The source
is captured with carets facing into its range, including node boundaries for
excluded nonempty text endpoints. Empty text endpoints retain their text slices
so source removal also removes them. Node-caret targets remain at their supplied
parent boundary; ancestors are not split merely to stabilize the target.
Source text is not extracted or split merely to track the selection.
This preserves existing source-removal behavior, including whole-token deletion
and custom text-node types when the target is elsewhere.

Preparation may update the destination selection or establish another one using
`node.selectStart()` or similar methods. The resulting active selection must be
collapsed, attached, at valid offsets, and strictly outside the source range;
equality with either source boundary is an error after preparation. Source-facing
carets preserve element boundaries when preparation inserts siblings. Before
insertion, the source selection is reconstructed from those carets and made active
while the prepared target is stabilized, so a replacement target can also remap
source offsets. The destination selection is then restored for insertion.

Plain-text insertion runs before source removal. If preparation or insertion
throws synchronously, the handler has not deleted the source, even if `onError`
rethrows. The native drop is already canceled. This is a source-preservation
contract, not a rollback mechanism: partial destination edits can remain pending
when `onError` prevents Lexical's normal cleanup. Both callbacks must finish in
the current update, must not edit the source or unrelated nodes, and must not
schedule deferred updates. Preparation must return `undefined`, never a Promise
(the equivalent return type in Flow is `void`). Give a separately named TypeScript
preparation callback an explicit `: undefined` return annotation so Promise returns
are rejected.

A successful same-editor move removes the captured source once in the same
update and has one undo step. Cross-editor removal instead dispatches
`deleteByDrag` after successful insertion, with independent source and destination
history. Later transforms and separate source-editor updates are not covered by
an atomicity guarantee.

`$handleRichTextDrop` retains its existing two-argument importer contract; the
resolver/preparation API is deliberately limited to plain text. A rich importer
claim is not proof of payload insertion. Custom rich importers remain responsible
for inserting the payload; this API does not infer success from selection changes,
formatting changes, or serialized node comparisons.

Both handlers treat inclusive source endpoints as no-ops, preserve node-caret
destinations inside empty elements, and remap source selections across text splits.
Same-editor rich drops still remove the source before importing; errors retain the
existing dependence on Lexical's normal rollback cleanup. If source removal detaches
the rich target, the handler reports an error through `onError` rather than silently
claiming success. Empty or non-inserting custom rich importers can still lose
source content, a preexisting limitation that
the plain-text resolver/preparation API does not change.
