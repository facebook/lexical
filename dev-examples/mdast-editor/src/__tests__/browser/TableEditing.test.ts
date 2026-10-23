/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/mdast';
import {$getRoot, defineExtension} from 'lexical';
import {expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

import {MdastEditorExtension} from '../../extensions/MdastEditorExtension';

function mountEditor(markdown: string) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [MdastEditorExtension],
      name: '[root]',
      theme: {tableScrollableWrapper: 'table-wrapper'},
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
  return editor;
}

test.each(['{Enter}', '{Shift>}{Enter}{/Shift}'])(
  '%s in a table cell writes a <br> line break',
  async keys => {
    const editor = mountEditor('| a | b |\n| - | - |\n| 1 | 2 |');
    editor.update(
      () => {
        const one = $getRoot()
          .getAllTextNodes()
          .find(node => node.getTextContent() === '1');
        one!.select(1, 1);
      },
      {discrete: true},
    );
    editor.focus();
    await userEvent.keyboard(`${keys}x`);
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      '| a      | b |\n| ------ | - |\n| 1<br>x | 2 |',
    );
  },
);
