/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  ParagraphNode,
  $createParagraphNode,
  isParagraphNode,
} from 'outline/ParagraphNode';
import {initializeUnitTest} from '../utils';
import {$getRoot} from 'outline';

const editorConfig = Object.freeze({
  theme: {
    paragraph: 'my-paragraph-class',
  },
});

describe('OutlineParagraphNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ParagraphNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.getType()).toBe('paragraph');
        expect(paragraphNode.getTextContent()).toBe('');
      });
      expect(() => new ParagraphNode()).toThrow();
    });

    test('ParagraphNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.createDOM(editorConfig).outerHTML).toBe(
          '<p class="my-paragraph-class"></p>',
        );
        expect(paragraphNode.createDOM({theme: {}}).outerHTML).toBe('<p></p>');
      });
    });

    test('ParagraphNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const domElement = paragraphNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe('<p class="my-paragraph-class"></p>');
        const newParagraphNode = new ParagraphNode();
        const result = newParagraphNode.updateDOM(paragraphNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<p class="my-paragraph-class"></p>');
      });
    });

    test('ParagraphNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      let paragraphNode;
      await editor.update(() => {
        const root = $getRoot();
        paragraphNode = new ParagraphNode();
        root.append(paragraphNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><br></p></div>',
      );
      await editor.update(() => {
        const result = paragraphNode.insertNewAfter();
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(paragraphNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><br></p><p><br></p></div>',
      );
    });

    test('ParagraphNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.canInsertTab()).toBe(false);
      });
    });

    test('$createParagraphNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const createdParagraphNode = $createParagraphNode();
        expect(paragraphNode.__type).toEqual(createdParagraphNode.__type);
        expect(paragraphNode.__parent).toEqual(createdParagraphNode.__parent);
        expect(paragraphNode.__key).not.toEqual(createdParagraphNode.__key);
      });
    });

    test('isParagraphNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(isParagraphNode(paragraphNode)).toBe(true);
      });
    });
  });
});
