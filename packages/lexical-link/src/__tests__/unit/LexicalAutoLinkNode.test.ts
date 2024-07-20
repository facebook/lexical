/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $toggleLink,
  AutoLinkNode,
  SerializedAutoLinkNode,
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
    link: 'my-autolink-class',
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

describe('LexicalAutoAutoLinkNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('AutoAutoLinkNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const actutoLinkNode = new AutoLinkNode('/');

        expect(actutoLinkNode.__type).toBe('autolink');
        expect(actutoLinkNode.__url).toBe('/');
        expect(actutoLinkNode.__isUnlinked).toBe(false);
      });

      expect(() => new AutoLinkNode('')).toThrow();
    });

    test('AutoAutoLinkNode.constructor with isUnlinked param set to true', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const actutoLinkNode = new AutoLinkNode('/', {
          isUnlinked: true,
        });

        expect(actutoLinkNode.__type).toBe('autolink');
        expect(actutoLinkNode.__url).toBe('/');
        expect(actutoLinkNode.__isUnlinked).toBe(true);
      });

      expect(() => new AutoLinkNode('')).toThrow();
    });

    ///

    test('LineBreakNode.clone()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('/');

        const clone = AutoLinkNode.clone(autoLinkNode);

        expect(clone).not.toBe(autoLinkNode);
        expect(clone).toStrictEqual(autoLinkNode);
      });
    });

    test('AutoLinkNode.getURL()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');

        expect(autoLinkNode.getURL()).toBe('https://example.com/foo');
      });
    });

    test('AutoLinkNode.setURL()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');

        expect(autoLinkNode.getURL()).toBe('https://example.com/foo');

        autoLinkNode.setURL('https://example.com/bar');

        expect(autoLinkNode.getURL()).toBe('https://example.com/bar');
      });
    });

    test('AutoLinkNode.getTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          target: '_blank',
        });

        expect(autoLinkNode.getTarget()).toBe('_blank');
      });
    });

    test('AutoLinkNode.setTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          target: '_blank',
        });

        expect(autoLinkNode.getTarget()).toBe('_blank');

        autoLinkNode.setTarget('_self');

        expect(autoLinkNode.getTarget()).toBe('_self');
      });
    });

    test('AutoLinkNode.getRel()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
        });

        expect(autoLinkNode.getRel()).toBe('noopener noreferrer');
      });
    });

    test('AutoLinkNode.setRel()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener',
          target: '_blank',
        });

        expect(autoLinkNode.getRel()).toBe('noopener');

        autoLinkNode.setRel('noopener noreferrer');

        expect(autoLinkNode.getRel()).toBe('noopener noreferrer');
      });
    });

    test('AutoLinkNode.getTitle()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          title: 'Hello world',
        });

        expect(autoLinkNode.getTitle()).toBe('Hello world');
      });
    });

    test('AutoLinkNode.setTitle()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          title: 'Hello world',
        });

        expect(autoLinkNode.getTitle()).toBe('Hello world');

        autoLinkNode.setTitle('World hello');

        expect(autoLinkNode.getTitle()).toBe('World hello');
      });
    });

    test('AutoLinkNode.getIsUnlinked()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('/', {
          isUnlinked: true,
        });
        expect(autoLinkNode.getIsUnlinked()).toBe(true);
      });
    });

    test('AutoLinkNode.setIsUnlinked()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('/');
        expect(autoLinkNode.getIsUnlinked()).toBe(false);
        autoLinkNode.setIsUnlinked(true);
        expect(autoLinkNode.getIsUnlinked()).toBe(true);
      });
    });

    test('AutoLinkNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-autolink-class"></a>',
        );
        expect(
          autoLinkNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<a href="https://example.com/foo"></a>');
      });
    });

    test('AutoLinkNode.createDOM() for unlinked', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          isUnlinked: true,
        });

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          `<span>${autoLinkNode.getTextContent()}</span>`,
        );
      });
    });

    test('AutoLinkNode.createDOM() with target, rel and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-autolink-class"></a>',
        );
        expect(
          autoLinkNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world"></a>',
        );
      });
    });

    test('AutoLinkNode.createDOM() sanitizes javascript: URLs', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        // eslint-disable-next-line no-script-url
        const autoLinkNode = new AutoLinkNode('javascript:alert(0)');
        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="about:blank" class="my-autolink-class"></a>',
        );
      });
    });

    test('AutoLinkNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');

        const domElement = autoLinkNode.createDOM(editorConfig);

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-autolink-class"></a>',
        );

        const newAutoLinkNode = new AutoLinkNode('https://example.com/bar');
        const result = newAutoLinkNode.updateDOM(
          autoLinkNode,
          domElement,
          editorConfig,
        );

        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/bar" class="my-autolink-class"></a>',
        );
      });
    });

    test('AutoLinkNode.updateDOM() with target, rel and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = autoLinkNode.createDOM(editorConfig);

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-autolink-class"></a>',
        );

        const newAutoLinkNode = new AutoLinkNode('https://example.com/bar', {
          rel: 'noopener',
          target: '_self',
          title: 'World hello',
        });
        const result = newAutoLinkNode.updateDOM(
          autoLinkNode,
          domElement,
          editorConfig,
        );

        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/bar" target="_self" rel="noopener" title="World hello" class="my-autolink-class"></a>',
        );
      });
    });

    test('AutoLinkNode.updateDOM() with undefined target, undefined rel and undefined title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = autoLinkNode.createDOM(editorConfig);

        expect(autoLinkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-autolink-class"></a>',
        );

        const newNode = new AutoLinkNode('https://example.com/bar');
        const result = newNode.updateDOM(
          autoLinkNode,
          domElement,
          editorConfig,
        );

        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/bar" class="my-autolink-class"></a>',
        );
      });
    });

    test('AutoLinkNode.updateDOM() with isUnlinked "true"', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          isUnlinked: false,
        });

        const domElement = autoLinkNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-autolink-class"></a>',
        );

        const newAutoLinkNode = new AutoLinkNode('https://example.com/bar', {
          isUnlinked: true,
        });
        const newDomElement = newAutoLinkNode.createDOM(editorConfig);
        expect(newDomElement.outerHTML).toBe(
          `<span>${newAutoLinkNode.getTextContent()}</span>`,
        );

        const result = newAutoLinkNode.updateDOM(
          autoLinkNode,
          domElement,
          editorConfig,
        );
        expect(result).toBe(true);
      });
    });

    test('AutoLinkNode.canInsertTextBefore()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');

        expect(autoLinkNode.canInsertTextBefore()).toBe(false);
      });
    });

    test('AutoLinkNode.canInsertTextAfter()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');
        expect(autoLinkNode.canInsertTextAfter()).toBe(false);
      });
    });

    test('$createAutoLinkNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo');
        const createdAutoLinkNode = $createAutoLinkNode(
          'https://example.com/foo',
        );

        expect(autoLinkNode.__type).toEqual(createdAutoLinkNode.__type);
        expect(autoLinkNode.__parent).toEqual(createdAutoLinkNode.__parent);
        expect(autoLinkNode.__url).toEqual(createdAutoLinkNode.__url);
        expect(autoLinkNode.__isUnlinked).toEqual(
          createdAutoLinkNode.__isUnlinked,
        );
        expect(autoLinkNode.__key).not.toEqual(createdAutoLinkNode.__key);
      });
    });

    test('$createAutoLinkNode() with target, rel, isUnlinked and title', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const createdAutoLinkNode = $createAutoLinkNode(
          'https://example.com/foo',
          {
            isUnlinked: true,
            rel: 'noopener noreferrer',
            target: '_blank',
            title: 'Hello world',
          },
        );

        expect(autoLinkNode.__type).toEqual(createdAutoLinkNode.__type);
        expect(autoLinkNode.__parent).toEqual(createdAutoLinkNode.__parent);
        expect(autoLinkNode.__url).toEqual(createdAutoLinkNode.__url);
        expect(autoLinkNode.__target).toEqual(createdAutoLinkNode.__target);
        expect(autoLinkNode.__rel).toEqual(createdAutoLinkNode.__rel);
        expect(autoLinkNode.__title).toEqual(createdAutoLinkNode.__title);
        expect(autoLinkNode.__key).not.toEqual(createdAutoLinkNode.__key);
        expect(autoLinkNode.__isUnlinked).not.toEqual(
          createdAutoLinkNode.__isUnlinked,
        );
      });
    });

    test('$isAutoLinkNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const autoLinkNode = new AutoLinkNode('');
        expect($isAutoLinkNode(autoLinkNode)).toBe(true);
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
      const link = paragraph.children[0] as SerializedAutoLinkNode;
      expect(link.title).toBe('Lexical Website');
    });
  });
});
