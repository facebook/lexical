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
import {
  createYWriter,
  editYState,
  readYState,
  seedYState,
} from '@lexical/y/headless';
import {
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
} from 'lexical';

// The clients' extensions (or `nodes`): the server must register every node
// type the clients use.
const config = {extensions: [AppNodesExtension]};

// Who the server's edits are by: one writer per agent or integration,
// created once per process (see Writers below).
const writer = createYWriter('Import service');

// A new document.
const state = seedYState(config, () => {
  $getRoot().append($createParagraphNode().append($createTextNode('Hello')));
});

// One edit on the stored state.
const {update, state: next} = editYState(
  state,
  config,
  () => {
    $getRoot().append($createParagraphNode().append($createTextNode('More')));
  },
  {writer},
);
// Send `update` to the connected clients and store `next` (one write at a
// time per document: see "One edit at a time per document" below).

// Read the document: its JSON, Markdown, plain text...
const json = readYState(next, config, () =>
  $getEditor().getEditorState().toJSON(),
);
```

## API

Each function takes a config with the editor's `extensions` (or `nodes`),
and optionally `root` (default `'lexical-y'`), `clientIDRange` (see
[Servers](./y.md#servers)), `onWarn` and `selfCheck`. `editYState` also
takes options with a required `writer` (see [Writers](#writers)).

| Function | Returns |
| --- | --- |
| `seedYState(config, $build)` | The state of a new document holding what `$build` writes. |
| `editYState(state, config, $edit, {writer, ...})` | `{update, state, warnings, clientID}` after one edit. |
| `readYState(state, config, $read)` | What `$read` returns. Nothing is written. |
| `createYWriter(author)` | A writer for `editYState`: who its edits are by. |
| `createYDoc(state?, options?)` | A `Y.Doc` for a relay or server that loads a stored state, with Yjs's format cleanup turned off as on the clients (the same function as `@lexical/y`'s, which clients bind). |

- **`seedYState`** creates a document's content outside a client: from a
  template, an import, or a converter. It writes as a client's
  `initialize()` writes its initial content, with a client id derived from
  the content, so seeding identical content twice gives the same bytes and
  two seeds merge into one copy. Content with random parts (such as ids an
  extension draws for new blocks) is not identical: seed a document once.
  With `BlockIdExtension`, a seed and a client's initialization of the same
  content do not merge either, unless the content gives its blocks fixed
  ids: a client names the blocks of its initial content by position, and a
  seed names them with `generateId`.
- **`editYState`** runs `$edit` in one discrete update, then commits the
  updates it made listeners schedule (an extension giving new blocks ids),
  and returns the merged update of everything written, or `update: null`
  when nothing changed, `state` with the update merged in, and the
  `clientID` it wrote under. Options:
  - `writer` (required): a writer from `createYWriter`, or `null` for a new
    anonymous client id for this edit alone (see [Writers](#writers)).
  - `allowedRoots`: the shared roots the update may write to (default: the
    layout root). An update that writes anywhere else is refused. The list
    replaces the default, so name the layout root in it too.
  - `transact(doc)`: writes to other shared types of the same document, such
    as an activity log, in the same update, under the edit's client id
    (`doc.clientID`). Their roots must be allowed. It only writes: an update
    it applies to `doc` refuses the edit (`'imported-items'`), as that
    update's items would be returned as the edit's.
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
as the clients' documents do: it would delete format items that the
clients keep, and the stored document would then read differently from
theirs once someone types there. A relay or server that loads a stored
state into a `Doc` of its own (to apply clients' updates to it, compact or
merge it) creates it with `createYDoc(state)`, which does the same; merging
updates with `mergeUpdates` needs no document:

```ts
import {createYDoc} from '@lexical/y/headless';
import {applyUpdate, encodeStateAsUpdate} from '@y/y';

