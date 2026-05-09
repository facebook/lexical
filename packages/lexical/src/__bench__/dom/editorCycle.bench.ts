/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, ParagraphNode} from '../../';

import {bench, describe} from 'vitest';

import {$createTextNode, $getRoot} from '../../';
import {createTestEditor} from '../../__tests__/utils';
import {attachToDOM, buildLargeDoc} from './_utils';

const SIZES = [1000, 5000] as const;

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
              (last as ParagraphNode).append(t);
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
