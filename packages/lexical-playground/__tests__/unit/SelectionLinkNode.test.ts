/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode, LinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$getSelectionLinkNode} from '../../src/utils/getSelectionLinkNode';

const extension = defineExtension({
  dependencies: [RichTextExtension, LinkExtension],
  name: '[test-selection-link]',
});

describe('$getSelectionLinkNode', () => {
  test.each(['root', 'paragraph', 'link'] as const)(
    'resolves a link from %s element points in either direction',
    boundary => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const link = $createLinkNode('https://lexical.dev').append(
            $createTextNode('hello'),
            $createTextNode('world').toggleFormat('bold'),
          );
          const paragraph = $createParagraphNode().append(link);
          const root = $getRoot().clear().append(paragraph);
          const element =
            boundary === 'root'
              ? root
              : boundary === 'paragraph'
                ? paragraph
                : link;
          for (const backward of [false, true]) {
            const selection = element.select(
              backward ? element.getChildrenSize() : 0,
              backward ? 0 : element.getChildrenSize(),
            );
            expect($getSelectionLinkNode(selection)).toBe(link);
          }
        },
        {discrete: true},
      );
    },
  );

  test.each(['plain text', 'another link', 'empty paragraph'] as const)(
    'does not treat a whole selection containing %s as one link',
    extra => {
      using editor = buildEditorFromExtensions(extension);
      editor.update(
        () => {
          const paragraph = $createParagraphNode().append(
            $createLinkNode('https://lexical.dev').append(
              $createTextNode('hello'),
            ),
          );
          const root = $getRoot().clear().append(paragraph);
          if (extra === 'empty paragraph') {
            root.append($createParagraphNode());
          } else {
            paragraph.append(
              extra === 'plain text'
                ? $createTextNode('world')
                : $createLinkNode('https://example.com').append(
                    $createTextNode('world'),
                  ),
            );
          }
          expect(
            $getSelectionLinkNode(root.select(0, root.getChildrenSize())),
          ).toBe(null);
          expect(
            $getSelectionLinkNode(root.select(root.getChildrenSize(), 0)),
          ).toBe(null);
        },
        {discrete: true},
      );
    },
  );

  test('preserves collapsed and partial text selections inside a link', () => {
    using editor = buildEditorFromExtensions(extension);
    editor.update(
      () => {
        const text = $createTextNode('hello');
        const link = $createLinkNode('https://lexical.dev').append(text);
        $getRoot().clear().append($createParagraphNode().append(link));
        expect($getSelectionLinkNode(text.select(2, 2))).toBe(link);
        expect($getSelectionLinkNode(text.select(1, 4))).toBe(link);
        expect($getSelectionLinkNode(text.select(4, 1))).toBe(link);
      },
      {discrete: true},
    );
  });

  test('does not activate a link for a collapsed paragraph point', () => {
    using editor = buildEditorFromExtensions(extension);
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createLinkNode('https://lexical.dev').append(
            $createTextNode('hello'),
          ),
        );
        $getRoot().clear().append(paragraph);
        expect($getSelectionLinkNode(paragraph.select(0, 0))).toBe(null);
      },
      {discrete: true},
    );
  });
});
