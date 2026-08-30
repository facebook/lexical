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
  $getNodeByKeyOrThrow,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  configExtension,
  defineExtension,
  isHTMLElement,
  type LexicalEditor,
  LineBreakNode,
  ParagraphNode,
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

function getLineBreakKey(editor: LexicalEditor): string {
  return editor.read(() => {
    const paragraph = $getRoot().getFirstChildOrThrow();
    if ($isElementNode(paragraph)) {
      for (const child of paragraph.getChildren()) {
        if ($isLineBreakNode(child)) {
          return child.getKey();
        }
      }
    }
    throw new Error('Expected a LineBreakNode in the first paragraph');
  });
}

describe('DOMRender conditional overrides', () => {
  test('disabledForEditor removes the override and recreates live DOM', () => {
    using editor = makeEditor();
    const div = document.createElement('div');
    editor.setRootElement(div);

    const lbKey = getLineBreakKey(editor);

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

  test('disabledForEditor re-render reuses node instances (no node map clone)', () => {
    using editor = makeEditor();
    editor.setRootElement(document.createElement('div'));

    const lbKey = getLineBreakKey(editor);
    const before = editor.read(() => $getNodeByKeyOrThrow(lbKey));
    $setRenderContextValue(WrapDisabled, true, editor);

    // A full reconcile recreates the DOM but reuses the same node instance —
    // marking a read-only node writable always returns a new instance, so
    // identity equality proves the node was never cloned (editor state /
    // collaboration untouched).
    editor.read(() => {
      expect($getNodeByKeyOrThrow(lbKey)).toBe(before);
    });
  });

  test('disabledForEditor $decorateDOM recreates to apply and revert decoration', () => {
    const DecorateDisabled = createRenderState('decorateDisabled', () => false);
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('x')),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride(
                [ParagraphNode],
                {
                  $decorateDOM: (_node, _prev, dom) => {
                    dom.setAttribute('data-decorated', 'true');
                  },
                },
                {disabledForEditor: ctx => ctx.get(DecorateDisabled)},
              ),
            ],
          }),
        ],
        name: 'decorate-test',
      }),
    );
    const div = document.createElement('div');
    editor.setRootElement(div);

    // Enabled by default: $decorateDOM applied.
    expect(div.querySelector('p[data-decorated]')).not.toBe(null);

    // Disable: the node is recreated, so the additive decoration is gone — a
    // plain re-render of the remaining decorate chain could not remove it.
    $setRenderContextValue(DecorateDisabled, true, editor);
    expect(div.querySelector('p[data-decorated]')).toBe(null);

    // Re-enable: decoration re-applied.
    $setRenderContextValue(DecorateDisabled, false, editor);
    expect(div.querySelector('p[data-decorated]')).not.toBe(null);
  });

  test('disabledForSession gates export participation', () => {
    using editor = makeEditor();
    editor.setRootElement(document.createElement('div'));

    // Cold export: the per-session override is not installed.
    editor.read(() => {
      expect($generateHtmlFromNodes(editor)).not.toContain('data-terse');
    });
    // Terse export: the per-session override is installed for this walk.
    editor.read(() => {
      expect(
        $withRenderContext(
          [contextValue(Terse, true)],
          editor,
        )(() => $generateHtmlFromNodes(editor)),
      ).toContain('data-terse');
    });
  });

  test('disabledForSession does not affect live reconciliation', () => {
    using editor = makeEditor();
    const div = document.createElement('div');
    editor.setRootElement(div);
    // The export-only ('*') override must never tag the live DOM.
    expect(div.querySelector('[data-terse]')).toBe(null);
  });
});
