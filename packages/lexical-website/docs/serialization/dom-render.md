# DOMRenderExtension

:::warning Experimental

`DOMRenderExtension` and everything described on this page are marked
`@experimental` and may change between any two Lexical releases —
including breaking renames, signature changes, or behavior changes —
until the API stabilizes. We track issues and proposals in the
[GitHub repo](https://github.com/facebook/lexical); breaking changes
will be called out in release notes. Apps that depend on this
extension should pin their Lexical version and treat upgrades as
intentional.

The legacy on-class `createDOM` / `updateDOM` / `exportDOM` and the
default `$generateHtmlFromNodes` entry are unchanged and remain the
supported default for production apps that don't want to track an
experimental API.

:::

`DOMRenderExtension` lets you override how Lexical nodes are rendered
to the DOM during reconciliation (the `createDOM` / `updateDOM` /
`decorateDOM` cycle) and how they're serialized to HTML for clipboard
export and `$generateHtmlFromNodes`. Both the in-editor render path
and the export path consult the same set of overrides, so a single
declaration can shape both.

For the inverse direction — converting a DOM tree into Lexical nodes
— see [DOMImportExtension](./dom-import.md).

## When to use it

You want `DOMRenderExtension` instead of subclassing or
`registerMutationListener` whenever the change is **how a node
becomes DOM**:

- Tagging every rendered element with a state-driven attribute (e.g.
  `data-id`, `data-color`).
- Adding an extra wrapping element around a specific node type's
  children without subclassing.
- Stripping or rewriting attributes during HTML export (e.g. removing
  the `white-space: pre-wrap` style when a TextNode doesn't need it).
- Customizing the root element returned by `$generateDOMFromRoot`.
- Branching export behavior on whether this is a clipboard copy vs. a
  full-document serialization.

The render and export overrides are middleware-shaped — each one
calls `$next()` to get the default (or lower-priority) result and
returns its own. This composes cleanly across extensions: each
extension declares its overrides without coordinating with the
others.

## Quick start

```ts
import {
  buildEditorFromExtensions,
  configExtension,
} from '@lexical/extension';
import {DOMRenderExtension, domOverride} from '@lexical/html';
import {defineExtension, isHTMLElement, TextNode} from 'lexical';

const editor = buildEditorFromExtensions(
  defineExtension({
    name: 'app',
    dependencies: [
      configExtension(DOMRenderExtension, {
        overrides: [
          domOverride([TextNode], {
            $createDOM(node, $next, editor) {
              const dom = $next();
              dom.setAttribute('data-fluid', 'true');
              return dom;
            },
          }),
        ],
      }),
    ],
  }),
);
```

The override above tags every rendered TextNode with
`data-fluid="true"`. It composes with whatever else
`DOMRenderExtension` is configured to do for `TextNode` — both inside
the editor and during HTML export.

:::tip

The same override fires for the editor's in-place reconciliation
(`createDOM`/`updateDOM`/`decorateDOM`) AND for HTML export
(`$exportDOM`). When the override is render-only or export-only,
that's just a matter of which methods you implement.

:::

## Overrides

An override is a `DOMRenderMatch<T>` built with `domOverride`. It
targets a set of node classes (or `'*'`) and supplies any subset of
the following middleware methods:

| Override | When it's called | Replaces / wraps |
| --- | --- | --- |
| `$createDOM` | Reconciler creates the DOM for a node | `node.createDOM` |
| `$updateDOM` | Reconciler updates an existing DOM node | `node.updateDOM` |
| `$decorateDOM` | After create or update, after children reconcile | (additive — no default to replace) |
| `$getDOMSlot` | Reconciler asks "where do children attach?" for an `ElementNode` | `ElementNode.getDOMSlot` |
| `$exportDOM` | Building HTML for clipboard or `$generateHtmlFromNodes` | `node.exportDOM` |
| `$shouldExclude` | Decide whether to omit a node from HTML | `ElementNode.excludeFromCopy` |
| `$shouldInclude` | Decide whether to include a node in HTML, typically based on selection | The default `selection ? node.isSelected(selection) : true` |
| `$extractWithChild` | Include a node because one of its children is selected, even if it wouldn't otherwise be included | `node.extractWithChild` |

All except `$decorateDOM` are `$next()`-style middleware. Calling
`$next()` returns the default (or lower-priority override) value; you
can use it as-is, transform it, or replace it.

:::warning

`$decorateDOM` is the exception: it has no `$next` argument. All
applicable `$decorateDOM` functions are called unconditionally, and
the ordering is equivalent to an implicit `$next` call FIRST — lower-
priority handlers run before higher-priority ones. Use it for in-place
DOM tweaks (setting attributes, applying state-driven styles) where
you always want to layer on top of what others have already done.

:::

### Matching nodes

`domOverride` takes either `'*'` (matches every node) or an array of
`NodeMatch<T>` entries — each entry is either a node `Klass` (e.g.
`TextNode`, `ParagraphNode`) or a `$isNodeGuard` predicate.

```ts
// Apply to all nodes
domOverride('*', { $decorateDOM(node, _, dom) { /* … */ } });

// Apply to TextNode and its subclasses (the Klass form covers subclasses)
domOverride([TextNode], { $createDOM(node, $next) { /* … */ } });

// Apply to a custom guard
domOverride([$isQuoteNode], { $exportDOM(node, $next) { /* … */ } });
```

:::tip

Using the `Klass` form is significantly cheaper than a guard
function — the dispatcher can compile class-based matches into a
direct lookup keyed by node type. Reserve `$isNodeGuard` for cases
where the same DOM behavior should apply to a structurally identified
set of nodes that don't share a common ancestor class.

:::

### Priority

The relative priority of two overrides is determined by:

1. **Wildcards (`'*'`) have highest priority** — they wrap everything.
2. **Predicates** (`$isParagraphNode`) come next.
3. **Subclasses before parents** — an override for `ParagraphNode`
   runs before one for `ElementNode`.
4. **Extensions closer to the root run earlier** — apps wrap
   library overrides.
5. **Extensions depended on later run earlier** — when two
   extensions are at the same depth, the one merged later wins.
6. **Overrides defined later in the same array** — the last entry of
   a `configExtension(DOMRenderExtension, {overrides: […]})` array
   runs first.

`$next()` walks DOWN this priority chain — your override runs first,
then the next-lower override (or eventually the node's default
implementation).

### Writing read-only

The overrides are called during reconciliation and export, both of
which are READ-ONLY contexts. Don't call `editor.update()` or mutate
node state from inside an override — Lexical is in the middle of
producing the DOM for the state it already has. Use a node transform
or update listener if you need to react to changes.

## Worked examples

### State-driven attribute on every node

A common pattern: every node carries some app-defined state (e.g. a
unique `id` from NodeState) and you want it surfaced as a DOM
attribute in both the editor and the HTML export.

```ts
import {createState, $getState, $setState, $getStateChange} from 'lexical';
import {DOMRenderExtension, domOverride} from '@lexical/html';

const idState = createState('id', {
  parse: (v) => (typeof v === 'string' ? v : null),
});

configExtension(DOMRenderExtension, {
  overrides: [
    domOverride('*', {
      $createDOM(node, $next) {
        const dom = $next();
        const id = $getState(node, idState);
        if (id) {
          dom.setAttribute('id', id);
        }
        return dom;
      },
      $updateDOM(nextNode, prevNode, dom, $next) {
        if ($next()) {
          // Lower-priority override requested re-mount; nothing more for us to do
          return true;
        }
        const change = $getStateChange(nextNode, prevNode, idState);
        if (change) {
          const [id] = change;
          if (id) {
            dom.setAttribute('id', id);
          } else {
            dom.removeAttribute('id');
          }
        }
        return false;
      },
    }),
  ],
});
```

Note the `$updateDOM` shape: it returns `true` to tell the reconciler
to unmount and re-create the DOM (e.g. when the element tag would
change), or `false` after performing an in-place update. Calling
`$next()` lets a lower-priority handler signal the re-mount.

### Customizing the slot for an ElementNode

`$getDOMSlot` controls where child nodes attach in the DOM. The
result of `$next()` is the default `ElementDOMSlot` returned by
`ElementNode.getDOMSlot`; you can re-derive a new one to insert an
extra wrapping element while the root createDOM returns one
HTMLElement:

```ts
domOverride([SectionNode], {
  $createDOM(node, $next) {
    const root = $next();
    const wrapper = document.createElement('div');
    wrapper.className = 'section-inner';
    root.appendChild(wrapper);
    return root;
  },
  $getDOMSlot(node, dom, $next) {
    // Children go into .section-inner, not directly in the root <section>
    const inner = dom.querySelector('.section-inner');
    return $next().withElement(inner as HTMLElement);
  },
});
```

### Adjusting HTML export

`$exportDOM` returns a `DOMExportOutput` (`{element, after?, append?, $getChildNodes?}`).
Override it to strip unwanted attributes or rewrite the output for
clipboard / `$generateHtmlFromNodes`:

```ts
domOverride([TextNode], {
  $exportDOM(_node, $next) {
    const result = $next();
    if (isHTMLElement(result.element)) {
      // Drop white-space: pre-wrap when not needed
      const textContent = result.element.textContent || '';
      if (
        result.element.style.whiteSpace === 'pre-wrap' &&
        !/^\s|\s$|\s\s/.test(textContent)
      ) {
        result.element.style.removeProperty('white-space');
        if (result.element.getAttribute('style')?.trim() === '') {
          result.element.removeAttribute('style');
        }
      }
    }
    return result;
  },
});
```

### Selection-aware export filters

`$shouldExclude`, `$shouldInclude`, and `$extractWithChild` together
control which nodes appear in the HTML output, particularly when a
selection is in play. They run in this precedence order (highest to
lowest):

1. `$shouldExclude` returns `true` ⇒ the node is omitted (and if it's
   an ElementNode, its children may still be hoisted in its place).
2. `$shouldInclude` returns `true` ⇒ include the node.
3. `$extractWithChild` returns `true` for any of its children ⇒
   include the node so the included child has its proper wrapper
   (e.g. a `ListNode` when one of its `ListItemNode`s is selected).

```ts
domOverride([CommentMarkNode], {
  // Never include comment marks in exported HTML, but keep their children.
  $shouldExclude: () => true,
});
```

## Render context

Some overrides need to know "is this an export or an editor render?"
or "is this the root call from `$generateDOMFromRoot`?". Use the
render context for that.

### `createRenderState`

Mint a typed context key with `createRenderState`:

```ts
import {createRenderState} from '@lexical/html';

// True iff this serialization is heading to the clipboard (vs. an
// editor reconciliation).
const ClipboardCopyState = createRenderState('clipboardCopy', Boolean);
```

Read it inside an override via `$getRenderContextValue`:

```ts
import {$getRenderContextValue} from '@lexical/html';

domOverride([TableNode], {
  $exportDOM(node, $next, editor) {
    const result = $next();
    if ($getRenderContextValue(ClipboardCopyState, editor)) {
      // Strip editor-only data-* attributes for cleaner clipboard HTML
      // …
    }
    return result;
  },
});
```

Layer values for an entire render call via
`DOMRenderConfig.contextDefaults`:

```ts
configExtension(DOMRenderExtension, {
  contextDefaults: [
    contextValue(ClipboardCopyState, false),
  ],
  overrides: [/* … */],
})
```

Or for a single call via `$withRenderContext`:

```ts
import {$withRenderContext, contextValue} from '@lexical/html';

const html = $withRenderContext(
  [contextValue(ClipboardCopyState, true)],
  editor,
)(() => $generateHtmlFromNodes(editor, selection));
```

### Built-in render states

`@lexical/html` ships two render states out of the box:

- **`RenderContextExport`** — `true` while serializing to HTML
  (`$generateDOMFromNodes`, `$generateDOMFromRoot`,
  `$generateHtmlFromNodes`). Use this to branch behavior between the
  in-editor render and an HTML export.
- **`RenderContextRoot`** — `true` only during the outermost
  `$generateDOMFromRoot` call (i.e. when the root node itself is
  being serialized as a `<div role="textbox">` wrapper). Useful when
  the root node should appear differently in a full-document export
  than as a child of some other element.

## Entry points

Three top-level helpers consume the configured overrides:

| Function | Purpose |
| --- | --- |
| `$generateDOMFromNodes(container, selection?, editor?)` | Walks `RootNode.getChildren()` and appends each to `container`. Sets `RenderContextExport=true`. |
| `$generateDOMFromRoot(container, root?)` | Like the above but includes the root node itself (wrapped in a `<div role="textbox">` by default). Sets `RenderContextExport=true` and `RenderContextRoot=true`. |
| `$generateHtmlFromNodes(editor, selection?)` | Convenience: creates a `<div>`, calls `$generateDOMFromNodes`, returns its `innerHTML`. |

All three are read-only (use them inside `editor.read()` or alongside
your own `editor.update()`).

## Capabilities

Current:

- Override `createDOM`, `updateDOM`, `decorateDOM`, `getDOMSlot`,
  `exportDOM`, `shouldExclude`, `shouldInclude`, `extractWithChild`
  per node class or globally.
- Middleware `$next()` chain composes across extensions.
- Typed render context (`createRenderState`, `RenderContextExport`,
  `RenderContextRoot`) lets overrides branch on the calling mode.
- A single declaration applies to both in-editor reconciliation and
  HTML export.

Future:

- The legacy `node.createDOM` / `node.updateDOM` / `node.exportDOM`
  on each node class continues to work side-by-side; nothing in this
  iteration flips the default. Extensions opt-in to the override
  pipeline, and the resulting overrides supersede the on-class
  defaults for matching nodes.
