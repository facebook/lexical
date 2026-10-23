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
read only. Layout 2 (planned) adds move records and keeps everything below.

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

