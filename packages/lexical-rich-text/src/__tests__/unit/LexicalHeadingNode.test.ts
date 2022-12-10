/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
} from '@lexical/rich-text';
import {$createTextNode, $getRoot, $getSelection, ParagraphNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    heading: {
      h1: 'my-h1-class',
      h2: 'my-h2-class',
      h3: 'my-h3-class',
      h4: 'my-h4-class',
      h5: 'my-h5-class',
      h6: 'my-h6-class',
    },
  },
});

describe('LexicalHeadingNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('HeadingNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        expect(headingNode.getType()).toBe('heading');
        expect(headingNode.getTag()).toBe('h1');
        expect(headingNode.getTextContent()).toBe('');
      });
      // @ts-ignore
      expect(() => new HeadingNode()).toThrow();
    });

    test('HeadingNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        expect(headingNode.createDOM(editorConfig).outerHTML).toBe(
          '<h1 class="my-h1-class"></h1>',
        );
        expect(
          headingNode.createDOM({
            namespace: '',
            theme: {
              heading: {},
            },
          }).outerHTML,
        ).toBe('<h1></h1>');
        expect(
          headingNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<h1></h1>');
      });
    });

    test('HeadingNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        const domElement = headingNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe('<h1 class="my-h1-class"></h1>');
        const newHeadingNode = new HeadingNode('h2');
        const result = newHeadingNode.updateDOM(headingNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<h1 class="my-h1-class"></h1>');
      });
    });

    test('HeadingNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      let headingNode;
      await editor.update(() => {
        const root = $getRoot();
        headingNode = new HeadingNode('h1');
        root.append(headingNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1><br></h1></div>',
      );
      await editor.update(() => {
        const selection = $getSelection();
        const result = headingNode.insertNewAfter(selection);
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(headingNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1><br></h1><p><br></p></div>',
      );
    });

    test('HeadingNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        expect(headingNode.canInsertTab()).toBe(false);
      });
    });

    test('$createHeadingNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        const createdHeadingNode = $createHeadingNode('h1');
        expect(headingNode.__type).toEqual(createdHeadingNode.__type);
        expect(headingNode.__parent).toEqual(createdHeadingNode.__parent);
        expect(headingNode.__key).not.toEqual(createdHeadingNode.__key);
      });
    });

    test('$isHeadingNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const headingNode = new HeadingNode('h1');
        expect($isHeadingNode(headingNode)).toBe(true);
      });
    });

    test('creates a h2 with text and can insert a new paragraph after', async () => {
      const {editor} = testEnv;
      let headingNode;
      const text = 'hello world';
      await editor.update(() => {
        const root = $getRoot();
        headingNode = new HeadingNode('h2');
        root.append(headingNode);
        const textNode = $createTextNode(text);
        headingNode.append(textNode);
      });
      expect(testEnv.outerHTML).toBe(
        `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h2 dir="ltr"><span data-lexical-text="true">${text}</span></h2></div>`,
      );
      await editor.update(() => {
        const result = headingNode.insertNewAfter();
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(headingNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h2 dir="ltr"><span data-lexical-text="true">${text}</span></h2><p><br></p></div>`,
      );
    });
  });
});
