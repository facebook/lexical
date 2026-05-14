/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  $isElementNode,
  $isRootOrShadowRoot,
  configExtension,
  defineExtension,
  ElementDOMSlot,
  ElementNode,
  type LexicalNode,
} from 'lexical';

/**
 * Worked example for the generalized `getDOMSlot` abstraction in the
 * ElementNode + extension axis: wraps each top-level block ElementNode's
 * DOM with a sibling drag-handle element, and exposes the original inner
 * element through `$getDOMSlot` so the reconciler still mounts children
 * inside it (instead of next to the handle).
 *
 * The drag interaction itself (HTML5 DnD wiring, target line, drop) is
 * registered separately on the editor root via event delegation on the
 * `data-lexical-block-drag-handle` attribute.
 *
 * Selectors and ARIA attributes are public contract; CSS styling (hover
 * visibility, positioning) is the consumer's responsibility.
 *
 * @experimental
 */
export const BLOCK_DRAG_WRAPPER_ATTR = 'data-lexical-block-drag-wrapper';
export const BLOCK_DRAG_HANDLE_ATTR = 'data-lexical-block-drag-handle';
export const BLOCK_DRAG_INNER_ATTR = 'data-lexical-block-drag-inner';

function shouldWrap(node: LexicalNode): node is ElementNode {
  if (!$isElementNode(node) || node.isInline()) {
    return false;
  }
  const parent = node.getParent();
  return parent !== null && $isRootOrShadowRoot(parent);
}

function createDragHandle(): HTMLButtonElement {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.draggable = true;
  handle.setAttribute(BLOCK_DRAG_HANDLE_ATTR, 'true');
  handle.setAttribute('aria-label', 'Drag to reorder');
  handle.contentEditable = 'false';
  handle.textContent = '⋮';
  return handle;
}

function wrapWithHandle(inner: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(BLOCK_DRAG_WRAPPER_ATTR, 'true');
  inner.setAttribute(BLOCK_DRAG_INNER_ATTR, 'true');
  wrapper.appendChild(createDragHandle());
  wrapper.appendChild(inner);
  return wrapper;
}

export const BlockDragHandleExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([shouldWrap], {
          $createDOM: (_node, $next) => wrapWithHandle($next()),
          $getDOMSlot: (_node, dom, $next) => {
            const inner = dom.querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
            return inner instanceof HTMLElement
              ? new ElementDOMSlot(inner)
              : $next();
          },
        }),
      ],
    }),
  ],
  name: '@lexical/react/block-drag-handle',
});
