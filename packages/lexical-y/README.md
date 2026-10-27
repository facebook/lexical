# `@lexical/y`

**Experimental.** A collaboration binding for [Lexical](https://lexical.dev)
on [Yjs 14](https://github.com/yjs/yjs) (`@y/y`). It is separate from
`@lexical/yjs` (Yjs 13): the two use different Yjs libraries and document
layouts, and a document uses one or the other. Every export is
`@experimental`, and `@y/y` is a release candidate.

## Install

```sh
npm i @lexical/y @lexical/extension lexical @y/y@14.0.0-rc.29
```

`@y/y` is a peer dependency pinned to the release candidate this package is
tested with. Its type declarations do not type-check on their own (an
upstream issue): projects that run `tsc` need `skipLibCheck: true`.

## Usage

```ts
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {YCollabExtension} from '@lexical/y';
import * as Y from '@y/y';
import {configExtension, defineExtension} from 'lexical';

const doc = new Y.Doc();
const editor = buildEditorFromExtensions(
  defineExtension({
    dependencies: [RichTextExtension, configExtension(YCollabExtension, {doc})],
    name: 'app',
  }),
);
const {binding} = getExtensionDependencyFromEditor(
  editor,
  YCollabExtension,
).output;
// Connect `doc` to any Yjs 14 provider, then after its first sync:
binding.initialize();
```

## Documentation

- [Yjs 14 (`@lexical/y`)](https://lexical.dev/docs/collaboration/y): setup,
  options, servers, limits and upgrading from `@lexical/yjs`.
- [Server-side editing](https://lexical.dev/docs/collaboration/y-server):
  `@lexical/y/headless` (`seedYState`, `editYState`, `readYState`).
- [API reference](https://lexical.dev/docs/api/modules/lexical_y)

## Servers

A server or relay that loads a document into a plain Yjs `Doc` and stores
its state must set `doc.cleanupFormatting = false` before it applies
updates. Otherwise Yjs's format cleanup deletes format items the clients
keep (the binding stops that cleanup in its own containers on the clients),
and the stored state reads differently from what the clients show. See
[Servers](https://lexical.dev/docs/collaboration/y#servers) for the other
requirements (yrs versions, 32-bit client ids).

## Running the long fuzz

The randomized suites in `src/__tests__/unit` run a few seeds in CI; set
these to run more (from the repository root, with
`npx vitest --project unit --no-watch packages/lexical-y`):

- `FUZZ_SEEDS`, `FUZZ_GC_SEEDS` (`Fuzz.test.ts`, with and without
  garbage collection; `FUZZ_SEED_START` picks the first seed), and
  `FUZZ_MOVE_SEEDS`, `FUZZ_MOVE_GC_SEEDS` for its runs with block moves;
- `NORMALIZE_FUZZ_SEEDS` (`NormalizationConvergence.test.ts`);
- `SHAPE_FUZZ_SEEDS` (`ConcurrentShapesFuzz.test.ts`);
- `SLOTS_FUZZ_SEEDS` (`SlotsFuzz.test.ts`, named slots);
- `STORAGE_FUZZ_SEEDS`, `STORAGE_PROP_SEEDS` (`DerivedStorage.test.ts`);
- `LEXICAL_Y_BLOCK_ID=1` builds the editors of `Fuzz.test.ts`,
  `Races.test.ts`, `NormalizationConvergence.test.ts` and the other suites
  on the shared test helpers from `YCollabExtension` and
  `BlockIdExtension`, as an app that uses both does.

To replay one seed with its trace: `FUZZ_SEED=<seed>` (add `FUZZ_GC=1` for
the garbage-collected run), `NORMALIZE_FUZZ_TRACE=<seed>` or
`STORAGE_FUZZ_TRACE=<seed>`.

## Storage

The shared root is `doc.get('lexical-y')` (`DEFAULT_ROOT_NAME`). How an
element type is stored is derived from the node structure its class
declares in `$config()`, first match wins: a block with `children: 'inline'`
is a `line`; an inline element with `mergeAdjacent` is a `format`; a block
that lists only line classes as `children`, with `mergeAdjacent`, is a
`group` (a list); anything else is `nested`. The first three also need the
class's data to be fully in its schema and NodeState, and no declared
`slots` (a node stored as its own `Y.Node` stores its slots, see below).
`describeStorage(editor)` returns the result per type. The first write of a
type records its kind on the root (`k:<type>`); a later client whose class
derives another kind uses the recorded one when it can, and opens read only
otherwise.

## Wire format: layout 1

Layout 1 is frozen: these names are stored in documents and do not change.
A change to any of them is a new layout version, which older clients open
read only. Layout 2 (below) keeps everything here and adds move records and
lifted blocks.

- **Root:** the top-level type `lexical-y` (or the `root` option). Root
  attributes: `lexical-y:<n>` = `true` for each layout version `n` the
  document needs (`lexical-y:1` here), and `k:<type>` = the storage kind
  recorded for each element type on its first write: `line`, `nested`,
  `group|<field>,…` or `format|<field>,…` (the group's or format's identity
  fields).
- **Layout record.** A reader takes the highest `lexical-y:<n>`, and opens
  the document read only when it is newer than its own layout, or when a
  `lexical-y:` attribute is not an integer from 1 set to `true`. The record
  only grows: no client deletes one, and a writer records a version in the
  same transaction as, and before, the first content that needs it. Two
  clients that upgrade a document at once both record theirs, and every
  reader takes the higher. Any change to how a stored shape is read is a new
  version.
- **Children of a container** (the root and every node stored as its own
  `Y.Node`), in order:
  - text (`Y` strings) with formats;
  - `¶` (U+00B6) nodes: line markers. A line is the inline content before its
    marker. Inline content that no marker ends (concurrent edits can leave
    some: text typed into a line a collaborator removed) reads as a
    paragraph, or in a container that is a group itself as an item of the
    group, with no attributes; where the editor has `BlockIdExtension`, its
    block id is `y`, the client of its first character's item, `_` and that
    item's clock (both in base 36);
  - `¦` (U+00A6) nodes: run terminators, ending inline content that belongs
    to the container itself;
  - `b:<type>` nodes: blocks stored as nodes (a unit of the container);
  - `i:<type>` nodes: nodes inside inline content.
- **Container attribute:** `c` = `'b'` (holds blocks) or `'i'` (holds inline
  content), fixed when the node is created.
- **Named slots** (`$setSlot`): a node stored as its own `Y.Node` (`b:<type>`
  or `i:<type>`) holds each of its named slots as the attribute
  `slot:<name>`, whose value is the slot's node: a `b:<type>` `Y.Node`
  stored like any block stored as a node (its attributes, `c`, its children
  and its own slots). A reader gives the node a slot `<name>` per such
  attribute, and opens the document read only when one holds anything but
  a `b:` node of a registered block type. Lines, formats, groups and the
  root have no `Y.Node` of their own and hold no slots: a writer refuses
  such a slot (warning `@lexical/y/unsupported-slots`, read only).
- **Node and marker attributes:** `t` = the type (on a marker, left out for a
  paragraph; on a stored node, only when it was replaced in place by another
  type), `p:<field>` = a schema field, `s:<key>` = a NodeState value.
- **Group items** (markers of a group's items, such as list items): `g` = the
  group type, `g:<field>` = the group's identity fields, `l` = the level
  (0 for top level), `o` = for a nested item, the identity fields of each
  outer level, outermost first, with `@` holding the fields of a level's
  wrapper item.
- **Text formats:** `t` = the text node type (left out for `text`),
  `f:<format>` = `true` per text format, `p:<field>`, `s:<key>`, `k` = a
  segment key that keeps text nodes Lexical would not merge apart, and
  `w:<type>` = a format wrapper (an inline element stored as a format, such
  as a link), whose value is an object of its fields and NodeState, with `#`
  telling apart two adjacent wrappers with equal fields.
- **Line breaks** are the character `\n` in the text, with their NodeState
  as text formats (`s:<key>`).
- **Set-valued NodeState** (an `arraySetValue` state, whose schema has
  `meta.kind === 'set'`): on text, line breaks and nodes stored as their
  own `Y.Node`, one `s:<key>\u001f<member>` = `true` entry per member
  instead of one `s:<key>` value (`s:\u001f<member>` for a state whose key
  is empty). A reader joins the entries back into one array, unless it
  knows a state of the entry's own name, or a state of the set's key that
  is not a set. For a state it does not know yet, the array is an unknown
  NodeState value, which the state's first use reads and which is written
  back one entry per member. A set whose key contains U+001F is stored as
  one value. Any other StateConfig whose key starts with a set-valued
  state's key and U+001F would be the name of a member entry, so the
  binding refuses it whenever it writes it or the set, even without a
  value (an invariant in development; in production a warning, and the set
  is stored as one value).
- **Values:** primitives are stored as they are. Other JSON values (objects
  and arrays) are stored three ways, by where they sit:
  - in node and marker attributes (`p:`, `s:`, `g:`, `o`): the JSON value
    itself;
  - in text formats (`p:`, `s:` on text and on a line break): an object
    `{json: '<JSON>'}`, the value's JSON with sorted keys as a string (Yjs
    compares format values one level deep);
  - as a member of a format wrapper's value (`w:<type>`): the string
    `\u0000` followed by the value's JSON with sorted keys. A string that
    itself starts with `\u0000` is stored the same way (as the JSON of that
    string), so every member reads back with its type and value.
- **Defaults are left out:** a field or NodeState value equal to the one a
  new instance of the class has (its `$config` default) is not stored, so a
  reader takes it from its own class (an `h1` heading's marker is
  `{t: 'heading'}`; a nested item of a numbered list has no `g:listType`).
  Every client of a document must therefore register classes with the same
  defaults.

## Wire format: layout 2

Layout 2 is layout 1 plus the following, and is frozen the same way.

A layout 1 document is upgraded in place, lazily. The first client that
writes a move record, a join record or a lifted block adds `lexical-y:2` =
`true` to the layout record, in the same transaction; undo never deletes
it. Nothing else is rewritten. From then on, clients that only read layout
1 open the document read only, and the record never shrinks.
Documents that never see a move or a lifted block stay at layout 1, and
older clients keep editing them. Later additive layouts follow the same
pattern. A change to how existing data is stored would instead need a
reseed (out of scope here).

- **Move records:** `↷` (U+21B7) children of a container. Attributes:
  - `s`: the id `[client, clock]` of the item right before the range, or
    `null` for the start of the container;
  - `e`: the id of the range's last item (inclusive);
  - `p`: the priority, a non-negative integer;
  - `o`: optional, the id of the record this one was written again from
    (it keeps that record's rank among records of equal priority);
  - `j`: optional, `1` for a join record (below).

  Ids name items of the same container. Ownership is computed when
  reading, never stored: an item belongs to the record whose range holds it
  positionally (items inserted later inside a range included) that ranks
  first: highest `p`, then highest client and then clock of `o` (the
  record's own id when it has none), then of the record's own id; otherwise
  to the container. A record that sits inside its own range, directly or
  through the records that show it, is inactive (it shows nothing). A
  record whose ids are not received yet waits for them. A block record
  (no `j`) shows its range's units right before the line its item is in.
- **Join records:** a move record with `j` = `1` shows its range inline, at
  its own position inside the line around it: a walk of the line enters
  the range at the record and goes on after the record past the range's
  last item. A join of two lines in different ranges is written as the
  first line's text, one join record per piece of the second line (a piece
  is a run of the line's items in one range, in order), and the first
  line's marker; the second line's marker is deleted. A line can start or
  end inside a range a join record shows. A line moved while it spans
  ranges gets one join record per piece but its last, written at the
  start of that last piece, and a block record over that last piece.
- **Lifted blocks:** `u` = `1` on an `i:<type>`
  node: the node is a unit of its container, like a `b:<type>` child (a
  block a peer wrote inside a line, lifted out of it in place).

