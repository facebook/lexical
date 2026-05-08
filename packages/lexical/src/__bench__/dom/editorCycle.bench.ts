/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {bench, describe} from 'vitest';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from '../../';
import {createTestEditor} from '../../__tests__/utils';

const SIZES = [1000, 5000] as const;

function buildLargeDoc(editor: LexicalEditor, paragraphs: number): void {
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

function attachToDOM(editor: LexicalEditor): HTMLElement {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  return root;
}

for (const size of SIZES) {
  describe(`size=${size} :: typing 1 char per cycle`, () => {
    let editor: LexicalEditor;
    let cycle = 0;

    bench(
      'editor.update with 1 mutation',
      () => {
        editor.update(
          () => {
            const root = $getRoot();
            const last = root.getLastChild();
            if (last) {
              const t = $createTextNode(`x${cycle++}`);
              (last as ReturnType<typeof $createParagraphNode>).append(t);
            }
          },
          {discrete: true},
        );
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
          cycle = 0;
        },
      },
    );
  });

  describe(`size=${size} :: read-only update (no mutation)`, () => {
    let editor: LexicalEditor;

    bench(
      'editor.update with no mutation',
      () => {
        editor.update(() => {}, {discrete: true});
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
        },
      },
    );
  });

  describe(`size=${size} :: editor.read (pure read)`, () => {
    let editor: LexicalEditor;

    bench(
      'editor.read',
      () => {
        editor.read(() => {
          $getRoot().getChildrenSize();
        });
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
        },
      },
    );
  });
}
