/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createCodeNode, CodeNode} from 'outline/CodeNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {TextNode} from 'outline';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  code: 'my-code-class',
});

describe('OutlineCodeNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('CodeNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = new CodeNode();
        expect(codeNode.getFlags()).toBe(0);
        expect(codeNode.getType()).toBe('code');
        expect(codeNode.getTextContent()).toBe('');
      });
      expect(() => new CodeNode()).toThrow();
    });

    test('CodeNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = new CodeNode();
        expect(codeNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<code class="my-code-class" spellcheck="false"></code>',
        );
        expect(codeNode.createDOM({}).outerHTML).toBe(
          '<code spellcheck="false"></code>',
        );
      });
    });

    test('CodeNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const newCodeNode = new CodeNode();
        const codeNode = new CodeNode();
        const domElement = codeNode.createDOM({});
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
        const result = newCodeNode.updateDOM(codeNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
      });
    });

    test.skip('CodeNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      await editor.update((view) => {
        const root = view.getRoot();
        const paragraphNode = new ParagraphNode();
        const textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        root.append(paragraphNode);
        textNode.select(0, 0);
        const selection = view.getSelection();
        expect(selection).toEqual({
          anchorKey: '_2',
          anchorOffset: 0,
          focusKey: '_2',
          focusOffset: 0,
          isDirty: true,
          needsSync: false,
        });
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update((view) => {
        const codeNode = new CodeNode();
        const selection = view.getSelection();
        codeNode.insertNewAfter(selection);
      });
    });

    test('CodeNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = new CodeNode();
        expect(codeNode.canInsertTab()).toBe(true);
      });
    });

    test('createCodeNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = new CodeNode();
        const createdCodeNode = createCodeNode();
        expect(codeNode.__type).toEqual(createdCodeNode.__type);
        expect(codeNode.__flags).toEqual(createdCodeNode.__flags);
        expect(codeNode.__parent).toEqual(createdCodeNode.__parent);
        expect(codeNode.__src).toEqual(createdCodeNode.__src);
        expect(codeNode.__altText).toEqual(createdCodeNode.__altText);
        expect(codeNode.__key).not.toEqual(createdCodeNode.__key);
      });
    });
  });
});
