/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  FORMAT_TEXT_COMMAND,
  getDOMSelectionRangeAndPoints,
  type LexicalEditor,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';

// Styles live inside the shadow root, encapsulated from the page. Colours
// and font are surfaced as CSS custom properties so the page can theme each
// editor from the outside without reaching across the shadow boundary —
// inherited properties cross naturally.
const STYLE_SHEET = `
  :host {
    --lexical-bg: #fff;
    --lexical-fg: #1f2328;
    --lexical-border: #ddd;
    --lexical-toolbar-bg: #fafafa;
    --lexical-toolbar-divider: #eee;
    --lexical-toolbar-hover-bg: #ececec;
    --lexical-toolbar-pressed-bg: #e0e7ff;
    --lexical-toolbar-pressed-border: #c7d2fe;

    display: block;
    border: 1px solid var(--lexical-border);
    border-radius: 8px;
    background: var(--lexical-bg);
    color: var(--lexical-fg);
    font-family: system-ui, -apple-system, sans-serif;
  }
  .toolbar {
    display: flex;
    gap: 4px;
    padding: 6px;
    border-bottom: 1px solid var(--lexical-toolbar-divider);
    background: var(--lexical-toolbar-bg);
    border-radius: 8px 8px 0 0;
  }
  .toolbar button {
    min-width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
  }
  .toolbar button {
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .toolbar button:hover {
    background: var(--lexical-toolbar-hover-bg);
  }
  .toolbar button[aria-pressed='true'] {
    background: var(--lexical-toolbar-pressed-bg);
    border-color: var(--lexical-toolbar-pressed-border);
  }
  .toolbar .toolbar-spacer {
    flex: 1;
  }
  .toolbar ::slotted(button) {
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--lexical-border);
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
  }
  .toolbar ::slotted(button:hover) {
    background: var(--lexical-toolbar-hover-bg);
  }
  .content {
    min-height: 110px;
    padding: 10px 12px;
    outline: none;
    font-size: 15px;
    line-height: 1.5;
  }
  .content p {
    margin: 0 0 6px 0;
  }
  .bold { font-weight: bold; }
  .italic { font-style: italic; }
  .underline { text-decoration: underline; }

  /* The page sees these media queries inside the shadow root the same way
   * it sees them in the light DOM. Each editor adapts to the user's OS
   * preferences on its own — the page only needs to override variables
   * when it wants to opt out of (or force) a colour scheme. */
  @media (prefers-color-scheme: dark) {
    :host {
      --lexical-bg: #1c1d22;
      --lexical-fg: #e6e6e9;
      --lexical-border: #2d2f36;
      --lexical-toolbar-bg: #25262c;
      --lexical-toolbar-divider: #2d2f36;
      --lexical-toolbar-hover-bg: #32343a;
      --lexical-toolbar-pressed-bg: #2a2f4a;
      --lexical-toolbar-pressed-border: #3a4267;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toolbar button,
    .toolbar ::slotted(button) {
      transition: none;
    }
  }
  /* Windows High Contrast / forced-colors map our custom palette to the
   * user's system colours, so the editor stays usable in the high-contrast
   * theme without losing focus indicators or borders. */
  @media (forced-colors: active) {
    :host {
      --lexical-border: CanvasText;
      --lexical-toolbar-divider: CanvasText;
      --lexical-toolbar-pressed-border: Highlight;
    }
    .toolbar button[aria-pressed='true'] {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
  }
`;

const TEXT_FORMATS: readonly TextFormatType[] = ['bold', 'italic', 'underline'];

/**
 * `<lexical-editor>`: a self-contained rich-text editor web component.
 *
 * Everything — toolbar, contentEditable, styles — lives inside an open
 * ShadowRoot attached in `connectedCallback`, demonstrating that Lexical
 * works fully encapsulated behind a shadow boundary using platform selection
 * APIs (Selection.getComposedRanges / ShadowRoot.activeElement).
 *
 * The element is form-associated through the standard ElementInternals API:
 * its form value is the serialized Lexical editor state (JSON), updated on
 * every editor update. It also dispatches a composed `input` event so light
 * DOM listeners can observe edits.
 */