// A relay's copy of a document: load what is stored, apply what clients
// send, store the result.
const doc = createYDoc(stored);
applyUpdate(doc, update);
const next = encodeStateAsUpdate(doc);
```

Each call releases its editor and document before it returns, so a
synchronous loop over many documents holds one at a time.

They throw a `YHeadlessError` with a `code`: `'not-initialized'` (no layout
record yet: seed the document first), `'read-only'` (a newer layout, a
node type the config does not register, content its classes throw on, or a
named slot the document cannot store, which the binding refuses to write; the error's `warnings` are the
binding's typed warnings that say which, so an app can narrow on each
one's `code` and `data.reason` instead of reading the message),
`'foreign-roots'` (the update writes to a root that is not allowed),
`'imported-items'` (`transact` applied another update to the edit's
document) or `'ignored-tag'` (`editYState`'s `tag` makes the binding write
nothing; the edit does not run).

`editYState` called without a `writer` (JavaScript, or a cast past the
type) throws a `TypeError` that says what to pass.

Warnings never refuse an edit, and the functions never throw for one. Each
warning is a `LexicalWarning` (see [Warnings](./y.md#warnings)), returned in
`editYState`'s `warnings` and passed to `config.onWarn` (default:
`console.warn` outside production; a handler that throws does not refuse
the edit). Their codes are the binding's, plus three exported from
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
- `'@lexical/y/writer-new-client-id'` (`WRITER_NEW_CLIENT_ID_WARNING`): a
  writer could not continue its client id on the state, so the edit was
  written under a new one; `data.reason` says why (see [Writers](#writers)).

The binding's self-check is off unless `selfCheck: true`.

## Writers

Every Yjs update is written under a client id, and a document keeps every
client id that ever wrote to it: in its state vector, which every sync
sends, and in the bookkeeping Yjs does each time it loads the document. A
browser tab writes under one client id while it is open. `editYState`
requires a `writer`, so that every call decides which client id the server
writes under:

- **A writer** from `createYWriter(author)`: create one per agent or
  integration, once per process, and pass it to every edit it makes. It
  keeps one client id per document it edits and continues it from edit to
  edit, so a document the server edits thousands of times carries one
  client id for it.
- **`null`**: a new anonymous client id for this edit alone. Every edit that
  writes adds one to the document, for good. After 3,000 one-character
  edits, a document that a writer keeps at 3.8 KB, with a 21-byte state
  vector, stores 96 KB with a 27 KB state vector, and the next call takes
  about 25 times as long.

```ts
import {createYWriter, editYState} from '@lexical/y/headless';

// Once per process.
const agent = createYWriter('Summary agent');

// For each edit the agent makes.
const {update, state: next, clientID} = editYState(state, config, $edit, {
  writer: agent,
});
```

Two writes under one client id from different states give two different
items the same id, and Yjs cannot tell them apart: each peer keeps the one
it received first, and the document diverges with no error. So a writer
never takes a client id from you. It draws its own at random, as every Yjs
client does (a restart or another replica draws others), never one that a
call in progress writes under. It continues a client id only on a state
whose clock for that id is where its last update to that document ended (a
state that holds that update). Otherwise the edit is written under a new
client id. When the state holds the writer's id short of that point, or
another call is writing under it, a `'@lexical/y/writer-new-client-id'`
warning's `data.reason` says why:

| `reason` | When | To keep one client id |
| --- | --- | --- |
| `'stale-state'` | The state was read before the writer's last update to the document, or that update was never stored. | Run the writer's edits one after another, each on a state that holds its last update, and store every update it returns. |
| `'busy'` | `editYState` was called with the writer from inside another call with it (its `$edit`, `transact` or `onWarn`). | Run a writer's edits one after another. |
| `'range'` | The writer's client id does not fit `clientIDRange: 'uint32'`. | Use the same `clientIDRange` in every config the writer edits a document with. |
| `'foreign-writes'` | Something else wrote under the writer's client id: an app assigned `result.clientID` to a `Y.Doc`. The writer stops using that id. | Never assign a writer's client id to a document. |

A state that holds none of the writer's client ids (another document, or
one read before the writer first edited it) gets a new client id without a
warning: the writer cannot tell it from a new document. The warnings catch
the overlaps a state shows, not every one.

A writer remembers up to 10,000 client ids, about one per document it
edits, the least recently used forgotten first; a document whose id it
forgot gets a new client id on its next edit.

### Attribution

The result's `clientID` is the client id the edit wrote under, and
`writer.author` is the author the writer was created with. The writer
stores the author nowhere: credit one to the other the way your app
attributes writes, and keep that record, since a restart writes under new
client ids:

- **A registry of client ids**, such as a root of the document that maps
  each client id to a person, as a blame view reads it: write the entry
  with `transact`, in the same update (`doc.clientID` there is the edit's
  client id), and allow its root.
- **Yjs 14 attributions**, which attribute the ids an update inserts and
  deletes, whatever client id wrote them (for `writer: null` too):

```ts
import * as Y from '@y/y';

