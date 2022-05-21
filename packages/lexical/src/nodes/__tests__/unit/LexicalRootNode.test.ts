/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRootNode,
  ElementNode,
  TextNode,
} from 'lexical';

import {
  $createTestDecoratorNode,
  $createTestElementNode,
  $createTestInlineElementNode,
  initializeUnitTest,
} from '../../../__tests__/utils';
import {$createRootNode} from '../../LexicalRootNode';

describe('LexicalRootNode tests', () => {
  initializeUnitTest((testEnv) => {
    let rootNode;

    function expectRootTextContentToBe(text: string): void {
      const {editor} = testEnv;
      editor.getEditorState().read(() => {
        const root = $getRoot();

        expect(root.__cachedText).toBe(text);

        // Copy root to remove __cachedText because it's frozen
        const rootCopy = Object.assign({}, root);
        rootCopy.__cachedText = null;
        Object.setPrototypeOf(rootCopy, Object.getPrototypeOf(root));

        expect(rootCopy.getTextContent()).toBe(text);
      });
    }

    beforeEach(async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        rootNode = $createRootNode();
      });
    });

    test('RootNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        expect(rootNode).toStrictEqual($createRootNode());
        expect(rootNode.getType()).toBe('root');
        expect(rootNode.getTextContent()).toBe('');
      });
    });

    test('RootNode.exportJSON() should return and object conforming to the expected schema', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const node = $createRootNode();

        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON method
        // to accomodate these changes.
        expect(node.exportJSON()).toStrictEqual({
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        });
      });
    });

    test('RootNode.clone()', async () => {
      const rootNodeClone = rootNode.constructor.clone();

      expect(rootNodeClone).not.toBe(rootNode);
      expect(rootNodeClone).toStrictEqual(rootNode);
    });

    test('RootNode.createDOM()', async () => {
      expect(() => rootNode.createDOM()).toThrow();
    });

    test('RootNode.updateDOM()', async () => {
      expect(rootNode.updateDOM()).toBe(false);
    });

    test('RootNode.isAttached()', async () => {
      expect(rootNode.isAttached()).toBe(true);
    });

    test('RootNode.isRootNode()', () => {
      expect($isRootNode(rootNode)).toBe(true);
    });

    test('Cached getTextContent with decorators', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.append($createTestDecoratorNode());
      });

      expect(
        editor.getEditorState().read(() => {
          return $getRoot().getTextContent();
        }),
      ).toBe('Hello world');
    });

    test('RootNode.clear() to handle selection update', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const text = $createTextNode('Hello');
        paragraph.append(text);
        text.select();
      });

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
      });

      await editor.update(() => {
        const root = $getRoot();
        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          return;
        }

        expect(selection.anchor.getNode()).toBe(root);
        expect(selection.focus.getNode()).toBe(root);
      });
    });

    test('RootNode is selected when its only child removed', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const text = $createTextNode('Hello');
        paragraph.append(text);
        text.select();
      });

      await editor.update(() => {
        const root = $getRoot();
        root.getFirstChild().remove();
      });

      await editor.update(() => {
        const root = $getRoot();
        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          return;
        }

        expect(selection.anchor.getNode()).toBe(root);
        expect(selection.focus.getNode()).toBe(root);
      });
    });

    test('RootNode __cachedText', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().append($createParagraphNode());
      });

      expectRootTextContentToBe('');

      await editor.update(() => {
        const firstParagraph = $getRoot().getFirstChild<ElementNode>();

        firstParagraph.append($createTextNode('first line'));
      });

      expectRootTextContentToBe('first line');

      await editor.update(() => {
        $getRoot().append($createParagraphNode());
      });

      expectRootTextContentToBe('first line\n\n');

      await editor.update(() => {
        const secondParagraph = $getRoot().getLastChild<ElementNode>();

        secondParagraph.append($createTextNode('second line'));
      });

      expectRootTextContentToBe('first line\n\nsecond line');

      await editor.update(() => {
        $getRoot().append($createParagraphNode());
      });

      expectRootTextContentToBe('first line\n\nsecond line\n\n');

      await editor.update(() => {
        const thirdParagraph = $getRoot().getLastChild<ElementNode>();
        thirdParagraph.append($createTextNode('third line'));
      });

      expectRootTextContentToBe('first line\n\nsecond line\n\nthird line');

      await editor.update(() => {
        const secondParagraph = $getRoot().getChildAtIndex<ElementNode>(1);
        const secondParagraphText = secondParagraph.getFirstChild<TextNode>();
        secondParagraphText.setTextContent('second line!');
      });

      expectRootTextContentToBe('first line\n\nsecond line!\n\nthird line');
    });

    test('RootNode __cachedText (empty paragraph)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().append($createParagraphNode(), $createParagraphNode());
      });

      expectRootTextContentToBe('\n\n');
    });

    test('RootNode __cachedText (inlines)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.append(
          $createTextNode('a'),
          $createTestElementNode(),
          $createTextNode('b'),
          $createTestInlineElementNode(),
          $createTextNode('c'),
        );
      });

      expectRootTextContentToBe('a\n\nbc');
    });
  });
});
