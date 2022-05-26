/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode} from '@lexical/code';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    code: 'my-code-class',
  },
});

describe('LexicalCodeNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('CodeNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        expect(codeNode.getType()).toBe('code');
        expect(codeNode.getTextContent()).toBe('');
      });
      expect(() => $createCodeNode()).toThrow();
    });

    test('CodeNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        expect(codeNode.createDOM(editorConfig).outerHTML).toBe(
          '<code class="my-code-class" spellcheck="false"></code>',
        );
        expect(
          codeNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<code spellcheck="false"></code>');
      });
    });

    test('CodeNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const newCodeNode = $createCodeNode();
        const codeNode = $createCodeNode();
        const domElement = codeNode.createDOM({
          namespace: '',
          theme: {},
        });
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
        const result = newCodeNode.updateDOM(codeNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
      });
    });

    test('CodeNode.exportJSON() should return and object conforming to the expected schema', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = $createCodeNode('javascript');
        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accomodate these changes.
        expect(node.exportJSON()).toStrictEqual({
          children: [],
          direction: null,
          format: '',
          indent: 0,
          language: 'javascript',
          type: 'code',
          version: 1,
        });
      });
    });

    test.skip('CodeNode.insertNewAfter()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const paragraphNode = $createParagraphNode();
        const textNode = $createTextNode('foo');
        paragraphNode.append(textNode);
        root.append(paragraphNode);
        textNode.select(0, 0);
        const selection = $getSelection();
        expect(selection).toEqual({
          anchorKey: '_2',
          anchorOffset: 0,
          dirty: true,
          focusKey: '_2',
          focusOffset: 0,
          needsSync: false,
        });
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span>foo</span></p></div>',
      );

      await editor.update(() => {
        const codeNode = $createCodeNode();
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          codeNode.insertNewAfter(selection);
        }
      });
    });

    test('$createCodeNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        const createdCodeNode = $createCodeNode();
        expect(codeNode.__type).toEqual(createdCodeNode.__type);
        expect(codeNode.__parent).toEqual(createdCodeNode.__parent);
        expect(codeNode.__key).not.toEqual(createdCodeNode.__key);
      });
    });
  });
});
