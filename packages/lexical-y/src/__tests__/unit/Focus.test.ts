/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// A remote change must not set the DOM selection of an editor that is not
// focused: in a browser, setting it moves the focus into that editor (two
// collaborative editors on one page, a comment box next to the editor). A
// focused editor must keep its DOM caret when the list refresh after a remote
// change reshapes the DOM under it.
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  type ListItemNode,
  registerListStrictIndentTransform,
} from '@lexical/list';
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {$block, expectConverged, setup} from '../utils/harness';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('@lexical/y and the focus', () => {
  test('a remote list change does not set the DOM selection of an unfocused editor', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('a')),
        ),
      ),
    );
    const roots = t.peers.map(() => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      document.body.appendChild(el);
      return el;
    });
    t.peers.forEach((p, i) => p.editor.setRootElement(roots[i]));
    // B has a selection but is not focused (the focus is on the page).
    t.b.update(() => {
      $block([0, 0]).getFirstChild<TextNode>()!.select(1, 1);
    });
    expect(document.activeElement).not.toBe(roots[1]);
    const setBaseAndExtent = vi.spyOn(Selection.prototype, 'setBaseAndExtent');
    // A adds an item: B reads it, then renumbers the list.
    t.a.update(() => {
      $block([0]).append($createListItemNode().append($createTextNode('b')));
    });
    await t.sync();
    await expectConverged(t.peers, 'list[bullet](listitem("a") listitem("b"))');
    expect(setBaseAndExtent).not.toHaveBeenCalled();
    t.peers.forEach(p => p.editor.setRootElement(null));
  });

  test('a focused editor keeps its DOM caret when a remote change reshapes its list', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('a')),
          $createListItemNode().append($createTextNode('bbb')),
        ),
      ),
    );
    // B runs the strict indent transform (an app list transform); A does not.
    const unregister = registerListStrictIndentTransform(t.b.editor);
    const roots = t.peers.map(() => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      el.tabIndex = 0;
      document.body.appendChild(el);
      return el;
    });
    t.peers.forEach((p, i) => p.editor.setRootElement(roots[i]));
    roots[1].focus();
    expect(document.activeElement).toBe(roots[1]);
    t.b.update(() => {
      $block([0, 1]).getFirstChild<TextNode>()!.select(2, 2);
    });
    const domCaret = () => {
      const s = window.getSelection()!;
      return {
        inRoot: s.anchorNode !== null && roots[1].contains(s.anchorNode),
        offset: s.anchorOffset,
        text: s.anchorNode ? s.anchorNode.textContent : null,
      };
    };
    expect(domCaret()).toEqual({inRoot: true, offset: 2, text: 'bbb'});
    // A removes "a" and indents "bbb", which gives the item new DOM on B.
    // B's app transform (strict indent) applies to B's own edits only: B
    // shows the document as stored, as A and any fresh reader do.
    t.a.update(() => {
      const list = $block([0]);
      list.getFirstChild()!.remove();
      list.getFirstChild<ListItemNode>()!.setIndent(1);
    });
    await t.sync();
    const indent = t.b.read(() => {
      const li = $getRoot().getFirstDescendant()?.getParent();
      return $isListItemNode(li) ? li.getIndent() : -1;
    });
    const caret = t.b.read(() => {
      const s = $getSelection();
      return $isRangeSelection(s)
        ? [s.anchor.getNode().getTextContent(), s.anchor.offset]
        : null;
    });
    const dom = domCaret();
    unregister();
    t.peers.forEach(p => p.editor.setRootElement(null));
    expect(indent).toBe(1);
    expect(caret).toEqual(['bbb', 2]);
    expect(dom).toEqual({inRoot: true, offset: 2, text: 'bbb'});
  });
});
