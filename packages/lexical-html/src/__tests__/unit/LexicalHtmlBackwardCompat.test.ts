/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createHeadlessEditor} from '@lexical/headless';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

describe('$generateHtmlFromNodes backward compatibility', () => {
  test('works inside legacy editor.getEditorState().read(cb) scope (no active editor)', () => {
    const editor = createHeadlessEditor({
      nodes: [],
    });

    // Populate editor state
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Hello world'));
        $getRoot().append(paragraph);
      },
      {discrete: true},
    );

    // Legacy pattern: editor.getEditorState().read(cb) WITHOUT {editor} option.
    // Before this fix, this would throw because $setTextContent calls $getEditor()
    // which requires an active editor scope.
    const html = editor.getEditorState().read(() => {
      return $generateHtmlFromNodes(editor);
    });

    expect(html).toContain('Hello world');
  });

  test('still works inside editor.read() scope (active editor present)', () => {
    const editor = createHeadlessEditor({
      nodes: [],
    });

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Test content'));
        $getRoot().append(paragraph);
      },
      {discrete: true},
    );

    const html = editor.read(() => {
      return $generateHtmlFromNodes(editor);
    });

    expect(html).toContain('Test content');
  });
});