if (update !== null) {
  const attributions = Y.createContentMapFromContentIds(
    Y.createContentIdsFromUpdate(update),
    [Y.createContentAttribute('insert', agent.author)],
    [Y.createContentAttribute('delete', agent.author)],
  );
  // Merge them into the document's (Y.mergeContentMaps), and render the
  // root with Y.createAttributionsRenderer.
}
```

An update holds only the edit's own writes: an update that `transact`
applies to the document refuses the edit (`'imported-items'`).

`seedYState` takes no writer: its client id is derived from the content,
which is what makes identical seeds merge. Credit the client ids in a
seed's state vector (`Y.decodeStateVector(Y.encodeStateVectorFromUpdate(seed))`)
to whoever seeded the document: that one id, plus the temporary document's
own when a listener of the config's extensions writes once the content is
read (a value it sets on open).

## Server patterns

### Store what opening writes

Opening a document can write to it: an extension can assign a value on open
(a NodeState it sets on every block that has none, for example).
`editYState` includes those writes in its update; `readYState` does not
store them, so a value assigned on open can differ from one read to the
next. Store what opening writes once before relying on such values:

```ts
const {update, state: next} = editYState(state, config, () => {}, {writer});
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
- **Give the agent its writer.** The edit continues the agent's client id
  when the agent has not written the document since `seen` was read. When
  two runs of the agent overlap on one document, the later edit is written
  under a new client id (with a `'stale-state'` warning when `seen` holds
  the agent's id): safe, and one more client id.

```ts
import {createYWriter, editYState} from '@lexical/y/headless';
import {$getRoot, $isTextNode} from 'lexical';

// Once per process.
const agent = createYWriter('Writing assistant');

// `seen`: the state the agent read when it planned the edit.
const {update} = editYState(
  seen,
  config,
  () => {
    const text = $getRoot().getFirstDescendant();
    if ($isTextNode(text)) {
      text.spliceText(0, 5, 'Hi');
    }
  },
  {writer: agent},
);
if (update !== null) {
  // Merge `update` into the latest stored state and send it to the clients.
}
```

### One edit at a time per document

Run a document's server edits one after another, each on the latest stored
state. Two edits run at once from the same state each return a state
without the other's update, and storing both loses one. If edits must run in
parallel, merge each `update` into the latest stored state instead of
storing the returned `state`. Clients' concurrent edits merge with the
server's like any peer's. Run one after another, a writer's edits also keep
one client id per document.

The same goes for everything that writes the stored state, clients' updates
included: a write that replaces it with a state computed from an older read
drops what was stored in between. Write each document's state from one
process at a time, or store with a compare-and-set on a version and, when it
fails, merge the update into the newer state and store again (merge the
returned `update`; do not run `$edit` again).

### Converting a `@lexical/yjs` document

Load the old document into an editor with `@lexical/yjs`, seed its content,
and merge the seed into the stored Yjs 14 document. The seed holds only the
`@lexical/y` root, so the old root is left as it was:

```ts
import {createYDoc, seedYState} from '@lexical/y/headless';
import {applyUpdate, encodeStateAsUpdate} from '@y/y';
import {$getRoot, $parseSerializedNode} from 'lexical';

// `old`: the old editor's `getEditorState().toJSON()`.
const seed = seedYState(config, () => {
  for (const child of old.root.children) {
    $getRoot().append($parseSerializedNode(child));
  }
});
// Keeps every format item, as the clients do.
const doc = createYDoc(stored);
applyUpdate(doc, seed);
const converted = encodeStateAsUpdate(doc);
```

Edits that old clients make after the conversion stay in the old root, so
upgrade every client of the document at the same time.

## API reference

[`@lexical/y/headless`](/docs/api/modules/lexical_y/headless)
