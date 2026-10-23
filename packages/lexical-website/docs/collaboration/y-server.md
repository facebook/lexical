---
sidebar_position: 3
---

# Server-side editing with `@lexical/y`

:::warning Experimental

`@lexical/y` is experimental. Its document layout and these APIs may change
without a migration.

:::

`@lexical/y/headless` runs Lexical edits on a stored Yjs 14 (`@y/y`) state
on a server, without a DOM. It binds a headless editor with the same binding
as the clients, so what the server writes is what a client would have
written, and it merges with the clients' concurrent edits like any other
peer's. See [Yjs 14 (`@lexical/y`)](./y.md) for the binding itself.

```ts
import {editYState, readYState, seedYState} from '@lexical/y/headless';
import {
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
} from 'lexical';

// The clients' extensions (or `nodes`): the server must register every node
// type the clients use.
const config = {extensions: [AppNodesExtension]};

// A new document.
const state = seedYState(config, () => {
  $getRoot().append($createParagraphNode().append($createTextNode('Hello')));
});

// One edit on the stored state.
const {update, state: next} = editYState(state, config, () => {
  $getRoot().append($createParagraphNode().append($createTextNode('More')));
});
// Send `update` to the connected clients and store `next`.

// Read the document: its JSON, Markdown, plain text...
const json = readYState(next, config, () =>
  $getEditor().getEditorState().toJSON(),
);
```

## API

Each function takes a config with the editor's `extensions` (or `nodes`),
and optionally `root` (default `'lexical-y'`), `clientIDRange` (see
[Servers](./y.md#servers)), `onWarn` and `selfCheck`.

| Function | Returns |
| --- | --- |
| `seedYState(config, $build)` | The state of a new document holding what `$build` writes. |
| `editYState(state, config, $edit, options?)` | `{update, state, warnings}` after one edit. |
| `readYState(state, config, $read)` | What `$read` returns. Nothing is written. |

- **`seedYState`** creates a document's content outside a client: from a
  template, an import, or a converter. It writes the way a client's
  `initialize()` does, with a client id derived from the content, so seeding
  identical content twice gives the same bytes and two seeds merge into one
  copy. Content with random parts (such as ids an extension draws for new
  blocks) is not identical: seed a document once.
- **`editYState`** runs `$edit` in one discrete update, then commits the
  updates it made listeners schedule (an extension giving new blocks ids),
  and returns the merged update of everything written, or `update: null`
  when nothing changed, and `state` with the update merged in. Options:
  - `allowedRoots`: the shared roots the update may write to (default: the
    layout root). An update that writes anywhere else is refused.
  - `transact(doc)`: writes to other shared types of the same document, such
    as an activity log, in the same update. Their roots must be allowed.
  - `tag`: the tags of the editor update.

  An error thrown by `$edit` is rethrown, and nothing is returned.
- **`readYState`** discards what opening the document writes (see
  [Store what opening writes](#store-what-opening-writes)).

They throw a `YHeadlessError` with a `code`: `'not-initialized'` (no layout
record yet: seed the document first), `'read-only'` (a newer layout, or a
node type the config does not register; the message has the reason) or
`'foreign-roots'` (the update writes to a root that is not allowed).

Warnings never refuse an edit, and the functions never throw for one. Each
warning is a `LexicalWarning` (see [Warnings](./y.md#warnings)), returned in
`editYState`'s `warnings` and passed to `config.onWarn` (default:
`console.warn` outside production; a handler that throws does not refuse
the edit). Their codes are the binding's, plus two exported from
`@lexical/y/headless`:

- `'@lexical/y/editor-warning'` (`EDITOR_WARNING`): a warning from Lexical
  or an extension that is not a `LexicalWarning`, with its message;
  `data.error` is the original.
- `'@lexical/y/follow-ups-exhausted'` (`FOLLOW_UPS_EXHAUSTED_WARNING`):
  listeners kept scheduling updates; after 8 follow-up updates
  (`data.limit`) the rest are not committed, which usually means an update
  listener that always changes the document.

The binding's self-check is off unless `selfCheck: true`.

## Server patterns

### Store what opening writes

Opening a document can write to it: an extension gives ids to blocks stored
without one, or the binding repairs a shape left by concurrent edits.
`editYState` includes those writes in its update; `readYState` does not
store them, so a value assigned on open can differ from one read to the
next. Store what opening writes once before relying on such values:

```ts
const {update, state: repaired} = editYState(state, config, () => {});
if (update !== null) {
  // Store `repaired` and send `update` to the connected clients.
}
```

### One writer per document

Run a document's server edits one after another, each on the latest stored
state. Two edits run at once from the same state each return a state
without the other's update, and storing both loses one. If edits must run in
parallel, merge each `update` into the latest stored state instead of
storing the returned `state`. Clients' concurrent edits merge with the
server's like any peer's.

### Converting a `@lexical/yjs` document

Load the old document into an editor with `@lexical/yjs`, seed its content,
and merge the seed into the stored Yjs 14 document. The seed holds only the
`@lexical/y` root, so the old root is left as it was:

```ts
import {seedYState} from '@lexical/y/headless';
import {applyUpdate, Doc, encodeStateAsUpdate} from '@y/y';
import {$getRoot, $parseSerializedNode} from 'lexical';

// `old`: the old editor's `getEditorState().toJSON()`.
const seed = seedYState(config, () => {
  for (const child of old.root.children) {
    $getRoot().append($parseSerializedNode(child));
  }
});
const doc = new Doc();
applyUpdate(doc, stored);
applyUpdate(doc, seed);
const converted = encodeStateAsUpdate(doc);
```

Edits that old clients make after the conversion stay in the old root, so
upgrade every client of the document at the same time.

## API reference

[`@lexical/y/headless`](/docs/api/modules/lexical_y/headless)
