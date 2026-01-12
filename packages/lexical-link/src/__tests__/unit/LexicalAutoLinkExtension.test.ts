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
  $isParagraphNode,
  $isTextNode,
  ParagraphNode,
  TextNode,
} from 'lexical/src';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

const editorConfig = Object.freeze({
  namespace: '',
  nodes: [AutoLinkNode, ParagraphNode, TextNode],
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

describe('LexicalAutoLinkExtension tests', () => {
  initializeUnitTest((testEnv) => {
    test('registerAutoLink does not cause infinite transform loop with #1234.Another', async () => {
      const {editor} = testEnv;

      // Register AutoLink with a hashtag matcher that matches # followed by digits
      const hashtagMatcher = createLinkMatcherWithRegExp(/#\d+/);
      const unregister = registerAutoLink(editor, {
        changeHandlers: [],
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
        const paragraph = root.getFirstChild();

        // Verify paragraph exists (not empty root) and is an ElementNode
        expect(paragraph).not.toBeNull();
        expect($isParagraphNode(paragraph)).toBe(true);

        const paragraphNode = paragraph as ParagraphNode;
        expect(paragraphNode.getTextContent()).toBe('#1234.Another');

        // Verify that #1234 was converted to an AutoLinkNode
        const firstChild = paragraphNode.getFirstChild();
        expect(firstChild).not.toBeNull();
        expect($isAutoLinkNode(firstChild)).toBe(true);

        // The AutoLinkNode should contain "#1234" only (the matched portion)
        const autoLinkNode = firstChild as AutoLinkNode;
        expect(autoLinkNode.getTextContent()).toBe('#1234');

        // Verify that ".Another" is separate text after the link (unmatched portion)
        const nextSibling = autoLinkNode.getNextSibling();
        expect(nextSibling).not.toBeNull();
        expect($isTextNode(nextSibling)).toBe(true);
        expect((nextSibling as TextNode).getTextContent()).toBe('.Another');
      });

      unregister();
    });
  }, editorConfig);
});
