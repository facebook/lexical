# Named Slots

:::warning

Named slots are experimental. The APIs described here are tagged
`@experimental`, may change without a major version bump, and the
serialization and collab formats should be treated as unstable until the
feature is stabilized.

:::

Named slots let a single host node (an ElementNode or a DecoratorNode) own
several isolated editable regions addressed by name — a Card's `title`, a
PullQuote's `quote` and `attribution` — inside the host's own EditorState.
Each region takes its own caret and formatting, never merges across the
boundary, and `Cmd+A` doesn't spill into the rest of the document.

Before named slots, the usual answer was a nested editor per region: every
region lives in its own EditorState, so moving nodes between regions and
keeping history and collab in sync all require serialization and extra
`editor.update` passes. The other node shapes don't fit either: plain
ElementNode children share one undivided linked list (Backspace at a region
start merges it into the previous region), and a DecoratorNode is atomic, so
Lexical can't own selection, collab, or serialization inside it. With named
slots, editing a slot is just editing the one tree.

:::note

This concept is unrelated to `ElementDOMSlot` in the
[DOM rendering](../serialization/dom-render.md) documentation, which is a
lower-level pointer to the content-bearing element of a node's DOM. Named
slots are a model-level feature.

:::

## The Model

A host keeps a second child channel, a `Map` of slot name to NodeKey,
separate from its ordinary linked-list children. A slot value has its slot
host pointer set and `getParent() === null`, with exactly one of the two
non-null: `getParent()` stops at the slot boundary, and you climb out only
through `$getSlotHost()`.

The slot link itself acts as a **virtual invisible shadow root** between the
host and the value. Isolation is structural rather than a convention — an
accidental boundary crossing surfaces as a thrown invariant, not silent
corruption.

In the DOM, slots render slots-first, each value mounted inside a keyless
`<div data-lexical-slot="<name>">` container ahead of the host's ordinary
children, in a canonical order derived from the host class (see
[slot order](#slot-order)).

## Hosts and Values

Any ElementNode or DecoratorNode can host slots. An ElementNode host can mix
slots with ordinary children (a Card with a `title` slot plus regular body
paragraphs); a DecoratorNode host has no children channel, so slots are its
only editable content (a PullQuote that is otherwise atomic).

A slot value is any non-inline ElementNode or DecoratorNode. The value's
shape decides the editing model:

- **A bare block** (for example a ParagraphNode) behaves as a single-line
  field with no extra wrapper in the model, the JSON, or the DOM: its virtual
  scope holds exactly one block, so Enter is a no-op (hosts may map it to
  focus movement) and a multi-block paste flattens to inline content the way
  an `<input>` sanitizes its value — line breaks stripped, block-only
  decorators dropped.
- **A shadow-root container** (an ElementNode whose `isShadowRoot()` returns
  `true`) behaves as a multi-block region with normal block editing inside.

## Declaring and Setting Slots

A host class declares its slot names in [`$config()`](nodes.mdx); values are
attached with `$setSlot`:

```ts
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $setSlot,
  ElementNode,
} from 'lexical';

class CardNode extends ElementNode {
  $config() {
    return this.config('card', {extends: ElementNode, slots: ['title']});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}

function $createCardNode(): CardNode {
  const card = $create(CardNode);
  // Single-line title: the bare paragraph IS the slot value.
  $setSlot(card, 'title', $createParagraphNode().append($createTextNode()));
  // Ordinary body child, edited like any other block.
  return card.append($createParagraphNode());
}
```

For a multi-block region, use a shadow-root container as the value:

```ts
class SlotContainerNode extends ElementNode {
  $config() {
    return this.config('slot-container', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isShadowRoot(): boolean {
    return true;
  }
}

$setSlot(
  pullQuote,
  'quote',
  $create(SlotContainerNode).append(
    $createParagraphNode().append($createTextNode('First block')),
    $createParagraphNode().append($createTextNode('Second block')),
  ),
);
```

The core API surface (all exported from `lexical`):

- `$setSlot(host, name, node)` — place a value into a named slot, replacing
  any existing value under that name. Throws if the value is inline, if
  inserting it would create a cycle, or if the name is one of the reserved
  prototype keys (`__proto__`, `constructor`, `prototype`).
- `$getSlot(host, name)` — the value under a name, or `null`.
- `$getSlotNames(host)` — the host's slot names in canonical order.
- `$removeSlot(host, name)` — detach the value under a name (the subtree is
  garbage-collected unless you reattach it elsewhere).
- `$getSlotHost(node)` — the host a value is slotted into, or `null`.
- `$getSlotFrame(node)` — the innermost slot value containing a node (the
  "frame" whose virtual shadow root scopes editing), or `null` when the node
  is not inside any slot.
- `$isSlotHost(node)` / `$isSlotChild(node)` — type guards for the
  `SlotHostNode` / `SlotChildNode` interfaces.

## Slot Order

Slot order is canonical and derived, never stored. Names declared in
`$config()` (`slots: ['quote', 'attribution']`) sort first in declaration
order; undeclared names sort after them, lexicographically by UTF-16 code
unit (plain JavaScript string comparison, locale-independent). `$setSlot`
re-canonicalizes on every write, so documents normalize on load and
concurrent collaborative additions converge to the same order on every
client. If presentation order matters, declare the names.

## Rendering

For an ElementNode host, the reconciler creates and manages the
`data-lexical-slot` containers automatically, prepended ahead of the host's
ordinary children inside the host's DOM.

A DecoratorNode host's containers are created detached (and opted back into
`contentEditable`) so the host's React chrome can place them. The
`useLexicalSlot` hook from `@lexical/react/useLexicalSlot` returns a ref that
mounts a slot's container into your component:

```tsx
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlot} from '@lexical/react/useLexicalSlot';

function PullQuoteComponent({nodeKey}: {nodeKey: NodeKey}) {
  const [editor] = useLexicalComposerContext();
  const quoteRef = useLexicalSlot<HTMLDivElement>(editor, nodeKey, 'quote');
  const attributionRef = useLexicalSlot<HTMLDivElement>(
    editor,
    nodeKey,
    'attribution',
  );
  return (
    <blockquote>
      <div ref={quoteRef} />
      <div ref={attributionRef} />
    </blockquote>
  );
}
```

## Editing Behavior

- **Selection never crosses a slot boundary.** Selections are clamped to the
  anchor's slot frame at every entry point (DOM resolution, `$setSelection`,
  and point mutation), so a mouse drag and a `shift+arrow` across the
  boundary land on the same clamped result.