export class LexicalEditorElement extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    'required',
    'disabled',
    'readonly',
    'aria-label',
  ];

  private internals: ElementInternals;
  private editor: LexicalEditor | null = null;
  private disposeEditor: (() => void) | null = null;
  private formDisabled = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  /** The serialized Lexical editor state (JSON), as submitted with forms. */
  get value(): string {
    return this.editor
      ? JSON.stringify(this.editor.getEditorState().toJSON())
      : '';
  }

  set value(serializedEditorState: string) {
    const editor = this.editor;
    if (editor !== null && serializedEditorState !== '') {
      editor.setEditorState(editor.parseEditorState(serializedEditorState));
      this.updateValidity();
    }
  }

  /**
   * Whether this editor's `<form>` should block submission when it has no
   * text content. Mirrors `<input required>` / `<textarea required>`.
   */
  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(value: boolean) {
    if (value) {
      this.setAttribute('required', '');
    } else {
      this.removeAttribute('required');
    }
  }

  /**
   * Mirrors `<input disabled>`. A disabled editor is non-editable, drops out
   * of `FormData` (the standard form-associated custom-element behaviour),
   * and skips constraint validation.
   */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Mirrors `<input readonly>`. A read-only editor is non-editable but still
   * submits its value and participates in constraint validation.
   */
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(value: boolean) {
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }

  /** The underlying LexicalEditor, for programmatic access from the page. */
  getEditor(): LexicalEditor | null {
    return this.editor;
  }

  // Mirror the standard constraint-validation surface from `<input>` /
  // `<textarea>`. ElementInternals tracks the state but does not auto-expose
  // it on the host element.
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /**
   * The editor's text content, used for the `required` empty check. Mirrors
   * what a server-side validator would see when stripping the rich-text JSON
   * down to plain text.
   */
  private getPlainText(): string {
    return this.editor
      ? this.editor.getEditorState().read(() => $getRoot().getTextContent())
      : '';
  }

  private updateValidity(): void {
    if (!this.required) {
      this.internals.setValidity({});
    } else if (this.getPlainText().trim().length === 0) {
      // Find the toolbar's first focusable button as the anchor for the
      // browser's validation tooltip when the editor itself isn't focusable.
      const shadow = this.shadowRoot;
      const anchor =
        shadow !== null
          ? ((shadow.querySelector('.content') as HTMLElement | null) ?? this)
          : this;
      this.internals.setValidity(
        {valueMissing: true},
        'Please fill in this field.',
        anchor,
      );
    } else {
      this.internals.setValidity({});
    }
    // Reflect the validity state on the contentEditable through
    // `aria-invalid`, which screen readers expose on focus, and let the
    // page hook a visible error message through a composed CustomEvent.
    // (ARIA's `aria-describedby` can't reference IDs across the shadow
    // boundary in practice, so the page side has to wire up its own
    // visible message and Lexical can't do that part for it.)
    const contentEditable = this.findContentEditable();
    if (contentEditable !== null) {
      contentEditable.setAttribute(
        'aria-invalid',
        this.internals.validity.valid ? 'false' : 'true',
      );
    }
    this.dispatchEvent(
      new CustomEvent('lexical-validity-change', {
        bubbles: true,
        composed: true,
        detail: {
          message: this.internals.validationMessage,
          valid: this.internals.validity.valid,
        },
      }),
    );
  }

  /**
   * Mirror the host's `aria-label` onto the contentEditable so screen
   * readers announce the editor with the page-supplied label rather than
   * the generic "edit text" prompt.
   */
  private syncAriaLabel(): void {
    const contentEditable = this.findContentEditable();
    if (contentEditable === null) {
      return;
    }
    const fromAria = this.getAttribute('aria-label');
    const fromName = this.getAttribute('name');
    const label =
      fromAria !== null
        ? fromAria
        : fromName !== null
          ? fromName
          : 'Rich text editor';
    contentEditable.setAttribute('aria-label', label);
  }

  private findContentEditable(): HTMLElement | null {
    const shadow = this.shadowRoot;
    if (shadow === null) {
      return null;
    }
    return shadow.querySelector<HTMLElement>('.content');
  }

  attributeChangedCallback(name: string): void {
    if (name === 'required') {
      this.updateValidity();
    } else if (name === 'disabled' || name === 'readonly') {
      this.updateEditableState();
    } else if (name === 'aria-label') {
      this.syncAriaLabel();
    }
  }

  formResetCallback(): void {
    if (this.editor !== null) {
      this.editor.update(() => {
        $getRoot().clear().append($createParagraphNode());
      });
      this.internals.setFormValue(this.value);
      this.updateValidity();
    }
  }

  // Form-associated custom elements receive this when an ancestor `<form>`
  // or `<fieldset>` toggles its disabled state. Treated the same as the
  // element's own `disabled` attribute.
  formDisabledCallback(isDisabled: boolean): void {
    this.formDisabled = isDisabled;
    this.updateEditableState();
  }

  /**
   * Fires whenever the host associates with or disassociates from a
   * `<form>` (e.g. the element is moved into / out of one programmatically).
   * Surfaced as a composed CustomEvent so a page-level handler can drop
   * form-scoped listeners as the host changes forms without having to
   * walk the DOM itself.
   */
  formAssociatedCallback(form: HTMLFormElement | null): void {
    this.dispatchEvent(
      new CustomEvent('lexical-form-associated', {
        bubbles: true,
        composed: true,
        detail: {form},
      }),
    );
  }

  /**
   * Form state restore — fires on bfcache navigation (`reason: 'restore'`)
   * and on the browser's autocomplete restore (`reason: 'autocomplete'`).
   * The state argument is whatever this host last passed to
   * `internals.setFormValue` (a serialized editor state JSON string in
   * our case), so a round-trip through `parseEditorState` brings the
   * editor back to where it was before the navigation.
   */
  formStateRestoreCallback(
    state: File | string | FormData,
    _reason: 'autocomplete' | 'restore',
  ): void {
    if (typeof state !== 'string' || state === '' || this.editor === null) {
      return;
    }
    this.editor.setEditorState(this.editor.parseEditorState(state));
    this.internals.setFormValue(this.value);
    this.updateValidity();
  }

  /** The `<form>` the host is currently associated with, or null. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  private updateEditableState(): void {
    if (this.editor !== null) {
      this.editor.setEditable(
        !this.disabled && !this.readOnly && !this.formDisabled,
      );
    }
  }

  connectedCallback(): void {
    // On re-attach the shadowRoot persists from the previous mount but
    // disconnectedCallback has disposed the editor. Reuse the existing
    // shadow root and clear its children so the flow below rebuilds them
    // cleanly instead of leaving the element with editor === null.
    const shadow =
      this.shadowRoot !== null
        ? this.shadowRoot
        : this.attachShadow({mode: 'open'});
    while (shadow.firstChild !== null) {
      shadow.removeChild(shadow.firstChild);
    }

    const style = document.createElement('style');
    style.textContent = STYLE_SHEET;
    shadow.appendChild(style);

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.setAttribute('role', 'toolbar');
    shadow.appendChild(toolbar);
    // A named slot at the end of the toolbar lets the page project its own
    // buttons (`<button slot="toolbar-extra">…</button>`) into the editor's
    // toolbar row. Slotted nodes stay in the light DOM — their events bubble
    // out to page-level listeners — but they render visually inside the
    // shadow root alongside our built-in toolbar buttons.
    const toolbarSpacer = document.createElement('span');
    toolbarSpacer.className = 'toolbar-spacer';
    const toolbarSlot = document.createElement('slot');
    toolbarSlot.name = 'toolbar-extra';

    const contentEditable = document.createElement('div');
    contentEditable.className = 'content';
    contentEditable.contentEditable = 'true';
    // Surface the editor to assistive tech the same way a built-in
    // `<input type="text">` would. `contenteditable="true"` already gets an
    // implicit textbox role, but spelling it out keeps the intent visible
    // and makes the ARIA review at PR time simple. `aria-multiline` is
    // what tells screen readers to announce Enter as "newline" instead of
    // "submit".
    contentEditable.setAttribute('role', 'textbox');
    contentEditable.setAttribute('aria-multiline', 'true');
    shadow.appendChild(contentEditable);

    const initialText =
      this.getAttribute('placeholder-text') !== null
        ? (this.getAttribute('placeholder-text') as string)
        : '';
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode(initialText)),
          );
        },
        dependencies: [RichTextExtension, HistoryExtension],
        name: `lexical-editor/${this.getAttribute('name') || 'anonymous'}`,
        namespace: 'lexical-editor-element',
        theme: {
          text: {bold: 'bold', italic: 'italic', underline: 'underline'},
        },
      }),
    );
    editor.setRootElement(contentEditable);
    // Mirror `@lexical/react`'s ContentEditable: flip the DOM attribute when
    // Lexical's editable flag changes, so toggling `disabled` / `readonly`
    // on the host actually blocks input on the contentEditable.
    const removeEditableListener = editor.registerEditableListener(editable => {
      contentEditable.contentEditable = editable ? 'true' : 'false';
    });
    this.editor = editor;
    // Initialize the form value so a submit before the user types still
    // produces a non-empty serialized state, mirroring `<input value="...">`.
    this.internals.setFormValue(this.value);
    this.syncAriaLabel();
    this.updateValidity();
    this.updateEditableState();

    const formatButtons = new Map<TextFormatType, HTMLButtonElement>();
    const addButton = (label: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      // Keep focus (and therefore selection) in the editor when clicked.
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', onClick);
      toolbar.appendChild(button);
      return button;
    };
    for (const format of TEXT_FORMATS) {
      formatButtons.set(
        format,
        addButton(format[0].toUpperCase(), () =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, format),
        ),
      );
    }
    addButton('↺', () => editor.dispatchCommand(UNDO_COMMAND, undefined));
    addButton('↻', () => editor.dispatchCommand(REDO_COMMAND, undefined));
    toolbar.appendChild(toolbarSpacer);
    toolbar.appendChild(toolbarSlot);

    const removeUpdateListener = editor.registerUpdateListener(
      ({editorState, dirtyElements, dirtyLeaves}) => {
        // Reflect the selection's formats in the toolbar, proving selection
        // reads work inside the shadow root. Runs on every update so pure
        // selection changes still refresh the active-format indicators.
        editorState.read(() => {
          const selection = $getSelection();
          for (const [format, button] of formatButtons) {
            button.setAttribute(
              'aria-pressed',
              String(
                $isRangeSelection(selection) && selection.hasFormat(format),
              ),
            );
          }
          // Surface the live selection rect to the page so a light-DOM
          // floating popover can anchor to text inside the shadow root.
          // `getDOMSelectionRangeAndPoints` un-retargets the boundary
          // points across the shadow boundary and returns a live Range, so
          // `getBoundingClientRect()` gives viewport coordinates the page
          // can use directly. Collapsed (or no) range -> rect is null.
          let rect: DOMRectInit | null = null;
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            const native = contentEditable.ownerDocument.getSelection();
            if (native !== null) {
              const {range} = getDOMSelectionRangeAndPoints(
                native,
                contentEditable,
              );
              const measured =
                range !== null ? range.getBoundingClientRect() : null;
              if (
                measured !== null &&
                (measured.width !== 0 || measured.height !== 0)
              ) {
                rect = {
                  height: measured.height,
                  width: measured.width,
                  x: measured.x,
                  y: measured.y,
                };
              }
            }
          }
          this.dispatchEvent(
            new CustomEvent('lexical-selection-rect', {
              bubbles: true,
              composed: true,
              detail: {rect},
            }),
          );
        });
        // Form value + bubbling input event mirror an HTMLInputElement: only
        // fire on real content changes, not on pure selection updates, so
        // page-level form/input listeners aren't woken up for caret moves.
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
          return;
        }
        // Standard form association: the form value is the serialized state.
        this.internals.setFormValue(JSON.stringify(editorState.toJSON()));
        // Re-evaluate `required` validity now that the text content changed.
        this.updateValidity();
        // Composed so it crosses the shadow boundary to page listeners.
        this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
      },
    );

    this.disposeEditor = () => {
      removeUpdateListener();
      removeEditableListener();
      editor.dispose();
    };
  }

  disconnectedCallback(): void {
    if (this.disposeEditor !== null) {
      this.disposeEditor();
      this.disposeEditor = null;
      this.editor = null;
    }
  }
}

export function defineLexicalEditorElement(tagName = 'lexical-editor'): void {
  if (customElements.get(tagName) === undefined) {
    customElements.define(tagName, LexicalEditorElement);
  }
}
