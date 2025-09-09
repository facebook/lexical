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
  formatUrl,
  LinkNode,
  SerializedLinkNode,
} from '@lexical/link';
import {$createMarkNode, $isMarkNode} from '@lexical/mark';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $selectAll,
  ParagraphNode,
  RangeSelection,
  SerializedParagraphNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it, test} from 'vitest';

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
        const linkNode = $createLinkNode('/');

        expect(linkNode.__type).toBe('link');
        expect(linkNode.__url).toBe('/');
      });

      expect(() => $createLinkNode('')).toThrow();
    });

    test('LinkNode.clone()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('/');

        const linkNodeClone = LinkNode.clone(linkNode);

        expect(linkNodeClone).not.toBe(linkNode);
        expect(linkNodeClone).toStrictEqual(linkNode);
      });
    });

    test('LinkNode.getURL()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo');

        expect(linkNode.getURL()).toBe('https://example.com/foo');
      });
    });

    test('LinkNode.setURL()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo');

        expect(linkNode.getURL()).toBe('https://example.com/foo');

        linkNode.setURL('https://example.com/bar');

        expect(linkNode.getURL()).toBe('https://example.com/bar');
      });
    });

    test('LinkNode.getTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo', {
          target: '_blank',
        });

        expect(linkNode.getTarget()).toBe('_blank');
      });
    });

    test('LinkNode.setTarget()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo', {
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
        const linkNode = $createLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
        });

        expect(linkNode.getRel()).toBe('noopener noreferrer');
      });
    });

    test('LinkNode.setRel()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo', {
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
        const linkNode = $createLinkNode('https://example.com/foo', {
          title: 'Hello world',
        });

        expect(linkNode.getTitle()).toBe('Hello world');
      });
    });

    test('LinkNode.setTitle()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo', {
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
        const linkNode = $createLinkNode('https://example.com/foo');

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
        const linkNode = $createLinkNode('https://example.com/foo', {
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
        const linkNode = $createLinkNode('javascript:alert(0)');
        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="about:blank" class="my-link-class"></a>',
        );
      });
    });

    describe('LinkNode.createDOM() formats URLs', () => {
      [
        {input: 'https://example.com', output: 'https://example.com'},
        {input: 'https://www.example.com', output: 'https://www.example.com'},
        {input: 'example.com', output: 'https://example.com'},
        {input: 'www.example.com', output: 'https://www.example.com'},
        {input: 'mailto:user@example.com', output: 'mailto:user@example.com'},
        {input: 'user@example.com', output: 'mailto:user@example.com'},
        {input: '+1234567890', output: 'tel:+1234567890'},
      ].forEach(({input, output}) =>
        test(`${input} -> ${output}`, async () => {
          const {editor} = testEnv;

          await editor.update(() => {
            // eslint-disable-next-line no-script-url
            const linkNode = $createLinkNode(input);
            expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
              `<a href="${output}" class="my-link-class"></a>`,
            );
          });
        }),
      );
    });

    test('LinkNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo');

        const domElement = linkNode.createDOM(editorConfig);

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" class="my-link-class"></a>',
        );

        const newLinkNode = $createLinkNode('https://example.com/bar');
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
        const linkNode = $createLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = linkNode.createDOM(editorConfig);

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-link-class"></a>',
        );

        const newLinkNode = $createLinkNode('https://example.com/bar', {
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
        const linkNode = $createLinkNode('https://example.com/foo', {
          rel: 'noopener noreferrer',
          target: '_blank',
          title: 'Hello world',
        });

        const domElement = linkNode.createDOM(editorConfig);

        expect(linkNode.createDOM(editorConfig).outerHTML).toBe(
          '<a href="https://example.com/foo" target="_blank" rel="noopener noreferrer" title="Hello world" class="my-link-class"></a>',
        );

        const newLinkNode = $createLinkNode('https://example.com/bar');
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
        const linkNode = $createLinkNode('https://example.com/foo');

        expect(linkNode.canInsertTextBefore()).toBe(false);
      });
    });

    test('LinkNode.canInsertTextAfter()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo');

        expect(linkNode.canInsertTextAfter()).toBe(false);
      });
    });

    test('$createLinkNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const linkNode = $createLinkNode('https://example.com/foo');

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
        const linkNode = $createLinkNode('https://example.com/foo', {
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
        const linkNode = $createLinkNode('');

        expect($isLinkNode(linkNode)).toBe(true);
      });
    });

    test('$toggleLink applies the title attribute when creating', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const p = $createParagraphNode();
        const textNode = $createTextNode('Some text');
        p.append(textNode);
        $getRoot().append(p);
        $selectAll();
        $toggleLink('https://lexical.dev/', {title: 'Lexical Website'});
        const linkNode = p.getFirstChild() as LinkNode;
        expect($isLinkNode(linkNode)).toBe(true);
        expect(linkNode.getTitle()).toBe('Lexical Website');
        const selection = $getSelection() as RangeSelection;
        expect($isRangeSelection(selection)).toBe(true);
        expect(selection.anchor).toMatchObject({
          key: textNode.getKey(),
          offset: 0,
          type: 'text',
        });
        expect(selection.focus).toMatchObject({
          key: textNode.getKey(),
          offset: textNode.getTextContentSize(),
          type: 'text',
        });
      });

      const paragraph = editor!.getEditorState().toJSON().root
        .children[0] as SerializedParagraphNode;
      const link = paragraph.children[0] as SerializedLinkNode;
      expect(link.title).toBe('Lexical Website');
    });

    test('$toggleLink correctly removes link when textnode has children(like marknode)', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const precedingText = $createTextNode('some '); // space after
        const textNode = $createTextNode('text');

        paragraph.append(precedingText, textNode);

        const linkNode = $createLinkNode('https://example.com/foo', {
          rel: 'noreferrer',
        });
        textNode.insertAfter(linkNode);
        linkNode.append(textNode);

        const markNode = $createMarkNode(['knetk']);
        textNode.insertBefore(markNode);
        markNode.append(textNode);
        $getRoot().append(paragraph);
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        const [textNode, linkNode] = paragraph.getChildren();

        // Check first text node
        expect(textNode.getTextContent()).toBe('some ');

        // Check link node and its nested structure
        expect($isLinkNode(linkNode)).toBe(true);
        if ($isLinkNode(linkNode)) {
          expect(linkNode.getURL()).toBe('https://example.com/foo');
          expect(linkNode.getRel()).toBe('noreferrer');

          // Check mark node nested inside link
          const markNode = linkNode.getFirstChild();
          if ($isMarkNode(markNode)) {
            expect(markNode.getType()).toBe('mark');
            expect(markNode.getIDs()).toEqual(['knetk']);
            expect(markNode.getTextContent()).toBe('text');
          }
        }
      });

      await editor.update(() => {
        $selectAll();
        $toggleLink(null);
      });

      // Verify structure after link removal
      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        const [textNode, markNode] = paragraph.getChildren();

        // Check text node remains unchanged
        expect(textNode.getTextContent()).toBe('some ');

        // Check mark node is preserved and moved up to paragraph level
        expect($isMarkNode(markNode)).toBe(true);
        if ($isMarkNode(markNode)) {
          expect(markNode.getType()).toBe('mark');
          expect(markNode.getIDs()).toEqual(['knetk']);
          expect(markNode.getTextContent()).toBe('text');
        }
      });
    });

    test('$toggleLink adds link with embedded LineBreakNode', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const precedingText = $createTextNode('some '); // space after
        const textNode = $createTextNode('text');
        paragraph.append(precedingText, textNode, $createLineBreakNode());
        $getRoot().clear().append(paragraph);
        paragraph.select(1);
        $toggleLink('https://example.com/foo', {
          rel: 'noreferrer',
        });
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        const [precedingText, linkNode] = paragraph.getChildren();

        // Check first text node
        expect(precedingText.getTextContent()).toBe('some ');

        // Check link node and its nested structure
        expect($isLinkNode(linkNode)).toBe(true);
        if ($isLinkNode(linkNode)) {
          expect(linkNode.getURL()).toBe('https://example.com/foo');
          expect(linkNode.getRel()).toBe('noreferrer');
          expect(
            linkNode.getChildren().map((node) => node.getTextContent()),
          ).toEqual(['text', '\n']);
          expect($getSelection()).toMatchObject({
            anchor: {
              key: linkNode.getFirstChildOrThrow().getKey(),
              offset: 0,
              type: 'text',
            },
            focus: {key: linkNode.getKey(), offset: 2, type: 'element'},
          });
        }
      });

      await editor.update(() => {
        $selectAll();
        $toggleLink(null);
      });

      // Verify structure after link removal
      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        const children = paragraph.getChildren();
        expect(children.map((node) => node.getTextContent())).toEqual([
          'some text',
          '\n',
        ]);
        const [textNode, lineBreakNode] = children;
        expect($isTextNode(textNode)).toBe(true);
        expect($isLineBreakNode(lineBreakNode)).toBe(true);
      });
    });
  });
});

