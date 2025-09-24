/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {$isLinkNode, $toggleLink, LinkExtension, LinkNode} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  TextNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

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
    const editor = buildEditorFromExtensions(extension);
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
    editor.dispose();
  });
});
