/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    link: 'my-link-class',
    text: {
      bold: 'my-bold-class',
      code: 'my-code-class',
      hashtag: 'my-hashtag-class',
      italic: 'my-italic-class',
      strikethrough: 'my-strikethrough-class',
      underline: 'my-underline-class',
      underlineStrikethrough: 'my-underline-strikethrough-class',
    },
  },
});

describe('LexicalLinkNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('LinkNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('/');

        expect(linkNode.__type).toBe('link');
        expect(linkNode.__url).toBe('/');
      });

      expect(() => new LinkNode('')).toThrow();
    });

    test('LineBreakNode.clone()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('/');

        const linkNodeClone = LinkNode.clone(linkNode);

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

      editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-link-class"></a>',
        );
        expect(
          linkNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<a href="https://example.com/foo"></a>');
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

    test('LinkNode.canInsertTextBefore()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');

        expect(linkNode.canInsertTextBefore()).toBe(false);
      });
    });

    test('LinkNode.canInsertTextAfter()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');

        expect(linkNode.canInsertTextAfter()).toBe(false);
      });
    });

    test('$createLinkNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo');

        const createdLinkNode = $createLinkNode('https://example.com/foo');

        expect(linkNode.__type).toEqual(createdLinkNode.__type);
        expect(linkNode.__parent).toEqual(createdLinkNode.__parent);
        expect(linkNode.__url).toEqual(createdLinkNode.__url);
        expect(linkNode.__key).not.toEqual(createdLinkNode.__key);
      });
    });

    test('$isLinkNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('');

        expect($isLinkNode(linkNode)).toBe(true);
      });
    });
  });
});
