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
  type LexicalEditor,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';

// All of the editor's styles live inside the shadow root, fully encapsulated
// from the page. Nothing leaks in or out.
const STYLE_SHEET = `
  :host {
    display: block;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .toolbar {
    display: flex;
    gap: 4px;
    padding: 6px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
    border-radius: 8px 8px 0 0;
  }
  .toolbar button {
    min-width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
  }
  .toolbar button:hover {
    background: #ececec;
  }
  .toolbar button[aria-pressed='true'] {
    background: #e0e7ff;
    border-color: #c7d2fe;
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
  static observedAttributes = [];

  private internals: ElementInternals;
  private editor: LexicalEditor | null = null;
  private disposeEditor: (() => void) | null = null;

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
    }
  }

  /** The underlying LexicalEditor, for programmatic access from the page. */
  getEditor(): LexicalEditor | null {
    return this.editor;
  }

  connectedCallback(): void {
    // On re-attach the shadowRoot persists from the previous mount but
    // disconnectedCallback has disposed the editor. Reuse the existing
    // shadow root and clear its children so the flow below rebuilds them
    // cleanly instead of leaving the element with editor === null.
    const shadow = this.shadowRoot ?? this.attachShadow({mode: 'open'});
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

    const contentEditable = document.createElement('div');
    contentEditable.className = 'content';
    contentEditable.contentEditable = 'true';
    shadow.appendChild(contentEditable);

    const initialText = this.getAttribute('placeholder-text') ?? '';
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
    this.editor = editor;
    // Initialize the form value so a submit before the user types still
    // produces a non-empty serialized state, mirroring `<input value="...">`.
    this.internals.setFormValue(this.value);

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
        });
        // Form value + bubbling input event mirror an HTMLInputElement: only
        // fire on real content changes, not on pure selection updates, so
        // page-level form/input listeners aren't woken up for caret moves.
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
          return;
        }
        // Standard form association: the form value is the serialized state.
        this.internals.setFormValue(JSON.stringify(editorState.toJSON()));
        // Composed so it crosses the shadow boundary to page listeners.
        this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
      },
    );

    this.disposeEditor = () => {
      removeUpdateListener();
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
