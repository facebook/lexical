/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// An editor bound to a document that already holds a table opens with the
// table, wherever YCollabExtension and TableExtension sit in its
// dependencies. The binding reads the document when it registers, so with
// YCollabExtension listed first the table is in the editor state before
// TableExtension registers, and before there is a root element.

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableExtension,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
  defineExtension,
} from 'lexical';
import {expect, test} from 'vitest';

import {createYDoc, YCollabExtension} from '../..';
import {seedYState} from '../../headless';

function $appendTable() {
  $getRoot().append(
    $createTableNode().append(
      $createTableRowNode().append(
        $createTableCellNode().append(
          $createParagraphNode().append($createTextNode('cell')),
        ),
      ),
    ),
    $createParagraphNode(),
  );
}

test.each(['YCollabExtension', 'TableExtension'] as const)(
  'opens a document that holds a table with %s listed first',
  first => {
    const doc = createYDoc(
      seedYState(
        {extensions: [RichTextExtension, TableExtension], schemaVersion: 1},
        $appendTable,
      ),
    );
    const collab = configExtension(YCollabExtension, {doc, schemaVersion: 1});
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies:
          first === 'YCollabExtension'
            ? [RichTextExtension, collab, TableExtension]
            : [RichTextExtension, TableExtension, collab],
        name: '@lexical/y/test/table-on-open',
      }),
    );
    expect(editor.read(() => $getRoot().getTextContent())).toContain('cell');
    editor.dispose();
  },
);
