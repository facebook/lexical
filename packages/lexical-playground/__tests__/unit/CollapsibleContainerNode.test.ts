/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $insertNodes} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it} from 'vitest';

import {
  $isCollapsibleContainerNode,
  CollapsibleContainerNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleContainerNode';
import {
  $isCollapsibleContentNode,
  CollapsibleContentNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleContentNode';
import {
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleTitleNode';

describe('CollapsibleContainerNode HTML import (issue #8407)', () => {
  initializeUnitTest(
    testEnv => {
      describe('importDOM', () => {
        it('imports <details> with loose text body without crashing', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<details>\n' +
            '  <summary>Details</summary>\n' +
            '  Something small enough to escape casual notice.\n' +
            '</details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode);
            assert(
              container != null,
              'CollapsibleContainerNode must be a child of RootNode',
            );
            const children = container.getChildren();
            expect(children.length).toBe(2);
            assert(
              $isCollapsibleTitleNode(children[0]),
              'First child must be CollapsibleTitleNode',
            );
            assert(
              $isCollapsibleContentNode(children[1]),
              'Second child must be CollapsibleContentNode',
            );
            expect(children[0].getTextContent()).toBe('Details');
            expect(children[1].getTextContent().trim()).toBe(
              'Something small enough to escape casual notice.',
            );
            // No `open` attribute on the source element should map to closed.
            expect(container.getOpen()).toBe(false);
          });
        });

        it('preserves the open attribute on import', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString = '<details open><summary>S</summary>body</details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode)!;
            expect(container.getOpen()).toBe(true);
          });
        });

        it('handles <summary> appearing after body content', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<details><p>Body before</p><summary>Title</summary></details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode)!;
            const children = container.getChildren();
            expect(children.length).toBe(2);
            assert(
              $isCollapsibleTitleNode(children[0]),
              'First child must be CollapsibleTitleNode',
            );
            assert(
              $isCollapsibleContentNode(children[1]),
              'Second child must be CollapsibleContentNode',
            );
            expect(children[0].getTextContent()).toBe('Title');
            expect(children[1].getTextContent().trim()).toBe('Body before');
          });
        });

        it('imports <details> with no <summary> without crashing', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString = '<details>Just some loose text</details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode)!;
            // The empty CollapsibleTitleNode created for missing <summary>
            // is removed by CollapsibleTitleNode's $transform, leaving the
            // body wrapped in a single CollapsibleContentNode. The crucial
            // invariant is that no raw TextNode sits directly under the
            // shadow root.
            const children = container.getChildren();
            expect(children.length).toBe(1);
            assert(
              $isCollapsibleContentNode(children[0]),
              'Sole child must be CollapsibleContentNode',
            );
            expect(children[0].getTextContent()).toBe('Just some loose text');
          });
        });

        it('imports <details> with summary and block body siblings', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<details><summary>Title</summary><p>Para one.</p><p>Para two.</p></details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode)!;
            const children = container.getChildren();
            expect(children.length).toBe(2);
            assert(
              $isCollapsibleTitleNode(children[0]),
              'First child must be CollapsibleTitleNode',
            );
            assert(
              $isCollapsibleContentNode(children[1]),
              'Second child must be CollapsibleContentNode',
            );
            expect(children[1].getChildren().length).toBe(2);
          });
        });

        it('imports <details> with element body (round-trip shape)', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<details open="true" class="Collapsible__container">' +
            '<summary class="Collapsible__title">Title</summary>' +
            '<div class="Collapsible__content" data-lexical-collapsible-content="true">' +
            '<p>Body</p>' +
            '</div>' +
            '</details>';
          const dom = parser.parseFromString(htmlString, 'text/html');

          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });

          editor.read(() => {
            const root = $getRoot();
            const container = root
              .getChildren()
              .find($isCollapsibleContainerNode)!;
            const children = container.getChildren();
            expect(children.length).toBe(2);
            assert(
              $isCollapsibleTitleNode(children[0]),
              'First child must be CollapsibleTitleNode',
            );
            assert(
              $isCollapsibleContentNode(children[1]),
              'Second child must be CollapsibleContentNode',
            );
          });
        });
      });
    },
    {
      nodes: [
        CollapsibleContainerNode,
        CollapsibleContentNode,
        CollapsibleTitleNode,
      ],
    },
  );
});
