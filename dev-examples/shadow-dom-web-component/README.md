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
- **`required` validation** through
  [`ElementInternals.setValidity`](https://developer.mozilla.org/docs/Web/API/ElementInternals/setValidity),
  driven by the editor's plain text content. A `<lexical-editor required>`
  participates in `form.checkValidity()` and the browser's native invalid-form
  UI just like a `<textarea required>`.
- **`disabled` and `readonly` attributes** that flip Lexical's editable
  state. `disabled` also drops the editor out of `FormData` and skips
  validation, matching `<input disabled>`; the
  [`formDisabledCallback`](https://developer.mozilla.org/docs/Web/API/Web_components/Using_custom_elements#form-associated_callbacks)
  picks up an ancestor `<fieldset disabled>` automatically.
- **CSS custom property theming** — the editor exposes `--lexical-bg`,
  `--lexical-fg`, and a small palette of toolbar variables on its host
  element. The page redefines them to recolour the editor; inherited
  custom properties cross the shadow boundary on their own, so the
  internal layout stays private.
- **Toolbar slot** — `<button slot="toolbar-extra">` projects a
  light-DOM button into the editor's toolbar row. The button stays in
  the page (its click never crosses the boundary), but the page can drive
  the editor through the host's public API.
- **Floating selection popover** — the editor emits a composed
  `lexical-selection-rect` `CustomEvent` carrying the live viewport
  rect of the selection inside its shadow root, computed through
  Lexical's `getDOMSelectionRangeAndPoints`. A page-level
  [popover](https://developer.mozilla.org/docs/Web/API/Popover_API)
  positions itself from those coordinates and drives bold / italic /
  underline back through the host's editor.
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
- Submitting the form while the first editor (`required`) is empty: the
  browser blocks the submit and surfaces its native validation tooltip on
  the editor.
- Clicking the **Clear** button next to the notes toolbar — that button
  lives in the light DOM and is projected through the `toolbar-extra`
  slot, then drives the editor through the host's public API.
- Toggling the **Lock the summary editor** checkbox to flip the
  `readonly` attribute on the summary editor, then trying to type
  inside it: the contentEditable refuses input, but the form still
  submits the value.
- Selecting a few words in either editor — the floating B / I / U
  popover appears anchored under the selection (in the page, not the
  shadow root), and clicking it formats the text through the editor.
- Switching the OS or browser between light and dark mode (or
  redefining `--lexical-bg`, `--lexical-fg`, etc. in the page CSS) to
  see how page-side CSS variables retheme each editor without touching
  its shadow root.

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
