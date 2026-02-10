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
      onError(error) {},
    });

    editor.update(() => {
      // creating a scenario: "Start [test](url)"
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('Start [test](url)');
      paragraph.append(textNode);
      root.append(paragraph);

      const match = LINK.regExp.exec(textNode.getTextContent());

      expect(match).not.toBeNull();
      if (match) {
        LINK.replace!(textNode, match);
      }

      // paragraph should now contain a text node with "Start " and a link node with "test"
      const children = paragraph.getChildren();
      expect(children.length).toBe(2);
      expect(children[0].getTextContent()).toBe('Start ');
      expect(children[1].getTextContent()).toBe('test');
      expect(children[1]).toBeInstanceOf(LinkNode);
    });
  });
});
