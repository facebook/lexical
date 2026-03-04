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

// Simulates the GH-12345 use-case: a custom tag matcher
const GH_TAG_MATCHER = createLinkMatcherWithRegExp(
  /GH-\d+/,
  (text) => `https://github.com/facebook/lexical/issues/${text.slice(3)}`,
);

describe('LexicalAutoLinkExtension tests', () => {
  test('registerAutoLink does not cause infinite transform loop with #1234.Another', async () => {
    // Register AutoLink with a hashtag matcher that matches # followed by digits
    const hashtagMatcher = createLinkMatcherWithRegExp(/#\d+/);

    const editor = buildEditorFromExtensions({
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
    const editor = buildEditorFromExtensions({
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
    const editor = buildEditorFromExtensions({
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

  describe('separators config option', () => {
    test('default separators: colon after match prevents link creation', () => {
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123:')),
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
        assert($isParagraphNode(paragraphNode), 'must be ParagraphNode');
        // The first child should NOT be an AutoLinkNode because colon is not a valid separator in the default config.
        const firstChild = paragraphNode.getFirstChild();
        expect($isAutoLinkNode(firstChild)).toBe(false);
        expect(paragraphNode.getTextContent()).toBe('GH-123:');
      });
    });

    test('custom separators including colon: link created when followed by colon', () => {
      // With separators: /[.,;:\s]/, the colon IS a valid separator, so "GH-123:" SHOULD result in an AutoLinkNode for "GH-123" and a trailing ":".
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123:')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const paragraphNode = root.getFirstChild();
        assert($isParagraphNode(paragraphNode), 'must be ParagraphNode');

        const autoLinkNode = paragraphNode.getFirstChild();
        assert(
          $isAutoLinkNode(autoLinkNode),
          'first child must be an AutoLinkNode',
        );
        expect(autoLinkNode.getTextContent()).toBe('GH-123');
        expect(autoLinkNode.getURL()).toBe(
          'https://github.com/facebook/lexical/issues/123',
        );

        // The trailing colon should be a plain text node
        const trailingColon = autoLinkNode.getNextSibling();
        assert($isTextNode(trailingColon), 'trailing colon must be a TextNode');
        expect(trailingColon.getTextContent()).toBe(':');
      });
    });

    test('custom separators: link preceded by colon is created', () => {
      // "In :GH-123 we fixed a bug" — colon before the match is a separator with the custom config, so the link should be created.
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('In :GH-123 we fixed a bug'),
            ),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const paragraphNode = root.getFirstChild();
        assert($isParagraphNode(paragraphNode), 'must be ParagraphNode');
        expect(paragraphNode.getTextContent()).toBe(
          'In :GH-123 we fixed a bug',
        );

        // Find the AutoLinkNode among children
        const children = paragraphNode.getChildren();
        const autoLinkNode = children.find($isAutoLinkNode);
        assert(autoLinkNode != null, 'must contain an AutoLinkNode');
        expect(autoLinkNode.getTextContent()).toBe('GH-123');
      });
    });

    test('custom separators: typical weekly-report pattern "GH-123:\\n- item" creates link', () => {
      // Primary motivation from issue #8189: "GH-12345:\n* investigated..." should link GH-12345.
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123:')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const para = root.getFirstChild();
        assert($isParagraphNode(para), 'must be ParagraphNode');

        const link = para.getFirstChild();
        assert($isAutoLinkNode(link), 'first child must be an AutoLinkNode');
        expect(link.getTextContent()).toBe('GH-123');

        const colon = link.getNextSibling();
        assert($isTextNode(colon), 'next sibling must be a TextNode');
        expect(colon.getTextContent()).toBe(':');
      });
    });

    test('custom separators: link still created when followed by space (default behaviour preserved)', () => {
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123 was fixed')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const para = root.getFirstChild();
        assert($isParagraphNode(para), 'must be ParagraphNode');

        const link = para.getFirstChild();
        assert($isAutoLinkNode(link), 'first child must be an AutoLinkNode');
        expect(link.getTextContent()).toBe('GH-123');
      });
    });

    test('custom separators: link still created when followed by period (default behaviour preserved)', () => {
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('See GH-123.')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const para = root.getFirstChild();

        assert($isParagraphNode(para), 'must be ParagraphNode');

        const children = para.getChildren();
        const link = children.find($isAutoLinkNode);

        assert(link != null, 'must contain an AutoLinkNode');
        expect(link.getTextContent()).toBe('GH-123');
      });
    });

    test('custom separators: link NOT created when followed by a non-separator character', () => {
      // "GH-123abc" — 'a' is not a separator even with custom separators
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123abc')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const para = root.getFirstChild();
        assert($isParagraphNode(para), 'must be ParagraphNode');

        const firstChild = para.getFirstChild();
        expect($isAutoLinkNode(firstChild)).toBe(false);
        expect(para.getTextContent()).toBe('GH-123abc');
      });
    });

    test('custom separators: multiple matches in one paragraph all linked', () => {
      // "GH-1: fixed, GH-2: resolved" — both should be linked
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('GH-1: fixed, GH-2: resolved'),
            ),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const root = $getRoot();
        const para = root.getFirstChild();
        assert($isParagraphNode(para), 'must be ParagraphNode');

        const autoLinks = para.getChildren().filter($isAutoLinkNode);
        expect(autoLinks).toHaveLength(2);
        expect(autoLinks[0].getTextContent()).toBe('GH-1');
        expect(autoLinks[1].getTextContent()).toBe('GH-2');
      });
    });

    test('custom separators: link is unwrapped when a non-separator is typed after it', async () => {
      // Start with "GH-123:" — linked. Then programmatically update the text to "GH-123x" (non-separator). The link should be destroyed.
      const editor = buildEditorFromExtensions({
        $initialEditorState() {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('GH-123:')),
          );
        },
        dependencies: [
          TestLexicalAutoLinkExtension,
          configExtension(AutoLinkExtension, {
            matchers: [GH_TAG_MATCHER],
            separators: /[.,;:\s]/,
          }),
        ],
        name: '[test override]',
      });

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        assert($isParagraphNode(para));
        assert($isAutoLinkNode(para.getFirstChild()));
      });

      editor.update(() => {
        const para = $getRoot().getFirstChildOrThrow();
        assert($isParagraphNode(para));

        const trailingText = para.getLastChild();
        assert($isTextNode(trailingText));

        trailingText.setTextContent('x');
      });

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        assert($isParagraphNode(para));

        const firstChild = para.getFirstChild();
        expect($isAutoLinkNode(firstChild)).toBe(false);
      });
    });
  });
});
