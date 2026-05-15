/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode} from 'lexical';

import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  $isElementNode,
  $isRootNode,
  configExtension,
  defineExtension,
} from 'lexical';

/**
 * Attribute on the drag-handle button. Stable contract for consumers that
 * need to hit-test events (`event.target.closest('[data-lexical-block-drag-handle]')`)
 * or wire global DnD delegation.
 *
 * @experimental
 */
export const BLOCK_DRAG_HANDLE_ATTR = 'data-lexical-block-drag-handle';

function shouldWrap(node: LexicalNode): node is LexicalNode {
  // Top-level block ElementNode (paragraph, heading, list, quote, code,
  // table, collapsible…) that's a direct child of the real RootNode.
  // Shadow roots (collapsible container/content, table cell) are excluded
  // so nested blocks don't get duplicate handles on inner rows.
  //
  // DecoratorNodes are intentionally NOT wrapped. The slot abstraction
  // doesn't yet cover decorator portal-mount routing — see
  // `packages/lexical-react/src/shared/useDecorators.tsx`.
  if (!$isElementNode(node) || node.isInline()) {
    return false;
  }
  return $isRootNode(node.getParent());
}

function createDragHandle(): HTMLButtonElement {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.draggable = true;
  // Mouse-only affordance; no keyboard reorder pattern is wired. Without
  // tabIndex = -1, Tab would cycle through every block's handle.
  handle.tabIndex = -1;
  handle.setAttribute(BLOCK_DRAG_HANDLE_ATTR, 'true');
  handle.setAttribute('aria-label', 'Drag to reorder');
  handle.contentEditable = 'false';
  // No textContent — the visual is a CSS background-image.
  return handle;
}

/**
 * Attribute on the outer wrapper element. Stable contract for consumers
 * that walk up the DOM from arbitrary descendants to find which block a
 * pointer event belongs to.
 *
 * @experimental
 */
export const BLOCK_DRAG_WRAPPER_ATTR = 'data-lexical-block-drag-wrapper';

/**
 * Attribute on the inner element — the original DOM the node would have
 * produced without wrapping. Consumers that need the node's own keyed
 * element should query `:scope > [data-lexical-block-drag-inner]` within
 * the wrapper.
 *
 * @experimental
 */
export const BLOCK_DRAG_INNER_ATTR = 'data-lexical-block-drag-inner';

function wrapWithHandle(inner: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(BLOCK_DRAG_WRAPPER_ATTR, 'true');
  inner.setAttribute(BLOCK_DRAG_INNER_ATTR, 'true');
  wrapper.appendChild(createDragHandle());
  wrapper.appendChild(inner);
  return wrapper;
}

/**
 * Worked example for the generalized `getDOMSlot` abstraction. Each
 * top-level block ElementNode is wrapped with a `<div>` that carries a
 * drag-handle button next to the original DOM. The wrapper uses
 * `display: contents` so the browser's arrow-key navigation /
 * triple-click / execCommand range operations see the inner element as
 * the block boundary; the handle's position is anchored to the inner via
 * CSS anchor-positioning (`anchor-name` on inner, `position-anchor` on
 * handle) so the wrapper doesn't need a positioning context.
 *
 * The drag interaction itself (HTML5 DnD wiring, target line, drop) is
 * registered separately on the editor root via event delegation on the
 * `data-lexical-block-drag-handle` attribute.
 *
 * @experimental
 */
export const BlockDragHandleExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([shouldWrap], {
          $createDOM: (_node, $next) => wrapWithHandle($next()),
          $getDOMSlot: (node, dom, $next) => {
            const inner = dom.querySelector<HTMLElement>(
              `:scope > [${BLOCK_DRAG_INNER_ATTR}]`,
            );
            if (!inner) {
              return $next();
            }
            return node.getDOMSlot(inner);
          },
          $updateDOM: (nextNode, prevNode, dom, $next, editor) => {
            const inner = dom.querySelector<HTMLElement>(
              `:scope > [${BLOCK_DRAG_INNER_ATTR}]`,
            );
            if (!inner) {
              return $next();
            }
            return nextNode.updateDOM(prevNode, inner, editor._config);
          },
        }),
      ],
    }),
  ],
  name: '@lexical/react/block-drag-handle',
});
