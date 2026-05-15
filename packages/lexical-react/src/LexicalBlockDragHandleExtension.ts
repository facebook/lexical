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
  $isDecoratorNode,
  $isElementNode,
  $isRootNode,
  configExtension,
  defineExtension,
} from 'lexical';

/**
 * Attribute on the outer wrapper element. Stable contract for consumers
 * that need to find the wrapper from arbitrary descendants (e.g.
 * `LexicalDraggableBlockPlugin` walks up the DOM with this attribute to
 * resolve which block a pointer event refers to).
 *
 * @experimental
 */
export const BLOCK_DRAG_WRAPPER_ATTR = 'data-lexical-block-drag-wrapper';
/**
 * Attribute on the drag-handle button itself. Used both by consumers
 * (for hit-testing — `event.target.closest('[data-lexical-block-drag-handle]')`)
 * and for the global DnD event delegation in `LexicalDraggableBlockPlugin`.
 *
 * @experimental
 */
export const BLOCK_DRAG_HANDLE_ATTR = 'data-lexical-block-drag-handle';
/**
 * Attribute on the inner element — the original DOM the node would have
 * produced without wrapping. Consumers that need the node's own keyed
 * element (rather than the wrapper) should query `:scope > [data-lexical-block-drag-inner]`
 * within the wrapper.
 *
 * @experimental
 */
export const BLOCK_DRAG_INNER_ATTR = 'data-lexical-block-drag-inner';

function shouldWrap(node: LexicalNode): node is LexicalNode {
  // Top-level block — either an ElementNode (paragraph, heading, list,
  // quote, code, table, collapsible…) or a DecoratorNode (HR, image, …)
  // that's a direct child of the real RootNode. Shadow roots (collapsible
  // container/content, table cell) are excluded so nested blocks keep their
  // natural DOM and don't get duplicate handles on inner rows.
  //
  // DecoratorNode caveat: `useDecorators` mounts the React portal via
  // `editor.getElementByKey(nodeKey)`, which returns the wrapper here —
  // not the inner element. Wrapped decorators today work because the only
  // wrapped DecoratorNodes (HR, PageBreak) return components whose render
  // is `null` (they only register hooks). A DecoratorNode whose `decorate()`
  // actually renders visible DOM would mount alongside the handle button
  // and inner element, with undefined visual ordering — re-evaluate before
  // wrapping such a node.
  const isBlockKind =
    ($isElementNode(node) && !node.isInline()) ||
    ($isDecoratorNode(node) && !node.isInline());
  if (!isBlockKind) {
    return false;
  }
  return $isRootNode(node.getParent());
}

function createDragHandle(): HTMLButtonElement {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.draggable = true;
  // Mouse-only affordance; no keyboard reorder pattern is wired. Without
  // tabIndex = -1, Tab would cycle through every block's handle, adding
  // one focus stop per block on top of the editor's own focus.
  handle.tabIndex = -1;
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

/**
 * Worked example for the generalized `getDOMSlot` abstraction in the
 * ElementNode + extension axis: wraps each top-level block node's DOM with
 * a sibling drag-handle element, and exposes the original inner element
 * through `$getDOMSlot` so the reconciler still mounts children inside it.
 *
 * Wrapping every top-level block uniformly (rather than embedding into
 * the node's own DOM) sidesteps per-node DOM peculiarities: nodes with
 * `overflow-x` on their keyed element (code, scrollable tables), void
 * elements (HR), and nodes that positionally index `dom.children` (e.g.
 * `CollapsibleContainerNode.children[1]`) all keep their own DOM intact
 * inside the wrapper.
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
            // Dispatch to the node's own `getDOMSlot` against the inner
            // element so node-specific slot config (e.g. `TableNode`'s
            // `withElement(table).withAfter(colgroup)`, which depends on
            // walking into the scrollable `<div>` wrapper or skipping the
            // `<colgroup>` prelude) is preserved under wrap. Constructing a
            // fresh `ElementDOMSlot(inner)` here would discard that.
            return node.getDOMSlot(inner);
          },
          // `dom` here is the wrapper, but a node's `updateDOM` expects its
          // own element (e.g. CollapsibleContainer indexes `children[1]` to
          // find its content div, ParagraphNode reads `dom.children` for
          // empty-state detection, etc.). Forward to the underlying
          // `updateDOM` with the inner element so node-internal DOM
          // operations still target the right element.
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
