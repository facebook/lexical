/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createNodeSelection,
  $getRoot,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $setSelection,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {$isEquationNode, EquationNode} from '../../src/nodes/EquationNode';
import {
  $createFigureNode,
  $isFigureNode,
  FigureNode,
} from '../../src/nodes/FigureNode';
import {FigureExtension} from '../../src/plugins/FigureExtension';

const FigureTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [FigureExtension],
  name: '[test-figure]',
  nodes: [FigureNode, EquationNode],
});

describe('FigureNode atomic decorator slot', () => {
  it('holds a single media slot whose value is a non-inline EquationNode', () => {
    using editor = buildEditorFromExtensions(FigureTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createFigureNode());
      },
      {discrete: true},
    );

    editor.read(() => {
      const figure = $getRoot().getFirstChild();
      assert($isFigureNode(figure), 'Top-level node must be a FigureNode');
      expect($getSlotNames(figure)).toEqual(['media']);
      const media = $getSlot(figure, 'media');
      assert(
        $isEquationNode(media),
        'media slot value must be an EquationNode',
      );
      expect(media.getEquation()).toBe('E=mc^2');
      // The Figure steps over the slot as one atom: the value is a block
      // (non-inline) decorator, never an editable inline region.
      expect(media.isInline()).toBe(false);
    });
  });

  it('links the slot value to its host without making it a child', () => {
    using editor = buildEditorFromExtensions(FigureTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createFigureNode());
      },
      {discrete: true},
    );

    editor.read(() => {
      const figure = $getRoot().getFirstChild();
      assert($isFigureNode(figure), 'Top-level node must be a FigureNode');
      const media = $getSlot(figure, 'media');
      assert(
        $isEquationNode(media),
        'media slot value must be an EquationNode',
      );
      // Slot invariant: value has no parent and is reached through getSlotHost,
      // so it never appears in the host's child list. Figure is a
      // DecoratorNode host (atomic), so it carries no children channel at all.
      expect(media.getParent()).toBe(null);
      expect($getSlotHost(media)).toBe(figure);
    });
  });

  it('round-trips the media slot through clipboard copy -> paste', () => {
    using editor = buildEditorFromExtensions(FigureTestExtension);

    let exported: ReturnType<typeof $generateJSONFromSelectedNodes>;
    editor.update(
      () => {
        const figure = $createFigureNode();
        $getRoot().clear().append(figure);
        const selection = $createNodeSelection();
        selection.add(figure.getKey());
        $setSelection(selection);
        exported = $generateJSONFromSelectedNodes(editor, selection);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $getRoot().clear();
        const nodes = $generateNodesFromSerializedNodes(exported.nodes);
        $getRoot().append(...nodes);
      },
      {discrete: true},
    );

    editor.read(() => {
      const figure = $getRoot().getFirstChild();
      assert(
        $isFigureNode(figure),
        'Pasted top-level node must be a FigureNode',
      );
      expect($getSlotNames(figure)).toEqual(['media']);
      const media = $getSlot(figure, 'media');
      assert(
        $isEquationNode(media),
        'Pasted media slot must be an EquationNode',
      );
      expect(media.getEquation()).toBe('E=mc^2');
      expect(media.isInline()).toBe(false);
    });
  });
});
