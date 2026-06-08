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
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
  CoreImportExtension,
  DOMImportExtension,
} from '@lexical/html';
import {
  $createNodeSelection,
  $getRoot,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $isElementNode,
  $setSelection,
  configExtension,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {$isEquationNode, EquationNode} from '../../src/nodes/EquationNode';
import {
  $createFigureNode,
  $isFigureNode,
  FigureNode,
} from '../../src/nodes/FigureNode';
import {PlaygroundRichTextImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {FigureExtension} from '../../src/plugins/FigureExtension';

const FigureTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [FigureExtension],
  name: '[test-figure]',
  nodes: [FigureNode, EquationNode],
});

// Adds the DOM import pipeline: CoreImportExtension walks the
// `data-lexical-slot="media"` wrapper, EquationNode.importDOM decodes the
// `data-lexical-equation` base64 attribute, and PlaygroundRichTextImport's
// FigureImportRule re-attaches the imported Equation onto the host via
// setSlot. The orphan-slot preprocess covers the external paste case where
// the outer `lexical-figure-node` wrapper got stripped.
const FigureImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [
    FigureExtension,
    CoreImportExtension,
    PlaygroundRichTextImportExtension,
    configExtension(DOMImportExtension, {rules: []}),
  ],
  name: '[test-figure-import]',
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

  it('round-trips the media slot through HTML export -> DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(FigureImportTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createFigureNode());
      },
      {discrete: true},
    );
    const html = editor.read(() => $generateHtmlFromNodes(editor, null));

    // The media slot rides in its own named wrapper carrying the
    // base64-encoded equation that EquationNode.importDOM decodes.
    expect(html).toContain('data-lexical-slot="media"');
    expect(html).toContain('data-lexical-equation');

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(html, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const figure = $getRoot().getFirstChild();
      assert(
        $isFigureNode(figure),
        'Imported top-level node must be a FigureNode',
      );
      expect($getSlotNames(figure)).toEqual(['media']);
      const media = $getSlot(figure, 'media');
      assert(
        $isEquationNode(media),
        'Imported media slot must be an EquationNode',
      );
      expect(media.getEquation()).toBe('E=mc^2');
      expect(media.isInline()).toBe(false);
    });
  });

  // Mirrors the external-paste path: a browser's contenteditable Cmd+A → Cmd+C
  // strips the outer `lexical-figure-node` wrapper, leaving only the
  // `data-lexical-slot="media"` wrapper at the fragment root. The orphan-slot
  // preprocess in PlaygroundRichTextImportExtension reassembles the figure.
  it('rewraps an orphaned media slot wrapper into a FigureNode', () => {
    using editor = buildEditorFromExtensions(FigureImportTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createFigureNode());
      },
      {discrete: true},
    );
    const html = editor.read(() => $generateHtmlFromNodes(editor, null));
    // Drop the outer `<div class="lexical-figure-node">` exactly the way
    // Chrome / Firefox / Safari drop it on Cmd+A → Cmd+C inside an external
    // contenteditable.
    const stripped = html.replace(
      /<div class="lexical-figure-node">([\s\S]*)<\/div>$/,
      '$1',
    );
    expect(stripped).not.toContain('lexical-figure-node');
    expect(stripped).toContain('data-lexical-slot="media"');

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(stripped, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const figure = $getRoot().getFirstChild();
      assert(
        $isFigureNode(figure),
        'Reassembled top-level node must be a FigureNode',
      );
      const media = $getSlot(figure, 'media');
      assert($isEquationNode(media), 'media slot must be an EquationNode');
      expect(media.getEquation()).toBe('E=mc^2');
    });
  });

  // Malformed `data-lexical-equation` values reach `atob`; the spec throws
  // InvalidCharacterError, but the lexical import pipeline may swallow that
  // and fall back. Either branch is acceptable — what matters is that no
  // EquationNode with garbage equation text leaks into the editor state.
  it('EquationNode.importDOM does not silently inject a malformed Equation', () => {
    using editor = buildEditorFromExtensions(FigureImportTestExtension);

    function hasEquation(node: LexicalNode): boolean {
      if ($isEquationNode(node)) {
        return true;
      }
      if ($isElementNode(node)) {
        return node.getChildren().some(hasEquation);
      }
      return false;
    }

    const malformed =
      '<div data-lexical-equation="not!base64" data-lexical-inline="false"></div>';
    let imported: LexicalNode[] | null = null;
    let threw = false;
    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(malformed, 'text/html');
        try {
          imported = $generateNodesFromDOMViaExtension(dom);
        } catch {
          threw = true;
        }
      },
      {discrete: true},
    );

    if (!threw && imported !== null) {
      expect((imported as LexicalNode[]).some(hasEquation)).toBe(false);
    }
  });
});
