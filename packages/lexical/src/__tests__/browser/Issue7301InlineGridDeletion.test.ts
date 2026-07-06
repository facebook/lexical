/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  ElementNode,
  KEY_ARROW_RIGHT_COMMAND,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';

/**
 * Inline element that renders with `display: inline-grid`.
 * Reproduces the layout context from #7301 where native
 * Selection.modify fails to cross adjacent <span> boundaries.
 */
class InlineGridNode extends ElementNode {
  $config() {
    return this.config('test_inline_grid', {extends: ElementNode});
  }
  createDOM() {
    const el = document.createElement('span');
    el.style.display = 'inline-grid';
    return el;
  }
  updateDOM() {
    return false;
  }
  isInline() {
    return true;
  }
}

function $createInlineGridNode() {
  return new InlineGridNode();
}

const ext = defineExtension({
  dependencies: [RichTextExtension],
  name: '[7301-browser]',
  nodes: [InlineGridNode],
});

function mountEditor($initialEditorState?: () => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions({
    $initialEditorState,
    ...ext,
  });
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  return {contentEditable, editor};
}

describe('Deletion across adjacent unmergeable text in inline-grid (#7301)', () => {
  test('forward delete crosses span boundary inside inline-grid container', async () => {
    const {editor} = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const grid = $createInlineGridNode();
      const a = $createTextNode('A').toggleUnmergeable();
      const b = $createTextNode('B').toggleUnmergeable();
      const c = $createTextNode('C').toggleUnmergeable();
      grid.append(a, b, c);
      paragraph.append(grid);
      $getRoot().append(paragraph);
      // Place cursor at end of "A" (= boundary before "B")
      a.select(1, 1);
    });

    // Verify initial state
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('ABC');
    });

    // Forward delete — should delete "B"
    await editor.update(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      sel.deleteCharacter(false);
    });

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('AC');
    });

    // Forward delete again — should delete "C"
    await editor.update(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      sel.deleteCharacter(false);
    });

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('A');
    });
  });

  test('backward delete crosses span boundary inside inline-grid container', async () => {
    const {editor} = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const grid = $createInlineGridNode();
      const a = $createTextNode('A').toggleUnmergeable();
      const b = $createTextNode('B').toggleUnmergeable();
      const c = $createTextNode('C').toggleUnmergeable();
      grid.append(a, b, c);
      paragraph.append(grid);
      $getRoot().append(paragraph);
      // Place cursor at start of "C" (= boundary after "B")
      c.select(0, 0);
    });

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('ABC');
    });

    // Backspace — should delete "B"
    await editor.update(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      sel.deleteCharacter(true);
    });

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('AC');
    });
  });

  test('arrow key movement crosses span boundary via modify()', async () => {
    let aKey: string;
    let bKey: string;
    const {editor} = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const grid = $createInlineGridNode();
      const a = $createTextNode('A').toggleUnmergeable();
      const b = $createTextNode('B').toggleUnmergeable();
      const c = $createTextNode('C').toggleUnmergeable();
      aKey = a.getKey();
      bKey = b.getKey();
      grid.append(a, b, c);
      paragraph.append(grid);
      $getRoot().append(paragraph);
      a.select(1, 1);
    });

    // Move forward from end of "A" — should cross into "B"
    await editor.update(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      sel.modify('move', false, 'character');
    });

    editor.read(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      expect(sel.anchor.key).toBe(bKey);
      expect(sel.anchor.offset).toBe(1);
      expect(sel.isCollapsed()).toBe(true);
    });

    // Move backward from end of "B" — should cross back to "A"
    await editor.update(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      sel.modify('move', true, 'character');
    });

    editor.read(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      expect(sel.isCollapsed()).toBe(true);
      expect(sel.anchor.key).toBe(aKey);
      expect(sel.anchor.offset).toBe(1);
    });
  });

  test('arrow key command pipeline overrides native handling at boundary', async () => {
    let bKey: string;
    const {editor} = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const grid = $createInlineGridNode();
      const a = $createTextNode('A').toggleUnmergeable();
      const b = $createTextNode('B').toggleUnmergeable();
      const c = $createTextNode('C').toggleUnmergeable();
      bKey = b.getKey();
      grid.append(a, b, c);
      paragraph.append(grid);
      $getRoot().append(paragraph);
      a.select(1, 1);
    });

    const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
    const handled = editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
    expect(handled).toBe(true);

    editor.read(() => {
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      expect(sel.anchor.key).toBe(bKey);
      expect(sel.anchor.offset).toBe(1);
      expect(sel.isCollapsed()).toBe(true);
    });
  });
});
