# Lexical Web Component (Shadow DOM) Example

A framework-free [Vite](https://vitejs.dev/) app that packages a Lexical
rich-text editor as a **custom element** (`<lexical-editor>`) whose toolbar,
styles, and `contentEditable` all live inside an **open `ShadowRoot`** —
the scenario from
[facebook/lexical#2119](https://github.com/facebook/lexical/issues/2119),
[#6709](https://github.com/facebook/lexical/issues/6709), and
[#8125](https://github.com/facebook/lexical/issues/8125).

Where the sibling [`shadow-dom`](../shadow-dom) example demonstrates a React
app with the editor in a shadow root and the toolbar outside it, this one
demonstrates the inverse packaging: a fully self-contained web component, with
two independent instances on one page, using platform APIs only:

- `Element.attachShadow({mode: 'open'})` in `connectedCallback`, with the
  editor built by `@lexical/extension`'s `buildEditorFromExtensions` and torn
  down (`editor.dispose()`) in `disconnectedCallback`.
- **Form association** through the standard
  [`ElementInternals`](https://developer.mozilla.org/docs/Web/API/ElementInternals)
  API — each editor submits its serialized editor state with the surrounding
  `<form>`, no hidden `<input>` required.
- A composed `input` event that crosses the shadow boundary so the page can
  observe edits.
- Selection inside the shadow root is resolved by Lexical itself via
  `Selection.getComposedRanges` / `Selection.direction`, and focus via
  `ShadowRoot.activeElement`.

## Running

From the repository root:

```sh
pnpm install
pnpm -C dev-examples/shadow-dom-web-component dev
```

Then open the printed URL. Try:

- Typing in both editors and switching between them (each keeps its own
  selection and history).
- Selecting words with `Alt`/`Ctrl` + `Shift` + arrow keys, then using the
  in-shadow toolbar buttons — they reflect the selection's formats.
- Word/line deletion with `Alt`/`Ctrl` + `Backspace`/`Delete`.
- Submitting the form to see each editor's serialized state in the output.

## Tests

[Playwright](https://playwright.dev/) tests in [`tests/`](./tests) cover the
two editors rendering in independent shadow roots, typing and formatting,
editor independence, word deletion, `ElementInternals` form association, and
the composed `input` event crossing the shadow boundary. They start the dev
server automatically:

```sh
pnpm -C dev-examples/shadow-dom-web-component exec playwright install chromium
pnpm -C dev-examples/shadow-dom-web-component test
```