- **Deletion stops at the boundary.** Backspace at the start of a slot and
  forward-Delete at its end are no-ops instead of merging across the virtual
  shadow root.
- **`Cmd+A` scopes to the slot frame** when the caret is inside one; outside
  slots the default handlers keep the legacy whole-document behavior.
  Progressive expansion (block → enclosing slot frame → document on repeated
  presses) is provided by the opt-in `SelectBlockExtension` from
  `@lexical/extension`.
- **Whole-host UX is opt-in.** An ElementNode host can override
  `includeChildrenWhenSelected()` to make a NodeSelection of the host carry
  its body children through copy and export, matching chrome interactions
  that read as "select the whole Card". The promotion applies only to
  NodeSelection; a partial RangeSelection over the host keeps per-child
  slicing.

### Traversal is intentionally asymmetric

Content reads include slot subtrees, slots-first: `getTextContent()`,
`getAllTextNodes()`, and the `$dfsWithSlots` family in `@lexical/utils`
count slot content for search, copy, and accessibility. Navigation excludes
them: `getChildren()`, `getFirstDescendant()` and friends stay
linked-list-only, so caret movement never walks into a slot by accident.
Choose `$dfs` or `$dfsWithSlots` depending on whether "this subtree" should
mean the navigable tree or all content.

## Serialization

JSON serialization is automatic in both directions. A host's slots serialize
under the reserved `$slots` key on `SerializedLexicalNode` (a sibling of
NodeState's reserved `'$'` key), keyed by slot name:

```json
{
  "type": "card",
  "version": 1,
  "$slots": {
    "title": {"type": "paragraph", "children": [], "version": 1}
  },
  "children": []
}
```

Parsing re-attaches each subtree with `$setSlot` and throws if `$slots`
appears on a node that cannot host slots. The `$` prefix keeps the
framework-owned key from colliding with a subclass that already serializes a
`slots` property of its own.

HTML serialization is opt-in per host, like NodeState: the exporter never
descends into slots on its own. A host's `exportDOM` can emit each slot into
a wrapper using `$appendNodeToHTML` from `@lexical/html`, and a
[DOM import rule](../serialization/dom-import.md) on the host's
distinguishing markup maps the wrappers back through `$setSlot`.

## Collaboration

Slots sync on both the V1 and V2 Yjs bindings through a per-slot-diffed
`Y.Map` stored under the reserved `slots` attribute key on the host's shared
type. Hosts with declared slots create that map eagerly, so two clients
concurrently setting *different* slot names for the first time merge
per-entry instead of racing. Malformed or hostile remote entries are
validated and skipped.

:::caution

Pre-slots clients receiving slot data from upgraded peers will error rather
than render it. Enabling slots in long-lived shared documents should be
gated on all participants running a slots-aware version; new clients
tolerate unknown slot data going forward.

:::

## Reserved Names

Adding slots reserves a few identifiers that custom node subclasses should
not define for their own purposes:

- the `__slots` and `__slotHost` fields on ElementNode / DecoratorNode;
- the `getSlotsTextContent()` / `getSlotsTextContentSize()` methods on
  LexicalNode (called by `getTextContent`) and
  `includeChildrenWhenSelected()` on ElementNode;
- the `$slots` serialized JSON key;
- the bare `slots` collab attribute key — a custom node field literally
  named `slots` no longer syncs over collab.

## Current Limitations

- The caret / NodeCaret APIs throw across a slot boundary ("no common
  ancestor"); slot-aware caret traversal is a planned follow-up.
- Nested slots (a slot whose host is itself slotted) are only handled one
  level deep by the runtime selection comparator.
- The mixed-version collab caveat above.
