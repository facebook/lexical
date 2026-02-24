/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  INSERT_TAB_COMMAND,
} from 'lexical';
import {initializeUnitTest, invariant} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

describe('LexicalTabNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('INSERT_TAB_COMMAND applies selection format and style to TabNode', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
      });

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        selection.insertText('ab');
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        invariant(textNode !== null && $isTextNode(textNode));
        textNode.select(0, 2);
      });

      await editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      await editor.dispatchCommand(INSERT_TAB_COMMAND, undefined);

      await editor.read(() => {
        const root = $getRoot();
        const nodes = root.getAllTextNodes();
        const tabNode = nodes.find((n) => n.getType() === 'tab');
        invariant(tabNode !== undefined && $isTabNode(tabNode));
        expect(tabNode.getFormat()).toBe(1);
      });
    });

    test('format preserved when typing between tabs inserted in bold text', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
      });

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        selection.insertText('ab');
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        invariant(textNode !== null && $isTextNode(textNode));
        textNode.select(0, 2);
      });

      await editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');

      await editor.update(() => {
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        invariant(textNode !== null && $isTextNode(textNode));
        textNode.select(1, 1);
      });

      await editor.dispatchCommand(INSERT_TAB_COMMAND, undefined);
      await editor.dispatchCommand(INSERT_TAB_COMMAND, undefined);

      await editor.update(() => {
        const root = $getRoot();
        const tabNodes = root
          .getAllTextNodes()
          .filter((n) => n.getType() === 'tab');
        expect(tabNodes.length).toBe(2);
        tabNodes[1].selectStart();
      });

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        selection.insertText('x');
      });

      await editor.read(() => {
        const root = $getRoot();
        const nodes = root.getAllTextNodes();
        const xNode = nodes.find((n) => n.getTextContent() === 'x');
        invariant(xNode !== undefined && $isTextNode(xNode));
        expect(xNode.getFormat()).toBe(1);
      });
    });
  });
});
