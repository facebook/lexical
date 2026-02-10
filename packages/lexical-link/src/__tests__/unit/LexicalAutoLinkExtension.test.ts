/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isAutoLinkNode,
  AutoLinkNode,
  createLinkMatcherWithRegExp,
  registerAutoLink,
} from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  ElementNode,
  type LexicalNode,
  ParagraphNode,
  TextNode,
} from 'lexical/src';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

class ExcludedParentNode extends ElementNode {
  static getType(): string {
    return 'excluded-parent';
  }
  static clone(node: ExcludedParentNode): ExcludedParentNode {
    return new ExcludedParentNode(node.__key);
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}

function $createExcludedParentNode(): ExcludedParentNode {
  return new ExcludedParentNode();
}

function $isExcludedParentNode(
  node: LexicalNode | null | undefined,
): node is ExcludedParentNode {
  return $isElementNode(node) && node.getType() === 'excluded-parent';
}

const editorConfig = Object.freeze({
  namespace: '',
  nodes: [AutoLinkNode, ParagraphNode, TextNode, ExcludedParentNode],
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

const URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
);

describe('LexicalAutoLinkExtension tests', () => {
  initializeUnitTest((testEnv) => {
    test('registerAutoLink does not cause infinite transform loop with #1234.Another', async () => {
      const {editor} = testEnv;

      // Register AutoLink with a hashtag matcher that matches # followed by digits
      const hashtagMatcher = createLinkMatcherWithRegExp(/#\d+/);
      const unregister = registerAutoLink(editor, {
        changeHandlers: [],
        excludeParents: [],
        matchers: [hashtagMatcher],
      });

      // Initialize content with #1234.Another - this should not cause an infinite loop
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('#1234.Another');
        paragraph.append(textNode);
        root.append(paragraph);
      });

      // Verify content is correct and that #1234 was converted to an AutoLinkNode
      editor.read(() => {
        const root = $getRoot();
        const paragraphNode = root.getFirstChild();
        assert(
          $isParagraphNode(paragraphNode),
          'first root child must be a ParagraphNode',
        );
        expect(paragraphNode.getTextContent()).toBe('#1234.Another');

        // Verify that #1234 was converted to an AutoLinkNode
        const autoLinkNode = paragraphNode.getFirstChild();
        assert(
          $isAutoLinkNode(autoLinkNode),
          'first child must be an AutoLinkNode',
        );

        // The AutoLinkNode should contain "#1234" only (the matched portion)
        expect(autoLinkNode.getTextContent()).toBe('#1234');

        // Verify that ".Another" is separate text after the link (unmatched portion)
        const nextSibling = autoLinkNode.getNextSibling();
        assert($isTextNode(nextSibling), 'next sibling must be a TextNode');
        expect(nextSibling.getTextContent()).toBe('.Another');
      });

      unregister();
    });

    test('excludeParents prevents auto-linking inside excluded parent nodes', async () => {
      const {editor} = testEnv;

      const unregister = registerAutoLink(editor, {
        changeHandlers: [],
        excludeParents: [$isExcludedParentNode],
        matchers: [URL_MATCHER],
      });

      await editor.update(() => {
        const root = $getRoot();
        const excludedParent = $createExcludedParentNode();
        const textNode = $createTextNode('https://example.com');
        excludedParent.append(textNode);
        root.append(excludedParent);
      });

      editor.read(() => {
        const root = $getRoot();
        const excludedParent = root.getFirstChild();
        assert(
          $isExcludedParentNode(excludedParent),
          'first root child must be an ExcludedParentNode',
        );
        const child = excludedParent.getFirstChild();
        assert($isTextNode(child), 'child must be a TextNode');
        expect(child.getTextContent()).toBe('https://example.com');
      });

      unregister();
    });

    test('excludeParents does not prevent auto-linking in non-excluded parents', async () => {
      const {editor} = testEnv;

      const unregister = registerAutoLink(editor, {
        changeHandlers: [],
        excludeParents: [$isExcludedParentNode],
        matchers: [URL_MATCHER],
      });

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('https://example.com');
        paragraph.append(textNode);
        root.append(paragraph);
      });

      editor.read(() => {
        const root = $getRoot();
        const paragraphNode = root.getFirstChild();
        assert(
          $isParagraphNode(paragraphNode),
          'first root child must be a ParagraphNode',
        );
        const autoLinkNode = paragraphNode.getFirstChild();
        assert(
          $isAutoLinkNode(autoLinkNode),
          'first child must be an AutoLinkNode',
        );
        expect(autoLinkNode.getTextContent()).toBe('https://example.com');
      });

      unregister();
    });
  }, editorConfig);
});
