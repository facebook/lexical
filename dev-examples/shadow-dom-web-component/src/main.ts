/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

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
