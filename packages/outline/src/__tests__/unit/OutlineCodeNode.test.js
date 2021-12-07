/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {otlnCreateCodeNode} from 'outline/CodeNode';
import {otlnCreateParagraphNode} from 'outline/ParagraphNode';
import {otlnCreateTextNode, otlnGetRoot, otlnGetSelection} from 'outline';
import {initializeUnitTest} from '../utils';

const editorConfig = Object.freeze({
  theme: {
    code: 'my-code-class',
  },
});

describe('OutlineCodeNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('CodeNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = otlnCreateCodeNode();
        expect(codeNode.getFlags()).toBe(0);
        expect(codeNode.getType()).toBe('code');
        expect(codeNode.getTextContent()).toBe('');
      });
      expect(() => otlnCreateCodeNode()).toThrow();
    });

    test('CodeNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = otlnCreateCodeNode();
        expect(codeNode.createDOM(editorConfig).outerHTML).toBe(
          '<code class="my-code-class" spellcheck="false"></code>',
        );
        expect(codeNode.createDOM({theme: {}}).outerHTML).toBe(
          '<code spellcheck="false"></code>',
        );
      });
    });

    test('CodeNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const newCodeNode = otlnCreateCodeNode();
        const codeNode = otlnCreateCodeNode();
        const domElement = codeNode.createDOM({theme: {}});
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
        const result = newCodeNode.updateDOM(codeNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
      });
    });

    test.skip('CodeNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const root = otlnGetRoot();
        const paragraphNode = otlnCreateParagraphNode();
        const textNode = otlnCreateTextNode('foo');
        paragraphNode.append(textNode);
        root.append(paragraphNode);
        textNode.select(0, 0);
        const selection = otlnGetSelection();
        expect(selection).toEqual({
          anchorKey: '_2',
          anchorOffset: 0,
          focusKey: '_2',
          focusOffset: 0,
          dirty: true,
          needsSync: false,
        });
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const codeNode = otlnCreateCodeNode();
        const selection = otlnGetSelection();
        codeNode.insertNewAfter(selection);
      });
    });

    test('CodeNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = otlnCreateCodeNode();
        expect(codeNode.canInsertTab()).toBe(true);
      });
    });

    test('otlnCreateCodeNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const codeNode = otlnCreateCodeNode();
        const createdCodeNode = otlnCreateCodeNode();
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
