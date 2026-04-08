/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, SerializedLexicalNode} from 'lexical';

import {$createOffsetView} from '@lexical/offset';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isRangeSelection,
  createEditor,
  DecoratorNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

class InlineImageNode extends DecoratorNode<null> {
  static getType(): string {
    return 'inline-image';
  }

  static clone(node: InlineImageNode): InlineImageNode {
    return new InlineImageNode(node.__key);
  }

  static importJSON(): InlineImageNode {
    return new InlineImageNode();
  }

  exportJSON(): SerializedLexicalNode {
    return {...super.exportJSON()};
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  getTextContent(): string {
    return ' ';
  }

  decorate(): null {
    return null;
  }
}

function $createInlineImageNode(): InlineImageNode {
  return new InlineImageNode();
}

describe('LexicalOffset', () => {
  test('createSelectionFromOffsets handles inline decorator node without throwing (Regression #7580)', () => {
    const editor = createEditor({
      nodes: [InlineImageNode],
      onError: (e) => {
        throw e;
      },
    });
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const rootNode = $getRoot();
        const paragraph = $createParagraphNode();
        const text1 = $createTextNode('ab');
        const image = $createInlineImageNode();
        const text2 = $createTextNode('cd');
        paragraph.append(text1, image, text2);
        rootNode.clear().append(paragraph);
      },
      {discrete: true},
    );

    editor.read(() => {
      const offsetView = $createOffsetView(editor);
      // text1("ab"): offsets 0-2, image: offsets 2-3, text2("cd"): offsets 3-5
      // Offset 3 lands on inline image in the search (text1 search-end=3, image search-end=4)
      // Before the fix, this would throw "There is no child at offset N"
      const selection = offsetView.createSelectionFromOffsets(3, 3);
      expect(selection).not.toBe(null);
      if ($isRangeSelection(selection)) {
        // Selection should be element-type pointing to the parent paragraph
        expect(selection.anchor.type).toBe('element');
        const anchorNode = selection.anchor.getNode();
        expect($isElementNode(anchorNode)).toBe(true);
        // Offset should be a valid child index, not the raw offset value
        expect(selection.anchor.offset).toBeLessThanOrEqual(
          anchorNode.getChildrenSize(),
        );
      }
    });
  });

  test('createSelectionFromOffsets returns correct child index for inline node', () => {
    const editor = createEditor({
      nodes: [InlineImageNode],
      onError: (e) => {
        throw e;
      },
    });
    const root = document.createElement('div');
    editor.setRootElement(root);

    let imageIndex: number;
    editor.update(
      () => {
        const rootNode = $getRoot();
        const paragraph = $createParagraphNode();
        const text1 = $createTextNode('ab');
        const image = $createInlineImageNode();
        const text2 = $createTextNode('cd');
        paragraph.append(text1, image, text2);
        rootNode.clear().append(paragraph);
        imageIndex = image.getIndexWithinParent();
      },
      {discrete: true},
    );

    editor.read(() => {
      const offsetView = $createOffsetView(editor);
      // Offset 3 hits image (end > start), should place cursor after image
      const selection = offsetView.createSelectionFromOffsets(3, 3);
      expect(selection).not.toBe(null);
      if ($isRangeSelection(selection)) {
        expect(selection.anchor.type).toBe('element');
        expect(selection.anchor.offset).toBe(imageIndex + 1);
      }
    });
  });
});
