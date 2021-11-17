/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LinkNode, createLinkNode, isLinkNode} from 'outline/LinkNode';
import {initializeUnitTest} from '../utils';

const editorConfig = Object.freeze({
  theme: {
    text: {
      bold: 'my-bold-class',
      underline: 'my-underline-class',
      strikethrough: 'my-strikethrough-class',
      underlineStrikethrough: 'my-underline-strikethrough-class',
      italic: 'my-italic-class',
      code: 'my-code-class',
      hashtag: 'my-hashtag-class',
    },
    link: 'my-link-class',
  },
});

describe('OutlineLinkNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('LinkNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('/');
        expect(linkNode.__flags).toBe(0);
        expect(linkNode.__type).toBe('link');
        expect(linkNode.__url).toBe('/');
      });
      expect(() => new LinkNode()).toThrow();
    });

    test('LineBreakNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('/');
        const linkNodeClone = linkNode.constructor.clone(linkNode);
        expect(linkNodeClone).not.toBe(linkNode);
        expect(linkNodeClone).toStrictEqual(linkNode);
      });
    });

    test('LinkNode.getURL()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        expect(linkNode.getURL()).toBe('https://example.com/foo');
      });
    });

    test('LinkNode.setURL()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        expect(linkNode.getURL()).toBe('https://example.com/foo');
        linkNode.setURL('https://example.com/bar');
        expect(linkNode.getURL()).toBe('https://example.com/bar');
      });
    });

    test('LinkNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-link-class"></a>',
        );
        expect(linkNode.createDOM({theme: {}}).outerHTML).toBe(
          '<a href="https://example.com/foo"></a>',
        );
      });
    });

    test('LinkNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        const domElement = linkNode.createDOM(editorConfig);
        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-link-class"></a>',
        );
        const newLinkNode = new LinkNode('https://example.com/bar');
        const result = newLinkNode.updateDOM(
          linkNode,
          domElement,
          editorConfig,
        );
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/bar" class="my-link-class"></a>',
        );
      });
    });

    test('LinkNode.canInsertTextAtBoundary()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        expect(linkNode.canInsertTextAtBoundary()).toBe(false);
      });
    });

    test('createLinkNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');
        const createdLinkNode = createLinkNode('https://example.com/foo');
        expect(linkNode.__type).toEqual(createdLinkNode.__type);
        expect(linkNode.__flags).toEqual(createdLinkNode.__flags);
        expect(linkNode.__parent).toEqual(createdLinkNode.__parent);
        expect(linkNode.__url).toEqual(createdLinkNode.__url);
        expect(linkNode.__key).not.toEqual(createdLinkNode.__key);
      });
    });

    test('isLinkNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const linkNode = new LinkNode();
        expect(isLinkNode(linkNode)).toBe(true);
      });
    });
  });
});
