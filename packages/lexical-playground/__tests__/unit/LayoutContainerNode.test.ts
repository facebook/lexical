/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
} from '@lexical/html';
import {$getRoot, $insertNodes, defineExtension} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  $createLayoutContainerNode,
  LayoutContainerNode,
} from '../../src/nodes/LayoutContainerNode';
import {LayoutItemNode} from '../../src/nodes/LayoutItemNode';
import {PlaygroundImportExtension} from '../../src/nodes/PlaygroundImportExtension';

const LayoutTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [PlaygroundImportExtension],
  name: '[test-layout]',
  nodes: [LayoutContainerNode, LayoutItemNode],
});

function $importHtml(source: string): void {
  const parser = new DOMParser();
  const dom = parser.parseFromString(source, 'text/html');
  $insertNodes($generateNodesFromDOMViaExtension(dom));
}

describe('LayoutContainerNode HTML serialization', () => {
  describe('exportDOM', () => {
    it('exports with inline grid-template-columns style', () => {
      using editor = buildEditorFromExtensions(LayoutTestExtension);
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
    it('imports layout container from inline style', () => {
      using editor = buildEditorFromExtensions(LayoutTestExtension);
      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(
            '<div data-lexical-layout-container="true" style="grid-template-columns: 1fr 1fr;"></div>',
          );
        },
        {discrete: true},
      );
      editor.read(() => {
        const root = $getRoot();
        const container = root.getFirstChild();
        expect(container).toBeInstanceOf(LayoutContainerNode);
        expect((container as LayoutContainerNode).getTemplateColumns()).toBe(
          '1fr 1fr',
        );
      });
    });

    it('does not import a div without data-lexical-layout-container', () => {
      using editor = buildEditorFromExtensions(LayoutTestExtension);
      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml('<div style="grid-template-columns: 1fr 1fr;"></div>');
        },
        {discrete: true},
      );
      editor.read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        const hasLayoutContainer = children.some(
          child => child instanceof LayoutContainerNode,
        );
        expect(hasLayoutContainer).toBe(false);
      });
    });
  });

  describe('export/import round-trip', () => {
    it('preserves templateColumns through HTML round-trip', () => {
      using editor = buildEditorFromExtensions(LayoutTestExtension);
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
      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(exportedHtml);
        },
        {discrete: true},
      );

      // Step 3: Verify the imported node has the correct templateColumns
      editor.read(() => {
        const root = $getRoot();
        const container = root.getFirstChild();
        expect(container).toBeInstanceOf(LayoutContainerNode);
        expect((container as LayoutContainerNode).getTemplateColumns()).toBe(
          templateColumns,
        );
      });
    });

    it('preserves 3-column layout through HTML round-trip', () => {
      using editor = buildEditorFromExtensions(LayoutTestExtension);
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

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(exportedHtml);
        },
        {discrete: true},
      );

      editor.read(() => {
        const root = $getRoot();
        const container = root.getFirstChild();
        expect(container).toBeInstanceOf(LayoutContainerNode);
        expect((container as LayoutContainerNode).getTemplateColumns()).toBe(
          templateColumns,
        );
      });
    });
  });
});
