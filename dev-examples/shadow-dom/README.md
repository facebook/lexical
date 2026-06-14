# Lexical Shadow DOM Example

A minimal [Vite](https://vitejs.dev/) + React app that renders a Lexical
rich-text editor **inside an open DOM `ShadowRoot`**, and a formatting toolbar
**outside** it in the light DOM.

It demonstrates that Lexical works across a shadow boundary using platform APIs
only — no emulation of browser selection facilities:

- **Reading selection** uses
  [`Selection.getComposedRanges`](https://developer.mozilla.org/docs/Web/API/Selection/getComposedRanges)
  and [`Selection.direction`](https://developer.mozilla.org/docs/Web/API/Selection/direction),
  because `Selection.anchorNode` / `getRangeAt` are retargeted to the shadow
  host when the selection is inside a shadow tree.
- **Reading focus** uses
  [`ShadowRoot.activeElement`](https://developer.mozilla.org/docs/Web/API/DocumentOrShadowRoot/activeElement),
  because `document.activeElement` only reports the outermost shadow host.
- **Writing selection** uses the native `Selection.setBaseAndExtent`, and
  keyboard navigation / word + line deletion use the native `Selection.modify`,
  both of which operate on shadow-tree nodes directly.

## How it works

[`ShadowRoot.tsx`](./src/ShadowRoot.tsx) attaches an open shadow root to a host
`<div>` with `Element.attachShadow`, then portals its children (including the
Lexical `contentEditable`) into the shadow tree with `createPortal`. React
context flows across the portal, so the editor is built exactly as it would be
in the light DOM — only its DOM lives behind the shadow boundary. The editor's
CSS is injected as a `<style>` element inside the shadow root, since shadow
trees do not inherit the document's stylesheets.

The toolbar in [`Toolbar.tsx`](./src/Toolbar.tsx) lives in the light DOM and
dispatches commands (`FORMAT_TEXT_COMMAND`, undo/redo) that act on the editor's
selection inside the shadow tree.

## Running

From the repository root:

```sh
pnpm install
pnpm -C dev-examples/shadow-dom dev
```

Then open the printed URL. Try:

- Typing, then selecting words with `Alt`/`Ctrl` + `Shift` + arrow keys.
- Pressing **Bold** / **Italic** / **Underline** in the (light-DOM) toolbar.
- Word and line deletion with `Alt`/`Ctrl` + `Backspace`/`Delete`.

## Tests

[Playwright](https://playwright.dev/) tests in [`tests/`](./tests) cover
rendering into the shadow root, typing, formatting a shadow-DOM selection from
the light-DOM toolbar, and word deletion. They start the dev server
automatically:

```sh
pnpm -C dev-examples/shadow-dom exec playwright install chromium
pnpm -C dev-examples/shadow-dom test
```