describe('formatUrl', () => {
  it('should not modify URLs with protocols', () => {
    expect(formatUrl('https://example.com')).toBe('https://example.com');
    expect(formatUrl('http://example.com')).toBe('http://example.com');
    expect(formatUrl('mailto:user@example.com')).toBe(
      'mailto:user@example.com',
    );
    expect(formatUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should not modify relative paths', () => {
    expect(formatUrl('/path/to/resource')).toBe('/path/to/resource');
    expect(formatUrl('/index.html')).toBe('/index.html');
  });

  it('should add mailto: to email addresses', () => {
    expect(formatUrl('user@example.com')).toBe('mailto:user@example.com');
    expect(formatUrl('name.lastname@domain.co.uk')).toBe(
      'mailto:name.lastname@domain.co.uk',
    );
  });

  it('should add tel: to phone numbers', () => {
    expect(formatUrl('+1234567890')).toBe('tel:+1234567890');
    expect(formatUrl('123-456-7890')).toBe('tel:123-456-7890');
  });

  it('should add https:// to URLs without protocols', () => {
    expect(formatUrl('www.example.com')).toBe('https://www.example.com');
    expect(formatUrl('example.com')).toBe('https://example.com');
    expect(formatUrl('subdomain.example.com/path')).toBe(
      'https://subdomain.example.com/path',
    );
  });
});
