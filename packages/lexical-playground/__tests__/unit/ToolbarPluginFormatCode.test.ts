/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code';
import {$createHeadingNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {formatCode} from '../../src/plugins/ToolbarPlugin/utils';

describe('ToolbarPlugin formatCode', () => {
  initializeUnitTest(
    testEnv => {
      it('converts a fully-selected heading into a code block without error', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const heading = $createHeadingNode('h1');
          const text = $createTextNode('Hello heading');
          heading.append(text);
          $getRoot().append(heading);
          // Select the entire heading text (from start to end)
          text.select(0, text.getTextContentSize());
        });

        // Must not throw even though anchor/focus are inside a HeadingNode
        await expect(
          (async () => {
            formatCode(editor, 'heading');
            await editor.update(() => {});
          })(),
        ).resolves.not.toThrow();

        editor.getEditorState().read(() => {
          const root = $getRoot();
          const firstChild = root.getFirstChild();
          expect($isCodeNode(firstChild)).toBe(true);
          expect(firstChild?.getTextContent()).toBe('Hello heading');
        });
      });

      it('converts a heading with selection starting at position 0 into a code block without error', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const heading = $createHeadingNode('h2');
          const text = $createTextNode('Start selected');
          heading.append(text);
          $getRoot().append(heading);
          // Anchor at position 0 — this is the scenario that caused the crash
          text.select(0, text.getTextContentSize());
        });

        await expect(
          (async () => {
            formatCode(editor, 'heading');
            await editor.update(() => {});
          })(),
        ).resolves.not.toThrow();

        editor.getEditorState().read(() => {
          const root = $getRoot();
          const codeNodes = root.getChildren().filter($isCodeNode);
          expect(codeNodes.length).toBe(1);
          expect(codeNodes[0].getTextContent()).toBe('Start selected');
        });
      });

      it('converts a selected paragraph into a code block using text-copy path', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const p = $createParagraphNode();
          const text = $createTextNode('paragraph text');
          p.append(text);
          $getRoot().append(p);
          text.select(0, text.getTextContentSize());
        });

        formatCode(editor, 'paragraph');
        await editor.update(() => {});

        editor.getEditorState().read(() => {
          const root = $getRoot();
          const codeNodes = root.getChildren().filter($isCodeNode);
          expect(codeNodes.length).toBe(1);
          expect(codeNodes[0].getTextContent()).toBe('paragraph text');
        });
      });
    },
    {
      namespace: 'test',
      nodes: [HeadingNode, QuoteNode],
      theme: {},
    },
  );
});
