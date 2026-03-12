/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $insertNodes} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  $createLayoutContainerNode,
  LayoutContainerNode,
} from '../../src/nodes/LayoutContainerNode';
import {LayoutItemNode} from '../../src/nodes/LayoutItemNode';

describe('LayoutContainerNode HTML serialization', () => {
  initializeUnitTest(
    (testEnv) => {
      describe('exportDOM', () => {
        it('exports with inline grid-template-columns style', async () => {
          const {editor} = testEnv;
          editor.update(
            () => {
              const container = $createLayoutContainerNode('1fr 1fr');
              $getRoot().append(container);
            },
            {discrete: true},
          );
          const htmlOutput = editor.read(() =>
            $generateHtmlFromNodes(editor, null),
          );
          expectHtmlToBeEqual(
            htmlOutput,
            html`
              <div
                style="grid-template-columns: 1fr 1fr"
                data-lexical-layout-container="true"></div>
            `,
          );
        });
      });

      describe('importDOM', () => {
        it('imports layout container from inline style', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<div data-lexical-layout-container="true" style="grid-template-columns: 1fr 1fr;"></div>';
          const dom = parser.parseFromString(htmlString, 'text/html');
          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });
          editor.read(() => {
            const root = $getRoot();
            const container = root.getFirstChild();
            expect(container).toBeInstanceOf(LayoutContainerNode);
            expect(
              (container as LayoutContainerNode).getTemplateColumns(),
            ).toBe('1fr 1fr');
          });
        });

        it('returns null for div without data-lexical-layout-container', async () => {
          const {editor} = testEnv;
          const parser = new DOMParser();
          const htmlString =
            '<div style="grid-template-columns: 1fr 1fr;"></div>';
          const dom = parser.parseFromString(htmlString, 'text/html');
          await editor.update(() => {
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select();
            $insertNodes(nodes);
          });
          editor.read(() => {
            const root = $getRoot();
            const children = root.getChildren();
            const hasLayoutContainer = children.some(
              (child) => child instanceof LayoutContainerNode,
            );
            expect(hasLayoutContainer).toBe(false);
          });
        });
      });

      describe('export/import round-trip', () => {
        it('preserves templateColumns through HTML round-trip', async () => {
          const {editor} = testEnv;
          const templateColumns = '1fr 1fr';

          // Step 1: Create a layout container and export to HTML
          editor.update(
            () => {
              const container = $createLayoutContainerNode(templateColumns);
              $getRoot().append(container);
            },
            {discrete: true},
          );
          const exportedHtml = editor.read(() =>
            $generateHtmlFromNodes(editor, null),
          );

          // Step 2: Clear the editor and re-import the exported HTML
          const parser = new DOMParser();
          const dom = parser.parseFromString(exportedHtml, 'text/html');
          editor.update(
            () => {
              $getRoot().clear();
              const nodes = $generateNodesFromDOM(editor, dom);
              $getRoot().select();
              $insertNodes(nodes);
            },
            {discrete: true},
          );

          // Step 3: Verify the imported node has the correct templateColumns
          editor.read(() => {
            const root = $getRoot();
            const container = root.getFirstChild();
            expect(container).toBeInstanceOf(LayoutContainerNode);
            expect(
              (container as LayoutContainerNode).getTemplateColumns(),
            ).toBe(templateColumns);
          });
        });

        it('preserves 3-column layout through HTML round-trip', async () => {
          const {editor} = testEnv;
          const templateColumns = '1fr 1fr 1fr';

          editor.update(
            () => {
              const container = $createLayoutContainerNode(templateColumns);
              $getRoot().append(container);
            },
            {discrete: true},
          );
          const exportedHtml = editor.read(() =>
            $generateHtmlFromNodes(editor, null),
          );

          const parser = new DOMParser();
          const dom = parser.parseFromString(exportedHtml, 'text/html');
          editor.update(
            () => {
              $getRoot().clear();
              const nodes = $generateNodesFromDOM(editor, dom);
              $getRoot().select();
              $insertNodes(nodes);
            },
            {discrete: true},
          );

          editor.read(() => {
            const root = $getRoot();
            const container = root.getFirstChild();
            expect(container).toBeInstanceOf(LayoutContainerNode);
            expect(
              (container as LayoutContainerNode).getTemplateColumns(),
            ).toBe(templateColumns);
          });
        });
      });
    },
    {nodes: [LayoutContainerNode, LayoutItemNode]},
  );
});
