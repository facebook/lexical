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
- [API reference](https://lexical.dev/docs/api/modules/lexical_y)

## Running the long fuzz

The randomized suites in `src/__tests__/unit` run a few seeds in CI; set
these to run more (from the repository root, with
`npx vitest --project unit --no-watch packages/lexical-y`):

- `FUZZ_SEEDS`, `FUZZ_GC_SEEDS` (`Fuzz.test.ts`, with and without
  garbage collection; `FUZZ_SEED_START` picks the first seed), and
  `FUZZ_MOVE_SEEDS`, `FUZZ_MOVE_GC_SEEDS` for its runs with block moves;
- `NORMALIZE_FUZZ_SEEDS` (`NormalizationConvergence.test.ts`);
- `REPAIR_FUZZ_SEEDS` (`RepairFuzz.test.ts`);
- `STORAGE_FUZZ_SEEDS`, `STORAGE_PROP_SEEDS` (`DerivedStorage.test.ts`).

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
class's data to be fully in its schema and NodeState. `describeStorage(editor)`
returns the result per type. The first write of a type records its kind on
the root (`k:<type>`); a later client whose class derives another kind uses
the recorded one when it can, and opens read only otherwise.

## Wire format: layout 1

Layout 1 is frozen: these names are stored in documents and do not change.
A change to any of them is a new layout version, which older clients open
read only. Layout 2 (below) keeps everything here and adds move records and
lifted blocks.

- **Root:** the top-level type `lexical-y` (or the `root` option). Root
  attributes: `lexical-y` = the layout version (an integer, `1`), and
  `k:<type>` = the storage kind recorded for each element type on its first
  write: `line`, `nested`, `group|<field>,…` or `format|<field>,…` (the
  group's or format's identity fields).
- **Children of a container** (the root and every node stored as its own
  `Y.Node`), in order:
  - text (`Y` strings) with formats;
  - `¶` (U+00B6) nodes: line markers. A line is the inline content before its
    marker;
  - `¦` (U+00A6) nodes: run terminators, ending inline content that belongs
    to the container itself;
  - `b:<type>` nodes: blocks stored as nodes (a unit of the container);
  - `i:<type>` nodes: nodes inside inline content.
- **Container attribute:** `c` = `'b'` (holds blocks) or `'i'` (holds inline
  content), fixed when the node is created.
- **Node and marker attributes:** `t` = the type (on a marker, left out for a
  paragraph; on a stored node, only when it was replaced in place by another
  type), `p:<field>` = a schema field, `s:<key>` = a NodeState value, `pad` =
  `true` on a table cell a repair added to pad a row.
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
- **Values:** primitives as they are; any other JSON value as `\u0000`
  followed by its JSON with sorted keys.

## Wire format: layout 2

Layout 2 is layout 1 plus the following, and is frozen the same way.

A layout 1 document is upgraded in place, lazily. The first client that
writes a move record, a join record or a lifted block sets the root's
`lexical-y` attribute to `2`, in a transaction of its own that undo never
reverts. Nothing else is rewritten. From then on, clients that only read
layout 1 open the document read only, and the number never goes back down.
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

