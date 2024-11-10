/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createLinkNode,
  $isLinkNode,
  $toggleLink,
  LinkNode,
  SerializedLinkNode,
} from '@lexical/link';
import {
  $getRoot,
  $selectAll,
  ParagraphNode,
  SerializedParagraphNode,
  TextNode,
} from 'lexical/src';
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

    test('LinkNode.getTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          target: '_blank',
        });

        expect(linkNode.getTarget()).toBe('_blank');
      });
    });

    test('LinkNode.setTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          target: '_blank',
        });

        expect(linkNode.getTarget()).toBe('_blank');

        linkNode.setTarget('_self');

        expect(linkNode.getTarget()).toBe('_self');
      });
    });

    test('LinkNode.getRel()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
        });

        expect(linkNode.getRel()).toBe('noopener noreferrer');
      });
    });

    test('LinkNode.setRel()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener',
          target: '_blank',
        });

        expect(linkNode.getRel()).toBe('noopener');

        linkNode.setRel('noopener noreferrer');

        expect(linkNode.getRel()).toBe('noopener noreferrer');
      });
    });

    test('LinkNode.getTitle()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          title: 'Hello world',
        });

        expect(linkNode.getTitle()).toBe('Hello world');
      });
    });

    test('LinkNode.setTitle()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          title: 'Hello world',
        });

        expect(linkNode.getTitle()).toBe('Hello world');

        linkNode.setTitle('World hello');

        expect(linkNode.getTitle()).toBe('World hello');
      });
    });

    test('LinkNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
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

    test('LinkNode.createDOM() with target, rel and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-link-class"></a>',
        );
        expect(
          linkNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world"></a>',
        );
      });
    });

    test('LinkNode.createDOM() sanitizes javascript: URLs', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        // eslint-disable-next-line no-script-url
        const linkNode = new LinkNode('javascript:alert(0)');
        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="about:blank" class="my-link-class"></a>',
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

    test('LinkNode.updateDOM() with target, rel and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = linkNode.createDOM(editorConfig);

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-link-class"></a>',
        );

        const newLinkNode = new LinkNode('https://example.com/bar', {
          rel: 'noopener',
          target: '_self',
          title: 'World hello',
        });
        const result = newLinkNode.updateDOM(
          linkNode,
          domElement,
          editorConfig,
        );

        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/bar" target="_self" rel="noopener" title="World hello" class="my-link-class"></a>',
        );
      });
    });

    test('LinkNode.updateDOM() with undefined target, undefined rel and undefined title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = linkNode.createDOM(editorConfig);

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-link-class"></a>',
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

    test('$createLinkNode() with target, rel and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = new LinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const createdLinkNode = $createLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        expect(linkNode.__type).toEqual(createdLinkNode.__type);
        expect(linkNode.__parent).toEqual(createdLinkNode.__parent);
        expect(linkNode.__url).toEqual(createdLinkNode.__url);
        expect(linkNode.__target).toEqual(createdLinkNode.__target);
        expect(linkNode.__rel).toEqual(createdLinkNode.__rel);
        expect(linkNode.__title).toEqual(createdLinkNode.__title);
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

    test('$toggleLink applies the title attribute when creating', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const p = new ParagraphNode();
        p.append(new TextNode('Some text'));
        $getRoot().append(p);
      });

      await editor.update(() => {
        $selectAll();
        $toggleLink('https://lexical.dev/', {title: 'Lexical Website'});
      });

      const paragraph = editor!.getEditorState().toJSON().root
        .children[0] as SerializedParagraphNode;
      const link = paragraph.children[0] as SerializedLinkNode;
      expect(link.title).toBe('Lexical Website');
    });
  });
});
