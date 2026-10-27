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
} from '@lexical/markdown';
import {$getRoot} from 'lexical';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('browser Markdown reference semantics', () => {
  it.each([
    ['&lt;b&gt;text&lt;/b&gt;', '<b>text</b>'],
    ['&NotEqualTilde;', '\u2242\u0338'],
    [String.raw`\&lt;b\&gt;`, '&lt;b&gt;'],
    ['&amp;#60;', '&#60;'],
    ['&#x3c;b&#62;', '<b>'],
    ['&nosuch;', '&nosuch;'],
  ])('imports %j once and exports literal text', (markdown, text) => {
    const editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const element = document.createElement('div');
    document.body.append(element);
    editor.setRootElement(element);
    try {
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(element.textContent).toBe(text);
      expect(element.querySelector('b')).toBeNull();
      const exported = editor.read(() => $convertToMarkdownString());
      const tree = fromMarkdown(exported);
      expect(tree.children).toMatchObject([
        {children: [{type: 'text', value: text}], type: 'paragraph'},
      ]);
      editor.update(() => $convertFromMarkdownString(exported), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    } finally {
      editor.dispose();
      element.remove();
    }
  });
});
