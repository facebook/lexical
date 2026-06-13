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

### Requirements and fallback

- **Open shadow roots only.** A closed shadow root (`{mode: 'closed'}`) hides
  its contents from these APIs and is not supported.
- **`Selection.getComposedRanges` is required**, which is available in recent
  versions of Chrome/Edge, Safari, and Firefox — see the
  [browser compatibility table](https://developer.mozilla.org/docs/Web/API/Selection/getComposedRanges#browser_compatibility).
  On older engines the editor still works in the light DOM and degrades
  gracefully (it falls back to the standard, light‑DOM‑correct reads) rather
  than breaking.

### Styling

Shadow trees do not inherit the document's stylesheets, so your editor/theme
CSS must be placed inside the shadow root (e.g. a `<style>` element appended to
the shadow root, an adopted stylesheet, or cloned `<link>`/`<style>` nodes).
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

## Reading the DOM selection in your own code

If a plugin reads the DOM selection or the focused element directly, use the
shadow/iframe‑aware helpers exported from `lexical` instead of
`Selection.anchorNode` / `document.activeElement`, so it keeps working in these
contexts (all are no‑ops in the plain light DOM):

| Instead of                          | Use                                                   |
| ----------------------------------- | ----------------------------------------------------- |
| `selection.anchorNode` / offsets    | `getDOMSelectionPoints(selection, rootElement)`       |
| `selection.getRangeAt(0)`           | `getDOMSelectionRange(selection, rootElement)`        |
| `document.activeElement === el`     | `getActiveElement(el) === el`                         |
| deepest focused element             | `getActiveElementDeep(document)`                      |

## Examples

Runnable examples live in the repository:

- [`dev-examples/shadow-dom`](https://github.com/facebook/lexical/tree/main/dev-examples/shadow-dom)
  — a React editor inside a shadow root with a light‑DOM toolbar.
- [`dev-examples/shadow-dom-web-component`](https://github.com/facebook/lexical/tree/main/dev-examples/shadow-dom-web-component)
  — a framework‑free `<lexical-editor>` custom element, form‑associated via
  `ElementInternals`.
- [`examples/vanilla-js-iframe`](https://github.com/facebook/lexical/tree/main/examples/vanilla-js-iframe)
  — an editor rendered into an `<iframe>`.
