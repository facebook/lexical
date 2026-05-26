/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  configExtension,
  defineExtension,
  getDOMSelection,
  isHTMLElement,
  LineBreakNode,
} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';

import {$internalCreateRangeSelection} from '../../LexicalSelection';

describe('Selection resolution for leaf nodes (resolveLeafPosition)', () => {
  const mountedRoots: HTMLElement[] = [];
  afterEach(() => {
    while (mountedRoots.length > 0) {
      const node = mountedRoots.pop();
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  });

  function mountRoot(editor: LexicalEditorWithDispose) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountedRoots.push(root);
    editor.setRootElement(root);
    return root;
  }

  test('DOM caret directly on a bare <br> at offset 0 resolves to "after" the LineBreakNode', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode('before'),
                $createLineBreakNode(),
                $createTextNode('after'),
              ),
            );
        },
        name: '[bare-leaf-resolve]',
      }),
    );
    mountRoot(editor);

    let linebreakKey = '';
    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        if ($isElementNode(paragraph)) {
          const br = paragraph.getChildAtIndex(1);
          assert(br !== null);
          linebreakKey = br.getKey();
        }
      },
      {discrete: true},
    );

    const brDOM = editor.getElementByKey(linebreakKey);
    assert(brDOM !== null);

    const domSelection = getDOMSelection(editor._window ?? window);
    const range = document.createRange();
    range.setStart(brDOM, 0);
    range.collapse(true);
    domSelection?.removeAllRanges();
    domSelection?.addRange(range);

    editor.update(
      () => {
        const selection = $internalCreateRangeSelection(
          $getSelection(),
          domSelection,
          editor,
          {type: 'selectionchange'} as Event,
        );
        assert(selection !== null);
        assert($isRangeSelection(selection));
        const paragraph = $getRoot().getFirstChildOrThrow();
        // Pre-PR behavior: caret on bare <br> at offset 0 resolves
        // to "after" the LineBreakNode, i.e. paragraph element
        // offset == linebreak.index + 1 (= 2 here: between LB and
        // the "after" TextNode).
        expect(selection.anchor.key).toBe(paragraph.getKey());
        expect(selection.anchor.type).toBe('element');
        expect(selection.anchor.offset).toBe(2);
      },
      {discrete: true},
    );
  });

  describe('wrap pattern via DOMRenderExtension override', () => {
    function buildWrapEditor() {
      return buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: () => {
            const paragraph = $createParagraphNode().append(
              $createTextNode('before'),
              $createLineBreakNode(),
              $createTextNode('after'),
            );
            $getRoot().clear().append(paragraph);
          },
          dependencies: [
            configExtension(DOMRenderExtension, {
              overrides: [
                domOverride([LineBreakNode], {
                  $createDOM: (_node, $next) => {
                    const inner = $next();
                    const wrapper = document.createElement('span');
                    wrapper.setAttribute('data-wrap', 'true');
                    wrapper.appendChild(inner);
                    return wrapper;
                  },
                  $getDOMSlot: (_node, dom, $next) => {
                    const br = dom.querySelector(':scope > br');
                    return isHTMLElement(br)
                      ? $next().withElement(br)
                      : $next();
                  },
                }),
              ],
            }),
          ],
          name: '[wrap-leaf-resolve]',
        }),
      );
    }

    function getLineBreakKey(editor: LexicalEditorWithDispose) {
      let lbKey = '';
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow();
          if ($isElementNode(paragraph)) {
            const br = paragraph.getChildAtIndex(1);
            if (br) {
              lbKey = br.getKey();
            }
          }
        },
        {discrete: true},
      );
      return lbKey;
    }

    test('DOM caret inside the wrap <span> at offset 0 (before the inner <br>) resolves to "before" the LineBreakNode', () => {
      using editor = buildWrapEditor();
      mountRoot(editor);
      const lbKey = getLineBreakKey(editor);
      const wrapDOM = editor.getElementByKey(lbKey);
      assert(wrapDOM !== null);
      // Sanity: the keyed DOM is the wrap span, not the <br>.
      expect(wrapDOM.tagName).toBe('SPAN');
      expect(wrapDOM.getAttribute('data-wrap')).toBe('true');

      const domSelection = getDOMSelection(editor._window ?? window);
      const range = document.createRange();
      range.setStart(wrapDOM, 0);
      range.collapse(true);
      domSelection?.removeAllRanges();
      domSelection?.addRange(range);

      editor.update(
        () => {
          const selection = $internalCreateRangeSelection(
            $getSelection(),
            domSelection,
            editor,
            {type: 'selectionchange'} as Event,
          );
          assert(selection !== null);
          assert($isRangeSelection(selection));
          const paragraph = $getRoot().getFirstChildOrThrow();
          expect(selection.anchor.key).toBe(paragraph.getKey());
          expect(selection.anchor.type).toBe('element');
          // "before" the LB → paragraph element offset == LB index (1).
          expect(selection.anchor.offset).toBe(1);
        },
        {discrete: true},
      );
    });

    test('DOM caret inside the wrap <span> at offset 1 (after the inner <br>) resolves to "after" the LineBreakNode', () => {
      using editor = buildWrapEditor();
      mountRoot(editor);
      const lbKey = getLineBreakKey(editor);
      const wrapDOM = editor.getElementByKey(lbKey);
      assert(wrapDOM !== null);

      const domSelection = getDOMSelection(editor._window ?? window);
      const range = document.createRange();
      range.setStart(wrapDOM, 1);
      range.collapse(true);
      domSelection?.removeAllRanges();
      domSelection?.addRange(range);

      editor.update(
        () => {
          const selection = $internalCreateRangeSelection(
            $getSelection(),
            domSelection,
            editor,
            {type: 'selectionchange'} as Event,
          );
          assert(selection !== null);
          assert($isRangeSelection(selection));
          const paragraph = $getRoot().getFirstChildOrThrow();
          expect(selection.anchor.key).toBe(paragraph.getKey());
          expect(selection.anchor.type).toBe('element');
          // "after" the LB → paragraph element offset == LB index + 1 (2).
          expect(selection.anchor.offset).toBe(2);
        },
        {discrete: true},
      );
    });
  });
});
