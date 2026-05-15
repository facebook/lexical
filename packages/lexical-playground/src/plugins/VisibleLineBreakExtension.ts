/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  configExtension,
  defineExtension,
  DOMSlot,
  LineBreakNode,
} from 'lexical';

/**
 * Worked example for the generalized `getDOMSlot` abstraction — wraps each
 * `LineBreakNode`'s `<br>` in a `<span>` carrying a visible `↵` marker, and
 * exposes the inner `<br>` through `$getDOMSlot` so selection / caret logic
 * targets the canonical content element instead of the wrapper.
 *
 * Demonstrates the extension-driven path for a leaf node category: no
 * `LineBreakNode` subclass required, behaviour attaches via
 * `DOMRenderExtension` configuration.
 *
 * Not registered in the default playground — pull this into a project's
 * extension list to opt into visible line-break markers everywhere
 * `LineBreakNode` renders.
 */
const VISIBLE_LINEBREAK_CLASS = 'visible-linebreak';
const VISIBLE_LINEBREAK_MARKER = '↵';

export const VisibleLineBreakExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([LineBreakNode], {
          $createDOM: (_node, $next, _editor) => {
            const br = $next();
            const wrapper = document.createElement('span');
            wrapper.className = VISIBLE_LINEBREAK_CLASS;
            wrapper.setAttribute('data-lexical-visible-linebreak', 'true');
            const marker = document.createElement('span');
            marker.textContent = VISIBLE_LINEBREAK_MARKER;
            marker.setAttribute('aria-hidden', 'true');
            marker.contentEditable = 'false';
            wrapper.appendChild(marker);
            wrapper.appendChild(br);
            return wrapper;
          },
          $getDOMSlot: (_node, dom, $next, _editor) => {
            const br = dom.querySelector(':scope > br');
            return br instanceof HTMLElement ? new DOMSlot(br) : $next();
          },
        }),
      ],
    }),
  ],
  name: '@lexical/playground/visible-linebreak',
});
