---
sidebar_label: Shadow DOM and iframes
---

# Shadow DOM and iframes

A Lexical editor works when its `contentEditable` lives inside an **open**
[DOM `ShadowRoot`](https://developer.mozilla.org/docs/Web/API/ShadowRoot) (for
example inside a [web component](https://developer.mozilla.org/docs/Web/API/Web_components))
or inside an `<iframe>` document. Both are supported out of the box — you only
have to point the editor at the right root element.

## Embedding in a shadow root

Attach an open shadow root, render a `contentEditable` inside it, and pass that
element to `editor.setRootElement` (or, with `@lexical/react`, portal the
`ContentEditable` into the shadow root — React context flows across the portal,
so the editor is built exactly as it would be in the light DOM):

```js
const host = document.querySelector('#editor-host');
const shadow = host.attachShadow({mode: 'open'});
const contentEditable = document.createElement('div');
contentEditable.contentEditable = 'true';
shadow.appendChild(contentEditable);

editor.setRootElement(contentEditable);
```

Lexical detects the enclosing shadow root from the root element and resolves
selection through it. There is nothing else to configure.

### Why it needs platform support

Inside a shadow tree the browser **retargets** the document's selection to the
shadow host: `Selection.anchorNode`/`focusNode` and `Selection.getRangeAt`
report the host element, not the node the caret is actually in, and
`document.activeElement` reports the host rather than the focused element.
Lexical works around this using only standard platform APIs:

- Selection is read with
  [`Selection.getComposedRanges`](https://developer.mozilla.org/docs/Web/API/Selection/getComposedRanges)
  and [`Selection.direction`](https://developer.mozilla.org/docs/Web/API/Selection/direction),
  which return the real (un‑retargeted) boundary points.
- Focus is read with
  [`ShadowRoot.activeElement`](https://developer.mozilla.org/docs/Web/API/DocumentOrShadowRoot/activeElement)
  via [`Node.getRootNode`](https://developer.mozilla.org/docs/Web/API/Node/getRootNode).
- Caret movement and word/line deletion use the native `Selection.modify`, and
  selection is written with `Selection.setBaseAndExtent`, both of which operate
  on shadow‑tree nodes directly.
- Drop targets and image-drag hit‑tests resolve through
  [`Document.caretPositionFromPoint`](https://developer.mozilla.org/docs/Web/API/Document/caretPositionFromPoint)
  with the `shadowRoots` option so the dropped point lands on the real node
  rather than the retargeted host.

### Browser support

The shadow-aware path requires the platform APIs listed above. Lexical falls
back to the light‑DOM reads when those APIs are missing, so editors that don't
live in a shadow tree keep working on any engine the rest of Lexical supports.

| Platform API | Used for | Chrome / Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| `Selection.getComposedRanges` | Reading the un‑retargeted boundary points | 121+ | 126+ | 17.4+ |
| `Selection.direction` | Mapping the composed range back onto anchor/focus | 121+ | 124+ | 17.4+ |
| `ShadowRoot.activeElement` | Resolving the focused element through the host | All modern | All modern | All modern |
| `Document.caretPositionFromPoint({shadowRoots})` | Shadow-aware drop / drag hit-tests | 128+ | (not yet) | 18.1+ |

Lexical also supports the legacy variadic form of `getComposedRanges` shipped by
Safari 17 / 17.1, automatically choosing the dictionary or variadic call shape
at runtime.

### Closed shadow roots

A closed shadow root (`{mode: 'closed'}`) hides its contents from outside code:
`Node.getRootNode({composed: false})` returns the host on every external probe,
and `Selection.getComposedRanges({shadowRoots})` ignores the closed root. The
editor inside a closed shadow root cannot read its own selection through the
host, so closed shadow roots are **not supported**.

If you need style/markup encapsulation without selection isolation, mount the
editor in an open shadow root with `delegatesFocus: true` instead — outside
code can still observe focus and selection while CSS and markup remain
encapsulated.

### Styling

Shadow trees do not inherit the document's stylesheets, so your editor/theme
CSS must be placed inside the shadow root. Three common patterns:

- A `<style>` element appended to the shadow root.
- A
  [constructable stylesheet](https://developer.mozilla.org/docs/Web/API/CSSStyleSheet#constructor)
  shared via `shadowRoot.adoptedStyleSheets` — preferred when one stylesheet
  serves many editor instances.
- Cloning the page's existing `<link rel="stylesheet">` / `<style>` nodes into
  the shadow root (what the playground's `ShadowDomWrapper` does so it can
  reuse Vite's HMR-managed stylesheets).

This is a property of Shadow DOM, not of Lexical.

## Embedding in an iframe

An editor whose root element belongs to an `<iframe>` document is also
supported. Lexical reads the editor's `window`/`document` from the root
element (`rootElement.ownerDocument.defaultView`), so selection and focus are
resolved against the iframe rather than the top‑level document:

```js
const iframeDoc = iframe.contentDocument;
const contentEditable = iframeDoc.querySelector('#editor');

// createEditor / setRootElement can run in the parent frame; the editor uses
// the iframe's own window and document for selection and focus.
editor.setRootElement(contentEditable);
```

Selection inside an iframe is **not** retargeted (an iframe is a separate
document, not a shadow boundary), so `getComposedRanges` is not involved here —
the iframe's own selection already reports the correct nodes.

## Shadow-aware helpers

If a plugin reads the DOM selection or the focused element directly, use the
shadow/iframe‑aware helpers exported from `lexical` instead of
`Selection.anchorNode` / `document.activeElement`, so it keeps working in these
contexts. In the plain light DOM each helper degrades to the standard read
without any extra cost.

| Instead of | Use |
| --- | --- |
| `Selection.anchorNode` / `anchorOffset` / `focusNode` / `focusOffset` | `getDOMSelectionPoints(selection, rootElement)` |
| `selection.getRangeAt(0)` | `getDOMSelectionRange(selection, rootElement)` |
| Both shapes from one read | `getDOMSelectionRangeAndPoints(selection, rootElement)` |
| `selection.getComposedRanges` raw call | `getComposedStaticRange(selection, rootElement)` |
| `document.activeElement === el` | `getActiveElement(el) === el` |
| Deepest focused element through nested shadow trees | `getActiveElementDeep(document)` |
| `event.target` on a `composed: true` event listening above the shadow boundary | `getComposedEventTarget(event)` |
| `node.getRootNode() instanceof ShadowRoot` (cross‑realm‑safe) | `isDOMShadowRoot(node)` |
| Walking up to discover enclosing shadow roots | `getDOMShadowRoots(node)` |

All nine helpers are marked `@experimental` while the surface stabilizes — the
return shape may change, but the behavior in the light DOM is stable.

### `getDOMSelectionPoints` read semantics

`getDOMSelectionPoints` has two return paths:

- **Light DOM**: the return aliases `domSelection`, so subsequent reads
  reflect any post-call selection changes. The aliasing is intentional — each
  `Selection` property read forces a synchronous style/layout recalculation,
  so `$updateDOMSelection` defers these reads until they are actually needed.
- **Shadow DOM**: the return is a snapshot taken at call time.

Read the four points immediately after the call, or compare identity via
`points === domSelection` to detect when the return aliases `domSelection`,
rather than caching the returned reference across selection mutations.

## Form association

A Lexical editor inside a [form-associated custom
element](https://developer.mozilla.org/docs/Web/API/Web_components#form-associated_custom_elements)
participates in a `<form>` like any built-in form control: submission carries
the editor's value, form reset clears it, and validation flows through. The
sketch:

```js
class LexicalEditorElement extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  get value() {
    return this.editor
      ? JSON.stringify(this.editor.getEditorState().toJSON())
      : '';
  }

  set value(serialized) {
    if (this.editor && serialized !== '') {
      this.editor.setEditorState(this.editor.parseEditorState(serialized));
    }
  }

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({mode: 'open'});
    const contentEditable = document.createElement('div');
    contentEditable.contentEditable = 'true';
    shadow.appendChild(contentEditable);

    const editor = buildEditorFromExtensions(
      defineExtension({name: 'lexical-editor-element'}),
    );
    editor.setRootElement(contentEditable);
    this.editor = editor;

    // Seed the form value so a submit before the user types still produces
    // a non-empty serialized state, mirroring `<input value="...">`.
    this.internals.setFormValue(this.value);

    editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
      // Only fire on real content changes, not on pure selection updates —
      // matches HTMLInputElement's `input` event contract.
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      this.internals.setFormValue(this.value);
      this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    });
  }
}
```

Two contract details worth respecting:

- **Mirror `<input>`'s `input` event.** Fire `input` only on content changes,
  not on pure selection updates. Without the dirty-leaf/element gate every
  caret move would wake the form's `oninput` listeners.
- **Seed the initial value.** Without an initial `setFormValue` call, a form
  submission before the user types carries an empty value because the update
  listener has not fired yet.

The full reference implementation is in
[`dev-examples/shadow-dom-web-component`](https://github.com/facebook/lexical/tree/main/dev-examples/shadow-dom-web-component).

## Common pitfalls and how the helpers solve them

The shadow-aware helpers fix concrete failure modes that come up when you move
an existing editor into a shadow root. The recurring ones:

### `rootElement.contains(...)` always returns false

Listeners attached above the shadow boundary (the editor `window`,
`document.addEventListener('selectionchange')`, popups portaled to
`document.body`, etc.) receive the **retargeted** event: `event.target` is the
shadow host, not the actual clicked element. `rootElement.contains(host)` is
false because the host lives in the light DOM, so any "click inside the
editor?" gate rejects the event.

Resolve through the composed path:

```js
const target = getComposedEventTarget(event);
if (target instanceof Node && rootElement.contains(target)) {
  // click really did land inside the shadow-hosted editor
}
```

### `document.activeElement` reports the host

When focus is inside an open shadow tree `document.activeElement` is the host
element, not the focused contenteditable. Code that checks "is the editor
focused?" by `document.activeElement === rootElement` therefore always reads
false.

Use the shadow-aware helper, which is identical to `document.activeElement` in
the light DOM and descends `ShadowRoot.activeElement` otherwise:

```js
if (getActiveElement(rootElement) === rootElement) { ... }
```

For probes that may need to descend several nested shadow roots (e.g. an
editor whose decorator embeds a web component), use `getActiveElementDeep`.

### Popups and dropdowns close on their own opening click

A common pattern is "click the button → open dropdown → outside-click
handler closes the dropdown". The outside-click handler usually compares
`button.contains(event.target)` to decide whether the click was inside the
button. Inside a shadow tree `event.target` is the shadow host, so the check
returns false and the dropdown closes on the same click that opened it.

The fix is `getComposedEventTarget(event)` inside the outside-click handler,
the same way Lexical's `LexicalMenu` and the playground's `DropDown` use it.

### Drop targets fall on the wrong node

`document.caretRangeFromPoint(x, y)` and the no-argument
`document.caretPositionFromPoint(x, y)` both return the shadow host when the
pointer is over shadow content. Image drop and drag-to-position therefore
land on the host, not the textnode under the cursor.

`@lexical/clipboard/caretFromPoint` uses the
`caretPositionFromPoint(x, y, {shadowRoots})` form when a `rootElement` lives
inside a shadow tree, and verifies the returned offset node actually landed
inside one of the requested shadow roots — engines that silently ignore the
option (an empty implementation returns a retargeted host) fall through to
the legacy paths.

### Style sheets removed in the light DOM linger inside the shadow

If your shadow mount mirrors `<style>` / `<link>` nodes from `document.head`
into the shadow root and listens for additions via `MutationObserver`, watch
for *removals* too — otherwise stylesheets removed by HMR or a runtime theme
swap stay in the shadow root.

The playground's `ShadowDomWrapper` tracks an `original → clone` map and
mirrors removals as well as additions.

## Migrating an existing light-DOM editor

The shape that works in the light DOM keeps working in a shadow root — the
checklist is mostly about removing pre-shadow workarounds.

1. **Replace direct selection reads** — search your code for
   `Selection.anchorNode`, `Selection.focusNode`,
   `Selection.getRangeAt(0)`, and `document.querySelector('[contenteditable]')`
   when used as part of "is this inside the editor?" or "what's at the caret?".
   Route each through `getDOMSelectionPoints` /
   `getDOMSelectionRange` / `getActiveElement` instead.
2. **Replace direct event-target reads** above the shadow boundary —
   `event.target` becomes `getComposedEventTarget(event)`.
3. **Style the shadow root** — adopt or clone the editor/theme CSS into the
   shadow. CSS variables inherit through the shadow boundary; class names and
   declarations do not.
4. **Test the focus-restoration paths** — outside-click handlers, blur-then-
   refocus, "did the editor lose focus?" probes. These usually need
   `getActiveElement(rootElement)` rather than `document.activeElement`.
5. **Re-verify popups and floating UI** — most floating elements portal into
   `document.body` and resolve mouse hover with `element.getRootNode()
   .elementFromPoint(x, y)`. The shadow-aware variant is the same call shape;
   the API change is `event.target → getComposedEventTarget(event)` and a
   guard against the popup being detached.

## Examples

Runnable examples live in the repository:

- [`dev-examples/shadow-dom`](https://github.com/facebook/lexical/tree/main/dev-examples/shadow-dom)
  — a React editor inside a shadow root with a light‑DOM toolbar.
- [`dev-examples/shadow-dom-web-component`](https://github.com/facebook/lexical/tree/main/dev-examples/shadow-dom-web-component)
  — a framework‑free `<lexical-editor>` custom element, form‑associated via
  `ElementInternals`.
- [`examples/vanilla-js-iframe`](https://github.com/facebook/lexical/tree/main/examples/vanilla-js-iframe)
  — an editor rendered into an `<iframe>`.
- The playground's **Render in Shadow DOM** setting toggles the same editor
  between light and shadow mounts, useful for spot-checking your plugins
  against both modes.