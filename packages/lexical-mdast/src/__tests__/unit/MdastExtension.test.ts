/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getExtensionOutput,
  buildEditorFromExtensions,
} from '@lexical/extension';
import {ListNode} from '@lexical/list';
import {HeadingNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
} from 'lexical';
import {describe, expect, it, onTestFinished} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastShortcutsExtension,
} from '../../index';

function buildEditor(dependencies: Parameters<typeof defineExtension>[0]) {
  const editor = buildEditorFromExtensions(dependencies);
  onTestFinished(() => editor.dispose());
  return editor;
}

describe('@lexical/mdast extensions', () => {
  it('feature extensions ship the nodes their rules need', () => {
    const editor = buildEditor(
      defineExtension({
        dependencies: [MdastCommonMarkExtension],
        name: '[root]',
      }),
    );
    expect(editor.hasNode(HeadingNode)).toBe(true);
    expect(editor.hasNode(ListNode)).toBe(true);

    editor.update(
      () => {
        $convertFromMarkdownString('# Title\n\n- a\n- b');
      },
      {discrete: true},
    );
    const out = editor.read(() => $convertToMarkdownString());
    expect(out).toBe('# Title\n\n- a\n- b');
  });

  it('exposes the Markdown API through MdastExtension output', () => {
    const editor = buildEditor(
      defineExtension({
        dependencies: [MdastCommonMarkExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $getExtensionOutput(MdastExtension).$convertFromMarkdownString('## Hi');
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $getExtensionOutput(MdastExtension).$convertToMarkdownString(),
      ),
    ).toBe('## Hi');
  });

  it('wires up streaming shortcuts via MdastShortcutsExtension', () => {
    const editor = buildEditor(
      defineExtension({
        dependencies: [MdastShortcutsExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    for (const chunk of ['#', ' ']) {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(chunk);
          }
        },
        {discrete: true},
      );
    }
    expect(editor.read(() => $getRoot().getFirstChild()!.getType())).toBe(
      'heading',
    );
  });
});
