/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createAutoLinkNode,
  $createLinkNode,
  $isLinkNode,
  $toggleLink,
  AutoLinkNode,
  LinkExtension,
  LinkNode,
} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  TextNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

describe('Link', () => {
  const extension = defineExtension({
    $initialEditorState: () => {
      const p = $createParagraphNode();
      p.append($createTextNode('Hello'));
      $getRoot().append(p);
    },
    dependencies: [LinkExtension, RichTextExtension],
    name: '[root]',
  });
  it('can convert a text node to a link with $toggleLink', () => {
    using editor = buildEditorFromExtensions(extension);
    editor.update(
      () => {
        const textNode: TextNode = $getRoot().getLastDescendant()!;
        textNode.select(0);
        expect($isLinkNode(textNode.getParent())).toBe(false);
        $toggleLink('https://lexical.dev/');
        expect($isLinkNode(textNode.getParent())).toBe(true);
        let linkNode: LinkNode = textNode.getParent()!;
        expect(linkNode.getURL()).toBe('https://lexical.dev/');
        expect(linkNode.getTarget()).toBe(null);
        expect($getRoot().getTextContent()).toBe('Hello');
        $toggleLink(null);
        expect($getRoot().getTextContent()).toBe('Hello');
        expect($isLinkNode(textNode.getParent())).toBe(false);
        $toggleLink({
          rel: 'noopener',
          target: '_blank',
          title: 'title',
          url: 'https://lexical.dev/',
        });
        linkNode = textNode.getParent()!;
        expect(linkNode.getURL()).toBe('https://lexical.dev/');
        expect(linkNode.getTarget()).toBe('_blank');
        expect(linkNode.getRel()).toBe('noopener');
        expect(linkNode.getTitle()).toBe('title');
      },
      {discrete: true},
    );
  });

  describe('merge adjacent LinkNodes', () => {
    it('merges adjacent LinkNodes with identical attributes', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/', {
            rel: 'noreferrer',
            target: '_blank',
            title: 'Lexical',
          });
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://lexical.dev/', {
            rel: 'noreferrer',
            target: '_blank',
            title: 'Lexical',
          });
          link2.append($createTextNode('World'));
          p.append(link1, link2);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        const children = p.getChildren();
        expect(children.length).toBe(1);
        expect($isLinkNode(children[0])).toBe(true);
        const link = children[0] as LinkNode;
        expect(link.getURL()).toBe('https://lexical.dev/');
        expect(link.getTarget()).toBe('_blank');
        expect(link.getRel()).toBe('noreferrer');
        expect(link.getTitle()).toBe('Lexical');
        expect(link.getTextContent()).toBe('Hello World');
      });
    });

    it('does not merge LinkNodes with different URLs', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/');
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://other.dev/');
          link2.append($createTextNode('World'));
          p.append(link1, link2);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        expect(p.getChildren().length).toBe(2);
      });
    });

    it('does not merge LinkNode with AutoLinkNode', () => {
      const autoLinkExtension = defineExtension({
        $initialEditorState: () => {
          const p = $createParagraphNode();
          p.append($createTextNode('Hello'));
          $getRoot().append(p);
        },
        dependencies: [LinkExtension, RichTextExtension],
        name: '[root-autolink]',
        nodes: () => [AutoLinkNode],
      });
      using editor = buildEditorFromExtensions(autoLinkExtension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link = $createLinkNode('https://lexical.dev/');
          link.append($createTextNode('Hello '));
          const autoLink = $createAutoLinkNode('https://lexical.dev/');
          autoLink.append($createTextNode('World'));
          p.append(link, autoLink);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        expect(p.getChildren().length).toBe(2);
      });
    });

    it('does not merge LinkNodes with different rel', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/', {
            rel: 'noreferrer',
          });
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://lexical.dev/', {
            rel: 'noopener',
          });
          link2.append($createTextNode('World'));
          p.append(link1, link2);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        expect(p.getChildren().length).toBe(2);
      });
    });

    it('merges three adjacent identical links into one', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/');
          link1.append($createTextNode('A'));
          const link2 = $createLinkNode('https://lexical.dev/');
          link2.append($createTextNode('B'));
          const link3 = $createLinkNode('https://lexical.dev/');
          link3.append($createTextNode('C'));
          p.append(link1, link2, link3);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        const children = p.getChildren();
        expect(children.length).toBe(1);
        expect($isLinkNode(children[0])).toBe(true);
        expect(children[0].getTextContent()).toBe('ABC');
      });
    });

    it('preserves selection when cursor is in the second link during merge', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/');
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://lexical.dev/');
          const text2 = $createTextNode('World');
          link2.append(text2);
          p.append(link1, link2);
          text2.select(2, 2);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        const children = p.getChildren();
        expect(children.length).toBe(1);
        expect(children[0].getTextContent()).toBe('Hello World');
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if ($isRangeSelection(selection)) {
          expect(selection.anchor.offset).toBe(8);
          expect(selection.anchor.getNode().getTextContent()).toBe(
            'Hello World',
          );
          expect($isLinkNode(selection.anchor.getNode().getParent())).toBe(
            true,
          );
        }
      });
    });

    it('merges when only the second link is changed to match the first', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/');
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://other.dev/');
          link2.append($createTextNode('World'));
          p.append(link1, link2);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        expect(p.getChildren().length).toBe(2);
      });
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          const link2 = p.getChildren()[1];
          assert($isLinkNode(link2), 'Expected LinkNode');
          link2.setURL('https://lexical.dev/');
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        const children = p.getChildren();
        expect(children.length).toBe(1);
        expect($isLinkNode(children[0])).toBe(true);
        expect(children[0].getTextContent()).toBe('Hello World');
      });
    });

    it('preserves selection when cursor is in a link that merges into its left neighbor', () => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          p.clear();
          const link1 = $createLinkNode('https://lexical.dev/');
          link1.append($createTextNode('Hello '));
          const link2 = $createLinkNode('https://other.dev/');
          const text2 = $createTextNode('World');
          link2.append(text2);
          p.append(link1, link2);
          text2.select(2, 2);
        },
        {discrete: true},
      );
      editor.update(
        () => {
          const p = $getRoot().getFirstChild();
          assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
          const link2 = p.getChildren()[1];
          assert($isLinkNode(link2), 'Expected LinkNode');
          link2.setURL('https://lexical.dev/');
        },
        {discrete: true},
      );
      editor.read(() => {
        const p = $getRoot().getFirstChild();
        assert($isParagraphNode(p), 'Expecting a ParagraphNode in the root');
        const children = p.getChildren();
        expect(children.length).toBe(1);
        expect(children[0].getTextContent()).toBe('Hello World');
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if ($isRangeSelection(selection)) {
          expect(selection.anchor.offset).toBe(8);
          expect(selection.anchor.getNode().getTextContent()).toBe(
            'Hello World',
          );
          expect($isLinkNode(selection.anchor.getNode().getParent())).toBe(
            true,
          );
        }
      });
    });
  });
});
