/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  ParagraphNode,
  createParagraphNode,
  isParagraphNode,
} from 'outline/ParagraphNode';
import {TextNode} from 'outline';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  paragraph: 'my-paragraph-class',
});

describe('OutlineParagraphNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ParagraphNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.getFlags()).toBe(0);
        expect(paragraphNode.getType()).toBe('paragraph');
        expect(paragraphNode.getTextContent()).toBe('');
      });
      expect(() => new ParagraphNode()).toThrow();
    });

    test('ParagraphNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        const paragraphNodeClone = paragraphNode.clone();
        expect(paragraphNodeClone).not.toBe(paragraphNode);
        expect(paragraphNode.__type).toEqual(paragraphNodeClone.__type);
        expect(paragraphNode.__flags).toEqual(paragraphNodeClone.__flags);
        expect(paragraphNode.__parent).toEqual(paragraphNodeClone.__parent);
        expect(paragraphNode.__children).toEqual(paragraphNodeClone.__children);
        expect(paragraphNode.__key).toEqual(paragraphNodeClone.__key);
        expect(paragraphNode.getTextContent()).toEqual(
          paragraphNodeClone.getTextContent(),
        );
      });
    });

    test('ParagraphNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<p class="my-paragraph-class"></p>',
        );
        expect(paragraphNode.createDOM({}).outerHTML).toBe('<p></p>');
      });
    });

    test('ParagraphNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const domElement = paragraphNode.createDOM(editorThemeClasses);
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
      await editor.update((view) => {
        const root = view.getRoot();
        paragraphNode = new ParagraphNode();
        root.append(paragraphNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p></p></div>',
      );
      await editor.update((view) => {
        const result = paragraphNode.insertNewAfter();
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(paragraphNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p></p><p></p></div>',
      );
    });

    test('ParagraphNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        expect(paragraphNode.canInsertTab()).toBe(false);
      });
    });

    test('createParagraphNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const createdParagraphNode = createParagraphNode();
        expect(paragraphNode.__type).toEqual(createdParagraphNode.__type);
        expect(paragraphNode.__flags).toEqual(createdParagraphNode.__flags);
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
