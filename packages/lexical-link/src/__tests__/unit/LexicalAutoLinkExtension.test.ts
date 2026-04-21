/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $isAutoLinkNode,
  AutoLinkExtension,
  createLinkMatcherWithRegExp,
} from '@lexical/link';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  configExtension,
  defineExtension,
  ElementNode,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

class ExcludedParentNode extends ElementNode {
  $config() {
    return this.config('excluded-parent', {extends: ElementNode});
  }
}

function $isExcludedParentNode(
  node: LexicalNode | null | undefined,
): node is ExcludedParentNode {
  return node instanceof ExcludedParentNode;
}

const TestLexicalAutoLinkExtension = defineExtension({
  dependencies: [AutoLinkExtension],
  name: '[test root]',
  nodes: [ExcludedParentNode],
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
const PORT_URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}:\d+/,
);
const GH_TAG_MATCHER = createLinkMatcherWithRegExp(/GH-\d+/);

describe('LexicalAutoLinkExtension tests', () => {
  test('registerAutoLink does not cause infinite transform loop with #1234.Another', async () => {
    // Register AutoLink with a hashtag matcher that matches # followed by digits
    const hashtagMatcher = createLinkMatcherWithRegExp(/#\d+/);

    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        // Initialize content with #1234.Another - this should not cause an infinite loop
        $getRoot().append(
          $createParagraphNode().append($createTextNode('#1234.Another')),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          matchers: [hashtagMatcher],
        }),
      ],
      name: '[test override]',
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
  });

  test('excludeParents prevents auto-linking inside excluded parent nodes', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $create(ExcludedParentNode).append(
            $createTextNode('https://example.com'),
          ),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          excludeParents: [$isExcludedParentNode],
          matchers: [URL_MATCHER],
        }),
      ],
      name: '[test override]',
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
  });

  test('excludeParents does not prevent auto-linking in non-excluded parents', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('https://example.com')),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          excludeParents: [$isExcludedParentNode],
          matchers: [URL_MATCHER],
        }),
      ],
      name: '[test override]',
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
  });

  test('default punctuation does not treat colon as an auto-link boundary', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('GH-123: investigate')),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          matchers: [GH_TAG_MATCHER],
        }),
      ],
      name: '[test override]',
    });

    editor.read(() => {
      const root = $getRoot();
      const paragraphNode = root.getFirstChild();
      assert(
        $isParagraphNode(paragraphNode),
        'first root child must be a ParagraphNode',
      );
      const firstChild = paragraphNode.getFirstChild();
      assert($isTextNode(firstChild), 'first child must be a TextNode');
      expect(firstChild.getTextContent()).toBe('GH-123: investigate');
    });
  });

  test('custom punctuation can treat colon as an auto-link boundary', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('GH-123: investigate')),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          matchers: [GH_TAG_MATCHER],
          punctuation: '.,;:',
        }),
      ],
      name: '[test override]',
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
      expect(autoLinkNode.getTextContent()).toBe('GH-123');

      const nextSibling = autoLinkNode.getNextSibling();
      assert($isTextNode(nextSibling), 'next sibling must be a TextNode');
      expect(nextSibling.getTextContent()).toBe(': investigate');
    });
  });

  test('custom punctuation does not break auto-linking URLs with embedded colons', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('https://example.com:3000 '),
          ),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          matchers: [PORT_URL_MATCHER],
          punctuation: '.,;:',
        }),
      ],
      name: '[test override]',
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
      expect(autoLinkNode.getTextContent()).toBe('https://example.com:3000');

      const nextSibling = autoLinkNode.getNextSibling();
      assert($isTextNode(nextSibling), 'next sibling must be a TextNode');
      expect(nextSibling.getTextContent()).toBe(' ');
    });
  });

  test('custom punctuation escapes regex-special characters', async () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('GH-123] investigate')),
        );
      },
      dependencies: [
        TestLexicalAutoLinkExtension,
        configExtension(AutoLinkExtension, {
          matchers: [GH_TAG_MATCHER],
          punctuation: '.,;]',
        }),
      ],
      name: '[test override]',
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
      expect(autoLinkNode.getTextContent()).toBe('GH-123');

      const nextSibling = autoLinkNode.getNextSibling();
      assert($isTextNode(nextSibling), 'next sibling must be a TextNode');
      expect(nextSibling.getTextContent()).toBe('] investigate');
    });
  });
});
