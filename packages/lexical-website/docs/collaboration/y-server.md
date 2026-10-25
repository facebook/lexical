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
  - `tag`: the tags of the editor update. `COLLABORATION_TAG` and
    `SKIP_COLLAB_TAG` are refused (`'ignored-tag'`): the binding writes
    nothing for an update that carries them, so the edit would be lost.

  Whatever `$edit` throws (an `Error` or any other value) is rethrown as it
  is, and nothing is written or returned: `transact` does not run.
- **`readYState`** discards what opening the document writes (see
  [Store what opening writes](#store-what-opening-writes)).

The states `seedYState` and `editYState` return are compacted like the
clients' copies (garbage collected: deleted content keeps only its
tombstones), `editYState`'s also when nothing changed; the `update` sent to
clients is not. `editYState` checks the update's roots on its own
uncompacted copy of the document, which still holds the deleted items the
update refers to, and compacts the state after that check.

The documents that load a state (the headless editor's, and the one that
compacts) turn off Yjs's format cleanup (`doc.cleanupFormatting = false`),
as the binding does on the clients: it would delete format items that the
clients keep, and the stored document would then read differently from
theirs once someone types there. A server that loads a stored state into a
`Doc` of its own (to compact or merge it) should do the same; merging
updates with `mergeUpdates` needs nothing.

Each call releases its editor and document before it returns, so a
synchronous loop over many documents holds one at a time.

They throw a `YHeadlessError` with a `code`: `'not-initialized'` (no layout
record yet: seed the document first), `'read-only'` (a newer layout, a
node type the config does not register, or a named slot the document cannot
store, which the binding refuses to write; the message has the reason),
`'foreign-roots'` (the update writes to a root that is not allowed) or
`'ignored-tag'` (`editYState`'s `tag` makes the binding write nothing; the
edit does not run).

Warnings never refuse an edit, and the functions never throw for one. Each
warning is a `LexicalWarning` (see [Warnings](./y.md#warnings)), returned in
`editYState`'s `warnings` and passed to `config.onWarn` (default:
`console.warn` outside production; a handler that throws does not refuse
the edit). Their codes are the binding's, plus two exported from
`@lexical/y/headless` (the `YHeadlessWarningCode` type lists them all):

- `'@lexical/y/editor-warning'` (`EDITOR_WARNING`): a warning from Lexical
  or an extension that is not a `LexicalWarning`, with its message;
  `data.error` is the original.
- `'@lexical/y/follow-ups-exhausted'` (`FOLLOW_UPS_EXHAUSTED_WARNING`):
  listeners kept scheduling updates; after 8 follow-up updates
  (`data.limit`) the rest are not committed, which usually means an update
  listener that always changes the document. Once the binding writes (an
  edit, or the read of a seed it has written), an update that changes content and is made after a commit in the
  same task commits at once, as each one such a listener schedules is:
  Lexical's own guard stops such a listener instead (an `EDITOR_WARNING`),
  and what it committed is part of the update.

The binding's self-check is off unless `selfCheck: true`.

## Server patterns

### Store what opening writes

Opening a document can write to it: an extension can assign a value on open
(a NodeState it sets on every block that has none, for example).
`editYState` includes those writes in its update; `readYState` does not
store them, so a value assigned on open can differ from one read to the
next. Store what opening writes once before relying on such values:

```ts
const {update, state: next} = editYState(state, config, () => {});
if (update !== null) {
  // Store `next` and send `update` to the connected clients.
}
```

### Edits by agents and tools

An agent's edit is planned from a read, and the document can change before
the edit arrives. Follow
[Edits made by code](./y.md#edits-made-by-code-agents-tools):

- **Edit text in place.** Change the characters of a text node
  (`spliceText`) rather than replacing its block: a replaced block is a
  delete and an insert, and what a collaborator types into it meanwhile is
  lost.
- **Edit the state the plan was computed from, then merge.** Keep the state
  the agent read, run `editYState` on that state, and merge the returned
  `update` into the latest stored state (and send it to the clients). Yjs
  merges it with everything that changed since. Do not store the returned
  `state`: it lacks those changes.

```ts
import {editYState} from '@lexical/y/headless';
import {$getRoot, $isTextNode} from 'lexical';

// `seen`: the state the agent read when it planned the edit.
const {update} = editYState(seen, config, () => {
  const text = $getRoot().getFirstDescendant();
  if ($isTextNode(text)) {
    text.spliceText(0, 5, 'Hi');
  }
});
if (update !== null) {
  // Merge `update` into the latest stored state and send it to the clients.
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
// Keep every format item, as the clients do.
doc.cleanupFormatting = false;
applyUpdate(doc, stored);
applyUpdate(doc, seed);
const converted = encodeStateAsUpdate(doc);
```

Edits that old clients make after the conversion stay in the old root, so
upgrade every client of the document at the same time.

## API reference

[`@lexical/y/headless`](/docs/api/modules/lexical_y/headless)
