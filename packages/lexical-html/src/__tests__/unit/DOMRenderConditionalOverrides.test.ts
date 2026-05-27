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
  $setRenderContextValue,
  $withRenderContext,
  contextValue,
  createRenderState,
  domOverride,
  DOMRenderExtension,
} from '@lexical/html';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  configExtension,
  defineExtension,
  isHTMLElement,
  LineBreakNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const WrapDisabled = createRenderState('wrapDisabled', () => false);
const Terse = createRenderState('terse', () => false);

const WRAP_ATTR = 'data-wrap';

function makeEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a'),
            $createLineBreakNode(),
            $createTextNode('b'),
          ),
        );
      },
      dependencies: [
        configExtension(DOMRenderExtension, {
          overrides: [
            // Structural override gated per-editor: wraps each <br> in a <span>.
            domOverride(
              [LineBreakNode],
              {
                $createDOM: (node, $next) => {
                  const inner = $next();
                  const wrapper = document.createElement('span');
                  wrapper.setAttribute(WRAP_ATTR, 'true');
                  wrapper.appendChild(inner);
                  return wrapper;
                },
                $updateDOM: (node, _prev, dom, $next) => {
                  if (
                    (dom.tagName === 'SPAN' && dom.hasAttribute(WRAP_ATTR)) !==
                    true
                  ) {
                    return true;
                  }
                  return $next();
                },
              },
              {disabledForEditor: ctx => ctx.get(WrapDisabled)},
            ),
            // Export-only override gated per-session: tags every element.
            domOverride(
              '*',
              {
                $exportDOM: (node, $next) => {
                  const rval = $next();
                  if (isHTMLElement(rval.element)) {
                    rval.element.setAttribute('data-terse', 'true');
                  }
                  return rval;
                },
              },
              {disabledForSession: ctx => !ctx.get(Terse)},
            ),
          ],
        }),
      ],
      name: 'test',
    }),
  );
}

describe('DOMRender conditional overrides', () => {
  test('disabledForEditor removes the override and recreates live DOM', () => {
    using editor = makeEditor();
    const div = document.createElement('div');
    editor.setRootElement(div);

    let lbKey = '';
    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      if ($isElementNode(paragraph)) {
        for (const child of paragraph.getChildren()) {
          if ($isLineBreakNode(child)) {
            lbKey = child.getKey();
          }
        }
      }
    });

    // Enabled by default (disabled=false): the node's DOM is the <span> wrapper.
    const enabledDom = editor.getElementByKey(lbKey);
    expect(enabledDom).not.toBe(null);
    expect(enabledDom?.tagName).toBe('SPAN');
    expect(enabledDom?.hasAttribute(WRAP_ATTR)).toBe(true);
    expect(div.querySelector(`span[${WRAP_ATTR}]`)).toBe(enabledDom);

    // Disable: the override is removed and the node's DOM is *recreated* as a
    // bare <br> — verified by element identity, not just an in-place update.
    $setRenderContextValue(WrapDisabled, true, editor);
    const disabledDom = editor.getElementByKey(lbKey);
    expect(disabledDom?.tagName).toBe('BR');
    expect(disabledDom).not.toBe(enabledDom);
    expect(div.querySelector(`span[${WRAP_ATTR}]`)).toBe(null);

    // Re-enable: recreated again as a fresh <span> (a new element identity).
    $setRenderContextValue(WrapDisabled, false, editor);
    const reenabledDom = editor.getElementByKey(lbKey);
    expect(reenabledDom?.tagName).toBe('SPAN');
    expect(reenabledDom).not.toBe(enabledDom);
    expect(reenabledDom).not.toBe(disabledDom);
  });

  test('disabledForSession gates export participation', () => {
    using editor = makeEditor();
    editor.setRootElement(document.createElement('div'));

    let coldHtml = '';
    let terseHtml = '';
    editor.read(() => {
      coldHtml = $generateHtmlFromNodes(editor);
      $withRenderContext(
        [contextValue(Terse, true)],
        editor,
      )(() => {
        terseHtml = $generateHtmlFromNodes(editor);
      });
    });

    // Cold export: the per-session override is not installed.
    expect(coldHtml).not.toContain('data-terse');
    // Terse export: the per-session override is installed for this walk.
    expect(terseHtml).toContain('data-terse');
  });

  test('disabledForSession does not affect live reconciliation', () => {
    using editor = makeEditor();
    const div = document.createElement('div');
    editor.setRootElement(div);
    // The export-only ('*') override must never tag the live DOM.
    expect(div.querySelector('[data-terse]')).toBe(null);
  });
});
