/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {formatCode} from '../../src/plugins/ToolbarPlugin/utils';

describe('ToolbarPlugin formatCode', () => {
  initializeUnitTest((testEnv) => {
    it('does not format code when a text node is partially selected', () => {
      const {editor} = testEnv;

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const text = $createTextNode('HelloWorld');
          paragraph.append(text);
          $getRoot().append(paragraph);

          text.select(0, 5);
        },
        {discrete: true},
      );

      formatCode(editor, 'paragraph');

      editor.read(() => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();
        expect($isParagraphNode(firstChild)).toBe(true);
        if ($isParagraphNode(firstChild)) {
          const text = firstChild.getFirstChild();
          expect($isTextNode(text)).toBe(true);
          if ($isTextNode(text)) {
            expect(text.getTextContent()).toBe('HelloWorld');
          }
        }
      });
    });

    it('formats code when a full text node is selected', () => {
      const {editor} = testEnv;

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const text = $createTextNode('HelloWorld');
          paragraph.append(text);
          $getRoot().append(paragraph);

          text.select(0, text.getTextContentSize());
        },
        {discrete: true},
      );

      formatCode(editor, 'paragraph');

      editor.read(() => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();
        expect($isCodeNode(firstChild)).toBe(true);
        if ($isCodeNode(firstChild)) {
          expect(firstChild.getTextContent()).toBe('HelloWorld');
        }
      });
    });
  });
});
