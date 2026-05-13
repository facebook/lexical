/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from '../../';

import invariant from 'shared/invariant';
import {bench, describe} from 'vitest';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
} from '../../';
import {createTestEditor} from '../../__tests__/utils';
import {__benchOnly} from '../../LexicalReconciler';
import {attachToDOM, buildLargeDoc} from './_utils';

const SIZES = [1000, 5000] as const;

for (const size of SIZES) {
  describe(`size=${size} :: typing 1 char per cycle`, () => {
    let editor: LexicalEditor;
    let cycle = 0;

    const typeOneChar = (): void => {
      editor.update(
        () => {
          const last = $getRoot().getLastChild();
          if (last) {
            invariant($isParagraphNode(last), 'last must be a ParagraphNode');
            last.append($createTextNode(`x${cycle++}`));
          }
        },
        {discrete: true},
      );
    };

    bench(
      'with children fast path',
      () => {
        __benchOnly.skipChildrenFastPath = false;
        typeOneChar();
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

    bench(
      'without children fast path (general path)',
      () => {
        __benchOnly.skipChildrenFastPath = true;
        typeOneChar();
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

  // Append a new paragraph at the end per cycle. Exercises the suffix-
  // incremental fast path's size+1 / K=2 branch on the root reconcile (the
  // existing last paragraph is cloned for its `__next` link and the appended
  // paragraph is dirty as new). Mirrors a real "press Enter at the end of
  // the document" or "paste a fresh paragraph" interaction.
  describe(`size=${size} :: append paragraph at end per cycle`, () => {
    let editor: LexicalEditor;
    let cycle = 0;

    const appendParagraph = (): void => {
      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode(`p${cycle++}`)),
          );
        },
        {discrete: true},
      );
    };

    bench(
      'with children fast path',
      () => {
        __benchOnly.skipChildrenFastPath = false;
        appendParagraph();
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

    bench(
      'without children fast path (general path)',
      () => {
        __benchOnly.skipChildrenFastPath = true;
        appendParagraph();
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

  // Remove the last paragraph per cycle. Exercises the size-1 / K=1 branch
  // on the root reconcile (the new last paragraph is cloned for its `__next`
  // link, the removed paragraph is gone in next). Mirrors a "boundary
  // backspace that collapses the last paragraph" or "delete a trailing
  // empty line" interaction.
  describe(`size=${size} :: remove last paragraph per cycle`, () => {
    let editor: LexicalEditor;

    const removeLast = (): void => {
      editor.update(
        () => {
          const last = $getRoot().getLastChild();
          if (last !== null) {
            last.remove();
          }
        },
        {discrete: true},
      );
    };

    bench(
      'with children fast path',
      () => {
        __benchOnly.skipChildrenFastPath = false;
        removeLast();
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          // Oversize so the iteration loop has headroom; the bench still
          // measures the per-cycle remove cost from a multi-thousand-child
          // root, which is the case the suffix path is meant to cover.
          buildLargeDoc(editor, size * 4);
        },
      },
    );

    bench(
      'without children fast path (general path)',
      () => {
        __benchOnly.skipChildrenFastPath = true;
        removeLast();
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size * 4);
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
