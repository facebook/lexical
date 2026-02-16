/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {createHeadlessEditor} from '@lexical/headless';
import {LinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

import {LINK} from '../../MarkdownTransformers';

describe('MarkdownLinkBug', () => {
  test('Expect text BEFORE a markdown link to be preserved', () => {
    const editor = createHeadlessEditor({
      nodes: [LinkNode],
      onError(error) {
        throw error;
      },
    });

    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('Start [test](url)');
      paragraph.append(textNode);
      root.append(paragraph);

      const match = LINK.regExp.exec(textNode.getTextContent());

      expect(match).not.toBeNull();
      if (match) {
        // @ts-ignore
        LINK.replace(textNode, match);
      }

      const children = paragraph.getChildren();
      expect(children.length).toBe(2);
      expect(children[0].getTextContent()).toBe('Start ');
      expect(children[1].getTextContent()).toBe('test');
      expect(children[1]).toBeInstanceOf(LinkNode);
    });
  });

  test('LINK.replace handles stale match indices (Simulation of Bold + Link)', () => {
    const editor = createHeadlessEditor({
      nodes: [LinkNode],
      onError(error) {
        throw error;
      },
    });

    editor.update(() => {
      // Original Markdown: "**Bold** [Link](url)"
      // The Bold transformer has already run, so we have two text nodes:
      // Node 1: "Bold" (Bold Format)
      // Node 2: " [Link](url)" (Plain Text) <--- The Link Transformer sees this

      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const boldNode = $createTextNode('Bold');
      boldNode.setFormat('bold');

      const linkTextNode = $createTextNode(' [Link](url)');

      paragraph.append(boldNode, linkTextNode);
      root.append(paragraph);

      // The Regex was run on the ORIGINAL full string "**Bold** [Link](url)"
      // So the match index is 9 (where [Link] starts in the original string).
      const originalString = '**Bold** [Link](url)';
      const match = LINK.regExp.exec(originalString);

      expect(match).not.toBeNull();
      // Verify our assumption: The match index IS 9
      expect(match!.index).toBe(9);

      // If the bug exists, it uses match.index (9) on ' [Link](url)' (length 12).
      // 9 is near the end of the string, so it cuts the link in half.
      // If the fix exists, it uses indexOf('[Link](url)') which is 1.
      if (match) {
        // @ts-ignore - Explicitly testing the private replace method
        LINK.replace(linkTextNode, match);
      }

      const children = paragraph.getChildren();

      // We expect: [BoldNode, TextNode(" "), LinkNode]
      // If buggy: It usually produces [BoldNode, TextNode(" [Link](ur"), TextNode("l)")] or crashes
      expect(children.length).toBe(3);
      expect(children[1].getTextContent()).toBe(' ');

      const linkNode = children[2];
      expect(linkNode).toBeInstanceOf(LinkNode);
      expect(linkNode.getTextContent()).toBe('Link');
      // @ts-ignore
      expect(linkNode.getURL()).toBe('url');
    });
  });
});
