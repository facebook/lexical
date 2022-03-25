/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
  $isRootNode,
} from 'lexical';

import {
  $createTestDecoratorNode,
  initializeUnitTest,
} from '../../../__tests__/utils';
import {$createRootNode} from '../../LexicalRootNode';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalRootNode tests', () => {
  initializeUnitTest((testEnv) => {
    let rootNode;

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
        expect(selection.anchor.getNode()).toBe(root);
        expect(selection.focus.getNode()).toBe(root);
      });
    });
  });
});
