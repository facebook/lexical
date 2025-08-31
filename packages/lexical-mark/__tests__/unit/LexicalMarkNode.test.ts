/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$generateNodesFromDOM} from '@lexical/html';
import {$wrapSelectionInMarkNode, MarkNode} from '@lexical/mark';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
  $createTestElementNode,
  $createTestInlineElementNode,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, expect, test} from 'vitest';

describe('LexicalMarkNode tests', () => {
  initializeUnitTest((testEnv) => {
    describe('$wrapSelectionInMarkNode', () => {
      beforeEach(() => {
        testEnv.editor.update(
          () => {
            $getRoot().clear().append($createParagraphNode());
          },
          {discrete: true},
        );
      });

      test('wraps a whole text node', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const textNode = $createTextNode('marked');
          const paragraphNode =
            $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraphNode.append(textNode);
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 0, 'text');
          selection.focus.set(
            textNode.getKey(),
            textNode.getTextContent().length,
            'text',
          );
          $wrapSelectionInMarkNode(selection, false, 'my-id');

          expect(paragraphNode.getChildren()).toHaveLength(1);
          const markNode = paragraphNode.getFirstChildOrThrow<MarkNode>();
          expect(markNode.getType()).toEqual('mark');
          expect(markNode.getIDs()).toEqual(['my-id']);
          expect(markNode.getChildren()).toHaveLength(1);
          expect(markNode.getFirstChildOrThrow().getKey()).toEqual(
            textNode.getKey(),
          );
          expect(markNode.getFirstChildOrThrow().getTextContent()).toEqual(
            'marked',
          );
        });
      });

      test('splits a text node if the selection is not at the start/end', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const textNode = $createTextNode('unmarked marked unmarked');
          const paragraphNode =
            $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraphNode.append(textNode);
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 'unmarked '.length, 'text');
          selection.focus.set(
            textNode.getKey(),
            'unmarked marked'.length,
            'text',
          );
          $wrapSelectionInMarkNode(selection, false, 'my-id');

          expect(paragraphNode.getTextContent()).toEqual(
            'unmarked marked unmarked',
          );
          expect(paragraphNode.getChildren().map((c) => c.getType())).toEqual([
            'text',
            'mark',
            'text',
          ]);
          expect(
            paragraphNode.getChildren().map((c) => c.getTextContent()),
          ).toEqual(['unmarked ', 'marked', ' unmarked']);
        });
      });

      test('includes inline decorator nodes', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const decoratorNode = $createTestDecoratorNode();
          const textNode = $createTextNode('more text');
          const paragraphNode =
            $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraphNode.append(decoratorNode, textNode);
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphNode.getKey(), 0, 'element');
          selection.focus.set(
            paragraphNode.getKey(),
            paragraphNode.getChildrenSize(),
            'element',
          );
          $wrapSelectionInMarkNode(selection, false, 'my-id');

          expect(paragraphNode.getChildren()).toHaveLength(1);
          const markNode = paragraphNode.getFirstChildOrThrow<MarkNode>();
          expect(markNode.getType()).toEqual('mark');
          expect(markNode.getChildren().map((c) => c.getKey())).toEqual([
            decoratorNode.getKey(),
            textNode.getKey(),
          ]);
        });
      });

      test('includes inline element nodes', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const elementNode = $createTestInlineElementNode();
          const textNode = $createTextNode('more text');
          const paragraphNode =
            $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraphNode.append(elementNode, textNode);
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphNode.getKey(), 0, 'element');
          selection.focus.set(
            paragraphNode.getKey(),
            paragraphNode.getChildrenSize(),
            'element',
          );
          $wrapSelectionInMarkNode(selection, false, 'my-id');

          expect(paragraphNode.getChildren()).toHaveLength(1);
          const markNode = paragraphNode.getFirstChildOrThrow<MarkNode>();
          expect(markNode.getType()).toEqual('mark');
          expect(markNode.getChildren().map((c) => c.getKey())).toEqual([
            elementNode.getKey(),
            textNode.getKey(),
          ]);
        });
      });

      test('does not include block element nodes', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const elementNode = $createTestElementNode();
          const textNode = $createTextNode('more text');
          const paragraphNode =
            $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraphNode.append(elementNode, textNode);
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphNode.getKey(), 0, 'element');
          selection.focus.set(
            paragraphNode.getKey(),
            paragraphNode.getChildrenSize(),
            'element',
          );
          $wrapSelectionInMarkNode(selection, false, 'my-id');

          expect(paragraphNode.getChildren()).toHaveLength(2);
          expect(paragraphNode.getChildAtIndex(0)!.getKey()).toEqual(
            elementNode.getKey(),
          );

          // the text part of the selection should still be marked
          const markNode = paragraphNode.getChildAtIndex(1) as MarkNode;
          expect(markNode.getType()).toEqual('mark');
          expect(markNode.getChildren()).toHaveLength(1);
          expect(markNode.getTextContent()).toEqual('more text');
        });
      });
    });
    describe('$generateNodesFromDOM', () => {
      beforeEach(() => {
        testEnv.editor.update(
          () => {
            $getRoot().clear();
          },
          {discrete: true},
        );
      });

      test('retains spaces around mark elements', () => {
        const {editor} = testEnv;

        editor.update(() => {
          const dom = new DOMParser().parseFromString(
            `<html><body><p><span>Foo </span><mark>Bar</mark><span> !</span></p></body></html>`,
            'text/html',
          );
          const nodes = $generateNodesFromDOM(editor, dom);

          expect(nodes).toHaveLength(1);
          const paragraphNode = nodes[0] as ParagraphNode;
          expect(paragraphNode.getChildren()).toHaveLength(3);
          const textNode1 = paragraphNode.getChildAtIndex(0) as TextNode;
          const markNode = paragraphNode.getChildAtIndex(1) as MarkNode;
          const textNode2 = paragraphNode.getChildAtIndex(2) as TextNode;

          expect(textNode1.getTextContent()).toEqual('Foo ');
          expect(markNode.getTextContent()).toEqual('Bar');
          expect(textNode2.getTextContent()).toEqual(' !');
        });
      });
    });
  });
});
