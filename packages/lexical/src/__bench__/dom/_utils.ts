/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from '../../';

import {$createParagraphNode, $createTextNode, $getRoot} from '../../';

/**
 * Attach a fresh contentEditable host to `document.body` and bind the
 * editor's root element to it. Returns the host so callers can inspect
 * or detach it.
 */
export function attachToDOM(editor: LexicalEditor): HTMLElement {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  return root;
}

/**
 * Populate the editor with `paragraphs` paragraphs, each containing a
 * short text node. Useful as a baseline document for cycle-cost benches.
 */
export function buildLargeDoc(editor: LexicalEditor, paragraphs: number): void {
  editor.update(
    () => {
      const root = $getRoot();
      for (let i = 0; i < paragraphs; i++) {
        const p = $createParagraphNode();
        p.append($createTextNode(`paragraph ${i} with some text content`));
        root.append(p);
      }
    },
    {discrete: true},
  );
}
