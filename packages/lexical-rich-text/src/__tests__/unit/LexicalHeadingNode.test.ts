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
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  ParagraphNode,
  RangeSelection,
} from 'lexical';
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
      expect(() => new HeadingNode('h1')).toThrow();
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
        const headingNode = $createHeadingNode('h1');
        const domElement = headingNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe('<h1 class="my-h1-class"></h1>');
        const newHeadingNode = $createHeadingNode('h1');
        const result = newHeadingNode.updateDOM(
          headingNode,
          domElement,
          editor._config,
        );
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<h1 class="my-h1-class"></h1>');
        // When the HTML tag changes we must return true and not update the DOM, as createDOM will be called
        const newTag = $createHeadingNode('h2');
        const newTagResult = newTag.updateDOM(
          headingNode,
          domElement,
          editor._config,
        );
        expect(newTagResult).toBe(true);
        expect(domElement.outerHTML).toBe('<h1 class="my-h1-class"></h1>');
      });
    });

    test('HeadingNode.insertNewAfter() empty', async () => {
      const {editor} = testEnv;
      let headingNode: HeadingNode;
      await editor.update(() => {
        const root = $getRoot();
        headingNode = new HeadingNode('h1');
        root.append(headingNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1><br></h1></div>',
      );
      await editor.update(() => {
        const selection = $getSelection() as RangeSelection;
        const result = headingNode.insertNewAfter(selection);
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(headingNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1><br></h1><p><br></p></div>',
      );
    });

    test('HeadingNode.insertNewAfter() middle', async () => {
      const {editor} = testEnv;
      let headingNode: HeadingNode;
      await editor.update(() => {
        const root = $getRoot();
        headingNode = new HeadingNode('h1');
        const headingTextNode = $createTextNode('hello world');
        root.append(headingNode.append(headingTextNode));
        headingTextNode.select(5, 5);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1 dir="ltr"><span data-lexical-text="true">hello world</span></h1></div>',
      );
      await editor.update(() => {
        const selection = $getSelection() as RangeSelection;
        const result = headingNode.insertNewAfter(selection);
        expect(result).toBeInstanceOf(HeadingNode);
        expect(result.getDirection()).toEqual(headingNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1 dir="ltr"><span data-lexical-text="true">hello world</span></h1><h1><br></h1></div>',
      );
    });

    test('HeadingNode.insertNewAfter() end', async () => {
      const {editor} = testEnv;
      let headingNode: HeadingNode;
      await editor.update(() => {
        const root = $getRoot();
        headingNode = new HeadingNode('h1');
        const headingTextNode1 = $createTextNode('hello');
        const headingTextNode2 = $createTextNode(' world');
        headingTextNode2.setFormat('bold');
        root.append(headingNode.append(headingTextNode1, headingTextNode2));
        headingTextNode2.selectEnd();
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1 dir="ltr"><span data-lexical-text="true">hello</span><strong data-lexical-text="true"> world</strong></h1></div>',
      );
      await editor.update(() => {
        const selection = $getSelection() as RangeSelection;
        const result = headingNode.insertNewAfter(selection);
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(headingNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><h1 dir="ltr"><span data-lexical-text="true">hello</span><strong data-lexical-text="true"> world</strong></h1><p><br></p></div>',
      );
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
      let headingNode: HeadingNode;
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
