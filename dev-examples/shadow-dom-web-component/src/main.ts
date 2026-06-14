/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {
  $createParagraphNode,
  $getRoot,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from 'lexical';

import {
  defineLexicalEditorElement,
  type LexicalEditorElement,
} from './LexicalEditorElement';

defineLexicalEditorElement();

// Demonstrate the form association: submitting the form shows the value each
// editor contributed through ElementInternals.setFormValue.
const form = document.querySelector<HTMLFormElement>('#demo-form')!;
const output = document.querySelector<HTMLPreElement>('#form-output')!;
form.addEventListener('submit', event => {
  event.preventDefault();
  const lines: string[] = [];
  for (const [name, value] of new FormData(form)) {
    const text = JSON.stringify(JSON.parse(String(value)), null, 1).replaceAll(
      '\n',
      ' ',
    );
    lines.push(`${name}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`);
  }
  output.textContent = lines.join('\n\n');
});

// Demonstrate the composed `input` event crossing the shadow boundary.
const status = document.querySelector<HTMLElement>('#last-edited')!;
for (const editorElement of document.querySelectorAll<LexicalEditorElement>(
  'lexical-editor',
)) {
  editorElement.addEventListener('input', () => {
    status.textContent = `Last edited: ${editorElement.getAttribute('name')}`;
  });
}

// The Clear button is a light-DOM child of <lexical-editor name="notes">
// projected through the `toolbar-extra` slot. Its click stays in the page,
// crosses no shadow boundary, and drives the editor through the host's
// public API — Lexical sees nothing different from a built-in toolbar
// button click.
const clearButton = document.querySelector<HTMLButtonElement>('[data-clear]');
if (clearButton !== null) {
  clearButton.addEventListener('click', () => {
    const host = document.querySelector<LexicalEditorElement>(
      'lexical-editor[name="notes"]',
    );
    const editor = host !== null ? host.getEditor() : null;
    if (editor !== null) {
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode());
      });
    }
  });
}

// Light-DOM floating popover anchored to the live selection inside either
// editor's shadow root. The page never reaches into the shadow root: the
// editor emits a composed `lexical-selection-rect` CustomEvent carrying
// viewport coordinates, and the popover positions itself from those.
type SelectionRectDetail = {
  rect: {height: number; width: number; x: number; y: number} | null;
};
const popover = document.querySelector<HTMLElement>('#format-popover')!;
let activeEditor: LexicalEditorElement | null = null;

document.addEventListener('lexical-selection-rect', event => {
  const detail = (event as CustomEvent<SelectionRectDetail>).detail;
  if (detail.rect === null) {
    if (popover.matches(':popover-open')) {
      popover.hidePopover();
    }
    activeEditor = null;
    return;
  }
  activeEditor = event.target as LexicalEditorElement;
  // Anchor below the selection rect. Viewport coordinates from the editor
  // are usable directly because `position: fixed` shares the same frame.
  const left = Math.max(8, detail.rect.x);
  const top = detail.rect.y + detail.rect.height + 6;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.showPopover();
});

for (const button of popover.querySelectorAll<HTMLButtonElement>(
  'button[data-format]',
)) {
  // Keep focus (and selection) in the active editor when the button is
  // clicked; otherwise the contenteditable would blur and the selection
  // would collapse before the command runs.
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => {
    const format = button.dataset.format as TextFormatType | undefined;
    if (format === undefined) {
      return;
    }
    const editor = activeEditor !== null ? activeEditor.getEditor() : null;
    if (editor !== null) {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    }
  });
}

// Read-only toggle. Setting the standard `readonly` attribute on the host
// is enough — the element observes the attribute and flips Lexical's
// editable state to match. The form still submits the value, just like a
// `<textarea readonly>`.
const readonlyToggle =
  document.querySelector<HTMLInputElement>('#summary-readonly');
if (readonlyToggle !== null) {
  readonlyToggle.addEventListener('change', () => {
    const summary = document.querySelector<LexicalEditorElement>(
      'lexical-editor[name="summary"]',
    );
    if (summary !== null) {
      summary.readOnly = readonlyToggle.checked;
    }
  });
}
