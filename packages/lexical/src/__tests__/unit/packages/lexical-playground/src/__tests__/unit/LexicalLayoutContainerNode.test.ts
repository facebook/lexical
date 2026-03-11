/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createLayoutContainerNode,
  $isLayoutContainerNode,
} from '../../nodes/LayoutContainerNode';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

describe('LayoutContainerNode', () => {
  describe('$convertLayoutContainerElement', () => {
    test('importDOM: correctly reads grid-template-columns from inline style on unmounted element', () => {
      // Simulate what exportDOM produces: a detached div with inline style
      const domNode = document.createElement('div');
      domNode.setAttribute('data-lexical-layout-container', 'true');
      // Use inline style directly (NOT mounted into the document)
      domNode.style.gridTemplateColumns = '1fr 1fr 1fr';

      // Verify the fix: domNode.style works on detached elements,
      // window.getComputedStyle would return empty string here
      const inlineValue = domNode.style.getPropertyValue('grid-template-columns');
      expect(inlineValue).toBe('1fr 1fr 1fr');

      // Verify window.getComputedStyle fails on detached elements
      // (this is the root cause of issue #6813)
      const computedValue = window.getComputedStyle(domNode).getPropertyValue('grid-template-columns');
      expect(computedValue).toBe('');
    });

    test('importDOM: round-trips a LayoutContainerNode through export/import correctly', () => {
      const editor = createHeadlessEditor({
        nodes: [$createLayoutContainerNode('1fr 1fr').constructor as any],
      });

      editor.update(() => {
        const root = $getRoot();
        const containerNode = $createLayoutContainerNode('1fr 1fr');
        root.append(containerNode);
      });

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const first = root.getFirstChild();
        expect($isLayoutContainerNode(first)).toBe(true);
        if ($isLayoutContainerNode(first)) {
          expect(first.getTemplateColumns()).toBe('1fr 1fr');
        }
      });
    });
  });
});