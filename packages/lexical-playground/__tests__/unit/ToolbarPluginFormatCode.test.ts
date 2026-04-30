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
  $isElementNode,
  LexicalNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {formatCode} from '../../src/plugins/ToolbarPlugin/utils';

describe('ToolbarPlugin formatCode', () => {
  initializeUnitTest((testEnv) => {
    it('moves selected text into code block and appends trailing text as paragraph', async () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode('hello world');
          paragraph.append(textNode);
          $getRoot().append(paragraph);
          textNode.select(0, 5);
        },
        {discrete: true},
      );

      formatCode(editor, 'paragraph');
      await editor.update(() => {});

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const stack: Array<LexicalNode> = root.getChildren();
        let codeNode: LexicalNode | null = null;
        while (stack.length > 0) {
          const node = stack.shift() as LexicalNode;
          if ($isCodeNode(node)) {
            codeNode = node;
            break;
          }
          if ($isElementNode(node)) {
            stack.push(...node.getChildren());
          }
        }

        expect(codeNode).not.toBe(null);
        if (codeNode === null) {
          return;
        }

        const codeTopLevel = codeNode.getTopLevelElementOrThrow();
        expect(codeTopLevel.getTextContent()).toBe('hello');
        const children = root.getChildren();
        const codeIndex = children.indexOf(codeTopLevel);
        expect(codeIndex).toBeGreaterThanOrEqual(0);

        const trailingNode = children[codeIndex + 1];
        expect(trailingNode?.getType()).toBe('paragraph');
        expect(trailingNode?.getTextContent().trim()).toBe('world');
      });
    });
  });
});
